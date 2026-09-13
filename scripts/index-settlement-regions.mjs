import {readFileSync,writeFileSync} from 'node:fs';
const index={};
for(let n=1;n<=20;n++) {
  const code=String(n).padStart(2,'0');
  for(const p of JSON.parse(readFileSync(`public/settlements/${code}.json`,'utf8'))) index[p.id]=code;
}
writeFileSync('lib/server/settlement-regions.json',JSON.stringify(index));
console.log(`Indexed ${Object.keys(index).length} settlement regions`);
