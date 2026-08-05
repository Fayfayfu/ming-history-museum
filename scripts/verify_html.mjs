import { chromium } from 'playwright';
import path from 'node:path';

const target = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史人物谱_1368-1644.html');
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('file://'+target,{waitUntil:'networkidle'});
await page.screenshot({path:'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史人物谱_预览.png',fullPage:false});
const result=await page.evaluate(()=>({title:document.title,rows:document.querySelectorAll('#rows tr[data-id]').length,count:document.querySelector('#count')?.textContent,bodyWidth:document.body.scrollWidth,viewport:innerWidth}));
const eventInitial=await page.evaluate(()=>({cards:document.querySelectorAll('.eventcard').length,count:document.querySelector('#eventCount')?.textContent,stages:document.querySelectorAll('.stagechip').length,categories:document.querySelectorAll('#eventCategory option').length-1}));
await page.locator('.stagechip[data-stage="s6"]').click();
const stageCount=await page.locator('.eventcard').count();
await page.selectOption('#eventCategory','战争');
const stageWarCount=await page.locator('.eventcard').count();
const stageWarExpected=await page.evaluate(()=>{const d=JSON.parse(document.querySelector('#dataset').textContent).eventData;return d.events.filter(e=>e.stage==='s6'&&e.category==='战争').length});
await page.locator('#eventReset').click();
await page.fill('#eventSearch','北京保卫战');
const eventSearchCount=await page.locator('.eventcard').count();
await page.locator('.eventcard').first().click();
const eventDetail=await page.evaluate(()=>({open:document.querySelectorAll('#drawer.open').length,title:document.querySelector('#detail h2')?.textContent.trim(),sourceLinks:document.querySelectorAll('#detail .sources a').length,hasCause:[...document.querySelectorAll('#detail h4')].some(x=>x.textContent==='起因'),hasImpact:[...document.querySelectorAll('#detail h4')].some(x=>x.textContent==='长期影响'),personLinks:document.querySelectorAll('#detail .personjump').length}));
await page.locator('#detail .personjump[data-person="于谦"]').click();
const personReverseLookup=await page.evaluate(()=>({search:document.querySelector('#search')?.value,rows:document.querySelectorAll('#rows tr[data-id]').length,first:document.querySelector('#rows .name')?.textContent.trim(),drawerOpen:document.querySelectorAll('#drawer.open').length}));
await page.locator('#close').click();
await page.locator('#reset').click();
await page.locator('#eventReset').click();
await page.locator('#eventLab').scrollIntoViewIfNeeded();
await page.screenshot({path:'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史大事年表_预览.png',fullPage:false});
const eventAudit={initial:eventInitial,stageCount,stageWarCount,stageWarExpected,eventSearchCount,eventDetail,personReverseLookup,pass:eventInitial.cards===95&&eventInitial.stages===6&&eventInitial.categories===9&&stageCount===20&&stageWarCount===stageWarExpected&&eventSearchCount===1&&eventDetail.open===1&&eventDetail.title==='北京保卫战'&&eventDetail.sourceLinks>=2&&eventDetail.hasCause&&eventDetail.hasImpact&&personReverseLookup.search==='于谦'&&personReverseLookup.first==='于谦'&&personReverseLookup.drawerOpen===1};
const portraitAudit=await page.evaluate(async()=>{
  const images=[...document.querySelectorAll('#rows .portrait img')];
  images.forEach(img=>img.loading='eager');
  await Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
  const portraits=document.querySelectorAll('#rows .portrait').length;
  const placeholders=document.querySelectorAll('#rows .portrait-fallback').length;
  return {portraits,images:images.length,placeholders,broken:images.filter(img=>!img.naturalWidth).map(img=>img.getAttribute('src')),allRowsHavePortrait:portraits===document.querySelectorAll('#rows tr[data-id]').length};
});
await page.locator('#rows tr[data-id]:has(.portrait img)').first().click();
const portraitDetail=await page.evaluate(()=>({drawerImage:document.querySelectorAll('#detail .portrait img').length,sourceLink:[...document.querySelectorAll('#detail .sources a')].some(a=>a.textContent.includes('画像来源'))}));
await page.locator('#close').click();
const weightedAudit=await page.evaluate(()=>{
  const checked=[...document.querySelectorAll('#rows tr[data-id]')]
    .filter(row=>row.children[6]?.textContent.trim()!=='—')
    .map(row=>{
      const parts=[6,7,8,9,10].map(i=>parseFloat(row.children[i].textContent.trim()));
      const shown=parseFloat(row.children[11].textContent.trim());
      const calculated=Math.round((parts[0]*.3+parts[1]*.2+parts[2]*.2+parts[3]*.2+parts[4]*.1)*10)/10;
      return {name:row.querySelector('.name')?.textContent.trim(),shown,calculated,pass:shown===calculated};
    });
  return {checked:checked.length,failures:checked.filter(x=>!x.pass)};
});
const tenureAudit=await page.evaluate(()=>{
  const read=name=>{
    const row=[...document.querySelectorAll('#rows tr[data-id]')].find(x=>x.querySelector('.name')?.textContent.trim()===name);
    return row?{text:row.children[4].textContent.replace(/\s+/g,' ').trim(),reigns:[...row.children[4].querySelectorAll('.reignline em')].map(x=>x.textContent.trim())}:null;
  };
  const yang=read('杨士奇'),zhang=read('张居正'),yingzong=read('朱祁镇');
  return {
    yang,
    zhang,
    yingzong,
    pass:Boolean(yang&&['永乐帝（朱棣）','洪熙帝（朱高炽）','宣德帝（朱瞻基）','正统朝 · 英宗（朱祁镇）'].every(x=>yang.reigns.includes(x))&&zhang&&['嘉靖帝（朱厚熜）','隆庆帝（朱载坖）','万历帝（朱翊钧）'].every(x=>zhang.reigns.includes(x))&&yingzong&&yingzong.reigns.length===2&&yingzong.reigns.every(x=>x.includes('英宗')))
  };
});
const stickyAudit=await page.evaluate(()=>{
  const wrap=document.querySelector('.tablewrap');
  wrap.scrollLeft=900;
  wrap.scrollTop=500;
  const wrapRect=wrap.getBoundingClientRect();
  const personHead=document.querySelector('.roster th:nth-child(2)').getBoundingClientRect();
  const personCell=document.querySelector('#rows tr[data-id] td:nth-child(2)').getBoundingClientRect();
  const timeCell=document.querySelector('#rows tr[data-id] td:nth-child(1)').getBoundingClientRect();
  return {
    scrollLeft:wrap.scrollLeft,
    scrollTop:wrap.scrollTop,
    personPinned:Math.abs(personCell.left-wrapRect.left)<3,
    personHeaderPinned:Math.abs(personHead.left-wrapRect.left)<3,
    headerPinned:Math.abs(personHead.top-wrapRect.top)<4,
    firstColumnMoved:timeCell.right<personCell.right
  };
});
await page.screenshot({path:'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史人物谱_粘性表格预览.png',fullPage:false});
await page.locator('.emperor').first().click();
const lineage=await page.evaluate(()=>{
  const rowEls=[...document.querySelectorAll('#rows tr[data-id]')];
  const rows=rowEls.map(x=>({name:x.querySelector('.name')?.textContent.trim(),category:x.querySelector('.badge')?.textContent.trim()}));
  const names=rows.map(x=>x.name);
  const scored=rowEls.find(x=>x.children[6]?.textContent.trim()!=='—');
  let weightedCheck=null;
  if(scored){
    const parts=[6,7,8,9,10].map(i=>Number(scored.children[i].textContent.trim()));
    const shown=parseFloat(scored.children[11].textContent.trim());
    const calculated=Math.round((parts[0]*.3+parts[1]*.2+parts[2]*.2+parts[3]*.2+parts[4]*.1)*10)/10;
    weightedCheck={name:scored.querySelector('.name')?.textContent.trim(),parts,shown,calculated,pass:shown===calculated};
  }
  return {
    rows:rows.length,
    people:rows,
    firstPerson:rows[0],
    duplicates:[...new Set(names.filter((n,i)=>names.indexOf(n)!==i))],
    emperorCount:rows.filter(x=>x.category==='皇帝').length,
    zhuDiCategory:rows.find(x=>x.name==='朱棣')?.category,
    headers:[...document.querySelectorAll('.roster th')].map(x=>x.textContent.trim()),
    firstChildCount:document.querySelector('#rows tr[data-id] td:nth-child(14)')?.textContent.trim(),
    weightedCheck
  };
});
const lineageAudit=[];
for(let i=0;i<await page.locator('.emperor').count();i++){
  await page.locator('.emperor').nth(i).click();
  lineageAudit.push(await page.evaluate(()=>{const rows=[...document.querySelectorAll('#rows tr[data-id]')].map(x=>({name:x.querySelector('.name')?.textContent.trim(),category:x.querySelector('.badge')?.textContent.trim()}));const names=rows.map(x=>x.name);return {emperor:document.querySelector('#parent')?.value,rows:names.length,firstPerson:rows[0],emperorCount:rows.filter(x=>x.category==='皇帝').length,categoryCounts:Object.fromEntries([...new Set(rows.map(x=>x.category))].map(c=>[c,rows.filter(x=>x.category===c).length])),duplicates:[...new Set(names.filter((n,i)=>names.indexOf(n)!==i))]}}));
}
await page.locator('#reset').click();
await page.fill('#search','于谦');
const filtered=await page.locator('#rows tr[data-id]').count();
await page.locator('#rows tr[data-id]').first().click();
const drawerOpen=await page.locator('#drawer.open').count();
await page.locator('#close').click();
await page.setViewportSize({width:390,height:844});
await page.locator('#eventLab').scrollIntoViewIfNeeded();
const mobileAudit=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,stageColumns:getComputedStyle(document.querySelector('.stagechips')).gridTemplateColumns.split(' ').length,eventBriefColumns:getComputedStyle(document.querySelector('.eventbrief')).gridTemplateColumns.split(' ').length,controlsColumns:getComputedStyle(document.querySelector('.event-controls')).gridTemplateColumns.split(' ').length}));
console.log(JSON.stringify({...result,eventAudit,portraitAudit,portraitDetail,weightedAudit,tenureAudit,stickyAudit,lineage,lineageAudit,filtered,drawerOpen,mobileAudit,errors},null,2));
await browser.close();
