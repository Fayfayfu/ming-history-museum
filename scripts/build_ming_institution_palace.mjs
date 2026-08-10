import fs from 'node:fs/promises';
import {composeInstitutionPalace} from './lib/institution_palace_model.mjs';
import {renderInstitutionPalace} from './lib/render_institution_palace.mjs';

const root='outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const base=JSON.parse(await fs.readFile('data/ming_institution_graph.json','utf8'));
const expansion=JSON.parse(await fs.readFile('data/ming_institution_expansion.json','utf8'));
const model=composeInstitutionPalace(base,expansion);
await fs.mkdir(root,{recursive:true});
await fs.writeFile(`${root}/institutions.html`,renderInstitutionPalace(model),'utf8');
const legacyRedirect=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=institutions.html"><title>明朝制度馆｜步入大明</title><script>location.replace('institutions.html'+location.search+location.hash)</script></head><body><a href="institutions.html">进入明朝制度馆</a></body></html>`;
await fs.writeFile(`${root}/institutions-palace.html`,legacyRedirect,'utf8');
console.log(`wrote unified institutions.html with ${model.institutions.length} canonical institutions, ${model.relations.length} relations, and ${model.rooms.length} rooms`);
