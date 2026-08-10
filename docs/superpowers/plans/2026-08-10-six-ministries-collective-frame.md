# Six Ministries Collective Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the misleading clickable “六部” institution card in the relationship graph with a non-interactive collective frame containing the six parallel ministries.

**Architecture:** Keep `six_ministries` as a `group` record and semantic relation endpoint in the 29-node dataset. Render it through a dedicated collective-frame path, use a non-focusable anchor for relation geometry, and keep the six ministry buttons as the only interactive institution nodes. Render an equivalent non-interactive group label in the mobile narrative list.

**Tech Stack:** Node.js ESM build scripts, static HTML/CSS/JavaScript, Playwright regression verification.

## Global Constraints

- Keep the reviewed data baseline at exactly 29 canonical nodes and 47 relations.
- `six_ministries` remains `node_type: "group"`; do not create a new institution or rewrite source data.
- The collective frame must not be clickable, focusable, or capable of opening an institution dossier.
- The six ministries remain individually clickable, equal-height peers in the fixed order 吏、户、礼、兵、刑、工.
- Existing aggregate relations continue to target `six_ministries` through a visual relation anchor; do not fan them out into six unsupported duplicate relations.
- Desktop acceptance widths are 1440px and 1024px; mobile acceptance width is 390px.

---

### Task 1: Desktop Collective Frame and Relation Anchor

**Files:**
- Modify: `scripts/verify_ming_institution_page.mjs`
- Modify: `scripts/lib/render_institution_gallery.mjs`
- Modify: `scripts/lib/institution_atlas_layout.mjs`

**Interfaces:**
- Consumes: `graph.institutions[].node_type`, `graph.institutions[].parent_group`, `ATLAS_LAYOUT.six_ministries`.
- Produces: `.six-ministries-frame[data-group-id="six_ministries"]`, `.collective-relation-anchor[data-id="six_ministries"]`, and unchanged `.institution-node` buttons for the six member IDs.

- [ ] **Step 1: Write the failing desktop behavior test**

Add a Playwright inspection after the initial desktop page load:

```js
const ministryCollective=await page.evaluate(()=>{
  const frame=document.querySelector('.six-ministries-frame[data-group-id="six_ministries"]');
  const members=['ministry_personnel','ministry_revenue','ministry_rites','ministry_war','ministry_justice','ministry_works']
    .map(id=>document.querySelector(`.institution-node[data-id="${id}"]`));
  return {
    legacyCard:document.querySelectorAll('.institution-node[data-id="six_ministries"]').length,
    frames:document.querySelectorAll('.six-ministries-frame[data-group-id="six_ministries"]').length,
    label:frame?.querySelector('b')?.textContent.trim()||'',
    note:frame?.querySelector('span')?.textContent.trim()||'',
    focusable:frame?.matches('button,a,[tabindex]')||false,
    memberIds:members.filter(Boolean).map(node=>node.dataset.id)
  };
});
expect(ministryCollective.legacyCard===0,'six ministries collective must not render as a clickable institution card');
expect(ministryCollective.frames===1,'desktop graph must render one six-ministries collective frame');
expect(ministryCollective.label==='六部（合称）'&&ministryCollective.note.includes('六个并列机构'),'collective frame must state its non-institution semantics');
expect(!ministryCollective.focusable&&ministryCollective.memberIds.length===6,'only the six real ministry cards may remain interactive');
```

Add this two-width geometry loop so containment and relation attachment are measured from rendered output:

```js
const collectiveGeometryFailures=[];
for(const viewport of [{width:1440,height:1000},{width:1024,height:768}]){
  await page.setViewportSize(viewport);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  const geometry=await page.evaluate(()=>{
    const frameBox=document.querySelector('.six-ministries-frame:not([hidden])')?.getBoundingClientRect();
    const members=['ministry_personnel','ministry_revenue','ministry_rites','ministry_war','ministry_justice','ministry_works']
      .map(id=>document.querySelector(`.institution-node[data-id="${id}"]:not([hidden])`))
      .filter(Boolean)
      .map(node=>({id:node.dataset.id,box:node.getBoundingClientRect()}));
    const anchorBox=document.querySelector('.collective-relation-anchor[data-id="six_ministries"]')?.getBoundingClientRect();
    const endpointMisses=[...document.querySelectorAll('.relation-path')]
      .filter(path=>path.dataset.from==='six_ministries'||path.dataset.to==='six_ministries')
      .map(path=>{
        if(!anchorBox)return Number.POSITIVE_INFINITY;
        const local=path.getPointAtLength(path.dataset.from==='six_ministries'?0:path.getTotalLength());
        const svgPoint=path.ownerSVGElement.createSVGPoint();svgPoint.x=local.x;svgPoint.y=local.y;
        const screen=svgPoint.matrixTransform(path.getScreenCTM());
        return Math.hypot(screen.x-(anchorBox.left+anchorBox.width/2),screen.y-(anchorBox.top+anchorBox.height/2));
      });
    return {
      contained:Boolean(frameBox)&&members.length===6&&members.every(({box})=>box.left>=frameBox.left&&box.right<=frameBox.right&&box.top>=frameBox.top&&box.bottom<=frameBox.bottom),
      rowSpread:Math.max(...members.map(({box})=>box.top))-Math.min(...members.map(({box})=>box.top)),
      widthSpread:Math.max(...members.map(({box})=>box.width))-Math.min(...members.map(({box})=>box.width)),
      endpointMisses
    };
  });
  if(!geometry.contained||geometry.rowSpread>1||geometry.widthSpread>1||geometry.endpointMisses.some(distance=>distance>3))collectiveGeometryFailures.push(`${viewport.width}:${JSON.stringify(geometry)}`);
}
expect(collectiveGeometryFailures.length===0,`six ministries frame geometry must contain six equal peer cards and attached aggregate relations: ${collectiveGeometryFailures.join('; ')}`);
```

- [ ] **Step 2: Run the desktop test to verify RED**

Run:

```bash
npm run build:museum
npm run verify:institution-page
```

Expected: FAIL because `.institution-node[data-id="six_ministries"]` still exists and `.six-ministries-frame` does not.

- [ ] **Step 3: Render the dedicated collective frame**

In `renderAtlas(graph,layout)`, exclude `six_ministries` from the normal button map and emit one inert frame before the relation SVG:

```js
const nodes=graph.institutions
  .filter(node=>node.id!=='six_ministries')
  .map(node=>{const point=layout[node.id];return `<button class="institution-node system-${esc(node.system)}" type="button" data-id="${esc(node.id)}" data-system="${esc(node.system)}" data-region="${esc(point.region)}" data-tier="${esc(point.tier)}" style="--x:${esc(point.x)};--y:${esc(point.y)}" hidden><span>${esc(node.name)}</span><small>${esc(node.confidence)}置信度</small></button>`})
  .join('');
const sixMinistriesFrame=`<section class="six-ministries-frame" data-group-id="six_ministries" hidden aria-label="六部是吏户礼兵刑工六个并列机构的合称"><i class="collective-relation-anchor" data-id="six_ministries" aria-hidden="true"></i><header><b>六部（合称）</b><span>吏、户、礼、兵、刑、工六个并列机构</span></header></section>`;
```

Add the dedicated collective-frame styles:

```css
.six-ministries-frame{
  position:absolute;
  left:29%;
  top:38%;
  width:42%;
  height:18%;
  border:2px dashed var(--civil);
  background:color-mix(in srgb,var(--paper) 78%,transparent);
  box-sizing:border-box;
  pointer-events:none;
  z-index:0;
}
.six-ministries-frame header{
  position:absolute;
  left:10px;
  top:8px;
  display:grid;
  gap:2px;
  color:var(--ink);
}
.six-ministries-frame header b{font-size:14px}
.six-ministries-frame header span{font-size:12px}
.collective-relation-anchor{
  position:absolute;
  left:50%;
  top:-2px;
  width:2px;
  height:2px;
  transform:translateX(-50%);
  pointer-events:none;
}
```

Keep institution nodes at `z-index:4`.

Set `ATLAS_LAYOUT.six_ministries.y` to `38` so fallback relation geometry agrees with the frame-top anchor before layout measurement.

- [ ] **Step 4: Route rendering and relation geometry through the group anchor**

Update `displayPoint(id)` to resolve either a real institution button or a collective anchor:

```js
const node=document.querySelector('.institution-node[data-id="'+id+'"],.collective-relation-anchor[data-id="'+id+'"]');
```

Update `renderNodes()` to toggle the collective frame from the `six_ministries` activity period and topic context independently of the normal institution-button loop:

```js
const frame=document.querySelector('.six-ministries-frame');
const group=institutionById.get('six_ministries');
frame.hidden=!activeAt(group,state.year);
frame.classList.toggle('is-context',!topicIds.has(group.id));
```

In `placeRelationLabel()`, build `nodeBoxes` from visible institution cards plus `.six-ministries-frame header`. Do not add the whole frame rectangle because labels and lines may legitimately pass through its empty paper area.

- [ ] **Step 5: Run desktop GREEN verification**

Run:

```bash
npm run build:museum
npm run verify:institution-layout
npm run verify:institutions
npm run verify:institution-page
```

Expected: all commands exit 0; the desktop frame contains six peer cards at both widths and aggregate relation endpoints remain attached.

- [ ] **Step 6: Commit desktop behavior**

```bash
git add scripts/lib/render_institution_gallery.mjs scripts/lib/institution_atlas_layout.mjs scripts/verify_ming_institution_page.mjs
git commit -m "feat: render six ministries as collective frame"
```

---

### Task 2: Mobile Equivalent Grouping

**Files:**
- Modify: `scripts/verify_ming_institution_page.mjs`
- Modify: `scripts/lib/render_institution_gallery.mjs`

**Interfaces:**
- Consumes: `node.id === "six_ministries"` and the six records whose `parent_group === "six_ministries"`.
- Produces: `.mobile-collective-label[data-group-id="six_ministries"]` plus six `.mobile-node` buttons for the real ministries.

- [ ] **Step 1: Write the failing mobile behavior test**

Extend the 390px mobile inspection with explicit current and new fields:

```js
return {
  graphDisplay:graphStage?getComputedStyle(graphStage).display:null,
  mobileDisplay:mobileStructure?getComputedStyle(mobileStructure).display:null,
  mobileGroups:document.querySelectorAll('.mobile-system-group').length,
  drawerPosition:drawer?getComputedStyle(drawer).position:null,
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth,
  collectiveLabels:document.querySelectorAll('.mobile-collective-label[data-group-id="six_ministries"]').length,
  collectiveText:document.querySelector('.mobile-collective-label[data-group-id="six_ministries"]')?.textContent.trim()||'',
  legacyGroupButtons:document.querySelectorAll('.mobile-node[data-id="six_ministries"]').length,
  ministryButtons:['ministry_personnel','ministry_revenue','ministry_rites','ministry_war','ministry_justice','ministry_works']
    .filter(id=>document.querySelector(`.mobile-node[data-id="${id}"]`)).length
};
```

Assert one label, zero legacy group buttons, six ministry buttons, and visible text containing `六部（合称）` and `六个并列机构`.

- [ ] **Step 2: Run the mobile test to verify RED**

Run:

```bash
npm run verify:institution-page
```

Expected: FAIL because the mobile renderer still creates a clickable `six_ministries` button.

- [ ] **Step 3: Render a non-interactive mobile label**

In `renderMobile()`, special-case only `six_ministries`:

```js
if(node.id==='six_ministries'){
  const label=document.createElement('div');
  label.className='mobile-collective-label';
  label.dataset.groupId='six_ministries';
  label.innerHTML='<b>六部（合称）</b><span>吏、户、礼、兵、刑、工六个并列机构</span>';
  list.append(label);
  continue;
}
```

Style the label across the full mobile grid width. Do not add a click listener or `tabindex`:

```css
.mobile-collective-label{
  grid-column:1 / -1;
  display:grid;
  gap:3px;
  padding:10px 12px;
  border:2px dashed var(--civil);
  background:var(--paper);
  color:var(--ink);
}
.mobile-collective-label b{font-size:14px}
.mobile-collective-label span{font-size:12px;line-height:1.5}
```

- [ ] **Step 4: Run mobile GREEN verification**

Run:

```bash
npm run build:museum
npm run verify:institution-page
```

Expected: exit 0; mobile shows one inert collective label and six interactive ministry buttons without horizontal overflow.

- [ ] **Step 5: Commit mobile behavior**

```bash
git add scripts/lib/render_institution_gallery.mjs scripts/verify_ming_institution_page.mjs
git commit -m "fix: preserve six ministries semantics on mobile"
```

---

### Task 3: Full Regression and Delivery

**Files:**
- Verify: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/institutions-graph.html`
- Verify: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/institutions.html`

**Interfaces:**
- Consumes: completed desktop and mobile collective-frame behavior.
- Produces: rebuilt museum output with unchanged historical data counts and deployable institution pages.

- [ ] **Step 1: Rebuild and run all institution regressions**

```bash
npm run build:museum
npm run verify:institution-layout
npm run verify:institutions
npm run verify:institution-expansion
npm run verify:institution-page
npm run verify:institution-palace
```

Expected: all commands exit 0; graph remains 29 nodes / 47 relations and palace remains 45 institutions / 64 relations.

- [ ] **Step 2: Verify clean output and scoped diff**

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; only the renderer, layout, regression test, and this plan are changed by implementation.

- [ ] **Step 3: Build deployment bundle**

```bash
npm run build:deploy
npm run verify:deploy
```

Expected: deployment verification reports `pass: true` and includes the rebuilt institution hall. Do not create a verification-only commit when the working tree is already clean.
