const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
let study = read('信託證照教材_離線版.html');
let questions = read('信託歷屆題庫.html');
for (const file of ['答題紀錄與隨機練習.js','題目解析.js']) {
  questions = questions.replace(`<script src="${file}"></script>`, () => `<script>\n${read(file)}\n</script>`);
}
for (const file of fs.readdirSync(path.join(root,'教材圖解')).filter(f=>f.endsWith('.svg'))) {
  const uri = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root,'教材圖解',file)).toString('base64');
  study = study.replaceAll('教材圖解/' + file,uri);
}
questions = questions.replace(/<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->\r?\n?/g,'');
questions = questions.replace(/^\s*<link[^>]+href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\r?\n/gm,'');
study = study.replace('href="信託歷屆題庫.html"', 'href="#" onclick="parent.postMessage({type:\'trust-study-switch\', pane:\'questions\'}, \'*\'); return false;"');
questions = questions.replace('href="index.html"', 'href="#" onclick="parent.postMessage({type:\'trust-study-switch\', pane:\'study\'}, \'*\'); return false;"');
study = study.replace('</body>', `<script>
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  const url = new URL(link.getAttribute('href'), document.baseURI);
  if (!decodeURIComponent(url.pathname).endsWith('信託歷屆題庫.html')) return;
  event.preventDefault();
  parent.postMessage({type:'trust-study-switch', pane:'questions', query:url.search}, '*');
});
</script></body>`);
questions = questions.replace('</body>', `<script>
window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'trust-study-query') return;
  const params = new URLSearchParams(event.data.query);
  const topic = params.get('topic');
  if (topic && USABLE_QUESTIONS.some(q => q.tp === topic)) {
    document.getElementById('topicSelect').value = topic;
    startTopicPractice();
  } else if (params.get('view') === 'random') startRandomPractice();
  else if (params.get('view') === 'wrong') showWrongQuestions();
});
</script></body>`);
const file = '信託教材與題庫_單檔版.html';
let combined = read(file);
const pages = {study,questions};
combined = combined.replace(/(study|questions): '([A-Za-z0-9+/=]+)'/g, (_,key) => `${key}: '${Buffer.from(pages[key]).toString('base64')}'`);
fs.writeFileSync(path.join(root,file),combined);
console.log('Synced standalone study and quiz pages with inline scripts and diagrams');
