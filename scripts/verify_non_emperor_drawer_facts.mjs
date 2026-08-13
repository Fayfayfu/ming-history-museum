import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const pageUrl=name=>`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`;
const errors=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const audit=async name=>{
    await page.goto(pageUrl(name),{waitUntil:'networkidle'});
    return page.evaluate(()=>({
      labels:[...document.querySelectorAll('#detail .facts>.fact>span:first-child')].map(node=>node.textContent.trim()),
      factClasses:[...document.querySelectorAll('#detail .facts>.fact')].map(node=>node.className),
      identity:document.querySelector('#detail .person-identity')?.textContent.replace(/\s+/g,' ').trim()||'',
      identitySingleLine:(()=>{const node=document.querySelector('#detail .person-identity b');if(!node)return false;const style=getComputedStyle(node);return node.getBoundingClientRect().height<=parseFloat(style.lineHeight)+1})(),
      period:document.querySelector('#detail .person-period')?.textContent.replace(/\s+/g,' ').trim()||'',
      institution:document.querySelector('#detail .person-institutions')?.textContent.replace(/\s+/g,' ').trim()||'',
      location:document.querySelector('#detail .person-location')?.textContent.replace(/\s+/g,' ').trim()||'',
      family:document.querySelector('#detail .person-family')?.textContent.replace(/\s+/g,' ').trim()||'',
      assessment:document.querySelector('#detail .person-assessment-fact')?.textContent.replace(/\s+/g,' ').trim()||'',
      assessmentCards:document.querySelectorAll('#detail .person-assessment-card').length,
      outsideNarrative:document.querySelectorAll('#detail>.narrative').length,
      factsChildren:document.querySelectorAll('#detail .facts>.fact').length,
      blankFacts:[...document.querySelectorAll('#detail .facts>.fact')].filter(node=>!node.textContent.trim()).length,
      fullWidth:[...document.querySelectorAll('#detail .facts>.fact')].filter(node=>getComputedStyle(node).gridColumnEnd==='-1').map(node=>node.className),
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    }));
  };

  const zhang=await audit('张居正');
  if(!zhang.identity.includes('身份 / 职务')||!zhang.identity.includes('文臣 · 内阁首辅'))errors.push(`张居正身份语义错误：${zhang.identity}`);
  if(!zhang.identitySingleLine||zhang.factClasses[0]!=='fact person-identity'||!zhang.factClasses[1]?.includes('person-domain'))errors.push(`张居正首行应为单行身份、右上历史领域：${JSON.stringify(zhang)}`);
  if(!zhang.period.startsWith('任职时期 / 历朝')||!zhang.assessment.includes('生平事迹')||!zhang.assessment.includes('历史评价')||zhang.assessmentCards!==2||zhang.outsideNarrative!==0)errors.push(`张居正任期或评价结构错误：${JSON.stringify(zhang)}`);
  if(!zhang.institution.includes('内阁 · 任职')||zhang.institution.includes('万历初年首辅'))errors.push(`张居正关联机构没有压缩：${zhang.institution}`);

  const qi=await audit('戚继光');
  if(qi.blankFacts!==0||!qi.fullWidth.some(value=>value.includes('person-period-wide'))||qi.factClasses[1]!=='fact person-domain'||qi.bodyWidth>qi.viewport)errors.push(`戚继光无机构时应让时期通栏，同时历史领域固定右上：${JSON.stringify(qi)}`);

  const wei=await audit('魏忠贤');
  if(/万历帝 · 1620—1620|泰昌帝 · 1620—1620|崇祯帝 · 1627—1627/.test(wei.period))errors.push(`魏忠贤仍显示零长度历朝：${wei.period}`);
  if(!wei.period.includes('天启帝 · 1620—1627'))errors.push(`魏忠贤缺少主要掌权朝代：${wei.period}`);

  const wan=await audit('万贵妃');
  if(/天顺朝 · 英宗 · 1464—1464|弘治帝 · 1487—1487/.test(wan.period)||!wan.period.includes('成化帝 · 1464—1487'))errors.push(`万贵妃历朝过滤错误：${wan.period}`);
  if(wan.identity.includes('后妃与内廷女性'))errors.push(`万贵妃身份正文不应重复网站分类：${wan.identity}`);

  const xu=await audit('徐霞客');
  if(!xu.period.startsWith('主要活动期')||xu.period.endsWith('—')||!xu.fullWidth.some(value=>value.includes('person-period-wide'))||xu.factClasses[1]!=='fact person-domain')errors.push(`徐霞客活动期或右上领域布局错误：${JSON.stringify(xu)}`);
  if(xu.identity.includes('在野人物')||!xu.identity.includes('旅行家、地理考察者、作家'))errors.push(`徐霞客身份正文应使用真实身份而非网站分类：${xu.identity}`);

  const zhubiao=await audit('朱标');
  if(zhubiao.location.includes('父：')||!zhubiao.family.includes('父：明太祖朱元璋')||!zhubiao.family.includes('母：马皇后'))errors.push(`朱标籍贯与父母字段没有拆开：${JSON.stringify(zhubiao)}`);
  if(!zhubiao.period.startsWith('生平时期 / 历朝')||zhubiao.period.endsWith('—'))errors.push(`朱标生平时期错误：${zhubiao.period}`);

  await page.goto(pageUrl('张居正'),{waitUntil:'networkidle'});
  await page.locator('#detail .facts').screenshot({path:'/tmp/zhang-ju-zheng-optimized-facts.png'});
  await page.setViewportSize({width:390,height:844});
  for(const name of ['魏忠贤','万贵妃','徐霞客','朱标']){
    await page.goto(pageUrl(name),{waitUntil:'networkidle'});
    const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,assessmentColumns:getComputedStyle(document.querySelector('#detail .person-assessment-grid')).gridTemplateColumns,blankFacts:[...document.querySelectorAll('#detail .facts>.fact')].filter(node=>!node.textContent.trim()).length}));
    if(mobile.bodyWidth>mobile.viewport||mobile.blankFacts!==0||mobile.assessmentColumns.split(' ').length!==1)errors.push(`${name} 移动端表格异常：${JSON.stringify(mobile)}`);
  }
}finally{await browser.close()}

if(errors.length){console.error(`非皇帝人物基础信息验证失败（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('非皇帝人物基础信息验证通过：类型化身份与时期、紧凑机构、无空格布局、父母字段及表内事迹评价均符合标准。');
