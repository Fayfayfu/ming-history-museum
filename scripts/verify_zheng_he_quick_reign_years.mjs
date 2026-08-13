import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[];

try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`file://${path.join(root,'people.html')}?person=${encodeURIComponent('郑和')}`,{waitUntil:'networkidle'});
  await page.waitForSelector('#detail .profile-quick-node',{state:'attached'});
  const drawer=await page.evaluate(()=>({
    years:[...document.querySelectorAll('#detail .profile-quick-date>b')].map(node=>node.textContent.trim()),
    reignYears:[...document.querySelectorAll('#detail .profile-quick-reign')].map(node=>node.textContent.trim()),
    previews:[...document.querySelectorAll('#detail .profile-quick-summary')].map(node=>node.textContent.trim()),
    titles:[...document.querySelectorAll('#detail .profile-quick-copy>span')].map(node=>node.textContent.trim()),
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||'',
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth
  }));
  const expectedReignYears=[
    '明 · 洪武四年至建文四年',
    '明 · 永乐三年至五年',
    '明 · 永乐五年至十三年',
    '明 · 永乐十四年至二十二年',
    '明 · 永乐二十二年至宣德六年',
    '明 · 宣德六年至八年及身后'
  ];
  if(drawer.years.length!==6)errors.push(`人物速览应有6个公元年份，实际为${drawer.years.length}个`);
  if(JSON.stringify(drawer.reignYears)!==JSON.stringify(expectedReignYears))errors.push(`人物速览年号不完整：${drawer.reignYears.join(' / ')||'无'}`);
  if(drawer.previews.length!==6||drawer.previews.some(text=>text.length<35))errors.push(`人物速览应有6条清楚摘要，实际为${drawer.previews.length}条`);
  if(drawer.titles.length!==6)errors.push(`人物速览应有6个阶段标题，实际为${drawer.titles.length}个`);
  if(drawer.enterHref!=='people/zheng-he.html')errors.push(`独立页入口错误：${drawer.enterHref||'无'}`);
  if(drawer.bodyWidth>drawer.viewport)errors.push(`抽屉桌面端横向溢出：${drawer.bodyWidth}/${drawer.viewport}`);

  await page.goto(`file://${path.join(root,'people/zheng-he.html')}`,{waitUntil:'networkidle'});
  const independent=await page.evaluate(()=>({
    chapters:document.querySelectorAll('.story .chapter').length,
    reignYears:[...document.querySelectorAll('.story .chapter-reign')].map(node=>node.textContent.trim()),
    sourceText:document.body.innerText,
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth
  }));
  if(independent.chapters!==6)errors.push(`独立页应有6个完整章节，实际为${independent.chapters}个`);
  if(JSON.stringify(independent.reignYears)!==JSON.stringify(expectedReignYears))errors.push(`独立页年号不完整：${independent.reignYears.join(' / ')||'无'}`);
  for(const label of ['刘家港天妃宫石刻《通番事迹记》','长乐《天妃之神灵应记》'])if(!independent.sourceText.includes(label))errors.push(`独立页缺少史料入口：${label}`);
  if(independent.bodyWidth>independent.viewport)errors.push(`独立页桌面端横向溢出：${independent.bodyWidth}/${independent.viewport}`);

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'networkidle'});
  const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,chapters:document.querySelectorAll('.story .chapter').length}));
  if(mobile.bodyWidth>mobile.viewport||mobile.chapters!==6)errors.push(`独立页移动端异常：${mobile.bodyWidth}/${mobile.viewport}，${mobile.chapters}章`);
}finally{
  await browser.close();
}

if(errors.length){console.error(`郑和人物速览双纪年验证失败（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('郑和六阶段验证通过：抽屉与独立页均显示完整双纪年，抽屉含六条摘要，独立页保留碑记入口。');
