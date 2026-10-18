(function(root) {
  const KEY = 'trust_exam_progress_v1';
  function load(storage) {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return {records:{}, writable:true, message:''};
      const data = JSON.parse(raw);
      if (data.version !== 1 || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) throw new Error('format');
      for (const [key,r] of Object.entries(data.records)) {
        if (!/^\d{2}-[12]-\d{1,2}$/.test(key) || !r || !Number.isSafeInteger(r.attempts) || r.attempts<1 || !Number.isSafeInteger(r.wrong) || r.wrong<0 || r.wrong>r.attempts || typeof r.lastCorrect!=='boolean' || !Number.isInteger(r.selected) || r.selected<1 || r.selected>4 || !Number.isFinite(Date.parse(r.lastAt))) throw new Error('record');
      }
      return {records:data.records, writable:true, message:''};
    } catch (_) {
      return {records:{}, writable:false, message:'無法讀取原有紀錄，目前只暫存本次作答，不會覆蓋原資料。'};
    }
  }
  function save(storage, records) {
    try {storage.setItem(KEY, JSON.stringify({version:1, records}));return '';}
    catch (_) {return '瀏覽器無法保存紀錄，本次作答暫存在頁面，關閉或重新整理後會消失。';}
  }
  function key(q) {return `${q.p}-${q.s}-${q.n}`;}
  function record(records,q,selected) {
    const id=key(q),old=records[id]||{attempts:0,wrong:0};
    const correct=(String(q.a).match(/[1-4]/g)||[]).includes(String(selected));
    records[id]={attempts:old.attempts+1,wrong:old.wrong+(correct?0:1),lastCorrect:correct,selected,lastAt:new Date().toISOString()};
    return correct;
  }
  function stats(records,questions) {
    const result={attempts:0,wrong:0,unresolved:[],topics:[]},topics=new Map();
    for(const q of questions) {
      const r=records[key(q)];if(!r)continue;
      result.attempts+=r.attempts;result.wrong+=r.wrong;
      if(!r.lastCorrect)result.unresolved.push(q);
      const t=topics.get(q.tp)||{topic:q.tp||'未分類',attempts:0,wrong:0};
      t.attempts+=r.attempts;t.wrong+=r.wrong;topics.set(q.tp,t);
    }
    result.topics=[...topics.values()].filter(t=>t.wrong>0).sort((a,b)=>b.wrong-a.wrong || b.wrong/b.attempts-a.wrong/a.attempts || a.topic.localeCompare(b.topic,'zh-Hant'));
    return result;
  }
  function sample(pool) {
    const copy=pool.slice();
    for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
    return copy.slice(0,20);
  }
  function answer(storage, state, q, selected) {
    if (state.writable) {
      const latest = load(storage);
      if (!latest.writable) {
        state.writable = false;
        state.message = latest.message;
      } else {
        state.records = latest.records;
      }
    }
    const correct = record(state.records, q, selected);
    if (state.writable) {
      const err = save(storage, state.records);
      if (err) {
        state.writable = false;
        state.message = err;
      }
    }
    return correct;
  }
  function isCorrect(q, selected) {
    return (String(q.a).match(/[1-4]/g)||[]).includes(String(selected));
  }
  function score(questions, selections, peeked = new Set()) {
    const result = {total:questions.length, correct:0, wrong:0, unanswered:0, assisted:0, score:0, accuracy:null, subjects:[]};
    const subjects = new Map();
    for (const q of questions) {
      const id = key(q), selected = selections.get(id);
      const state = !selected ? 'unanswered' : peeked.has(id) ? 'assisted' : isCorrect(q, selected) ? 'correct' : 'wrong';
      result[state]++;
      const subject = subjects.get(q.s) || {subject:q.s, total:0, correct:0, wrong:0, unanswered:0, assisted:0, score:0};
      subject.total++; subject[state]++; subjects.set(q.s, subject);
    }
    const percent = (correct, total) => total ? Math.round(correct * 1000 / total) / 10 : 0;
    result.score = percent(result.correct, result.total);
    if (result.correct + result.wrong) result.accuracy = percent(result.correct, result.correct + result.wrong);
    result.subjects = [...subjects.values()].map(s => ({...s, score:percent(s.correct, s.total)}));
    return result;
  }
  const HISTORY_KEY = 'trust_exam_scores_v1';
  function loadHistory(storage) {
    try {
      const raw = storage.getItem(HISTORY_KEY);
      if (!raw) return {entries:[], writable:true, message:''};
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.entries)) throw Error('format');
      for (const e of data.entries) {
        if (!e || typeof e.label !== 'string' || !['practice','exam'].includes(e.mode) || !Number.isFinite(Date.parse(e.date)) || !Number.isFinite(e.score) || e.score < 0 || e.score > 100 || !Number.isSafeInteger(e.total) || e.total < 1 || !Number.isFinite(e.seconds) || e.seconds < 0) throw Error('entry');
      }
      return {entries:data.entries.slice(0,20), writable:true, message:''};
    } catch (_) {
      return {entries:[], writable:false, message:'無法讀取歷次成績，原紀錄不會被覆蓋，本次成績只暫存於頁面。'};
    }
  }
  function addHistory(storage, state, entry) {
    if (state.writable) {
      const latest = loadHistory(storage);
      if (latest.writable) state.entries = latest.entries;
      else { state.writable = false; state.message = latest.message; }
    }
    state.entries = [entry, ...state.entries].slice(0,20);
    if (state.writable) {
      try { storage.setItem(HISTORY_KEY, JSON.stringify({version:1, entries:state.entries})); }
      catch (_) { state.writable = false; state.message = '瀏覽器無法保存成績，本次成績只暫存於頁面。'; }
    }
  }
  const api={load,save,key,record,answer,stats,sample,isCorrect,score,loadHistory,addHistory};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.TrustPractice=api;
})(typeof window==='undefined'?globalThis:window);
