import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const url=file=>'file://'+path.join(root,file);
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));

await page.goto(url('index.html'),{waitUntil:'networkidle'});
const home=await page.evaluate(()=>({
  title:document.title,
  doors:document.querySelectorAll('.door').length,
  eras:document.querySelectorAll('.era').length,
  figures:document.querySelectorAll('.figure').length,
  figurePortraits:[...document.querySelectorAll('.figure')].map(card=>({
    name:card.querySelector('.figure-copy b')?.textContent.trim(),
    loaded:Boolean(card.querySelector('img')?.naturalWidth),
    label:card.querySelector('.figure-art-label')?.textContent.trim()||'',
    fallback:Boolean(card.querySelector('.figure-fallback'))
  })),
  routes:document.querySelectorAll('.route').length,
  researchDesks:document.querySelectorAll('.desk').length,
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
await page.screenshot({path:path.join(root,'序厅_预览.png'),fullPage:false});
const homeTitleLayouts=[];
for(const width of [1920,1440,1210,1024,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  homeTitleLayouts.push(await page.evaluate(width=>{
    const h1=document.querySelector('.hero h1');
    const range=document.createRange();
    range.selectNodeContents(h1.firstChild);
    const rect=range.getBoundingClientRect();
    const years=[...document.querySelectorAll('.year-pillar')].map(el=>el.getBoundingClientRect());
    const heroCenter=innerWidth/2;
    const yearCenters=years.map(year=>year.left+year.width/2);
    const yearsHidden=years.every(year=>year.width===0);
    return {
      width,
      lineRects:range.getClientRects().length,
      titleLeft:Math.round(rect.left),
      titleRight:Math.round(rect.right),
      titleWithinViewport:rect.left>=0&&rect.right<=innerWidth,
      whiteSpace:getComputedStyle(h1).whiteSpace,
      yearsHidden,
      yearBalanced:yearsHidden||Math.abs((heroCenter-yearCenters[0])-(yearCenters[1]-heroCenter))<3,
      yearsInset:yearsHidden||(years[0].left>innerWidth*.08&&years[1].right<innerWidth*.92),
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    };
  },width));
  if(width===1210)await page.screenshot({path:path.join(root,'序厅_1210px标题预览.png'),fullPage:false});
  if(width===1920)await page.screenshot({path:path.join(root,'序厅_1920px年份预览.png'),fullPage:false});
}
await page.setViewportSize({width:1440,height:1000});
await page.locator('.figures').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.locator('.figures').screenshot({path:path.join(root,'序厅_从一个人开始_预览.png')});

await page.goto(url('people.html?person='+encodeURIComponent('于谦')),{waitUntil:'networkidle'});
const people=await page.evaluate(()=>({
  title:document.title,
  eventDisplay:getComputedStyle(document.querySelector('.eventlab')).display,
  tableDisplay:getComputedStyle(document.querySelector('.tablewrap')).display,
  totalRows:JSON.parse(document.querySelector('#dataset').textContent).core.length+JSON.parse(document.querySelector('#dataset').textContent).children.length-document.querySelectorAll('#rows tr[data-id]').length,
  visibleRows:document.querySelectorAll('#rows tr[data-id]').length,
  search:document.querySelector('#search').value,
  first:document.querySelector('#rows .name')?.textContent.trim(),
  navActive:document.querySelector('.museum-links a.active')?.textContent.trim(),
  tenureLabels:[...document.querySelectorAll('#rows .reignline em')].map(x=>x.textContent.trim())
}));
const personStory=await page.evaluate(async()=>{
  const image=document.querySelector('#detail .portrait img');
  if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
  return {
    drawer:document.querySelector('#drawer')?.classList.contains('open'),
    portraitLoaded:Boolean(image?.naturalWidth),
    portraitLabel:document.querySelector('#detail .portrait-label')?.textContent.trim(),
    preview:document.querySelectorAll('#detail .profile-preview').length,
    quickNodes:document.querySelectorAll('#detail .profile-quick-node').length,
    enterText:document.querySelector('#detail .profile-enter span')?.textContent.trim(),
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href'),
    legacyStory:document.querySelectorAll('#detail .story-reenactment,#detail .life-line,#detail .work-voice').length,
    factLabels:[...document.querySelectorAll('#detail .facts>.fact>span:first-child')].map(x=>x.textContent.trim()),
    identityValue:document.querySelector('#detail .facts>.fact:first-child b')?.textContent.trim(),
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth
  };
});
await page.waitForTimeout(500);
await page.screenshot({path:path.join(root,'人物档案_于谦_预览.png'),fullPage:false});
await page.locator('#detail .profile-preview').screenshot({path:path.join(root,'人物档案_于谦_速览抽屉_预览.png')});
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('朱高炽'));
const zhuGaochiTenure=await page.evaluate(()=>document.querySelector('#detail .facts .fact:nth-child(4)')?.textContent.trim()||'');
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('朱常洛'));
const zhuChangluoTenure=await page.evaluate(()=>document.querySelector('#detail .facts .fact:nth-child(4)')?.textContent.trim()||'');
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('朱厚熜'));
const zhuHoucongLineage=await page.evaluate(()=>({
  text:document.querySelector('#detail .lineage-fact')?.textContent.trim()||'',
  entries:document.querySelectorAll('#detail .lineage-list b').length,
  rich:document.querySelector('#detail .lineage-fact')?.classList.contains('rich')||false,
  source:[...document.querySelectorAll('#detail .sources a')].some(a=>a.href.includes('%E6%98%8E%E5%8F%B2/%E5%8D%B717')||a.href.includes('明史/卷17'))
}));
await page.locator('#detail .lineage-fact').screenshot({path:path.join(root,'人物档案_朱厚熜_帝系关系_预览.png')});
await page.locator('#close').click();
const emperorLineageSamples=[];
for(const name of ['朱元璋','朱允炆','朱棣','朱高炽','朱瞻基','朱祁镇','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校','朱由检']){
  await page.evaluate(personName=>focusPerson(personName),name);
  emperorLineageSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
    lineageCards:document.querySelectorAll('#detail .lineage-fact.rich').length,
    entries:document.querySelectorAll('#detail .lineage-list b').length,
    text:document.querySelector('#detail .lineage-fact')?.textContent.trim()||'',
    confidence:document.querySelector('#detail .lineage-fact>span')?.textContent.trim()||'',
    succession:document.querySelector('#detail .lineage-list .succession')?.textContent.trim()||'',
    boundary:document.querySelector('#detail .lineage-boundary')?.textContent.trim()||'',
    sourceLinks:document.querySelectorAll('#detail .sources a').length
  }),name));
  if(['朱元璋','朱允炆','朱祁镇'].includes(name)){
    await page.locator('#detail .lineage-fact').screenshot({path:path.join(root,`人物档案_${name}_帝系关系_预览.png`)});
  }
  await page.locator('#close').click();
}
await page.evaluate(()=>focusPerson('张居正'));
const secondProfile=await page.evaluate(()=>({preview:document.querySelectorAll('#detail .profile-preview').length,quickNodes:document.querySelectorAll('#detail .profile-quick-node').length,href:document.querySelector('#detail .profile-enter')?.getAttribute('href')}));
await page.locator('#close').click();
const reenactmentSamples=[];
for(const name of ['汪直','郭子兴','马皇后','陈友谅','张士诚','朱标','也先','张璁','李太后','努尔哈赤','皇太极','李自成']){
  await page.evaluate(personName=>focusPerson(personName),name);
  reenactmentSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim(),
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    genericCamera:document.querySelectorAll('#detail .story-reenactment').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length,
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
  }),name));
  if(name==='陈友谅'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_陈友谅_历史切片_预览.png')});
  }
  await page.locator('#close').click();
}
const secondSliceDrawerSamples=[];
for(const name of ['朱元璋','朱棣','朱祁镇','朱由检','胡惟庸','杨继盛','严世蕃','李如松','史可法','王振','冯保']){
  await page.evaluate(personName=>focusPerson(personName),name);
  secondSliceDrawerSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim(),
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    genericCamera:document.querySelectorAll('#detail .story-reenactment').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length,
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
  }),name));
  if(name==='朱由检'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_朱由检_历史切片_第二批预览.png')});
  }
  await page.locator('#close').click();
}
const thirdSliceDrawerSamples=[];
for(const name of ['朱允炆','朱高炽','朱瞻基','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校','朱高煦','朱文圭','朱常洵','朱慈烺']){
  await page.evaluate(personName=>focusPerson(personName),name);
  thirdSliceDrawerSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim(),
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    genericCamera:document.querySelectorAll('#detail .story-reenactment').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length,
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
  }),name));
  if(name==='朱祁钰'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_朱祁钰_历史切片_第三批预览.png')});
  }
  await page.locator('#close').click();
}
const fourthSliceDrawerSamples=[];
for(const name of ['徐达','李时珍','徐霞客','王守仁','徐光启','郑和','孙承宗','俞大猷','秦良玉','夏原吉','沐英','傅友德','谭纶','沈周','杨士奇','左光斗']){
  await page.evaluate(personName=>focusPerson(personName),name);
  fourthSliceDrawerSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim(),
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    genericCamera:document.querySelectorAll('#detail .story-reenactment').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length,
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
  }),name));
  if(name==='徐达'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_徐达_历史切片_第四批预览.png')});
  }
  await page.locator('#close').click();
}
await page.evaluate(()=>focusPerson('王守仁'));
const wangYangmingThought=await page.evaluate(()=>({
  drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
  sourceLinks:document.querySelectorAll('#detail .sources a').length,
  preview:document.querySelectorAll('#detail .profile-preview').length,
  quickNodes:document.querySelectorAll('#detail .profile-quick-node').length,
  enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||'',
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
await page.locator('#detail .profile-preview').screenshot({path:path.join(root,'人物档案_王守仁_独立页入口预览.png')});
await page.locator('#close').click();
const fifthSliceDrawerSamples=[];
for(const name of ['翁万达','马芳','杨荣','蓝玉','刘大夏','胡宗宪','徐渭','宋应昌','刘綎','李成梁','袁崇焕','毛文龙','洪承畴','吴三桂','卢象升']){
  await page.evaluate(personName=>focusPerson(personName),name);
  fifthSliceDrawerSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim(),
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    genericCamera:document.querySelectorAll('#detail .story-reenactment').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length
  }),name));
  if(name==='吴三桂'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_吴三桂_历史切片_第五批预览.png')});
  }
  await page.locator('#close').click();
}
const sixthSliceDrawerSamples=[];
for(const name of ['王景弘','金英','曹吉祥','刘瑾','张永','陈矩','魏忠贤','王承恩','万贵妃','郑贵妃','客氏','朱柏','朱权','朱高燧','朱瞻墡']){
  await page.evaluate(personName=>focusPerson(personName),name);
  sixthSliceDrawerSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim(),
    category:document.querySelector('#detail .seal')?.textContent.split('·')[0].trim()||'',
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    genericCamera:document.querySelectorAll('#detail .story-reenactment').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownLabel:document.querySelector('#detail .knowledge-split article:first-child b')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length
  }),name));
  if(name==='万贵妃'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_万贵妃_历史切片_第六批预览.png')});
  }
  await page.locator('#close').click();
}
const innerCourtCardSamples=[];
for(const name of ['马皇后','纪氏','万贵妃','李太后','郑贵妃','客氏']){
  await page.evaluate(personName=>focusPerson(personName),name);
  innerCourtCardSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
    category:document.querySelector('#detail .facts>.fact:first-child b')?.textContent.trim()||'',
    office:document.querySelector('#detail .facts>.fact:first-child .year')?.textContent.trim()||'',
    portraitLoaded:Boolean(document.querySelector('#detail .portrait img')?.complete&&document.querySelector('#detail .portrait img')?.naturalWidth),
    imagined:document.querySelector('#detail .portrait')?.classList.contains('portrait-imagined')||false,
    portraitLabel:document.querySelector('#detail .portrait-label')?.textContent.trim()||'',
    portraitNote:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
    sources:document.querySelectorAll('#detail .sources a').length,
    historicalSlice:document.querySelectorAll('#detail .history-slice').length
  }),name));
  if(name==='纪氏'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_纪氏_历史切片_预览.png')});
  }
  await page.locator('#close').click();
}
const seventhSliceDrawerSamples=[];
for(const name of ['宋濂','解缙','李东阳','文徵明','仇英','马守真','顾宪成','高攀龙','陈继儒','吴承恩','李贽','汤显祖','张景岳','宋应星','倪元璐']){
  await page.evaluate(personName=>focusPerson(personName),name);
  seventhSliceDrawerSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length
  }),name));
  if(name==='宋应星'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_宋应星_历史切片_第七批预览.png')});
  }
  await page.locator('#close').click();
}
const knowledgeCardSamples=[];
for(const name of ['文徵明','李贽','吴承恩','汤显祖','张景岳','宋应星']){
  await page.evaluate(personName=>focusPerson(personName),name);
  knowledgeCardSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
    category:document.querySelector('#detail .facts>.fact:first-child b')?.textContent.trim()||'',
    office:document.querySelector('#detail .facts>.fact:first-child .year')?.textContent.trim()||'',
    sources:document.querySelectorAll('#detail .sources a').length,
    historicalSlice:document.querySelectorAll('#detail .history-slice').length
  }),name));
  await page.locator('#close').click();
}
const eighthSliceDrawerSamples=[];
for(const name of ['刘基','常遇春','李文忠','邓愈','汤和','姚广孝','方孝孺','朱能','丘福','杨溥','商辂','刘健','谢迁','杨廷和','严嵩','徐阶','海瑞','高拱','申时行','叶向高','杨涟','孙传庭','黄道周']){
  await page.evaluate(personName=>focusPerson(personName),name);
  eighthSliceDrawerSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length
  }),name));
  if(name==='海瑞'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_海瑞_历史切片_第八批预览.png')});
  }
  await page.locator('#close').click();
}
await page.goto(url('people.html'),{waitUntil:'networkidle'});
await page.locator('.chip[data-cat="后妃与内廷女性"]').click();
const innerCourtFilter=await page.evaluate(()=>({
  names:[...document.querySelectorAll('#rows .name')].map(x=>x.textContent.trim()),
  categories:[...document.querySelectorAll('#rows .badge')].map(x=>x.textContent.trim()),
  viewTitle:document.querySelector('#viewTitle')?.textContent.trim()||''
}));
const creativeSamples=[];
for(const name of ['沈周','仇英','徐渭','马守真','徐霞客']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.locator('#detail .work-museum').scrollIntoViewIfNeeded();
  await page.evaluate(async()=>{
    const images=[...document.querySelectorAll('#detail .work-museum img')];
    images.forEach(img=>img.loading='eager');
    await Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
  });
  creativeSamples.push(await page.evaluate(personName=>{
    const museum=document.querySelector('#detail .work-museum');
    const rail=museum?.querySelector('.art-rail,.panorama-window');
    const images=[...museum.querySelectorAll('img')];
    return {
      name:personName,
      layout:[...museum.classList].find(x=>x.startsWith('layout-')),
      images:images.length,
      broken:images.filter(img=>!img.naturalWidth).length,
      sourceLinks:museum.querySelectorAll('a[href^="http"]').length,
      quoteLines:museum.querySelectorAll('.work-verse div').length,
      knowledgeCells:museum.querySelectorAll('.knowledge-grid span').length,
      horizontal:Boolean(rail&&rail.scrollWidth>rail.clientWidth),
      confidenceLabels:museum.querySelectorAll('.auth-tag').length,
      textConfidence:museum.querySelector('.work-text-note')?.textContent.includes('中置信度')||false
    };
  },name));
  if(['仇英','徐渭','徐霞客'].includes(name)){
    const fileName={'仇英':'人物档案_仇英_长卷展柜_预览.png','徐渭':'人物档案_徐渭_诗画同体_预览.png','徐霞客':'人物档案_徐霞客_旅行日记_预览.png'}[name];
    await page.locator('#detail .work-museum').screenshot({path:path.join(root,fileName)});
  }
  await page.locator('#close').click();
}
const portraitBatch=[];
for(const name of ['徐达','李时珍','徐霞客','王守仁','徐光启','郑和','沈周','唐寅','仇英','刘基','常遇春','秦良玉']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['徐光启','郑和','秦良玉'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
const portraitBatch2=[];
for(const name of ['孙承宗','俞大猷','夏原吉','沐英','傅友德','谭纶','杨士奇','左光斗','杨廷和','杨涟','李文忠','卢象升']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch2.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['孙承宗','谭纶','李文忠'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第二批画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
const portraitBatch3=[];
for(const name of ['汤和','翁万达','马芳','刘健','宋应昌','杨荣','高拱','海瑞','邓愈','蓝玉','袁崇焕','马守真']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch3.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['翁万达','马芳','宋应昌','马守真'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第三批画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
const portraitBatch4=[];
for(const name of ['杨溥','谢迁','蹇义','刘大夏','高攀龙','黄道周','陈继儒','胡宗宪','顾宪成','商辂','李贤','王景弘']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch4.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['刘大夏','黄道周','陈继儒','王景弘'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第四批画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
const portraitBatch5=[];
for(const name of ['李东阳','严嵩','夏言','徐阶','张玉','姚广孝','丘福','解缙','朱能','刘瑾','张永']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch5.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['姚广孝','严嵩','张玉','刘瑾'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第五批画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
const portraitBatch6=[];
for(const name of ['沈一贯','沈鲤','申时行','叶向高','杨嗣昌','倪元璐','石亨','吴三桂','李成梁','刘綎','毛文龙','洪承畴','孙传庭']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch6.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['沈鲤','申时行','倪元璐','李成梁','毛文龙'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第六批画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
const portraitBatch7=[];
for(const name of ['王振','金英','曹吉祥','汪直','冯保','陈矩','魏忠贤','王承恩','徐渭']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch7.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['王振','金英','冯保','魏忠贤','王承恩','徐渭'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第七批画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
const portraitBatch8=[];
for(const name of ['严世蕃','胡惟庸']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch8.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length,
      chapters:document.querySelectorAll('#detail .life-chapter').length,
      hook:document.querySelector('#detail .life-hook')?.textContent.trim()||''
    };
  },name));
  await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第八批画像来源标识_预览.png')});
  await page.locator('#close').click();
}
const portraitBatch9=[];
for(const name of ['宁国公主','长平公主']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch9.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length,
      seal:document.querySelector('#detail .seal')?.textContent.trim()||''
    };
  },name));
  await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第九批画像来源标识_预览.png')});
  await page.locator('#close').click();
}
const portraitBatch13=[];
for(const name of ['文徵明','李贽','吴承恩','汤显祖','张景岳','宋应星','郑贵妃']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch13.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['文徵明','宋应星','郑贵妃'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第十三批画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
const portraitBatch14=[];
for(const name of ['郭子兴','陈友谅','张士诚','也先']){
  await page.evaluate(personName=>focusPerson(personName),name);
  await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
  portraitBatch14.push(await page.evaluate(async personName=>{
    const portrait=document.querySelector('#detail .detail-title .portrait');
    const image=portrait?.querySelector('img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:personName,
      loaded:Boolean(image?.naturalWidth),
      label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
      imagined:portrait?.classList.contains('portrait-imagined')||false,
      note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      sourceLinks:document.querySelectorAll('#detail .sources a').length
    };
  },name));
  if(['郭子兴','陈友谅','也先'].includes(name)){
    await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_'+name+'_第十四批画像来源标识_预览.png')});
  }
  await page.locator('#close').click();
}
await page.evaluate(()=>focusPerson('张璁'));
await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
const portraitBatch15=await page.evaluate(async()=>{
  const portrait=document.querySelector('#detail .detail-title .portrait');
  const image=portrait?.querySelector('img');
  if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
  return {
    name:document.querySelector('#detail h2')?.textContent.trim()||'',
    loaded:Boolean(image?.naturalWidth),
    label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
    imagined:portrait?.classList.contains('portrait-imagined')||false,
    note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
    sourceLinks:document.querySelectorAll('#detail .sources a').length
  };
});
await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_张璁_第十五批画像来源标识_预览.png')});
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('朱祐杬'));
await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
const portraitBatch16=await page.evaluate(async()=>{
  const portrait=document.querySelector('#detail .detail-title .portrait');
  const image=portrait?.querySelector('img');
  if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
  return {
    name:document.querySelector('#detail h2')?.textContent.trim()||'',
    loaded:Boolean(image?.naturalWidth),
    label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
    imagined:portrait?.classList.contains('portrait-imagined')||false,
    note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
    sourceLinks:document.querySelectorAll('#detail .sources a').length
  };
});
await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_朱祐杬_第十六批画像来源标识_预览.png')});
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('杨继盛'));
await page.evaluate(()=>document.querySelector('.panel')?.scrollTo(0,0));
const yangJisheng=await page.evaluate(async()=>{
  const portrait=document.querySelector('#detail .detail-title .portrait');
  const image=portrait?.querySelector('img');
  if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
  return {
    first:document.querySelector('#rows .name')?.textContent.trim(),
    drawerName:document.querySelector('#detail h2')?.textContent.trim(),
    loaded:Boolean(image?.naturalWidth),
    label:portrait?.querySelector('.portrait-label')?.textContent.trim()||'',
    imagined:portrait?.classList.contains('portrait-imagined')||false,
    note:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
    tenure:document.querySelector('#detail .facts .fact:nth-child(4)')?.textContent.trim()||'',
    chapters:document.querySelectorAll('#detail .life-chapter').length,
    workVoices:document.querySelectorAll('#detail .work-voice').length,
    quoteLines:document.querySelectorAll('#detail .work-voice blockquote div').length,
    factLayers:document.querySelectorAll('#detail .life-chapter .layer-fact').length,
    imaginationLayers:document.querySelectorAll('#detail .imagined-moment .layer-imagination').length,
    sourceLinks:document.querySelectorAll('#detail .sources a').length
  };
});
await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_杨继盛_画像来源标识_预览.png')});
await page.locator('#detail .work-voice').scrollIntoViewIfNeeded();
await page.locator('#detail .work-voice').screenshot({path:path.join(root,'人物档案_杨继盛_临刑诗_预览.png')});
await page.locator('#close').click();
await page.goto(url('people.html?person='+encodeURIComponent('唐寅')),{waitUntil:'networkidle'});
const tangYin=await page.evaluate(()=>({
  first:document.querySelector('#rows .name')?.textContent.trim(),
  drawer:document.querySelector('#drawer')?.classList.contains('open'),
  seal:document.querySelector('#detail .seal')?.textContent.trim(),
  domains:[...document.querySelectorAll('#detail .domain-tag')].map(x=>x.textContent.trim()),
  tenure:document.querySelector('#detail .facts .fact:nth-child(4)')?.textContent.trim(),
  preview:document.querySelectorAll('#detail .profile-preview').length,
  quickNodes:document.querySelectorAll('#detail .profile-quick-node').length,
  enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href'),
  sources:document.querySelectorAll('#detail .sources a').length
}));
await page.locator('#close').click();
const personPageSpecs=[
  {name:'朱元璋',slug:'zhu-yuan-zhang',theme:'founder',chapters:6,featureItems:6,artCards:0,work:true,minSources:7,sourceTriggers:6,state:true},
  {name:'朱棣',slug:'zhu-di',theme:'expedition',chapters:6,featureItems:6,artCards:0,work:true,minSources:8,sourceTriggers:6,reach:true},
  {name:'于谦',slug:'yu-qian',theme:'crisis',chapters:3,featureItems:4,artCards:0,work:true,minSources:3},
  {name:'张居正',slug:'zhang-ju-zheng',theme:'system',chapters:3,featureItems:4,artCards:0,work:false,minSources:3},
  {name:'唐寅',slug:'tang-yin',theme:'artist',chapters:3,featureItems:0,artCards:2,work:false,minSources:3},
  {name:'戚继光',slug:'qi-ji-guang',theme:'military',chapters:3,featureItems:4,artCards:0,work:true,minSources:3},
  {name:'王守仁',slug:'wang-shou-ren',theme:'mind',chapters:5,featureItems:4,artCards:0,work:true,minSources:6,thought:true},
  {name:'郑和',slug:'zheng-he',theme:'ocean',chapters:4,featureItems:6,artCards:0,work:false,minSources:5,sourceTriggers:4},
  {name:'李时珍',slug:'li-shi-zhen',theme:'materia',chapters:4,featureItems:5,artCards:0,work:true,minSources:5,sourceTriggers:4},
  {name:'徐光启',slug:'xu-guang-qi',theme:'translation',chapters:4,featureItems:5,artCards:0,work:true,minSources:5,sourceTriggers:4},
  {name:'朱翊钧',slug:'zhu-yi-jun',theme:'reign',chapters:5,featureItems:6,artCards:0,work:false,minSources:5,sourceTriggers:5},
  {name:'李自成',slug:'li-zi-cheng',theme:'uprising',chapters:5,featureItems:5,artCards:0,work:false,minSources:5,sourceTriggers:5}
];
const immersivePages=[];
let sourceDialogAudit=null;
for(const spec of personPageSpecs){
  await page.goto(url('people/'+spec.slug+'.html'),{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
    const images=[...document.images];
    images.forEach(img=>img.loading='eager');
    await Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
  });
  immersivePages.push(await page.evaluate(spec=>({
    name:spec.name,
    title:document.title,
    h1:document.querySelector('h1')?.childNodes[0]?.textContent.trim(),
    theme:document.body.dataset.theme,
    portraitLoaded:Boolean(document.querySelector('.hero-visual img')?.naturalWidth),
    chapters:document.querySelectorAll('.chapter').length,
    ageLabels:[...document.querySelectorAll('.chapter-age')].map(x=>x.textContent.trim()),
    evidence:document.querySelectorAll('.chapter .evidence').length,
    inferences:document.querySelectorAll('.chapter .inference').length,
    protocols:document.querySelectorAll('.protocol>div').length,
    historicalSlice:document.querySelectorAll('.history-slice').length,
    sliceCoordinate:document.querySelector('.history-slice-coord')?.textContent.trim()||'',
    sliceKnownUnknown:document.querySelectorAll('.history-slice .knowledge-split article').length,
    sliceAction:document.querySelectorAll('.history-slice-action').length,
    sliceConsequence:document.querySelectorAll('.history-slice-consequence').length,
    sliceBoundary:document.querySelectorAll('.history-slice-boundary').length,
    featureItems:document.querySelectorAll('.feature-item').length,
    thoughtProfile:document.querySelectorAll('.feature-thought').length,
    thoughtPractice:document.querySelectorAll('.thought-practice').length,
    thoughtAfterlife:document.querySelectorAll('.thought-afterlife article').length,
    stateProfile:document.querySelectorAll('.feature-state').length,
    stateCosts:document.querySelectorAll('.feature-state .state-ledger').length,
    reachProfile:document.querySelectorAll('.feature-reach').length,
    reachItems:document.querySelectorAll('.feature-reach .reach-ledger').length,
    sourceTriggers:document.querySelectorAll('.source-trigger').length,
    artCards:document.querySelectorAll('.art-card').length,
    brokenArt:[...document.querySelectorAll('.art-card img')].filter(img=>!img.naturalWidth).length,
    work:Boolean(document.querySelector('.work')),
    sources:document.querySelectorAll('.source-list .source').length,
    finalQuestion:Boolean(document.querySelector('.final-question p')?.textContent.trim()),
    peopleLink:document.querySelector('.museum-links a.active')?.getAttribute('href'),
    nextLinks:document.querySelectorAll('.next a').length,
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth
  }),spec));
  if(spec.name==='唐寅'){
    await page.locator('.history-slice').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.locator('.history-slice-shell').screenshot({path:path.join(root,'人物独立页_唐寅_历史切片_第二批预览.png')});
  }
  if(spec.name==='朱元璋'){
    await page.screenshot({path:path.join(root,'人物独立页_朱元璋_首屏预览.png'),fullPage:false});
    await page.locator('.feature-state').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.locator('.feature-state').screenshot({path:path.join(root,'人物独立页_朱元璋_洪武制度剖面预览.png')});
  }
  if(spec.name==='朱棣'){
    await page.screenshot({path:path.join(root,'人物独立页_朱棣_首屏预览.png'),fullPage:false});
    await page.locator('.feature-reach').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.locator('.feature-reach').screenshot({path:path.join(root,'人物独立页_朱棣_永乐经纬预览.png')});
  }
  if(spec.name==='王守仁'){
    await page.screenshot({path:path.join(root,'人物独立页_王守仁_首屏预览.png'),fullPage:false});
    await page.locator('.feature-thought').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.locator('.feature-thought').screenshot({path:path.join(root,'人物独立页_王守仁_阳明心学预览.png')});
  }
  const batch2Feature={郑和:'voyage',李时珍:'materia',徐光启:'translation',朱翊钧:'reign',李自成:'collapse'}[spec.name];
  if(batch2Feature){
    await page.screenshot({path:path.join(root,'人物独立页_'+spec.name+'_首屏预览.png'),fullPage:false});
    await page.locator('.feature-'+batch2Feature).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.locator('.feature-'+batch2Feature).screenshot({path:path.join(root,'人物独立页_'+spec.name+'_专题模块预览.png')});
  }
  if(spec.name==='于谦'){
    const triggers=page.locator('.source-trigger');
    await triggers.nth(1).click();
    await page.waitForTimeout(350);
    sourceDialogAudit=await page.evaluate(()=>({
      triggers:document.querySelectorAll('.source-trigger').length,
      open:document.querySelector('#primarySourceDialog')?.open||false,
      title:document.querySelector('#sourceDialogTitle')?.textContent.trim(),
      location:document.querySelector('#sourceDialogLocation')?.textContent.trim(),
      paragraphs:document.querySelectorAll('#sourceDialogOriginal p').length,
      original:document.querySelector('#sourceDialogOriginal')?.textContent.trim(),
      reading:document.querySelector('#sourceDialogReading')?.textContent.trim(),
      boundary:document.querySelector('#sourceDialogBoundary')?.textContent.trim(),
      fullTextHref:document.querySelector('#sourceDialogLink')?.getAttribute('href'),
      closeFocused:document.activeElement?.id==='sourceDialogClose',
      bodyLocked:document.body.classList.contains('dialog-open')
    }));
    await page.screenshot({path:path.join(root,'人物独立页_于谦_明史原文弹窗_桌面预览.png'),fullPage:false});
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    sourceDialogAudit.closedByEscape=await page.evaluate(()=>!document.querySelector('#primarySourceDialog').open&&!document.body.classList.contains('dialog-open'));
  }
  await page.screenshot({path:path.join(root,'人物独立页_'+spec.name+'_桌面预览.png'),fullPage:false});
}
await page.goto(url('people.html'),{waitUntil:'networkidle'});
await page.locator('#reset').click();
await page.locator('.chip[data-cat="在野人物"]').click();
const independentFilter=await page.evaluate(()=>({
  count:document.querySelectorAll('#rows tr[data-id]').length,
  categories:[...new Set([...document.querySelectorAll('#rows .badge')].map(x=>x.textContent.trim()))]
}));
await page.locator('#reset').click();
await page.selectOption('#domain','地理旅行');
const domainFilter=await page.evaluate(()=>({
  count:document.querySelectorAll('#rows tr[data-id]').length,
  names:[...document.querySelectorAll('#rows .name')].map(x=>x.textContent.trim())
}));
await page.screenshot({path:path.join(root,'人物馆_在野人物与领域筛选_预览.png'),fullPage:false});
await page.locator('#reset').click();
const storyCoverage=await page.evaluate(()=>({
  rows:document.querySelectorAll('#rows tr[data-id]').length,
  markers:document.querySelectorAll('#rows .story-ready').length,
  statLabel:[...document.querySelectorAll('.stat')].find(x=>x.querySelector('span')?.textContent.trim()==='故事覆盖')?.querySelector('strong')?.textContent.trim()
}));
await page.locator('.emperor').first().click();
const emperorView=await page.evaluate(()=>{
  const rows=[...document.querySelectorAll('#rows tr[data-id]')].map(x=>({name:x.querySelector('.name')?.textContent.trim(),category:x.querySelector('.badge')?.textContent.trim()}));
  const names=rows.map(x=>x.name);
  return {first:rows[0],emperorCount:rows.filter(x=>x.category==='皇帝').length,duplicates:[...new Set(names.filter((n,i)=>names.indexOf(n)!==i))]};
});
await page.screenshot({path:path.join(root,'人物馆_预览.png'),fullPage:false});

await page.goto(url('events.html?stage=s6'),{waitUntil:'networkidle'});
const events=await page.evaluate(()=>({
  title:document.title,
  peopleTableDisplay:getComputedStyle(document.querySelector('.tablewrap')).display,
  eventDisplay:getComputedStyle(document.querySelector('.eventlab')).display,
  cards:document.querySelectorAll('.eventcard').length,
  activeStage:document.querySelector('.stagechip.active')?.dataset.stage,
  navActive:document.querySelector('.museum-links a.active')?.textContent.trim(),
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
await page.goto(url('events.html?q='+encodeURIComponent('北京保卫战')),{waitUntil:'networkidle'});
const queryCount=await page.locator('.eventcard').count();
await page.locator('.eventcard').first().click();
const eventDetail=await page.evaluate(()=>({title:document.querySelector('#detail h2')?.textContent.trim(),people:document.querySelectorAll('#detail .personjump').length,sources:document.querySelectorAll('#detail .sources a').length}));
await page.locator('#detail [data-event-people="e035"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(350);
await page.screenshot({path:path.join(root,'事件馆_北京保卫战人物入口_预览.png'),fullPage:false});
await Promise.all([
  page.waitForURL(u=>u.pathname.endsWith('/people.html')&&u.searchParams.get('event')==='e035'),
  page.locator('#detail [data-event-people="e035"]').click()
]);
const eventPeopleFilter=await page.evaluate(()=>({
  event:new URLSearchParams(location.search).get('event'),
  selected:document.querySelector('#personEvent')?.value,
  title:document.querySelector('#viewTitle')?.textContent.trim(),
  count:document.querySelectorAll('#rows tr[data-id]').length,
  names:[...document.querySelectorAll('#rows .name')].map(x=>x.textContent.trim()),
  parent:document.querySelector('#parent')?.value
}));
await page.screenshot({path:path.join(root,'人物馆_北京保卫战相关人物_预览.png'),fullPage:false});
await page.goto(url('people.html?person='+encodeURIComponent('于谦')),{waitUntil:'networkidle'});
const personRelatedEvents=await page.evaluate(()=>({
  count:document.querySelectorAll('#detail .related-events a').length,
  beijingHref:document.querySelector('#detail .related-events a[data-related-event="e035"]')?.getAttribute('href'),
  beijingText:document.querySelector('#detail .related-events a[data-related-event="e035"]')?.textContent.trim()
}));
await page.locator('#detail .related-events').scrollIntoViewIfNeeded();
await page.waitForTimeout(350);
await page.screenshot({path:path.join(root,'人物馆_于谦相关事件_预览.png'),fullPage:false});
await Promise.all([
  page.waitForURL(u=>u.pathname.endsWith('/events.html')&&u.searchParams.get('event')==='e035'),
  page.locator('#detail .related-events a[data-related-event="e035"]').click()
]);
const directEvent=await page.evaluate(()=>({
  event:new URLSearchParams(location.search).get('event'),
  title:document.querySelector('#detail h2')?.textContent.trim(),
  drawerOpen:document.querySelector('#drawer')?.classList.contains('open')
}));
await page.goto(url('events.html?q='+encodeURIComponent('北京保卫战')),{waitUntil:'networkidle'});
await page.locator('.eventcard').first().click();
await Promise.all([
  page.waitForURL(u=>u.pathname.endsWith('/people.html')&&u.searchParams.get('person')==='于谦'),
  page.locator('#detail .personjump[data-person="于谦"]').click()
]);
const crossHall=await page.evaluate(()=>({pathname:location.pathname,person:new URLSearchParams(location.search).get('person'),search:document.querySelector('#search').value,first:document.querySelector('#rows .name')?.textContent.trim()}));

await page.goto(url('events.html'),{waitUntil:'networkidle'});
await page.screenshot({path:path.join(root,'事件馆_预览.png'),fullPage:false});
await page.setViewportSize({width:390,height:844});
await page.goto(url('index.html'),{waitUntil:'networkidle'});
const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,doorColumns:getComputedStyle(document.querySelector('.doors')).gridTemplateColumns.split(' ').length,eraColumns:getComputedStyle(document.querySelector('.eras')).gridTemplateColumns.split(' ').length,navHeight:document.querySelector('.museum-nav').getBoundingClientRect().height}));
await page.goto(url('people.html?person='+encodeURIComponent('于谦')),{waitUntil:'networkidle'});
await page.waitForURL(u=>u.pathname.endsWith('/people/yu-qian.html'));
const mobileProfile=await page.evaluate(()=>({
  pathname:location.pathname,
  h1:document.querySelector('h1')?.childNodes[0]?.textContent.trim(),
  drawer:Boolean(document.querySelector('#drawer')),
  chapters:document.querySelectorAll('.chapter').length,
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth,
  heroColumns:getComputedStyle(document.querySelector('.hero')).gridTemplateColumns.split(' ').length
}));
await page.locator('.source-trigger').first().click();
await page.waitForTimeout(350);
const mobileSourceDialog=await page.evaluate(()=>({
  open:document.querySelector('#primarySourceDialog')?.open||false,
  dialogWidth:Math.round(document.querySelector('#primarySourceDialog')?.getBoundingClientRect().width||0),
  viewport:innerWidth,
  readingColumns:getComputedStyle(document.querySelector('.source-reading')).gridTemplateColumns.split(' ').length,
  bodyWidth:document.body.scrollWidth
}));
await page.screenshot({path:path.join(root,'人物独立页_于谦_明史原文弹窗_移动端预览.png'),fullPage:false});
await page.locator('#sourceDialogClose').click();
await page.screenshot({path:path.join(root,'人物独立页_于谦_移动端预览.png'),fullPage:false});
await page.goto(url('people.html?person='+encodeURIComponent('陈友谅')),{waitUntil:'networkidle'});
const mobileStory=await page.evaluate(()=>({
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth,
  reenactmentColumns:getComputedStyle(document.querySelector('#detail .history-slice-grid')).gridTemplateColumns.split(' ').length,
  visible:Boolean(document.querySelector('#detail .history-slice')),
  genericCamera:document.querySelectorAll('#detail .story-reenactment').length
}));
await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
await page.screenshot({path:path.join(root,'人物档案_历史切片_移动端预览.png'),fullPage:false});
await page.goto(url('people.html?person='+encodeURIComponent('徐渭')),{waitUntil:'networkidle'});
await page.locator('#detail .work-museum').scrollIntoViewIfNeeded();
const mobileCreative=await page.evaluate(async()=>{
  const museum=document.querySelector('#detail .work-museum');
  const image=museum?.querySelector('img');
  if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
  return {
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth,
    columns:getComputedStyle(museum.querySelector('.ink-poem-stage')).gridTemplateColumns.split(' ').length,
    imageLoaded:Boolean(image?.naturalWidth),
    quoteLines:museum.querySelectorAll('.work-verse div').length
  };
});
await page.locator('#detail .work-museum').screenshot({path:path.join(root,'人物档案_徐渭_诗画同体_移动端预览.png')});
await page.locator('#close').click();
await Promise.all([
  page.waitForURL(/people\/wang-shou-ren\.html$/),
  page.evaluate(()=>focusPerson('王守仁'))
]);
const mobileWangYangmingPage=await page.evaluate(()=>({
  h1:document.querySelector('h1')?.childNodes[0]?.textContent.trim()||'',
  chapters:document.querySelectorAll('.chapter').length,
  thoughtColumns:getComputedStyle(document.querySelector('.feature-thought .feature-grid')).gridTemplateColumns.split(' ').length,
  afterlifeColumns:getComputedStyle(document.querySelector('.thought-afterlife-grid')).gridTemplateColumns.split(' ').length,
  sourceTriggers:document.querySelectorAll('.source-trigger').length,
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
await page.goto(url('people.html'),{waitUntil:'networkidle'});
await Promise.all([
  page.waitForURL(/people\/zhu-yuan-zhang\.html$/),
  page.evaluate(()=>focusPerson('朱元璋'))
]);
const mobileZhuYuanzhangPage=await page.evaluate(()=>({
  h1:document.querySelector('h1')?.childNodes[0]?.textContent.trim()||'',
  chapters:document.querySelectorAll('.chapter').length,
  stateColumns:getComputedStyle(document.querySelector('.feature-state .feature-grid')).gridTemplateColumns.split(' ').length,
  stateCosts:document.querySelectorAll('.feature-state .state-ledger').length,
  sourceTriggers:document.querySelectorAll('.source-trigger').length,
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
await page.goto(url('people.html'),{waitUntil:'networkidle'});
await Promise.all([
  page.waitForURL(/people\/zhu-di\.html$/),
  page.evaluate(()=>focusPerson('朱棣'))
]);
const mobileZhuDiPage=await page.evaluate(()=>({
  h1:document.querySelector('h1')?.childNodes[0]?.textContent.trim()||'',
  chapters:document.querySelectorAll('.chapter').length,
  reachColumns:getComputedStyle(document.querySelector('.feature-reach .feature-grid')).gridTemplateColumns.split(' ').length,
  reachItems:document.querySelectorAll('.feature-reach .reach-ledger').length,
  sourceTriggers:document.querySelectorAll('.source-trigger').length,
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
const mobileBatch2Pages=[];
for(const spec of personPageSpecs.slice(-5)){
  await page.goto(url('people.html'),{waitUntil:'networkidle'});
  await Promise.all([
    page.waitForURL(new RegExp('people/'+spec.slug+'\\.html$')),
    page.evaluate(personName=>focusPerson(personName),spec.name)
  ]);
  mobileBatch2Pages.push(await page.evaluate(spec=>({
    name:spec.name,
    pathname:location.pathname,
    h1:document.querySelector('h1')?.childNodes[0]?.textContent.trim()||'',
    chapters:document.querySelectorAll('.chapter').length,
    featureColumns:getComputedStyle(document.querySelector('.feature-grid')).gridTemplateColumns.split(' ').length,
    sourceTriggers:document.querySelectorAll('.source-trigger').length,
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth
  }),spec));
}

const audit={home,homeTitleLayouts,people,personStory,zhuGaochiTenure,zhuChangluoTenure,zhuHoucongLineage,emperorLineageSamples,secondProfile,reenactmentSamples,secondSliceDrawerSamples,thirdSliceDrawerSamples,creativeSamples,portraitBatch,portraitBatch2,portraitBatch3,portraitBatch4,portraitBatch5,portraitBatch6,portraitBatch7,portraitBatch8,portraitBatch9,portraitBatch13,portraitBatch14,portraitBatch15,portraitBatch16,yangJisheng,wangYangmingThought,tangYin,immersivePages,sourceDialogAudit,independentFilter,domainFilter,storyCoverage,emperorView,events,queryCount,eventDetail,eventPeopleFilter,personRelatedEvents,directEvent,crossHall,mobile,mobileProfile,mobileSourceDialog,mobileStory,mobileCreative,mobileWangYangmingPage,mobileZhuYuanzhangPage,mobileZhuDiPage,mobileBatch2Pages,eighthSliceDrawerSamples,errors};
const expectedFigurePortraits=[
  {name:'朱元璋',loaded:true,label:'',fallback:false},
  {name:'朱棣',loaded:true,label:'',fallback:false},
  {name:'于谦',loaded:true,label:'AI想象像',fallback:false},
  {name:'张居正',loaded:true,label:'AI想象像',fallback:false}
];
const creativeByName=Object.fromEntries(creativeSamples.map(x=>[x.name,x]));
const creativePass=creativeSamples.length===5&&creativeSamples.every(x=>x.broken===0&&x.sourceLinks>=1)&&creativeByName['沈周'].images===2&&creativeByName['沈周'].horizontal&&creativeByName['仇英'].images===2&&creativeByName['仇英'].horizontal&&creativeByName['徐渭'].images===1&&creativeByName['徐渭'].quoteLines===2&&creativeByName['马守真'].images===1&&creativeByName['马守真'].quoteLines===2&&creativeByName['马守真'].textConfidence&&creativeByName['徐霞客'].images===0&&creativeByName['徐霞客'].quoteLines===2;
const portraitByName=Object.fromEntries(portraitBatch.map(x=>[x.name,x]));
const portraitBatchPass=portraitBatch.length===12&&portraitBatch.every(x=>x.loaded&&x.label&&x.note.includes('置信度')&&x.sourceLinks>=1)&&portraitBatch.filter(x=>x.imagined).length===1&&portraitByName['秦良玉'].imagined&&portraitByName['秦良玉'].label==='AI想象像'&&portraitByName['秦良玉'].note.includes('未知置信度')&&portraitByName['沈周'].label==='明代八十岁像'&&portraitByName['郑和'].label==='明末小说插图';
const portraitBatch2ByName=Object.fromEntries(portraitBatch2.map(x=>[x.name,x]));
const portraitBatch2Pass=portraitBatch2.length===12&&portraitBatch2.every(x=>x.loaded&&x.label&&!x.imagined&&x.note.includes('置信度')&&x.sourceLinks>=1)&&portraitBatch2ByName['谭纶'].label==='1560年画像碑'&&portraitBatch2ByName['谭纶'].note.includes('高置信度')&&portraitBatch2ByName['俞大猷'].label==='现代纪念石像'&&portraitBatch2ByName['俞大猷'].note.includes('低置信度')&&portraitBatch2ByName['李文忠'].label==='明代画像';
const portraitBatch3ByName=Object.fromEntries(portraitBatch3.map(x=>[x.name,x]));
const portraitBatch3Pass=portraitBatch3.length===12&&portraitBatch3.every(x=>x.loaded&&x.label&&x.note.includes('置信度')&&x.sourceLinks>=1)&&portraitBatch3.filter(x=>x.imagined).length===5&&['马芳','刘健','宋应昌','蓝玉','马守真'].every(name=>portraitBatch3ByName[name].imagined&&portraitBatch3ByName[name].label==='AI想象像'&&portraitBatch3ByName[name].note.includes('未知置信度'))&&portraitBatch3ByName['翁万达'].label==='族谱传世像'&&portraitBatch3ByName['袁崇焕'].label==='清乾隆绘像';
const portraitBatch4ByName=Object.fromEntries(portraitBatch4.map(x=>[x.name,x]));
const portraitBatch4Pass=portraitBatch4.length===12&&portraitBatch4.every(x=>x.loaded&&x.label&&x.note.includes('置信度')&&x.sourceLinks>=1)&&portraitBatch4.filter(x=>x.imagined).length===3&&['商辂','李贤','王景弘'].every(name=>portraitBatch4ByName[name].imagined&&portraitBatch4ByName[name].label==='AI想象像'&&portraitBatch4ByName[name].note.includes('未知置信度'))&&portraitBatch4ByName['刘大夏'].label==='明代同年写真'&&portraitBatch4ByName['刘大夏'].note.includes('高置信度')&&portraitBatch4ByName['黄道周'].label==='明代同时期写真'&&portraitBatch4ByName['胡宗宪'].label==='明代寿辰写真'&&portraitBatch4ByName['顾宪成'].label==='清代名贤石刻像';
const portraitBatch5ByName=Object.fromEntries(portraitBatch5.map(x=>[x.name,x]));
const portraitBatch5Pass=portraitBatch5.length===11&&portraitBatch5.every(x=>x.loaded&&x.label&&x.note.includes('置信度')&&x.sourceLinks>=1)&&portraitBatch5.filter(x=>x.imagined).length===6&&['夏言','张玉','丘福','朱能','刘瑾','张永'].every(name=>portraitBatch5ByName[name].imagined&&portraitBatch5ByName[name].label==='AI想象像'&&portraitBatch5ByName[name].note.includes('未知置信度'))&&portraitBatch5ByName['李东阳'].label==='明代同年写真'&&portraitBatch5ByName['李东阳'].note.includes('高置信度')&&portraitBatch5ByName['姚广孝'].label==='故宫藏明代画像'&&portraitBatch5ByName['严嵩'].label==='清代后世绘像'&&portraitBatch5ByName['徐阶'].label==='清代乡贤画像'&&portraitBatch5ByName['解缙'].label==='清初身后绘像';
const portraitBatch6ByName=Object.fromEntries(portraitBatch6.map(x=>[x.name,x]));
const portraitBatch6Pass=portraitBatch6.length===13&&portraitBatch6.every(x=>x.loaded&&x.label&&x.note.includes('置信度')&&x.sourceLinks>=1)&&portraitBatch6.filter(x=>x.imagined).length===6&&['沈鲤','叶向高','石亨','李成梁','刘綎','毛文龙'].every(name=>portraitBatch6ByName[name].imagined&&portraitBatch6ByName[name].label==='AI想象像'&&portraitBatch6ByName[name].note.includes('未知置信度'))&&portraitBatch6ByName['沈一贯'].label==='明代朝服像'&&portraitBatch6ByName['申时行'].label==='清代名贤石刻像'&&portraitBatch6ByName['申时行'].note.includes('低置信度')&&portraitBatch6ByName['杨嗣昌'].label==='文集所载遗像'&&portraitBatch6ByName['倪元璐'].label==='波臣派传世肖像'&&portraitBatch6ByName['吴三桂'].label==='清代后世绘像'&&portraitBatch6ByName['洪承畴'].label==='清代后世绘像'&&portraitBatch6ByName['孙传庭'].label==='民国纪念性遗像'&&portraitBatch6ByName['孙传庭'].note.includes('低置信度');
const portraitBatch7ByName=Object.fromEntries(portraitBatch7.map(x=>[x.name,x]));
const portraitBatch7Pass=portraitBatch7.length===9&&portraitBatch7.every(x=>x.loaded&&x.label&&x.note.includes('置信度')&&x.sourceLinks>=1)&&portraitBatch7.filter(x=>x.imagined).length===6&&['金英','曹吉祥','汪直','冯保','陈矩','魏忠贤'].every(name=>portraitBatch7ByName[name].imagined&&portraitBatch7ByName[name].label==='AI想象像'&&portraitBatch7ByName[name].note.includes('未知置信度'))&&portraitBatch7ByName['王振'].label==='来源不明传世图'&&portraitBatch7ByName['王振'].note.includes('低置信度')&&portraitBatch7ByName['王承恩'].label==='清代小说插图'&&portraitBatch7ByName['王承恩'].note.includes('低置信度')&&portraitBatch7ByName['徐渭'].label==='上博藏明人画像'&&portraitBatch7ByName['徐渭'].note.includes('高置信度');
const portraitBatch8Pass=portraitBatch8.length===2&&portraitBatch8.every(x=>x.loaded&&x.imagined&&x.label==='AI想象像'&&x.note.includes('未知置信度')&&x.sourceLinks>=3&&x.chapters===4&&x.hook);
const portraitBatch9Pass=portraitBatch9.length===2&&portraitBatch9.every(x=>x.loaded&&x.imagined&&x.label==='AI想象像'&&x.note.includes('未知置信度')&&x.sourceLinks>=2&&x.seal.includes('皇室子女'));
const portraitBatch13ByName=Object.fromEntries(portraitBatch13.map(item=>[item.name,item]));
const portraitBatch13Pass=portraitBatch13.length===7&&portraitBatch13.every(x=>x.loaded&&x.label&&x.note.includes('置信度')&&x.sourceLinks>=2)&&!portraitBatch13ByName['文徵明'].imagined&&portraitBatch13ByName['文徵明'].label==='明末清初后世画像'&&portraitBatch13ByName['文徵明'].note.includes('中置信度')&&['李贽','吴承恩','汤显祖','张景岳','宋应星','郑贵妃'].every(name=>portraitBatch13ByName[name].imagined&&portraitBatch13ByName[name].label==='AI想象像'&&portraitBatch13ByName[name].note.includes('未知置信度'));
const portraitBatch14Pass=portraitBatch14.length===4&&portraitBatch14.every(x=>x.loaded&&x.imagined&&x.label==='AI想象像'&&x.note.includes('未知置信度')&&x.sourceLinks>=2);
const portraitBatch15Pass=portraitBatch15.name==='张璁'&&portraitBatch15.loaded&&portraitBatch15.imagined&&portraitBatch15.label==='AI想象像'&&portraitBatch15.note.includes('未知置信度')&&portraitBatch15.sourceLinks>=2;
const portraitBatch16Pass=portraitBatch16.name==='朱祐杬'&&portraitBatch16.loaded&&!portraitBatch16.imagined&&portraitBatch16.label==='明代追尊宫廷像'&&portraitBatch16.note.includes('中置信度')&&portraitBatch16.sourceLinks>=3;
const yangJishengPass=yangJisheng.first==='杨继盛'&&yangJisheng.drawerName==='杨继盛'&&yangJisheng.loaded&&!yangJisheng.imagined&&yangJisheng.label==='18世纪清人绘像'&&yangJisheng.note.includes('低置信度')&&yangJisheng.tenure.includes('1547—1553 · 6年')&&yangJisheng.chapters===6&&yangJisheng.workVoices===1&&yangJisheng.quoteLines===2&&yangJisheng.factLayers===6&&yangJisheng.imaginationLayers===1&&yangJisheng.sourceLinks>=4;
const immersivePass=immersivePages.length===personPageSpecs.length&&immersivePages.every((x,i)=>{
  const spec=personPageSpecs[i];
  const expectedTriggers=spec.sourceTriggers??(spec.name==='王守仁'?5:(spec.name==='于谦'?3:0));
  return x.title.includes(spec.name)&&x.h1===spec.name&&x.theme===spec.theme&&x.portraitLoaded&&x.chapters===spec.chapters&&x.ageLabels.length===spec.chapters&&x.ageLabels.every(Boolean)&&x.evidence===spec.chapters&&x.inferences===spec.chapters&&x.protocols===3&&x.historicalSlice===1&&x.sliceCoordinate&&x.sliceKnownUnknown===2&&x.sliceAction===1&&x.sliceConsequence===1&&x.sliceBoundary===1&&x.featureItems===spec.featureItems&&x.artCards===spec.artCards&&x.brokenArt===0&&x.work===spec.work&&x.sources>=spec.minSources&&x.sourceTriggers===expectedTriggers&&(!spec.thought||(x.thoughtProfile===1&&x.thoughtPractice===1&&x.thoughtAfterlife===3))&&(!spec.state||(x.stateProfile===1&&x.stateCosts===6))&&(!spec.reach||(x.reachProfile===1&&x.reachItems===6))&&x.finalQuestion&&x.peopleLink==='../people.html'&&x.nextLinks===2&&x.bodyWidth===x.viewport;
});
const secondSliceDrawerPass=secondSliceDrawerSamples.length===11&&secondSliceDrawerSamples.every(x=>{
  if(x.name==='朱元璋') return x.drawerName===x.name&&x.preview===1&&x.enterHref==='people/zhu-yuan-zhang.html'&&x.historicalSlice===0&&x.genericCamera===0;
  if(x.name==='朱棣') return x.drawerName===x.name&&x.preview===1&&x.enterHref==='people/zhu-di.html'&&x.historicalSlice===0&&x.genericCamera===0;
  return x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1;
});
const reenactmentPass=reenactmentSamples.length===12&&reenactmentSamples.every(x=>{
  if(x.name==='李自成') return x.drawerName===x.name&&x.preview===1&&x.enterHref==='people/li-zi-cheng.html'&&x.historicalSlice===0&&x.genericCamera===0;
  return x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1;
});
const thirdSliceDrawerPass=thirdSliceDrawerSamples.length===16&&thirdSliceDrawerSamples.every(x=>{
  if(x.name==='朱翊钧') return x.drawerName===x.name&&x.preview===1&&x.enterHref==='people/zhu-yi-jun.html'&&x.historicalSlice===0&&x.genericCamera===0;
  return x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1;
});
const fourthSliceDrawerPass=fourthSliceDrawerSamples.length===16&&fourthSliceDrawerSamples.every(x=>{
  if(x.name==='王守仁') return x.drawerName===x.name&&x.preview===1&&x.enterHref==='people/wang-shou-ren.html'&&x.historicalSlice===0&&x.genericCamera===0;
  const pageSlug={李时珍:'li-shi-zhen',徐光启:'xu-guang-qi',郑和:'zheng-he'}[x.name];
  if(pageSlug) return x.drawerName===x.name&&x.preview===1&&x.enterHref==='people/'+pageSlug+'.html'&&x.historicalSlice===0&&x.genericCamera===0;
  return x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1;
});
const wangYangmingThoughtPass=wangYangmingThought.drawerName==='王守仁'&&wangYangmingThought.sourceLinks>=6&&wangYangmingThought.preview===1&&wangYangmingThought.quickNodes===5&&wangYangmingThought.enterHref==='people/wang-shou-ren.html'&&wangYangmingThought.bodyWidth===wangYangmingThought.viewport;
const fifthSliceDrawerPass=fifthSliceDrawerSamples.length===15&&fifthSliceDrawerSamples.every(x=>x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1);
const sixthSliceDrawerPass=sixthSliceDrawerSamples.length===15&&sixthSliceDrawerSamples.every(x=>x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1)&&sixthSliceDrawerSamples.filter(x=>['万贵妃','郑贵妃','客氏'].includes(x.name)).every(x=>x.knownLabel.startsWith('她当时'));
const innerCourtCardPass=innerCourtCardSamples.length===6&&innerCourtCardSamples.every(x=>x.drawerName===x.name&&x.category==='后妃与内廷女性'&&x.office&&x.sources>=2&&x.historicalSlice===1)&&innerCourtFilter.names.length===6&&['马皇后','纪氏','万贵妃','李太后','郑贵妃','客氏'].every(name=>innerCourtFilter.names.includes(name))&&innerCourtFilter.categories.every(category=>category==='后妃与内廷女性')&&innerCourtFilter.viewTitle==='后妃与内廷女性 · 筛选视图';
const innerCourtPortraitByName=Object.fromEntries(innerCourtCardSamples.map(item=>[item.name,item]));
const innerCourtPortraitPass=['万贵妃','纪氏','客氏'].every(name=>innerCourtPortraitByName[name].portraitLoaded&&innerCourtPortraitByName[name].imagined&&innerCourtPortraitByName[name].portraitLabel==='AI想象像'&&innerCourtPortraitByName[name].portraitNote.includes('未知置信度'));
const seventhSliceDrawerPass=seventhSliceDrawerSamples.length===15&&seventhSliceDrawerSamples.every(x=>x.drawerName===x.name&&x.historicalSlice===1&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1);
const eighthSliceDrawerPass=eighthSliceDrawerSamples.length===23&&eighthSliceDrawerSamples.every(x=>x.drawerName===x.name&&x.historicalSlice===1&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1);
const knowledgeCardPass=knowledgeCardSamples.length===6&&knowledgeCardSamples.every(x=>x.drawerName===x.name&&x.category==='在野人物'&&x.office&&x.sources>=2&&x.historicalSlice===1);
const sourceDialogPass=sourceDialogAudit?.triggers===3&&sourceDialogAudit.open&&sourceDialogAudit.title==='1449：从反对南迁到列阵九门'&&sourceDialogAudit.location.includes('卷一百七十')&&sourceDialogAudit.paragraphs===3&&sourceDialogAudit.original.includes('言南迁者，可斩也')&&sourceDialogAudit.original.includes('列阵九门外')&&sourceDialogAudit.reading.includes('连续步骤')&&sourceDialogAudit.boundary.includes('清代')&&sourceDialogAudit.fullTextHref.includes('卷170')&&sourceDialogAudit.closeFocused&&sourceDialogAudit.bodyLocked&&sourceDialogAudit.closedByEscape;
const homeTitlePass=homeTitleLayouts.length===5&&homeTitleLayouts.every(x=>x.lineRects===1&&x.titleWithinViewport&&x.whiteSpace==='nowrap'&&x.yearBalanced&&x.yearsInset&&x.bodyWidth===x.viewport);
const factGridPass=personStory.identityValue==='文臣'&&JSON.stringify(personStory.factLabels.slice(0,6))===JSON.stringify(['身份','生卒 / 寿命','籍贯','关键任期 / 历朝','历史领域','加权总分']);
const zhuHoucongLineagePass=zhuHoucongLineage.rich&&zhuHoucongLineage.entries===7&&['兴献王朱祐杬','蒋氏','明宪宗朱见深','明孝宗朱祐樘','堂兄明武宗朱厚照','皇位由孝宗一支转入兴献王一支'].every(text=>zhuHoucongLineage.text.includes(text))&&zhuHoucongLineage.source;
const emperorLineageByName=Object.fromEntries(emperorLineageSamples.map(item=>[item.name,item]));
const emperorLineagePass=emperorLineageSamples.length===16&&emperorLineageSamples.every(item=>item.drawerName===item.name&&item.lineageCards===1&&item.entries>=5&&/高置信度|中置信度/.test(item.confidence)&&item.succession.startsWith('入继：')&&item.boundary.startsWith('证据边界：')&&item.sourceLinks>=2)&&['朱世珍','陈氏','明朝开国皇帝'].every(text=>emperorLineageByName['朱元璋'].text.includes(text))&&['朱标','吕氏','明太祖朱元璋','皇太孙'].every(text=>emperorLineageByName['朱允炆'].text.includes(text))&&emperorLineageByName['朱棣'].text.includes('生母异说')&&emperorLineageByName['朱祁镇'].text.includes('两段统治')&&emperorLineageByName['朱厚熜'].text.includes('兴献王一支')&&emperorLineageByName['朱由检'].text.includes('兄终弟及');
audit.creativePass=creativePass;
audit.portraitBatchPass=portraitBatchPass;
audit.portraitBatch2Pass=portraitBatch2Pass;
audit.portraitBatch3Pass=portraitBatch3Pass;
audit.portraitBatch4Pass=portraitBatch4Pass;
audit.portraitBatch5Pass=portraitBatch5Pass;
audit.portraitBatch6Pass=portraitBatch6Pass;
audit.portraitBatch7Pass=portraitBatch7Pass;
audit.portraitBatch8Pass=portraitBatch8Pass;
audit.portraitBatch9Pass=portraitBatch9Pass;
audit.portraitBatch13Pass=portraitBatch13Pass;
audit.portraitBatch14Pass=portraitBatch14Pass;
audit.portraitBatch15Pass=portraitBatch15Pass;
audit.portraitBatch16Pass=portraitBatch16Pass;
audit.yangJishengPass=yangJishengPass;
audit.immersivePass=immersivePass;
audit.secondSliceDrawerPass=secondSliceDrawerPass;
audit.thirdSliceDrawerPass=thirdSliceDrawerPass;
audit.fourthSliceDrawerPass=fourthSliceDrawerPass;
audit.fifthSliceDrawerPass=fifthSliceDrawerPass;
audit.sixthSliceDrawerPass=sixthSliceDrawerPass;
audit.innerCourtCardPass=innerCourtCardPass;
audit.innerCourtPortraitPass=innerCourtPortraitPass;
audit.seventhSliceDrawerPass=seventhSliceDrawerPass;
audit.eighthSliceDrawerPass=eighthSliceDrawerPass;
audit.knowledgeCardPass=knowledgeCardPass;
audit.sourceDialogPass=sourceDialogPass;
audit.homeTitlePass=homeTitlePass;
audit.factGridPass=factGridPass;
audit.zhuHoucongLineagePass=zhuHoucongLineagePass;
audit.emperorLineagePass=emperorLineagePass;
audit.pass=home.doors===2&&home.eras===6&&home.figures===4&&JSON.stringify(home.figurePortraits)===JSON.stringify(expectedFigurePortraits)&&home.routes===4&&home.bodyWidth===home.viewport&&homeTitlePass&&people.eventDisplay==='none'&&people.tableDisplay!=='none'&&people.search==='于谦'&&people.first==='于谦'&&people.navActive==='人物馆'&&people.tenureLabels.length>0&&people.tenureLabels.every(x=>!/[（）()]/.test(x))&&personStory.drawer&&personStory.portraitLoaded&&personStory.portraitLabel==='AI想象像'&&personStory.preview===1&&personStory.quickNodes===3&&personStory.enterText==='进入 于谦 的一生'&&personStory.enterHref==='people/yu-qian.html'&&personStory.legacyStory===0&&personStory.bodyWidth===personStory.viewport&&zhuGaochiTenure.includes('1424—1425 · 约8个月')&&zhuChangluoTenure.includes('1620 · 约1个月')&&secondProfile.preview===1&&secondProfile.quickNodes===3&&secondProfile.href==='people/zhang-ju-zheng.html'&&reenactmentPass&&secondSliceDrawerPass&&creativePass&&portraitBatchPass&&portraitBatch2Pass&&portraitBatch3Pass&&portraitBatch4Pass&&immersivePass&&sourceDialogPass&&yangJishengPass&&tangYin.first==='唐寅'&&tangYin.drawer&&tangYin.seal.includes('在野人物')&&tangYin.domains.includes('文学艺术')&&tangYin.tenure.includes('—')&&tangYin.preview===1&&tangYin.quickNodes===3&&tangYin.enterHref==='people/tang-yin.html'&&tangYin.sources>=3&&independentFilter.count===14&&JSON.stringify(independentFilter.categories)===JSON.stringify(['在野人物'])&&domainFilter.count>=1&&domainFilter.names.includes('徐霞客')&&storyCoverage.rows===152&&storyCoverage.markers===storyCoverage.rows&&storyCoverage.statLabel===String(storyCoverage.rows)&&emperorView.emperorCount===1&&emperorView.duplicates.length===0&&events.peopleTableDisplay==='none'&&events.eventDisplay!=='none'&&events.cards===20&&events.activeStage==='s6'&&events.navActive==='事件馆'&&events.bodyWidth===events.viewport&&queryCount===1&&eventDetail.title==='北京保卫战'&&eventDetail.people===4&&eventDetail.sources===3&&eventPeopleFilter.event==='e035'&&eventPeopleFilter.selected==='e035'&&eventPeopleFilter.title==='北京保卫战 · 相关人物'&&eventPeopleFilter.count===4&&JSON.stringify(eventPeopleFilter.names)===JSON.stringify(['于谦','朱祁钰','朱祁镇','石亨'])&&eventPeopleFilter.parent===''&&personRelatedEvents.count>=3&&personRelatedEvents.beijingHref==='events.html?event=e035'&&personRelatedEvents.beijingText.includes('1449')&&personRelatedEvents.beijingText.includes('北京保卫战')&&directEvent.event==='e035'&&directEvent.title==='北京保卫战'&&directEvent.drawerOpen&&crossHall.person==='于谦'&&crossHall.search==='于谦'&&crossHall.first==='于谦'&&mobile.bodyWidth===mobile.viewport&&mobile.doorColumns===1&&mobile.eraColumns===1&&mobileProfile.pathname.endsWith('/people/yu-qian.html')&&mobileProfile.h1==='于谦'&&!mobileProfile.drawer&&mobileProfile.chapters===3&&mobileProfile.bodyWidth===mobileProfile.viewport&&mobileProfile.heroColumns===1&&mobileSourceDialog.open&&mobileSourceDialog.dialogWidth<=mobileSourceDialog.viewport&&mobileSourceDialog.readingColumns===1&&mobileSourceDialog.bodyWidth===mobileSourceDialog.viewport&&mobileStory.bodyWidth===mobileStory.viewport&&mobileStory.reenactmentColumns===1&&mobileStory.visible&&mobileStory.genericCamera===0&&mobileCreative.bodyWidth===mobileCreative.viewport&&mobileCreative.columns===1&&mobileCreative.imageLoaded&&mobileCreative.quoteLines===2&&errors.length===0;
audit.pass=audit.pass&&portraitBatch5Pass;
audit.pass=audit.pass&&portraitBatch6Pass;
audit.pass=audit.pass&&portraitBatch7Pass;
audit.pass=audit.pass&&portraitBatch8Pass;
audit.pass=audit.pass&&portraitBatch9Pass;
audit.pass=audit.pass&&portraitBatch13Pass;
audit.pass=audit.pass&&portraitBatch14Pass;
audit.pass=audit.pass&&portraitBatch15Pass;
audit.pass=audit.pass&&portraitBatch16Pass;
audit.pass=audit.pass&&factGridPass;
audit.pass=audit.pass&&thirdSliceDrawerPass;
audit.pass=audit.pass&&fourthSliceDrawerPass;
audit.pass=audit.pass&&wangYangmingThoughtPass;
audit.pass=audit.pass&&mobileWangYangmingPage.h1==='王守仁'&&mobileWangYangmingPage.chapters===5&&mobileWangYangmingPage.thoughtColumns===1&&mobileWangYangmingPage.afterlifeColumns===1&&mobileWangYangmingPage.sourceTriggers===5&&mobileWangYangmingPage.bodyWidth===mobileWangYangmingPage.viewport;
audit.pass=audit.pass&&mobileZhuYuanzhangPage.h1==='朱元璋'&&mobileZhuYuanzhangPage.chapters===6&&mobileZhuYuanzhangPage.stateColumns===1&&mobileZhuYuanzhangPage.stateCosts===6&&mobileZhuYuanzhangPage.sourceTriggers===6&&mobileZhuYuanzhangPage.bodyWidth===mobileZhuYuanzhangPage.viewport;
audit.pass=audit.pass&&mobileZhuDiPage.h1==='朱棣'&&mobileZhuDiPage.chapters===6&&mobileZhuDiPage.reachColumns===1&&mobileZhuDiPage.reachItems===6&&mobileZhuDiPage.sourceTriggers===6&&mobileZhuDiPage.bodyWidth===mobileZhuDiPage.viewport;
audit.pass=audit.pass&&mobileBatch2Pages.length===5&&mobileBatch2Pages.every((item,index)=>{
  const spec=personPageSpecs.slice(-5)[index];
  return item.pathname.endsWith('/people/'+spec.slug+'.html')&&item.h1===spec.name&&item.chapters===spec.chapters&&item.featureColumns===1&&item.sourceTriggers===spec.sourceTriggers&&item.bodyWidth===item.viewport;
});
audit.pass=audit.pass&&fifthSliceDrawerPass;
audit.pass=audit.pass&&sixthSliceDrawerPass;
audit.pass=audit.pass&&innerCourtCardPass;
audit.pass=audit.pass&&innerCourtPortraitPass;
audit.pass=audit.pass&&seventhSliceDrawerPass;
audit.pass=audit.pass&&knowledgeCardPass;
audit.pass=audit.pass&&eighthSliceDrawerPass;
audit.pass=audit.pass&&zhuHoucongLineagePass;
audit.pass=audit.pass&&emperorLineagePass;
console.log(JSON.stringify(audit,null,2));
await browser.close();
if(!audit.pass)process.exit(1);
