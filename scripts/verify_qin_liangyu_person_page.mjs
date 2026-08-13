import fs from 'node:fs/promises';

const root='outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const source=JSON.parse(await fs.readFile('data/ming_person_pages_batch2.json','utf8'));
const page=source.people?.秦良玉;
const errors=[];

if(!page) errors.push('独立人物页数据缺少秦良玉');
if(page){
  if(page.slug!=='qin-liang-yu') errors.push('slug 必须为 qin-liang-yu');
  if(page.readingMode!=='clear-biography') errors.push('人物抽屉必须使用清晰传记模式');
  if(page.scenes?.length!==6) errors.push('独立页必须包含六个具体人生阶段');
  if(page.scenes?.some(scene=>!scene.reignYears||scene.reignYears.includes('待考'))) errors.push('六阶段均须显示可读年号');
  if(page.scenes?.some(scene=>!scene.preview)) errors.push('六阶段均须提供抽屉短文案');
  if(page.scenes?.some(scene=>!scene.primarySource?.url)) errors.push('六阶段均须提供主要史料入口');
  if(page.feature?.title!=='一支白杆兵 · 五个支撑条件') errors.push('缺少白杆兵五项支撑条件模块');
  if(page.feature?.items?.length!==5) errors.push('白杆兵支撑模块必须恰有五项');
  const all=JSON.stringify(page);
  for(const token of ['石砫','白杆兵','总兵','援辽','勤王','地方志','中置信度']){
    if(!all.includes(token)) errors.push(`独立页缺少必要内容：${token}`);
  }
  for(const banned of ['生卒与出身','进入历史现场','主要行动与位置','结局与历史影响','唯一女将军','忠贞侯']){
    if(all.includes(banned)) errors.push(`独立页包含禁用套话或口号：${banned}`);
  }
}

let html='';
try{html=await fs.readFile(`${root}/people/qin-liang-yu.html`,'utf8')}catch{}
if(!html) errors.push('未生成 people/qin-liang-yu.html');
else{
  if(!html.includes('<title>秦良玉的一生')) errors.push('生成页标题不正确');
  if((html.match(/class="chapter reveal"/g)||[]).length!==6) errors.push('生成页没有六个章节');
  if((html.match(/class="chapter-reign"/g)||[]).length!==6) errors.push('生成页没有六组年号');
  if(!html.includes('一支白杆兵 · 五个支撑条件')) errors.push('生成页缺少特色模块');
  if(!html.includes('进入她的一生')) errors.push('女性人物页入口仍使用男性代词');
}

let hall='';
try{hall=await fs.readFile(`${root}/people.html`,'utf8')}catch{}
if(!hall.includes('&quot;slug&quot;:&quot;qin-liang-yu&quot;')&&!hall.includes('"slug":"qin-liang-yu"')) errors.push('人物馆数据未生成秦良玉独立页入口');

if(errors.length){
  console.error(`秦良玉独立人物页验证失败（${errors.length}项）：`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('秦良玉独立人物页验证通过：六阶段、双纪年、抽屉入口、五项支撑与证据边界完整。');
