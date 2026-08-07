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
    bodyWidth:document.body.scrollWidth,
    viewport:innerWidth
  };
});
await page.waitForTimeout(500);
await page.screenshot({path:path.join(root,'人物档案_于谦_预览.png'),fullPage:false});
await page.locator('#detail .profile-preview').screenshot({path:path.join(root,'人物档案_于谦_速览抽屉_预览.png')});
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('朱高炽'));
const zhuGaochiTenure=await page.evaluate(()=>document.querySelector('#detail .facts .fact:nth-child(2)')?.textContent.trim()||'');
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('朱常洛'));
const zhuChangluoTenure=await page.evaluate(()=>document.querySelector('#detail .facts .fact:nth-child(2)')?.textContent.trim()||'');
await page.locator('#close').click();
await page.evaluate(()=>focusPerson('张居正'));
const secondProfile=await page.evaluate(()=>({preview:document.querySelectorAll('#detail .profile-preview').length,quickNodes:document.querySelectorAll('#detail .profile-quick-node').length,href:document.querySelector('#detail .profile-enter')?.getAttribute('href')}));
await page.locator('#close').click();
const reenactmentSamples=[];
for(const name of ['朱元璋','夏原吉','徐达','郑和','朱标']){
  await page.evaluate(personName=>focusPerson(personName),name);
  reenactmentSamples.push(await page.evaluate(personName=>({
    name:personName,
    drawerName:document.querySelector('#detail h2')?.textContent.trim(),
    reenactment:document.querySelectorAll('#detail .story-reenactment').length,
    facts:document.querySelectorAll('#detail .reenactment-fact').length,
    scene:document.querySelectorAll('#detail .reenactment-scene').length,
    question:document.querySelectorAll('#detail .reenactment-question').length,
    factLabel:document.querySelectorAll('#detail .reenactment-facts .layer-fact').length,
    imaginationLabel:document.querySelectorAll('#detail .reenactment-scene .layer-imagination').length,
    legacyEmptyState:document.querySelectorAll('#detail .story-none').length
  }),name));
  if(name==='夏原吉'){
    await page.locator('#detail .story-reenactment').scrollIntoViewIfNeeded();
    await page.locator('#detail .story-reenactment').screenshot({path:path.join(root,'人物档案_夏原吉_故事演绎_预览.png')});
  }
  await page.locator('#close').click();
}
const creativeSamples=[];
for(const name of ['沈周','仇英','徐渭','马守真','徐霞客','李时珍']){
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
    tenure:document.querySelector('#detail .facts .fact:nth-child(2)')?.textContent.trim()||'',
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
  tenure:document.querySelector('#detail .facts .fact:nth-child(2)')?.textContent.trim(),
  preview:document.querySelectorAll('#detail .profile-preview').length,
  quickNodes:document.querySelectorAll('#detail .profile-quick-node').length,
  enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href'),
  sources:document.querySelectorAll('#detail .sources a').length
}));
await page.locator('#close').click();
const personPageSpecs=[
  {name:'于谦',slug:'yu-qian',theme:'crisis',featureItems:4,artCards:0,work:true},
  {name:'张居正',slug:'zhang-ju-zheng',theme:'system',featureItems:4,artCards:0,work:false},
  {name:'唐寅',slug:'tang-yin',theme:'artist',featureItems:0,artCards:2,work:false},
  {name:'戚继光',slug:'qi-ji-guang',theme:'military',featureItems:4,artCards:0,work:true}
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
    featureItems:document.querySelectorAll('.feature-item').length,
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
await page.goto(url('people.html?person='+encodeURIComponent('夏原吉')),{waitUntil:'networkidle'});
const mobileStory=await page.evaluate(()=>({
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth,
  reenactmentColumns:getComputedStyle(document.querySelector('#detail .reenactment-grid')).gridTemplateColumns.split(' ').length,
  visible:Boolean(document.querySelector('#detail .story-reenactment'))
}));
await page.locator('#detail .story-reenactment').scrollIntoViewIfNeeded();
await page.screenshot({path:path.join(root,'人物档案_故事演绎_移动端预览.png'),fullPage:false});
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

const audit={home,homeTitleLayouts,people,personStory,zhuGaochiTenure,zhuChangluoTenure,secondProfile,reenactmentSamples,creativeSamples,portraitBatch,portraitBatch2,portraitBatch3,portraitBatch4,portraitBatch5,portraitBatch6,portraitBatch7,portraitBatch8,portraitBatch9,yangJisheng,tangYin,immersivePages,sourceDialogAudit,independentFilter,domainFilter,storyCoverage,emperorView,events,queryCount,eventDetail,crossHall,mobile,mobileProfile,mobileSourceDialog,mobileStory,mobileCreative,errors};
const expectedFigurePortraits=[
  {name:'朱元璋',loaded:true,label:'',fallback:false},
  {name:'朱棣',loaded:true,label:'',fallback:false},
  {name:'于谦',loaded:true,label:'AI想象像',fallback:false},
  {name:'张居正',loaded:true,label:'AI想象像',fallback:false}
];
const creativeByName=Object.fromEntries(creativeSamples.map(x=>[x.name,x]));
const creativePass=creativeSamples.length===6&&creativeSamples.every(x=>x.broken===0&&x.sourceLinks>=1)&&creativeByName['沈周'].images===2&&creativeByName['沈周'].horizontal&&creativeByName['仇英'].images===2&&creativeByName['仇英'].horizontal&&creativeByName['徐渭'].images===1&&creativeByName['徐渭'].quoteLines===2&&creativeByName['马守真'].images===1&&creativeByName['马守真'].quoteLines===2&&creativeByName['马守真'].textConfidence&&creativeByName['徐霞客'].images===0&&creativeByName['徐霞客'].quoteLines===2&&creativeByName['李时珍'].knowledgeCells===9;
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
const yangJishengPass=yangJisheng.first==='杨继盛'&&yangJisheng.drawerName==='杨继盛'&&yangJisheng.loaded&&!yangJisheng.imagined&&yangJisheng.label==='18世纪清人绘像'&&yangJisheng.note.includes('低置信度')&&yangJisheng.tenure.includes('1547—1553 · 6年')&&yangJisheng.chapters===6&&yangJisheng.workVoices===1&&yangJisheng.quoteLines===2&&yangJisheng.factLayers===6&&yangJisheng.imaginationLayers===1&&yangJisheng.sourceLinks>=4;
const immersivePass=immersivePages.length===personPageSpecs.length&&immersivePages.every((x,i)=>{
  const spec=personPageSpecs[i];
  return x.title.includes(spec.name)&&x.h1===spec.name&&x.theme===spec.theme&&x.portraitLoaded&&x.chapters===3&&x.ageLabels.length===3&&x.ageLabels.every(Boolean)&&x.evidence===3&&x.inferences===3&&x.protocols===3&&x.featureItems===spec.featureItems&&x.artCards===spec.artCards&&x.brokenArt===0&&x.work===spec.work&&x.sources>=3&&x.finalQuestion&&x.peopleLink==='../people.html'&&x.nextLinks===2&&x.bodyWidth===x.viewport;
});
const sourceDialogPass=sourceDialogAudit?.triggers===3&&sourceDialogAudit.open&&sourceDialogAudit.title==='1449：从反对南迁到列阵九门'&&sourceDialogAudit.location.includes('卷一百七十')&&sourceDialogAudit.paragraphs===3&&sourceDialogAudit.original.includes('言南迁者，可斩也')&&sourceDialogAudit.original.includes('列阵九门外')&&sourceDialogAudit.reading.includes('连续步骤')&&sourceDialogAudit.boundary.includes('清代')&&sourceDialogAudit.fullTextHref.includes('卷170')&&sourceDialogAudit.closeFocused&&sourceDialogAudit.bodyLocked&&sourceDialogAudit.closedByEscape;
const homeTitlePass=homeTitleLayouts.length===5&&homeTitleLayouts.every(x=>x.lineRects===1&&x.titleWithinViewport&&x.whiteSpace==='nowrap'&&x.yearBalanced&&x.yearsInset&&x.bodyWidth===x.viewport);
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
audit.yangJishengPass=yangJishengPass;
audit.immersivePass=immersivePass;
audit.sourceDialogPass=sourceDialogPass;
audit.homeTitlePass=homeTitlePass;
audit.pass=home.doors===2&&home.eras===6&&home.figures===4&&JSON.stringify(home.figurePortraits)===JSON.stringify(expectedFigurePortraits)&&home.routes===4&&home.bodyWidth===home.viewport&&homeTitlePass&&people.eventDisplay==='none'&&people.tableDisplay!=='none'&&people.search==='于谦'&&people.first==='于谦'&&people.navActive==='人物馆'&&people.tenureLabels.length>0&&people.tenureLabels.every(x=>!/[（）()]/.test(x))&&personStory.drawer&&personStory.portraitLoaded&&personStory.portraitLabel==='AI想象像'&&personStory.preview===1&&personStory.quickNodes===3&&personStory.enterText==='进入 于谦 的一生'&&personStory.enterHref==='people/yu-qian.html'&&personStory.legacyStory===0&&personStory.bodyWidth===personStory.viewport&&zhuGaochiTenure.includes('1424—1425 · 约8个月')&&zhuChangluoTenure.includes('1620 · 约1个月')&&secondProfile.preview===1&&secondProfile.quickNodes===3&&secondProfile.href==='people/zhang-ju-zheng.html'&&reenactmentSamples.length===5&&reenactmentSamples.every(x=>x.drawerName===x.name&&x.reenactment===1&&x.facts===3&&x.scene===1&&x.question===1&&x.factLabel===1&&x.imaginationLabel===1&&x.legacyEmptyState===0)&&creativePass&&portraitBatchPass&&portraitBatch2Pass&&portraitBatch3Pass&&portraitBatch4Pass&&immersivePass&&sourceDialogPass&&yangJishengPass&&tangYin.first==='唐寅'&&tangYin.drawer&&tangYin.seal.includes('在野人物')&&tangYin.domains.includes('文学艺术')&&tangYin.tenure.includes('—')&&tangYin.preview===1&&tangYin.quickNodes===3&&tangYin.enterHref==='people/tang-yin.html'&&tangYin.sources>=3&&independentFilter.count===8&&JSON.stringify(independentFilter.categories)===JSON.stringify(['在野人物'])&&domainFilter.count>=1&&domainFilter.names.includes('徐霞客')&&storyCoverage.rows===132&&storyCoverage.markers===storyCoverage.rows&&storyCoverage.statLabel===String(storyCoverage.rows)&&emperorView.emperorCount===1&&emperorView.duplicates.length===0&&events.peopleTableDisplay==='none'&&events.eventDisplay!=='none'&&events.cards===20&&events.activeStage==='s6'&&events.navActive==='事件馆'&&events.bodyWidth===events.viewport&&queryCount===1&&eventDetail.title==='北京保卫战'&&eventDetail.people===4&&eventDetail.sources===3&&crossHall.person==='于谦'&&crossHall.search==='于谦'&&crossHall.first==='于谦'&&mobile.bodyWidth===mobile.viewport&&mobile.doorColumns===1&&mobile.eraColumns===1&&mobileProfile.pathname.endsWith('/people/yu-qian.html')&&mobileProfile.h1==='于谦'&&!mobileProfile.drawer&&mobileProfile.chapters===3&&mobileProfile.bodyWidth===mobileProfile.viewport&&mobileProfile.heroColumns===1&&mobileSourceDialog.open&&mobileSourceDialog.dialogWidth<=mobileSourceDialog.viewport&&mobileSourceDialog.readingColumns===1&&mobileSourceDialog.bodyWidth===mobileSourceDialog.viewport&&mobileStory.bodyWidth===mobileStory.viewport&&mobileStory.reenactmentColumns===1&&mobileStory.visible&&mobileCreative.bodyWidth===mobileCreative.viewport&&mobileCreative.columns===1&&mobileCreative.imageLoaded&&mobileCreative.quoteLines===2&&errors.length===0;
audit.pass=audit.pass&&portraitBatch5Pass;
audit.pass=audit.pass&&portraitBatch6Pass;
audit.pass=audit.pass&&portraitBatch7Pass;
audit.pass=audit.pass&&portraitBatch8Pass;
audit.pass=audit.pass&&portraitBatch9Pass;
console.log(JSON.stringify(audit,null,2));
await browser.close();
if(!audit.pass)process.exit(1);
