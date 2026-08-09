import fs from 'node:fs/promises';
import {ATLAS_LAYOUT,buildPeopleByInstitution,validateAtlasLayout} from './lib/institution_atlas_layout.mjs';
import {renderInstitutionGallery} from './lib/render_institution_gallery.mjs';

const root='outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const graph=JSON.parse(await fs.readFile('data/ming_institution_graph.json','utf8'));
const personInstitutions=JSON.parse(await fs.readFile('data/ming_person_institutions.json','utf8'));
const failures=validateAtlasLayout(graph,ATLAS_LAYOUT);
if(failures.length)throw new Error(`Invalid institution atlas layout:\n${failures.join('\n')}`);
const html=renderInstitutionGallery({graph,peopleByInstitution:buildPeopleByInstitution(personInstitutions),layout:ATLAS_LAYOUT});
await fs.mkdir(root,{recursive:true});
await fs.writeFile(`${root}/institutions.html`,html,'utf8');
console.log(`wrote institutions.html with ${graph.institutions.length} nodes and ${graph.relations.length} relations`);
