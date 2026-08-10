import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const pages=[
  ['index.html','序厅'],
  ['people.html','人物馆'],
  ['events.html','事件馆'],
  ['institutions.html','制度馆'],
  ['exhibitions.html','专题展'],
  ['people/tang-yin.html','人物馆'],
  ['exhibit-yongle-capital.html','专题展']
];
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};

for(const [file] of pages)await fs.access(path.join(root,file));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',error=>failures.push(`page error: ${error.message}`));

for(const [file,activeLabel] of pages){
  await page.goto(`file://${path.join(root,file)}`,{waitUntil:'domcontentloaded'});
  const nav=await page.evaluate(()=>{
    const root=document.querySelector('.museum-nav');
    const brand=document.querySelector('.museum-brand');
    const seal=document.querySelector('.brand-seal');
    const link=document.querySelector('.museum-links a');
    const active=document.querySelector('.museum-links a.active');
    const rootStyle=getComputedStyle(root),sealStyle=getComputedStyle(seal),linkStyle=getComputedStyle(link),activeAfter=active?getComputedStyle(active,'::after'):null;
    return {
      labels:[...document.querySelectorAll('.museum-links a')].map(item=>item.textContent.trim()),
      active:active?.textContent.trim()||'',
      height:Math.round(root.getBoundingClientRect().height),
      top:Math.round(root.getBoundingClientRect().top),
      position:rootStyle.position,
      paddingLeft:Math.round(parseFloat(rootStyle.paddingLeft)),
      backgroundColor:rootStyle.backgroundColor,
      borderBottomWidth:parseFloat(rootStyle.borderBottomWidth),
      brandLeft:Math.round(brand.getBoundingClientRect().left),
      sealWidth:seal.offsetWidth,
      sealHeight:seal.offsetHeight,
      sealBorderWidth:parseFloat(sealStyle.borderLeftWidth),
      sealTransform:sealStyle.transform,
      linkPaddingLeft:parseFloat(linkStyle.paddingLeft),
      linkFontSize:parseFloat(linkStyle.fontSize),
      linkFontWeight:linkStyle.fontWeight,
      activeRuleHeight:activeAfter?parseFloat(activeAfter.height):0,
      overflow:document.body.scrollWidth>innerWidth
    };
  });
  expect(nav.labels.join('|')==='序厅|人物馆|事件馆|制度馆|专题展|研究台',`${file}: top-level navigation must expose the same six halls in the same order`);
  expect(nav.active===activeLabel,`${file}: active navigation item must be ${activeLabel}`);
  expect(nav.height===72&&nav.top===0&&nav.position==='sticky',`${file}: navigation must use the shared 72px sticky frame`);
  expect(nav.paddingLeft===24&&nav.brandLeft===24,`${file}: navigation must use the shared desktop edge alignment`);
  expect(nav.backgroundColor==='rgba(24, 23, 19, 0.96)'&&nav.borderBottomWidth===1,`${file}: navigation must use the shared ink background and one-pixel divider`);
  expect(nav.sealWidth===38&&nav.sealHeight===38&&nav.sealBorderWidth===1&&nav.sealTransform!=='none',`${file}: museum seal must use the shared size, stroke and rotation`);
  expect(nav.linkPaddingLeft===20&&nav.linkFontSize===13&&nav.linkFontWeight==='700'&&nav.activeRuleHeight===3,`${file}: hall links and active rule must share one typographic rhythm`);
  expect(!nav.overflow,`${file}: unified navigation must not cause horizontal overflow`);
}

await browser.close();
if(failures.length){
  console.error(`Museum navigation verification failed (${failures.length}):`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Museum navigation verification passed: hall and detail pages share one desktop navigation contract.');
