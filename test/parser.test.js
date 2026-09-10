const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// The old ParserHandler suite referenced a module that never existed. Exercise
// the actual screenshot path parser without importing React, Electron or a DB.
const source = fs.readFileSync(path.join(__dirname, '../src/pages/ScreenshotsPage.tsx'), 'utf8');
const tree = ts.createSourceFile('ScreenshotsPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'getFileUrl') {
    if (declaration) throw new Error('Ambiguous getFileUrl declaration');
    declaration = node;
  }
  ts.forEachChild(node, visit);
}
visit(tree);
if (!declaration) throw new Error('Missing actual screenshot URL parser');
const compiled = ts.transpileModule(`const ${declaration.getText(tree)}; exports.getFileUrl = getFileUrl;`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports }, { timeout: 1000 });
const getFileUrl = moduleExports.getFileUrl;

describe('screenshot path parsing', () => {
  test.each([null, undefined, ''])('returns empty output for missing input %p', input => {
    expect(getFileUrl(input)).toBe('');
  });

  test('normalizes Windows separators without changing ordinary filenames', () => {
    expect(getFileUrl('C:\\Synthetic\\screenshots\\image.png')).toBe('local-file://C:/Synthetic/screenshots/image.png');
  });

  test('encodes literal percent signs rather than treating filenames as URL escapes', () => {
    expect(getFileUrl('C:\\Synthetic\\screenshots\\50% complete.png')).toBe('local-file://C:/Synthetic/screenshots/50%25%20complete.png');
  });

  test('keeps query and fragment characters inside the screenshot filename', () => {
    const url = getFileUrl('/synthetic/screenshots/image?#1.png');
    expect(url).toBe('local-file:///synthetic/screenshots/image%3F%231.png');
    expect(new URL(url).search).toBe('');
    expect(new URL(url).hash).toBe('');
  });

  test('preserves the absolute POSIX root when converting a file URL', () => {
    expect(getFileUrl('file:///synthetic/screenshots/image%20one.png')).toBe('local-file:///synthetic/screenshots/image%20one.png');
  });

  test.each([
    ['C:\\Synthetic\\screenshots\\literal%20.png', 'local-file://C:/Synthetic/screenshots/literal%2520.png'],
    ['/synthetic/screenshots/猫.png', 'local-file:///synthetic/screenshots/%E7%8C%AB.png'],
    ['file:///C:/Synthetic/screenshots/image%23one.png', 'local-file:///C:/Synthetic/screenshots/image%23one.png'],
    ['file://C:/Synthetic/screenshots/image%25.png', 'local-file://C:/Synthetic/screenshots/image%25.png'],
    ['local-file:///synthetic/screenshots/image%20one.png', 'local-file:///synthetic/screenshots/image%20one.png'],
    ['https://example.invalid/image.png?size=small#preview', 'https://example.invalid/image.png?size=small#preview'],
    ['http://example.invalid/image.png', 'http://example.invalid/image.png']
  ])('converts %s without losing information or double-encoding a URL', (input, expected) => {
    expect(getFileUrl(input)).toBe(expected);
  });
});
