// scripts/generate_high_frequency_top10.js
// 依完整歷屆題庫的 topic 出題頻率，產生每章 10 題高頻精選。
// 核心原則：frequency 決定配額；term 僅用於跨期分散，不使用 recent / 最新期權重。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FULL_BANK_PATH = path.join(ROOT, '信託業務人員重點教材', 'full_exam_bank.json');
const COURSE_PATH = path.join(ROOT, '信託業務人員重點教材', 'course_data.json');
const CHAPTERS = ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07'];
const bank = JSON.parse(fs.readFileSync(FULL_BANK_PATH, 'utf8'));

const normalizeStem = s => (s || '').normalize('NFKC')
  .replace(/\s+/g, '')
  .replace(/[，。；：？！、「」『』（）()【】\[\]．,.!?;:'"“”‘’\-—_]/g, '');

function allocateTopicSlots(groups) {
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  const chosen = [];
  let covered = 0;

  // 先保留足以覆蓋約 85% 歷屆題目的高頻知識點；最多 10 個知識點。
  for (const group of groups) {
    if (chosen.length >= 3 && covered / total >= 0.85) break;
    if (chosen.length >= 10) break;
    chosen.push({ ...group, slots: 1 });
    covered += group.count;
  }

  // 剩餘名額依出題次數做比例分配；單一知識點最多 4 題，避免十題全被一個主題吃掉。
  while (chosen.reduce((sum, g) => sum + g.slots, 0) < 10) {
    const eligible = chosen.filter(g => g.slots < 4);
    let best = eligible[0];
    for (const group of eligible) {
      if (group.count / (group.slots + 1) > best.count / (best.slots + 1)) best = group;
    }
    best.slots++;
  }
  return chosen;
}

function pickRepresentativeQuestions(source, count, globalUsed) {
  const valid = source.filter(q =>
    q.stem &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    Number(q.answer) >= 1 &&
    Number(q.answer) <= 4 &&
    new Set(q.options).size === 4
  );

  // 題目優先從第 50 期以後找代表題，但「期別」不參與知識點排名。
  const newer = valid.filter(q => Number(q.term || q.period || 0) >= 50);
  let pool = new Set(newer.map(q => normalizeStem(q.stem))).size >= count ? newer : valid;
  if (!pool.length) pool = source;

  const duplicateCount = {};
  for (const q of pool) {
    const key = normalizeStem(q.stem);
    duplicateCount[key] = (duplicateCount[key] || 0) + 1;
  }

  const terms = pool
    .map(q => Number(q.term || q.period || 0))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const minTerm = terms[0] || 50;
  const maxTerm = Math.min(60, terms[terms.length - 1] || 60);
  const localUsed = new Set();
  const selected = [];

  for (let i = 0; i < count; i++) {
    const targetTerm = minTerm + (Math.max(minTerm, maxTerm) - minTerm) * (i + 1) / (count + 1);
    let candidates = pool
      .filter(q => !localUsed.has(normalizeStem(q.stem)) && !globalUsed.has(normalizeStem(q.stem)))
      .map(q => {
        const key = normalizeStem(q.stem);
        const term = Number(q.term || q.period || 0);
        return {
          q,
          score:
            (duplicateCount[key] - 1) * 16 -
            Math.abs(term - targetTerm) * 1.7 -
            Math.max(0, (q.stem || '').length - 160) * 0.05
        };
      })
      .sort((a, b) => b.score - a.score || Number(a.q.term || 0) - Number(b.q.term || 0));

    if (!candidates.length) {
      candidates = pool
        .filter(q => !localUsed.has(normalizeStem(q.stem)))
        .map(q => ({ q, score: 0 }));
    }
    if (!candidates.length) break;

    const question = candidates[0].q;
    const key = normalizeStem(question.stem);
    localUsed.add(key);
    globalUsed.add(key);
    selected.push(question);
  }
  return selected;
}

const rows = {};
const globalUsed = new Set();

for (const chapter of CHAPTERS) {
  const byTopic = {};
  for (const q of bank[chapter]) (byTopic[q.topic] ??= []).push(q);

  const groups = Object.entries(byTopic)
    .map(([topic, items]) => ({ topic, items, count: items.length }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, 'zh-Hant'));

  rows[chapter] = [];
  allocateTopicSlots(groups).forEach((group, rankIndex) => {
    pickRepresentativeQuestions(group.items, group.slots, globalUsed).forEach(q => {
      rows[chapter].push({
        q,
        topic: group.topic,
        frequency: group.count,
        topicRank: rankIndex + 1,
        frequencyScope: '本章',
        sourceChapter: chapter
      });
    });
  });
}

// c08 是跨章節「高頻數字與易錯陷阱」速查，不採舊 c08 的 41–43 期切片。
// 改由 c01–c07 全歷屆題庫統計出題頻率最高的 10 個知識點，再挑數字／期限／比例類代表題。
const globalQuestions = CHAPTERS.flatMap(chapter =>
  bank[chapter].map(q => ({ ...q, _sourceChapter: chapter }))
);
const byGlobalTopic = {};
for (const q of globalQuestions) (byGlobalTopic[q.topic] ??= []).push(q);

const globalTop10 = Object.entries(byGlobalTopic)
  .map(([topic, items]) => ({ topic, items, count: items.length }))
  .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, 'zh-Hant'))
  .slice(0, 10);

const numericPattern = /多少|多久|幾(?:年|月|日|個|人|次)|百分之|%|至少|至多|不得超過|期限|期間|金額|比率|比例|年內|月內|日內|營業日|資本額|準備金|扣除額|持有.*以上|滿.*年/;

rows.c08 = globalTop10.map((group, rankIndex) => {
  let candidates = group.items.filter(q => numericPattern.test(q.stem || ''));
  if (!candidates.length) candidates = group.items;
  const q = pickRepresentativeQuestions(candidates, 1, globalUsed)[0];
  return {
    q,
    topic: group.topic,
    frequency: group.count,
    topicRank: rankIndex + 1,
    frequencyScope: '全題庫',
    sourceChapter: q._sourceChapter
  };
});

function toCuratedQuestion(row, chapter, index) {
  const q = row.q;
  const term = Number(q.term || q.period);
  const rankLabel = row.frequencyScope === '全題庫' ? '全題庫' : '章內';

  return {
    id: `${chapter}_q${String(index + 1).padStart(2, '0')}`,
    source_id: q.id,
    source_chapter: row.sourceChapter,
    term,
    period: Number(q.period || q.term),
    subject: q.subject,
    number: q.number,
    stem: q.stem,
    options: q.options,
    answer: Number(q.answer),
    topic: row.topic,
    conceptId: q.conceptId || null,
    frequency: row.frequency,
    topicRank: row.topicRank,
    frequencyScope: row.frequencyScope,
    annotation: q.annotation || '',
    note:
      `📊 第 41–62 期${row.frequencyScope}「${row.topic}」共出現 ${row.frequency} 題，${rankLabel}出題頻率第 ${row.topicRank} 名。\n` +
      `💡 本題選自第 ${term} 期，官方公布正確答案為第 (${Number(q.answer)}) 個選項。`
  };
}

const curated = {};
const verified = {};
for (const chapter of Object.keys(rows)) {
  curated[chapter] = rows[chapter].map((row, index) => toCuratedQuestion(row, chapter, index));
  verified[chapter] = rows[chapter].map(row => {
    const q = { ...row.q };
    delete q._sourceChapter;
    return {
      ...q,
      source_chapter: row.sourceChapter,
      frequency: row.frequency,
      topicRank: row.topicRank,
      frequencyScope: row.frequencyScope
    };
  });
}

// 回歸驗證
const all = Object.values(curated).flat();
if (Object.keys(curated).length !== 8 || all.length !== 80) {
  throw new Error('高頻精選題總量應為 8 章 × 10 題');
}
if (new Set(all.map(q => normalizeStem(q.stem))).size !== all.length) {
  throw new Error('高頻精選題出現跨章節重複題幹');
}
for (const chapter of CHAPTERS) {
  const questions = curated[chapter];
  if (questions.length !== 10) throw new Error(`${chapter} 不足 10 題`);
  if (new Set(questions.map(q => q.term)).size < 3 || questions.every(q => q.term >= 61)) {
    throw new Error(`${chapter} 期別分布過度集中，疑似退回近期題優先`);
  }
}

const json = JSON.stringify(curated, null, 2) + '\n';
const js =
  `(function(root) {\n  var data = ${JSON.stringify(curated, null, 2)};\n` +
  `  if (typeof window !== 'undefined') window.EXAM_BANK_DATA = data;\n` +
  `  if (typeof globalThis !== 'undefined') globalThis.EXAM_BANK_DATA = data;\n` +
  `  if (typeof module !== 'undefined' && module.exports) module.exports = data;\n` +
  `})(typeof window !== 'undefined' ? window : this);\n`;

fs.writeFileSync(path.join(ROOT, 'curated_top10_bank.json'), json);
fs.writeFileSync(path.join(ROOT, 'sync_data', 'top10_verified_questions.json'), JSON.stringify(verified, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'exam_bank_data.js'), js);
fs.writeFileSync(path.join(ROOT, '信託業務人員重點教材', 'exam_bank_data.js'), js);

const course = JSON.parse(fs.readFileSync(COURSE_PATH, 'utf8'));
course.quizzes = curated;
fs.writeFileSync(COURSE_PATH, JSON.stringify(course, null, 2) + '\n');

console.log('Generated: c01–c08, 10 high-frequency questions each (80 total).');
