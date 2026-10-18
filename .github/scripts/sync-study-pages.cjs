const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const index = read('index.html');
const offlinePath = path.join(root, '信託證照教材_離線版.html');
const parser = read('信託證照教材_離線版.html').match(/<script>([\s\S]*?)<\/script>/);
assert(parser && parser[0].includes('marked'), 'Existing offline Markdown parser must be preserved');
const cdn = '<script src="https://cdn.jsdelivr.net/npm/marked@12.0.1/marked.min.js"></script>';
assert(index.includes(cdn));
let offline = index.replace(cdn, () => parser[0]);
offline = offline.replace(/^\s*<link[^>]+href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\r?\n/gm, '');
for (const [id, file] of [['offline-progress', '答題紀錄與隨機練習.js'], ['offline-explanations', '題目解析.js']]) {
  const tag = `<script src="${file}"></script>`;
  assert(offline.includes(tag), `Missing runtime script ${file}`);
  const source = read(file);
  assert(!source.includes('</script>'), `Unsafe inline script closing tag in ${file}`);
  offline = offline.replace(tag, () => `<script id="${id}">\n${source}\n</script>`);
}
fs.writeFileSync(path.join(root, '信託證照教材.html'), index);
fs.writeFileSync(offlinePath, offline.replace(/\r\n?/g, '\n'));
console.log('Synced legacy entry and offline page, preserving the embedded Markdown parser');
