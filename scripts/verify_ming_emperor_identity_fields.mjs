import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const pageUrl=name=>`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`;
const cases={
  朱元璋:{temple:'太祖',era:'洪武（通称洪武帝）',domains:['政治制度','军事边疆','社会经济'],tomb:'明孝陵 · 南京'},
  朱允炆:{temple:'惠宗（弘光追尊）',era:'建文（通称建文帝）',domains:['政治制度','军事边疆'],tomb:'陵寝不明'},
  朱翊钧:{temple:'神宗',era:'万历（通称万历帝）',domains:['政治制度','军事边疆','社会经济','宫廷内廷'],tomb:'定陵 · 北京昌平十三陵'},
  朱由检:{temple:'思宗（弘光初定）',era:'崇祯（通称崇祯帝）',domains:['政治制度','军事边疆','社会经济'],tomb:'思陵 · 北京昌平十三陵'}
};
const errors=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  for(const [name,expected] of Object.entries(cases)){
    await page.goto(pageUrl(name),{waitUntil:'networkidle'});
    const audit=await page.evaluate(()=>({
      labels:[...document.querySelectorAll('#detail .founder-identity-row span')].map(node=>node.textContent.trim()),
      values:[...document.querySelectorAll('#detail .founder-identity-row b')].map(node=>node.textContent.trim()),
      rowGap:parseFloat(getComputedStyle(document.querySelector('#detail .founder-identity')).rowGap),
      domainFacts:document.querySelectorAll('#detail .founder-domain').length,
      domains:[...document.querySelectorAll('#detail .founder-domain .domain-tag')].map(node=>node.textContent.trim()),
      tombFacts:document.querySelectorAll('#detail .founder-tomb').length,
      tombLabel:document.querySelector('#detail .founder-tomb span')?.textContent.trim()||'',
      tombValue:document.querySelector('#detail .founder-tomb b')?.textContent.trim()||'',
      tombLayout:(()=>{const node=document.querySelector('#detail .founder-tomb');if(!node)return null;const title=node.querySelector('span');const value=node.querySelector('b');const isSingleLine=element=>{const style=getComputedStyle(element);return element.getBoundingClientRect().height<=parseFloat(style.lineHeight)+1};return {children:node.children.length,titleSingleLine:isSingleLine(title),valueSingleLine:isSingleLine(value)}})(),
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    }));
    if(audit.labels.join('|')!=='身份 / 庙号|年号')errors.push(`${name} 字段没有压缩成两行：${audit.labels.join('/')}`);
    if(audit.values[0]!==`皇帝 · ${expected.temple}`||audit.values[1]!==expected.era)errors.push(`${name} 称号错误：${audit.values.join('/')}`);
    if(audit.rowGap>6)errors.push(`${name} 身份格行距过大：${audit.rowGap}px`);
    if(audit.domainFacts!==1||JSON.stringify(audit.domains)!==JSON.stringify(expected.domains))errors.push(`${name} 历史领域错误：${audit.domains.join('/')}`);
    if(audit.tombFacts!==1||audit.tombLabel!=='陵寝'||audit.tombValue!==expected.tomb)errors.push(`${name} 陵寝信息错误：${audit.tombLabel}/${audit.tombValue}`);
    if(audit.tombLayout?.children!==2||!audit.tombLayout?.titleSingleLine||!audit.tombLayout?.valueSingleLine)errors.push(`${name} 陵寝应严格使用标题、内容两行：${JSON.stringify(audit.tombLayout)}`);
    if(audit.bodyWidth>audit.viewport)errors.push(`${name} 桌面端水平溢出`);
  }
  await page.setViewportSize({width:390,height:844});
  for(const name of ['朱允炆','朱由检']){
    await page.goto(pageUrl(name),{waitUntil:'networkidle'});
    const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,identity:document.querySelectorAll('#detail .founder-identity-row').length,domains:document.querySelectorAll('#detail .founder-domain .domain-tag').length}));
    if(mobile.bodyWidth>mobile.viewport||mobile.identity!==2||mobile.domains<2)errors.push(`${name} 移动端结构或宽度异常：${JSON.stringify(mobile)}`);
  }
}finally{
  await browser.close();
}
if(errors.length){console.error(`皇帝身份与领域验证失败（${errors.length}项）：`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('皇帝身份与领域验证通过：庙号、年号、独立历史领域格及桌面/移动端布局均符合标准。');
