import {chromium} from 'playwright';
import path from 'node:path';

const names=['朱元璋','朱允炆','朱棣','朱高炽','朱瞻基','朱祁镇','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校','朱由检'];
const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const pageUrl=name=>`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`;
const errors=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(`页面异常：${error.message}`));
  const samples=[];
  for(const name of names){
    await page.goto(pageUrl(name),{waitUntil:'networkidle'});
    const audit=await page.evaluate(()=>({
      name:document.querySelector('#detail h2')?.textContent.trim()||'',
      facts:document.querySelectorAll('#detail .facts-founder').length,
      identity:document.querySelectorAll('#detail .founder-identity').length,
      royalColumns:document.querySelectorAll('#detail .founder-royal-column').length,
      assessmentCards:document.querySelectorAll('#detail .founder-assessment-card').length,
      notes:document.querySelectorAll('#detail .founder-basic-notes p').length,
      scores:document.querySelectorAll('#detail .profile-score-section .score-summary-item').length,
      scoreLabelSizes:[...document.querySelectorAll('#detail .profile-score-section .score-summary-item span')].map(node=>getComputedStyle(node).fontSize),
      scoreBalanced:[...document.querySelectorAll('#detail .profile-score-section .score-summary-item')].every(node=>{const box=node.getBoundingClientRect(),first=node.firstElementChild.getBoundingClientRect(),last=node.lastElementChild.getBoundingClientRect();return Math.abs((first.top-box.top)-(box.bottom-last.bottom))<4}),
      quickNodes:document.querySelectorAll('#detail .profile-quick-node').length,
      quickSummaries:document.querySelectorAll('#detail .profile-quick-summary').length,
      reignYears:document.querySelectorAll('#detail .profile-quick-reign').length,
      titleSizes:[...document.querySelectorAll('#detail .profile-quick-copy>span')].map(node=>getComputedStyle(node).fontSize),
      summarySizes:[...document.querySelectorAll('#detail .profile-quick-summary')].map(node=>getComputedStyle(node).fontSize),
      governance:document.querySelectorAll('#detail .founder-governance').length,
      governanceItems:document.querySelectorAll('#detail .founder-governance-item').length,
      legacyInstitution:[...document.querySelectorAll('#detail .facts>.fact>span')].some(node=>node.textContent.trim()==='关联机构'),
      text:document.querySelector('#detail')?.textContent||'',
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    }));
    samples.push(audit);
    if(audit.name!==name)errors.push(`${name} 抽屉未正确打开`);
    if(audit.facts!==1||audit.identity!==1||audit.royalColumns!==3||audit.assessmentCards!==2)errors.push(`${name} 基础信息结构不完整`);
    if(audit.notes<1||audit.scores!==6||audit.governance!==1||audit.governanceItems<1||audit.governanceItems>4)errors.push(`${name} 说明、评分或制度模块不完整`);
    if(audit.quickNodes!==6||audit.quickSummaries!==6||audit.reignYears!==6)errors.push(`${name} 人物速览不是六阶段双纪年`);
    if(audit.titleSizes.some(size=>size!=='16px')||audit.summarySizes.some(size=>size!=='14px'))errors.push(`${name} 人物速览字号不符合标准`);
    if(audit.scoreLabelSizes.some(size=>size!=='11px')||!audit.scoreBalanced)errors.push(`${name} 评分区字号或垂直间距不符合标准`);
    if(audit.legacyInstitution)errors.push(`${name} 皇帝基础信息仍显示大臣式“关联机构”`);
    if(audit.bodyWidth>audit.viewport)errors.push(`${name} 桌面端水平溢出`);
  }
  const byName=Object.fromEntries(samples.map(item=>[item.name,item]));
  if(!byName.朱允炆.text.includes('下落没有可靠定论'))errors.push('朱允炆人物卡未保留结局争议');
  if(!byName.朱祁镇.text.includes('两段统治')||!byName.朱祁镇.text.includes('复辟'))errors.push('朱祁镇人物卡未明确两段统治和复辟');
  if(!byName.朱厚熜.text.includes('旁支')||!byName.朱厚熜.text.includes('大礼议'))errors.push('朱厚熜人物卡未明确旁支入继与大礼议');
  if(!byName.朱常洛.text.includes('在位约一月')||byName.朱常洛.governanceItems!==1)errors.push('朱常洛短期统治未按证据边界处理');
  if(!byName.朱由检.text.includes('兄终弟及')||!byName.朱由检.text.includes('亡国非一人造成'))errors.push('朱由检人物卡未说明继位方式或亡国责任边界');
  for(const name of ['朱允炆','朱祁镇','朱厚熜','朱常洛','朱由检']){
    await page.goto(pageUrl(name),{waitUntil:'networkidle'});
    await page.locator('#detail .facts-founder').screenshot({path:`/tmp/emperor-${name}-facts.png`});
  }
  await page.goto(pageUrl('朱元璋'),{waitUntil:'networkidle'});
  await page.locator('#detail .profile-score-section').screenshot({path:'/tmp/emperor-score-section.png'});
  await page.setViewportSize({width:390,height:844});
  for(const name of ['朱允炆','朱祁镇','朱厚熜','朱常洛','朱由检']){
    await page.goto(pageUrl(name),{waitUntil:'networkidle'});
    const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,facts:document.querySelectorAll('#detail .facts-founder').length,quick:document.querySelectorAll('#detail .profile-quick-node').length}));
    if(mobile.bodyWidth>mobile.viewport||mobile.facts!==1||mobile.quick!==6)errors.push(`${name} 移动端结构或宽度异常`);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(pageUrl('张居正'),{waitUntil:'networkidle'});
  const official=await page.evaluate(()=>({newFacts:document.querySelectorAll('#detail .facts-founder').length,hasInstitution:[...document.querySelectorAll('#detail .facts>.fact>span')].some(node=>node.textContent.trim()==='关联机构'),quick:document.querySelectorAll('#detail .profile-quick-node').length}));
  if(official.newFacts!==0||!official.hasInstitution)errors.push(`非皇帝人物不应套用皇帝新版结构：${JSON.stringify(official)}`);
}finally{await browser.close()}
if(errors.length){console.error(`皇帝人物卡浏览器验证失败（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('皇帝人物卡浏览器验证通过：16位皇帝的基础信息、六阶段速览、统治与制度、评分区及移动端布局均符合统一标准。');
