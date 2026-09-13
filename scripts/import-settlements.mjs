// Reproducible GeoNames CC BY 4.0 import. Arguments: KZ.txt alternate-names/KZ.txt.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { KAZAKHSTAN_REGIONS } from '../lib/regions.ts';
const adminToCode = { '05':'01','02':'02','03':'03','04':'04','01':'05','06':'06','07':'07','17':'08','12':'09','13':'10','14':'11','08':'11','09':'12','10':'13','11':'14','16':'15','15':'16','1537272':'17','12510143':'18','12510144':'19','12510145':'20' };
const translations = new Map();
for (const line of readFileSync(process.argv[3], 'utf8').split('\n')) {
  const f = line.split('\t');
  if (!['ru','kk'].includes(f[2]) || f[7] === '1' || f[9]?.trim()) continue;
  const key = `${f[1]}:${f[2]}`;
  if (!translations.has(key) || f[4] === '1') translations.set(key, f[3]);
}
const groups = Object.fromEntries(KAZAKHSTAN_REGIONS.map(r=>[r.code, []]));
let excluded = 0;
for (const line of readFileSync(process.argv[2], 'utf8').split('\n')) {
  const f = line.split('\t');
  if (f[6] !== 'P' || !['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLC'].includes(f[7])) continue;
  const code = adminToCode[f[10]];
  if (!code) { excluded++; continue; }
  const aliases = [...new Set([f[1], f[2], ...f[3].split(','), translations.get(`${f[0]}:ru`), translations.get(`${f[0]}:kk`)].filter(Boolean))];
  groups[code].push({ id:f[0], name:translations.get(`${f[0]}:ru`) || translations.get(`${f[0]}:kk`) || f[1], aliases,
    latitude:Number(f[4]), longitude:Number(f[5]), population:Number(f[14]), district:f[11] || '' });
}
mkdirSync('public/settlements', {recursive:true});
const counts={};
for(const [code,places] of Object.entries(groups)) {
  places.sort((a,b)=>b.population-a.population || a.name.localeCompare(b.name,'ru'));
  writeFileSync(`public/settlements/${code}.json`, JSON.stringify(places));
  counts[code]=places.length;
}
writeFileSync('public/settlements/source.json',JSON.stringify({source:'https://www.geonames.org/',license:'CC BY 4.0',importedAt:new Date().toISOString(),counts,excludedUnassigned:excluded}));
console.log({counts,total:Object.values(counts).reduce((a,b)=>a+b,0),excluded});
