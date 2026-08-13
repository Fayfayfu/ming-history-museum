import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[];

try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`file://${path.join(root,'people/zheng-he.html')}#story`,{waitUntil:'networkidle'});
  const desktop=await page.evaluate(()=>({
    reign:[...document.querySelectorAll('.story .chapter-reign')].map(node=>getComputedStyle(node).fontSize),
    eyebrow:[...document.querySelectorAll('.story .chapter-copy .eyebrow')].map(node=>getComputedStyle(node).fontSize),
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth
  }));
  if(desktop.reign.length!==6||desktop.reign.some(size=>size!=='13px'))errors.push(`年号应全部为13px，实际为${desktop.reign.join('/')||'无'}`);
  if(desktop.eyebrow.length!==6||desktop.eyebrow.some(size=>size!=='14px'))errors.push(`章节眉题应全部为14px，实际为${desktop.eyebrow.join('/')||'无'}`);
  if(desktop.bodyWidth>desktop.viewport)errors.push(`桌面端横向溢出：${desktop.bodyWidth}/${desktop.viewport}`);
  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'networkidle'});
  const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth}));
  if(mobile.bodyWidth>mobile.viewport)errors.push(`移动端横向溢出：${mobile.bodyWidth}/${mobile.viewport}`);
}finally{
  await browser.close();
}

if(errors.length){console.error(`独立人物页章节辅助文字验证失败（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('独立人物页章节辅助文字验证通过：年号13px、章节眉题14px，桌面与移动端无横向溢出。');
