const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');

// Evaluate only main's protocol registration with inert Electron/service doubles.
// No real Electron import, database, filesystem probe, window or timer is allowed.
const source = fs.readFileSync(path.join(__dirname, '../electron/main.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
}).outputText;
const userData = path.resolve(__dirname, 'synthetic-user-data');
const screenshots = path.join(userData, 'screenshots');

function protocolHarness({ realpaths = new Map(), missing = false, fetchFailure = false, platform = process.platform, root = userData } = {}) {
  let ready;
  let handler;
  const fetches = [];
  const registrationComplete = new Error('stop before application startup');
  const modules = {
    electron: {
      app: {
        isPackaged: true,
        requestSingleInstanceLock: () => true,
        on() {},
        whenReady: () => ({ then(callback) { ready = callback; } }),
        getPath(name) { assert.equal(name, 'userData'); return root; }
      },
      protocol: {
        registerSchemesAsPrivileged() {},
        handle(scheme, callback) {
          assert.equal(scheme, 'local-file');
          handler = callback;
          throw registrationComplete;
        }
      },
      net: {
        async fetch(url) {
          fetches.push(url);
          if (fetchFailure) throw new Error('synthetic fetch failure');
          return new Response('synthetic image');
        }
      }
    },
    path: platform === 'win32' ? path.win32 : path.posix,
    url: { pathToFileURL: file => pathToFileURL(file, { windows: platform === 'win32' }) },
    fs: {
      existsSync: () => !missing,
      promises: {
        async realpath(file) {
          if (missing) throw Object.assign(new Error('synthetic missing file'), { code: 'ENOENT' });
          return realpaths.get(file) || file;
        }
      }
    },
    './ipc/handlers': {},
    './services': { setNotificationsServiceRef() {} },
    './tray': {},
    './database/repositories': {},
    './auto-launch': {}
  };
  vm.runInNewContext(compiled, {
    exports: {},
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `unexpected main-process dependency: ${name}`);
      return modules[name];
    },
    process: { env: {}, platform },
    Response,
    console: { log() {}, error() {} }
  }, { filename: 'synthetic-main.js', timeout: 1000 });
  assert.equal(typeof ready, 'function');
  assert.throws(() => ready(), error => error === registrationComplete);
  assert.equal(typeof handler, 'function');
  return { request: url => handler({ url }), fetches };
}

function localUrl(file) {
  return `local-file://${file.replace(/\\/g, '/')}`;
}

test('local-file rejects sibling directories sharing the userData prefix', async () => {
  const harness = protocolHarness();
  const response = await harness.request(localUrl(path.join(`${userData}-backup`, 'private.txt')));
  assert.equal(response.status, 403);
  assert.deepEqual(harness.fetches, []);
});

test('local-file serves only the screenshot subtree, not app databases or sibling folders', async () => {
  const harness = protocolHarness();
  for (const file of [path.join(userData, 'time-tracker.db'), path.join(`${screenshots}-backup`, 'image.png')]) {
    assert.equal((await harness.request(localUrl(file))).status, 403);
  }
  assert.deepEqual(harness.fetches, []);
});

test('local-file rejects links whose real target escapes the screenshot directory', async () => {
  const file = path.join(screenshots, 'linked.png');
  const outside = path.join(userData, 'private.txt');
  const harness = protocolHarness({ realpaths: new Map([[file, outside]]) });
  assert.equal((await harness.request(localUrl(file))).status, 403);
  assert.deepEqual(harness.fetches, []);
});

test('local-file fetches the authorized filename as an encoded file URL', async () => {
  const harness = protocolHarness();
  const file = path.join(screenshots, 'date', 'image #1 50%.png');
  const response = await harness.request(`local-file://${encodeURI(file.replace(/\\/g, '/')).replace(/#/g, '%23')}`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'synthetic image');
  assert.deepEqual(harness.fetches, [pathToFileURL(file).href]);
});

test('local-file rejects relative paths rather than resolving against the working directory', async () => {
  const harness = protocolHarness();
  const relative = path.relative(process.cwd(), path.join(screenshots, 'image.png'));
  const response = await harness.request(localUrl(relative));
  assert.equal(response.status, 400);
  assert.deepEqual(harness.fetches, []);
});

test('local-file keeps the absolute root on POSIX paths', async () => {
  const harness = protocolHarness({ platform: 'linux', root: '/synthetic/app-data' });
  const response = await harness.request('local-file:///synthetic/app-data/screenshots/image.png');
  assert.equal(response.status, 200);
  assert.deepEqual(harness.fetches, ['file:///synthetic/app-data/screenshots/image.png']);
});

for (const [name, url, status] of [
  ['Windows drive URL', 'local-file://C:/Synthetic/App/screenshots/date/image.png', 200],
  ['Windows file-style drive URL', 'local-file:///C:/Synthetic/App/screenshots/image.png', 200],
  ['Windows case-insensitive paths', 'local-file://c:/synthetic/app/SCREENSHOTS/image.png', 200],
  ['encoded traversal', 'local-file://C:/Synthetic/App/screenshots/%2e%2e/private.txt', 403],
  ['mixed-separator traversal', 'local-file://C:/Synthetic/App/screenshots/..%5Cprivate.txt', 403],
  ['different drive', 'local-file://D:/Synthetic/App/screenshots/image.png', 403],
  ['the screenshot directory itself', 'local-file://C:/Synthetic/App/screenshots', 403],
  ['UNC share', 'local-file:////server/share/image.png', 403]
]) {
  test(`local-file boundary: ${name}`, async () => {
    const harness = protocolHarness({ platform: 'win32', root: 'C:\\Synthetic\\App' });
    assert.equal((await harness.request(url)).status, status);
    assert.equal(harness.fetches.length, status === 200 ? 1 : 0);
  });
}

for (const [name, options, suffix, status] of [
  ['malformed percent encoding', {}, 'bad%ZZ.png', 400],
  ['missing files', { missing: true }, 'missing.png', 404],
  ['failed file fetches', { fetchFailure: true }, 'unreadable.png', 500]
]) {
  test(`local-file returns an error response for ${name}`, async () => {
    const harness = protocolHarness(options);
    const response = await harness.request(localUrl(path.join(screenshots, suffix)));
    assert.equal(response.status, status);
    if (!options.fetchFailure) assert.deepEqual(harness.fetches, []);
  });
}
