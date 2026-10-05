// 由完整歷屆題庫產生全景導讀的出題知識點圖表，並同步兩份網站。
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const material = path.join(ROOT, '信託業務人員重點教材');
const bank = JSON.parse(fs.readFileSync(path.join(material, 'full_exam_bank.json'), 'utf8'));
const coursePath = path.join(material, 'course_data.json');
const course = JSON.parse(fs.readFileSync(coursePath, 'utf8'));
const chapters = course.chapters.filter(c => /^c0[1-7]$/.test(c.id));
// c08 為跨章速查切片，不計入；同一來源題只計一次，不同考期重複出題仍各計一次。
const seen = new Set();
const questions = chapters.flatMap(c => bank[c.id]).filter(q => {
  if (!q.id) throw new Error('來源題缺少識別碼');
  if (seen.has(q.id)) return false;
  seen.add(q.id);
  return true;
});
const terms = [...new Set(questions.map(q => Number(q.term || q.period)))].sort((a, b) => a - b);
const scope = `第 ${terms[0]}–${terms.at(-1)} 期｜${questions.length.toLocaleString('en-US')} 題`;
const rank = items => {
  const counts = new Map();
  for (const q of items) {
    const topic = q.topic || '未分類';
    counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  return [...counts].map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, 'zh-Hant'));
};
const escape = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));

function chart(filename, title, items, total, subtitle) {
  const width = 1000;
  const height = 152 + items.length * 46;
  const max = Math.max(...items.map(item => item.count));
  const rows = items.map((item, i) => {
    const y = 110 + i * 46;
    const length = item.count / max * 440;
    const label = `${item.count} 題 · ${(item.count / total * 100).toFixed(1)}%`;
    return `<g><title>${escape(item.topic)}：${label}</title>
      <text x="30" y="${y + 21}" fill="#94a3b8" font-size="15">${i + 1}</text>
      <text x="66" y="${y + 21}" fill="#e2e8f0" font-size="17">${escape(item.topic)}</text>
      <rect x="420" y="${y}" width="440" height="30" rx="6" fill="#1e293b"/>
      <rect x="420" y="${y}" width="${length.toFixed(2)}" height="30" rx="6" fill="${i < 3 ? '#38bdf8' : '#818cf8'}"/>
      <text x="970" y="${y + 21}" text-anchor="end" fill="#f8fafc" font-size="16">${label}</text></g>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
    <title id="title">${escape(title)}</title>
    <desc id="desc">${escape(subtitle)}。${escape(items.map(item => `${item.topic} ${item.count} 題`).join('；'))}</desc>
    <rect width="1000" height="${height}" rx="18" fill="#0f172a"/>
    <g font-family="system-ui, 'Noto Sans TC', sans-serif">
      <text x="30" y="40" fill="#f8fafc" font-size="24" font-weight="700">${escape(title)}</text>
      <text x="30" y="73" fill="#94a3b8" font-size="16">${escape(subtitle)}</text>
      ${rows}
      <text x="30" y="${height - 20}" fill="#94a3b8" font-size="15">橫條長度代表出題次數；百分比以${total.toLocaleString('en-US')}題為分母，非未來考試配分預測。</text>
    </g>
  </svg>\n`;
  for (const directory of [ROOT, material]) {
    fs.writeFileSync(path.join(directory, 'images', filename), svg);
  }
  return `![${title}](images/${filename})`;
}

const topics = rank(questions);
let section = `\n\n<!-- topic-statistics:start -->\n\n---\n\n## 📊 歷屆出題知識點統計\n\n統計範圍：**${scope}、${topics.length} 個知識點**。依 c01–c07 完整題庫的知識點分類計算，每筆來源題計一次；不同期別的相同題目仍各計一次。第 08 章為跨章速查切片，不重複納入。\n\n> 教材前言的 2,860 題是歷屆原始總量；以下圖表以目前 c01–c07 已收錄且分類的 **${questions.length.toLocaleString('en-US')} 題**為準。出題次數僅反映本站收錄題目，不代表未來配分。\n\n### 全題庫高頻知識點 TOP 15\n\n`;
section += chart('chart_00_topic_top15.svg', '全題庫高頻知識點 TOP 15', topics.slice(0, 15), questions.length, `${scope}｜占比以全題庫為分母`) + '\n';
section += '\n### 各章完整知識點分布\n\n展開各章可查看全部知識點；點擊圖表可放大檢視。各章百分比以該章收錄題數為分母。\n';
for (const chapter of chapters) {
  const items = questions.filter(q => q.chapter === chapter.id || bank[chapter.id].some(source => source.id === q.id));
  const chapterTopics = rank(items);
  const image = chart(`chart_00_topics_${chapter.id}.svg`, `${chapter.title}：出題知識點`, chapterTopics, items.length, `第 ${terms[0]}–${terms.at(-1)} 期｜本章 ${items.length} 題｜${chapterTopics.length} 個知識點`);
  section += `\n<details>\n<summary>${chapter.icon} ${chapter.title}｜${items.length} 題</summary>\n\n${image}\n\n</details>\n`;
}
section += '\n<!-- topic-statistics:end -->\n';
const intro = course.chapters.find(c => c.id === 'c00');
intro.markdown = intro.markdown.replace(/\n*<!-- topic-statistics:start -->[\s\S]*?<!-- topic-statistics:end -->\n*/g, '').trimEnd() + section;
fs.writeFileSync(path.join(material, intro.filename), intro.markdown);
fs.writeFileSync(coursePath, JSON.stringify(course, null, 2) + '\n');
for (const directory of [ROOT, material]) {
  const filename = path.join(directory, 'index.html');
  const html = fs.readFileSync(filename, 'utf8');
  const updated = html.replace(/const courseData = (\{[^\n]+\});/, (_, data) => {
    const embedded = JSON.parse(data);
    embedded.chapters.find(c => c.id === 'c00').markdown = intro.markdown;
    return `const courseData = ${JSON.stringify(embedded)};`;
  });
  if (updated === html && !html.includes('topic-statistics:start')) throw new Error('找不到內嵌教材資料');
  fs.writeFileSync(filename, updated);
}
console.log(`已同步統計圖表：${questions.length} 題、${topics.length} 個知識點。`);
