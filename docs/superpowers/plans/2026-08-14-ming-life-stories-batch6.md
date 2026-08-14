# Ming Life Stories Batch 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the cards, drawer previews, and independent pages for 于谦、唐寅、戚继光 while giving each person a different exhibition focus and expanding 唐寅's verified artwork display.

**Architecture:** Keep `data/ming_core.json` as the basic-card source and `data/ming_person_pages.json` as the single shared source for drawer previews and independent biographies. Research is isolated into three person-specific dossiers so independent workers do not edit shared JSON; a later integration task updates the shared records. Extend `renderFeature()` with two semantic renderers for crisis decisions and military training, while 唐寅 continues to use the existing gallery backed by `data/ming_creative_works.json`.

**Tech Stack:** Node.js ES modules, JSON content files, static HTML generation, Playwright browser verification, Sharp-backed build pipeline, Git worktrees.

## Global Constraints

- Uniform evidence and readability standards do not imply uniform exhibition emphasis.
- 于谦 focuses on crisis decisions and political responsibility.
- 唐寅 focuses on works, cultural identity, and professional survival.
- 戚继光 focuses on military organization, training, logistics, and institutional constraints.
- Cards and drawer previews remain concise; expanded works belong on independent pages.
- Each person has five or six meaningful scenes with Gregorian years, Ming reign years, age, preview, two body paragraphs, evidence note, primary source, confidence, and interpretation boundary.
- Do not use Wikipedia or generic ancient-text homepages as either basic-card primary source.
- Distinguish historical quotations, modern summaries, and curatorial interpretation.
- Do not invent dialogue, inner monologue, scene details, or unsupported causal certainty.
- 唐寅 artwork images require public-domain or explicitly reusable status plus a direct collection record.
- Leave 朱元璋、朱棣、郑和 and Batch 5 person objects unchanged.
- Do not merge, push, or deploy without a new explicit user request.

---

## File Structure

**Create**

- `scripts/verify_ming_life_stories_batch6.mjs` — structural, semantic, browser, and regression contract for the three people.
- `data/research/ming_life_stories_batch6_yu_qian.json` — claim-level source dossier for 于谦.
- `data/research/ming_life_stories_batch6_tang_yin.json` — claim and artwork-level source dossier for 唐寅.
- `data/research/ming_life_stories_batch6_qi_jiguang.json` — claim-level source dossier for 戚继光.
- Up to four new files under `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/works/` — locally stored public-domain 唐寅 works.

**Modify**

- `package.json` — register `verify:life-stories-batch6`.
- `data/ming_core.json` — replace only 于谦、唐寅、戚继光 basic-card summaries, evaluations, notes, and two primary links.
- `data/ming_person_pages.json` — replace only the three shared page objects.
- `data/ming_creative_works.json` — expand only `people.唐寅.works` from two to four through six verified works.
- `scripts/build_ming_person_pages.mjs` — render `crisis-decision` and `training-system`, plus their responsive CSS.
- `scripts/verify_ming_museum.mjs` — update the three independent-page expectations from three scenes to the final counts and clear-biography evidence mode.

**Do not modify**

- `data/ming_storytelling.json` for these three people; drawer and page content already share `ming_person_pages.json`.
- Any person object outside 于谦、唐寅、戚继光.
- Vercel configuration or deployment files.

---

### Task 1: Define the Failing Batch 6 Contract

**Files:**

- Create: `scripts/verify_ming_life_stories_batch6.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: `data/ming_core.json`, `data/ming_person_pages.json`, `data/ming_creative_works.json`, built museum pages.
- Produces: npm command `verify:life-stories-batch6` with exit code `0` only when all Batch 6 contracts pass.

- [ ] **Step 1: Add the npm command**

Add this exact entry after `verify:life-stories-batch5`:

```json
"verify:life-stories-batch6": "node scripts/verify_ming_life_stories_batch6.mjs"
```

- [ ] **Step 2: Write the data contract**

Create a verifier with these constants and checks:

```js
const names = ['于谦', '唐寅', '戚继光'];
const bannedTitles = ['生卒与出身', '进入历史现场', '主要行动与位置', '结局与历史影响'];
const expectedFeature = {
  于谦: 'crisis-decision',
  唐寅: 'gallery',
  戚继光: 'training-system'
};

for (const name of names) {
  const card = core.find(item => item.name === name);
  const page = pages[name];
  assert(card.summary.length >= 34, `${name}: summary too short`);
  assert(card.evaluation.length >= 38, `${name}: evaluation too short`);
  assert([card.source1, card.source2].every(isDirectAuthority), `${name}: weak card source`);
  assert(page.readingMode === 'clear-biography', `${name}: not clear biography`);
  assert(page.scenes.length >= 5 && page.scenes.length <= 6, `${name}: wrong scene count`);
  page.scenes.forEach(scene => assertScene(scene, name, bannedTitles));
  assert(page.feature.type === expectedFeature[name], `${name}: wrong exhibition focus`);
}
```

`isDirectAuthority(url)` must reject `wikipedia.org`, bare `ctext.org`, and empty strings. `assertScene` must require `year`, `reignYears`, `age`, `kicker`, `title`, `preview.length >= 28`, exactly two or more `body` paragraphs each at least 55 Chinese characters, `evidenceNote`, `confidence`, complete `primarySource`, and `interpretationBoundary`.

- [ ] **Step 3: Add differentiated semantic locks**

Use these exact content locks:

```js
assert(joined('于谦').match(/反对南迁|北京保卫|景泰|夺门|平反/), '于谦: crisis chain incomplete');
assert(joined('唐寅').match(/解元|科场|职业|题跋|市场/), '唐寅: cultural production incomplete');
assert(joined('戚继光').match(/募兵|编组|军纪|蓟镇|纪效新书|练兵实纪/), '戚继光: training system incomplete');

assert(pages.于谦.feature.items.length === 6, '于谦: decision chain must have six steps');
assert(creative.people.唐寅.works.length >= 4 && creative.people.唐寅.works.length <= 6, '唐寅: artwork count');
assert(creative.people.唐寅.works.every(validArtwork), '唐寅: incomplete artwork metadata');
assert(pages.戚继光.feature.items.length === 8, '戚继光: training system must have eight parts');
```

`validArtwork` must require `title`, `date`, `medium`, `image`, HTTPS `source`, `collection`, `license`, `confidence`, and `reading.length >= 35`.

- [ ] **Step 4: Add desktop and mobile browser checks**

At 1440px, loop over `people.html?person=于谦`, `people.html?person=唐寅`, and `people.html?person=戚继光`, then assert:

- drawer question and lead exist;
- five or six `.profile-quick-node` entries exist;
- every entry has year, reign year, title, and preview;
- `.profile-enter` targets the correct independent page;
- `document.body.scrollWidth === innerWidth`.

At 390px, assert the routes redirect to `/people/yu-qian.html`, `/people/tang-yin.html`, and `/people/qi-ji-guang.html`; each page has five or six `.story > .chapter` nodes, the person-specific feature exists, all 唐寅 `.art-card img` elements load, and no horizontal overflow exists.

- [ ] **Step 5: Lock 郑和 against the Batch 6 baseline**

At script startup, compare current 郑和 objects to snapshots loaded from `git show 41e5646:data/ming_core.json` and `git show 41e5646:data/ming_person_pages.json`. Fail with `郑和: changed outside batch scope` if either differs.

- [ ] **Step 6: Run the gate and verify failure**

Run:

```bash
npm run verify:life-stories-batch6
```

Expected: FAIL for the three old three-scene pages, weak 于谦/戚继光 card sources, missing differentiated features, and only two 唐寅 works. 郑和 regression check must pass.

- [ ] **Step 7: Commit the failing gate**

```bash
git add package.json scripts/verify_ming_life_stories_batch6.mjs
git commit -m "test: define sixth person copy batch"
```

---

### Task 2: Build the 于谦 Source Dossier

**Files:**

- Create: `data/research/ming_life_stories_batch6_yu_qian.json`

**Interfaces:**

- Consumes: direct source pages and primary texts found during research.
- Produces: `{ person, focus, claims[], sources[], gaps[] }` for the integration task; does not edit shared person JSON.

- [ ] **Step 1: Read the full 《明史》卷170 account**

Record claim-level excerpts for early office, regional administration, opposition to moving the capital, Beijing defense, 景泰 government, 夺门 execution, and later rehabilitation. Each claim must use:

```json
{
  "id": "yu-1449-capital",
  "claim": "于谦反对南迁并参与重建京师防务决策",
  "sourceLabel": "《明史》卷170·于谦传",
  "url": "https://zh.wikisource.org/zh-hans/明史/卷170",
  "location": "卷170相关段落",
  "excerpt": ["不超过必要长度的原文"],
  "supports": "原文能够确认的事项",
  "boundary": "原文不能确认的心理、因果或后见评价",
  "confidence": "高"
}
```

- [ ] **Step 2: Find direct 《明英宗实录》 entries**

Search for the 1449 court response, defense appointments, return of the emperor, and 1457 punishment. Add only entries with a stable direct URL and identifiable reign/date location. If a required entry cannot be directly accessed, add it to `gaps` rather than citing a secondary summary as primary evidence.

- [ ] **Step 3: Verify 于谦 texts**

Locate a reliable digitization or catalog record for 《于忠肃集》. Record one political text or memorial and one poem only if authorship and text location are verifiable. For 《石灰吟》, create a dedicated claim noting the attribution, wording, and “少年作” uncertainty instead of assigning high confidence.

- [ ] **Step 4: Add museum and modern research support**

Include the direct 故宫博物院 于谦 page and at least one reliable study on the 1449 decision structure or 1457 political case. Modern sources may support interpretation but cannot replace missing event evidence.

- [ ] **Step 5: Validate the dossier**

Run:

```bash
node -e "const x=require('./data/research/ming_life_stories_batch6_yu_qian.json');if(x.claims.length<8||x.sources.length<4)process.exit(1);for(const c of x.claims){if(!c.claim||!c.url||!c.supports||!c.boundary||!c.confidence)process.exit(1)}"
```

Expected: exit `0` with at least eight claims and four sources.

- [ ] **Step 6: Commit the dossier**

```bash
git add data/research/ming_life_stories_batch6_yu_qian.json
git commit -m "research: document Yu Qian evidence"
```

---

### Task 3: Build the 唐寅 Source and Artwork Dossier

**Files:**

- Create: `data/research/ming_life_stories_batch6_tang_yin.json`
- Add: verified public-domain images under `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/works/`

**Interfaces:**

- Consumes: direct collection pages, public-domain image downloads, primary biography and writing sources.
- Produces: claim dossier plus `artworks[]` with the exact fields accepted by `data/ming_creative_works.json`.

- [ ] **Step 1: Establish the biography boundary**

Extract claims from 《明史》卷286 for 唐寅's examination history and case outcome. Compare the basic biography with a direct 故宫博物院 or equivalent authoritative person page. Mark details found only in late anecdotes as `confidence: 中` or omit them.

- [ ] **Step 2: Verify a primary writing source**

Find a stable digitization or scholarly catalog for 唐寅's collected writings or identifiable inscriptions. Record only short, locatable excerpts; do not copy popular internet poem attributions without a version record.

- [ ] **Step 3: Select four through six artworks**

Keep the two current Metropolitan Museum works if their records and images remain available. Add two through four works that broaden medium or subject. Each `artworks[]` entry must use:

```json
{
  "title": "馆藏页正式题名",
  "date": "馆藏页年代或范围",
  "medium": "馆藏页材质",
  "image": "assets/works/tang-yin-<semantic-name>.jpg",
  "source": "https://direct.collection/item",
  "collection": "收藏机构",
  "license": "Public Domain或明确开放许可",
  "confidence": "高或中",
  "reading": "至少35字，解释作品形式、题跋、装裱或归属，不臆测心理"
}
```

Reject an artwork if its image rights are unclear, the collection record is indirect, or the attribution status cannot be stated accurately.

- [ ] **Step 4: Download and verify images**

Download only the selected reusable images. Use semantic filenames and run:

```bash
node -e "const sharp=require('sharp'),fs=require('fs'),path=require('path');const x=require('./data/research/ming_life_stories_batch6_tang_yin.json');const root='outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';Promise.all(x.artworks.map(async w=>{const f=path.join(root,w.image);if(!fs.statSync(f).size)throw Error(f);const m=await sharp(f).metadata();if(!m.width||!m.height)throw Error(f)})).catch(e=>{console.error(e);process.exit(1)})"
```

Expected: every image has nonzero dimensions and opens through Sharp.

- [ ] **Step 5: Validate the dossier**

Run:

```bash
node -e "const x=require('./data/research/ming_life_stories_batch6_tang_yin.json');if(x.claims.length<8||x.sources.length<5||x.artworks.length<4||x.artworks.length>6)process.exit(1);for(const w of x.artworks){if(!w.title||!w.image||!w.source.startsWith('https://')||!w.license||!w.reading)process.exit(1)}"
```

Expected: exit `0`.

- [ ] **Step 6: Commit the dossier and assets**

```bash
git add data/research/ming_life_stories_batch6_tang_yin.json outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/works/
git commit -m "research: document Tang Yin works"
```

---

### Task 4: Build the 戚继光 Source Dossier

**Files:**

- Create: `data/research/ming_life_stories_batch6_qi_jiguang.json`

**Interfaces:**

- Consumes: 《明史》卷212, direct 《明实录》 entries, 《纪效新书》, 《练兵实纪》, 《止止堂集》, museum and research pages.
- Produces: claim dossier with explicit separation between southern anti-piracy methods and northern frontier methods.

- [ ] **Step 1: Establish the six-stage biography from 《明史》**

Record direct claims for inherited military office, Zhejiang command, Yiwu recruitment, Taizhou/Fujian/Guangdong operations, Jizhou command, removal, death, and posthumous legacy.

- [ ] **Step 2: Verify appointments and campaigns in 《明实录》**

Add direct date-located entries for at least two appointments or campaigns. If the stable text cannot be opened, list the gap and rely on the direct primary book plus 正史 rather than inventing a citation.

- [ ] **Step 3: Separate the two training books**

Create at least three claims from 《纪效新书》 and three from 《练兵实纪》. Every claim must say which environment it addresses. Required distinctions:

```json
{
  "southern": ["募兵", "小单位编组", "长短兵器协同", "复杂地形"],
  "northern": ["蓟镇", "车步骑协同", "火器与城防", "长期边防训练"]
}
```

- [ ] **Step 4: Add one verifiable literary or collected-work item**

Use 《止止堂集》 only if the text and attribution are locatable. The item remains supporting evidence; it must not displace the two training books as the page's main axis.

- [ ] **Step 5: Validate the dossier**

Run:

```bash
node -e "const x=require('./data/research/ming_life_stories_batch6_qi_jiguang.json');if(x.claims.length<10||x.sources.length<5)process.exit(1);if(!x.method.southern.length||!x.method.northern.length)process.exit(1)"
```

Expected: exit `0`.

- [ ] **Step 6: Commit the dossier**

```bash
git add data/research/ming_life_stories_batch6_qi_jiguang.json
git commit -m "research: document Qi Jiguang methods"
```

---

### Task 5: Upgrade the Three Basic Cards

**Files:**

- Modify: `data/ming_core.json` — only records at the names 于谦、唐寅、戚继光.

**Interfaces:**

- Consumes: the three validated research dossiers.
- Produces: concise card records consumed by the people table and drawer fact grid.

- [ ] **Step 1: Write a failing card-only check**

Run the Batch 6 verifier and capture the exact weak-card failures. Confirm that 唐寅 already has two direct institutional sources while 于谦 and 戚继光 still fail for Wikipedia/generic text links.

- [ ] **Step 2: Replace summaries and evaluations**

Write each summary in two to three sentences and each evaluation in two balanced sentences. Required content:

- 于谦: pre-1449 administrative experience, Beijing defense, 景泰 political position, 1457 execution;
- 唐寅: examination success and case, professional artistic production, later legend versus evidence;
- 戚继光: recruitment and training, southern and northern adaptations, dependence on finance and political sponsorship.

- [ ] **Step 3: Replace primary links and notes**

Use direct, stable URLs from the dossiers. `source1` should normally be the relevant 《明史》卷; `source2` should be the strongest person-specific primary or institutional source. Update `sourceNote` or equivalent explanatory fields without altering unrelated metrics.

- [ ] **Step 4: Verify only the three records changed**

Run:

```bash
node -e "const fs=require('fs'),{execFileSync}=require('child_process');const now=JSON.parse(fs.readFileSync('data/ming_core.json'));const old=JSON.parse(execFileSync('git',['show','HEAD~1:data/ming_core.json']));const allowed=new Set(['于谦','唐寅','戚继光']);const changed=now.filter((x,i)=>JSON.stringify(x)!==JSON.stringify(old[i])).map(x=>x.name);if(changed.some(n=>!allowed.has(n))||changed.length!==3){console.error(changed);process.exit(1)}"
```

Expected: exactly the three allowed names.

- [ ] **Step 5: Run audits**

```bash
npm run audit:museum
npm run verify:life-stories-batch6
```

Expected: museum audit has `errors: 0`; Batch 6 still fails only on independent-page and feature requirements.

- [ ] **Step 6: Commit the cards**

```bash
git add data/ming_core.json
git commit -m "feat: refine sixth batch person summaries"
```

---

### Task 6: Implement Differentiated Feature Renderers

**Files:**

- Modify: `scripts/build_ming_person_pages.mjs:59-74,90-106`
- Test: `scripts/verify_ming_life_stories_batch6.mjs`

**Interfaces:**

- Consumes: `page.feature.type`, plus type-specific fields below.
- Produces: `.feature-crisis-decision` and `.feature-training-system` HTML with stable test selectors.

Type definitions:

```ts
type CrisisDecisionFeature = {
  type: 'crisis-decision';
  eyebrow: string;
  title: string;
  intro: string;
  items: Array<{ label: string; text: string }>;
  conclusion: string;
};

type TrainingSystemFeature = {
  type: 'training-system';
  eyebrow: string;
  title: string;
  intro: string;
  items: Array<{ label: string; task: string; method: string; dependency: string }>;
  books: Array<{ title: string; environment: string; use: string }>;
  conclusion: string;
};
```

- [ ] **Step 1: Extend the verifier with renderer selectors**

Require:

```js
document.querySelectorAll('.feature-crisis-decision .decision-step').length === 6;
document.querySelectorAll('.feature-training-system .training-part').length === 8;
document.querySelectorAll('.feature-training-system .training-book').length === 2;
```

Run `npm run verify:life-stories-batch6`; expected FAIL because the selectors do not exist.

- [ ] **Step 2: Implement `crisis-decision` rendering**

Add a dedicated branch before the generic renderer:

```js
if (f.type === 'crisis-decision') {
  return `<section class="feature feature-crisis-decision reveal">
    <header class="section-head"><div><div class="eyebrow">${esc(f.eyebrow)}</div><h2>${esc(f.title)}</h2></div><p>${esc(f.intro)}</p></header>
    <ol class="decision-chain">${f.items.map((item, i) =>
      `<li class="decision-step" data-index="0${i + 1}"><b>${esc(item.label)}</b><p>${esc(item.text)}</p></li>`
    ).join('')}</ol>
    <div class="feature-conclusion">${esc(f.conclusion)}</div>
  </section>`;
}
```

The real code must retain the existing escaped eyebrow, title, and intro pattern.

- [ ] **Step 3: Implement `training-system` rendering**

```js
if (f.type === 'training-system') {
  const parts = f.items.map((item, i) => `<article class="training-part" data-index="0${i + 1}">
    <b>${esc(item.label)}</b><em>${esc(item.task)}</em>
    <div><small>METHOD · 方法</small><p>${esc(item.method)}</p></div>
    <div><small>DEPENDENCY · 条件</small><p>${esc(item.dependency)}</p></div>
  </article>`).join('');
  const books = f.books.map(book => `<article class="training-book"><b>${esc(book.title)}</b><span>${esc(book.environment)}</span><p>${esc(book.use)}</p></article>`).join('');
  return `<section class="feature feature-training-system reveal"><header class="section-head"><div><div class="eyebrow">${esc(f.eyebrow)}</div><h2>${esc(f.title)}</h2></div><p>${esc(f.intro)}</p></header><div class="training-grid">${parts}</div><div class="training-books">${books}</div><div class="feature-conclusion">${esc(f.conclusion)}</div></section>`;
}
```

- [ ] **Step 4: Add distinct desktop and mobile CSS**

Use a horizontal numbered decision chain for 于谦 and an eight-part operational grid plus two-book comparison for 戚继光. At `max-width:900px`, both become two columns; at `max-width:620px`, both become one column. Do not reuse the gallery's image-card treatment.

- [ ] **Step 5: Build and run renderer checks**

```bash
npm run build:museum
npm run verify:life-stories-batch6
```

Expected: feature selector failures disappear; content failures remain until Task 7.

- [ ] **Step 6: Commit renderer support**

```bash
git add scripts/build_ming_person_pages.mjs scripts/verify_ming_life_stories_batch6.mjs
git commit -m "feat: add differentiated person features"
```

---

### Task 7: Integrate the Three Shared Page Objects and 唐寅 Works

**Files:**

- Modify: `data/ming_person_pages.json` — only 于谦、唐寅、戚继光.
- Modify: `data/ming_creative_works.json` — only `people.唐寅`.
- Modify: `scripts/verify_ming_museum.mjs` — the three page specs and clear-biography expectations.

**Interfaces:**

- Consumes: all three dossiers, downloaded artwork assets, and feature renderer schemas.
- Produces: final shared drawer/independent-page data and complete gallery records.

- [ ] **Step 1: Replace 于谦 with six scenes**

Use the six stages in the design spec. Set `feature.type` to `crisis-decision` and provide exactly six items in this order:

```json
["败报与兵力真空", "南迁或守城", "监国与新帝", "城防与号令", "迎归太上皇", "危机后的政治债务"]
```

Keep the disputed 《石灰吟》 work block with `confidence: 中` and an explicit attribution boundary.

- [ ] **Step 2: Replace 唐寅 with six scenes**

Use the six stages in the design spec. Keep `feature.type: "gallery"`. The page thesis must distinguish the historical 唐寅 from the later 唐伯虎 legend without claiming the examination case details are fully recoverable.

- [ ] **Step 3: Expand 唐寅 creative works**

Replace `people.唐寅.works` with the dossier's four through six validated artwork entries. Preserve direct museum links and license strings exactly. Do not add non-reusable images merely to reach six.

- [ ] **Step 4: Replace 戚继光 with six scenes**

Use the six stages in the design spec. Set `feature.type` to `training-system`, provide exactly eight items for `选兵、编组、器械、号令、赏罚、地形、补给、复盘`, and provide two book comparisons for 《纪效新书》 and 《练兵实纪》.

- [ ] **Step 5: Add complete evidence objects**

For all eighteen scenes, populate:

```json
{
  "evidenceNote": "来源和定位",
  "confidence": "高或中",
  "interpretationBoundary": "不能从材料推出什么",
  "primarySource": {
    "title": "原文入口标题",
    "location": "卷次、篇名或馆藏记录",
    "original": ["一至三段必要原文"],
    "reading": "原文能够确认什么",
    "boundary": "原文不能确认什么",
    "url": "https://direct-source",
    "confidence": "高或中"
  }
}
```

- [ ] **Step 6: Update the legacy page verifier**

In `personPageSpecs`, change all three from three chapters to six, set `clear: true`, and set `sourceTriggers: 6`. For 唐寅 set `artCards` to the final artwork count; for 于谦 and 戚继光 retain their expected feature-item counts. Update drawer quick-node assertions from three to six.

- [ ] **Step 7: Run page and semantic checks**

```bash
npm run build:museum
npm run verify:life-stories-batch6
node scripts/verify_all_person_life_stories.mjs
npm run verify:reign-years
```

Expected: all commands PASS. The Batch 6 verifier prints that the three differentiated pages and 郑和 regression lock are complete.

- [ ] **Step 8: Verify the diff scope**

Run an object-level comparison against `41e5646` for every person except the three allowed names in `ming_core.json` and `ming_person_pages.json`. Compare all non-唐寅 creative-work objects byte-for-byte after JSON serialization. Expected: no out-of-scope changes.

- [ ] **Step 9: Commit integrated content**

```bash
git add data/ming_person_pages.json data/ming_creative_works.json scripts/verify_ming_museum.mjs
git commit -m "feat: refine sixth batch person pages"
```

---

### Task 8: Full Regression, Deploy-Bundle Check, and Preview Handoff

**Files:**

- Generated only: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/`
- Generated only: `dist/`
- No source changes unless a verification failure reveals a scoped defect.

**Interfaces:**

- Consumes: completed Batch 6 branch.
- Produces: validated local preview URLs and a release-ready branch; does not merge or deploy.

- [ ] **Step 1: Run data audits**

```bash
npm run audit:museum
npm run audit:portraits
```

Expected: museum audit `errors: 0`; portrait audit has zero missing or missing-file records. Review items may remain and must be reported, not hidden.

- [ ] **Step 2: Run the Batch 6 gate**

```bash
npm run verify:life-stories-batch6
```

Expected: PASS for cards, scenes, differentiated features, artworks, desktop/mobile rendering, and 郑和 unchanged.

- [ ] **Step 3: Run the full suite**

```bash
npm run verify
```

Expected: exit `0`. If the C-variant 800ms animation check alone exceeds its timing window, rerun `npm run verify:people-timeline-variants-page` once and report both measurements; do not weaken the timing assertion as part of this content batch.

- [ ] **Step 4: Build and validate the deployment bundle**

```bash
npm run build:deploy
npm run verify:deploy
```

Expected: all production pages return 200 in the local server, images load, and desktop/mobile widths match their viewports.

- [ ] **Step 5: Produce preview links**

Provide card and independent-page links for:

```text
people.html?person=于谦        people/yu-qian.html
people.html?person=唐寅        people/tang-yin.html
people.html?person=戚继光      people/qi-ji-guang.html
```

- [ ] **Step 6: Report evidence boundaries**

Summarize:

- which non-《明史》 sources were used for each person;
- which 唐寅 artworks were included and their reuse status;
- unresolved attribution or chronology gaps;
- exact test commands and outcomes;
- confirmation that the branch was not merged, pushed, or deployed.

- [ ] **Step 7: Final branch status**

Run `git status --short` and `git log --oneline -8`. Preserve unrelated untracked files. If generated screenshots remain untracked, report them and leave them intact.
