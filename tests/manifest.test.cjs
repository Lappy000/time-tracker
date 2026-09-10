const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

test('manifest describes the Electron application and its reproducible build', () => {
  assert.equal(pkg.main, 'dist-electron/main.js');
  assert.equal(pkg.version, '0.2.0', 'do not roll back the existing package version');
  assert.equal(pkg.scripts.start, 'electron .');
  for (const script of ['dev', 'typecheck', 'build', 'build:renderer', 'build:electron', 'electron:build']) {
    assert.equal(typeof pkg.scripts[script], 'string', `missing ${script} script`);
  }
  for (const dep of ['react', 'react-dom', 'active-win', 'better-sqlite3', 'electron-store']) {
    assert.ok(pkg.dependencies?.[dep], `missing runtime dependency ${dep}`);
  }
  for (const dep of ['electron', 'electron-builder', 'typescript', 'vite', '@vitejs/plugin-react']) {
    assert.ok(pkg.devDependencies?.[dep], `missing build dependency ${dep}`);
  }
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
});
