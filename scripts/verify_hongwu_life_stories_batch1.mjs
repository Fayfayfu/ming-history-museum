import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import path from 'node:path';

const names=['李善长','刘基','宋濂','常遇春','汤和','李文忠','邓愈','沐英','傅友德','蓝玉'];
const banned=new Set(['生卒与出身','进入历史现场','主要行动与位置','结局与历史影响']);
const data=JSON.parse(await fs.readFile('data/ming_storytelling.json','utf8'));
const errors=[];
const allTitles=[];

for(const name of names){
  const story=data.people?.[name];
  if(!story){errors.push(`${name}: 缺少完整故事`);continue}
  if((story.hook||'').length<22)errors.push(`${name}: 专属主旨过短`);
  if((story.arc||'').length<70)errors.push(`${name}: 生平主线不足`);
  if(!Array.isArray(story.chapters)||story.chapters.length<4||story.chapters.length>6)errors.push(`${name}: 应有4至6个转折章节`);
  for(const chapter of story.chapters||[]){
    if(!chapter.year||!chapter.title||(chapter.text||'').length<45||!['fact','inference'].includes(chapter.layer))errors.push(`${name}: 章节结构不完整 ${JSON.stringify(chapter)}`);
    if(banned.has(chapter.title))errors.push(`${name}: 仍在使用通用模板标题“${chapter.title}”`);
    allTitles.push([name,chapter.title]);
  }
  if((story.reading||'').length<55||story.readingLayer!=='inference')errors.push(`${name}: 缺少“怎样理解这个人”的解释层`);
  if(!Array.isArray(story.sources)||story.sources.length<1||story.sources.some(url=>!/^https?:\/\//.test(url)))errors.push(`${name}: 史料入口不完整`);
}

const repeated=[...new Set(allTitles.map(([,title])=>title).filter((title,index,titles)=>titles.indexOf(title)!==index))];
if(repeated.length)errors.push(`批次内出现重复转折标题：${repeated.join('、')}`);

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  for(const name of names){
    await page.goto(`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`,{waitUntil:'networkidle'});
    const audit=await page.evaluate(()=>({
      foundation:document.querySelectorAll('#detail .life-story-foundation').length,
      hook:document.querySelector('#detail .life-hook')?.textContent.trim()||'',
      arc:document.querySelector('#detail .life-arc')?.textContent.trim()||'',
      chapters:[...document.querySelectorAll('#detail .life-line .life-chapter')].map(node=>({year:node.querySelector('.life-year span')?.textContent.trim()||'',title:node.querySelector('h5')?.textContent.trim()||'',layer:node.querySelector('.story-layer')?.textContent.trim()||''})),
      reading:document.querySelector('#detail .interpretation p')?.textContent.trim()||'',
      sourceCount:document.querySelectorAll('#detail .sources a').length,
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    }));
    if(audit.foundation!==0||audit.hook.length<22||audit.arc.length<70)errors.push(`${name}: 页面仍是基础模板或主线未渲染`);
    if(audit.chapters.length<4||audit.chapters.length>6||audit.chapters.some(chapter=>!chapter.year.includes('年')||!chapter.title||!chapter.layer))errors.push(`${name}: 页面缺少双纪年、专属转折或层级标记：${JSON.stringify(audit.chapters)}`);
    if(audit.reading.length<55||audit.sourceCount<1)errors.push(`${name}: 页面缺少理解段或史料入口`);
    if(audit.bodyWidth>audit.viewport)errors.push(`${name}: 桌面端横向溢出`);
  }
  await page.goto(`file://${path.join(root,'people.html')}?person=${encodeURIComponent('宋濂')}`,{waitUntil:'networkidle'});
  await page.locator('#detail').screenshot({path:'/tmp/song-lian-full-life-story.png'});
  await page.setViewportSize({width:390,height:844});
  await page.goto(`file://${path.join(root,'people.html')}?person=${encodeURIComponent('宋濂')}`,{waitUntil:'networkidle'});
  const mobile=await page.evaluate(()=>({width:document.body.scrollWidth,viewport:innerWidth,chapters:document.querySelectorAll('#detail .life-chapter').length}));
  if(mobile.width>mobile.viewport||mobile.chapters!==5)errors.push(`宋濂移动端异常：${JSON.stringify(mobile)}`);
}finally{await browser.close()}

if(errors.length){console.error(`洪武人物一生故事第一批未通过（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log(`洪武人物一生故事第一批通过：${names.length}人均有专属主旨、完整主线、4至6个非模板转折、理解段与史料入口。`);
