const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const warning = '若覺得答案有怪怪的，請一律查資料，我比較懶，用AI整理、檢查幾次就沒再人工審核了';
let data;
for (const file of ['信託證照教材.html', '信託證照教材_離線版.html', '信託歷屆題庫.html']) {
 const html = fs.readFileSync(path.join(root, file), 'utf8');
 assert(html.includes('rel="icon" href="data:image/svg+xml,'));
 assert(html.includes(warning), `${file}: missing warning`);
 assert(!html.includes('href="無效檔案/'));
 for (const image of new Set(html.match(/教材圖解\/[^\s"'<>\\)]+\.svg/g) || [])) assert(fs.existsSync(path.join(root, image)), image);
 if (file !== '信託歷屆題庫.html') {
  assert.equal(html.split('<p class="question-warning">').length - 1, 2);
  assert(html.includes('const correctAns = parseInt(q.answer, 10) + 1;'));
  assert(html.includes('enhanceResponsiveTables(markdownOutput);'));
  const course = JSON.parse(html.match(/const courseData = (\{[^\n]+\});/)[1]);
  assert.equal(course.chapters.length, 9);
  assert.equal(Object.values(course.quizzes).flat().length, 80);
  for (const qs of Object.values(course.quizzes)) for (const q of qs) assert(q.answer >= 0 && q.answer <= 3 && q.options.length === 4);
  if (data) assert.deepEqual(course, data); else data = course;
 } else {
  const qs = JSON.parse(html.match(/const RAW_QUESTIONS = (\[[^\n]+\]);/)[1]);
  assert.equal(qs.length, 2722);
  assert(qs.every(q => q.p !== 47 && (String(q.a).match(/[1-4]/g) || []).length === 1));
  assert.equal(qs.find(q=>q.p===52 && q.s===1 && q.n===2).a, '4');
 }
}
assert(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('url=信託證照教材.html'));
console.log('PASS: pages, warnings, questions, image references and default entry');
