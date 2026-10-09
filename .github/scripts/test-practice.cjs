const assert=require('node:assert/strict');
const p=require('../../答題紀錄與隨機練習.js');
const q={p:52,s:1,n:2,a:'4',tp:'成立方式與信託分類'};
const data={};const storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
let state=p.load(storage);assert(state.writable);assert.deepEqual(state.records,{});
assert.equal(p.record(state.records,q,1),false);let stats=p.stats(state.records,[q]);assert.equal(stats.attempts,1);assert.equal(stats.wrong,1);assert.equal(stats.unresolved.length,1);assert.equal(stats.topics[0].wrong,1);
assert.equal(p.record(state.records,q,4),true);stats=p.stats(state.records,[q]);assert.equal(stats.attempts,2);assert.equal(stats.wrong,1);assert.equal(stats.unresolved.length,0);assert.equal(stats.topics[0].attempts,2);
assert.equal(p.save(storage,state.records),'');assert.deepEqual(p.load(storage).records,state.records);
const corrected={p:53,s:2,n:53,a:'更正為2',tp:'保管'};assert.equal(p.record(state.records,corrected,2),true);
for(let i=0;i<10;i++){const pool=Array.from({length:100},(_,n)=>({n}));const draw=p.sample(pool);assert.equal(draw.length,20);assert.equal(new Set(draw.map(q=>q.n)).size,20);assert.deepEqual(pool.map(q=>q.n),Array.from({length:100},(_,n)=>n));}
assert.equal(p.sample([q]).length,1);assert.deepEqual(p.sample([]),[]);
const bad={getItem:()=>'{bad json',setItem:()=>{throw Error('must not overwrite');}};assert.equal(p.load(bad).writable,false);assert(p.load(bad).message);
assert(p.save({setItem:()=>{throw Error('quota');}},state.records));
assert.equal(p.stats(state.records,[]).attempts,0);
console.log('PASS: persistence, cumulative mistakes, resolved wrong set, corrected answer, sampling, corrupt/quota storage');
