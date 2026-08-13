import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const names=['商辂','石亨','刘瑾','魏忠贤','孙承宗','秦良玉'];
const banned=new Set(['生卒与出身','进入历史现场','主要行动与位置','结局与历史影响']);
const data=JSON.parse(await fs.readFile('data/ming_storytelling.json','utf8'));
const errors=[];
const titles=[];

for(const name of names){
  const story=data.people?.[name];
  if(!story){errors.push(`${name}: 缺少完整故事`);continue}
  if((story.hook||'').length<22)errors.push(`${name}: 专属主旨过短`);
  if((story.arc||'').length<70)errors.push(`${name}: 生平主线不足`);
  if(!Array.isArray(story.chapters)||story.chapters.length<4||story.chapters.length>6)errors.push(`${name}: 应有4至6个转折章节`);
  for(const chapter of story.chapters||[]){
    if(!chapter.year||!chapter.title||(chapter.text||'').length<45||!['fact','inference'].includes(chapter.layer))errors.push(`${name}: 章节结构不完整`);
    if(banned.has(chapter.title))errors.push(`${name}: 仍在使用通用模板标题“${chapter.title}”`);
    titles.push(chapter.title);
  }
  if((story.reading||'').length<55||story.readingLayer!=='inference')errors.push(`${name}: 缺少解释层`);
  if((story.moment||'').length<35||!['fact','inference'].includes(story.momentLayer))errors.push(`${name}: 缺少阅读边界`);
  if(!Array.isArray(story.sources)||story.sources.length<1||story.sources.some(url=>!/^https?:\/\//.test(url)))errors.push(`${name}: 史料入口不完整`);
  if(!Array.isArray(story.sourceBasis)||story.sourceBasis.length<1||story.sourceBasis.some(item=>!item.volume||!item.scope||!item.confidence))errors.push(`${name}: 缺少《明史》卷次定位`);
  if(!Array.isArray(story.followupQuestions)||story.followupQuestions.length<2)errors.push(`${name}: 后续多源待核问题不足两项`);
}

const repeated=[...new Set(titles.filter((title,index)=>titles.indexOf(title)!==index))];
if(repeated.length)errors.push(`批次内出现重复转折标题：${repeated.join('、')}`);

const joined=name=>JSON.stringify(data.people?.[name]||{});
if(!/三元|内阁/.test(joined('商辂')))errors.push('商辂：未呈现科举声望与中枢位置');
if(!/北京|夺门/.test(joined('石亨')))errors.push('石亨：未同时呈现守城军功与夺门政治');
if(!/司礼监|奏章|批红/.test(joined('刘瑾')))errors.push('刘瑾：未解释司礼监控制方式');
if(!/厂卫|东林|阉党/.test(joined('魏忠贤')))errors.push('魏忠贤：未解释跨机构网络');
if(!/辽东|关宁|经略/.test(joined('孙承宗')))errors.push('孙承宗：未解释辽东防御体系');
if(!/石砫|白杆兵|总兵/.test(joined('秦良玉')))errors.push('秦良玉：未呈现地方动员与正式军职');

if(!errors.length){
  const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
  const pageUrl=name=>`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`;
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
    for(const name of names){
      await page.goto(pageUrl(name),{waitUntil:'networkidle'});
      const audit=await page.evaluate(()=>({
        foundation:document.querySelectorAll('#detail .life-story-foundation').length,
        chapters:[...document.querySelectorAll('#detail .life-line .life-chapter')].map(node=>({
          year:node.querySelector('.life-year > span')?.textContent.trim()||'',
          title:node.querySelector('h5')?.textContent.trim()||''
        })),
        readingHeading:document.querySelector('#detail .interpretation h5')?.textContent.trim()||'',
        reading:document.querySelector('#detail .interpretation p')?.textContent.trim()||'',
        bodyWidth:document.body.scrollWidth,
        viewport:innerWidth
      }));
      if(audit.foundation!==0)errors.push(`${name}: 生成页仍显示四段基础模板`);
      if(audit.chapters.length<4||audit.chapters.length>6)errors.push(`${name}: 生成页应显示4至6个专属章节`);
      if(audit.chapters.some(chapter=>!chapter.year||!chapter.year.includes('·')||!chapter.title))errors.push(`${name}: 生成页双纪年或章节标题不完整`);
      if(audit.readingHeading!=='怎样理解这个人'||audit.reading.length<55)errors.push(`${name}: 生成页缺少人物理解段`);
      if(audit.bodyWidth>audit.viewport)errors.push(`${name}: 桌面端横向溢出`);
    }
    await page.setViewportSize({width:390,height:844});
    for(const name of ['商辂','刘瑾','秦良玉']){
      await page.goto(pageUrl(name),{waitUntil:'networkidle'});
      const mobile=await page.evaluate(()=>({
        chapters:document.querySelectorAll('#detail .life-line .life-chapter').length,
        bodyWidth:document.body.scrollWidth,
        viewport:innerWidth
      }));
      if(mobile.chapters<4||mobile.chapters>6||mobile.bodyWidth>mobile.viewport)errors.push(`${name}: 移动端章节或宽度异常：${JSON.stringify(mobile)}`);
    }
  }finally{
    await browser.close();
  }
}

if(errors.length){console.error(`人物一生故事第四批未通过（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log(`人物一生故事第四批通过：${names.length}人均有专属主旨、完整主线、非模板转折、《明史》卷次定位和至少两项后续待核问题；抽屉双纪年及桌面/移动端布局正常。`);
