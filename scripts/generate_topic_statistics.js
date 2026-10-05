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

function chart(title, items, total, subtitle) {
  const max = Math.max(...items.map(item => item.count));
  const rows = items.map((item, i) => {
    const percent = (item.count / total * 100).toFixed(1);
    const width = (item.count / max * 100).toFixed(2);
    return `<li class="topic-stat-row"><span class="topic-stat-label"><span class="topic-stat-rank">${i + 1}</span><span>${escape(item.topic)}</span></span><span class="topic-stat-track" aria-hidden="true"><span class="topic-stat-fill${i < 3 ? ' topic-stat-leading' : ''}" style="width:${width}%"></span></span><span class="topic-stat-value">${item.count} 題<span class="topic-stat-percent">${percent}%</span></span></li>`;
  }).join('');
  // 保持 HTML 區塊內無空白行，避免 Markdown 將圖表內部當成一般段落。
  return `<section class="topic-stat-chart" aria-label="${escape(title)}"><p class="topic-stat-heading">${escape(title)}</p><p class="topic-stat-subtitle">${escape(subtitle)}</p><ol class="topic-stat-list">${rows}</ol><p class="topic-stat-note">橫條以本圖最高題數為比較基準；占比以 ${total.toLocaleString('en-US')} 題為分母。</p></section>`;
}

const topics = rank(questions);
let section = `\n\n<!-- topic-statistics:start -->\n\n---\n\n## 📊 歷屆出題知識點統計\n\n統計範圍：**${scope}、${topics.length} 個知識點**。依 c01–c07 完整題庫的知識點分類計算，每筆來源題計一次；不同期別的相同題目仍各計一次。第 08 章為跨章速查切片，不重複納入。\n\n> 教材前言的 2,860 題是歷屆原始總量；以下圖表以目前 c01–c07 已收錄且分類的 **${questions.length.toLocaleString('en-US')} 題**為準。出題次數僅反映本站收錄題目，不代表未來配分。\n\n### 全題庫高頻知識點 TOP 15\n\n`;
section += chart('全題庫高頻知識點 TOP 15', topics.slice(0, 15), questions.length, `${scope}｜占比以全題庫為分母`) + '\n';
section += '\n### 各章完整知識點分布\n\n展開各章可查看全部知識點。圖表隨螢幕寬度調整，手機可直接閱讀完整名稱、題數與占比。各章百分比以該章收錄題數為分母。\n';
for (const chapter of chapters) {
  const items = questions.filter(q => q.chapter === chapter.id || bank[chapter.id].some(source => source.id === q.id));
  const chapterTopics = rank(items);
  const image = chart(`${chapter.title}：出題知識點`, chapterTopics, items.length, `第 ${terms[0]}–${terms.at(-1)} 期｜本章 ${items.length} 題｜${chapterTopics.length} 個知識點`);
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
  let updated = html.replace(/const courseData = (\{[^\n]+\});/, (_, data) => {
    const embedded = JSON.parse(data);
    embedded.chapters.find(c => c.id === 'c00').markdown = intro.markdown;
    return `const courseData = ${JSON.stringify(embedded)};`;
  });
  if (updated === html && !html.includes('topic-statistics:start')) throw new Error('找不到內嵌教材資料');
  const style = fs.readFileSync(path.join(__dirname, 'topic_statistics.css'), 'utf8').trimEnd();
  const styleBlock = `    /* topic-statistics:styles:start */\n${style}\n    /* topic-statistics:styles:end */`;
  if (updated.includes('/* topic-statistics:styles:start */')) {
    updated = updated.replace(/^[ \t]*\/\* topic-statistics:styles:start \*\/[\s\S]*?^[ \t]*\/\* topic-statistics:styles:end \*\//m, styleBlock);
  } else {
    updated = updated.replace('  </style>', `${styleBlock}\n  </style>`);
  }
  fs.writeFileSync(filename, updated);
}
console.log(`已同步統計圖表：${questions.length} 題、${topics.length} 個知識點。`);
