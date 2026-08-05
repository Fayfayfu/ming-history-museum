import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const url=file=>'file://'+path.join(root,file);
const files=['exhibit-yongle-capital.html','exhibit-zheng-he-voyages.html','exhibit-tumu-crisis.html','exhibit-zhang-reform.html','exhibit-imjin-war.html','exhibit-fall-1644.html'];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(`${page.url()}: ${e.message}`));

await page.goto(url('index.html'),{waitUntil:'networkidle'});
const home=await page.evaluate(()=>({specialNav:[...document.querySelectorAll('.museum-links a')].some(a=>a.textContent==='专题展'),specialCards:document.querySelectorAll('.special').length}));

await page.goto(url('exhibitions.html'),{waitUntil:'networkidle'});
const collection=await page.evaluate(()=>({title:document.title,entries:document.querySelectorAll('.exhibit-entry').length,stats:[...document.querySelectorAll('.index-stat b')].map(x=>x.textContent.trim()),titles:[...document.querySelectorAll('.exhibit-entry h3')].map(x=>x.childNodes[0]?.textContent.trim()),active:document.querySelector('.museum-links a.active')?.textContent.trim(),bodyWidth:document.body.scrollWidth,viewport:innerWidth}));
await page.screenshot({path:path.join(root,'专题展览_预览.png'),fullPage:false});

const exhibits=[];
for(const file of files){
  await page.goto(url(file),{waitUntil:'networkidle'});
  await page.locator('#object').scrollIntoViewIfNeeded();
  const record=await page.evaluate(async()=>{
    const image=document.querySelector('.object-stage img');
    const scene=document.querySelector('.hero-scene img');
    const perspective=document.querySelector('.perspective-image img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    if(scene&&!scene.complete)await new Promise(resolve=>{scene.addEventListener('load',resolve,{once:true});scene.addEventListener('error',resolve,{once:true})});
    if(perspective&&!perspective.complete)await new Promise(resolve=>{perspective.addEventListener('load',resolve,{once:true});perspective.addEventListener('error',resolve,{once:true})});
    return {
      title:document.querySelector('.ex-hero h1')?.childNodes[0]?.textContent.trim(),
      acts:document.querySelectorAll('.act').length,
      actParagraphs:document.querySelectorAll('.act-body > p').length,
      evidenceNotes:document.querySelectorAll('.act-evidence').length,
      sceneLoaded:Boolean(scene?.naturalWidth),
      sceneAlt:scene?.alt,
      reconstructionLabel:document.querySelector('.reconstruction-badge')?.textContent.trim(),
      sceneDetails:document.querySelectorAll('.scene-ledger li').length,
      decisionOptions:document.querySelectorAll('.decision-option').length,
      perspectiveLoaded:Boolean(perspective?.naturalWidth),
      perspectiveAlt:perspective?.alt,
      perspectiveViews:document.querySelectorAll('.perspective-card').length,
      perspectiveLayers:document.querySelectorAll('.perspective-card .layer-tag').length,
      imaginedPortraits:document.querySelectorAll('.person-art-label').length,
      milestones:document.querySelectorAll('.milestone').length,
      people:document.querySelectorAll('.person-card').length,
      routes:document.querySelectorAll('.map-frame .route').length,
      mapRoomHeight:Math.round(document.querySelector('.map-room').getBoundingClientRect().height),
      mapSvgHeight:Math.round(document.querySelector('.map-frame svg').getBoundingClientRect().height),
      viewportHeight:innerHeight,
      debates:document.querySelectorAll('.debate').length,
      sources:document.querySelectorAll('.sources a').length,
      artifactLoaded:Boolean(image?.naturalWidth),
      artifactAlt:image?.alt,
      next:document.querySelector('.next-exhibit')?.getAttribute('href'),
      eventLinks:document.querySelectorAll('.event-link').length,
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    };
  });
  exhibits.push({file,...record});
}

await page.goto(url(files[0]),{waitUntil:'networkidle'});
await page.locator('.decision-option').nth(1).click();
const decision=await page.evaluate(()=>({selected:document.querySelectorAll('.decision-option.selected').length,result:document.querySelector('.decision-result')?.textContent.trim()}));
const nextHref=await page.locator('.next-exhibit').getAttribute('href');
await page.locator('.act-links a[href^="people.html"]').first().click();
await page.waitForLoadState('networkidle');
const personCross=await page.evaluate(()=>({page:location.pathname.split('/').pop(),person:new URLSearchParams(location.search).get('person'),search:document.querySelector('#search')?.value,rows:document.querySelectorAll('#rows tr[data-id]').length}));

await page.goto(url(files[0]),{waitUntil:'networkidle'});
await page.locator('.event-link').first().click();
await page.waitForLoadState('networkidle');
const eventCross=await page.evaluate(()=>({page:location.pathname.split('/').pop(),q:new URLSearchParams(location.search).get('q'),search:document.querySelector('#eventSearch')?.value,cards:document.querySelectorAll('.eventcard').length}));

await page.setViewportSize({width:390,height:844});
await page.goto(url(files[2]),{waitUntil:'networkidle'});
const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,chapterColumns:getComputedStyle(document.querySelector('.chapter-nav')).gridTemplateColumns.split(' ').length,actColumns:getComputedStyle(document.querySelector('.act')).gridTemplateColumns.split(' ').length,peopleColumns:getComputedStyle(document.querySelector('.people-grid')).gridTemplateColumns.split(' ').length,navHeight:document.querySelector('.museum-nav').getBoundingClientRect().height}));

await page.setViewportSize({width:1440,height:1000});
await page.goto(url(files[0]),{waitUntil:'networkidle'});
await page.screenshot({path:path.join(root,'专题展_永乐迁都_预览.png'),fullPage:false});
await page.locator('#perspectives').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.locator('#perspectives').screenshot({path:path.join(root,'专题展_多方视角_预览.png')});
await page.locator('#map').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.screenshot({path:path.join(root,'专题展_空间证据_一屏预览.png'),fullPage:false});

await page.goto(url(files[1]),{waitUntil:'networkidle'});
await page.screenshot({path:path.join(root,'专题展_郑和下西洋_预览.png'),fullPage:false});
await page.locator('#perspectives').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.locator('#perspectives').screenshot({path:path.join(root,'专题展_郑和下西洋_多方视角_预览.png')});
await page.locator('#object').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.locator('#object').screenshot({path:path.join(root,'专题展_郑和下西洋_文物_预览.png')});

const audit={home,collection,exhibits,decision,nextHref,personCross,eventCross,mobile,errors};
audit.pass=home.specialNav&&home.specialCards===files.length&&collection.entries===files.length&&JSON.stringify(collection.stats)===JSON.stringify(['6','24','6','6'])&&collection.titles.includes('郑和下西洋')&&collection.active==='专题展'&&collection.bodyWidth===collection.viewport&&exhibits.every(e=>e.acts===4&&e.actParagraphs===8&&e.evidenceNotes===4&&e.sceneLoaded&&e.sceneAlt&&e.reconstructionLabel.includes('非历史原图')&&e.sceneDetails===4&&e.decisionOptions===3&&e.perspectiveLoaded&&e.perspectiveAlt&&e.perspectiveViews===3&&e.perspectiveLayers===3&&e.milestones===5&&e.people>=4&&e.routes>=3&&e.mapRoomHeight>=760&&e.mapRoomHeight<=e.viewportHeight-138&&e.mapSvgHeight>=560&&e.debates===2&&e.sources===3&&e.artifactLoaded&&e.next&&e.eventLinks===4&&e.bodyWidth===e.viewport)&&exhibits.find(e=>e.file===files[1])?.title==='郑和下西洋'&&exhibits.reduce((n,e)=>n+e.imaginedPortraits,0)>=8&&decision.selected===1&&decision.result.includes('这一选择的后果')&&nextHref===files[1]&&personCross.page==='people.html'&&personCross.person&&personCross.search===personCross.person&&personCross.rows>=1&&eventCross.page==='events.html'&&eventCross.q&&eventCross.search===eventCross.q&&eventCross.cards>=1&&mobile.bodyWidth===mobile.viewport&&mobile.chapterColumns===2&&mobile.actColumns===1&&mobile.peopleColumns===1&&errors.length===0;
console.log(JSON.stringify(audit,null,2));
await browser.close();
if(!audit.pass)process.exit(1);
