export const INSTITUTION_ID_MAP=Object.freeze({
  jinyiwei:'embroidered_uniform_guard',dongchang:'eastern_depot',xichang:'western_depot',
  silijian:'directorate_ceremonial',cabinet:'grand_secretariat',censorate:'censorate',
  'ministry-personnel':'ministry_personnel','ministry-revenue':'ministry_revenue',
  'ministry-rites':'ministry_rites','ministry-war':'ministry_war',
  'ministry-justice':'ministry_justice','ministry-works':'ministry_works'
});

export const ATLAS_LAYOUT=Object.freeze({
  emperor:{x:50,y:7,region:'axis',tier:0},
  central_secretariat:{x:50,y:20,region:'axis',tier:1},chancellor:{x:39,y:20,region:'axis',tier:1},
  grand_secretariat:{x:50,y:20,region:'axis',tier:1},
  six_ministries:{x:50,y:38,region:'axis',tier:2},
  ministry_personnel:{x:34,y:47,region:'civil',tier:3},ministry_revenue:{x:41,y:47,region:'civil',tier:3},
  ministry_rites:{x:47,y:47,region:'civil',tier:3},ministry_war:{x:53,y:47,region:'civil',tier:3},
  ministry_justice:{x:59,y:47,region:'civil',tier:3},ministry_works:{x:66,y:47,region:'civil',tier:3},
  transmission_office:{x:38,y:33,region:'civil',tier:2},
  censorate_platform:{x:14,y:23,region:'supervision',tier:1},censorate:{x:14,y:23,region:'supervision',tier:1},
  six_offices:{x:25,y:34,region:'supervision',tier:2},court_judicial_review:{x:17,y:49,region:'supervision',tier:3},
  three_judicial_offices:{x:25,y:49,region:'supervision',tier:3},
  directorate_ceremonial:{x:75,y:22,region:'inner',tier:1},embroidered_uniform_guard:{x:86,y:33,region:'inner',tier:2},
  eastern_depot:{x:75,y:39,region:'inner',tier:2},western_depot:{x:88,y:48,region:'inner',tier:3},
  chief_military_commission:{x:40,y:62,region:'military',tier:4},five_commissions:{x:46,y:62,region:'military',tier:4},
  guard_battalion_system:{x:54,y:70,region:'military',tier:5},
  provincial_admin_commission:{x:27,y:82,region:'local',tier:6},provincial_surveillance_commission:{x:42,y:82,region:'local',tier:6},
  regional_military_commission:{x:58,y:82,region:'local',tier:6},grand_coordinator_supreme_commander:{x:73,y:82,region:'local',tier:6},
  prefecture_subprefecture_county:{x:50,y:93,region:'local',tier:7}
});

export function buildPeopleByInstitution(data){
  return Object.fromEntries(data.institutions.flatMap(item=>{
    const graphId=INSTITUTION_ID_MAP[item.id];
    return graphId?[[graphId,item.people]]:[];
  }));
}

export function validateAtlasLayout(graph,layout=ATLAS_LAYOUT){
  const failures=[];const ids=new Set(graph.institutions.map(item=>item.id));
  for(const id of ids){
    const point=layout[id];
    if(!point)failures.push(`${id}: missing semantic position`);
    else if(point.x<5||point.x>95||point.y<4||point.y>96)failures.push(`${id}: position outside safe canvas`);
  }
  for(const id of Object.keys(layout))if(!ids.has(id))failures.push(`${id}: layout references unknown institution`);
  return failures;
}
