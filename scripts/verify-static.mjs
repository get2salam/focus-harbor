import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [pkgRaw, html, main] = await Promise.all([
  readFile('package.json', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('js/main.js', 'utf8'),
]);

const pkg = JSON.parse(pkgRaw);

assert.equal(pkg.type, 'module', 'package.json must keep ESM enabled for browser/shared modules');
assert.match(pkg.scripts?.test ?? '', /node --test/, 'npm test must run node:test suites');
assert.ok(pkg.scripts?.verify?.includes('verify-static'), 'npm run verify must include static contract checks');

const requiredFiles = [
  './styles/app.css',
  './js/main.js',
];

for (const asset of requiredFiles) {
  assert.ok(html.includes(asset), `index.html must reference ${asset}`);
}

const requiredHooks = [
  'data-role="board-title"',
  'data-role="board-subtitle"',
  'data-role="stats"',
  'data-role="insights"',
  'data-role="count"',
  'data-role="list"',
  'data-role="editor"',
  'data-role="secondary-primary"',
  'data-role="secondary-secondary"',
  'data-field="search"',
  'data-field="category"',
  'data-field="status"',
  'id="import-file"',
  'data-action="import"',
  'data-action="export"',
  'data-action="new"',
  'data-action="reset"',
];

for (const hook of requiredHooks) {
  assert.ok(html.includes(hook), `index.html is missing required app hook: ${hook}`);
}

const requiredImports = [
  'clamp',
  'todayISO',
  'daysFromToday',
  'bumpDate',
  'priority as priorityOf',
  'normalize as normalizeItem',
  'isCompleted',
];

for (const symbol of requiredImports) {
  assert.ok(main.includes(symbol), `js/main.js must keep shared scoring import: ${symbol}`);
}

console.log('Static app contract verified.');
