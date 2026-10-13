#!/usr/bin/env node
// Uses existing TypeScript validation and Firestore REST API; no SDK/dependency changes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/businessHours.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const helpers = { exports: {} };
vm.runInNewContext(code, { exports: helpers.exports, Intl, Date, Map });
const { WEEKDAYS, validateBusinessHours, validDay } = helpers.exports;
const names = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const every = (open, close) => WEEKDAYS.map(() => [open, close]);
const weekdays = (open, close, weekendOpen, weekendClose) => [...Array(5).fill([open,close]), ...Array(2).fill([weekendOpen,weekendClose])];
const schedules = [
 ['Addition Adelaide', every('12:00','20:00')],
 ['BEAMS F', weekdays('12:00','20:00','11:00','20:00')],
 ['BIOTOP', every('11:00','20:00')],
 ['Bechics', [null,...Array(4).fill(['14:00','20:00']),...Array(2).fill(['12:00','20:00'])]],
 ['DISSONANCE', every('14:00','20:00')],
 ['Dover Street Market Ginza', every('11:00','20:00')],
 ['GR8 HARAJUKU', every('11:00','20:00')],
 ['H BEAUTY & YOUTH', weekdays('12:00','20:00','11:00','20:00')],
 ['Eliminator', every('12:00','19:00')],
 ['ALLU GINZA', every('11:00','20:00')],
 ['BEST PACKING STORE', every('12:00','19:00')],
 ['DE CHIRICO', every('12:00','19:30')],
 ['Little Trip to Heaven', [...Array(4).fill(['11:00','20:00']),...Array(3).fill(['11:00','21:00'])]],
 ["L'ECHOPPE", weekdays('12:00','20:00','11:00','20:00')],
 ['MIDWEST TOKYO', [...Array(6).fill(['12:00','20:00']),['11:00','19:00']]],
 ['NUBIAN SHIBUYA', every('11:00','21:00')],
 ['O代官山2号店', every('12:00','20:00')],
 ['O代官山本店', every('12:00','20:00')],
 ['STUDIOUS', every('11:00','21:00')],
 ['SUPER A MARKET', weekdays('12:00','20:00','11:00','20:00')],
 ['THE ELEPHANT', every('13:00','20:00')],
 ['UNDER THE SUN', every('11:00','20:00')],
 ['aNiKi USED&VINTAGE', every('12:00','20:00')],
];
function normalize(value) { return String(value ?? '').normalize('NFKC').toLowerCase().replace(/[’‘`]/g,"'").replace(/[\s'&・]/g,''); }
function encode(value) {
 if (value === null) return { nullValue: null };
 if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
 if (typeof value === 'boolean') return { booleanValue: value };
 if (typeof value === 'string') return { stringValue: value };
 if (typeof value === 'number') return { doubleValue: value };
 return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)])) } };
}
function decode(value) {
 if ('stringValue' in value) return value.stringValue;
 if ('booleanValue' in value) return value.booleanValue;
 if ('nullValue' in value) return null;
 if ('integerValue' in value) return Number(value.integerValue);
 if ('doubleValue' in value) return value.doubleValue;
 if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([k,v])=>[k,decode(v)]));
 if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
 return value; // Preserve unknown fields in comparison/report; they are never written.
}
function same(a,b) {
 if (a === b) return true;
 if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
 const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
 return JSON.stringify(ak)===JSON.stringify(bk) && ak.every(k=>same(a[k],b[k]));
}
function dayText(day) { return !day ? 'unset' : !validDay(day) ? 'invalid existing value' : day.closed ? 'CLOSED' : day.intervals.map(i=>`${i.open}-${i.close}`).join(' / '); }
function plan(documents) {
 const matched=[], skipped=[], changes=[], used=new Set();
 for (const [name, hours] of schedules) {
   const candidates=documents.filter(d=>normalize(d.data.name)===normalize(name) || name==='STUDIOUS' && ['studiousshibuyaparco','studious渋谷parco','studious渋谷パルコ'].includes(normalize(d.data.name)));
   const eligible=candidates.filter(d=>name!=='STUDIOUS' || /(?:parco|パルコ)/i.test([d.data.name,d.data.address].join(' ')) && /(?:shibuya|渋谷)/i.test([d.data.name,d.data.address,d.data.area].join(' ')));
   if(eligible.length!==1) { skipped.push(`${name} -> ${eligible.length>1 ? 'ambiguous: '+eligible.map(d=>d.id).join(', ') : candidates.length ? 'ambiguous location (requires explicit Shibuya PARCO evidence)' : 'no exact existing name match'}`); continue; }
   const record=eligible[0]; used.add(record.id); matched.push(`${name} -> ${record.id} (existing name: ${record.data.name})`);
   const next={timezone:'Asia/Tokyo',weekly:Object.fromEntries(WEEKDAYS.map((day,i)=>[day,hours[i] ? {closed:false,intervals:[{open:hours[i][0],close:hours[i][1]}]} : {closed:true,intervals:[]}]))};
   const error=validateBusinessHours(next);if(error)throw Error(`${name}: ${error}`);
   // Do not change unexpected extension data or a non-Tokyo timezone silently.
   const old=record.data.businessHours;
   if(old && (Object.keys(old).some(k=>!['timezone','weekly'].includes(k)) || old.timezone && old.timezone!=='Asia/Tokyo' || old.weekly && Object.keys(old.weekly).some(k=>!WEEKDAYS.includes(k)))) { skipped.push(`${name} [${record.id}] -> unsupported existing hours metadata/timezone; preserve for manual review`); continue; }
   if(same(old,next)) continue;
   const lines=WEEKDAYS.flatMap((day,i)=>same(old?.weekly?.[day],next.weekly[day])?[]:[`${names[i]}: ${dayText(old?.weekly?.[day])} -> ${dayText(next.weekly[day])}`]);
   if(old?.timezone!==next.timezone)lines.push(`Timezone: ${old?.timezone ?? 'unset'} -> Asia/Tokyo`);
   changes.push({ name, record, next, lines });
 }
 for(const d of documents) if(!used.has(d.id)) skipped.push(`${d.data.name || '(unnamed)'} [${d.id}] -> no uniquely matched confirmed hours`);
 return {matched,skipped,changes};
}
function report(p, project, apply) {
 console.log(`Project: ${project}\nCollection: shops\nMode: ${apply?'APPLY':'DRY-RUN (no writes)'}\n`);
 for(const [title,lines] of [['MATCHED',p.matched],['SKIPPED',p.skipped]]) console.log(`${title}:\n${lines.length?lines.join('\n'):'(none)'}\n`);
 console.log('CHANGES:');
 for(const c of p.changes)console.log(`${c.name} [${c.record.id}]\n${c.lines.join('\n')}\n`);
 if(!p.changes.length)console.log('(none)');
 console.log(`Summary: ${p.matched.length} matched, ${p.changes.length} hours updates, ${p.skipped.length} skip report entries.`);
 console.log('Addition Adelaide: first-Wednesday closure NOT encoded; normal Wednesday hours retained.');
}
async function main(args=process.argv.slice(2)) {
 if(args.some(a=>!['--dry-run','--apply'].includes(a)) || args.includes('--dry-run')&&args.includes('--apply'))throw Error('Use --dry-run (default) OR --apply, never both.');
 const apply=args.includes('--apply');
 const project=fs.readFileSync(path.join(__dirname,'../lib/firebase.ts'),'utf8').match(/projectId:\s*"([^"]+)"/)?.[1];
 if(!project)throw Error('Cannot determine existing Firebase project.');
 const token=process.env.URBN_FIRESTORE_TOKEN;
 if(apply&&!token)throw Error('--apply requires URBN_FIRESTORE_TOKEN (authorized Firebase ID token or Google OAuth access token).');
 const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
 const request=async(url,options={})=>{
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...options.headers}});
  if(!response.ok)throw Error(`Firestore request failed (${response.status}): ${await response.text()}`);
  return response.json();
 };
 const documents=[];let page;
 do {const url=new URL(`${base}/shops`);url.searchParams.set('pageSize','1000');if(page)url.searchParams.set('pageToken',page);const data=await request(url);for(const d of data.documents??[])documents.push({id:d.name.split('/').pop(),name:d.name,updateTime:d.updateTime,data:Object.fromEntries(Object.entries(d.fields??{}).map(([k,v])=>[k,decode(v)]))});page=data.nextPageToken;}while(page);
 const p=plan(documents);report(p,project,apply);
 if(!apply)return;
 if(p.changes.length>500)throw Error('Refuse >500 writes.');
 // Single atomic commit with per-document update-time preconditions. If any shop
 // changed after the read, ALL writes fail instead of clobbering manual edits.
 const writes=p.changes.map(c=>({update:{name:c.record.name,fields:{businessHours:encode(c.next)}},updateMask:{fieldPaths:['businessHours']},currentDocument:{updateTime:c.record.updateTime}}));
 if(writes.length)await request(`${base}:commit`,{method:'POST',body:JSON.stringify({writes})});
 console.log(`Applied ${writes.length} businessHours-only updates. No documents created.`);
}
module.exports={plan,encode,decode,normalize,main};
if(require.main===module)main().catch(error=>{console.error(`ERROR: ${error.message}`);process.exitCode=1;});
