// Integration test for a running LOCAL preview only. Never sends writes to production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {KAZAKHSTAN_REGIONS} from '../lib/regions.ts';
const nodeRequire=createRequire(import.meta.url);
function compile(path,require) {
  const output=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const exports={};new Function('require','exports',output)(require,exports);return exports;
}
const guards=compile('lib/server/marketplace-db.ts',name=>{
  if(name==='@/lib/server/auth')return {authMode:()=>'platform',sessionUser:async()=>null};
  assert.equal(name,'cloudflare:workers');return {env:{QOLDAN_ADMIN_USER_IDS:'real-admin',DB:{prepare(){throw new Error('Unauthorized database access');}}}};
});
const route=compile('app/api/settlement-edits/route.ts',name=>name==='zod'?nodeRequire('zod'):name.includes('marketplace-db')?guards:name.includes('settlement-regions')?JSON.parse(fs.readFileSync('lib/server/settlement-regions.json')):{KAZAKHSTAN_REGIONS});
assert.equal((await route.PATCH(new Request('https://qoldan.example/api/settlement-edits',{method:'PATCH'}))).status,401);
const outsider={'oai-authenticated-user-id':'outsider','oai-authenticated-user-email':'developer@example.test'};
assert.equal((await route.PATCH(new Request('https://qoldan.example/api/settlement-edits',{method:'PATCH',headers:outsider}))).status,403);
const origin='http://localhost:3000';
const admin={'oai-authenticated-user-id':'local-qoldan-user','oai-authenticated-user-email':'local@qoldan.test'};
const user={'oai-authenticated-user-id':'settlement-local-test','oai-authenticated-user-email':'settlement-test@qoldan.test'};
async function call(path,method='GET',body,identity=user){
  const result=await fetch(origin+path,{method,headers:{...identity,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:result.status,data:await result.json()};
}
const settlementId=`custom:${crypto.randomUUID()}`;
const candidate={settlementId,regionCode:'19',name:'LOCAL TEST поселок',latitude:45.01,longitude:78.37,aliases:[],reason:'Локальная проверка редактора',expectedRevision:''};
const first=await call('/api/settlement-edits','POST',candidate);assert.equal(first.status,201);
const stale=await call('/api/settlement-edits','POST',{...candidate,name:'LOCAL TEST устаревший'});assert.equal(stale.status,201);
let entries=await call('/api/settlement-overrides?region=19');assert.ok(!entries.data.some(p=>p.id===settlementId));
assert.equal((await call('/api/settlement-edits','PATCH',{id:first.data.id,action:'approve'},admin)).status,200);
assert.equal((await call('/api/settlement-edits','PATCH',{id:first.data.id,action:'approve'},admin)).status,409);
assert.equal((await call('/api/settlement-edits','PATCH',{id:stale.data.id,action:'approve'},admin)).status,409);
entries=await call('/api/settlement-overrides?region=19');assert.equal(entries.data.find(p=>p.id===settlementId).name,candidate.name);
assert.equal((await route.POST(new Request('https://qoldan.example/api/settlement-edits',{method:'POST',headers:{...outsider,'content-type':'application/json'},body:JSON.stringify({...candidate,reset:true})}))).status,403);
const reset=await call('/api/settlement-edits','POST',{...candidate,reset:true,expectedRevision:first.data.id},admin);assert.equal(reset.status,201);
assert.equal((await call('/api/settlement-edits','PATCH',{id:reset.data.id,action:'approve'},admin)).status,200);
entries=await call('/api/settlement-overrides?region=19');assert.equal(entries.data.find(p=>p.id===settlementId).reset,1);
const history=await call(`/api/settlement-edits?settlementId=${encodeURIComponent(settlementId)}`);assert.equal(history.data.items.filter(p=>p.status==='approved').length,2);
assert.equal((await call('/api/settlement-edits','PATCH',{id:stale.data.id,action:'reject'},admin)).status,200);
assert.equal((await call('/api/settlement-edits','POST',{...candidate,regionCode:'01',expectedRevision:reset.data.id})).status,400);
console.log('PASS: pending isolation, user/admin permissions, approve, duplicate/stale protection, reset, history, wrong region. Only local test records were created.');
