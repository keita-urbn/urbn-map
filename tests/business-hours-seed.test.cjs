const {test}=require('node:test');const assert=require('node:assert/strict');
const {plan,encode,decode,main}=require('../scripts/seed-business-hours.cjs');
const record=(id,name,businessHours,extra={})=>({id,name:`projects/p/databases/(default)/documents/shops/${id}`,updateTime:'2026-01-01T00:00:00Z',data:{name,...extra,...(businessHours?{businessHours}:{})}});
test('confirmed schedules match editor schema and preserve closed/normal Wednesday semantics',()=>{
 const p=plan([record('a','Addition Adelaide'),record('b','Bechics'),record('c','MIDWEST TOKYO')]);
 assert.equal(p.changes[0].next.weekly.wed.closed,false);
 assert.deepEqual(p.changes[1].next.weekly.mon,{closed:true,intervals:[]});
 assert.equal(p.changes[2].next.weekly.sun.intervals[0].close,'19:00');
 assert.deepEqual(decode(encode(p.changes[0].next)),p.changes[0].next);
});
test('already matching hours are untouched; ambiguous names, branches and unlisted shops skip',()=>{
 const hours=plan([record('b','BEAMS F')]).changes[0].next;
 const p=plan([record('b','BEAMS F',hours),record('c','BIOTOP'),record('d','BIOTOP'),record('s','STUDIOUS'),record('u','HeralDo'),record('g','ALLU Tokyo')]);
 assert.equal(p.changes.length,0);assert.ok(p.skipped.some(s=>s.includes('ambiguous')));
 assert.equal(plan([record('s','STUDIOUS',null,{address:'渋谷PARCO 3F'})]).changes.length,1);
});
test('different timezones/extension metadata preserved and typographic normalization is conservative',()=>{
 const p=plan([record('x','BIOTOP',{timezone:'Europe/London',weekly:{}}),record('y','L’ECHOPPE'),record('z','Additon Aderaide')]);
 assert.deepEqual(p.changes.map(c=>c.record.id),['y']);
});
test('default dry-run and --dry-run never invoke writes; contradictory options fail',async()=>{
 const original=global.fetch;const log=console.log;const calls=[];
 global.fetch=async(url,options)=>{calls.push(options?.method??'GET');return{ok:true,json:async()=>({documents:[{name:'projects/p/databases/(default)/documents/shops/b',updateTime:'t',fields:{name:{stringValue:'BEAMS F'}}}]})};};
 console.log=()=>{};
 try{await main([]);await main(['--dry-run']);assert.deepEqual(calls,['GET','GET']);await assert.rejects(main(['--apply','--dry-run']));}finally{global.fetch=original;console.log=log;}
});
