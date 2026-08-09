import fs from 'node:fs/promises';
import {composeInstitutionPalace} from './lib/institution_palace_model.mjs';
import {renderInstitutionPalace} from './lib/render_institution_palace.mjs';

const root='outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const base=JSON.parse(await fs.readFile('data/ming_institution_graph.json','utf8'));
const expansion=JSON.parse(await fs.readFile('data/ming_institution_expansion.json','utf8'));
const model=composeInstitutionPalace(base,expansion);
await fs.mkdir(root,{recursive:true});
await fs.writeFile(`${root}/institutions-palace.html`,renderInstitutionPalace(model),'utf8');
console.log(`wrote institutions-palace.html with ${model.institutions.length} canonical institutions, ${model.relations.length} relations, and ${model.rooms.length} rooms`);
