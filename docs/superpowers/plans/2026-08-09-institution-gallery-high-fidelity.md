# Institution Gallery High-Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the institution gallery as a high-fidelity dark “imperial power atlas” with a semantic central axis, time ruler, focused relationship exploration, overlay dossier drawer, and a separate mobile narrative layout.

**Architecture:** Keep the verified institution JSON as the only historical data source. Extract semantic coordinates and person mapping into a small layout module, render the static page through a focused renderer, and leave the build script responsible only for reading, validating, and writing files. The generated page uses plain HTML, CSS, SVG, and JavaScript with explicit state for year, view, hovered node, and selected node.

**Tech Stack:** Node.js ESM, static HTML/CSS/JavaScript, SVG paths, Playwright with local Google Chrome, existing JSON data and npm scripts.

## Global Constraints

- Preserve exactly 29 institution nodes, 47 relations, 4 macro phases, 6 views, and 16 sources.
- Do not add a front-end framework, remote font, runtime network dependency, or new historical claim.
- Use ink black, charred black, old-paper white, cinnabar, muted gold, stone blue, ochre, dark purple, and blue-green; no neon glow, glassmorphism, or purple technology gradient.
- Keep institution existence, relation direction, view membership, confidence, sources, and people links in the current JSON data.
- Desktop uses the semantic atlas; viewports at or below 800px use the mobile narrative structure and must not show a shrunken network.
- The dossier drawer overlays the atlas without changing graph dimensions or node coordinates.
- Support keyboard operation, Escape-to-close, focus return, and `prefers-reduced-motion`.
- Preserve the explicit western-depot evidence boundary: “阶段内反复设置” and “不得伪造”.
- Do not stage or commit unrelated dirty-worktree changes.

---

## File Map

- Create `scripts/lib/institution_atlas_layout.mjs`: canonical person-ID mapping, semantic regions, normalized desktop coordinates, and layout validation.
- Create `scripts/lib/render_institution_gallery.mjs`: pure `renderInstitutionGallery()` function containing the high-fidelity page HTML, CSS, and client runtime.
- Modify `scripts/build_ming_institutions.mjs`: reduce to data loading, mapping, validation, rendering, and output writing.
- Create `scripts/verify_ming_institution_layout.mjs`: fast non-browser test for all semantic layout contracts.
- Modify `scripts/verify_ming_institution_page.mjs`: browser-level visual structure, interaction, accessibility, and responsive assertions.
- Modify `package.json`: add `verify:institution-layout` without changing existing scripts.
- Regenerate `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/institutions.html` and preview screenshots through the build and verification commands.

---

### Task 1: Lock the Semantic Atlas Layout Contract

**Files:**
- Create: `scripts/lib/institution_atlas_layout.mjs`
- Create: `scripts/verify_ming_institution_layout.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `graph.institutions: Institution[]` and `personInstitutions.institutions: PersonInstitution[]`.
- Produces: `ATLAS_LAYOUT: Record<string, {x:number,y:number,region:string,tier:number}>`, `INSTITUTION_ID_MAP: Record<string,string>`, `buildPeopleByInstitution(data): Record<string,PersonLink[]>`, and `validateAtlasLayout(graph, layout): string[]`.

- [ ] **Step 1: Write the failing semantic-layout verifier**

Create `scripts/verify_ming_institution_layout.mjs` with exact structural assertions:

```js
import fs from 'node:fs/promises';
import {ATLAS_LAYOUT, validateAtlasLayout} from './lib/institution_atlas_layout.mjs';

const graph=JSON.parse(await fs.readFile('data/ming_institution_graph.json','utf8'));
const failures=validateAtlasLayout(graph,ATLAS_LAYOUT);
const expect=(condition,message)=>{if(!condition)failures.push(message)};

expect(Object.keys(ATLAS_LAYOUT).length===29,'layout must cover exactly 29 nodes');
expect(ATLAS_LAYOUT.emperor.x===50&&ATLAS_LAYOUT.emperor.y<12,'emperor must anchor the upper central axis');
expect(ATLAS_LAYOUT.grand_secretariat.x===50,'grand secretariat must remain on the central axis');
expect(ATLAS_LAYOUT.six_ministries.x===50,'six ministries group must remain on the central axis');
expect(ATLAS_LAYOUT.censorate.x<35,'censorate must occupy the supervision wing');
expect(ATLAS_LAYOUT.directorate_ceremonial.x>65,'directorate of ceremonial must occupy the inner-court wing');
expect(ATLAS_LAYOUT.prefecture_subprefecture_county.y>75,'prefecture hierarchy must occupy the local lower tier');

if(failures.length){
  console.error(`Institution layout verification failed (${failures.length}):`);
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Institution atlas layout verification passed: 29 semantic positions and central-axis constraints.');
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `node scripts/verify_ming_institution_layout.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `institution_atlas_layout.mjs`.

- [ ] **Step 3: Implement the layout module**

Create `scripts/lib/institution_atlas_layout.mjs`. Use normalized percentages so relationship rendering remains responsive:

```js
export const INSTITUTION_ID_MAP=Object.freeze({
  jinyiwei:'embroidered_uniform_guard',dongchang:'eastern_depot',xichang:'western_depot',
  silijian:'directorate_ceremonial',cabinet:'grand_secretariat',censorate:'censorate',
  'ministry-personnel':'ministry_personnel','ministry-revenue':'ministry_revenue',
  'ministry-rites':'ministry_rites','ministry-war':'ministry_war',
  'ministry-justice':'ministry_justice','ministry-works':'ministry_works'
});

export const ATLAS_LAYOUT=Object.freeze({
  emperor:{x:50,y:7,region:'axis',tier:0},
  central_secretariat:{x:50,y:20,region:'axis',tier:1},chancellor:{x:39,y:20,region:'axis',tier:1},
  grand_secretariat:{x:50,y:20,region:'axis',tier:1},
  six_ministries:{x:50,y:34,region:'axis',tier:2},
  ministry_personnel:{x:34,y:47,region:'civil',tier:3},ministry_revenue:{x:41,y:47,region:'civil',tier:3},
  ministry_rites:{x:47,y:47,region:'civil',tier:3},ministry_war:{x:53,y:47,region:'civil',tier:3},
  ministry_justice:{x:59,y:47,region:'civil',tier:3},ministry_works:{x:66,y:47,region:'civil',tier:3},
  transmission_office:{x:38,y:33,region:'civil',tier:2},
  censorate_platform:{x:14,y:23,region:'supervision',tier:1},censorate:{x:14,y:23,region:'supervision',tier:1},
  six_offices:{x:25,y:34,region:'supervision',tier:2},court_judicial_review:{x:17,y:49,region:'supervision',tier:3},
  three_judicial_offices:{x:25,y:49,region:'supervision',tier:3},
  directorate_ceremonial:{x:75,y:22,region:'inner',tier:1},embroidered_uniform_guard:{x:86,y:33,region:'inner',tier:2},
  eastern_depot:{x:75,y:39,region:'inner',tier:2},western_depot:{x:88,y:48,region:'inner',tier:3},
  chief_military_commission:{x:40,y:62,region:'military',tier:4},five_commissions:{x:46,y:62,region:'military',tier:4},
  guard_battalion_system:{x:54,y:70,region:'military',tier:5},
  provincial_admin_commission:{x:27,y:82,region:'local',tier:6},provincial_surveillance_commission:{x:42,y:82,region:'local',tier:6},
  regional_military_commission:{x:58,y:82,region:'local',tier:6},grand_coordinator_supreme_commander:{x:73,y:82,region:'local',tier:6},
  prefecture_subprefecture_county:{x:50,y:93,region:'local',tier:7}
});

export function buildPeopleByInstitution(data){
  return Object.fromEntries(data.institutions.flatMap(item=>{
    const graphId=INSTITUTION_ID_MAP[item.id];
    return graphId?[[graphId,item.people]]:[];
  }));
}

export function validateAtlasLayout(graph,layout=ATLAS_LAYOUT){
  const failures=[];const ids=new Set(graph.institutions.map(item=>item.id));
  for(const id of ids){
    const point=layout[id];
    if(!point)failures.push(`${id}: missing semantic position`);
    else if(point.x<5||point.x>95||point.y<4||point.y>96)failures.push(`${id}: position outside safe canvas`);
  }
  for(const id of Object.keys(layout))if(!ids.has(id))failures.push(`${id}: layout references unknown institution`);
  return failures;
}
```

- [ ] **Step 4: Add and run the npm verifier**

Add to `package.json`:

```json
"verify:institution-layout": "node scripts/verify_ming_institution_layout.mjs"
```

Run: `npm run verify:institution-layout`  
Expected: PASS with 29 semantic positions.

- [ ] **Step 5: Commit only Task 1 files**

```bash
git add scripts/lib/institution_atlas_layout.mjs scripts/verify_ming_institution_layout.mjs package.json
git commit -m "test: define institution atlas layout contract"
```

---

### Task 2: Extend the Browser Test for the High-Fidelity Contract

**Files:**
- Modify: `scripts/verify_ming_institution_page.mjs`

**Interfaces:**
- Consumes: generated `institutions.html`, existing `setInstitutionYear(year)`, and node `data-id` values.
- Produces: browser assertions for the ruler, semantic axis, topic rail, focus behavior, overlay drawer, mobile narrative, and reduced motion.

- [ ] **Step 1: Add failing desktop structure assertions**

Extend the initial `page.evaluate()` result with:

```js
hasRuler:Boolean(document.querySelector('.dynasty-ruler')),
hasAxis:Boolean(document.querySelector('.imperial-axis')),
hasTopicRail:Boolean(document.querySelector('.topic-rail')),
legacyControlDeck:document.querySelectorAll('.control-deck').length,
drawerHidden:document.querySelector('.institution-drawer')?.hidden,
heroHeight:document.querySelector('.hall-hero')?.getBoundingClientRect().height,
emperorBox:document.querySelector('[data-id="emperor"]')?.getBoundingClientRect().toJSON(),
cabinetBox:document.querySelector('[data-id="grand_secretariat"]')?.getBoundingClientRect().toJSON()
```

Add assertions:

```js
expect(initial.hasRuler,'high-fidelity page must expose the dynasty ruler');
expect(initial.hasAxis,'high-fidelity page must expose the imperial axis');
expect(initial.hasTopicRail,'topic views must move into a narrow rail');
expect(initial.legacyControlDeck===0,'legacy dashboard control deck must be removed');
expect(initial.drawerHidden===true,'institution dossier drawer must start closed');
expect(initial.heroHeight>=500&&initial.heroHeight<=780,'desktop hero must occupy the intended editorial range');
expect(Math.abs((initial.emperorBox.x+initial.emperorBox.width/2)-(initial.cabinetBox.x+initial.cabinetBox.width/2))<8,'emperor and cabinet must share the central axis');
```

- [ ] **Step 2: Add failing focus and drawer assertions**

After opening the embroidered-uniform-guard node, capture graph geometry and drawer state:

```js
const before=await page.locator('.graph-stage').boundingBox();
await page.locator('.institution-node[data-id="embroidered_uniform_guard"]').click();
const drawer=page.locator('.institution-drawer');
expect(await drawer.getAttribute('aria-hidden')==='false','node click must open dossier drawer');
expect(await page.locator('.institution-node.is-dimmed').count()>0,'node focus must dim unrelated nodes');
expect(await page.locator('.relation-path.is-focused').count()>0,'node focus must highlight adjacent relations');
const after=await page.locator('.graph-stage').boundingBox();
expect(before?.width===after?.width&&before?.height===after?.height,'drawer must not reflow the atlas');
await page.keyboard.press('Escape');
expect(await drawer.getAttribute('aria-hidden')==='true','Escape must close dossier drawer');
```

- [ ] **Step 3: Add failing mobile and reduced-motion assertions**

For 390×844, assert `.mobile-structure` is visible, `.graph-stage` is hidden, `.institution-drawer` uses fixed positioning, and the body does not overflow. Open a mobile institution and assert the drawer reaches at least 75% of viewport height.

Create a reduced-motion page before browser shutdown:

```js
const reduced=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await reduced.goto(url('institutions.html'),{waitUntil:'networkidle'});
const transition=await reduced.locator('.institution-node').first().evaluate(node=>getComputedStyle(node).transitionDuration);
expect(transition==='0s','reduced-motion mode must remove node transitions');
await reduced.close();
```

- [ ] **Step 4: Run the page verifier and confirm RED**

Run outside the sandbox if Chrome is blocked: `npm run verify:institution-page`  
Expected: FAIL for missing `.dynasty-ruler`, `.imperial-axis`, `.topic-rail`, and `.institution-drawer`.

- [ ] **Step 5: Commit only the failing browser contract**

```bash
git add scripts/verify_ming_institution_page.mjs
git commit -m "test: specify high fidelity institution gallery"
```

---

### Task 3: Refactor the Generator and Build the Editorial Shell

**Files:**
- Create: `scripts/lib/render_institution_gallery.mjs`
- Modify: `scripts/build_ming_institutions.mjs`

**Interfaces:**
- Consumes: `graph`, `peopleByInstitution`, and `ATLAS_LAYOUT`.
- Produces: `renderInstitutionGallery({graph,peopleByInstitution,layout}): string` and generated `institutions.html` with stable selectors required by Task 2.

- [ ] **Step 1: Replace builder-owned mapping with the layout module**

Reduce `scripts/build_ming_institutions.mjs` to this responsibility boundary:

```js
import fs from 'node:fs/promises';
import {ATLAS_LAYOUT,buildPeopleByInstitution,validateAtlasLayout} from './lib/institution_atlas_layout.mjs';
import {renderInstitutionGallery} from './lib/render_institution_gallery.mjs';

const root='outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const graph=JSON.parse(await fs.readFile('data/ming_institution_graph.json','utf8'));
const personInstitutions=JSON.parse(await fs.readFile('data/ming_person_institutions.json','utf8'));
const failures=validateAtlasLayout(graph,ATLAS_LAYOUT);
if(failures.length)throw new Error(`Invalid institution atlas layout:\n${failures.join('\n')}`);
const html=renderInstitutionGallery({graph,peopleByInstitution:buildPeopleByInstitution(personInstitutions),layout:ATLAS_LAYOUT});
await fs.mkdir(root,{recursive:true});
await fs.writeFile(`${root}/institutions.html`,html,'utf8');
console.log(`wrote institutions.html with ${graph.institutions.length} nodes and ${graph.relations.length} relations`);
```

- [ ] **Step 2: Implement the pure renderer’s document shell**

Create `render_institution_gallery.mjs` exporting the exact signature:

```js
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

export function renderInstitutionGallery({graph,peopleByInstitution,layout}){
  const payload=JSON.stringify({...graph,people_by_institution:peopleByInstitution,atlas_layout:layout}).replaceAll('</script>','<\\/script>');
  return `<!doctype html><html lang="zh-CN"><head>${renderHead()}</head><body>
    ${renderMuseumNav()}
    <main id="main">
      ${renderHero(graph)}
      ${renderAtlas(graph,layout)}
      ${renderDrawer()}
    </main>
    <script id="institutionGraphData" type="application/json">${payload}</script>
    <script>${clientRuntime()}</script>
  </body></html>`;
}
```

The helper output must include these stable structures:

```html
<header class="hall-hero">
  <div class="hero-title"><span>INSTITUTION GALLERY · 1368—1644</span><h1>大明如何运转</h1><p>沿皇权中轴观察中枢、外廷、监察、内廷、军事与地方治理。</p></div>
  <div class="hero-year"><output id="yearValue">1600</output><b id="phaseName">正统至崇祯</b><p id="phaseSummary">票拟、批红、督抚和厂卫关系随年份变化。</p></div>
  <div class="dynasty-ruler"><button class="phase-button" data-phase="early_hongwu">洪武前期</button><button class="phase-button" data-phase="late_hongwu_jianwen">洪武后期至建文</button><button class="phase-button" data-phase="yongle_xuande">永乐至宣德</button><button class="phase-button" data-phase="mid_late_ming">正统至崇祯</button><input id="yearRange" type="range" min="1368" max="1644" value="1600"></div>
</header>
<section class="atlas-shell">
  <nav class="topic-rail" aria-label="制度阅读问题"><button class="view-button" data-view="overview">国家机器</button><button class="view-button" data-view="document_to_decree">奏章成令</button><button class="view-button" data-view="supervision_officials">谁监督官员</button><button class="view-button" data-view="justice_vs_imperial_prison">三法司与诏狱</button><button class="view-button" data-view="military_command">谁来调兵</button><button class="view-button" data-view="central_local">中央与地方</button></nav>
  <div class="atlas-field">
    <header class="view-band"><h2 id="viewTitle">明朝国家机器总览</h2><p id="viewQuestion">明朝国家机器由哪些系统构成？</p></header>
    <div class="graph-stage"><div class="imperial-axis" aria-hidden="true"></div><svg class="relation-layer" viewBox="0 0 100 100" preserveAspectRatio="none"><g id="relationPaths"></g></svg><div id="institutionNodes"></div></div>
    <div class="mobile-structure" id="mobileStructure"></div>
  </div>
</section>
<aside class="institution-drawer" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="detailTitle" hidden><button class="drawer-close" type="button" aria-label="关闭机构档案">关闭</button><h2 id="detailTitle">机构档案</h2><p id="detailState"></p><p id="detailSummary"></p><p id="detailBoundary"></p><p id="detailConfidence"></p><div id="detailPeople"></div><ul id="detailSources"></ul></aside>
```

- [ ] **Step 3: Implement the high-fidelity editorial CSS**

Use a dominant ink field with one vertical gold axis and asymmetrical wings. Critical contracts:

```css
.hall-hero{min-height:clamp(500px,72vh,760px);display:grid;grid-template-columns:1.25fr .75fr;grid-template-rows:1fr auto;padding:clamp(70px,9vh,120px) clamp(24px,6vw,96px) 34px;background:radial-gradient(circle at 73% 35%,rgba(175,132,55,.11),transparent 24rem),#12110e}
.dynasty-ruler{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line)}
.atlas-shell{display:grid;grid-template-columns:176px minmax(0,1fr);min-height:980px;border-top:1px solid var(--line)}
.topic-rail{position:sticky;top:72px;align-self:start;display:grid;background:#171511;border-right:1px solid var(--line)}
.graph-stage{height:900px;position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 0,rgba(184,145,72,.07),transparent 43%),#11100d}
.imperial-axis{position:absolute;left:50%;top:3%;bottom:4%;width:1px;background:linear-gradient(transparent,var(--gold) 12%,rgba(181,138,60,.16) 85%,transparent)}
.institution-node{position:absolute;left:calc(var(--x)*1%);top:calc(var(--y)*1%);transform:translate(-50%,-50%);transition:opacity .22s ease,transform .22s ease,border-color .22s ease}
.institution-node[data-region="axis"]{border-color:rgba(197,160,87,.8)}
.institution-node.is-dimmed{opacity:.18}.institution-node.is-focused{z-index:8;transform:translate(-50%,-50%) scale(1.045);border-color:var(--red2)}
.institution-drawer{position:fixed;z-index:90;right:0;top:72px;bottom:0;width:min(430px,92vw);background:var(--paper);color:var(--ink);box-shadow:-24px 0 60px rgba(0,0,0,.38)}
@media(max-width:800px){.atlas-shell{display:block}.topic-rail{position:static;display:flex;overflow:auto}.graph-stage{display:none}.mobile-structure{display:block}.institution-drawer{top:auto;width:100%;height:min(88svh,760px)}}
@media(prefers-reduced-motion:reduce){.institution-node,.institution-drawer{transition-duration:0s!important;animation:none!important}}
```

- [ ] **Step 4: Build and confirm the structural subset turns GREEN**

Run: `npm run build:museum`  
Run: `npm run verify:institution-layout`  
Run: `npm run verify:institution-page`  
Expected: layout and editorial shell checks pass; focus/drawer checks may remain red until Task 4.

- [ ] **Step 5: Commit only the renderer refactor**

```bash
git add scripts/build_ming_institutions.mjs scripts/lib/render_institution_gallery.mjs
git commit -m "feat: rebuild institution gallery shell"
```

---

### Task 4: Implement Atlas State, Relationships, Focus, and Drawer

**Files:**
- Modify: `scripts/lib/render_institution_gallery.mjs`

**Interfaces:**
- Consumes: embedded `graph.atlas_layout`, DOM selectors from Task 3, and the state object below.
- Produces: `window.setInstitutionYear(year)`, `renderAtlas()`, `setFocus(id|null)`, `openDrawer(id)`, and `closeDrawer()`.

- [ ] **Step 1: Define one explicit client state object**

Use this exact shape in the generated client runtime:

```js
const state={year:1600,view:'overview',hoveredNode:null,selectedNode:null,lastTrigger:null};
const institutionById=new Map(graph.institutions.map(item=>[item.id,item]));
const relationById=new Map(graph.relations.map(item=>[item.id,item]));
const sourceById=new Map(graph.sources.map(item=>[item.id,item]));
const systemById=new Map(graph.systems.map(item=>[item.id,item]));
```

- [ ] **Step 2: Render active and contextual nodes**

Do not hide every non-topic node. Separate existence from emphasis:

```js
function activeAt(item,year){return item.active_periods.some(period=>year>=period.start&&year<=period.end)}
function viewRecord(){return graph.views.find(view=>view.id===state.view)}
function renderNodes(){
  const topicIds=new Set(viewRecord().institution_ids);
  for(const button of document.querySelectorAll('.institution-node')){
    const node=institutionById.get(button.dataset.id);
    button.hidden=!activeAt(node,state.year);
    button.classList.toggle('is-context',!topicIds.has(node.id));
    button.classList.toggle('is-focused',node.id===(state.selectedNode||state.hoveredNode));
  }
}
```

- [ ] **Step 3: Draw semantic SVG relationships**

Give every path `.relation-path`, `data-from`, `data-to`, and a relation-type class. Compute endpoints from the normalized layout, not temporary lane indexes:

```js
function pathFor(from,to){
  const a=graph.atlas_layout[from],b=graph.atlas_layout[to];
  const bend=Math.max(4,Math.abs(b.x-a.x)*.28);
  return `M ${a.x} ${a.y} C ${a.x+(b.x>a.x?bend:-bend)} ${a.y}, ${b.x-(b.x>a.x?bend:-bend)} ${b.y}, ${b.x} ${b.y}`;
}
```

Set the SVG `viewBox="0 0 100 100"` and `preserveAspectRatio="none"`. Show relationship labels only when the relationship is focused or the active topic is not `overview`.

- [ ] **Step 4: Implement hover focus and click locking**

Use adjacent-node membership to dim unrelated elements:

```js
function focusIds(id){
  const ids=new Set([id]);
  for(const relation of currentRelations())if(relation.from===id||relation.to===id){ids.add(relation.from);ids.add(relation.to)}
  return ids;
}
function setFocus(id){
  const focus=id?focusIds(id):null;
  document.querySelectorAll('.institution-node').forEach(node=>node.classList.toggle('is-dimmed',Boolean(focus&&!focus.has(node.dataset.id))));
  document.querySelectorAll('.relation-path').forEach(path=>path.classList.toggle('is-focused',Boolean(id&&(path.dataset.from===id||path.dataset.to===id))));
}
```

Pointer enter uses `state.hoveredNode`; pointer leave restores `state.selectedNode`; click sets `state.selectedNode` and opens the drawer.

- [ ] **Step 5: Implement overlay drawer and focus management**

Use stable open/close behavior:

```js
function openDrawer(id,trigger=document.activeElement){
  const node=institutionById.get(id);if(!node)return;
  state.selectedNode=id;state.lastTrigger=trigger;
  populateDrawer(node);
  drawer.hidden=false;drawer.setAttribute('aria-hidden','false');
  document.body.classList.add('drawer-open');
  drawer.querySelector('.drawer-close').focus();setFocus(id);
}
function closeDrawer(){
  drawer.setAttribute('aria-hidden','true');drawer.hidden=true;
  document.body.classList.remove('drawer-open');state.selectedNode=null;setFocus(state.hoveredNode);
  state.lastTrigger?.focus?.();
}
addEventListener('keydown',event=>{if(event.key==='Escape'&&!drawer.hidden)closeDrawer()});
```

Keep existing detail IDs (`detailTitle`, `detailState`, `detailSummary`, `detailBoundary`, `detailConfidence`, `detailPeople`, `detailSources`) so historical assertions remain stable.

- [ ] **Step 6: Run browser verification and confirm GREEN**

Run: `npm run build:museum`  
Run outside the sandbox if needed: `npm run verify:institution-page`  
Expected: PASS for years, views, focus, overlay drawer, people links, Escape close, and fixed graph geometry.

- [ ] **Step 7: Commit only atlas interaction changes**

```bash
git add scripts/lib/render_institution_gallery.mjs
git commit -m "feat: add focused institution atlas interactions"
```

---

### Task 5: Finish Mobile Narrative and Accessibility

**Files:**
- Modify: `scripts/lib/render_institution_gallery.mjs`
- Modify: `scripts/verify_ming_institution_page.mjs` only if a browser assertion requires a selector correction without weakening the requirement.

**Interfaces:**
- Consumes: current active institutions, active view, institution drawer, and mobile media query.
- Produces: grouped mobile sections, bottom dossier, keyboard focus containment, and reduced-motion behavior.

- [ ] **Step 1: Render mobile sections from active data**

Use the same institution records as the desktop graph:

```js
function renderMobile(){
  const root=document.getElementById('mobileStructure');root.replaceChildren();
  const active=graph.institutions.filter(node=>activeAt(node,state.year));
  for(const system of graph.systems){
    const nodes=active.filter(node=>node.system===system.id);if(!nodes.length)continue;
    const section=document.createElement('section');section.className='mobile-system-group';
    section.innerHTML=`<header><small>${system.question}</small><h3>${system.name}</h3></header><div class="mobile-node-list"></div>`;
    for(const node of nodes){
      const button=document.createElement('button');button.type='button';button.className='mobile-node';button.dataset.id=node.id;
      button.innerHTML=`<span>${node.name}</span><small>${node.confidence}置信度 · 查看机构档案</small>`;
      button.addEventListener('click',event=>openDrawer(node.id,event.currentTarget));section.lastElementChild.append(button);
    }
    root.append(section);
  }
}
```

- [ ] **Step 2: Add mobile relation summaries**

For each system group, append at most three active, in-view relations touching that system. Use existing relation labels only; do not generate new historical copy. Mark the list `aria-label="当前关键关系"`.

- [ ] **Step 3: Add drawer focus containment**

On `Tab` inside an open drawer, cycle between `.drawer-close` and the final focusable link. On close, return focus to the node button that opened it. Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="detailTitle"`.

- [ ] **Step 4: Verify mobile and reduced-motion behavior**

Run outside the sandbox if needed: `npm run verify:institution-page`  
Expected: 390px graph hidden, at least four mobile groups, bottom drawer at least 75% viewport height, no horizontal overflow, and transition duration `0s` under reduced motion.

- [ ] **Step 5: Commit only mobile and accessibility changes**

```bash
git add scripts/lib/render_institution_gallery.mjs scripts/verify_ming_institution_page.mjs
git commit -m "feat: refine institution gallery mobile access"
```

---

### Task 6: Full Regression, Visual Review, and Deploy Bundle

**Files:**
- Regenerate: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/institutions.html`
- Regenerate: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/制度馆_桌面预览.png`
- Regenerate: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/制度馆_移动端预览.png`
- Regenerate: `dist/institutions.html`

**Interfaces:**
- Consumes: completed renderer, layout, data, navigation build chain, and verification scripts.
- Produces: verified local museum and deploy bundle.

- [ ] **Step 1: Run the complete deterministic build and data checks**

```bash
npm run build:museum
npm run verify:institution-layout
npm run verify:institutions
```

Expected: builder writes 29 nodes and 47 relations; both layout and graph verifiers pass.

- [ ] **Step 2: Run browser verifiers**

```bash
npm run verify:institution-page
npm run verify
```

Expected: both exit 0. Run outside the sandbox only when local Chrome cannot launch inside it.

- [ ] **Step 3: Inspect three visual breakpoints**

Use browser screenshots or local image inspection at:

- 1440×1000: central axis dominant, no dashboard control deck, drawer overlays without reflow.
- 1024×768: topic rail and node labels remain legible; no horizontal overflow.
- 390×844: mobile narrative replaces graph; bottom drawer remains operable.

Reject the build and revise CSS if labels collide, the central axis is visually weak, or the page resembles a dashboard.

- [ ] **Step 4: Build and inspect the deploy bundle**

```bash
npm run build:deploy
test -f dist/institutions.html
rg -n 'href="institutions.html">制度馆' dist/index.html dist/people.html dist/events.html dist/exhibitions.html
git diff --check
```

Expected: `dist/institutions.html` exists, four main pages link to the institution hall, and `git diff --check` emits no errors.

- [ ] **Step 5: Commit only the final scoped files if generated outputs are tracked**

First inspect `git status --short`. Stage only institution-gallery files that belong to this plan; never stage unrelated portrait, event, or exhibition changes.

```bash
git add scripts/build_ming_institutions.mjs scripts/lib/institution_atlas_layout.mjs scripts/lib/render_institution_gallery.mjs scripts/verify_ming_institution_layout.mjs scripts/verify_ming_institution_page.mjs package.json
git commit -m "feat: deliver high fidelity institution gallery"
```
