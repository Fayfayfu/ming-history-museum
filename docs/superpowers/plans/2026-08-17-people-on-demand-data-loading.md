# 人物馆按需数据加载 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 人物馆首页首屏加载索引，人物与事件抽屉按需获取静态 JSON，使构建后的 `people.html` 小于 430 KB。

**Architecture:** 现有构建器仍汇总同一批数据源，但只把列表字段写入两个索引；抽屉所需长文本写成按稳定 ID 命名的详情 JSON。首页启动时请求索引，点击人物或事件时请求详情并缓存。独立人物页的生成和 URL 不变。

**Tech Stack:** Node.js ES modules、静态 HTML/JSON、现有 Node 与浏览器验证器、Vercel 静态部署。

## Global Constraints

- 不改独立人物页的生成、文案与 URL；不引入后端。
- 首页经 HTTP(S) `fetch()` 加载；`file://` 不支持人物抽屉预览。
- `people.html` 小于 430 KB，且不内嵌人物场景、史料、事件正文或作品长文；保留静态时间轴。无 JavaScript 回退为首页 `<noscript>` 中的 `people-archive.html` 链接，后者预生成完整人物名录。
- 首屏列表、筛选、搜索、统计和 URL 查询只依赖索引。
- 加载失败必须显示重试入口；同人物保持阅读位置，新人物回到抽屉顶部。
- 索引每个引用必须指向存在、可解析且 ID 一致的详情 JSON。

---

## File Structure

- Modify `scripts/build_ming_html.mjs`：数据拆分、JSON 输出、异步首页脚本。
- Modify `scripts/build_ming_museum.mjs`：保持构建顺序与数据输出，并预生成 `people-archive.html` 完整静态名录。
- Create `scripts/lib/people_on_demand_data.mjs`：纯函数 `buildPeopleOnDemandData(input)`。
- Create `scripts/lib/people_on_demand_data.test.mjs`：拆分 schema 单元测试。
- Create `scripts/verify_ming_people_on_demand_data.mjs`：输出体积、JSON、引用、禁嵌字段门禁。
- Create `scripts/verify_ming_people_on_demand_page.mjs`：浏览器行为回归。
- Modify `scripts/build_vercel_bundle.mjs`：若需要，保留 `assets/data/`。
- Modify `package.json`：增加验证命令。
- Generate `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/assets/data/people-index.json`、`events-index.json` 及 `people-details/<id>.json`、`event-details/<id>.json`。

## Data Contract

```js
export function buildPeopleOnDemandData(input) {
  return {
    peopleIndex: { version: 1, people: [] },
    peopleDetails: new Map(),
    eventsIndex: { version: 1, stages: [], events: [] },
    eventDetails: new Map()
  };
}
```

索引人物条目使用现有 `person.id`，索引事件使用现有 `event.id`。人物索引携带姓名、类别、官职、年表、领域、机构摘要、头像、评分、关系/事件 ID、独立页 URL 和筛选所需数据；详情保留抽屉兼容的完整人物、场景、证据、作品、机构、关系和相关事件字段。事件索引只带列表/筛选字段；经过、影响图和证据正文进入详情。

### Task 1: Implement and test pure data splitting

**Files:** Create `scripts/lib/people_on_demand_data.mjs`; create `scripts/lib/people_on_demand_data.test.mjs`.

**Interfaces:** Consumes the current merged build inputs. Produces `buildPeopleOnDemandData(input)`.

- [ ] **Step 1: Write failing schema tests**

```js
test('keeps narrative fields out of people index', () => {
  const result = buildPeopleOnDemandData(fixture);
  const entry = result.peopleIndex.people.find((p) => p.id === 'zhu-yuan-zhang');
  assert.equal(entry.name, '朱元璋');
  assert.equal('scenes' in entry, false);
  assert.equal('historicalSlices' in entry, false);
  assert.ok(result.peopleDetails.get('zhu-yuan-zhang').drawer);
});

test('maps all source IDs to exactly one detail', () => {
  const result = buildPeopleOnDemandData(fixture);
  assert.deepEqual([...result.peopleDetails.keys()].sort(), fixture.core.map((p) => p.id).sort());
  assert.deepEqual([...result.eventDetails.keys()].sort(), fixture.eventData.events.map((e) => e.id).sort());
});
```

- [ ] **Step 2: Run `node --test scripts/lib/people_on_demand_data.test.mjs`; expect missing-module failure.**

- [ ] **Step 3: Implement the minimal splitter**

```js
const people = input.core.map((person) => ({
  id: person.id, name: person.name, category: person.category,
  office: person.office, birth: person.birth, death: person.death,
  domains: person.domains || [],
  institutionIds: input.personInstitutionIds[person.name] || [],
  portrait: input.portraits[person.name] || null,
  detailUrl: `assets/data/people-details/${person.id}.json`
}));
```

Only move fields now used by card rendering, filters, statistics, relation filtering and deep-link resolution into indexes. Keep source objects immutable.

- [ ] **Step 4: Run `node --test scripts/lib/people_on_demand_data.test.mjs`; expect PASS.**
- [ ] **Step 5: Commit only the splitter and its test with message `feat: split people museum data into indexes and details`.**

### Task 2: Emit stable JSON shards

**Files:** Modify `scripts/build_ming_html.mjs:1-90`, `scripts/build_ming_museum.mjs:1-120`; test `scripts/lib/people_on_demand_data.test.mjs`.

**Interfaces:** Consumes Task 1 result. Produces all `assets/data/` JSON files.

- [ ] **Step 1: Add a failing stable-path test**

```js
test('gives each index record a matching detail path', () => {
  const result = buildPeopleOnDemandData(fixture);
  for (const entry of result.peopleIndex.people) {
    assert.equal(result.peopleDetails.get(entry.id).id, entry.id);
    assert.match(entry.detailUrl, /^assets\/data\/people-details\/[a-z0-9-]+\.json$/);
  }
});
```

- [ ] **Step 2: Run the test; expect FAIL before path generation.**

- [ ] **Step 3: Write index and detail files deterministically**

```js
const dataRoot = path.join(outDir, 'assets', 'data');
await fs.mkdir(path.join(dataRoot, 'people-details'), { recursive: true });
await fs.mkdir(path.join(dataRoot, 'event-details'), { recursive: true });
await fs.writeFile(path.join(dataRoot, 'people-index.json'), JSON.stringify(peopleIndex));
for (const [id, detail] of peopleDetails) {
  await fs.writeFile(path.join(dataRoot, 'people-details', `${id}.json`), JSON.stringify(detail));
}
```

Write event files equivalently. Delete only stale `.json` files in the two known detail directories.

- [ ] **Step 4: Run `npm run build:museum && node --test scripts/lib/people_on_demand_data.test.mjs`; expect PASS and all outputs exist.**
- [ ] **Step 5: Commit build/output changes with message `feat: emit people museum data shards`.**

### Task 3: Replace inline `raw` with asynchronous loading

**Files:** Modify `scripts/build_ming_html.mjs:88-430`; create `scripts/verify_ming_people_on_demand_page.mjs`.

**Interfaces:** Uses index files and each `detailUrl`. Defines in generated page `loadPeopleIndex()`, `loadPersonDetail(id)`, `loadEventDetail(id)` and `retryDetail()`.

- [ ] **Step 1: Write a failing HTTP browser test**

```js
await page.goto(`${baseUrl}/people.html`);
await page.waitForSelector('#rows tr[data-id]');
await page.locator('#rows tr[data-id="zhu-yuan-zhang"]').click();
await expect(page.locator('#detail')).toContainText('朱元璋');
await expect(page.locator('#detail .profile-preview')).toBeVisible();
```

Intercept one detail fetch once, assert failure copy plus retry button, then release interception and assert a successful render.

- [ ] **Step 2: Run `node scripts/verify_ming_people_on_demand_page.mjs`; expect FAIL because no index fetch occurs.**

- [ ] **Step 3: Add index boot, cache and retry flow**

```js
const personDetailCache = new Map();
async function loadPersonDetail(id) {
  if (personDetailCache.has(id)) return personDetailCache.get(id);
  const response = await fetch(peopleById.get(id).detailUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const detail = await response.json();
  personDetailCache.set(id, detail);
  return detail;
}
```

Use indexes for lists and details for drawer text. Render a loading state before fetching. New IDs call `showDrawerAt(0)` only after render; cached current ID restores stored scroll. On failure show a retry control and preserve list/filter state.

- [ ] **Step 4: Run `node scripts/verify_ming_people_on_demand_page.mjs && npm run verify:people-timeline-page && npm run verify:people-timeline-doubleclick-page`; expect PASS.**
- [ ] **Step 5: Commit UI and browser verifier with message `feat: load people and event drawers on demand`.**

### Task 4: Gate data integrity and homepage weight

**Files:** Create `scripts/verify_ming_people_on_demand_data.mjs`; modify `package.json:15-30`.

**Interfaces:** Consumes output or `--deploy` bundle. Exits nonzero with exact parse, reference, duplicate-ID, forbidden-inline or size error.

- [ ] **Step 1: Write failing output assertions**

```js
assert.ok(Buffer.byteLength(peopleHtml) < 430 * 1024, 'people.html must be below 430 KB');
assert.equal(peopleHtml.includes('"personPages"'), false);
assert.equal(peopleHtml.includes('"historicalSlices"'), false);
for (const entry of peopleIndex.people) {
  const detail = JSON.parse(await fs.readFile(resolveOut(entry.detailUrl), 'utf8'));
  assert.equal(detail.id, entry.id);
}
```

Add symmetric event checks, duplicate ID checks, source-record counts, referenced image existence and query-field availability.

- [ ] **Step 2: Run verifier; expect failure until paths and output root are wired.**
- [ ] **Step 3: Implement verifier and add commands `verify:people-on-demand-data` and `verify:people-on-demand-page`; append both to `npm run verify`.**
- [ ] **Step 4: Run `npm run build:museum && npm run verify:people-on-demand-data && npm run verify:people-on-demand-page && npm run verify`; expect all PASS and log byte/shard counts.**
- [ ] **Step 5: Commit gate changes with message `test: verify on-demand people data delivery`.**

### Task 5: Include shards in deployment bundle

**Files:** Modify `scripts/build_vercel_bundle.mjs` only if needed; modify `scripts/verify_ming_people_on_demand_data.mjs` for `--deploy`.

**Interfaces:** Produces `dist/assets/data/` with every output JSON.

- [ ] **Step 1: Add a failing deploy assertion**

```js
assert.equal(await exists(path.join('dist', 'assets', 'data', 'people-index.json')), true);
assert.equal(await exists(path.join('dist', entry.detailUrl)), true, `missing deployed ${entry.detailUrl}`);
```

- [ ] **Step 2: Run `npm run build:deploy && node scripts/verify_ming_people_on_demand_data.mjs --deploy`; expect failure if the copier omits JSON.**
- [ ] **Step 3: If failing, copy only the generated data subtree**

```js
await fs.cp(path.join(museumDir, 'assets', 'data'), path.join(distDir, 'assets', 'data'), { recursive: true });
```

- [ ] **Step 4: Run `npm run build:museum && npm run build:deploy && node scripts/verify_ming_people_on_demand_data.mjs --deploy && npm run verify:deploy`; expect PASS.**
- [ ] **Step 5: Commit any deployment-copy adjustment with message `fix: include on-demand people data in deploy bundle`.**

## Final Verification and Handoff

- [ ] Run `git diff --check` and verify unrelated user files remain unstaged.
- [ ] Run `npm run build:museum && npm run verify`.
- [ ] Run `npm run build:deploy && node scripts/verify_ming_people_on_demand_data.mjs --deploy && npm run verify:deploy`.
- [ ] Report before/after `people.html` bytes and people/event shard counts.
- [ ] Provide HTTP preview URLs for `people.html`, `?person=朱元璋`, and one known `?event=` route.
