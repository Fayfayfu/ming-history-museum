import {INSTITUTION_ID_MAP} from './institution_atlas_layout.mjs';

const VALID_RELATION_TYPES=new Set([
  'direct_imperial_control','document_flow','formal_subordination','military_coordination',
  'operational_coordination','special_imperial_mandate','supervision_review'
]);

const activeAt=(record,year)=>record?.active_periods?.some(period=>year>=period.start&&year<=period.end)??false;

export function validateInstitutionExpansion(base,expansion){
  const failures=[];
  const expect=(condition,message)=>{if(!condition)failures.push(message);};
  expect(base?.institutions?.length===29,'base graph must retain 29 institutions');
  expect(base?.relations?.length===47,'base graph must retain 47 relations');
  expect(expansion?.institutions?.length===16,'expansion must contain 16 institutions');
  expect(expansion?.rooms?.length===5,'expansion must contain five rooms');
  expect(expansion?.relations?.length===17,'expansion must contain 17 relations');

  const allInstitutions=[...(base?.institutions||[]),...(expansion?.institutions||[])];
  const institutionIds=new Set(allInstitutions.map(item=>item.id));
  expect(institutionIds.size===allInstitutions.length,'canonical institution IDs must be unique');
  const groupIds=new Set((expansion?.structural_groups||[]).map(item=>item.id));
  const subIds=new Set((expansion?.subinstitutions||[]).map(item=>item.id));

  for(const group of expansion?.structural_groups||[]){
    for(const id of group.member_ids||[])expect(institutionIds.has(id)||subIds.has(id),`${group.id}: unknown member ${id}`);
    for(const id of group.member_group_ids||[])expect(groupIds.has(id),`${group.id}: unknown member group ${id}`);
  }
  for(const room of expansion?.rooms||[]){
    expect(institutionIds.has(room.axis_anchor),`${room.id}: unknown axis anchor ${room.axis_anchor}`);
    for(const id of room.institution_ids||[])expect(institutionIds.has(id),`${room.id}: unknown institution ${id}`);
    for(const id of room.structural_group_ids||[])expect(groupIds.has(id),`${room.id}: unknown group ${id}`);
  }
  for(const relation of expansion?.relations||[]){
    expect(institutionIds.has(relation.from)&&institutionIds.has(relation.to),`${relation.id}: unknown endpoint`);
    expect(VALID_RELATION_TYPES.has(relation.type),`${relation.id}: invalid relation type`);
  }
  return failures;
}

export function composeInstitutionPalace(base,expansion){
  const failures=validateInstitutionExpansion(base,expansion);
  if(failures.length)throw new Error(`Invalid institution palace expansion:\n${failures.join('\n')}`);

  const baseIds=new Set(base.institutions.map(item=>item.id));
  const institutions=[
    ...base.institutions.map(item=>({...item,layer:'axis'})),
    ...expansion.institutions.map(item=>({...item,layer:'room'}))
  ];
  const institutionById=new Map(institutions.map(item=>[item.id,item]));
  const groupById=new Map(expansion.structural_groups.map(item=>[item.id,{...item}]));
  const subById=new Map(expansion.subinstitutions.map(item=>[item.id,{...item}]));
  const expandGroup=id=>{
    const group=groupById.get(id);
    if(!group)return [];
    return [
      ...(group.member_ids||[]).map(memberId=>institutionById.get(memberId)||subById.get(memberId)).filter(Boolean),
      ...(group.member_group_ids||[]).flatMap(expandGroup)
    ];
  };
  const rooms=expansion.rooms.map(room=>({
    ...room,
    institutions:room.institution_ids.map(id=>institutionById.get(id)).filter(Boolean),
    structuralGroups:room.structural_group_ids.map(id=>groupById.get(id)).filter(Boolean),
    subinstitutions:[...new Map(room.structural_group_ids.flatMap(expandGroup).filter(item=>subById.has(item.id)).map(item=>[item.id,item])).values()]
  }));
  return {
    metadata:{...base.metadata,expansion_version:expansion.metadata?.version||'P1'},
    systems:[...base.systems,...expansion.systems],
    phases:base.phases,
    periods:base.periods,
    institutions,
    relations:[...base.relations,...expansion.relations],
    structuralGroups:expansion.structural_groups,
    subinstitutions:expansion.subinstitutions,
    rooms,
    sources:[...base.sources,...expansion.sources],
    institutionById,
    roomById:new Map(rooms.map(room=>[room.id,room])),
    activeAt,
    baseIds
  };
}

export function buildInstitutionPeople(personInstitutions,core,portraits,storytelling,phases){
  const coreByName=new Map(core.map(person=>[person.name,person]));
  const portraitByName=portraits?.people||{};
  const storyByName=storytelling?.people||{};
  const tenureRanges=person=>{
    const starts=String(person.office_start??'').split(/[;；、]/).map(Number).filter(Number.isFinite);
    const ends=String(person.office_end??'').split(/[;；、]/).map(Number).filter(Number.isFinite);
    return starts.map((start,index)=>({start,end:ends[index]??ends.at(-1)??start})).filter(period=>period.start<=period.end);
  };
  const personCard=(person,link)=>{
    const periods=tenureRanges(person);
    const phaseIds=(phases||[]).filter(phase=>periods.some(period=>period.start<=phase.end&&period.end>=phase.start)).map(phase=>phase.id);
    const portrait=portraitByName[person.name]?.file||storyByName[person.name]?.portrait||'';
    const portraitLabel=portraitByName[person.name]?.status==='imagined'||storyByName[person.name]?.portraitKind==='AI想象像'?'AI想象像':'人物图像';
    return {
      name:person.name,
      relation:link.relation,
      note:link.note,
      category:person.category||'',
      office:person.office||'',
      office_start:person.office_start,
      office_end:person.office_end,
      office_period:periods.map(period=>period.start===period.end?String(period.start):`${period.start}—${period.end}`).join('、'),
      confidence:person.confidence||'',
      portrait,
      portrait_label:portraitLabel,
      phase_ids:phaseIds
    };
  };
  const result={};
  for(const institution of personInstitutions?.institutions||[]){
    const graphId=INSTITUTION_ID_MAP[institution.id];
    if(!graphId)continue;
    result[graphId]=(institution.people||[]).map(link=>{
      const person=coreByName.get(link.name)||{};
      return personCard({...person,name:link.name},link);
    });
  }
  result.emperor=core.filter(person=>person.category==='皇帝').map(person=>personCard(person,{
    relation:'在位',
    note:person.summary||'该人物在本期担任明朝皇帝。'
  }));
  return result;
}

export {activeAt};
