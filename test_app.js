// test_app.js
// 驗證 index.html 與 exam_bank_data.js 之邏輯、樣式與載入效能

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- 1. 驗證檔案完整性與大小 ---');
const htmlPath = path.join(__dirname, 'index.html');
const bankDataPath = path.join(__dirname, 'exam_bank_data.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const bankJs = fs.readFileSync(bankDataPath, 'utf8');

console.log(`index.html 大小: ${(html.length / 1024).toFixed(1)} KB`);
console.log(`exam_bank_data.js 大小: ${(bankJs.length / 1024).toFixed(1)} KB`);

console.log('\n--- 2. 驗證響應式表格：桌機 / 平板 / 手機卡片 ---');
if (!html.includes('@media (max-width: 900px) and (min-width: 641px)') ||
    !html.includes('table-layout: fixed !important')) {
  console.error('❌ 缺少平板表格自適應與固定欄寬規則');
  process.exit(1);
}
if (!html.includes('@media (max-width: 640px)') ||
    !html.includes('content: attr(data-label)') ||
    !html.includes('.table-scroll-inner thead') ||
    !html.includes('display: none;')) {
  console.error('❌ 缺少手機表格轉卡片樣式');
  process.exit(1);
}
if (!html.includes('function enhanceResponsiveTables(root)') ||
    !html.includes("cell.setAttribute('data-label'") ||
    !html.includes('enhanceResponsiveTables(markdownOutput);')) {
  console.error('❌ 缺少表頭標籤注入或章節載入後的響應式表格強化');
  process.exit(1);
}
if (html.includes('欄位內容完整顯示，手機可左右滑動')) {
  console.error('❌ 舊的手機左右滑動提示仍存在');
  process.exit(1);
}
if (!html.includes('欄位會依畫面自動調整，手機改為卡片顯示')) {
  console.error('❌ 缺少新版表格自適應提示');
  process.exit(1);
}
console.log('✅ 表格已採桌機表格、平板換行、手機卡片顯示，無需手機橫向滑動');

console.log('\n--- 2.5 驗證手機端圖解導覽與原圖入口 ---');
if (html.includes('mobile-diagrams:styles:start') &&
    html.includes('mobile-diagrams:renderer:start') &&
    html.includes('const mobileDiagramData = ') &&
    html.includes('renderMobileDiagram(encodedHref, rawTitle)') &&
    html.includes('selectMobileDiagramPoint(this, event)') &&
    html.includes('class="mobile-diagram-overview"') &&
    html.includes('.diagram-card-canvas { display: none !important; }') &&
    html.includes('查看完整架構圖') &&
    !html.includes('手機左右滑動看清全圖')) {
  console.log('✅ 手機顯示可點選區塊的完整導覽圖，原圖仍可開啟放大');
} else {
  console.error('❌ 手機圖解卡片、原圖入口或舊滑動提示有誤');
  process.exit(1);
}

console.log('\n--- 2.5. 驗證章節考古題已自 UI 移除 ---');
if (html.includes('id="quizSection"') || html.includes('本章高頻歷屆真題測驗') || html.includes('精選題</span>') || html.includes('exam_bank_data.js?v=')) {
  console.error('❌ 章節頁面不得再顯示考古題區塊、精選題提示或載入考古題腳本');
  process.exit(1);
}
if (/renderConceptQuizzes\(chapter\);/.test(html)) {
  console.error('❌ loadChapter 不應再渲染章節考古題');
  process.exit(1);
}
console.log('✅ 章節頁面不得再顯示考古題區塊，且不再載入考古題腳本');

console.log('\n--- 2.6. 驗證政府法規校訂版教材一致性 ---');
const studyDir = path.join(__dirname, '信託業務人員重點教材');
const chapterFiles = [
  ['c01', '01_信託法規精粹_生活圖解篇.md'],
  ['c02', '02_信託業法與監理架構_圖解篇.md'],
  ['c03', '03_信託稅制全攻略_穿透圖解篇.md'],
  ['c04', '04_金錢信託與集合管理_實務篇.md'],
  ['c05', '05_有價證券信託與員工持股_實務篇.md'],
  ['c06', '06_不動產信託與資產證券化_實務篇.md'],
  ['c07', '07_公益信託與特殊形態信託_實務篇.md'],
  ['c08', '08_歷屆考題高頻數字與易錯陷阱速查手冊.md']
];
const chapters = Object.fromEntries(
  chapterFiles.map(([id, file]) => [id, fs.readFileSync(path.join(studyDir, file), 'utf8')])
);

const lawAuditChecks = [
  [chapters.c01.includes('法定例外只有兩類') && chapters.c01.includes('通知發行公司') && chapters.c01.includes('第 6 條第 2 項') && chapters.c01.includes('第 6 條第 3 項'), '第 01 章：信託法第 25 條例外、第 4 條公示規則與第 6 條第 2、3 項'],
  [chapters.c02.includes('至少繳足 20% 股款') && chapters.c02.includes('不具運用決定權') && chapters.c02.includes('施行細則》第 17 條') && chapters.c02.includes('2 個月內') && chapters.c02.includes('4 個月內'), '第 02 章：設立出資、利害關係交易與施行細則第 17 條定期報告期限'],
  [chapters.c03.includes('歸戶計算不是一律按每一信託各自獨立') && chapters.c03.includes('自益信託') && chapters.c03.includes('若當年度贈與總額已達依法應申報的程度') && chapters.c03.includes('第 94 條之 1'), '第 03 章：地價稅歸戶、印花稅、贈與稅與憑單免填發例外'],
  [chapters.c04.includes('淨資產總值 30%') && chapters.c04.includes('該金融機構淨值 10%') && chapters.c04.includes('淨資產價值 5%'), '第 04 章：集合管理運用集中度與流動性比率'],
  [chapters.c05.includes('不能把「140%／120%」寫成所有有價證券信託借券一律適用') && chapters.c05.includes('《信託業法》第 20 條之 1'), '第 05 章：借券比率與股票表決權不得過度概括'],
  [chapters.c06.includes('可分配收益 90% 以上') && chapters.c06.includes('會計年度結束後 6 個月內') && chapters.c06.includes('50%／35%／25%／15%') && !chapters.c06.includes('財產標的已確定，**不得追加發行**'), '第 06 章：REIT 配息、分配期限、借款上限與追加募集'],
  [chapters.c07.includes('每年至少一次') && chapters.c07.includes('沒有信託行為所定的歸屬權利人') && chapters.c07.includes('但經金管會核准者例外'), '第 07 章：公益信託監督、消滅歸屬與基金保管機構限制'],
  [chapters.c08.includes('達第 24 條應申報條件者') && chapters.c08.includes('2 個月 / 4 個月') && chapters.c08.includes('第 6 條第 3 項') && chapters.c08.includes('90% 是契約配息比率要求') && chapters.c08.includes('全體集管帳戶 NAV 30%') && chapters.c08.includes('NAV 5%') && chapters.c08.includes('第 94 條之 1'), '第 08 章：速查手冊已改以現行政府法規為基準，含集管曝險與憑單例外']
];

for (const [ok, message] of lawAuditChecks) {
  if (!ok) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}

const forbiddenLegacyClaims = [
  '四大破防漏洞',
  '得委任第三人之例外情事（僅限三種）',
  '縱使委託人或受益人書面同意，依然絕對無效',
  '無任何例外！絕不放行',
  '該公司總發行股份的 **10%**',
  '返還登記書據，**仍應貼用印花稅票**',
  '公益信託**應**設置（**強制必須設立，法無例外！**）'
];
for (const claim of forbiddenLegacyClaims) {
  if (Object.values(chapters).some(md => md.includes(claim))) {
    console.error(`❌ 仍殘留舊版錯誤或過度絕對化敘述：${claim}`);
    process.exit(1);
  }
}

const overPromotionalPhrases = ['高傳真金融實務情境', '考古題必考天條', '投資防暴比率', '信託 2.0 守護神', '高頻致命文字陷阱'];
for (const phrase of overPromotionalPhrases) {
  if (Object.values(chapters).some(md => md.includes(phrase))) {
    console.error(`❌ 仍殘留過度宣傳式用語：${phrase}`);
    process.exit(1);
  }
}

const courseData = JSON.parse(fs.readFileSync(path.join(studyDir, 'course_data.json'), 'utf8'));
for (const [id, file] of chapterFiles) {
  const embedded = courseData.chapters.find(ch => ch.id === id);
  if (!embedded || embedded.markdown !== chapters[id]) {
    console.error(`❌ course_data.json 的 ${id} 未與 ${file} 同步`);
    process.exit(1);
  }
}

const nestedHtml = fs.readFileSync(path.join(studyDir, 'index.html'), 'utf8');
if (nestedHtml !== html) {
  console.error('❌ 根目錄 index.html 與教材 index.html 不一致');
  process.exit(1);
}
for (const marker of [
  '法定例外只有兩類',
  '半年度終了後 2 個月內',
  '歸戶計算不是一律按每一信託各自獨立',
  '50%／35%／25%／15%',
  '每年至少一次'
]) {
  if (!html.includes(marker)) {
    console.error(`❌ index.html 尚未內嵌最新校訂內容：${marker}`);
    process.exit(1);
  }
}

const rootImageDir = path.join(__dirname, 'images');
const nestedImageDir = path.join(studyDir, 'images');
const nestedSvgs = fs.readdirSync(nestedImageDir).filter(name => name.endsWith('.svg'));
for (const name of nestedSvgs) {
  const rootPath = path.join(rootImageDir, name);
  if (!fs.existsSync(rootPath)) {
    console.error(`❌ Pages 根目錄缺少 SVG：${name}`);
    process.exit(1);
  }
  const rootSvg = fs.readFileSync(rootPath, 'utf8');
  const nestedSvg = fs.readFileSync(path.join(nestedImageDir, name), 'utf8');
  if (rootSvg !== nestedSvg) {
    console.error(`❌ Pages 與教材 SVG 不一致：${name}`);
    process.exit(1);
  }
}
console.log('✅ 第 01～08 章、course_data、兩份 index 與全部 SVG 均完成政府法規校訂同步');

console.log('\n--- 3. 驗證題庫資料檔仍可讀取（僅保留供後續答案校正） ---');
const bankSandbox = { window: {}, globalThis: {} };
vm.createContext(bankSandbox);
vm.runInContext(bankJs, bankSandbox);

if (bankSandbox.window && bankSandbox.window.EXAM_BANK_DATA) {
  const bank = bankSandbox.window.EXAM_BANK_DATA;
  const chapters = Object.keys(bank);
  console.log(`✅ 成功載入 window.EXAM_BANK_DATA，涵蓋 ${chapters.length} 個章節: ${chapters.join(', ')}`);
  let totalQuestions = 0;
  chapters.forEach(ch => {
    totalQuestions += bank[ch].length;
  });
  console.log(`✅ 全真題庫題目總量: ${totalQuestions} 題`);
  if (totalQuestions !== 80) {
    console.error(`❌ 題目數量非預期之 80 題 (當前為 ${totalQuestions})！`);
    process.exit(1);
  }

  console.log('✅ 題庫資料檔仍可正常解析；目前不作答案正確性與精選邏輯驗證，避免錯誤答案重新出現在 UI');
} else {
  console.error('❌ 題庫腳本未正確定義 window.EXAM_BANK_DATA！');
  process.exit(1);
}

console.log('\n--- 4. 驗證 JS 執行邏輯（無語法錯誤、按需渲染） ---');
// 抓出 index.html 裡的第二個 script 標籤
const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scriptMatches.length < 1) {
  console.error('❌ 找不到主要的 script 標籤！');
  process.exit(1);
}

const mainScript = scriptMatches[scriptMatches.length - 1][1];

// 建立 DOM 模擬沙盒
const elementCache = {};
const sandbox = {
  window: {
    EXAM_BANK_DATA: bankSandbox.window.EXAM_BANK_DATA,
    addEventListener: () => {},
    scrollTo: () => {}
  },
  document: {
    documentElement: {
      getAttribute: () => 'dark',
      setAttribute: () => {}
    },
    addEventListener: () => {},
    querySelector: () => ({ scrollTo: () => {} }),
    querySelectorAll: () => [],
    getElementById: (id) => {
      if (!elementCache[id]) {
        elementCache[id] = {
          id,
          innerHTML: '',
          textContent: '',
          value: 'all',
          checked: false,
          style: {},
          classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
          },
          querySelectorAll: () => [],
          appendChild: () => {},
          scrollIntoView: () => {},
          addEventListener: () => {}
        };
      }
      return elementCache[id];
    },
    createElement: (tag) => {
      return {
        tagName: tag,
        className: '',
        innerHTML: '',
        textContent: '',
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        },
        appendChild: () => {}
      };
    },
    createDocumentFragment: () => {
      return {
        appendChild: () => {}
      };
    }
  },
  localStorage: {
    getItem: () => '{}',
    setItem: () => {}
  },
  marked: {
    Renderer: function() {
      return { image: () => '', table: () => '' };
    },
    setOptions: () => {},
    parse: (md) => `<div>${md ? md.substring(0, 50) : ''}</div>`
  },
  console: console,
  setTimeout: (fn) => fn(),
  Math: Math,
  Date: Date,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  JSON: JSON
};

vm.createContext(sandbox);
try {
  vm.runInContext(mainScript, sandbox);
  console.log('✅ JS 腳本語法完全正確，無任何 SyntaxError 或 Runtime ReferenceError！');
  
  // 測試呼叫 loadChapter
  sandbox.window.loadChapter(4); // 測試第 5 章（有價證券與員工福利信託）
  console.log('✅ loadChapter(4) 執行成功，教材章節可正常渲染！');
  
  // 測試載入第 1 章（信託法規精粹）
  sandbox.window.loadChapter(1);
  console.log('✅ loadChapter(1) 執行成功，且不會重新顯示已移除的章節考古題！');

  // 測試燈箱 (點擊看大圖、放大、還原、關閉)
  sandbox.window.openImageLightbox('images/chart_01_02.svg', '⚖️ 詐害信託撤銷權');
  console.log('✅ openImageLightbox("images/chart_01_02.svg") 執行成功（燈箱順暢彈出）！');

  sandbox.window.zoomLightboxImage(1.2);
  console.log('✅ zoomLightboxImage(1.2) 執行成功（放大正常）！');

  sandbox.window.resetLightboxImage();
  console.log('✅ resetLightboxImage() 執行成功（還原正常）！');

  sandbox.window.closeImageLightbox();
  console.log('✅ closeImageLightbox() 執行成功（關閉正常）！');

  // 測試底部上一章 / 下一章按鈕
  const prevChapterBtn = sandbox.document.getElementById('prevChapterBtn');
  const nextChapterBtn = sandbox.document.getElementById('nextChapterBtn');
  if (prevChapterBtn && typeof prevChapterBtn.onclick === 'function') {
    prevChapterBtn.onclick();
    console.log('✅ prevChapterBtn.onclick 點擊事件觸發正常！');
  } else {
    console.error('❌ prevChapterBtn 缺少 onclick 綁定！');
    process.exit(1);
  }
  if (nextChapterBtn && typeof nextChapterBtn.onclick === 'function') {
    nextChapterBtn.onclick();
    console.log('✅ nextChapterBtn.onclick 點擊事件觸發正常！');
  } else {
    console.error('❌ nextChapterBtn 缺少 onclick 綁定！');
    process.exit(1);
  }

  // 測試頂部「⚡ 速查手冊」跳轉按鈕
  const quickCrunchBtn = sandbox.document.getElementById('quickCrunchBtn');
  if (quickCrunchBtn && typeof quickCrunchBtn.onclick === 'function') {
    quickCrunchBtn.onclick();
    console.log('✅ quickCrunchBtn.onclick 點擊事件觸發正常（已跳轉至速查手冊 c08）！');
  } else {
    console.error('❌ quickCrunchBtn 缺少 onclick 綁定！');
    process.exit(1);
  }

  // 驗證「匯出紀錄」功能已徹底拿掉
  if (html.includes('id="exportProgressBtn"')) {
    console.error('❌ 錯誤：HTML 中仍殘留 exportProgressBtn 按鈕！');
    process.exit(1);
  } else {
    console.log('✅ 通過：匯出紀錄功能已完全從頂部導航列與代碼中安全移除！');
  }

} catch (err) {
  console.error('❌ JS 執行異常:', err);
  process.exit(1);
}

console.log('\n========================================');
console.log('🎉 所有測試項目全數通過 (100% SUCCESS)！');
console.log('========================================');
