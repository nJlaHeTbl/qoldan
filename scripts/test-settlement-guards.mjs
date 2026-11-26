// Offline part of test-settlement-editor: the settlement editor API rejects guests (401) and non-admins (403)
// before touching the database. The full flow needs a running local server: node scripts/test-settlement-editor.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {KAZAKHSTAN_REGIONS} from '../lib/regions.ts';
const nodeRequire=createRequire(import.meta.url);
function compile(path,require) {
  const output=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const exports={};
  vm.runInThisContext(`(function(require,exports){${output}\n})`)(require,exports);
  return exports;
}
const guards=compile('lib/server/marketplace-db.ts',name=>{
  if(name==='@/lib/server/auth')return {authMode:()=>'platform',sessionUser:async()=>null};
  assert.equal(name,'cloudflare:workers');return {env:{QOLDAN_ADMIN_USER_IDS:'real-admin',DB:{prepare(){throw new Error('Unauthorized database access');}}}};
});
const route=compile('app/api/settlement-edits/route.ts',name=>name==='zod'?nodeRequire('zod'):name.includes('marketplace-db')?guards:name.includes('settlement-regions')?JSON.parse(fs.readFileSync('lib/server/settlement-regions.json')):{KAZAKHSTAN_REGIONS});
assert.equal((await route.PATCH(new Request('https://qoldan.example/api/settlement-edits',{method:'PATCH'}))).status,401);
const outsider={'oai-authenticated-user-id':'outsider','oai-authenticated-user-email':'developer@example.test'};
assert.equal((await route.PATCH(new Request('https://qoldan.example/api/settlement-edits',{method:'PATCH',headers:outsider}))).status,403);
console.log('settlement editor guard tests passed');
