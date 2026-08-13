import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const pageUrl=name=>`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`;
const samples=['夏原吉','石亨','刘瑾','魏忠贤','万贵妃','徐霞客','王保保','朱柏','宁国公主'];
const errors=[];

const [core,children,timeline,stories,pages1,pages2,emperorProfiles]=await Promise.all([
  fs.readFile('data/ming_core.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_children_important.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_people_timeline.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_storytelling.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_person_pages.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_person_pages_batch2.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_emperor_drawer_profiles.json','utf8').then(JSON.parse)
]);
const canonical=value=>String(value||'').replaceAll('標','标').replaceAll('熜','炽').replaceAll('鎮','镇').replaceAll('鈞','钧').replaceAll('載','载').replaceAll('檢','检');
const uniquePeople=new Map([...core,...children].map(person=>[canonical(person.name||person.title),person]));
const fullProfiles={...(pages1.people||{}),...(pages2.people||{}),...(emperorProfiles.people||{})};
const timelinePeople=new Map((timeline.people||[]).map(person=>[canonical(person.name),person]));
const sourceCatalog=timeline.source_catalog||{};
for(const [name] of uniquePeople){
  const hasFullStory=Boolean(stories.people?.[name]||fullProfiles[name]);
  if(hasFullStory)continue;
  const entry=timelinePeople.get(name);
  if(!entry?.timeline_year_label||!entry?.timeline_year_basis)errors.push(`${name}: 基础传记缺少可用的时间轴锚点`);
  if(!entry?.timeline_source_refs?.length||entry.timeline_source_refs.some(ref=>!sourceCatalog[ref]?.url))errors.push(`${name}: 基础传记的时间轴来源无法追溯`);
}
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  for(const name of samples){
    await page.goto(pageUrl(name),{waitUntil:'networkidle'});
    const audit=await page.evaluate(()=>({
      heading:document.querySelector('#detail .life-story-foundation h4')?.textContent.trim()||'',
      kicker:document.querySelector('#detail .life-story-foundation .life-story-kicker')?.textContent.trim()||'',
      chapters:[...document.querySelectorAll('#detail .life-story-foundation .life-chapter')].map(node=>({year:node.querySelector('.life-year > span')?.textContent.trim()||'',era:node.querySelector('.life-era')?.textContent.trim()||'',title:node.querySelector('h5')?.textContent.trim()||'',text:node.querySelector('p')?.textContent.trim()||''})),
      evidenceHref:document.querySelector('#detail .life-story-foundation .life-story-source')?.getAttribute('href')||'',
      boundary:document.querySelector('#detail .life-story-foundation .life-story-boundary')?.textContent.trim()||'',
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    }));
    if(audit.heading!==`${name}的一生`||!audit.kicker.includes('基础传记'))errors.push(`${name}: 缺少明确的一生故事标题或基础传记标识`);
    if(audit.chapters.length!==4||audit.chapters.some(chapter=>!chapter.year||!chapter.era||!chapter.title||chapter.text.length<15))errors.push(`${name}: 四阶段生平骨架或年号不完整：${JSON.stringify(audit.chapters)}`);
    if(!audit.evidenceHref)errors.push(`${name}: 首次公共活动阶段缺少时间轴史料入口`);
    if(!audit.boundary.includes('不补写')||!audit.boundary.includes('心理'))errors.push(`${name}: 缺少基础传记证据边界`);
    if(audit.bodyWidth>audit.viewport)errors.push(`${name}: 桌面端横向溢出`);
  }
  await page.goto(pageUrl('胡惟庸'),{waitUntil:'networkidle'});
  const existing=await page.evaluate(()=>({foundation:document.querySelectorAll('#detail .life-story-foundation').length,chapters:document.querySelectorAll('#detail .life-line .life-chapter').length}));
  if(existing.foundation!==0||existing.chapters<3)errors.push(`已有完整故事不应被基础传记覆盖：${JSON.stringify(existing)}`);
  await page.goto(pageUrl('朱元璋'),{waitUntil:'networkidle'});
  const emperor=await page.evaluate(()=>({foundation:document.querySelectorAll('#detail .life-story-foundation').length,quick:document.querySelectorAll('#detail .profile-quick-node').length}));
  if(emperor.foundation!==0||emperor.quick!==6)errors.push(`皇帝六阶段速览不应被基础传记覆盖：${JSON.stringify(emperor)}`);
  await page.goto(pageUrl('朱标'),{waitUntil:'networkidle'});
  const childStory=await page.evaluate(()=>({foundation:document.querySelectorAll('#detail .life-story-foundation').length,chapters:document.querySelectorAll('#detail .life-line .life-chapter').length}));
  if(childStory.foundation!==0||childStory.chapters<4)errors.push(`朱标已有的完整故事不应被基础传记覆盖：${JSON.stringify(childStory)}`);
  await page.setViewportSize({width:390,height:844});
  await page.goto(pageUrl('夏原吉'),{waitUntil:'networkidle'});
  const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,chapters:document.querySelectorAll('#detail .life-story-foundation .life-chapter').length}));
  if(mobile.bodyWidth>mobile.viewport||mobile.chapters!==4)errors.push(`基础传记移动端异常：${JSON.stringify(mobile)}`);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(pageUrl('夏原吉'),{waitUntil:'networkidle'});
  if(await page.locator('#detail .life-story-foundation').count())await page.locator('#detail .life-story-foundation').screenshot({path:'/tmp/li-shanchang-life-story.png'});
}finally{await browser.close()}

if(errors.length){console.error(`人物一生故事验证失败（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log(`人物一生故事验证通过：${uniquePeople.size} 位人物均有完整故事、人物页/皇帝速览或可追溯的四阶段基础传记；八类代表人物通过桌面与移动端渲染检查。`);
