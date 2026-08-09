# Institution Palace Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an unlisted `institutions-palace.html` immersive C-version that preserves the 29-node P0 axis, composes 16 evidence-backed institutions into five expandable rooms, and provides accessible desktop and mobile reading.

**Architecture:** Keep `data/ming_institution_graph.json` and the B-version builder unchanged. Add a separate expansion dataset, a pure composition/validation module, and a dedicated palace renderer/build entrypoint. The C-version uses the composed 45-node model; deploy includes it but public navigation remains linked only to `institutions.html`.

**Tech Stack:** Node.js ESM, static HTML/CSS/vanilla JavaScript, JSON content data, Playwright through the existing workspace browser dependency, existing museum build/deploy scripts.

## Global Constraints

- Preserve B-version data at exactly 29 nodes, 47 relations, 6 views, and 16 sources.
- Add exactly 16 canonical expansion institutions, 6 structural groups, and 23 new inner-court subinstitution records.
- Compose exactly 45 unique graph nodes; structural groups, roles, and subinstitutions cannot be relation endpoints.
- Generate `institutions-palace.html`; do not add it to the official main navigation.
- C-version must link back to `institutions.html`.
- Desktop lines are at least 2px and focused lines at least 3px; line endpoints use measured card geometry.
- Chinese glyphs cannot use horizontal scaling or font stretching.
- Mobile at 390×844 uses vertical room chapters, not a shrunken freeform graph.
- `Escape` returns focus to the original trigger; reduced-motion removes positional transitions.
- New relations require explicit endpoints, type, active period, source IDs, boundary, and confidence of at least `中高`.

---

## File Structure

- Create `docs/明朝机构结构图P1扩展内容基线_2026-08-10.md`: human-readable evidence and entity baseline.
- Create `data/ming_institution_expansion.json`: machine-readable rooms, systems, 16 institutions, 6 groups, 23 subinstitutions, sources, and reviewed relations.
- Create `scripts/lib/institution_palace_model.mjs`: pure validation/composition functions.
- Create `scripts/verify_ming_institution_expansion.mjs`: deterministic data contract.
- Create `scripts/lib/render_institution_palace.mjs`: C-version markup, styling, and runtime.
- Create `scripts/build_ming_institution_palace.mjs`: reads base/expansion data and writes the page.
- Create `scripts/verify_ming_institution_palace_page.mjs`: desktop/mobile/browser contract.
- Modify `scripts/build_ming_exhibitions.mjs`: invoke the palace builder after the existing institution builder.
- Modify `scripts/build_vercel_bundle.mjs`: ensure the generated palace page is copied by the existing output traversal.
- Modify `scripts/verify_vercel_bundle.mjs`: require the palace page while asserting it is absent from public nav.
- Modify `package.json`: add focused build and verification commands.

### Task 1: Freeze the P1 content and data contract

**Files:**
- Create: `docs/明朝机构结构图P1扩展内容基线_2026-08-10.md`
- Create: `scripts/verify_ming_institution_expansion.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `data/ming_institution_graph.json` P0 schema.
- Produces: validator requirements for `data/ming_institution_expansion.json` and a fixed reviewed relation count.

- [ ] **Step 1: Write the content baseline**

Document the 16 canonical IDs, 6 group IDs, 23 subinstitution IDs, active periods, summaries, boundaries, source IDs, and relation rows. The canonical IDs are:

```js
[
  'hanlin_academy','directorate_education','court_imperial_sacrifices','court_imperial_entertainments',
  'court_imperial_stables','court_state_ceremonial','directorate_astronomy','imperial_medical_court',
  'imperial_seals_office','imperial_clan_court','heir_apparent_household','left_chunfang',
  'right_chunfang','classics_colophon_office','shuntian_prefecture','five_city_patrol_offices'
]
```

- [ ] **Step 2: Write the failing validator**

The verifier must assert exact counts, unique IDs, source existence, valid periods, endpoint types, relation period intersection, `尚宝司 !== 尚宝监`, separate left/right Chunfang, and composed node count 45:

```js
expect(expansion.institutions.length===16,'expected exactly 16 expansion institutions');
expect(expansion.structural_groups.length===6,'expected exactly 6 structural groups');
expect(expansion.subinstitutions.length===23,'expected exactly 23 new inner-court subinstitutions');
expect(new Set([...base.institutions,...expansion.institutions].map(x=>x.id)).size===45,'expected 45 unique composed nodes');
```

- [ ] **Step 3: Run RED**

Run: `node scripts/verify_ming_institution_expansion.mjs`

Expected: FAIL because `data/ming_institution_expansion.json` does not exist.

- [ ] **Step 4: Add package command**

Add:

```json
"verify:institution-expansion": "node scripts/verify_ming_institution_expansion.mjs"
```

- [ ] **Step 5: Commit**

```bash
git add docs/明朝机构结构图P1扩展内容基线_2026-08-10.md scripts/verify_ming_institution_expansion.mjs package.json
git commit -m "test: define institution expansion contract"
```

### Task 2: Add the evidence-backed expansion dataset and composer

**Files:**
- Create: `data/ming_institution_expansion.json`
- Create: `scripts/lib/institution_palace_model.mjs`
- Modify: `scripts/verify_ming_institution_expansion.mjs`

**Interfaces:**
- Produces: `composeInstitutionPalace(base, expansion) -> {meta, phases, systems, institutions, structural_groups, subinstitutions, rooms, relations, sources}`.
- Throws: an `Error` with newline-separated validation failures.

- [ ] **Step 1: Add expansion JSON**

Each institution record uses:

```json
{
  "id":"hanlin_academy",
  "name":"翰林院",
  "node_type":"institution",
  "system":"ritual_education",
  "active_periods":[{"start":1367,"end":1644,"state":"functions_evolved","confidence":"高"}],
  "summary":"掌制诰、史册、文翰、讲读与考议制度。",
  "boundary":"与内阁人才和文书关系密切，但不是内阁下属机关。",
  "source_ids":["mingshi_73","dpm_hanlin"],
  "confidence":"高"
}
```

- [ ] **Step 2: Implement pure composition and validation**

Export:

```js
export function validateInstitutionExpansion(base, expansion) { return failures; }
export function composeInstitutionPalace(base, expansion) {
  const failures=validateInstitutionExpansion(base,expansion);
  if(failures.length) throw new Error(`Invalid institution expansion:\n${failures.join('\n')}`);
  return {
    meta:{...base.meta,version:'0.2-palace',scope:'P0权力主干与P1制度房间组合图'},
    phases:base.phases,
    systems:[...base.systems,...expansion.systems],
    institutions:[...base.institutions,...expansion.institutions],
    structural_groups:expansion.structural_groups,
    subinstitutions:expansion.subinstitutions,
    rooms:expansion.rooms,
    relations:[...base.relations,...expansion.relations],
    sources:[...base.sources,...expansion.sources],
    views:base.views,
    base_node_ids:base.institutions.map(item=>item.id)
  };
}
```

- [ ] **Step 3: Run GREEN**

Run: `npm run verify:institution-expansion`

Expected: PASS and print exact expansion/composed counts.

- [ ] **Step 4: Preserve P0 contract**

Run: `npm run verify:institutions`

Expected: PASS with 29 nodes and 47 relations.

- [ ] **Step 5: Commit**

```bash
git add data/ming_institution_expansion.json scripts/lib/institution_palace_model.mjs scripts/verify_ming_institution_expansion.mjs
git commit -m "feat: add institution expansion model"
```

### Task 3: Define the palace page RED browser contract

**Files:**
- Create: `scripts/verify_ming_institution_palace_page.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: generated `institutions-palace.html`.
- Produces: semantic failures for missing axis, rooms, time state, trace dossier, mobile chapters, geometry, focus, and motion behavior.

- [ ] **Step 1: Write desktop assertions**

Use Playwright to assert:

```js
expect(model.institutions.length===45,'palace page must embed 45 composed nodes');
expect(await page.locator('.power-axis').count()===1,'palace page must expose one persistent power axis');
expect(await page.locator('.institution-room').count()===5,'palace page must expose five institution rooms');
expect(await page.locator('.institution-room[aria-expanded="true"]').count()<=1,'only one room may be open');
```

Check 1440×1000, 1024×768, and 1800×1000 for node collisions, label collisions, title/canvas overlap, and line endpoint distance `<=3px`.

- [ ] **Step 2: Write interaction and accessibility assertions**

Assert room trigger focus, drawer focus, Escape return, year changes preserving the room, inactive selected institutions becoming `.historical-trace`, normal line width `>=2`, focused line `>=3`, text contrast `>=4.5`, no CSS `scaleX`, and reduced motion duration `0s`.

- [ ] **Step 3: Write mobile assertions**

At 390×844 assert `.palace-stage` is hidden, `.mobile-room-chapters` is visible, all active room institutions appear, a chapter expands inline, and dossier height is `<=82%` of viewport.

- [ ] **Step 4: Run RED**

Run: `node scripts/verify_ming_institution_palace_page.mjs`

Expected: FAIL because `institutions-palace.html` does not exist.

- [ ] **Step 5: Add package command and commit**

```json
"verify:institution-palace": "node scripts/verify_ming_institution_palace_page.mjs"
```

```bash
git add scripts/verify_ming_institution_palace_page.mjs package.json
git commit -m "test: define institution palace page contract"
```

### Task 4: Build the static palace shell and five-room desktop layout

**Files:**
- Create: `scripts/lib/render_institution_palace.mjs`
- Create: `scripts/build_ming_institution_palace.mjs`

**Interfaces:**
- Consumes: composed palace model and optional people links.
- Produces: complete static HTML containing `#institutionPalaceData`, title outside canvas, `.power-axis`, five `.institution-room` sections, room triggers, node buttons, SVG relation layer, dossier, `<noscript>` fallback, and return link.

- [ ] **Step 1: Implement page head and navigation**

Use a light paper palette, normal-proportion Chinese fonts, and an unlisted header whose only institution-version link is:

```html
<a class="return-archive" href="institutions.html">返回明代官制档案</a>
```

- [ ] **Step 2: Render the persistent P0 axis and room triggers**

Render the 29 base nodes on the axis model and five room triggers from `model.rooms`. Room content stays mounted but collapsed with `aria-expanded="false"`.

- [ ] **Step 3: Render four entity visual types**

Use `.canonical-institution`, `.structural-group`, `.role-plaque`, and `.boundary-slip`. Cross-room references render `.room-portal` and reuse the target canonical ID.

- [ ] **Step 4: Build page**

Run: `node scripts/build_ming_institution_palace.mjs`

Expected: write `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/institutions-palace.html` with 45 composed nodes.

- [ ] **Step 5: Run deterministic checks and commit**

Run: `npm run verify:institution-expansion && npm run verify:institutions`

```bash
git add scripts/lib/render_institution_palace.mjs scripts/build_ming_institution_palace.mjs
git commit -m "feat: build institution palace shell"
```

### Task 5: Implement rooms, time state, dossiers, geometry, and mobile chapters

**Files:**
- Modify: `scripts/lib/render_institution_palace.mjs`
- Modify: `scripts/verify_ming_institution_palace_page.mjs`

**Interfaces:**
- Runtime state: `{year:number, openRoomId:string|null, selectedInstitutionId:string|null, lastTriggerId:string|null}`.
- Global functions exposed for browser tests: `setPalaceYear(year)`, `openInstitutionRoom(id)`, `closeInstitutionRoom()`, `openInstitutionDossier(id)`, `closeInstitutionDossier()`.

- [ ] **Step 1: Implement exclusive room state**

Opening a room closes the previous room, keeps the axis visible, and moves focus to the room heading. Closing restores focus to the room trigger and does not change year or scroll position.

- [ ] **Step 2: Implement measured SVG geometry**

Measure stage and card rectangles, compute border intersections, render paths with `vector-effect="non-scaling-stroke"`, and rerender through `ResizeObserver` plus room/year changes.

- [ ] **Step 3: Implement global year state**

Filter nodes and relations by active periods. If the selected institution becomes inactive, keep the dossier open, set `.historical-trace`, remove its live relationships, and show buttons for its active years.

- [ ] **Step 4: Implement dossier focus lifecycle**

The dossier uses `role="dialog"`, `aria-modal="true"`, visible title labelling, initial focus on close, Escape close, and exact focus return.

- [ ] **Step 5: Implement mobile chapters**

Below 720px render room accordions in reading order, active nodes and relation sentences, inline room expansion, and a bottom dossier capped at `82svh`.

- [ ] **Step 6: Run browser contract to GREEN**

Run: `npm run verify:institution-palace`

Expected: PASS at all desktop/mobile/reduced-motion viewports.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/render_institution_palace.mjs scripts/verify_ming_institution_palace_page.mjs
git commit -m "feat: add institution palace interactions"
```

### Task 6: Integrate build and deploy without publishing a nav link

**Files:**
- Modify: `scripts/build_ming_exhibitions.mjs`
- Modify: `scripts/build_vercel_bundle.mjs`
- Modify: `scripts/verify_vercel_bundle.mjs`
- Modify: `package.json`

**Interfaces:**
- `npm run build:museum` generates both institution versions.
- `npm run build:deploy` copies both pages.
- `npm run verify:deploy` requires the C-page file and rejects public navigation links to it.

- [ ] **Step 1: Add focused build command**

```json
"build:institution-palace": "node scripts/build_ming_institution_palace.mjs"
```

- [ ] **Step 2: Chain the palace build after the B-version build**

Import or execute the dedicated builder from the existing museum build sequence without changing existing page navigation templates.

- [ ] **Step 3: Extend deploy verification**

Assert `dist/institutions-palace.html` exists, contains `href="institutions.html"`, and `dist/{index,people,events,exhibitions}.html` contain zero links to `institutions-palace.html`.

- [ ] **Step 4: Run deploy checks**

Run:

```bash
npm run build:museum
npm run build:deploy
npm run verify:deploy
```

Expected: all pass; C-version exists only by direct URL.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/build_ming_exhibitions.mjs scripts/build_vercel_bundle.mjs scripts/verify_vercel_bundle.mjs
git commit -m "build: include unlisted institution palace"
```

### Task 7: Full regression and visual QA

**Files:**
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/institutions-palace.html`
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/制度馆C版_桌面预览.png`
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/制度馆C版_移动端预览.png`

**Interfaces:**
- Produces: final evidence that B-version remains intact and C-version meets the approved contract.

- [ ] **Step 1: Run focused deterministic suites**

```bash
npm run verify:institutions
npm run verify:institution-layout
npm run verify:institution-expansion
npm run verify:institution-page
npm run verify:institution-palace
```

- [ ] **Step 2: Run full museum regression**

Run: `npm run verify`

Expected: PASS.

- [ ] **Step 3: Build and verify deploy bundle**

```bash
npm run build:deploy
npm run verify:deploy
```

- [ ] **Step 4: Inspect desktop, tablet, mobile, open room, and historical trace states**

Capture 1440×1000 and 390×844 screenshots. Confirm light paper readability, title outside canvas, axis persistence, one open room, no card/label collisions, connected line endpoints, and mobile chapter readability.

- [ ] **Step 5: Verify repository hygiene**

Run:

```bash
git diff --check
git status --short
```

Expected: no uncommitted source changes after the final scoped commit.

- [ ] **Step 6: Commit generated release artifacts if tracked by existing project convention**

```bash
git add outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/institutions-palace.html
git commit -m "feat: deliver institution palace preview"
```
