import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const errors=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  await page.goto(`file://${path.join(root,'people.html')}?person=${encodeURIComponent('李善长')}`,{waitUntil:'networkidle'});
  const person=await page.evaluate(()=>({
    label:document.querySelector('#detail .person-institutions .institution-link')?.textContent.trim()||'',
    href:document.querySelector('#detail .person-institutions .institution-link')?.getAttribute('href')||'',
    title:document.querySelector('#detail .person-institutions .institution-link')?.getAttribute('title')||'',
    sourceLinks:[...document.querySelectorAll('#detail .sources a')].map(link=>link.href)
  }));
  if(person.label!=='中书省 · 任职 ↗')errors.push(`李善长人物抽屉机构标签错误：${person.label}`);
  if(person.href!=='institutions.html?institution=central_secretariat&year=1370')errors.push(`李善长制度馆链接应进入机构有效年份1370：${person.href}`);
  if(!person.title.includes('洪武初')||!person.title.includes('中书左丞相'))errors.push(`李善长机构说明缺少时期或职务：${person.title}`);
  if(!person.sourceLinks.some(href=>href.includes('%E6%98%8E%E5%8F%B2/%E5%8D%B7127')))errors.push('李善长证据入口缺少《明史》卷127人物专属来源');

  await page.goto(`file://${path.join(root,'institutions.html')}?institution=central_secretariat&year=1370`,{waitUntil:'networkidle'});
  const institution=await page.evaluate(()=>({
    year:document.querySelector('#palaceYearValue')?.textContent.trim()||'',
    dossierOpen:document.querySelector('.institution-dossier')?.getAttribute('aria-hidden')==='false',
    title:document.querySelector('[data-dossier-name]')?.textContent.trim()||'',
    people:[...document.querySelectorAll('[data-dossier-people] .dossier-person-card b')].map(node=>node.textContent.trim())
  }));
  if(institution.year!=='1370'||!institution.dossierOpen||institution.title!=='中书省')errors.push(`制度馆没有按人物链接打开洪武中书省：${JSON.stringify(institution)}`);
  if(!['李善长','徐达','常遇春'].every(name=>institution.people.includes(name)))errors.push(`制度馆中书省档案缺少洪武相关人物：${institution.people.join('、')}`);

  await page.goto(`file://${path.join(root,'institutions.html')}?institution=chief_military_commission&year=1375`,{waitUntil:'networkidle'});
  const military=await page.evaluate(()=>[...document.querySelectorAll('[data-dossier-people] .dossier-person-card b')].map(node=>node.textContent.trim()));
  if(!['李文忠','沐英','蓝玉'].every(name=>military.includes(name)))errors.push(`制度馆大都督府档案缺少明确任职人物：${military.join('、')}`);
  await page.screenshot({path:'/tmp/hongwu-institution-reuse.png',fullPage:false});
}finally{await browser.close()}

if(errors.length){console.error(`洪武人物—制度馆复用验证失败（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('洪武人物—制度馆复用验证通过：人物抽屉可进入标准机构档案，制度馆可按洪武年份反查相关人物与专属来源。');
