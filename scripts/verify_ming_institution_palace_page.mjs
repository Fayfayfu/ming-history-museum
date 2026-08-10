import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const file=path.join(root,'institutions.html');
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};

try{await fs.access(file);}catch{
  console.error('Institution palace verification failed (1):\n- institutions.html must be generated as the unified institution hall');
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
      navBackground:document.querySelector('.museum-nav')?getComputedStyle(document.querySelector('.museum-nav')).backgroundColor:'',
      activeInstitutionNav:document.querySelector('.museum-links a.active')?.getAttribute('href'),
      displaySwitches:document.querySelectorAll('.institution-display-switch button').length,
      activeDisplay:document.querySelector('.institution-display-switch button[aria-selected="true"]')?.dataset.display,
      displayPanels:document.querySelectorAll('.institution-display-panel').length,
      palacePanelHidden:document.querySelector('[data-display-panel="palace"]')?.hidden,
      graphPanelHidden:document.querySelector('[data-display-panel="graph"]')?.hidden,
      graphFrameSrc:document.querySelector('.institution-graph-frame')?.getAttribute('src')||'',
      globalTimeDesks:document.querySelectorAll('.time-desk').length,
      timeDeskInsideDisplayPanel:Boolean(document.querySelector('.time-desk')?.closest('[data-display-panel]')),
      timeDeskStickyTop:parseFloat(getComputedStyle(document.querySelector('.time-desk')).top),
      developmentCopy:/B\s*版|C\s*版|返回明代官制档案|版本号/.test(document.body.textContent),
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
      desktopDisplay:document.querySelector('.palace-stage')?getComputedStyle(document.querySelector('.palace-stage')).display:'missing',
      mobileDisplay:document.querySelector('.mobile-room-chapters')?getComputedStyle(document.querySelector('.mobile-room-chapters')).display:'missing'
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
  expect(state.navBackground.includes('24, 23, 19'),`${width}: the unified hall must use the shared black museum navigation`);
  expect(state.activeInstitutionNav==='institutions.html',`${width}: the shared navigation must keep 制度馆 active`);
  expect(state.displaySwitches===2,`${width}: the unified hall must offer exactly two lower exhibition paths`);
  expect(state.activeDisplay==='palace',`${width}: palace space must be the default exhibition path`);
  expect(state.displayPanels===2&&!state.palacePanelHidden&&state.graphPanelHidden,`${width}: only the palace panel may be visible initially`);
  expect(state.graphFrameSrc.startsWith('institutions-graph.html?embedded=1'),`${width}: relationship graph must be embedded inside the same hall`);
  expect(state.globalTimeDesks===1&&!state.timeDeskInsideDisplayPanel,`${width}: both exhibition paths must share one global time filter outside their panels`);
  expect(state.timeDeskStickyTop===72,`${width}: shared time filter must remain below the sticky 72px museum navigation`);
  expect(!state.developmentCopy,`${width}: visitor copy must not expose B/C version or return-to-version language`);
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
await page.screenshot({path:path.join(root,'制度馆_统一页面_权力空间.png'),fullPage:false});
const interaction=await page.evaluate(async()=>{
  const roomTrigger=document.querySelector('[data-room-trigger="royal_east_palace_room"]');
  if(!roomTrigger)return {missing:true};
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

const relatedPeople=await page.evaluate(async()=>{
  const inspect=()=>({
    phase:document.querySelector('[data-dossier-people-phase]')?.textContent.trim()||'',
    names:[...document.querySelectorAll('[data-dossier-people] .dossier-person-card b')].map(node=>node.textContent.trim()),
    portraits:[...document.querySelectorAll('[data-dossier-people] .dossier-person-card img')].map(image=>image.getAttribute('src')),
    links:[...document.querySelectorAll('[data-dossier-people] .dossier-person-card')].map(link=>link.getAttribute('href'))
  });
  const trigger=document.querySelector('.canonical-institution[data-id="embroidered_uniform_guard"]');
  window.setPalaceYear(1425);window.openInstitutionDossier('embroidered_uniform_guard',trigger);await new Promise(resolve=>requestAnimationFrame(resolve));
  const yongle=inspect();
  window.setPalaceYear(1600);await new Promise(resolve=>requestAnimationFrame(resolve));
  const midLate=inspect();
  window.closeInstitutionDossier(false);
  const emperorTrigger=document.querySelector('.canonical-institution[data-id="emperor"]');
  window.setPalaceYear(1370);window.openInstitutionDossier('emperor',emperorTrigger);await new Promise(resolve=>requestAnimationFrame(resolve));
  const emperor={early:inspect()};
  for(const [key,year] of [['lateHongwu',1385],['yongle',1425],['midLate',1600]]){
    window.setPalaceYear(year);await new Promise(resolve=>requestAnimationFrame(resolve));emperor[key]=inspect();
  }
  window.closeInstitutionDossier(false);window.setPalaceYear(1600);
  return {yongle,midLate,emperor};
});
expect(relatedPeople.yongle.phase.includes('永乐至宣德'),'institution dossier must label the current four-phase period');
expect(relatedPeople.yongle.names.includes('朱棣')&&relatedPeople.yongle.names.includes('纪纲')&&!relatedPeople.yongle.names.includes('陆炳'),'Yongle–Xuande drawer must show only institution-linked people whose key tenure overlaps that phase');
expect(relatedPeople.midLate.names.includes('钱宁')&&relatedPeople.midLate.names.includes('陆炳')&&relatedPeople.midLate.names.includes('田尔耕')&&!relatedPeople.midLate.names.includes('纪纲'),'mid/late-Ming drawer must replace earlier cards with people whose key tenure overlaps that phase');
expect(relatedPeople.midLate.names.length>0&&relatedPeople.midLate.portraits.length===relatedPeople.midLate.names.length&&relatedPeople.midLate.portraits.every(src=>src?.startsWith('assets/portraits/')),'every related person card must use the existing人物馆 portrait asset');
expect(relatedPeople.midLate.links.length===relatedPeople.midLate.names.length&&relatedPeople.midLate.links.every(href=>href?.startsWith('people.html?person=')),'related person cards must link to their人物馆 records');
expect(JSON.stringify(relatedPeople.emperor.early.names)===JSON.stringify(['朱元璋']),'early Hongwu emperor dossier must show Zhu Yuanzhang');
expect(JSON.stringify(relatedPeople.emperor.lateHongwu.names)===JSON.stringify(['朱元璋','朱允炆','朱棣']),'late Hongwu-Jianwen emperor dossier must replace cards with the three overlapping reigns');
expect(JSON.stringify(relatedPeople.emperor.yongle.names)===JSON.stringify(['朱棣','朱高炽','朱瞻基','朱祁镇']),'Yongle-Xuande emperor dossier must include Zhu Qizhen because his first reign begins in 1435');
expect(JSON.stringify(relatedPeople.emperor.midLate.names)===JSON.stringify(['朱祁镇','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校','朱由检']),'mid-late Ming emperor dossier must include Zhu Qizhen and all later rulers');
expect(Object.values(relatedPeople.emperor).every(period=>period.portraits.length===period.names.length&&period.portraits.every(src=>src?.startsWith('assets/portraits/'))),'all emperor dossier cards must reuse registered 人物馆 portraits');

await page.evaluate(()=>{window.setPalaceYear(1425);window.openInstitutionDossier('embroidered_uniform_guard',document.querySelector('.canonical-institution[data-id="embroidered_uniform_guard"]'))});
await page.waitForTimeout(320);
await page.screenshot({path:path.join(root,'制度馆_机构档案_锦衣卫_永乐宣德.png'),fullPage:false});
await page.evaluate(()=>window.setPalaceYear(1600));
await page.waitForTimeout(80);
await page.screenshot({path:path.join(root,'制度馆_机构档案_锦衣卫_明中后期.png'),fullPage:false});
await page.evaluate(()=>window.closeInstitutionDossier(false));

const displaySwitchState=await page.evaluate(async()=>{
  const nav=document.querySelector('.museum-nav'),intro=document.querySelector('.palace-intro'),timeDesk=document.querySelector('.time-desk');
  const graphButton=document.querySelector('.institution-display-switch [data-display="graph"]');
  if(!graphButton)return {missing:true,pathname:location.pathname};
  graphButton.click();await new Promise(resolve=>requestAnimationFrame(resolve));
  const graphPanel=document.querySelector('[data-display-panel="graph"]');
  const graphState={pathname:location.pathname,navSame:nav===document.querySelector('.museum-nav'),introSame:intro===document.querySelector('.palace-intro'),timeDeskSame:timeDesk===document.querySelector('.time-desk'),timeDeskVisible:timeDesk.getClientRects().length>0,graphVisible:!graphPanel.hidden,palaceHidden:document.querySelector('[data-display-panel="palace"]').hidden,selected:graphButton.getAttribute('aria-selected')};
  document.querySelector('.institution-display-switch [data-display="palace"]').click();await new Promise(resolve=>requestAnimationFrame(resolve));
  return {...graphState,palaceRestored:!document.querySelector('[data-display-panel="palace"]').hidden};
});
expect(displaySwitchState.pathname.endsWith('/institutions.html'),'display switch must stay on the same institution page');
expect(displaySwitchState.navSame&&displaySwitchState.introSame,'shared navigation and curatorial introduction must remain mounted while switching');
expect(displaySwitchState.timeDeskSame&&displaySwitchState.timeDeskVisible,'the same global time filter must remain visible while switching paths');
expect(displaySwitchState.graphVisible&&displaySwitchState.palaceHidden&&displaySwitchState.selected==='true','relationship graph must replace only the lower exhibition panel');
expect(displaySwitchState.palaceRestored,'palace panel must be restorable without page navigation');

await page.locator('.institution-display-switch [data-display="graph"]').click();
await page.waitForTimeout(120);
await page.locator('.institution-display-switch').scrollIntoViewIfNeeded();
const graphFrame=page.frames().find(frame=>frame.url().includes('institutions-graph.html'));
const embeddedGraph=graphFrame?await graphFrame.evaluate(()=>({navDisplay:getComputedStyle(document.querySelector('.museum-nav')).display,titleDisplay:getComputedStyle(document.querySelector('.hero-title')).display,rulerDisplay:getComputedStyle(document.querySelector('.dynasty-ruler')).display,overflow:document.body.scrollWidth>innerWidth})):null;
expect(embeddedGraph?.navDisplay==='none'&&embeddedGraph?.titleDisplay==='none','embedded relationship graph must not repeat the shared navigation or curatorial hero');
expect(embeddedGraph?.rulerDisplay==='none'&&!embeddedGraph?.overflow,'embedded relationship graph must use the hall-level time filter instead of rendering a second ruler');
await page.evaluate(()=>document.querySelector('.phase-presets [data-year="1425"]')?.click());
await page.waitForTimeout(80);
const sharedYear=graphFrame?await graphFrame.evaluate(()=>Number(document.querySelector('#yearValue')?.textContent)):null;
expect(await page.locator('#palaceYearValue').textContent()==='1425'&&sharedYear===1425,'the global time filter must update both palace and relationship-graph state');
await page.evaluate(()=>document.querySelector('.phase-presets [data-year="1600"]')?.click());
await page.screenshot({path:path.join(root,'制度馆_统一页面_关系图谱.png'),fullPage:false});
await page.locator('.institution-display-switch [data-display="palace"]').click();

await page.goto(url,{waitUntil:'domcontentloaded'});
await page.locator('.room-approach').scrollIntoViewIfNeeded();
await page.screenshot({path:path.join(root,'制度馆_权力空间_桌面预览.png'),fullPage:false});
await page.locator('.axis-cluster[data-system="civil_administration"]').screenshot({path:path.join(root,'制度馆_六部组成关系.png')});

await page.setViewportSize({width:390,height:844});
await page.goto(url,{waitUntil:'domcontentloaded'});
await page.screenshot({path:path.join(root,'制度馆_权力空间_移动预览.png'),fullPage:false});
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

await page.keyboard.press('Escape');
await page.locator('.institution-display-switch [data-display="graph"]').click();
await page.waitForTimeout(120);
const mobileDisplaySwitch=await page.evaluate(()=>({
  pathname:location.pathname,
  graphVisible:!document.querySelector('[data-display-panel="graph"]')?.hidden,
  palaceHidden:document.querySelector('[data-display-panel="palace"]')?.hidden,
  selected:document.querySelector('.institution-display-switch [data-display="graph"]')?.getAttribute('aria-selected'),
  timeDeskVisible:document.querySelector('.time-desk')?.getClientRects().length>0,
  overflow:document.body.scrollWidth>innerWidth
}));
const mobileGraphFrame=page.frames().find(frame=>frame.url().includes('institutions-graph.html'));
const mobileEmbeddedGraph=mobileGraphFrame?await mobileGraphFrame.evaluate(()=>({
  navDisplay:getComputedStyle(document.querySelector('.museum-nav')).display,
  titleDisplay:getComputedStyle(document.querySelector('.hero-title')).display,
  rulerDisplay:getComputedStyle(document.querySelector('.dynasty-ruler')).display,
  overflow:document.body.scrollWidth>innerWidth
})):null;
expect(mobileDisplaySwitch.pathname.endsWith('/institutions.html'),'mobile display switch must stay on the same institution page');
expect(mobileDisplaySwitch.graphVisible&&mobileDisplaySwitch.palaceHidden&&mobileDisplaySwitch.selected==='true','mobile relationship graph must replace only the lower exhibition panel');
expect(mobileDisplaySwitch.timeDeskVisible,'mobile paths must share the same visible global time filter');
expect(!mobileDisplaySwitch.overflow,'mobile unified hall must remain free of horizontal overflow after switching');
expect(mobileEmbeddedGraph?.navDisplay==='none'&&mobileEmbeddedGraph?.titleDisplay==='none','mobile embedded graph must not repeat the shared navigation or curatorial hero');
expect(mobileEmbeddedGraph?.rulerDisplay==='none'&&!mobileEmbeddedGraph?.overflow,'mobile embedded graph must use the hall-level time filter without a duplicate ruler');
await page.locator('.institution-display-switch').scrollIntoViewIfNeeded();
await page.screenshot({path:path.join(root,'制度馆_统一页面_移动关系图谱.png'),fullPage:false});

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
