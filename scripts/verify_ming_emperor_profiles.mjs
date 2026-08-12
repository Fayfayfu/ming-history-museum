import fs from 'node:fs/promises';

const emperorNames=['朱元璋','朱允炆','朱棣','朱高炽','朱瞻基','朱祁镇','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校','朱由检'];
const primary=JSON.parse(await fs.readFile('data/ming_person_pages.json','utf8'));
const drawer=JSON.parse(await fs.readFile('data/ming_emperor_drawer_profiles.json','utf8'));
const people={朱元璋:primary.people?.朱元璋,...(drawer.people||{})};
const errors=[];
for(const name of emperorNames){
  const p=people[name];
  if(!p){errors.push(`${name} 缺少新版人物卡资料`);continue;}
  if(!['founder','emperor-readable'].includes(p.basicInfo?.layout))errors.push(`${name} 缺少新版基础信息布局标记`);
  if(!p.heroQuestion||!p.lead)errors.push(`${name} 缺少人物速览问题或概括`);
  if(!Array.isArray(p.scenes)||p.scenes.length!==6)errors.push(`${name} 人物速览不是六个阶段`);
  for(const [index,scene] of (p.scenes||[]).entries()){
    if(!scene.year||!scene.reignYears||!scene.title||!scene.preview)errors.push(`${name} 第${index+1}阶段缺少年份、年号、标题或摘要`);
    if((scene.title||'').length>18)errors.push(`${name} 第${index+1}阶段标题过长`);
    if((scene.preview||'').length<28)errors.push(`${name} 第${index+1}阶段摘要过短，无法交代背景与结果`);
  }
  if(!p.assessment?.achievementsTitle||!p.assessment?.achievements||!p.assessment?.evaluationTitle||!p.assessment?.evaluation||!p.assessment?.boundary)errors.push(`${name} 统治概览或说明不完整`);
  const governance=p.governance||p.basicInfo?.institutionReforms||[];
  if(!governance.length||governance.length>4)errors.push(`${name} 统治与制度应有1至4项`);
}
if(Object.keys(people).filter(name=>emperorNames.includes(name)).length!==16)errors.push('新版皇帝人物卡资料必须覆盖16位皇帝');
if(people.朱祐樘?.scenes?.[1]?.year!=='1475—1487'||!people.朱祐樘?.scenes?.[1]?.reignYears?.includes('成化十一年'))errors.push('朱祐樘公开身份与立储应从1475年、成化十一年起算');
if(!people.朱常洛?.scenes?.[5]?.preview?.includes('在位约一月'))errors.push('朱常洛末阶段必须明确在位约一月');
if(errors.length){console.error(`皇帝人物卡资料验证失败（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('皇帝人物卡资料验证通过：16位皇帝均具备新版基础信息、六阶段人物速览、统治概览与制度说明。');
