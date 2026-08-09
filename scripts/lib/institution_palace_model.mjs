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

export {activeAt};
