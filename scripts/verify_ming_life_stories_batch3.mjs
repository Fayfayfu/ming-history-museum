import fs from 'node:fs/promises';

const names=['杨溥','夏原吉','蹇义','郑和','王景弘'];
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
  if(!Array.isArray(story.sources)||story.sources.length<1||story.sources.some(url=>!/^https?:\/\//.test(url)))errors.push(`${name}: 史料入口不完整`);
  if(!Array.isArray(story.sourceBasis)||story.sourceBasis.length<1||story.sourceBasis.some(item=>!item.volume||!item.scope||!item.confidence))errors.push(`${name}: 缺少《明史》卷次定位`);
  if(!Array.isArray(story.followupQuestions)||story.followupQuestions.length<1)errors.push(`${name}: 缺少后续多源待核问题`);
}

const repeated=[...new Set(titles.filter((title,index)=>titles.indexOf(title)!==index))];
if(repeated.length)errors.push(`批次内出现重复转折标题：${repeated.join('、')}`);

if(errors.length){console.error(`人物一生故事第三批未通过（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log(`人物一生故事第三批通过：${names.length}人均有专属主旨、完整主线、非模板转折、《明史》卷次定位和后续待核问题。`);
