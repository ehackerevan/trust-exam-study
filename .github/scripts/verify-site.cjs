const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const warning = '若覺得答案有怪怪的，請一律查資料，我比較懶，用AI整理、檢查幾次就沒再人工審核了';
let data;
for (const file of ['index.html', '信託證照教材.html', '信託證照教材_離線版.html', '信託歷屆題庫.html']) {
 const html = fs.readFileSync(path.join(root, file), 'utf8');
 assert(html.includes('rel="icon" href="data:image/svg+xml,'));
 assert(html.includes(warning), `${file}: missing warning`);
 assert(html.includes('class="answer-search"') && html.includes('https://www.google.com/search?q=${encodeURIComponent('));
 assert(!html.includes('href="無效檔案/'));
 for (const image of new Set(html.match(/教材圖解\/[^\s"'<>\\)]+\.svg/g) || [])) assert(fs.existsSync(path.join(root, image)), image);
 if (file !== '信託歷屆題庫.html') {
  assert.equal(html.split('<p class="question-warning">').length - 1, 2);
  assert(html.includes('const correctAns = parseInt(q.answer, 10) + 1;'));
  assert(html.includes('enhanceResponsiveTables(markdownOutput);'));
  const course = JSON.parse(html.match(/const courseData = (\{[^\n]+\});/)[1]);
  assert.equal(course.chapters.length, 9);
  for (const phrase of ['核心特色','法規查核基準','依 c01–c07','教材前言的 2,860','圖表隨螢幕寬度調整','欄位會依畫面自動調整','教材不再把','為校對基準','本章數字已分別對照']) assert(!html.includes(phrase), phrase);
  assert.equal(Object.values(course.quizzes).flat().length, 80);
  for (const qs of Object.values(course.quizzes)) for (const q of qs) assert(q.answer >= 0 && q.answer <= 3 && q.options.length === 4);
  if (data) assert.deepEqual(course, data); else data = course;
 } else {
  assert(html.includes('src="答題紀錄與隨機練習.js"'));
  assert(!html.includes('已移除第47期130題'));
  assert(!html.includes('不需登入網站、不跨裝置同步'));
  assert(html.includes('id="historyControls"') && html.includes('id="topicControls" hidden'));
  assert(html.includes('會記錄你的答題狀況，但如果瀏覽器紀錄清除掉，就會消失!'));
  const qs = JSON.parse(html.match(/const RAW_QUESTIONS = (\[[^\n]+\]);/)[1]);
  assert.equal(qs.length, 2722);
  assert(qs.every(q => q.p !== 47 && (String(q.a).match(/[1-4]/g) || []).length === 1));
  assert.equal(qs.find(q=>q.p===52 && q.s===1 && q.n===2).a, '4');
 }
}
const entry = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal(entry, fs.readFileSync(path.join(root, '信託證照教材.html'), 'utf8'));
assert(!/http-equiv=["']refresh/i.test(entry));
assert(fs.readFileSync(path.join(root, '信託歷屆題庫.html'), 'utf8').includes('href="index.html"'));
console.log('PASS: pages, warnings, questions, image references and default entry');
