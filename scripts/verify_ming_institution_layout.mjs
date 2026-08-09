import fs from 'node:fs/promises';
import {ATLAS_LAYOUT, validateAtlasLayout} from './lib/institution_atlas_layout.mjs';

const graph=JSON.parse(await fs.readFile('data/ming_institution_graph.json','utf8'));
const failures=validateAtlasLayout(graph,ATLAS_LAYOUT);
const expect=(condition,message)=>{if(!condition)failures.push(message)};

expect(Object.keys(ATLAS_LAYOUT).length===29,'layout must cover exactly 29 nodes');
expect(ATLAS_LAYOUT.emperor.x===50&&ATLAS_LAYOUT.emperor.y<12,'emperor must anchor the upper central axis');
expect(ATLAS_LAYOUT.grand_secretariat.x===50,'grand secretariat must remain on the central axis');
expect(ATLAS_LAYOUT.six_ministries.x===50,'six ministries group must remain on the central axis');
expect(ATLAS_LAYOUT.censorate.x<35,'censorate must occupy the supervision wing');
expect(ATLAS_LAYOUT.directorate_ceremonial.x>65,'directorate of ceremonial must occupy the inner-court wing');
expect(ATLAS_LAYOUT.prefecture_subprefecture_county.y>75,'prefecture hierarchy must occupy the local lower tier');

if(failures.length){
  console.error(`Institution layout verification failed (${failures.length}):`);
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Institution atlas layout verification passed: 29 semantic positions and central-axis constraints.');
