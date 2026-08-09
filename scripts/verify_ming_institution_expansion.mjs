import fs from 'node:fs/promises';
import {composeInstitutionPalace,validateInstitutionExpansion} from './lib/institution_palace_model.mjs';

const basePath='data/ming_institution_graph.json';
const expansionPath='data/ming_institution_expansion.json';
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};
const canonicalIds=[
  'hanlin_academy','directorate_education','court_imperial_sacrifices','court_imperial_entertainments',
  'court_imperial_stables','court_state_ceremonial','directorate_astronomy','imperial_medical_court',
  'imperial_seals_office','imperial_clan_court','heir_apparent_household','left_chunfang',
  'right_chunfang','classics_colophon_office','shuntian_prefecture','five_city_patrol_offices'
];
const structuralGroupIds=['five_courts_group','east_palace_offices_group','inner_twenty_four_yamen','twelve_directorates','four_offices','eight_bureaus'];
const validTypes=new Set(['direct_imperial_control','document_flow','formal_subordination','military_coordination','operational_coordination','special_imperial_mandate','supervision_review']);
const validConfidence=new Set(['高','中高']);

let base;
let expansion;
try{
  base=JSON.parse(await fs.readFile(basePath,'utf8'));
}catch(error){
  failures.push(`cannot read ${basePath}: ${error.message}`);
}
try{
  expansion=JSON.parse(await fs.readFile(expansionPath,'utf8'));
}catch(error){
  failures.push(`cannot read ${expansionPath}: ${error.message}`);
}

if(base&&expansion){
  const modelFailures=validateInstitutionExpansion(base,expansion);
  expect(modelFailures.length===0,`composer validation failed: ${modelFailures.join('; ')}`);
  const model=composeInstitutionPalace(base,expansion);
  expect(model.institutions.length===45,'composer must expose 45 canonical institutions');
  expect(model.relations.length===64,'composer must expose 64 reviewed relations');
  expect(model.rooms.length===5,'composer must expose five rooms');
  expect(model.institutionById.get('emperor')?.layer==='axis','base institutions must remain on the axis layer');
  expect(model.institutionById.get('hanlin_academy')?.layer==='room','expansion institutions must remain on the room layer');
  expect(model.roomById.get('inner_court')?.subinstitutions.length===23,'inner-court room must expose all 23 new subinstitutions');
  expect(base.institutions.length===29,'P0 base must remain exactly 29 nodes');
  expect(base.relations.length===47,'P0 base must remain exactly 47 relations');
  expect(expansion.institutions?.length===16,'expected exactly 16 expansion institutions');
  expect(expansion.structural_groups?.length===6,'expected exactly 6 structural groups');
  expect(expansion.subinstitutions?.length===23,'expected exactly 23 new inner-court subinstitutions');
  expect(expansion.rooms?.length===5,'expected exactly five institution rooms');
  expect(expansion.relations?.length===17,'expected exactly 17 reviewed expansion relations');

  const extensionIds=(expansion.institutions||[]).map(item=>item.id);
  expect(JSON.stringify(extensionIds)===JSON.stringify(canonicalIds),'expansion canonical IDs or order changed');
  expect(JSON.stringify((expansion.structural_groups||[]).map(item=>item.id))===JSON.stringify(structuralGroupIds),'structural group IDs or order changed');

  const allRecords=[...(base.institutions||[]),...(expansion.institutions||[])];
  const allIds=allRecords.map(item=>item.id);
  const canonicalIdSet=new Set(allIds);
  expect(canonicalIdSet.size===45,'expected 45 unique composed graph nodes');
  expect(allIds.length===canonicalIdSet.size,'base and expansion institution IDs must not collide');

  const sourceIds=new Set([...(base.sources||[]),...(expansion.sources||[])].map(item=>item.id));
  const systemIds=new Set([...(base.systems||[]),...(expansion.systems||[])].map(item=>item.id));
  for(const item of expansion.institutions||[]){
    expect(item.node_type==='institution',`${item.id}: expansion canonical record must be an institution`);
    expect(item.name&&item.summary&&item.boundary,`${item.id}: missing name, summary, or boundary`);
    expect(systemIds.has(item.system),`${item.id}: unknown system ${item.system}`);
    expect(validConfidence.has(item.confidence),`${item.id}: confidence must be 中高 or 高`);
    expect(Array.isArray(item.active_periods)&&item.active_periods.length>0,`${item.id}: missing active periods`);
    expect(Array.isArray(item.source_ids)&&item.source_ids.length>0,`${item.id}: missing source IDs`);
    for(const sourceId of item.source_ids||[])expect(sourceIds.has(sourceId),`${item.id}: unknown source ${sourceId}`);
    for(const period of item.active_periods||[]){
      expect(Number.isInteger(period.start)&&Number.isInteger(period.end)&&period.start<=period.end,`${item.id}: invalid active period`);
      expect(validConfidence.has(period.confidence),`${item.id}: invalid period confidence`);
    }
  }

  const subIds=new Set((expansion.subinstitutions||[]).map(item=>item.id));
  expect(subIds.size===23,'subinstitution IDs must be unique');
  expect((expansion.subinstitutions||[]).some(item=>item.name==='尚宝监'),'inner-court 尚宝监 record is required');
  expect((expansion.institutions||[]).some(item=>item.name==='尚宝司'),'external 尚宝司 record is required');
  expect((expansion.institutions||[]).some(item=>item.id==='left_chunfang'),'left Chunfang must be independent');
  expect((expansion.institutions||[]).some(item=>item.id==='right_chunfang'),'right Chunfang must be independent');

  const recordById=new Map(allRecords.map(item=>[item.id,item]));
  const relationIds=new Set();
  const relatedExpansionIds=new Set();
  for(const relation of expansion.relations||[]){
    expect(!relationIds.has(relation.id),`${relation.id}: duplicate relation ID`);
    relationIds.add(relation.id);
    expect(canonicalIdSet.has(relation.from)&&canonicalIdSet.has(relation.to),`${relation.id}: relation endpoints must be canonical graph nodes`);
    expect(!subIds.has(relation.from)&&!subIds.has(relation.to),`${relation.id}: subinstitutions cannot be relation endpoints`);
    expect(!structuralGroupIds.includes(relation.from)&&!structuralGroupIds.includes(relation.to),`${relation.id}: structural groups cannot be relation endpoints`);
    expect(validTypes.has(relation.type),`${relation.id}: invalid relation type ${relation.type}`);
    expect(relation.label,`${relation.id}: missing label`);
    expect(validConfidence.has(relation.confidence),`${relation.id}: confidence must be 中高 or 高`);
    expect(Array.isArray(relation.source_ids)&&relation.source_ids.length>0,`${relation.id}: missing source IDs`);
    for(const sourceId of relation.source_ids||[])expect(sourceIds.has(sourceId),`${relation.id}: unknown source ${sourceId}`);
    for(const period of relation.active_periods||[]){
      const from=recordById.get(relation.from),to=recordById.get(relation.to);
      const fromActive=from?.active_periods?.some(active=>period.start>=active.start&&period.end<=active.end);
      const toActive=to?.active_periods?.some(active=>period.start>=active.start&&period.end<=active.end);
      expect(fromActive&&toActive,`${relation.id}: relation period exceeds an endpoint active period`);
      expect(validConfidence.has(period.confidence),`${relation.id}: invalid period confidence`);
    }
    if(extensionIds.includes(relation.from))relatedExpansionIds.add(relation.from);
    if(extensionIds.includes(relation.to))relatedExpansionIds.add(relation.to);
  }
  for(const id of canonicalIds)expect(relatedExpansionIds.has(id),`${id}: expansion institution requires at least one reviewed relation`);

  const roomIds=new Set((expansion.rooms||[]).map(room=>room.id));
  expect(roomIds.size===5,'room IDs must be unique');
  for(const room of expansion.rooms||[]){
    expect(room.name&&room.question&&room.axis_anchor,`${room.id}: missing room presentation fields`);
    for(const id of room.institution_ids||[])expect(canonicalIdSet.has(id),`${room.id}: unknown room institution ${id}`);
    for(const id of room.structural_group_ids||[])expect(structuralGroupIds.includes(id),`${room.id}: unknown structural group ${id}`);
  }
}

if(failures.length){
  console.error(`Institution expansion verification failed (${failures.length}):`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Institution expansion verification passed: 16 institutions, 6 groups, 23 subinstitutions, 17 relations, 45 composed nodes.');
