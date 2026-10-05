// 將 Markdown 教材與導覽標籤同步到 course_data.json 及兩份網站。
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const material = path.join(root, '信託業務人員重點教材');
const coursePath = path.join(material, 'course_data.json');
const course = JSON.parse(fs.readFileSync(coursePath, 'utf8'));

const labels = {
  c00: { title: '教材導讀與內容地圖', badge: '導讀', weight: '教材使用方式' },
  c01: { title: '信託法基礎與財產獨立性', badge: '核心', weight: '45% 信託法規' },
  c02: { title: '信託業法與監理架構', badge: '核心', weight: '38% 信託業法' },
  c03: { title: '信託相關稅制', badge: '稅務', weight: '7% 稅務題型' },
  c04: { title: '金錢信託與集合管理', badge: '常考', weight: '36% 實務題型' },
  c05: { title: '有價證券與員工福利信託', badge: '實務', weight: '39% 股票與借券' },
  c06: { title: '不動產信託與資產證券化', badge: '實務', weight: '18% REITs／SPT' },
  c07: { title: '公益信託、基金保管與安養照護', badge: '實務', weight: '12% 公益與照護' },
  c08: { title: '常見數字與易錯觀念速查', badge: '速查', weight: '期間、比率與例外' }
};

for (const chapter of course.chapters) {
  const markdownPath = path.join(material, chapter.filename);
  chapter.markdown = fs.readFileSync(markdownPath, 'utf8');
  Object.assign(chapter, labels[chapter.id]);
}

fs.writeFileSync(coursePath, JSON.stringify(course, null, 2) + '\n');
const payload = JSON.stringify(course).replaceAll('<', '\\u003c');
for (const directory of [root, material]) {
  const indexPath = path.join(directory, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const updated = html.replace(/const courseData = \{[^\n]+\};/, `const courseData = ${payload};`);
  if (updated === html) throw new Error(`找不到內嵌教材資料：${indexPath}`);
  fs.writeFileSync(indexPath, updated);
}

console.log(`已同步 ${course.chapters.length} 章 Markdown、導覽標籤與兩份網站。`);
