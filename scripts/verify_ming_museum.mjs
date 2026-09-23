import {chromium} from 'playwright';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const canonicalName=value=>String(value||'').replaceAll('熾','炽').replaceAll('鎮','镇').replaceAll('鈺','钰').replaceAll('見','见').replaceAll('載','载').replaceAll('鈞','钧').replaceAll('檢','检').replace(/\s+/g,'');
const [sourceCore, sourceImportantChildren]=await Promise.all([
  fs.readFile('data/ming_core.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_children_important.json','utf8').then(JSON.parse),
]);
const expectedFormalRosterCount=new Set([
  ...sourceCore.map(person=>canonicalName(person.name)),
  ...sourceImportantChildren.map(person=>canonicalName(person.name||person.title)),
]).size;
const server=http.createServer(async(request,response)=>{
  let file;
  let body;
  try{
    const pathname=decodeURIComponent(new URL(request.url||'/', 'http://127.0.0.1').pathname);
    file=path.resolve(root, `.${pathname==='/'?'/index.html':pathname}`);
    if(file!==root&&!file.startsWith(`${root}${path.sep}`))throw new Error('invalid path');
    body=await fs.readFile(file);
  }catch{response.writeHead(404).end('Not found');return}
  const type={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(file).toLowerCase()]||'application/octet-stream';
  response.writeHead(200,{'content-type':type}).end(body);
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const url=file=>`http://127.0.0.1:${server.address().port}/${file}`;
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
  scope:document.querySelector('.footer span')?.textContent.replace(/\s+/g,' ').trim()||'',
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
  peopleView:document.body.dataset.peopleView,
  eventDisplay:getComputedStyle(document.querySelector('.eventlab')).display,
  timelineDisplay:getComputedStyle(document.querySelector('#peopleTimelineView')).display,
  tableDisplay:getComputedStyle(document.querySelector('.tablewrap')).display,
  totalRows:document.querySelectorAll('[data-timeline-person]').length,
  visibleRows:document.querySelectorAll('#rows tr[data-id]').length,
  search:document.querySelector('#search').value,
  first:document.querySelector('#rows .name')?.textContent.trim(),
  navActive:document.querySelector('.museum-links a.active')?.textContent.trim(),
  scope:document.querySelector('.people-scope-footer .scope')?.textContent.replace(/\s+/g,' ').trim()||'',
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
    scoreSummaryLast:document.querySelector('#detail .facts')?.lastElementChild?.classList.contains('score-summary')||false,
    scoreItems:document.querySelectorAll('#detail .facts>.score-summary .score-summary-item').length,
    scoreSummaryText:document.querySelector('#detail .facts>.score-summary')?.textContent.trim()||'',
    totalScoreLabel:document.querySelector('#detail .score-summary-total span')?.textContent.trim()||'',
    totalScoreValue:document.querySelector('#detail .score-summary-total b')?.textContent.trim()||'',
    legacyScoreGrid:document.querySelectorAll('#detail>.score-grid').length,
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
const zhuGaochiTenure=await page.evaluate(()=>document.querySelector('#detail .founder-tenure')?.textContent.trim()||'');
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('朱常洛'));
const zhuChangluoTenure=await page.evaluate(()=>document.querySelector('#detail .founder-tenure')?.textContent.trim()||'');
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('朱厚熜'));
const zhuHoucongLineage=await page.evaluate(()=>({
  text:document.querySelector('#detail .founder-royal-relations')?.textContent.trim()||'',
  entries:document.querySelectorAll('#detail .founder-royal-column').length,
  rich:document.querySelectorAll('#detail .facts-founder').length===1,
  scoreSummaryLast:document.querySelectorAll('#detail .profile-score-section .score-summary').length===1,
  scoreItems:document.querySelectorAll('#detail .profile-score-section .score-summary-item').length,
  source:[...document.querySelectorAll('#detail .sources a')].some(a=>a.href.includes('%E6%98%8E%E5%8F%B2/%E5%8D%B717')||a.href.includes('明史/卷17'))
}));
await page.locator('#detail .founder-royal-relations').screenshot({path:path.join(root,'人物档案_朱厚熜_帝系关系_预览.png')});
await page.locator('#close').click();
const emperorLineageSamples=[];
for(const name of ['朱元璋','朱允炆','朱棣','朱高炽','朱瞻基','朱祁镇','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校','朱由检']){
  await page.evaluate(personName=>focusPerson(personName),name);
  emperorLineageSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
    lineageCards:document.querySelectorAll('#detail .lineage-fact.rich').length,
    entries:document.querySelectorAll('#detail .lineage-list b').length,
    founderCards:document.querySelectorAll('#detail .founder-royal-relations').length,
    founderColumns:document.querySelectorAll('#detail .founder-royal-column').length,
    governanceItems:document.querySelectorAll('#detail .founder-governance-item').length,
    text:(document.querySelector('#detail .founder-royal-relations')||document.querySelector('#detail .lineage-fact'))?.textContent.trim()||'',
    confidence:(document.querySelector('#detail .founder-royal-relations>span')||document.querySelector('#detail .lineage-fact>span'))?.textContent.trim()||'',
    succession:document.querySelector('#detail .lineage-list .succession')?.textContent.trim()||'',
    boundary:document.querySelector('#detail .founder-basic-notes')?.textContent.trim()||'',
    sourceLinks:document.querySelectorAll('#detail .sources a').length
  }),name));
  if(['朱元璋','朱允炆','朱祁镇'].includes(name)){
    await page.locator('#detail .founder-royal-relations').screenshot({path:path.join(root,`人物档案_${name}_帝系关系_预览.png`)});
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
    genericStory:document.querySelectorAll('#detail .life-hook-generic').length,
    lifeChapters:document.querySelectorAll('#detail .life-chapter').length,
    lifeStoryText:[...document.querySelectorAll('#detail .life-hook,#detail .life-arc,#detail .life-chapter,#detail .interpretation')].map(node=>node.textContent.trim()).join(' '),
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
    genericStory:document.querySelectorAll('#detail .life-hook-generic').length,
    lifeChapters:document.querySelectorAll('#detail .life-chapter').length,
    lifeStoryText:[...document.querySelectorAll('#detail .life-hook,#detail .life-arc,#detail .life-chapter,#detail .interpretation')].map(node=>node.textContent.trim()).join(' '),
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
  }),name));
  if(name==='朱由检'){
    await page.locator('#detail .profile-preview').scrollIntoViewIfNeeded();
    await page.locator('#detail .profile-preview').screenshot({path:path.join(root,'人物档案_朱由检_人物速览_第二批预览.png')});
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
    await page.locator('#detail .profile-preview').scrollIntoViewIfNeeded();
    await page.locator('#detail .profile-preview').screenshot({path:path.join(root,'人物档案_朱祁钰_人物速览_第三批预览.png')});
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
    genericStory:document.querySelectorAll('#detail .life-hook-generic').length,
    lifeChapters:document.querySelectorAll('#detail .life-chapter').length,
    lifeStoryText:[...document.querySelectorAll('#detail .life-hook,#detail .life-arc,#detail .life-chapter,#detail .interpretation')].map(node=>node.textContent.trim()).join(' '),
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
  }),name));
  if(name==='徐达'){
    await page.locator('#detail .history-slice').scrollIntoViewIfNeeded();
    await page.locator('#detail .history-slice').screenshot({path:path.join(root,'人物档案_徐达_历史切片_第四批预览.png')});
  }
  await page.locator('#close').click();
}
const genericStorySamples=[];
for(const name of ['黄道周','魏忠贤','宁国公主']){
  await page.evaluate(personName=>focusPerson(personName),name);
  genericStorySamples.push(await page.evaluate(personName=>({
    name:personName,
    hook:document.querySelector('#detail .life-hook')?.textContent.trim()||'',
    arc:document.querySelector('#detail .life-arc')?.textContent.trim()||'',
    foundation:document.querySelectorAll('#detail .life-story-foundation').length,
    foundationChapters:document.querySelectorAll('#detail .life-story-foundation .life-chapter').length,
    foundationBoundary:document.querySelector('#detail .life-story-boundary')?.textContent.trim()||'',
    genericBoilerplate:document.querySelector('#detail')?.textContent.includes('留下的，不只是一条履历。')||false,
    sliceTypography:personName==='黄道周'?Object.fromEntries([
      ['label','#detail .history-slice-ledger b'],
      ['body','#detail .history-slice-ledger p'],
      ['knowledge','#detail .knowledge-split p'],
      ['action','#detail .history-slice-action p'],
      ['boundary','#detail .history-slice-boundary']
    ].map(([key,selector])=>[key,parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)])):null
  }),name));
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
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length,
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
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
    category:document.querySelector('#detail .seal')?.textContent.trim()||'',
    office:document.querySelector('#detail .person-identity b')?.textContent.trim()||'',
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
  await page.waitForFunction(personName => (
    document.querySelector('#detail h2')?.textContent.trim() === personName
    && document.querySelectorAll('#detail .history-slice').length === 1
  ), name);
  seventhSliceDrawerSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    coordinate:document.querySelector('#detail .history-slice-coord')?.textContent.trim()||'',
    title:document.querySelector('#detail .history-slice h5')?.textContent.trim()||'',
    knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
    action:document.querySelectorAll('#detail .history-slice-action').length,
    consequence:document.querySelectorAll('#detail .history-slice-consequence').length,
    boundary:document.querySelectorAll('#detail .history-slice-boundary').length,
    genericCamera:document.querySelectorAll('#detail .story-reenactment').length,
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
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
    category:document.querySelector('#detail .seal')?.textContent.trim()||'',
    office:document.querySelector('#detail .person-identity b')?.textContent.trim()||'',
    sources:document.querySelectorAll('#detail .sources a').length,
    historicalSlice:document.querySelectorAll('#detail .history-slice').length,
    genericCamera:document.querySelectorAll('#detail .story-reenactment').length,
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
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
await page.locator('button[data-people-view="table"]').click();
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
    const panel=document.querySelector('.panel');
    const reading=museum.querySelector('.work-reading-block p');
    const readingStyle=reading?getComputedStyle(reading):null;
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
      textConfidence:museum.querySelector('.work-text-note')?.textContent.includes('中置信度')||false,
      labelCount:museum.querySelectorAll('.museum-work-label').length,
      metaListCount:museum.querySelectorAll('.work-meta-list').length,
      readingCount:museum.querySelectorAll('.work-reading-block').length,
      sourceButtons:museum.querySelectorAll('.art-source').length,
      viewNote:museum.querySelector('.work-view-note')?.textContent.trim()||'',
      panelOverflow:Boolean(panel&&panel.scrollWidth>panel.clientWidth),
      imageFits:images.every(image=>{const shell=image.closest('.art-image-shell');if(!shell)return true;const imageRect=image.getBoundingClientRect();const shellRect=shell.getBoundingClientRect();return imageRect.width<=shellRect.width&&imageRect.height<=shellRect.height}),
      readingFontSize:readingStyle?Number.parseFloat(readingStyle.fontSize):0,
      readingLineHeight:readingStyle?Number.parseFloat(readingStyle.lineHeight):0
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
    tenure:document.querySelector('#detail .person-period')?.textContent.trim()||'',
    preview:document.querySelectorAll('#detail .profile-preview').length,
    enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||'',
    chapters:document.querySelectorAll('#detail .life-chapter').length,
    workVoices:document.querySelectorAll('#detail .work-voice').length,
    quoteLines:document.querySelectorAll('#detail .work-voice blockquote div').length,
    factLayers:document.querySelectorAll('#detail .life-chapter .layer-fact').length,
    imaginationLayers:document.querySelectorAll('#detail .imagined-moment .layer-imagination').length,
    sourceLinks:document.querySelectorAll('#detail .sources a').length
  };
});
await page.locator('#detail .detail-title').screenshot({path:path.join(root,'人物档案_杨继盛_画像来源标识_预览.png')});
if(await page.locator('#detail .work-voice').count()){
  await page.locator('#detail .work-voice').scrollIntoViewIfNeeded();
  await page.locator('#detail .work-voice').screenshot({path:path.join(root,'人物档案_杨继盛_临刑诗_预览.png')});
}
await page.locator('#close').click();
await page.goto(url('people.html?person='+encodeURIComponent('唐寅')),{waitUntil:'networkidle'});
const tangYin=await page.evaluate(()=>({
  first:document.querySelector('#rows .name')?.textContent.trim(),
  drawer:document.querySelector('#drawer')?.classList.contains('open'),
  seal:document.querySelector('#detail .seal')?.textContent.trim(),
  domains:[...document.querySelectorAll('#detail .domain-tag')].map(x=>x.textContent.trim()),
  tenure:document.querySelector('#detail .person-period')?.textContent.trim(),
  lifeFact:[...document.querySelectorAll('#detail .facts>.fact')].find(node=>node.querySelector('span')?.textContent.trim()==='生卒 / 寿命')?.textContent.trim()||'',
  preview:document.querySelectorAll('#detail .profile-preview').length,
  quickNodes:document.querySelectorAll('#detail .profile-quick-node').length,
  enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href'),
  sources:document.querySelectorAll('#detail .sources a').length
}));
await page.locator('#close').click();
const personPageSpecs=[
  {name:'朱元璋',slug:'zhu-yuan-zhang',theme:'founder',chapters:6,featureItems:6,artCards:0,work:true,minSources:7,sourceTriggers:6,state:true},
  {name:'朱棣',slug:'zhu-di',theme:'expedition',chapters:6,featureItems:6,artCards:0,work:true,minSources:8,sourceTriggers:6,reach:true},
  {name:'于谦',slug:'yu-qian',theme:'crisis',chapters:6,featureItems:6,artCards:0,work:true,minSources:6,sourceTriggers:6,clear:true},
  {name:'张居正',slug:'zhang-ju-zheng',theme:'system',chapters:6,featureItems:4,artCards:0,work:false,minSources:4,sourceTriggers:6,clear:true},
  {name:'唐寅',slug:'tang-yin',theme:'artist',chapters:6,featureItems:0,artCards:4,work:false,minSources:7,sourceTriggers:6,clear:true},
  {name:'戚继光',slug:'qi-ji-guang',theme:'military',chapters:6,featureItems:8,artCards:0,work:true,minSources:8,sourceTriggers:6,clear:true},
  {name:'王守仁',slug:'wang-shou-ren',theme:'mind',chapters:5,featureItems:4,artCards:0,work:true,minSources:6,sourceTriggers:5,thought:true,clear:true},
  {name:'郑和',slug:'zheng-he',theme:'ocean',chapters:6,featureItems:6,artCards:0,work:false,minSources:5,sourceTriggers:6,clear:true},
  {name:'李时珍',slug:'li-shi-zhen',theme:'materia',chapters:6,featureItems:5,artCards:0,work:true,minSources:8,sourceTriggers:6,clear:true},
  {name:'徐光启',slug:'xu-guang-qi',theme:'translation',chapters:6,featureItems:5,artCards:0,work:true,minSources:5,sourceTriggers:6,clear:true},
  {name:'朱翊钧',slug:'zhu-yi-jun',theme:'reign',chapters:5,featureItems:6,artCards:0,work:false,minSources:5,sourceTriggers:5},
  {name:'李自成',slug:'li-zi-cheng',theme:'uprising',chapters:4,featureItems:0,artCards:0,work:false,minSources:2,sourceTriggers:4,clear:true,portrait:false},
  {name:'秦良玉',slug:'qin-liang-yu',theme:'military',chapters:6,featureItems:5,artCards:0,work:false,minSources:6,sourceTriggers:6,clear:true}
];
const immersivePages=[];
let sourceDialogAudit=null;
const sourceProviderAudit={};
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
    sourceNotes:document.querySelectorAll('.chapter-source-note').length,
    interpretationBoundaries:document.querySelectorAll('.chapter-interpretation-boundary').length,
    reignYears:document.querySelectorAll('.chapter-reign').length,
    protocols:document.querySelectorAll('.protocol>div').length,
    historicalSlice:document.querySelectorAll('.history-slice').length,
    sliceCoordinate:document.querySelector('.history-slice-coord')?.textContent.trim()||'',
    sliceKnownUnknown:document.querySelectorAll('.history-slice .knowledge-split article').length,
    sliceAction:document.querySelectorAll('.history-slice-action').length,
    sliceConsequence:document.querySelectorAll('.history-slice-consequence').length,
    sliceBoundary:document.querySelectorAll('.history-slice-boundary').length,
    featureItems:document.querySelectorAll('.feature-item,.decision-step,.training-part').length,
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
  if(batch2Feature&&await page.locator('.feature-'+batch2Feature).count()){
    await page.screenshot({path:path.join(root,'人物独立页_'+spec.name+'_首屏预览.png'),fullPage:false});
    await page.locator('.feature-'+batch2Feature).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.locator('.feature-'+batch2Feature).screenshot({path:path.join(root,'人物独立页_'+spec.name+'_专题模块预览.png')});
  }
  if(spec.name==='于谦'){
    const triggers=page.locator('.source-trigger');
    await triggers.nth(3).click();
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
      provider:document.querySelector('#sourceDialogConfidence')?.textContent.trim(),
      fullTextHref:document.querySelector('#sourceDialogLink')?.getAttribute('href'),
      closeFocused:document.activeElement?.id==='sourceDialogClose',
      bodyLocked:document.body.classList.contains('dialog-open')
    }));
    await page.screenshot({path:path.join(root,'人物独立页_于谦_明史原文弹窗_桌面预览.png'),fullPage:false});
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    sourceDialogAudit.closedByEscape=await page.evaluate(()=>!document.querySelector('#primarySourceDialog').open&&!document.body.classList.contains('dialog-open'));
    await triggers.nth(2).click();
    sourceProviderAudit.shidian=(await page.locator('#sourceDialogConfidence').textContent())?.trim()||'';
    await page.locator('#sourceDialogClose').click();
  }
  if(spec.name==='唐寅'){
    await page.locator('.source-trigger').nth(5).click();
    sourceProviderAudit.dpm=(await page.locator('#sourceDialogConfidence').textContent())?.trim()||'';
    await page.locator('#sourceDialogClose').click();
  }
  await page.screenshot({path:path.join(root,'人物独立页_'+spec.name+'_桌面预览.png'),fullPage:false});
}
await page.goto(url('people.html'),{waitUntil:'networkidle'});
await page.locator('button[data-people-view="table"]').click();
await page.locator('#reset').click();
await page.locator('.chip[data-cat="在野人物"]').click();
const independentFilter=await page.evaluate(()=>({
  count:document.querySelectorAll('#rows tr[data-id]').length,
  categories:[...new Set([...document.querySelectorAll('#rows .badge')].map(x=>x.textContent.trim()))]
}));
await page.locator('#reset').click();
const externalChip=page.locator('.chip[data-cat="域外人物"]');
const externalChipExists=await externalChip.count()===1;
if(externalChipExists)await externalChip.click();
const externalFilter=await page.evaluate(()=>({
  count:document.querySelectorAll('#rows tr[data-id]').length,
  names:[...document.querySelectorAll('#rows .name')].map(x=>x.textContent.trim()),
  categories:[...new Set([...document.querySelectorAll('#rows .badge')].map(x=>x.textContent.trim()))],
  stat:[...document.querySelectorAll('.stat')].find(x=>x.querySelector('span')?.textContent.trim()==='域外人物')?.querySelector('strong')?.textContent.trim()||''
}));
await page.locator('#reset').click();
const addedPersonCards=[];
for(const spec of [
  {name:'宋礼',category:'文臣'},
  {name:'潘季驯',category:'文臣'},
  {name:'李舜臣',category:'域外人物'},
  {name:'丰臣秀吉',category:'域外人物'},
  {name:'多尔衮',category:'政权人物'}
]){
  await page.evaluate(name=>focusPerson(name),spec.name);
  await page.waitForTimeout(50);
  addedPersonCards.push(await page.evaluate(async spec=>{
    const image=document.querySelector('#detail .detail-title .portrait img');
    if(image&&!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})});
    return {
      name:spec.name,
      expectedCategory:spec.category,
      drawer:document.querySelector('#drawer')?.classList.contains('open')||false,
      drawerName:document.querySelector('#detail h2')?.textContent.trim()||'',
      category:document.querySelector('#detail .seal')?.textContent.split('·')[0].trim()||'',
      office:document.querySelector('#detail .person-identity b')?.textContent.trim()||'',
      historicalSlice:document.querySelectorAll('#detail .history-slice').length,
      knownUnknown:document.querySelectorAll('#detail .knowledge-split article').length,
      sourceLinks:document.querySelectorAll('#detail .sources a').length,
      relatedEvents:document.querySelectorAll('#detail .related-events a').length,
      portraitLoaded:Boolean(image?.naturalWidth),
      portraitLabel:document.querySelector('#detail .detail-title .portrait-label')?.textContent.trim()||'',
      portraitNote:document.querySelector('#detail .portrait-note')?.textContent.trim()||'',
      portraitFallback:Boolean(document.querySelector('#detail .detail-title .portrait-fallback'))
    };
  },spec));
  if(await page.locator('#drawer.open').count())await page.locator('#close').click();
}
await page.locator('#reset').click();
const institutionSelect=page.locator('#institution');
const institutionSelectExists=await institutionSelect.count()===1;
const institutionOptions=institutionSelectExists?await institutionSelect.locator('option').evaluateAll(options=>options.map(option=>option.value).filter(Boolean)):[];
const institutionGroups=institutionSelectExists?await institutionSelect.locator('optgroup').evaluateAll(groups=>groups.map(group=>({label:group.label,options:[...group.querySelectorAll('option')].map(option=>option.value)}))):[];
const rosterColumnCount=await page.locator('.roster thead th').count();
const rosterColumnLayout=await page.evaluate(()=>{
  const headers=[...document.querySelectorAll('.roster thead th')].map(node=>node.textContent.trim());
  const emperorRow=[...document.querySelectorAll('#rows tr[data-id]')].find(row=>row.querySelector('.name')?.textContent.trim()==='朱元璋');
  const cells=[...(emperorRow?.children||[])].map(node=>node.textContent.trim());
  const scoreHeaders=headers.slice(6,12).map(header=>header.replace(/(30|20|10)%|\s|权重|百分制/g,''));
  const scoreCells=[...(emperorRow?.children||[])].slice(6,12);
  return {
    headers,
    scoreHeaders,
    scoreCellKinds:scoreCells.map(cell=>cell.querySelector('.score')?'总分':cell.querySelector('.metric')?'细分':'未知'),
    totalScoreText:scoreCells[0]?.textContent.trim()||'',
    penultimateHeader:headers.at(-2)||'',
    lastHeader:headers.at(-1)||'',
    penultimateCell:cells.at(-2)||'',
    lastCell:cells.at(-1)||''
  };
});
const institutionFilters=[];
if(institutionSelectExists){
  for(const institution of ['内阁','都察院','吏部','户部','礼部','兵部','刑部','工部','司礼监','锦衣卫','东厂','西厂']){
    await institutionSelect.selectOption(institution);
    institutionFilters.push(await page.evaluate(institution=>({
      institution,
      selected:document.querySelector('#institution')?.value||'',
      count:document.querySelectorAll('#rows tr[data-id]').length,
      names:[...document.querySelectorAll('#rows .name')].map(node=>node.textContent.trim())
    }),institution));
  }
  await page.locator('#reset').click();
}
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
  statLabel:[...document.querySelectorAll('.stat')].find(x=>x.querySelector('span')?.textContent.trim()==='不重复人物')?.querySelector('strong')?.textContent.trim()||'',
  independentPageStat:[...document.querySelectorAll('.stat')].find(x=>x.querySelector('span')?.textContent.trim()==='独立页面人物')?.querySelector('strong')?.textContent.trim()||''
}));
await page.locator('.emperor').first().click();
await page.waitForTimeout(700);
const emperorView=await page.evaluate(()=>{
  const rows=[...document.querySelectorAll('#rows tr[data-id]')].map(x=>({name:x.querySelector('.name')?.textContent.trim(),category:x.querySelector('.badge')?.textContent.trim()}));
  const names=rows.map(x=>x.name);
  return {
    first:rows[0],
    emperorCount:rows.filter(x=>x.category==='皇帝').length,
    duplicates:[...new Set(names.filter((n,i)=>names.indexOf(n)!==i))],
    timelineTop:Math.round(document.querySelector('.timeline').getBoundingClientRect().top),
    navBottom:Math.round(document.querySelector('.museum-nav').getBoundingClientRect().bottom),
    labels:[...document.querySelectorAll('.emperor span')].map(x=>x.textContent.trim())
  };
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
  scope:document.querySelector('.events-scope-footer .scope')?.textContent.replace(/\s+/g,' ').trim()||'',
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
await page.goto(url('events.html?q='+encodeURIComponent('北京保卫战')),{waitUntil:'networkidle'});
const queryCount=await page.locator('.eventcard').count();
await page.locator('.eventcard').first().click();
await page.waitForSelector('#detail .personjump', {state:'attached'});
await page.waitForSelector('#detail .sources a', {state:'attached'});
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
  loadedDetailIds:[...document.querySelectorAll('#rows tr[data-id]')].map(row=>row.dataset.detailId||''),
  duplicateEmperorSelects:document.querySelectorAll('#parent').length
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

await page.goto(url('events.html?event=e033'),{waitUntil:'networkidle'});
const tumuEventImpact=await page.evaluate(()=>({
  title:document.querySelector('#detail h2')?.textContent.trim()||'',
  compact:document.querySelector('[data-impact-compact]')?.dataset.impactCompact||'',
  nodes:[...document.querySelectorAll('[data-impact-compact] [data-impact-node]')].map(node=>node.dataset.impactNode).sort(),
  fullHref:document.querySelector('[data-impact-full-link]')?.getAttribute('href')||'',
  arrows:[...document.querySelectorAll('[data-impact-compact] marker')].map(marker=>[marker.getAttribute('markerWidth'),marker.getAttribute('markerHeight')]),
  overflow:document.body.scrollWidth-innerWidth
}));
await page.goto(url('events.html?event=e035'),{waitUntil:'networkidle'});
const unrelatedImpactCount=await page.locator('[data-impact-compact]').count();

await page.goto(url('events.html'),{waitUntil:'networkidle'});
await page.screenshot({path:path.join(root,'事件馆_预览.png'),fullPage:false});
await page.setViewportSize({width:390,height:844});
await page.goto(url('index.html'),{waitUntil:'networkidle'});
const mobile=await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,viewport:innerWidth,doorColumns:getComputedStyle(document.querySelector('.doors')).gridTemplateColumns.split(' ').length,eraColumns:getComputedStyle(document.querySelector('.eras')).gridTemplateColumns.split(' ').length,navHeight:document.querySelector('.museum-nav').getBoundingClientRect().height}));
await page.goto(url('events.html?event=e033'),{waitUntil:'networkidle'});
await page.locator('[data-impact-compact]').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const mobileTumuEventImpact=await page.evaluate(async()=>{
  const images=[...document.querySelectorAll('[data-impact-compact] image')];
  const loaded=await Promise.all(images.map(image=>new Promise(resolve=>{
    const probe=new Image();
    probe.onload=()=>resolve(Boolean(probe.naturalWidth));
    probe.onerror=()=>resolve(false);
    probe.src=image.href.baseVal;
  })));
  return {
    compact:document.querySelector('[data-impact-compact]')?.dataset.impactCompact||'',
    nodes:document.querySelectorAll('[data-impact-compact] [data-impact-node]').length,
    loadedImages:loaded.filter(Boolean).length,
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth
  };
});
await page.locator('[data-impact-compact]').screenshot({path:path.join(root,'事件馆_土木堡之变人物作用图_移动端预览.png')});
await page.goto(url('exhibit-tumu-crisis.html'),{waitUntil:'networkidle'});
await page.locator('#people-impact-graph').scrollIntoViewIfNeeded();
await page.locator('[data-impact-stage="restoration"]').click();
await page.waitForTimeout(200);
const mobileTumuImpact=await page.evaluate(()=>({
  active:document.querySelector('[data-impact-stage][aria-selected="true"]')?.dataset.impactStage||'',
  visible:document.querySelector('[data-impact-panel]:not([hidden])')?.dataset.impactPanel||'',
  nodes:document.querySelectorAll('[data-impact-panel]:not([hidden]) [data-impact-node]').length,
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
await page.locator('#people-impact-graph').screenshot({path:path.join(root,'专题展_土木堡人物作用图_移动端预览.png')});
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
await page.goto(url('people/tang-yin.html'),{waitUntil:'networkidle'});
await page.waitForSelector('.history-slice-grid');
const mobileStory=await page.evaluate(()=>({
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth,
  reenactmentColumns:getComputedStyle(document.querySelector('.history-slice-grid')).gridTemplateColumns.split(' ').length,
  visible:Boolean(document.querySelector('.history-slice')),
  genericCamera:document.querySelectorAll('.story-reenactment').length
}));
await page.locator('.history-slice').scrollIntoViewIfNeeded();
await page.screenshot({path:path.join(root,'人物档案_历史切片_移动端预览.png'),fullPage:false});
await page.goto(url('people.html?person='+encodeURIComponent('徐渭')),{waitUntil:'networkidle'});
await page.waitForURL(u=>u.pathname.endsWith('/people/xu-wei.html'));
await page.locator('.gallery .art-grid').scrollIntoViewIfNeeded();
const mobileCreative=await page.evaluate(async()=>{
  const gallery=document.querySelector('.gallery');
  const grid=gallery?.querySelector('.art-grid');
  const images=[...(gallery?.querySelectorAll('.art-card img')||[])];
  await Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})})));
  return {
    pathname:location.pathname,
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth,
    columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
    works:gallery?.querySelectorAll('.art-card').length||0,
    imagesLoaded:images.every(image=>image.naturalWidth>0),
    imagesContained:images.every(image=>getComputedStyle(image).objectFit==='contain'),
    openButtons:gallery?.querySelectorAll('[data-artwork-open]').length||0
  };
});
await page.locator('.gallery .art-grid').screenshot({path:path.join(root,'人物独立页_徐渭_作品现场_移动端预览.png')});
await page.goto(url('people.html'),{waitUntil:'networkidle'});
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
for(const spec of personPageSpecs.slice(-6)){
  await page.goto(url('people.html'),{waitUntil:'networkidle'});
  await Promise.all([
    page.waitForURL(new RegExp('people/'+spec.slug+'\\.html$')),
    page.evaluate(personName=>focusPerson(personName),spec.name)
  ]);
  mobileBatch2Pages.push(await page.evaluate(spec=>{
    const featureGrid=document.querySelector('.feature-grid');
    return {
      name:spec.name,
      pathname:location.pathname,
      h1:document.querySelector('h1')?.childNodes[0]?.textContent.trim()||'',
      chapters:document.querySelectorAll('.chapter').length,
      featureColumns:featureGrid?getComputedStyle(featureGrid).gridTemplateColumns.split(' ').length:0,
      sourceTriggers:document.querySelectorAll('.source-trigger').length,
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    };
  },spec));
}

const exhibitionSource=JSON.parse(await fs.readFile('data/ming_exhibitions.json','utf8')).exhibitions;
const impactGraphSource=JSON.parse(await fs.readFile('data/ming_people_impact_graphs.json','utf8'));
const tumuImpact=impactGraphSource.graphs.find(graph=>graph.id==='tumu-crisis');
const impactGraphDataPass=Boolean(
  tumuImpact&&
  tumuImpact.exhibitionId==='tumu-crisis'&&
  tumuImpact.eventId==='e033'&&
  JSON.stringify(tumuImpact.stages.map(stage=>stage.id))===JSON.stringify(['defeat','beijing','restoration'])&&
  tumuImpact.stages.every(stage=>stage.nodes.length>=3&&stage.edges.length>=2)&&
  tumuImpact.stages.flatMap(stage=>stage.edges).every(edge=>
    ['support','conflict','status'].includes(edge.type)&&
    ['高','中','低','未知'].includes(edge.confidence)&&
    edge.sourceIds.length>=1
  )
);
const portraitSource=JSON.parse(await fs.readFile('data/ming_portraits.json','utf8')).people;
const storytellingSource=JSON.parse(await fs.readFile('data/ming_storytelling.json','utf8')).people;
const exhibitionPortraitChecks=[];
for(const exhibit of exhibitionSource){
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(url(`exhibit-${exhibit.id}.html`),{waitUntil:'networkidle'});
  const rendered=await page.evaluate(async()=>{
    const cards=[...document.querySelectorAll('.person-card')];
    await Promise.all(cards.map(card=>{
      const image=card.querySelector('img');
      if(!image||image.complete)return Promise.resolve();
      return new Promise(resolve=>{
        image.addEventListener('load',resolve,{once:true});
        image.addEventListener('error',resolve,{once:true});
      });
    }));
    return cards.map(card=>({
      name:card.querySelector('b')?.textContent.trim()||'',
      linked:card.tagName==='A'&&card.getAttribute('href')?.startsWith('people.html?person='),
      image:Boolean(card.querySelector('img')),
      loaded:Boolean(card.querySelector('img')?.naturalWidth),
      fallback:Boolean(card.querySelector('.person-glyph')),
      label:card.querySelector('.person-art-label')?.textContent.trim()||'',
      src:card.querySelector('img')?.getAttribute('src')||''
    }));
  });
  const renderedByName=Object.fromEntries(rendered.map(item=>[item.name,item]));
  for(const person of exhibit.people){
    const registry=portraitSource[person.name];
    const registeredFile=['image','imagined'].includes(registry?.status)&&registry?.file?registry.file:'';
    const storytellingFile=storytellingSource[person.name]?.portrait||'';
    const expectedSrc=registeredFile||storytellingFile;
    exhibitionPortraitChecks.push({
      exhibit:exhibit.id,
      name:person.name,
      expectedSrc,
      expectedLabel:registry?.status==='imagined'||(!registeredFile&&storytellingFile)?'AI想象像':'',
      ...renderedByName[person.name]
    });
  }
}

await page.setViewportSize({width:1440,height:1000});
await page.goto(url('exhibit-tumu-crisis.html'),{waitUntil:'networkidle'});
const impactSnapshot=()=>page.evaluate(()=>{
  const panel=document.querySelector('[data-impact-panel]:not([hidden])');
  const geometry=[...(panel?.querySelectorAll('[data-impact-edge]')||[])].map(line=>{
    const [from,to]=line.dataset.impactEdge.split('|');
    const fromRing=panel.querySelector(`[data-impact-node="${from}"] [data-impact-ring]`);
    const toRing=panel.querySelector(`[data-impact-node="${to}"] [data-impact-ring]`);
    const x1=Number(line.getAttribute('x1')),y1=Number(line.getAttribute('y1'));
    const x2=Number(line.getAttribute('x2')),y2=Number(line.getAttribute('y2'));
    return {
      from,to,
      startRadius:Math.hypot(x1-Number(fromRing?.getAttribute('cx')),y1-Number(fromRing?.getAttribute('cy'))),
      endRadius:Math.hypot(x2-Number(toRing?.getAttribute('cx')),y2-Number(toRing?.getAttribute('cy'))),
      directed:Boolean(line.getAttribute('marker-end')),
      type:line.dataset.impactType||''
    };
  });
  return {
    room:Boolean(document.querySelector('#people-impact-graph')),
    tabs:document.querySelectorAll('[data-impact-stage]').length,
    active:document.querySelector('[data-impact-stage][aria-selected="true"]')?.dataset.impactStage||'',
    panels:document.querySelectorAll('[data-impact-panel]').length,
    visible:panel?.dataset.impactPanel||'',
    nodes:[...(panel?.querySelectorAll('[data-impact-node]')||[])].map(node=>node.dataset.impactNode),
    arrows:[...(panel?.querySelectorAll('marker')||[])].map(marker=>[marker.getAttribute('markerWidth'),marker.getAttribute('markerHeight')]),
    geometry,
    overflow:document.body.scrollWidth-innerWidth
  };
});
const tumuImpactInitial=await impactSnapshot();
if(tumuImpactInitial.room)await page.locator('[data-impact-stage="beijing"]').click();
const tumuImpactBeijing=await impactSnapshot();

const audit={home,homeTitleLayouts,people,personStory,zhuGaochiTenure,zhuChangluoTenure,zhuHoucongLineage,emperorLineageSamples,secondProfile,reenactmentSamples,secondSliceDrawerSamples,thirdSliceDrawerSamples,fourthSliceDrawerSamples,genericStorySamples,creativeSamples,portraitBatch,portraitBatch2,portraitBatch3,portraitBatch4,portraitBatch5,portraitBatch6,portraitBatch7,portraitBatch8,portraitBatch9,portraitBatch13,portraitBatch14,portraitBatch15,portraitBatch16,yangJisheng,wangYangmingThought,tangYin,immersivePages,sourceDialogAudit,sourceProviderAudit,independentFilter,externalChipExists,externalFilter,addedPersonCards,institutionOptions,institutionGroups,rosterColumnCount,rosterColumnLayout,institutionFilters,domainFilter,storyCoverage,emperorView,events,queryCount,eventDetail,eventPeopleFilter,personRelatedEvents,directEvent,crossHall,tumuEventImpact,unrelatedImpactCount,mobile,mobileTumuEventImpact,mobileTumuImpact,mobileProfile,mobileSourceDialog,mobileStory,mobileCreative,mobileWangYangmingPage,mobileZhuYuanzhangPage,mobileZhuDiPage,mobileBatch2Pages,exhibitionPortraitChecks,eighthSliceDrawerSamples,tumuImpactInitial,tumuImpactBeijing,errors};
const expectedFigurePortraits=[
  {name:'朱元璋',loaded:true,label:'',fallback:false},
  {name:'朱棣',loaded:true,label:'',fallback:false},
  {name:'于谦',loaded:true,label:'AI想象像',fallback:false},
  {name:'张居正',loaded:true,label:'AI想象像',fallback:false}
];
const creativeByName=Object.fromEntries(creativeSamples.map(x=>[x.name,x]));
const creativePass=creativeSamples.length===5&&creativeSamples.every(x=>x.broken===0&&x.sourceLinks>=1)&&creativeByName['沈周'].images===2&&creativeByName['沈周'].horizontal&&creativeByName['沈周'].labelCount===2&&creativeByName['沈周'].metaListCount===2&&creativeByName['沈周'].readingCount===2&&creativeByName['沈周'].sourceButtons===2&&creativeByName['沈周'].viewNote.includes('完整缩放')&&creativeByName['沈周'].panelOverflow&&!creativeByName['沈周'].imageFits&&creativeByName['沈周'].readingFontSize>=14&&creativeByName['沈周'].readingLineHeight>=creativeByName['沈周'].readingFontSize*1.75&&creativeByName['仇英'].images===2&&creativeByName['仇英'].horizontal&&creativeByName['徐渭'].images===1&&creativeByName['徐渭'].quoteLines===2&&creativeByName['马守真'].images===1&&creativeByName['马守真'].quoteLines===2&&creativeByName['马守真'].textConfidence&&creativeByName['徐霞客'].images===0&&creativeByName['徐霞客'].quoteLines===2;
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
const yangJishengPass=yangJisheng.first==='杨继盛'&&yangJisheng.drawerName==='杨继盛'&&yangJisheng.loaded&&!yangJisheng.imagined&&yangJisheng.label==='18世纪清人绘像'&&yangJisheng.note.includes('低置信度')&&yangJisheng.tenure.includes('1547—1553 · 6年')&&yangJisheng.sourceLinks>=4&&(yangJisheng.preview===1&&yangJisheng.enterHref==='people/yang-jisheng.html'||yangJisheng.chapters===6&&yangJisheng.workVoices===1&&yangJisheng.quoteLines===2&&yangJisheng.factLayers===6&&yangJisheng.imaginationLayers===1);
const immersivePass=immersivePages.length===personPageSpecs.length&&immersivePages.every((x,i)=>{
  const spec=personPageSpecs[i];
  const expectedTriggers=spec.sourceTriggers??(spec.name==='王守仁'?5:0);
  const evidencePass=spec.name==='朱元璋'||spec.clear
    ? x.evidence===0&&x.inferences===0&&x.sourceNotes===spec.chapters&&x.interpretationBoundaries===spec.chapters&&x.reignYears===spec.chapters
    : x.evidence===spec.chapters&&x.inferences===spec.chapters;
  return x.title.includes(spec.name)&&x.h1===spec.name&&x.theme===spec.theme&&(spec.portrait===false||x.portraitLoaded)&&x.chapters===spec.chapters&&x.ageLabels.length===spec.chapters&&x.ageLabels.every(Boolean)&&evidencePass&&x.protocols===3&&x.historicalSlice===1&&x.sliceCoordinate&&x.sliceKnownUnknown===2&&x.sliceAction===1&&x.sliceConsequence===1&&x.sliceBoundary===1&&x.featureItems===spec.featureItems&&x.artCards===spec.artCards&&x.brokenArt===0&&x.work===spec.work&&x.sources>=spec.minSources&&x.sourceTriggers===expectedTriggers&&(!spec.thought||(x.thoughtProfile===1&&x.thoughtPractice===1&&x.thoughtAfterlife===3))&&(!spec.state||(x.stateProfile===1&&x.stateCosts===6))&&(!spec.reach||(x.reachProfile===1&&x.reachItems===6))&&x.finalQuestion&&x.peopleLink==='../people.html'&&x.nextLinks===2&&x.bodyWidth===x.viewport;
});
const individualPageSamples=[...secondSliceDrawerSamples,...thirdSliceDrawerSamples].filter(sample=>sample.preview===1);
const individualPageLinksMissing=[];
for(const sample of individualPageSamples){
  if(!/^people\/[a-z0-9-]+\.html$/.test(sample.enterHref)){individualPageLinksMissing.push(sample.name);continue}
  try{await fs.access(path.join(root,sample.enterHref))}catch{individualPageLinksMissing.push(sample.name)}
}
const validIndividualPagePreview=sample=>sample.drawerName===sample.name&&sample.preview===1&&/^people\/[a-z0-9-]+\.html$/.test(sample.enterHref)&&sample.historicalSlice===0&&sample.genericCamera===0;
const secondSliceDrawerPass=secondSliceDrawerSamples.length===11&&individualPageLinksMissing.length===0&&secondSliceDrawerSamples.every(x=>x.preview===1
  ?validIndividualPagePreview(x)
  :x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1);
const reenactmentPass=reenactmentSamples.length===12&&reenactmentSamples.every(x=>{
  if(x.name==='李自成') return x.drawerName===x.name&&x.preview===1&&x.enterHref==='people/li-zi-cheng.html'&&x.historicalSlice===0&&x.genericCamera===0;
  return x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1;
});
const thirdSliceDrawerPass=thirdSliceDrawerSamples.length===16&&individualPageLinksMissing.length===0&&thirdSliceDrawerSamples.every(x=>x.preview===1
  ?validIndividualPagePreview(x)
  :x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1);
const fourthSliceDrawerPass=fourthSliceDrawerSamples.length===16&&fourthSliceDrawerSamples.every(x=>{
  if(x.preview===1) return validIndividualPagePreview(x);
  if(x.name==='徐达') return x.drawerName===x.name&&x.historicalSlice===1&&x.genericStory===0&&x.lifeChapters>=5&&['渡江','陈友谅','张士诚','大都','定西','1372'].every(text=>x.lifeStoryText.includes(text));
  return x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1;
});
const genericStoryPass=genericStorySamples.length===3&&genericStorySamples.every(item=>!item.genericBoilerplate&&((item.hook&&item.arc)||(item.foundation===1&&item.foundationChapters===4&&item.foundationBoundary.includes('基础传记'))));
const historicalSliceTypography=genericStorySamples.find(item=>item.name==='黄道周')?.sliceTypography;
const historicalSliceTypographyPass=historicalSliceTypography?.label>=12&&historicalSliceTypography?.body>=15&&historicalSliceTypography?.knowledge>=15&&historicalSliceTypography?.action>=16&&historicalSliceTypography?.boundary>=12;
const wangYangmingThoughtPass=wangYangmingThought.drawerName==='王守仁'&&wangYangmingThought.sourceLinks>=6&&wangYangmingThought.preview===1&&wangYangmingThought.quickNodes===5&&wangYangmingThought.enterHref==='people/wang-shou-ren.html'&&wangYangmingThought.bodyWidth===wangYangmingThought.viewport;
const fifthSliceDrawerPass=fifthSliceDrawerSamples.length===15&&fifthSliceDrawerSamples.every(x=>x.preview===1
  ?validIndividualPagePreview(x)
  :x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1);
const sixthSliceDrawerPass=sixthSliceDrawerSamples.length===15&&sixthSliceDrawerSamples.every(x=>x.drawerName===x.name&&x.historicalSlice===1&&x.genericCamera===0&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1)&&sixthSliceDrawerSamples.filter(x=>['万贵妃','郑贵妃','客氏'].includes(x.name)).every(x=>x.knownLabel.startsWith('她当时'));
const innerCourtCardPass=innerCourtCardSamples.length===6&&innerCourtCardSamples.every(x=>x.drawerName===x.name&&x.category.startsWith('后妃与内廷女性')&&x.office&&x.sources>=2&&x.historicalSlice===1)&&innerCourtFilter.names.length===6&&['马皇后','纪氏','万贵妃','李太后','郑贵妃','客氏'].every(name=>innerCourtFilter.names.includes(name))&&innerCourtFilter.categories.every(category=>category==='后妃与内廷女性')&&innerCourtFilter.viewTitle==='后妃与内廷女性 · 筛选视图';
const innerCourtPortraitByName=Object.fromEntries(innerCourtCardSamples.map(item=>[item.name,item]));
const innerCourtPortraitPass=['万贵妃','纪氏','客氏'].every(name=>innerCourtPortraitByName[name].portraitLoaded&&innerCourtPortraitByName[name].imagined&&innerCourtPortraitByName[name].portraitLabel==='AI想象像'&&innerCourtPortraitByName[name].portraitNote.includes('未知置信度'));
const seventhSliceDrawerPass=seventhSliceDrawerSamples.length===15&&seventhSliceDrawerSamples.every(x=>x.preview===1
  ?validIndividualPagePreview(x)
  :x.drawerName===x.name&&x.historicalSlice===1&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1);
const eighthSliceDrawerPass=eighthSliceDrawerSamples.length===23&&eighthSliceDrawerSamples.every(x=>x.drawerName===x.name&&x.historicalSlice===1&&x.coordinate&&x.title&&x.knownUnknown===2&&x.action===1&&x.consequence===1&&x.boundary===1);
const knowledgeCardPass=knowledgeCardSamples.length===6&&knowledgeCardSamples.every(x=>x.drawerName===x.name&&x.category.startsWith('在野人物')&&x.office&&x.sources>=2&&(x.preview===1?validIndividualPagePreview(x):x.historicalSlice===1));
const sourceDialogPass=sourceDialogAudit?.triggers===6&&sourceDialogAudit.open&&sourceDialogAudit.title==='九门部署与德胜门督战'&&sourceDialogAudit.location.includes('卷170')&&sourceDialogAudit.paragraphs===3&&sourceDialogAudit.original.includes('十月敕谦提督各营军马')&&sourceDialogAudit.original.includes('列阵九门外')&&sourceDialogAudit.reading.includes('正式职责')&&sourceDialogAudit.boundary.includes('正史')&&sourceDialogAudit.provider.includes('维基文库录入本')&&sourceDialogAudit.fullTextHref.includes('%E5%8D%B7170')&&sourceDialogAudit.closeFocused&&sourceDialogAudit.bodyLocked&&sourceDialogAudit.closedByEscape;
const sourceProviderPass=sourceProviderAudit.shidian?.includes('识典古籍数字文本')&&sourceProviderAudit.dpm?.includes('故宫博物院馆藏页');
const tangDisplayPass=tangYin.seal.includes('整体高；卒年中')&&tangYin.lifeFact.includes('1470—1523或1524')&&tangYin.lifeFact.includes('约53—54岁')&&tangYin.tenure.includes('1523或1524');
const homeTitlePass=homeTitleLayouts.length===5&&homeTitleLayouts.every(x=>x.lineRects===1&&x.titleWithinViewport&&x.whiteSpace==='nowrap'&&x.yearBalanced&&x.yearsInset&&x.bodyWidth===x.viewport);
const scopeCopyPass=[home.scope,people.scope,events.scope].every(text=>['1368','1644','1662','1664','北京明廷覆亡','永历政权终局','夔东抵抗终局'].every(token=>text.includes(token)));
const factGridPass=personStory.identityValue==='文臣 · 兵部尚书'&&JSON.stringify(personStory.factLabels)===JSON.stringify(['身份 / 职务','历史领域','生卒 / 寿命','籍贯','任职时期 / 历朝','关联机构','人物概览'])&&personStory.scoreSummaryLast&&personStory.scoreItems===6&&personStory.totalScoreLabel==='加权总分 · 100%'&&/^\d+\.\d$/.test(personStory.totalScoreValue)&&!personStory.totalScoreValue.includes('/100')&&!personStory.scoreSummaryText.startsWith('评分细项')&&['加权总分','治国制度','军事危机','社会文化','长期遗产','责任代价'].every(label=>personStory.scoreSummaryText.includes(label))&&personStory.legacyScoreGrid===0;
const zhuHoucongLineagePass=zhuHoucongLineage.rich&&zhuHoucongLineage.entries===3&&zhuHoucongLineage.scoreSummaryLast&&zhuHoucongLineage.scoreItems===6&&['兴献王朱祐杬','蒋氏','兴献王一支','堂兄明武宗朱厚照','皇位由孝宗一支转入兴献王一支'].every(text=>zhuHoucongLineage.text.includes(text))&&zhuHoucongLineage.source;
const emperorLineageByName=Object.fromEntries(emperorLineageSamples.map(item=>[item.name,item]));
const emperorLineagePass=emperorLineageSamples.length===16&&emperorLineageSamples.every(item=>item.drawerName===item.name&&/高置信度|中置信度/.test(item.confidence)&&item.sourceLinks>=2&&item.lineageCards===0&&item.founderCards===1&&item.founderColumns===3&&item.governanceItems>=1&&item.governanceItems<=4&&item.boundary.startsWith('说明：'))&&['朱世珍','陈氏','明朝开国皇帝','朱允炆'].every(text=>emperorLineageByName['朱元璋'].text.includes(text))&&['朱标','吕氏','明太祖朱元璋','皇太孙'].every(text=>emperorLineageByName['朱允炆'].text.includes(text))&&emperorLineageByName['朱棣'].boundary.includes('生母异说')&&emperorLineageByName['朱祁镇'].text.includes('两段统治')&&emperorLineageByName['朱厚熜'].text.includes('兴献王一支')&&emperorLineageByName['朱由检'].text.includes('兄终弟及');
const exhibitionPortraitPass=exhibitionPortraitChecks.length===exhibitionSource.reduce((sum,exhibit)=>sum+exhibit.people.length,0)&&exhibitionPortraitChecks.every(item=>item.expectedSrc
  ?item.image&&item.loaded&&!item.fallback&&item.src===item.expectedSrc&&item.label===item.expectedLabel
  :!item.image&&item.fallback);
const externalCategoryPass=externalChipExists&&externalFilter.count===2&&externalFilter.stat==='2'&&JSON.stringify(externalFilter.names)===JSON.stringify(['丰臣秀吉','李舜臣'])&&JSON.stringify(externalFilter.categories)===JSON.stringify(['域外人物']);
const addedPersonCardPass=addedPersonCards.length===5&&addedPersonCards.every(item=>item.drawer&&item.drawerName===item.name&&item.category.startsWith(item.expectedCategory)&&item.office&&item.historicalSlice===1&&item.knownUnknown===2&&item.sourceLinks>=2&&(item.name==='潘季驯'||item.relatedEvents>=1));
const expectedNewPortraitLabels={'宋礼':'AI想象像','潘季驯':'AI想象像','李舜臣':'朝鲜时代忠武公图','丰臣秀吉':'约1602年狩野派画像','多尔衮':'17世纪传为多尔衮像'};
const addedPersonPortraitPass=addedPersonCards.every(item=>item.portraitLoaded&&!item.portraitFallback&&item.portraitLabel===expectedNewPortraitLabels[item.name]&&item.portraitNote.includes('置信度')&&item.sourceLinks>=3);
const institutionByName=Object.fromEntries(institutionFilters.map(item=>[item.institution,item]));
const expectedInstitutionOptions=['中书省','御史台','大都督府','五军都督府','翰林院','内阁','都察院','吏部','户部','礼部','兵部','刑部','工部','司礼监','锦衣卫','东厂','西厂'].sort((left,right)=>left.localeCompare(right,'zh-Hans-CN'));
const institutionFilterPass=institutionSelectExists&&rosterColumnCount===15&&expectedInstitutionOptions.every(option=>institutionOptions.includes(option))&&institutionGroups.length===0&&institutionFilters.length===12&&institutionFilters.every(item=>item.selected===item.institution&&item.count>0&&item.names.length===item.count)&&institutionByName['内阁'].names.includes('张居正')&&institutionByName['都察院'].names.includes('海瑞')&&institutionByName['吏部'].names.includes('蹇义')&&institutionByName['户部'].names.includes('夏原吉')&&institutionByName['礼部'].names.includes('徐光启')&&institutionByName['兵部'].names.includes('于谦')&&institutionByName['刑部'].names.includes('张璁')&&institutionByName['工部'].names.includes('宋礼')&&institutionByName['司礼监'].names.includes('王振')&&institutionByName['锦衣卫'].names.includes('朱元璋')&&institutionByName['东厂'].names.includes('魏忠贤')&&institutionByName['西厂'].names.includes('汪直');
const eventPeopleFilterPass=eventPeopleFilter.event==='e035'&&eventPeopleFilter.selected==='e035'&&eventPeopleFilter.title==='北京保卫战 · 相关人物'&&eventPeopleFilter.count===4&&eventPeopleFilter.loadedDetailIds.length===eventPeopleFilter.count&&eventPeopleFilter.loadedDetailIds.every(Boolean)&&JSON.stringify(eventPeopleFilter.names)===JSON.stringify(['于谦','朱祁钰','朱祁镇','石亨'])&&eventPeopleFilter.duplicateEmperorSelects===0;
const rosterColumnLayoutPass=JSON.stringify(rosterColumnLayout.scoreHeaders)===JSON.stringify(['加权总分','治国与制度','军事与危机','社会文化','长期遗产','责任与代价'])&&JSON.stringify(rosterColumnLayout.scoreCellKinds)===JSON.stringify(['总分','细分','细分','细分','细分','细分'])&&/^\d+\.\d$/.test(rosterColumnLayout.totalScoreText)&&!rosterColumnLayout.totalScoreText.includes('/100')&&rosterColumnLayout.penultimateHeader==='家乡 / 世系'&&rosterColumnLayout.lastHeader==='本人子女数量'&&!rosterColumnLayout.headers.some(header=>/[（(].*子.*女.*[）)]/.test(header))&&rosterColumnLayout.penultimateCell.includes('濠州钟离')&&rosterColumnLayout.lastCell.includes('合计');
audit.rosterColumnLayoutPass=rosterColumnLayoutPass;
audit.sourceProviderPass=sourceProviderPass;
audit.tangDisplayPass=tangDisplayPass;
const addedExhibitionNames=new Set(['宋礼','潘季驯','李舜臣','丰臣秀吉','多尔衮']);
const addedExhibitionLinksPass=exhibitionPortraitChecks.filter(item=>addedExhibitionNames.has(item.name)).length===5&&exhibitionPortraitChecks.filter(item=>addedExhibitionNames.has(item.name)).every(item=>item.linked);
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
audit.genericStoryPass=genericStoryPass;
audit.fifthSliceDrawerPass=fifthSliceDrawerPass;
audit.sixthSliceDrawerPass=sixthSliceDrawerPass;
audit.innerCourtCardPass=innerCourtCardPass;
audit.innerCourtPortraitPass=innerCourtPortraitPass;
audit.seventhSliceDrawerPass=seventhSliceDrawerPass;
audit.eighthSliceDrawerPass=eighthSliceDrawerPass;
audit.knowledgeCardPass=knowledgeCardPass;
audit.sourceDialogPass=sourceDialogPass;
audit.homeTitlePass=homeTitlePass;
audit.scopeCopyPass=scopeCopyPass;
audit.factGridPass=factGridPass;
audit.zhuHoucongLineagePass=zhuHoucongLineagePass;
audit.emperorLineagePass=emperorLineagePass;
audit.exhibitionPortraitPass=exhibitionPortraitPass;
audit.externalCategoryPass=externalCategoryPass;
audit.addedPersonCardPass=addedPersonCardPass;
audit.addedPersonPortraitPass=addedPersonPortraitPass;
audit.institutionFilterPass=institutionFilterPass;
audit.addedExhibitionLinksPass=addedExhibitionLinksPass;
audit.impactGraphDataPass=impactGraphDataPass;
const impactGeometryPass=snapshot=>snapshot.geometry.every(edge=>Math.abs(edge.startRadius-6)<.05&&Math.abs(edge.endRadius-6)<.05&&(edge.type==='status'?!edge.directed:edge.directed));
const tumuImpactPass=tumuImpactInitial.room&&tumuImpactInitial.tabs===3&&tumuImpactInitial.panels===3&&tumuImpactInitial.active==='defeat'&&tumuImpactInitial.visible==='defeat'&&JSON.stringify(tumuImpactInitial.nodes)===JSON.stringify(['王振','也先','朱祁镇'])&&tumuImpactInitial.arrows.every(size=>size[0]==='10'&&size[1]==='10')&&impactGeometryPass(tumuImpactInitial)&&tumuImpactInitial.overflow===0&&tumuImpactBeijing.active==='beijing'&&tumuImpactBeijing.visible==='beijing'&&JSON.stringify(tumuImpactBeijing.nodes)===JSON.stringify(['朱祁钰','于谦','朱祁镇','也先'])&&impactGeometryPass(tumuImpactBeijing);
audit.tumuImpactPass=tumuImpactPass;
const tumuEventImpactPass=tumuEventImpact.title==='土木堡之变'&&tumuEventImpact.compact==='tumu-crisis'&&JSON.stringify(tumuEventImpact.nodes)===JSON.stringify(['也先','朱祁镇','王振'])&&tumuEventImpact.fullHref==='exhibit-tumu-crisis.html#people-impact-graph'&&tumuEventImpact.arrows.every(size=>size[0]==='10'&&size[1]==='10')&&tumuEventImpact.overflow===0&&unrelatedImpactCount===0;
audit.tumuEventImpactPass=tumuEventImpactPass;
const mobileTumuImpactPass=mobileTumuEventImpact.compact==='tumu-crisis'&&mobileTumuEventImpact.nodes===3&&mobileTumuEventImpact.loadedImages===3&&mobileTumuEventImpact.bodyWidth===mobileTumuEventImpact.viewport&&mobileTumuImpact.active==='restoration'&&mobileTumuImpact.visible==='restoration'&&mobileTumuImpact.nodes===4&&mobileTumuImpact.bodyWidth===mobileTumuImpact.viewport;
audit.mobileTumuImpactPass=mobileTumuImpactPass;
const baseCheckGroups={
  home:home.doors===3&&home.eras===7&&home.figures===4&&JSON.stringify(home.figurePortraits)===JSON.stringify(expectedFigurePortraits)&&home.routes===5&&home.bodyWidth===home.viewport&&homeTitlePass&&scopeCopyPass,
  people:people.peopleView==='table'&&people.eventDisplay==='none'&&people.timelineDisplay==='none'&&people.tableDisplay!=='none'&&people.search==='于谦'&&people.first==='于谦'&&people.navActive==='人物馆'&&people.tenureLabels.length>0&&people.tenureLabels.every(x=>!/[（）()]/.test(x))&&scopeCopyPass,
  profile:personStory.drawer&&personStory.portraitLoaded&&personStory.portraitLabel==='AI想象像'&&personStory.preview===1&&personStory.quickNodes===6&&personStory.enterText==='进入 于谦 的一生'&&personStory.enterHref==='people/yu-qian.html'&&personStory.legacyStory===0&&personStory.bodyWidth===personStory.viewport&&zhuGaochiTenure.includes('1424—1425 · 约8个月')&&zhuChangluoTenure.includes('1620 · 约1个月')&&secondProfile.preview===1&&secondProfile.quickNodes===6&&secondProfile.href==='people/zhang-ju-zheng.html',
  priorBatches:reenactmentPass&&secondSliceDrawerPass&&creativePass&&portraitBatchPass&&portraitBatch2Pass&&portraitBatch3Pass&&portraitBatch4Pass&&immersivePass&&sourceDialogPass&&yangJishengPass,
  filters:tangYin.first==='唐寅'&&tangYin.drawer&&tangYin.seal.includes('在野人物')&&tangYin.domains.includes('文学艺术')&&tangYin.tenure.includes('—')&&tangYin.preview===1&&tangYin.quickNodes===6&&tangYin.enterHref==='people/tang-yin.html'&&tangYin.sources>=7&&independentFilter.count===17&&JSON.stringify(independentFilter.categories)===JSON.stringify(['在野人物'])&&domainFilter.count>=1&&domainFilter.names.includes('徐霞客')&&storyCoverage.rows===expectedFormalRosterCount&&storyCoverage.markers===storyCoverage.rows&&storyCoverage.statLabel===String(storyCoverage.rows)&&Number.isInteger(+storyCoverage.independentPageStat)&&+storyCoverage.independentPageStat>0,
  emperor:emperorView.emperorCount===1&&emperorView.duplicates.length===0&&Math.abs(emperorView.timelineTop-emperorView.navBottom)<=2&&emperorView.labels.every(label=>!/[子女]\d/.test(label)),
  events:events.peopleTableDisplay==='none'&&events.eventDisplay!=='none'&&events.cards===14&&events.activeStage==='s6'&&events.navActive==='事件馆'&&events.bodyWidth===events.viewport&&scopeCopyPass&&queryCount===1&&eventDetail.title==='北京保卫战'&&eventDetail.people===4&&eventDetail.sources===3&&eventPeopleFilterPass&&personRelatedEvents.count>=3&&personRelatedEvents.beijingHref==='events.html?event=e035'&&personRelatedEvents.beijingText.includes('1449')&&personRelatedEvents.beijingText.includes('北京保卫战')&&directEvent.event==='e035'&&directEvent.title==='北京保卫战'&&directEvent.drawerOpen&&crossHall.person==='于谦'&&crossHall.search==='于谦'&&crossHall.first==='于谦',
  mobile:mobile.bodyWidth===mobile.viewport&&mobile.doorColumns===1&&mobile.eraColumns===1&&mobileProfile.pathname.endsWith('/people/yu-qian.html')&&mobileProfile.h1==='于谦'&&!mobileProfile.drawer&&mobileProfile.chapters===6&&mobileProfile.bodyWidth===mobileProfile.viewport&&mobileProfile.heroColumns===1&&mobileSourceDialog.open&&mobileSourceDialog.dialogWidth<=mobileSourceDialog.viewport&&mobileSourceDialog.readingColumns===1&&mobileSourceDialog.bodyWidth===mobileSourceDialog.viewport&&mobileStory.bodyWidth===mobileStory.viewport&&mobileStory.reenactmentColumns===1&&mobileStory.visible&&mobileStory.genericCamera===0&&mobileCreative.pathname.endsWith('/people/xu-wei.html')&&mobileCreative.bodyWidth===mobileCreative.viewport&&mobileCreative.columns===1&&mobileCreative.works===2&&mobileCreative.imagesLoaded&&mobileCreative.imagesContained&&mobileCreative.openButtons===2&&errors.length===0
};
audit.baseCheckGroups=baseCheckGroups;
audit.pass=baseCheckGroups.home&&baseCheckGroups.people&&baseCheckGroups.profile&&baseCheckGroups.priorBatches&&baseCheckGroups.filters&&baseCheckGroups.emperor&&baseCheckGroups.events&&baseCheckGroups.mobile;
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
audit.pass=audit.pass&&genericStoryPass;
audit.pass=audit.pass&&historicalSliceTypographyPass;
audit.pass=audit.pass&&wangYangmingThoughtPass;
audit.pass=audit.pass&&mobileWangYangmingPage.h1==='王守仁'&&mobileWangYangmingPage.chapters===5&&mobileWangYangmingPage.thoughtColumns===1&&mobileWangYangmingPage.afterlifeColumns===1&&mobileWangYangmingPage.sourceTriggers===5&&mobileWangYangmingPage.bodyWidth===mobileWangYangmingPage.viewport;
audit.pass=audit.pass&&mobileZhuYuanzhangPage.h1==='朱元璋'&&mobileZhuYuanzhangPage.chapters===6&&mobileZhuYuanzhangPage.stateColumns===1&&mobileZhuYuanzhangPage.stateCosts===6&&mobileZhuYuanzhangPage.sourceTriggers===6&&mobileZhuYuanzhangPage.bodyWidth===mobileZhuYuanzhangPage.viewport;
audit.pass=audit.pass&&mobileZhuDiPage.h1==='朱棣'&&mobileZhuDiPage.chapters===6&&mobileZhuDiPage.reachColumns===1&&mobileZhuDiPage.reachItems===6&&mobileZhuDiPage.sourceTriggers===6&&mobileZhuDiPage.bodyWidth===mobileZhuDiPage.viewport;
audit.pass=audit.pass&&mobileBatch2Pages.length===6&&mobileBatch2Pages.every((item,index)=>{
  const spec=personPageSpecs.slice(-6)[index];
  return item.pathname.endsWith('/people/'+spec.slug+'.html')&&item.h1===spec.name&&item.chapters===spec.chapters&&(item.featureColumns===0||item.featureColumns===1)&&item.sourceTriggers===spec.sourceTriggers&&item.bodyWidth===item.viewport;
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
audit.pass=audit.pass&&exhibitionPortraitPass;
audit.pass=audit.pass&&externalCategoryPass&&addedPersonCardPass&&addedPersonPortraitPass&&institutionFilterPass&&addedExhibitionLinksPass;
audit.pass=audit.pass&&impactGraphDataPass;
audit.pass=audit.pass&&tumuImpactPass;
audit.pass=audit.pass&&tumuEventImpactPass;
audit.pass=audit.pass&&mobileTumuImpactPass;
audit.pass=audit.pass&&rosterColumnLayoutPass;
audit.pass=audit.pass&&sourceProviderPass&&tangDisplayPass;
await fs.writeFile(path.join(root,'自动化验收报告.json'),JSON.stringify(audit,null,2));
console.log('VERIFY_SUMMARY '+JSON.stringify({baseCheckGroups,tangYin,independentFilter,domainFilter,storyCoverage,externalCategoryPass,addedPersonCardPass,addedPersonPortraitPass,institutionFilterPass,addedExhibitionLinksPass,pass:audit.pass}));
await browser.close();
await new Promise(resolve=>server.close(resolve));
if(!audit.pass)process.exit(1);
