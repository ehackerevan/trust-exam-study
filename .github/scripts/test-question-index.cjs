const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const practice = require('../../答題紀錄與隨機練習.js');
const html = fs.readFileSync(path.join(__dirname, '../../信託歷屆題庫.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, {
    id, dataset:{}, style:{}, textContent:'', innerHTML:'', classList:{add(){}, remove(){}, toggle(){}},
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
    querySelector(selector) { return node(id + selector); },
    querySelectorAll() { return []; },
    focus() { this.focused = true; },
    scrollIntoView() { this.scrolled = true; },
  });
  return nodes.get(id);
}
const context = vm.createContext({
  document:{getElementById:node, querySelector:node, querySelectorAll:()=>[], body:node('body')},
  clearTimeout(){},
  window:{matchMedia:() => ({matches:true}), confirm:() => true},
  TrustPractice:practice,
  TrustExplanations:{render:() => ''},
});
vm.runInContext(script, context);
const run = code => vm.runInContext(code, context);
run(`
  roundQuestions = USABLE_QUESTIONS.slice(0, 160);
  progressState = {records:{}, writable:false, message:''};
  isQuizMode = true;
  renderQuestions(roundQuestions);
  refreshQuestionIndex();
`);
assert.equal((node('quickNavGrid').innerHTML.match(/class="nav-chip"/g) || []).length, 160, 'Every question is indexed, including questions beyond 150');
assert.match(node('quickNavGrid').innerHTML, /62期|41期/);
assert.equal(node('navProgress').textContent, '已答 0 題／未答 160 題');
const questions = JSON.parse(run('JSON.stringify(roundQuestions)'));
function answer(index, selected, peek = false) {
  const q = questions[index];
  const key = practice.key(q);
  const card = node('q-' + key);
  const reveal = node(card.id + '.btn-reveal');
  reveal.closest = () => card;
  const option = {
    closest:() => card,
    classList:{contains:() => selected === Number(q.a), add() {}},
  };
  context.option = option;
  context.reveal = reveal;
  if (peek) run('revealSingleAns(reveal, true)');
  run(`checkOption(option, ${selected})`);
  return key;
}
const right = answer(0, Number(questions[0].a));
assert.equal(node('nav-' + right).dataset.state, 'correct');
assert.match(node('nav-' + right)['aria-label'], /答對/);
assert.equal(node('navProgress').textContent, '已答 1 題／未答 159 題');
answer(0, Number(questions[0].a));
assert.equal(run('currentRound.size'), 1, 'Repeated selection cannot count twice');
const wrong = answer(1, Number(questions[1].a) % 4 + 1);
assert.equal(node('nav-' + wrong).dataset.state, 'wrong');
const peekKey = practice.key(questions[2]);
const peekCard = node('q-' + peekKey);
context.reveal = {closest:() => peekCard, style:{}};
run('revealSingleAns(reveal, true)');
assert.equal(node('nav-' + peekKey).dataset.state, 'peeked');
assert.equal(node('navProgress').textContent, '已答 2 題／未答 158 題', 'Revealing an answer is not answering');
run('goToUnanswered()');
assert.equal(peekCard.focused, true);
assert.equal(peekCard.scrolled, true);
answer(2, Number(questions[2].a));
assert.equal(node('nav-' + peekKey).dataset.state, 'assisted');
assert.equal(run('currentRound.size'), 2, 'Answering after peeking remains excluded from scores');
assert.equal(node('navProgress').textContent, '已答 3 題／未答 157 題');
run('showQuestion(0, false)');
assert.equal(node('q-' + right).hidden,false);
assert.equal(node('q-' + wrong).hidden,true);
assert.equal(node('previousQuestionBtn').disabled,true);
run('nextQuestion()');
assert.equal(node('q-' + right).hidden,true);
assert.equal(node('q-' + wrong).hidden,false);
assert.equal(run('roundSelections.size'),3,'Changing displayed question preserves selected answers');
run('showRoundReview()');
assert.equal(node('scorePanel').hidden,false);
assert.equal(node('questionsContainer').hidden,true);
assert.equal(node('quickNavDetails').open,true);
run('showQuestion(0, false)');
assert.equal(node('scorePanel').hidden,true);
assert.equal(node('quickNavDetails').open,false);
run('goToUnanswered()');
assert.equal(node('q-' + practice.key(questions[3])).focused, true);
run('roundAnswered = new Set(roundQuestions.map(TrustPractice.key)); refreshQuestionIndex()');
assert.equal(node('nextUnansweredBtn').disabled, true);
run('startRound([], "我的錯題集")');
assert.equal(run('roundAnswered.size'), 0);
assert.equal(run('roundPeeked.size'), 0);
assert.equal(node('quickNavGrid').innerHTML, '');
assert.equal(node('navProgress').textContent, '已答 0 題／未答 0 題');
assert.equal(node('nextUnansweredBtn').disabled, true);
console.log('PASS: live question index, answered counts, correct/wrong/peeked states, unanswered navigation, complete indexing and round reset');
