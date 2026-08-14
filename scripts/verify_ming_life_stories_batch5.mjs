import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const names=['王守仁','张居正','李时珍','徐光启'];
const banned=['生卒与出身','进入历史现场','主要行动与位置','结局与历史影响'];
const core=JSON.parse(await fs.readFile('data/ming_core.json','utf8'));
const primary=JSON.parse(await fs.readFile('data/ming_person_pages.json','utf8')).people||{};
const batch2=JSON.parse(await fs.readFile('data/ming_person_pages_batch2.json','utf8')).people||{};
const pages={...primary,...batch2};
const errors=[];

for(const name of names){
  const person=core.find(item=>item.name===name);
  const profile=pages[name];
  if(!person){errors.push(`${name}: 人物主表缺失`);continue}
  if((person.summary||'').length<34)errors.push(`${name}: 主要作为仍过短`);
  if((person.evaluation||'').length<38)errors.push(`${name}: 历史评价仍过短`);
  const sourceUrls=[person.source1,person.source2].filter(Boolean);
  if(sourceUrls.length<2||sourceUrls.some(url=>/wikipedia\.org|^https:\/\/ctext\.org\/?(?:zh)?$/.test(url)))errors.push(`${name}: 基本卡来源仍是百科或泛入口`);
  if(!profile){errors.push(`${name}: 缺少独立页数据`);continue}
  if(profile.readingMode!=='clear-biography')errors.push(`${name}: 抽屉未启用清晰传记模式`);
  if(!Array.isArray(profile.scenes)||profile.scenes.length<5||profile.scenes.length>6)errors.push(`${name}: 应有5至6个共用人生阶段`);
  for(const scene of profile.scenes||[]){
    if(!scene.year||!scene.title||(scene.preview||'').length<28)errors.push(`${name}: 抽屉速览字段不完整`);
    if(!Array.isArray(scene.body)||scene.body.length<2||scene.body.some(text=>text.length<55)||!scene.evidence)errors.push(`${name}: 独立页场景不完整`);
    if(banned.includes(scene.title))errors.push(`${name}: 使用禁用模板标题“${scene.title}”`);
  }
  if((profile.sources||[]).length<4)errors.push(`${name}: 独立页证据入口不足`);
}

const joined=name=>JSON.stringify({core:core.find(item=>item.name===name),page:pages[name]});
if(!/龙场|知行合一|宁王/.test(joined('王守仁')))errors.push('王守仁: 思想、贬谪与军政行动未贯通');
if(!/李太后|冯保|考成|清丈|夺情/.test(joined('张居正')))errors.push('张居正: 辅政结构与改革代价不完整');
if(!/辨误|分类|本草纲目|现代临床/.test(joined('李时珍')))errors.push('李时珍: 编纂方法或现代医学边界不完整');
if(!/几何原本|农政|历局|火器/.test(joined('徐光启')))errors.push('徐光启: 知识工程链条不完整');

if(!errors.length){
  const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
  const hallUrl=name=>`${pathToFileURL(path.join(root,'people.html')).href}?person=${encodeURIComponent(name)}`;
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    for(const name of names){
      await page.goto(hallUrl(name),{waitUntil:'networkidle'});
      const drawer=await page.evaluate(()=>({
        question:document.querySelector('#detail .profile-preview-head h5')?.textContent.trim()||'',
        lead:document.querySelector('#detail .profile-preview>p')?.textContent.trim()||'',
        chapters:[...document.querySelectorAll('#detail .profile-quick-node')].map(node=>({
          year:node.querySelector('.profile-quick-date b')?.textContent.trim()||'',
          reign:node.querySelector('.profile-quick-reign')?.textContent.trim()||'',
          title:node.querySelector('.profile-quick-copy>span')?.textContent.trim()||'',
          preview:node.querySelector('.profile-quick-summary')?.textContent.trim()||''
        })),
        enter:document.querySelector('#detail .profile-enter')?.getAttribute('href')||'',
        bodyWidth:document.body.scrollWidth,
        viewport:innerWidth
      }));
      if(drawer.question.length<18||drawer.lead.length<60)errors.push(`${name}: 抽屉主问题或概述过短`);
      if(drawer.chapters.length<5||drawer.chapters.length>6||drawer.chapters.some(item=>!item.year||!item.reign||!item.title||item.preview.length<28))errors.push(`${name}: 抽屉阶段、双纪年或简介不完整`);
      if(!drawer.enter||drawer.bodyWidth>drawer.viewport)errors.push(`${name}: 独立页入口或桌面宽度异常`);
    }
    await page.setViewportSize({width:390,height:844});
    for(const name of names){
      await page.goto(hallUrl(name),{waitUntil:'networkidle'});
      const mobile=await page.evaluate(()=>({
        pathname:decodeURIComponent(location.pathname),
        storyScenes:document.querySelectorAll('.story > .chapter').length,
        bodyWidth:document.body.scrollWidth,
        viewport:innerWidth
      }));
      if(!/\/people\/.+\.html$/.test(mobile.pathname)||mobile.storyScenes<5||mobile.storyScenes>6||mobile.bodyWidth>mobile.viewport)errors.push(`${name}: 390px独立页跳转、阶段或宽度异常`);
    }
  }finally{
    await browser.close();
  }
}

if(errors.length){
  console.error(`人物文案第五批未通过（${errors.length}项）：`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('人物文案第五批通过：四人人物卡、5至6段双纪年速览、独立页入口、证据边界及桌面/移动端布局完整。');
