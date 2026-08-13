import fs from 'node:fs/promises';

const personData=JSON.parse(await fs.readFile('data/ming_person_institutions.json','utf8'));
const base=JSON.parse(await fs.readFile('data/ming_institution_graph.json','utf8'));
const expansion=JSON.parse(await fs.readFile('data/ming_institution_expansion.json','utf8'));
const canonical=new Map([...base.institutions,...expansion.institutions].map(item=>[item.id,item.name]));
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};
const institutions=new Map((personData.institutions||[]).map(item=>[item.name,item]));
const expected={
  李善长:[['中书省','任职']],胡惟庸:[['中书省','任职']],徐达:[['中书省','兼任']],常遇春:[['中书省','兼任']],
  刘基:[['御史台','任职']],邓愈:[['御史台','任职']],汤和:[['御史台','任职']],宋濂:[['翰林院','任职']],方孝孺:[['翰林院','任职']],
  李文忠:[['大都督府','任职'],['五军都督府','掌理']],沐英:[['大都督府','任职']],蓝玉:[['大都督府','任职']]
};

for(const institution of personData.institutions||[]){
  expect(institution.graph_id,`${institution.name}: missing institution-gallery graph_id`);
  expect(canonical.get(institution.graph_id)===institution.name,`${institution.name}: graph_id ${institution.graph_id} does not reuse the canonical institution with the same name`);
}
for(const [name,links] of Object.entries(expected))for(const [institutionName,relation] of links){
  const institution=institutions.get(institutionName);
  const link=institution?.people?.find(item=>item.name===name&&item.relation===relation);
  expect(link,`${name}: missing ${institutionName} · ${relation}`);
  if(!link)continue;
  expect(link.period,`${name} / ${institutionName}: missing reviewed period label`);
  expect(['高','中'].includes(link.confidence),`${name} / ${institutionName}: missing relationship confidence`);
  expect(Array.isArray(link.sources)&&link.sources.length>0,`${name} / ${institutionName}: missing person-specific source`);
}

const unforced=['王保保','马皇后','傅友德'];
for(const name of unforced){
  const links=[...institutions.values()].flatMap(item=>(item.people||[]).filter(person=>person.name===name).map(person=>`${item.name} · ${person.relation}`));
  expect(links.length===0,`${name}: should not receive a forced Ming institution association (${links.join('；')})`);
}

if(failures.length){console.error(`洪武人物机构关联验证失败（${failures.length}项）：`);failures.forEach(failure=>console.error(`- ${failure}`));process.exit(1)}
console.log('洪武人物机构关联验证通过：12位人物复用制度馆标准节点，关系、时期、置信度和人物专属来源完整，3位边界人物未被强制关联。');
