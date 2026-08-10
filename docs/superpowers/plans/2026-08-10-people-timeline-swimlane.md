# 人物馆连续年代长卷 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在人物馆增加默认显示的横向连续年代长卷，以严格年份比例呈现去重后的全部人物，同时完整保留人物总表、筛选和人物抽屉。

**Architecture:** 新增一份人工审校的时间轴元数据文件，以及一个独立的纯函数渲染模块，负责去重、验证、泳道布局和静态 HTML/CSS 生成。`build_ming_museum.mjs` 在生成 `people.html` 时注入长卷和客户端交互；原始人物表生成器保持不动，既有总表只通过视图切换显示或隐藏。数据验证、布局单元测试和 Playwright 页面验收分开运行，最终都并入现有构建与验证链路。

**Tech Stack:** Node.js 22、ES modules、原生 HTML/CSS/JavaScript、JSON、`node:test`、Playwright、现有静态构建脚本。

## Global Constraints

- 不增加第三方运行时依赖；继续使用当前静态 HTML 构建链路。
- `历史长卷`是人物馆默认视图；`人物总表`保留现有表格、筛选、帝系入口和人物抽屉。
- 当前数据由 139 名核心人物与 37 条重要皇室子女记录组成；13 人重复，页面必须去重为 163 人。
- 横坐标只能读取人工审校的 `timeline_year`，不得静默回退到 `birth`、`office_start`、`sort_year`或评分字段。
- 年度比例固定在每年 20—24px，本计划采用 22px；时间范围由最早、最晚登场年动态生成。
- 1368 与 1644 是重点朝代边界，不是裁剪边界；建立前和灭亡后相关人物仍须显示。
- 画布基础高度 960px，可按密度增长到约 1400px；时间轴始终位于纵向中线。
- 头像尺寸固定为皇帝 88px、关键人物 72px、普通人物 56px；不得读取评分决定尺寸。
- 同一泳道相邻头像最大重叠约 20%；先错层、再纵向扩展，不修改人物年份位置。
- 上方泳道从远到近为后妃与内廷女性、皇子女、皇帝；下方从近到远为宦官、文臣／武官、在野人物、政权人物／域外人物。
- 宦官泳道标签只能是“宦官”，不得出现“最近皇帝”。
- 点击人物先置顶头像、姓名、身份和登场年；选中节点另行提供“查看人物档案”动作。
- 现有 `scripts/build_ming_html.mjs` 与 `scripts/verify_ming_museum.mjs` 有未提交修改；执行时必须先查看差异，禁止覆盖或顺带提交无关改动。
- 每次提交前运行 `git diff --cached --check` 并确认暂存区只包含当前任务；对已有脏文件使用逐块暂存。

## File Structure

- Create: `data/ming_people_timeline.json` — 163 名去重人物的登场年、依据、置信度、来源、短身份和影响力级别。
- Create: `scripts/lib/people_timeline.mjs` — 名称归一化、数据验证、泳道布局、HTML/CSS 和客户端脚本生成。
- Create: `scripts/lib/people_timeline.test.mjs` — 数据契约、去重、严格年份比例、拥挤布局和渲染标记单元测试。
- Create: `scripts/verify_ming_people_timeline.mjs` — 对真实 163 人数据执行完整性和史料引用验证。
- Create: `scripts/verify_ming_people_timeline_page.mjs` — Playwright 验收默认视图、横向长卷、尺寸、泳道、交互、图片和移动端。
- Modify: `scripts/build_ming_museum.mjs` — 读取时间轴数据并只向人物馆注入组件。
- Modify: `scripts/verify_ming_museum.mjs` — 适配“长卷默认、总表次级”的新页面初始状态，保留原有回归检查。
- Modify: `package.json` — 增加数据与页面验证命令，并把它们并入 `npm run verify`。

---

### Task 1: 建立时间轴数据契约和去重验证

**Files:**
- Create: `scripts/lib/people_timeline.mjs`
- Create: `scripts/lib/people_timeline.test.mjs`

**Interfaces:**
- Consumes: `core: Array<Person>`、`children: Array<ImportantChild>`、`timelineData: {version, source_catalog, people}`。
- Produces: `canonicalPersonName(value: unknown): string`、`uniquePeopleRoster(core, children): Array<RosterPerson>`、`validatePeopleTimelineData({core, children, timelineData}): Array<TimelinePerson>`。

- [ ] **Step 1: 写名称归一化和去重的失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  canonicalPersonName,
  uniquePeopleRoster,
  validatePeopleTimelineData,
} from './people_timeline.mjs';

const core=JSON.parse(await fs.readFile('data/ming_core.json','utf8'));
const children=JSON.parse(await fs.readFile('data/ming_children_important.json','utf8'));

test('canonicalPersonName normalizes traditional variants used by the two datasets',()=>{
  assert.equal(canonicalPersonName('朱祁鎮'),'朱祁镇');
  assert.equal(canonicalPersonName(' 朱載坖 '),'朱载坖');
});

test('uniquePeopleRoster keeps core records and removes 13 duplicate child records',()=>{
  const roster=uniquePeopleRoster(core,children);
  assert.equal(roster.length,163);
  assert.equal(new Set(roster.map(person=>canonicalPersonName(person.name))).size,163);
  assert.equal(roster.find(person=>person.name==='朱棣').source,'core');
});
```

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `node --test scripts/lib/people_timeline.test.mjs`

Expected: FAIL，错误包含 `ERR_MODULE_NOT_FOUND` 或缺少导出函数。

- [ ] **Step 3: 实现名称归一化与核心记录优先去重**

```js
const CHAR_VARIANTS={熾:'炽',鎮:'镇',鈺:'钰',見:'见',載:'载',鈞:'钧',檢:'检',權:'权',標:'标',潤:'润'};

export function canonicalPersonName(value){
  return [...String(value??'').replace(/\s+/g,'')]
    .map(char=>CHAR_VARIANTS[char]||char)
    .join('');
}

export function uniquePeopleRoster(core,children){
  const seen=new Set();
  const result=[];
  for(const person of core){
    const key=canonicalPersonName(person.name);
    if(!key||seen.has(key))throw new Error(`Duplicate core person: ${person.name||'unnamed'}`);
    seen.add(key);
    result.push({...person,source:'core'});
  }
  for(const child of children){
    const name=child.name||child.title;
    const key=canonicalPersonName(name);
    if(!key||seen.has(key))continue;
    seen.add(key);
    result.push({...child,name,category:'皇室子女',office:child.title||'皇室子女',source:'important_child'});
  }
  return result;
}
```

- [ ] **Step 4: 写数据字段、来源引用和集合覆盖的失败测试**

```js
test('validatePeopleTimelineData rejects missing people and unregistered sources',()=>{
  const fixtureCore=[{name:'甲',category:'文臣',office:'尚书'}];
  const fixture={version:'1.0',source_catalog:{},people:[]};
  assert.throws(
    ()=>validatePeopleTimelineData({core:fixtureCore,children:[],timelineData:fixture}),
    /Missing timeline records: 甲/
  );
  fixture.people.push({
    name:'甲',source:'core',timeline_year:1400,timeline_year_label:'1400',
    timeline_year_basis:'进入仕途',timeline_year_confidence:'高',
    timeline_source_refs:['UNKNOWN'],timeline_role:'尚书',timeline_size:'standard'
  });
  assert.throws(
    ()=>validatePeopleTimelineData({core:fixtureCore,children:[],timelineData:fixture}),
    /Unknown timeline source UNKNOWN/
  );
});
```

- [ ] **Step 5: 实现严格数据验证**

验证器必须一次性收集并报告以下错误：根版本不是 `1.0`、人物缺失或多余、重复人物、记录来源与实际主记录不一致、来源目录缺少标签／URL／类型、年份不是整数、标签为空、依据为空、置信度不在 `高／中／低／未知`、来源引用不存在、短身份超过 12 个汉字、尺寸不在 `emperor／featured／standard`、皇帝未使用 `emperor`、非皇帝使用 `emperor`。

```js
const CONFIDENCE=new Set(['高','中','低','未知']);
const SIZES=new Set(['emperor','featured','standard']);

export function validatePeopleTimelineData({core,children,timelineData}){
  const roster=uniquePeopleRoster(core,children);
  const expected=new Map(roster.map(person=>[canonicalPersonName(person.name),person]));
  const records=timelineData?.people||[];
  const actual=new Map();
  const failures=[];
  if(timelineData?.version!=='1.0')failures.push('timeline version must be 1.0');
  if(!timelineData?.source_catalog||typeof timelineData.source_catalog!=='object')failures.push('missing source_catalog');
  for(const [sourceId,source] of Object.entries(timelineData?.source_catalog||{})){
    if(!source.label||!source.url||!source.kind)failures.push(`Incomplete timeline source ${sourceId}`);
  }
  for(const record of records){
    const key=canonicalPersonName(record.name);
    if(actual.has(key))failures.push(`Duplicate timeline record: ${record.name}`);
    actual.set(key,record);
    if(!expected.has(key))failures.push(`Extra timeline record: ${record.name}`);
    if(expected.has(key)&&record.source!==expected.get(key).source)failures.push(`${record.name}: source must be ${expected.get(key).source}`);
    if(!Number.isInteger(record.timeline_year))failures.push(`${record.name}: invalid timeline_year`);
    if(!record.timeline_year_label)failures.push(`${record.name}: missing timeline_year_label`);
    if(!record.timeline_year_basis)failures.push(`${record.name}: missing timeline_year_basis`);
    if(!CONFIDENCE.has(record.timeline_year_confidence))failures.push(`${record.name}: invalid confidence`);
    if(!Array.isArray(record.timeline_source_refs)||!record.timeline_source_refs.length)failures.push(`${record.name}: missing timeline_source_refs`);
    for(const sourceId of record.timeline_source_refs||[]){
      if(!timelineData.source_catalog?.[sourceId])failures.push(`Unknown timeline source ${sourceId}`);
    }
    if(!record.timeline_role||[...record.timeline_role].length>12)failures.push(`${record.name}: timeline_role must be 1-12 characters`);
    if(!SIZES.has(record.timeline_size))failures.push(`${record.name}: invalid timeline_size`);
    const category=expected.get(key)?.category;
    if(category==='皇帝'&&record.timeline_size!=='emperor')failures.push(`${record.name}: emperor must use emperor size`);
    if(category!=='皇帝'&&record.timeline_size==='emperor')failures.push(`${record.name}: non-emperor cannot use emperor size`);
  }
  const missing=[...expected].filter(([key])=>!actual.has(key)).map(([,person])=>person.name);
  if(missing.length)failures.push(`Missing timeline records: ${missing.join('、')}`);
  if(failures.length)throw new Error(failures.join('\n'));
  return roster.map(person=>({...person,...actual.get(canonicalPersonName(person.name))}));
}
```

- [ ] **Step 6: 运行单元测试**

Run: `node --test scripts/lib/people_timeline.test.mjs`

Expected: PASS，去重结果为 163，核心人物朱棣只保留一条。

- [ ] **Step 7: 提交数据契约**

```bash
git add scripts/lib/people_timeline.mjs scripts/lib/people_timeline.test.mjs
git diff --cached --check
git commit -m "test: define people timeline data contract"
```

### Task 2: 完成 163 人登场年份与史料数据

**Files:**
- Create: `data/ming_people_timeline.json`
- Create: `scripts/verify_ming_people_timeline.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 的 `validatePeopleTimelineData()`。
- Produces: 通过验证的 `timelineData`，供布局和构建任务读取；命令 `npm run verify:people-timeline`。

- [ ] **Step 1: 先写真实数据验证脚本**

```js
import fs from 'node:fs/promises';
import {validatePeopleTimelineData} from './lib/people_timeline.mjs';

const [core,children,timelineData]=await Promise.all([
  fs.readFile('data/ming_core.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_children_important.json','utf8').then(JSON.parse),
  fs.readFile('data/ming_people_timeline.json','utf8').then(JSON.parse),
]);
const people=validatePeopleTimelineData({core,children,timelineData});
const years=people.map(person=>person.timeline_year);
const approximate=people.filter(person=>/^约/.test(person.timeline_year_label)).length;
const featured=people.filter(person=>person.timeline_size==='featured').map(person=>person.name);
if(!['于谦','王守仁','张居正'].every(name=>featured.includes(name))){
  throw new Error('于谦、王守仁、张居正必须为 featured');
}
console.log(`People timeline verified: ${people.length} people, ${Math.min(...years)}-${Math.max(...years)}, ${approximate} approximate.`);
```

- [ ] **Step 2: 在 `package.json` 增加数据验证命令并确认失败**

```json
"verify:people-timeline": "node scripts/verify_ming_people_timeline.mjs"
```

Run: `npm run verify:people-timeline`

Expected: FAIL，明确报告缺少 `data/ming_people_timeline.json`。

- [ ] **Step 3: 创建带来源目录的时间轴数据文件**

根结构固定为：

```json
{
  "version": "1.0",
  "source_catalog": {
    "MINGSHI_YUQIAN": {
      "label": "《明史》卷170·于谦传",
      "url": "https://zh.wikisource.org/wiki/明史/卷170",
      "kind": "正史"
    },
    "MINGSHI_WANGSHOUREN": {
      "label": "《明史》卷195·王守仁传",
      "url": "https://zh.wikisource.org/wiki/明史/卷195",
      "kind": "正史"
    },
    "MINGSHI_ZHANGJUZHENG": {
      "label": "《明史》卷213·张居正传",
      "url": "https://zh.wikisource.org/wiki/明史/卷213",
      "kind": "正史"
    }
  },
  "people": [
    {
      "name": "于谦",
      "source": "core",
      "timeline_year": 1421,
      "timeline_year_label": "1421",
      "timeline_year_basis": "永乐十九年进士，进入仕途",
      "timeline_year_confidence": "高",
      "timeline_source_refs": ["MINGSHI_YUQIAN"],
      "timeline_role": "兵部尚书",
      "timeline_size": "featured"
    },
    {
      "name": "王守仁",
      "source": "core",
      "timeline_year": 1499,
      "timeline_year_label": "1499",
      "timeline_year_basis": "弘治十二年进士，进入仕途",
      "timeline_year_confidence": "高",
      "timeline_source_refs": ["MINGSHI_WANGSHOUREN"],
      "timeline_role": "兵部尚书／思想家",
      "timeline_size": "featured"
    },
    {
      "name": "张居正",
      "source": "core",
      "timeline_year": 1547,
      "timeline_year_label": "1547",
      "timeline_year_basis": "嘉靖二十六年进士，进入仕途",
      "timeline_year_confidence": "高",
      "timeline_source_refs": ["MINGSHI_ZHANGJUZHENG"],
      "timeline_role": "内阁首辅",
      "timeline_size": "featured"
    }
  ]
}
```

- [ ] **Step 4: 按统一口径补齐其余 160 人**

逐人核对并写入，不得批量复制出生年：皇帝用即位年；皇子女优先首次公开活动、受封、参政或婚姻年，只有出生记录时才用出生年；后妃用入宫、册立或首次政治活动年；文臣、武官、宦官用首次任官或公共行动年；在野人物用首次作品、思想或社会活动年；政权与域外人物用首次与明代政治、战争或外交发生明确关系的年份。

每条记录至少引用一条能支持该年份或年代判断的正史、实录、人物著作、博物馆或专业机构来源。只能确定年代时，`timeline_year`取区间中点，`timeline_year_label`保留“约某年代”或“约起止年”，并降低置信度。找不到合理区间时停止补录并报告，不得自动填值。

- [ ] **Step 5: 检查数据集合、来源和人工尺寸**

Run:

```bash
npm run verify:people-timeline
jq '.people | length' data/ming_people_timeline.json
jq -r '.people[] | select(.timeline_size=="featured") | .name' data/ming_people_timeline.json
```

Expected: 验证通过；记录数为 `163`；结果至少包含于谦、王守仁、张居正；16 名皇帝全部为 `emperor`；非皇帝没有 `emperor`。

- [ ] **Step 6: 提交已审校数据**

```bash
git add data/ming_people_timeline.json scripts/verify_ming_people_timeline.mjs package.json
git diff --cached --check
git commit -m "data: add curated people timeline years"
```

### Task 3: 实现严格年份比例与泳道拥挤布局

**Files:**
- Modify: `scripts/lib/people_timeline.mjs`
- Modify: `scripts/lib/people_timeline.test.mjs`

**Interfaces:**
- Consumes: `TimelinePerson[]`。
- Produces: `layoutPeopleTimeline(people, options?): TimelineLayout`；`TimelineLayout`包含 `minYear`、`maxYear`、`width`、`height`、`axisY`、`ticks[]`、`boundaries[]`、`nodes[]`。

- [ ] **Step 1: 写严格比例、轴线居中和泳道顺序的失败测试**

```js
import {layoutPeopleTimeline} from './people_timeline.mjs';

test('layout uses one strict x scale and keeps the axis centered',()=>{
  const people=[
    {name:'前朝人物',category:'政权人物',timeline_year:1352,timeline_size:'standard'},
    {name:'于谦',category:'文臣',timeline_year:1421,timeline_size:'featured'},
    {name:'王守仁',category:'文臣',timeline_year:1499,timeline_size:'featured'},
    {name:'张居正',category:'文臣',timeline_year:1547,timeline_size:'featured'},
    {name:'甲帝',category:'皇帝',timeline_year:1450,timeline_size:'emperor'},
    {name:'甲宦官',category:'宦官',timeline_year:1450,timeline_size:'standard'},
    {name:'过渡人物',category:'政权人物',timeline_year:1650,timeline_size:'standard'},
  ];
  const layout=layoutPeopleTimeline(people,{yearPx:22,paddingX:140,minHeight:960,maxHeight:1400});
  const byName=Object.fromEntries(layout.nodes.map(node=>[node.name,node]));
  assert.equal(byName.王守仁.x-byName.于谦.x,(1499-1421)*22);
  assert.equal(byName.张居正.x-byName.王守仁.x,(1547-1499)*22);
  assert.equal(layout.axisY,layout.height/2);
  assert.ok(byName.甲帝.y<layout.axisY);
  assert.ok(byName.甲宦官.y>layout.axisY);
  assert.ok(layout.boundaries.some(boundary=>boundary.year===1368));
  assert.ok(layout.boundaries.some(boundary=>boundary.year===1644));
});
```

- [ ] **Step 2: 写同年错层和最大 20% 重叠的失败测试**

```js
test('dense people stay on their year and never overlap more than 20 percent in one slot',()=>{
  const people=Array.from({length:10},(_,index)=>({
    name:`同年人物${index}`,category:'文臣',timeline_year:1449,
    timeline_size:index===0?'featured':'standard'
  }));
  const layout=layoutPeopleTimeline(people);
  const nodes=layout.nodes.filter(node=>node.timeline_year===1449);
  assert.equal(new Set(nodes.map(node=>node.x)).size,1);
  assert.ok(new Set(nodes.map(node=>node.slot)).size>1);
  assert.ok(layout.height>=960&&layout.height<=1400);
});
```

- [ ] **Step 3: 运行测试并确认缺少布局函数**

Run: `node --test scripts/lib/people_timeline.test.mjs`

Expected: FAIL，错误指向 `layoutPeopleTimeline` 未导出。

- [ ] **Step 4: 实现分类映射、尺寸和年份刻度**

```js
export const TIMELINE_YEAR_PX=22;
export const TIMELINE_SIZE_PX={emperor:88,featured:72,standard:56};
export const TIMELINE_LANES={
  '后妃与内廷女性':{id:'women',side:'top',order:0,label:'后妃与内廷女性'},
  '皇室子女':{id:'children',side:'top',order:1,label:'皇子女'},
  '皇帝':{id:'emperor',side:'top',order:2,label:'皇帝'},
  '宦官':{id:'eunuch',side:'bottom',order:0,label:'宦官'},
  '文臣':{id:'officials',side:'bottom',order:1,label:'文臣／武官'},
  '武官':{id:'officials',side:'bottom',order:1,label:'文臣／武官'},
  '在野人物':{id:'independent',side:'bottom',order:2,label:'在野人物'},
  '政权人物':{id:'external',side:'bottom',order:3,label:'政权人物／域外人物'},
  '域外人物':{id:'external',side:'bottom',order:3,label:'政权人物／域外人物'},
};
```

刻度每十年生成一次，并无条件加入 1368、1644 两个边界；两者使用 `boundary` 类型，普通十年刻度使用 `decade` 类型。

- [ ] **Step 5: 实现稳定的贪心错层算法**

处理顺序固定为 `timeline_year`、头像尺寸降序、中文姓名。每个泳道从第一个纵向层开始寻找可放位置；同一层内，相邻头像中心距至少为 `0.8 × (前头像直径 + 当前头像直径) / 2`。没有可用层时新增层；根据各泳道实际层数计算上下总高度，并把较短一侧补空白，使 `axisY === height / 2`。如果按当前规则需要超过 1400px，抛出包含泳道和冲突人物名的错误，不得继续缩小头像或移动横坐标。

```js
function assignSlots(nodes){
  const slots=[];
  for(const node of nodes){
    let slot=slots.findIndex(previous=>{
      if(!previous)return true;
      const minimum=.8*(previous.sizePx+node.sizePx)/2;
      return node.x-previous.x>=minimum;
    });
    if(slot<0){slot=slots.length;slots.push(null);}
    node.slot=slot;
    slots[slot]=node;
  }
  return slots.length;
}
```

- [ ] **Step 6: 用真实数据运行布局测试**

在测试中读取 `data/ming_people_timeline.json`，调用验证和布局函数，断言：节点数 163、姓名唯一、画布宽度在 6500—7500px、画布高度在 960—1400px、最小年份小于 1368、最大年份至少覆盖 1644、所有节点的 `x` 都等于同一公式计算值。布局范围按 `min(人物年份,1368)` 与 `max(人物年份,1644)` 计算，确保朝代边界永远位于画布内；若确有1644年后才登场的人物，则自然继续向右扩展。

Run: `node --test scripts/lib/people_timeline.test.mjs`

Expected: PASS，无布局溢出错误。

- [ ] **Step 7: 提交布局算法**

```bash
git add scripts/lib/people_timeline.mjs scripts/lib/people_timeline.test.mjs
git diff --cached --check
git commit -m "feat: add deterministic people timeline layout"
```

### Task 4: 渲染长卷结构、画像和类别视觉

**Files:**
- Modify: `scripts/lib/people_timeline.mjs`
- Modify: `scripts/lib/people_timeline.test.mjs`

**Interfaces:**
- Consumes: `TimelineLayout`、`portraitFor(name): {file, kind, label} | null`。
- Produces: `renderPeopleTimeline({people, layout, portraitFor}): string`、`PEOPLE_TIMELINE_CSS: string`。

- [ ] **Step 1: 写渲染契约失败测试**

```js
test('renderer outputs every semantic lane and never writes 最近皇帝',()=>{
  const timelineData=JSON.parse(await fs.readFile('data/ming_people_timeline.json','utf8'));
  const people=validatePeopleTimelineData({core,children,timelineData});
  const layout=layoutPeopleTimeline(people);
  const html=renderPeopleTimeline({people,layout,portraitFor:()=>null});
  assert.match(html,/id="peopleTimelineView"/);
  assert.equal((html.match(/data-timeline-person=/g)||[]).length,163);
  for(const label of ['后妃与内廷女性','皇子女','皇帝','宦官','文臣／武官','在野人物','政权人物／域外人物'])assert.match(html,new RegExp(label));
  assert.doesNotMatch(html,/最近皇帝/);
  assert.match(html,/data-people-view="timeline"/);
  assert.match(html,/data-people-view="table"/);
});
```

- [ ] **Step 2: 运行测试并确认渲染函数缺失**

Run: `node --test scripts/lib/people_timeline.test.mjs`

Expected: FAIL，错误指向 `renderPeopleTimeline` 或 `PEOPLE_TIMELINE_CSS` 未定义。

- [ ] **Step 3: 实现语义化长卷 HTML**

组件必须包含：`role="tablist"` 的两个视图按钮、`#peopleTimelineView`、横向滚动容器、固定宽高画布、中心轴线、十年刻度、1368／1644边界、七个泳道标签、163 个 `article.timeline-person`。每个节点内部使用独立选择按钮，不能嵌套按钮；选中后显示档案按钮。

```html
<article class="timeline-person category-civil size-featured"
  data-timeline-person="于谦" data-year="1421"
  style="--person-x:...px;--person-y:...px;--avatar-size:72px">
  <button class="timeline-person-select" type="button" aria-pressed="false"
    aria-label="于谦，兵部尚书，1421进入历史叙事，高置信度">
    <span class="timeline-portrait">…</span>
    <strong>于谦</strong><small>兵部尚书</small><time>1421</time>
  </button>
  <button class="timeline-person-open" type="button" data-open-person="于谦" hidden>查看人物档案</button>
</article>
```

- [ ] **Step 4: 实现画像与失败占位**

有画像时输出 `loading="lazy" decoding="async"`，历史图像与 AI 想象像沿用注册表的 `kind`和`label`；同时输出默认隐藏的姓名首字占位。无画像时直接显示首字占位。图片错误由下一任务客户端脚本切换到已存在的占位，不使用破图图标。

- [ ] **Step 5: 实现已确认的尺寸、颜色和滚动样式**

```css
.people-timeline-viewport{overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-gutter:stable}
.people-timeline-canvas{position:relative;width:var(--timeline-width);height:var(--timeline-height);min-width:6500px}
.timeline-axis{position:absolute;left:0;right:0;top:50%;height:1px;background:#8f8876}
.timeline-person{position:absolute;left:var(--person-x);top:var(--person-y);z-index:2;transform:translate(-50%,-50%)}
.timeline-portrait{width:var(--avatar-size);height:var(--avatar-size);border:3px solid var(--category-color);border-radius:50%;overflow:hidden}
.size-emperor{--avatar-size:88px;--category-color:#d0a743}
.size-featured{--avatar-size:72px}
.size-standard{--avatar-size:56px}
.timeline-person.is-selected,.timeline-person:focus-within{z-index:1000}
.timeline-person.is-selected .timeline-portrait,.timeline-person:focus-within .timeline-portrait{box-shadow:0 0 0 4px #171815,0 0 0 7px #f0e1b6}
```

类别色分别定义为皇帝金、皇子女蓝、后妃紫红、宦官紫、文臣绿、武官赤褐、在野赭色、政权／域外蓝灰。姓名始终显示，身份用较小字号；年份与档案按钮只在选中或键盘聚焦时显示在最高层。

- [ ] **Step 6: 运行渲染与布局测试**

Run: `node --test scripts/lib/people_timeline.test.mjs`

Expected: PASS；HTML 中恰有 163 个节点，不包含“最近皇帝”。

- [ ] **Step 7: 提交渲染器**

```bash
git add scripts/lib/people_timeline.mjs scripts/lib/people_timeline.test.mjs
git diff --cached --check
git commit -m "feat: render people timeline swimlanes"
```

### Task 5: 把历史长卷注入人物馆并保留人物总表

**Files:**
- Modify: `scripts/lib/people_timeline.mjs`
- Modify: `scripts/build_ming_museum.mjs:1-64`
- Modify: `scripts/verify_ming_museum.mjs:64-75,363-369,829-930,1371-1382`
- Create: `scripts/verify_ming_people_timeline_page.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 4 的 `renderPeopleTimeline()`、`PEOPLE_TIMELINE_CSS`。
- Produces: 基础版 `peopleTimelineClientScript(): string`、默认 `data-people-view="timeline"` 的 `people.html`、`setPeopleView(view)` 客户端接口、命令 `npm run verify:people-timeline-page`。

- [ ] **Step 1: 先写默认视图和切换的页面失败测试**

```js
import {chromium} from 'playwright';
import path from 'node:path';

const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('file://'+path.join(root,'people.html'),{waitUntil:'networkidle'});

const initial=await page.evaluate(()=>({
  view:document.body.dataset.peopleView,
  timeline:getComputedStyle(document.querySelector('#peopleTimelineView')).display,
  table:getComputedStyle(document.querySelector('.tablewrap')).display,
  selected:document.querySelector('[data-people-view="timeline"]').getAttribute('aria-selected')
}));
if(initial.view!=='timeline'||initial.timeline==='none'||initial.table!=='none'||initial.selected!=='true')throw new Error(JSON.stringify(initial));

await page.locator('[data-people-view="table"]').click();
const tableView=await page.evaluate(()=>({
  view:document.body.dataset.peopleView,
  timeline:getComputedStyle(document.querySelector('#peopleTimelineView')).display,
  table:getComputedStyle(document.querySelector('.tablewrap')).display
}));
if(tableView.view!=='table'||tableView.timeline!=='none'||tableView.table==='none')throw new Error(JSON.stringify(tableView));
```

- [ ] **Step 2: 添加页面验证命令并确认失败**

```json
"verify:people-timeline-page": "node scripts/verify_ming_people_timeline_page.mjs"
```

Run:

```bash
npm run build:museum
npm run verify:people-timeline-page
```

Expected: FAIL，页面不存在 `#peopleTimelineView` 或视图按钮。

- [ ] **Step 3: 在博物馆构建器读取并构建长卷**

在 `scripts/build_ming_museum.mjs` 顶部导入渲染模块并读取 `data/ming_people_timeline.json`。画像解析优先读取 `ming_portraits.json` 中状态为 `image` 或 `imagined` 的记录，其次读取 `ming_storytelling.json` 中的想象像，最后返回 `null`。

```js
import {
  validatePeopleTimelineData,layoutPeopleTimeline,renderPeopleTimeline,
  PEOPLE_TIMELINE_CSS,peopleTimelineClientScript
} from './lib/people_timeline.mjs';

const timelineData=JSON.parse(await fs.readFile('data/ming_people_timeline.json','utf8'));
const timelinePeople=validatePeopleTimelineData({core,children:importantChildren,timelineData});
const timelineLayout=layoutPeopleTimeline(timelinePeople);
const timelinePortraitFor=name=>{
  const registered=portraits.people?.[name];
  if(['image','imagined'].includes(registered?.status)&&registered?.file){
    return {file:registered.file,kind:registered.status==='imagined'?'imagined':'sourced',label:registered.status==='imagined'?'AI想象像':''};
  }
  const imagined=storytelling.people?.[name]?.portrait||'';
  return imagined?{file:imagined,kind:'imagined',label:'AI想象像'}:null;
};
const peopleTimelineHtml=renderPeopleTimeline({people:timelinePeople,layout:timelineLayout,portraitFor:timelinePortraitFor});
```

- [ ] **Step 4: 只向人物馆注入组件**

在 `baseHall('people')` 分支中：给 `<body>` 增加 `data-people-view="timeline"`；在现有帝系 `.timeline` 之前插入视图按钮和 `peopleTimelineHtml`；在样式结束前插入 `PEOPLE_TIMELINE_CSS`；在 `</body>` 前插入 `peopleTimelineClientScript()`。事件馆不加载、不显示、不初始化该组件。

基础客户端脚本必须实现视图按钮和渐进增强：默认选择长卷；选择总表时隐藏长卷并显示现有帝系、工具栏、状态、表格和评分方法；URL带 `event` 参数时直接选择总表。脚本同时更新两个按钮的 `aria-selected`、`tabindex`和 `document.body.dataset.peopleView`。

```js
export function peopleTimelineClientScript(){
  return `(()=>{
    const body=document.body;
    const timeline=document.getElementById('peopleTimelineView');
    const tableSections=[...document.querySelectorAll('.people-page>.shell>.timeline,.people-page>.shell>.toolbar,.people-page>.shell>.statusline,.people-page>.shell>.tablewrap,.people-page>.shell>.method')];
    const buttons=[...document.querySelectorAll('[data-people-view]')];
    window.setPeopleView=view=>{
      const showTimeline=view==='timeline';
      body.dataset.peopleView=showTimeline?'timeline':'table';
      timeline.hidden=!showTimeline;
      tableSections.forEach(section=>section.hidden=showTimeline);
      buttons.forEach(button=>{
        const selected=button.dataset.peopleView===body.dataset.peopleView;
        button.setAttribute('aria-selected',String(selected));
        button.tabIndex=selected?0:-1;
      });
    };
    buttons.forEach(button=>button.addEventListener('click',()=>setPeopleView(button.dataset.peopleView)));
    setPeopleView(new URLSearchParams(location.search).has('event')?'table':'timeline');
  })();`;
}
```

渲染结果还要包含 `<noscript>` 回退样式：禁用 JavaScript 时隐藏长卷和视图按钮，显示帝系、工具栏、总表和评分方法，保证基础人物数据仍可访问。

- [ ] **Step 5: 让旧人物馆验收显式进入总表视图**

在 `scripts/verify_ming_museum.mjs` 中：初次访问 `people.html?person=于谦` 时改为断言长卷显示、总表隐藏；凡后续要点击 `#reset`、身份 chip、机构筛选或帝系按钮的测试，在操作前先点击 `[data-people-view="table"]`。保留原来的163人、筛选、抽屉、画像、评分最后一行和子女列验收。

由于该文件已有未提交修改，暂存时使用 `git add -p scripts/verify_ming_museum.mjs`，只选择本任务新增加的视图切换测试块；暂存后逐行查看 `git diff --cached -- scripts/verify_ming_museum.mjs`。

- [ ] **Step 6: 构建并运行视图切换验收**

Run:

```bash
npm run build:museum
npm run verify:people-timeline-page
npm run verify
```

Expected: 长卷页面验证 PASS；现有人物馆回归验证 PASS；`people.html?event=e035`自动显示总表视图，`people.html?person=于谦`仍打开于谦档案。

- [ ] **Step 7: 提交页面集成**

```bash
git add scripts/lib/people_timeline.mjs scripts/build_ming_museum.mjs scripts/verify_ming_people_timeline_page.mjs package.json
git add -p scripts/verify_ming_museum.mjs
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add people timeline as default gallery view"
```

### Task 6: 实现人物置顶、档案入口和图片失败回退

**Files:**
- Modify: `scripts/lib/people_timeline.mjs`
- Modify: `scripts/verify_ming_people_timeline_page.mjs`

**Interfaces:**
- Consumes: 页面全局已有的 `personRecord(name)`、`personPageMeta(person)`、`personPageHref(person)`、`syncPeopleQuery(kind,value)`、`openDetail(person)`。
- Produces: `peopleTimelineClientScript(): string`；选择按钮的 `.is-selected` 状态；档案按钮和图片回退行为。

- [ ] **Step 1: 扩展页面测试并确认交互失败**

测试必须记录于谦节点选中前后的 `left/top`，点击选择按钮后断言：只有一个 `.is-selected`；`aria-pressed="true"`；头像、姓名、身份、年份所在节点的 `z-index`高于其他节点；坐标没有变化；档案按钮可见。随后点击档案按钮，断言抽屉标题为“于谦”。

```js
const yuqian=page.locator('[data-timeline-person="于谦"]');
const before=await yuqian.evaluate(node=>({left:node.style.left,top:node.style.top}));
await yuqian.locator('.timeline-person-select').click();
const selected=await yuqian.evaluate(node=>({
  selected:node.classList.contains('is-selected'),
  pressed:node.querySelector('.timeline-person-select').getAttribute('aria-pressed'),
  zIndex:Number(getComputedStyle(node).zIndex),
  left:node.style.left,top:node.style.top,
  openHidden:node.querySelector('.timeline-person-open').hidden
}));
if(!selected.selected||selected.pressed!=='true'||selected.zIndex<1000||selected.openHidden||selected.left!==before.left||selected.top!==before.top)throw new Error(JSON.stringify(selected));
await yuqian.locator('.timeline-person-open').click();
if(await page.locator('#detail h2').textContent()!=='于谦')throw new Error('drawer did not open 于谦');
```

- [ ] **Step 2: 实现单选置顶和空白／Escape取消**

客户端脚本使用事件委托。`selectPerson(article)`先清除所有节点状态，再给目标节点增加 `.is-selected`、把选择按钮设为 `aria-pressed="true"`、显示该节点档案按钮。点击画布空白或在抽屉关闭时按 `Escape` 清除选择。选择过程禁止写入 `left`、`top`、`transform`，不得重新调用布局函数。

- [ ] **Step 3: 实现档案入口并保留移动端现有规则**

```js
function openTimelinePerson(name){
  const person=personRecord(name);
  if(!person)return;
  syncPeopleQuery('person',person.name);
  if(personPageMeta(person)&&matchMedia('(max-width:720px)').matches){
    location.href=personPageHref(person);
    return;
  }
  openDetail(person);
}
```

桌面端继续使用人物抽屉；已有独立人物页的人物在 720px 以下沿用现有跳转规则。

- [ ] **Step 4: 实现图片错误回退测试与逻辑**

页面测试先等待所有长卷图片完成加载，断言 `naturalWidth > 0`；再把一个测试节点图片改成不存在的地址，等待 `error` 后断言图片隐藏、首字占位显示、节点仍可点击。

客户端初始化时为 `[data-timeline-image]` 注册一次 `error` 监听：隐藏图片与图像来源角标，显示同节点 `[data-timeline-fallback]`。无图片节点初始即显示占位。

- [ ] **Step 5: 验证键盘焦点和选择行为**

Playwright 使用 `Tab` 聚焦人物选择按钮，断言 `:focus-within`节点处于最高层；按 `Enter`等价于点击；按 `Escape`取消选中；选择其他人物后于谦不再为 `.is-selected`。

Run:

```bash
node --test scripts/lib/people_timeline.test.mjs
npm run build:museum
npm run verify:people-timeline-page
```

Expected: PASS，控制台 `pageerror` 数组为空。

- [ ] **Step 6: 提交交互**

```bash
git add scripts/lib/people_timeline.mjs scripts/verify_ming_people_timeline_page.mjs
git diff --cached --check
git commit -m "feat: add people timeline focus interactions"
```

### Task 7: 完成响应式、几何和全链路回归验收

**Files:**
- Modify: `scripts/verify_ming_people_timeline_page.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: 完整人物馆长卷页面。
- Produces: `npm run verify`覆盖数据、原人物馆和长卷页面；桌面与移动端验收截图。

- [ ] **Step 1: 增加163人、年份比例和边界断言**

页面验证收集全部 `[data-timeline-person]`，断言节点数和姓名唯一数均为 163；于谦、王守仁、张居正的数据年份分别为 1421、1499、1547；三者横坐标差值分别等于 `78 × 22`和`48 × 22`，误差不超过 0.5px；1368和1644边界元素各一条。

- [ ] **Step 2: 增加尺寸、泳道与文案断言**

断言 16 名皇帝头像计算尺寸都是 88×88px且描边色为金色；于谦、王守仁、张居正为72×72px；普通人物不小于56×56px。根据 `data-lane`检查上方和下方顺序，皇帝是最接近轴线的上方泳道，宦官是最接近轴线的下方泳道。页面全文不得包含“最近皇帝”。

- [ ] **Step 3: 增加滚动、重叠和移动端断言**

桌面1440px与移动端390px分别检查：`people-timeline-viewport.scrollWidth > clientWidth`；`overflow-x`为`auto`、`overflow-y`为`hidden`；`document.body.scrollWidth === innerWidth`；横向滚动到中段后人物仍可点击。用布局节点的中心和尺寸计算同泳道同层相邻头像重叠率，最大值不得超过0.2。

另建 `javaScriptEnabled:false` 的 Playwright context 打开 `people.html`，断言长卷隐藏而 `.tablewrap` 可见，验证无脚本回退没有把人物数据锁死。

- [ ] **Step 4: 生成验收截图**

```js
await page.setViewportSize({width:1440,height:1000});
await page.locator('#peopleTimelineView').screenshot({path:path.join(root,'人物馆_历史长卷_桌面预览.png')});
await page.setViewportSize({width:390,height:844});
await page.locator('#peopleTimelineView').screenshot({path:path.join(root,'人物馆_历史长卷_移动端预览.png')});
```

截图不得加入 Git；它们只写入现有 `outputs/.../明史数字博物馆`验收目录。

- [ ] **Step 5: 把两项新验证并入总验证命令**

```json
"verify": "node scripts/verify_ming_people_timeline.mjs && node scripts/verify_ming_museum.mjs && node scripts/verify_ming_people_timeline_page.mjs"
```

- [ ] **Step 6: 运行完整构建和验证链路**

Run:

```bash
npm run verify:people-timeline
node --test scripts/lib/people_timeline.test.mjs
npm run build:museum
npm run verify
npm run build:deploy
npm run verify:deploy
```

Expected: 全部退出码为 0；没有缺图、重复人物、年份覆盖缺失、页面脚本错误、body横向溢出或既有筛选／抽屉回归。

- [ ] **Step 7: 检查最终差异和提交**

```bash
git status --short
git diff --check
git add scripts/verify_ming_people_timeline_page.mjs package.json
git diff --cached --check
git diff --cached --stat
git commit -m "test: verify people timeline end to end"
```

提交前确认 `outputs/`、`.superpowers/`和用户原有未跟踪文档均未进入暂存区。
