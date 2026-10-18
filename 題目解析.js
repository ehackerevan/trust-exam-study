(function (root) {
  'use strict';
  const checkedAt = '2026-10-18';
  const law = article => ({label: `信託法第 ${article} 條`, url: `https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=${article}&pcode=I0020024`});
  const entries = {
    '52-1-2': {
      answer: 4,
      reason: '公司債已完成信託公示，但未通知發行公司時，限制的是對抗發行公司的效力，因此選（4）。',
      pitfall: '不要把「不得對抗發行公司」誤認為信託無效，或一概當成不得對抗任何第三人。',
      sources: [law(4)]
    },
    '54-1-11': {
      answer: 1,
      reason: '受託人辭任或被解任後，信託行為沒有另訂安排時，由委託人指定新受託人，因此選（1）。',
      pitfall: '法院是在委託人不能或不為指定時，依利害關係人或檢察官聲請選任；不是一開始就由原受託人指定。',
      sources: [law(36)]
    },
    '52-1-13': {
      answer: 4,
      reason: '公益信託將一般信託中法院解任受託人的權限，改由目的事業主管機關行使，因此選（4）。',
      pitfall: '先辨認題目是「公益信託」，再套用第 76 條的監督權限特則。',
      sources: [law(76), law(36)]
    },
    '51-1-6': {
      answer: 3,
      reason: '本題問錯誤敘述。股票信託的對抗要件涉及有價證券信託公示及通知發行公司，並非向臺灣證券交易所辦理信託登記，因此選（3）。',
      pitfall: '區分財產權登記、有價證券信託公示，以及股票或公司債通知發行公司的不同層次。',
      sources: [law(4)]
    },
    '52-1-5': {
      answer: 4,
      reason: '信託雖已消滅，但財產尚未移轉給歸屬權利人時，法律仍使信託關係暫時存續，這種依法發生的關係屬法定信託，因此選（4）。',
      pitfall: '成立原因是法律直接規定，不是另外訂約、立遺囑或對外宣言成立的新信託。',
      sources: [law(66)]
    },
    '54-1-10': {
      answer: 2,
      reason: '受託人違反信託本旨處分財產時，第 18 條將聲請法院撤銷處分的權利交給受益人，因此選（2）。',
      pitfall: '這項撤銷權與委託人、受益人等請求損害賠償的權利不同；實際行使仍須符合第 18 條的財產公示或相對人知情等要件。',
      sources: [law(18), law(23)]
    },
    '55-1-13': {
      answer: 3,
      reason: '信託監察人可為受益人利益進行訴訟上或訴訟外行為，但享有及拋棄信託利益是受益人本身的權利，因此選（3）。',
      pitfall: '監察人保護受益人，並不因此取得受益人的信託利益。',
      sources: [law(52), law(17)]
    },
    '53-1-19': {
      answer: 1,
      reason: '信託利益並非全部由委託人享有，且沒有其他特別約定時，委託人與受益人得共同終止，因此須由甲與丙共同辦理，選（1）。',
      pitfall: '受益人欠債並不使委託人當然取得單方終止權；也不要與自益信託的終止規則混用。',
      sources: [law(64), law(3)]
    },
    '59-1-5': {
      answer: 4,
      reason: '契約約定的信託期間屆滿，屬信託行為所定消滅事由，因此選（4）。沒有另訂約定時，當事人死亡或喪失行為能力不使信託關係當然消滅。',
      pitfall: '受託人的任務終了與整個信託關係消滅是不同問題；題目中的舊稱「受禁治產宣告」須留意現行用語。',
      sources: [law(8), law(62), law(45)]
    },
    '49-1-2': {
      answer: 2,
      reason: '信託成立後六個月內，委託人或其遺產受破產宣告，法律推定該信託有害債權，因此選（2）。',
      pitfall: '這是有害債權的推定，不代表信託一律自動無效；債權人的撤銷另有規定。',
      sources: [law(6)]
    }
  };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  function render(key) {
    if (!Object.prototype.hasOwnProperty.call(entries, key)) return '';
    const item = entries[key];
    if (!item) return '';
    return `<section class="question-explanation" aria-label="題目解析"><p><strong>為什麼選這個答案？</strong> ${escapeHtml(item.reason)}</p><p><strong>容易混淆：</strong> ${escapeHtml(item.pitfall)}</p><p class="explanation-source">依據：${item.sources.map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a>`).join('、')} · 對照日期 ${checkedAt}</p></section>`;
  }
  const api = {entries, checkedAt, render};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TrustExplanations = api;
})(typeof window === 'undefined' ? globalThis : window);
