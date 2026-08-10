import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const file=path.join(root,'institutions-palace.html');
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};

try{await fs.access(file);}catch{
  console.error('Institution palace verification failed (1):\n- institutions-palace.html must be generated');
  process.exit(1);
}

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',error=>failures.push(`page error: ${error.message}`));
const url=`file://${file}`;

const inspectDesktop=async(width,height)=>{
  await page.setViewportSize({width,height});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(80);
  return page.evaluate(()=>{
    const embedded=JSON.parse(document.querySelector('#institutionPalaceData')?.textContent||'{}');
    const hero=document.querySelector('.palace-intro')?.getBoundingClientRect();
    const stage=document.querySelector('.palace-stage')?.getBoundingClientRect();
    const visibleNodes=[...document.querySelectorAll('.palace-stage .canonical-institution:not([hidden])')];
    const collisions=[];
    for(let i=0;i<visibleNodes.length;i++)for(let j=i+1;j<visibleNodes.length;j++){
      const a=visibleNodes[i].getBoundingClientRect(),b=visibleNodes[j].getBoundingClientRect();
      if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)collisions.push(`${visibleNodes[i].dataset.id}/${visibleNodes[j].dataset.id}`);
    }
    const endpointMisses=[...document.querySelectorAll('.relation-line:not([hidden])')].map(line=>{
      const svg=line.ownerSVGElement.getBoundingClientRect();
      const endpoint=(index,id)=>{
        const node=document.querySelector(`.palace-stage .canonical-institution[data-id="${id}"]:not([hidden])`);
        if(!node)return 0;
        const r=node.getBoundingClientRect();
        const x=Number(line.getAttribute(`x${index}`))+svg.left;
        const y=Number(line.getAttribute(`y${index}`))+svg.top;
        const outsideX=Math.max(r.left-x,0,x-r.right),outsideY=Math.max(r.top-y,0,y-r.bottom);
        const outside=Math.hypot(outsideX,outsideY);
        const inside=Math.min(Math.abs(x-r.left),Math.abs(x-r.right),Math.abs(y-r.top),Math.abs(y-r.bottom));
        return outside||inside;
      };
      const fromNode=document.querySelector(`.palace-stage .canonical-institution[data-id="${line.dataset.from}"]:not([hidden])`);
      return {id:line.dataset.id,distance:Math.max(endpoint(1,line.dataset.from),endpoint(2,line.dataset.to)),x1:Number(line.getAttribute('x1')),y1:Number(line.getAttribute('y1')),svgTop:svg.top,nodeTop:fromNode?.getBoundingClientRect().top};
    });
    const lineWidths=[...document.querySelectorAll('.relation-line:not([hidden])')].map(line=>parseFloat(getComputedStyle(line).strokeWidth));
    const transforms=[...document.querySelectorAll('body *')].map(element=>getComputedStyle(element)).filter(style=>style.fontStretch!=='100%'||/scaleX\(/.test(style.transform));
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});canvas.width=canvas.height=1;
    const rgba=color=>{context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);return [...context.getImageData(0,0,1,1).data].map(value=>value/255)};
    const luminance=rgb=>rgb.slice(0,3).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
    const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
    const backgroundOf=element=>{let node=element;while(node){const color=rgba(getComputedStyle(node).backgroundColor);if(color[3]>.95)return color;node=node.parentElement}return rgba('white')};
    const contrastSelectors=['.palace-intro-copy p','.canonical-institution span','.canonical-institution small','.room-trigger b','.room-trigger span'];
    const textContrasts=contrastSelectors.map(selector=>{const element=document.querySelector(selector);return element?contrast(rgba(getComputedStyle(element).color),backgroundOf(element)):99});
    const historyCopySelectors=['.canonical-institution small','.axis-cluster>header span','.subinstitution p','.nested-groups span','.boundary-slip','.role-plaque span'];
    const historyFontSizes=historyCopySelectors.flatMap(selector=>[...document.querySelectorAll(selector)].map(element=>parseFloat(getComputedStyle(element).fontSize)));
    const ministryGroup=document.querySelector('.six-ministries-composition');
    const ministryMembers=[...document.querySelectorAll('[data-composed-of="six_ministries"]')];
    const transmission=document.querySelector('.canonical-institution[data-id="transmission_office"]');
    const ministryParent=document.querySelector('.canonical-institution[data-id="six_ministries"]');
    return {
      nodes:embedded.institutions?.length,relations:embedded.relations?.length,
      axis:document.querySelectorAll('.power-axis').length,
      rooms:document.querySelectorAll('.institution-room').length,
      openRooms:document.querySelectorAll('.institution-room[aria-expanded="true"]').length,
      returnLink:document.querySelector('.return-archive')?.getAttribute('href'),
      modeSwitches:document.querySelectorAll('.institution-view-switch a').length,
      activeMode:document.querySelector('.institution-view-switch a[aria-current="page"]')?.dataset.mode,
      graphModeHref:document.querySelector('.institution-view-switch a[data-mode="graph"]')?.getAttribute('href')||'',
      navPalaceLinks:document.querySelectorAll('.museum-links a[href="institutions-palace.html"]').length,
      titleOverlap:Boolean(hero&&stage&&hero.bottom>stage.top+1),
      bodyOverflow:document.body.scrollWidth>innerWidth,
      collisions,endpointMisses,lineWidths,distorted:transforms.length,
      minTextContrast:Math.min(...textContrasts),
      minHistoryFontSize:Math.min(...historyFontSizes),
      sixMinistryGroup:Boolean(ministryGroup),
      sixMinistryMemberCount:ministryMembers.length,
      transmissionOutsideGroup:Boolean(transmission&&ministryGroup&&!ministryGroup.contains(transmission)),
      sixMinistryLabel:ministryGroup?.querySelector('.composition-label')?.textContent.trim()||'',
      groupStripeWidth:ministryGroup?parseFloat(getComputedStyle(ministryGroup).borderLeftWidth):0,
      memberStripeWidth:ministryMembers[0]?parseFloat(getComputedStyle(ministryMembers[0]).borderLeftWidth):0,
      parentNodeType:ministryParent?.dataset.nodeType||'',
      desktopDisplay:getComputedStyle(document.querySelector('.palace-stage')).display,
      mobileDisplay:getComputedStyle(document.querySelector('.mobile-room-chapters')).display
    };
  });
};

for(const [width,height] of [[1440,1000],[1024,768],[1800,1000]]){
  const state=await inspectDesktop(width,height);
  expect(state.nodes===45,`${width}: page must embed 45 canonical institutions`);
  expect(state.relations===64,`${width}: page must embed 64 reviewed relations`);
  expect(state.axis===1,`${width}: page must expose one persistent power axis`);
  expect(state.rooms===5,`${width}: page must expose five institution rooms`);
  expect(state.openRooms<=1,`${width}: only one room may be open`);
  expect(state.returnLink==='institutions.html',`${width}: C version must link back to B version`);
  expect(state.modeSwitches===2,`${width}: institution hall must expose two persistent viewing modes`);
  expect(state.activeMode==='palace',`${width}: palace space must identify itself as the current viewing mode`);
  expect(state.graphModeHref.startsWith('institutions.html'),`${width}: palace space must link to the relationship-graph mode`);
  expect(state.navPalaceLinks===0,`${width}: C version must remain absent from official navigation`);
  expect(!state.titleOverlap,`${width}: title must not overlap the palace stage`);
  expect(!state.bodyOverflow,`${width}: page must not overflow horizontally`);
  expect(state.collisions.length===0,`${width}: visible axis cards collide: ${state.collisions.join(', ')}`);
  const missed=state.endpointMisses.filter(item=>item.distance>3).sort((a,b)=>b.distance-a.distance);
  expect(missed.length===0,`${width}: relation endpoints must touch measured card borders (${missed.slice(0,3).map(item=>`${item.id}:${item.distance.toFixed(1)}px[y=${item.y1},svg=${item.svgTop},node=${item.nodeTop}]`).join(', ')})`);
  expect(state.lineWidths.length>0&&state.lineWidths.every(width=>width>=2),`${width}: normal relation lines must be at least 2px`);
  expect(state.minTextContrast>=4.5,`${width}: ordinary text contrast must be at least 4.5:1 (got ${state.minTextContrast.toFixed(2)})`);
  expect(state.minHistoryFontSize>=12,`${width}: historical explanatory copy must be at least 12px (got ${state.minHistoryFontSize}px)`);
  expect(state.sixMinistryGroup,`${width}: six ministries must render as an explicit composition group`);
  expect(state.sixMinistryMemberCount===6,`${width}: six-ministry composition must contain exactly six parallel ministries`);
  expect(state.transmissionOutsideGroup,`${width}: Transmission Office must remain outside the six-ministry composition`);
  expect(state.sixMinistryLabel.includes('合称')&&state.sixMinistryLabel.includes('并列'),`${width}: composition must state that 六部 is a collective term for parallel ministries`);
  expect(state.groupStripeWidth>state.memberStripeWidth,`${width}: composition stripe must be thicker than member stripes`);
  expect(state.parentNodeType==='group',`${width}: 六部 must retain group semantics rather than become a superior institution`);
  expect(state.distorted===0,`${width}: Chinese text must not be horizontally distorted`);
  expect(state.desktopDisplay!=='none'&&state.mobileDisplay==='none',`${width}: desktop must use the palace stage only`);
}

await page.setViewportSize({width:1440,height:1000});
await page.goto(url,{waitUntil:'domcontentloaded'});
await page.screenshot({path:path.join(root,'制度馆_双视角切换_权力空间.png'),fullPage:false});
const interaction=await page.evaluate(async()=>{
  const roomTrigger=document.querySelector('[data-room-trigger="royal_east_palace_room"]');
  roomTrigger.focus();roomTrigger.click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const room=document.querySelector('[data-room="royal_east_palace_room"]');
  const roomFocus=room.contains(document.activeElement);
  const card=room.querySelector('[data-id="imperial_clan_court"]');
  card.focus();card.click();await new Promise(resolve=>requestAnimationFrame(resolve));
  const drawer=document.querySelector('.institution-dossier');
  const drawerOpen=drawer.getAttribute('aria-hidden')==='false';
  const drawerFocus=drawer.contains(document.activeElement);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const dossierFocusReturned=document.activeElement===card;
  card.click();window.setPalaceYear(1370);await new Promise(resolve=>requestAnimationFrame(resolve));
  const historicalTrace=drawer.classList.contains('historical-trace');
  window.setPalaceYear(1600);window.closeInstitutionDossier();
  window.closeInstitutionRoom();await new Promise(resolve=>requestAnimationFrame(resolve));
  const roomFocusReturned=document.activeElement===roomTrigger;
  roomTrigger.click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const focusedLineWidth=Math.max(0,...[...document.querySelectorAll('.relation-line.is-focus')].map(line=>parseFloat(getComputedStyle(line).strokeWidth)));
  return {roomFocus,drawerOpen,drawerFocus,dossierFocusReturned,historicalTrace,roomFocusReturned,focusedLineWidth,year:Number(document.querySelector('#palaceYearValue').textContent)};
});
expect(interaction.roomFocus,'opening a room must move focus into that room');
expect(interaction.drawerOpen&&interaction.drawerFocus,'institution dossier must open and receive focus');
expect(interaction.dossierFocusReturned,'Escape must close dossier and return focus to institution card');
expect(interaction.historicalTrace,'inactive selected institution must become a historical trace');
expect(interaction.roomFocusReturned,'closing a room must return focus to its trigger');
expect(interaction.focusedLineWidth>=3,'focused relations must be at least 3px');
expect(interaction.year===1600,'global year state must return to 1600');

const palaceSwitchState=await page.evaluate(()=>{window.setPalaceYear(1425);const href=document.querySelector('.institution-view-switch a[data-mode="graph"]')?.getAttribute('href')||'';window.setPalaceYear(1600);return href});
expect(new URL(palaceSwitchState||'institutions.html',url).searchParams.get('year')==='1425','palace-to-graph switch must preserve the selected year');

await page.goto(url,{waitUntil:'domcontentloaded'});
await page.locator('.room-approach').scrollIntoViewIfNeeded();
await page.screenshot({path:path.join(root,'制度馆C版_桌面预览.png'),fullPage:false});
await page.locator('.axis-cluster[data-system="civil_administration"]').screenshot({path:path.join(root,'制度馆C版_六部组成关系.png')});

await page.setViewportSize({width:390,height:844});
await page.goto(url,{waitUntil:'domcontentloaded'});
await page.screenshot({path:path.join(root,'制度馆C版_移动预览.png'),fullPage:false});
const mobile=await page.evaluate(async()=>{
  const stage=getComputedStyle(document.querySelector('.palace-stage')).display;
  const chapters=document.querySelector('.mobile-room-chapters');
  const chapterDisplay=getComputedStyle(chapters).display;
  const trigger=chapters.querySelector('[data-mobile-room-trigger="inner_court"]');
  trigger.click();await new Promise(resolve=>requestAnimationFrame(resolve));
  const expanded=trigger.getAttribute('aria-expanded')==='true';
  const card=chapters.querySelector('[data-id="directorate_ceremonial"]');
  card.click();await new Promise(resolve=>requestAnimationFrame(resolve));
  const drawer=document.querySelector('.institution-dossier').getBoundingClientRect();
  const historyCopy=[...document.querySelectorAll('.mobile-institution small,.mobile-room-body details p,.mobile-sublist span')];
  return {stage,chapterDisplay,chapters:chapters.querySelectorAll('.mobile-room-chapter').length,expanded,drawerRatio:drawer.height/innerHeight,overflow:document.body.scrollWidth>innerWidth,minHistoryFontSize:Math.min(...historyCopy.map(element=>parseFloat(getComputedStyle(element).fontSize)))};
});
expect(mobile.stage==='none'&&mobile.chapterDisplay!=='none','mobile must replace freeform stage with narrative chapters');
expect(mobile.chapters===5,'mobile must expose five room chapters');
expect(mobile.expanded,'mobile room chapter must expand inline');
expect(mobile.drawerRatio<=.82,'mobile dossier must not exceed 82% of viewport height');
expect(!mobile.overflow,'mobile page must not overflow horizontally');
expect(mobile.minHistoryFontSize>=12,`mobile historical explanatory copy must be at least 12px (got ${mobile.minHistoryFontSize}px)`);

const reduced=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await reduced.goto(url,{waitUntil:'domcontentloaded'});
const reducedDuration=await reduced.locator('.institution-room').first().evaluate(element=>getComputedStyle(element).transitionDuration);
expect(reducedDuration==='0s'||reducedDuration==='0.001s','reduced motion must remove positional transitions');
await reduced.close();
await browser.close();

if(failures.length){
  console.error(`Institution palace verification failed (${failures.length}):`);
  for(const failure of failures)console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Institution palace verification passed: 45 nodes, 64 relations, five rooms, desktop/mobile/focus/geometry contracts.');
