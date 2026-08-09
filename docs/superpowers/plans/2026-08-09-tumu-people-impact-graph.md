# 土木堡之变人物作用图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在“土木堡之变”专题加入完整三阶段人物作用图，并在事件馆 `e033` 详情加入只覆盖1449年八月的三人紧凑图及完整专题入口。

**Architecture:** 新建 `data/ming_people_impact_graphs.json` 作为唯一关系数据源；新建共享渲染模块负责数据校验、头像解析、SVG端点计算和完整/紧凑图HTML生成。专题构建器直接插入完整组件；基础页面构建器预生成事件紧凑图并嵌入现有数据集，事件抽屉只按事件ID读取成品HTML，不复制关系数据。

**Tech Stack:** Node.js ESM、JSON、静态 HTML/CSS、原生 JavaScript、SVG、Playwright。

## Global Constraints

- 第一版只收录 `tumu-crisis`，不扩展其他五个专题。
- 专题页展示三个阶段；事件页 `e033` 只展示“亲征与战败”。
- 动作线宽 `.82`，身份/状态虚线宽 `.65`，均使用 `vector-effect: non-scaling-stroke`。
- 动作箭头为 `10 × 10`；身份/状态虚线无箭头。
- 关系线端点必须由节点圆心和半径计算，禁止手写不接头像的CSS短线。
- AI想象像必须使用虚线头像环并显示“AI想象像”。
- 关系图失败时，现有事件详情、人物标签和专题人物卡仍可使用。
- 保留当前工作区已有未提交修改；目标脚本已有其他改动，本计划不自动提交实现代码，只做精确编辑、构建、验收和差异报告。

---

## File Map

- Create: `data/ming_people_impact_graphs.json` — 唯一人物作用关系数据源。
- Create: `scripts/lib/render_people_impact_graph.mjs` — 校验数据，计算SVG端点，生成专题完整版与事件紧凑版HTML。
- Modify: `scripts/build_ming_exhibitions.mjs` — 读取关系数据，在土木堡专题插入完整组件和阶段交互。
- Modify: `scripts/build_ming_html.mjs` — 读取关系数据，预生成事件紧凑图，嵌入基础页面数据集并插入事件抽屉。
- Modify: `scripts/verify_ming_museum.mjs` — 增加数据、专题、事件、移动端和无障碍验收。
- Generated only: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/exhibit-tumu-crisis.html`
- Generated only: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/events.html`

---

### Task 1: 建立可校验的唯一关系数据源

**Files:**
- Create: `data/ming_people_impact_graphs.json`
- Create: `scripts/lib/render_people_impact_graph.mjs`
- Modify: `scripts/verify_ming_museum.mjs`

**Interfaces:**
- Produces: `validateImpactGraphData(data)`、`graphForExhibition(data,id)`、`graphForEvent(data,id)`、经过校验的 `graphs[]`。
- Consumes: 人名、节点百分比坐标、关系类型、方向、置信度与来源ID。

- [ ] **Step 1: 写数据契约失败验收**

在 `scripts/verify_ming_museum.mjs` 读取新数据文件并定义：

```js
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
```

将 `impactGraphDataPass` 放入 `audit`，并在最终 `audit.pass` 中要求为真。

- [ ] **Step 2: 运行验收并确认失败**

Run: `npm run verify`

Expected: FAIL，错误为 `ENOENT: data/ming_people_impact_graphs.json`。

- [ ] **Step 3: 写入完整关系数据**

文件顶层结构固定为：

```json
{
  "version": "1.0",
  "graphs": [
    {
      "id": "tumu-crisis",
      "title": "土木堡之变人物作用图",
      "exhibitionId": "tumu-crisis",
      "eventId": "e033",
      "compactStageId": "defeat",
      "stages": [],
      "sources": []
    }
  ]
}
```

三个阶段写入以下节点坐标与关系：

```js
const expectedStages={
  defeat:{
    label:'亲征与战败',range:'1449.08',
    nodes:[['王振',18,18],['也先',82,18],['朱祁镇',50,46]],
    edges:[
      ['王振','朱祁镇','影响亲征与行军','决策影响','support',true,'中',['DPM_TUMU','MINGSHI_YUQIAN']],
      ['也先','朱祁镇','率军围击 · 英宗被俘','战争与俘获','conflict',true,'高',['DPM_TUMU','MINGSHI_YUQIAN']]
    ]
  },
  beijing:{
    label:'北京危机',range:'1449.09—11',
    nodes:[['朱祁钰',18,17],['于谦',82,17],['朱祁镇',18,47],['也先',82,47]],
    edges:[
      ['朱祁钰','于谦','任用 · 组织防务','协作关系','support',true,'高',['MINGSHI_YUQIAN']],
      ['也先','朱祁镇','挟英宗施压','人质政治','conflict',true,'高',['MINGSHI_YUQIAN']],
      ['朱祁镇','朱祁钰','兄弟 · 皇位替代','两帝并存的起点','status',false,'高',['MINGSHI_YUQIAN','CAMBRIDGE_CRISIS']]
    ]
  },
  restoration:{
    label:'复辟与清算',range:'1450—1457',
    nodes:[['朱祁镇',18,17],['石亨',82,17],['于谦',18,47],['曹吉祥',82,47]],
    edges:[
      ['石亨','朱祁镇','迎立英宗复位','夺门参与者','support',true,'高',['MINGSHI_YUQIAN']],
      ['曹吉祥','朱祁镇','参与发动政变','夺门参与者','support',true,'高',['MINGSHI_YUQIAN']],
      ['朱祁镇','于谦','裁决处死于谦','政治清算结果','conflict',true,'高',['MINGSHI_YUQIAN']]
    ]
  }
};
```

上面数组只是防止计划重复大段JSON；落盘时必须转换为具名对象：

```js
const nodes=tuples=>tuples.map(([name,x,y])=>({name,x,y}));
const edges=tuples=>tuples.map(([from,to,label,note,type,directed,confidence,sourceIds])=>({from,to,label,note,type,directed,confidence,sourceIds}));
```

每个阶段同时写入设计稿已确认的 `intro` 和 `outcome`；来源URL固定为故宫“土木之变”、Wikisource《明史》卷170、专题已有 Cambridge 论文。

- [ ] **Step 4: 实现数据校验与查询**

在共享模块导出：

```js
export function validateImpactGraphData(data){
  if(data?.version!=='1.0'||!Array.isArray(data.graphs))throw new Error('Invalid impact graph root');
  for(const graph of data.graphs){
    if(!graph.id||!graph.exhibitionId||!graph.eventId||!Array.isArray(graph.stages))throw new Error(`Invalid graph ${graph.id||'unknown'}`);
    for(const stage of graph.stages){
      const names=new Set(stage.nodes.map(node=>node.name));
      for(const node of stage.nodes){
        if(!Number.isFinite(node.x)||!Number.isFinite(node.y)||node.x<6||node.x>94||node.y<6||node.y>56)throw new Error(`Invalid node position ${node.name}`);
      }
      for(const edge of stage.edges){
        if(!names.has(edge.from)||!names.has(edge.to))throw new Error(`Unknown edge node ${edge.from} -> ${edge.to}`);
        if(!['support','conflict','status'].includes(edge.type))throw new Error(`Invalid edge type ${edge.type}`);
        if(edge.type==='status'&&edge.directed)throw new Error('Status edge cannot be directed');
      }
    }
  }
  return data;
}
export const graphForExhibition=(data,id)=>data.graphs.find(graph=>graph.exhibitionId===id)||null;
export const graphForEvent=(data,id)=>data.graphs.find(graph=>graph.eventId===id)||null;
```

- [ ] **Step 5: 运行数据验收**

Run: `npm run verify`

Expected: 关系数据契约通过；页面组件相关断言尚未加入。

- [ ] **Step 6: 检查本任务边界**

Run: `git diff --check -- data/ming_people_impact_graphs.json scripts/lib/render_people_impact_graph.mjs scripts/verify_ming_museum.mjs`

Expected: 无空白错误；不提交当前工作区。

---

### Task 2: 在土木堡专题渲染完整三阶段作用图

**Files:**
- Modify: `scripts/lib/render_people_impact_graph.mjs`
- Modify: `scripts/build_ming_exhibitions.mjs`
- Modify: `scripts/verify_ming_museum.mjs`

**Interfaces:**
- Consumes: `graphForExhibition()`；`portraitFor(name)` 返回 `{file,kind,label}`；`personHref(name)` 返回人物馆URL或空字符串。
- Produces: `edgeEndpoints(stage,edge,radius)`、`renderFullImpactGraph(options)`、`#people-impact-graph`、`[data-impact-stage]`。

- [ ] **Step 1: 写专题页失败验收**

在现有专题画像循环之后打开 `exhibit-tumu-crisis.html`，检查：

```js
await page.goto(url('exhibit-tumu-crisis.html'),{waitUntil:'networkidle'});
const tumuImpactInitial=await page.evaluate(()=>({
  room:Boolean(document.querySelector('#people-impact-graph')),
  tabs:document.querySelectorAll('[data-impact-stage]').length,
  active:document.querySelector('[data-impact-stage][aria-selected="true"]')?.dataset.impactStage||'',
  panels:document.querySelectorAll('[data-impact-panel]').length,
  visible:document.querySelector('[data-impact-panel]:not([hidden])')?.dataset.impactPanel||'',
  nodes:[...document.querySelectorAll('[data-impact-panel]:not([hidden]) [data-impact-node]')].map(node=>node.dataset.impactNode),
  arrows:[...document.querySelectorAll('[data-impact-panel]:not([hidden]) marker')].map(marker=>[marker.getAttribute('markerWidth'),marker.getAttribute('markerHeight')]),
  overflow:document.body.scrollWidth-innerWidth
}));
```

点击 `[data-impact-stage="beijing"]`，断言可见面板变为 `beijing`，节点为朱祁钰、于谦、朱祁镇、也先。

对每条 `[data-impact-edge]` 读取 `x1/y1/x2/y2`，计算端点到对应 `[data-impact-node] [data-impact-ring]` 圆心的距离，断言误差小于 `0.05` 且等于半径 `6`。

- [ ] **Step 2: 运行构建与验收并确认失败**

Run: `npm run build:museum && npm run verify`

Expected: FAIL，`tumuImpactInitial.room === false`。

- [ ] **Step 3: 实现SVG端点计算和节点渲染**

共享模块使用：

```js
export function edgeEndpoints(stage,edge,radius=6){
  const from=stage.nodes.find(node=>node.name===edge.from);
  const to=stage.nodes.find(node=>node.name===edge.to);
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
  if(!length)throw new Error(`Overlapping nodes ${edge.from} and ${edge.to}`);
  const ux=dx/length,uy=dy/length;
  return {x1:from.x+ux*radius,y1:from.y+uy*radius,x2:to.x-ux*radius,y2:to.y-uy*radius};
}
```

`renderImpactSvg()` 必须为节点输出 `data-impact-node="姓名"`、为头像圆环输出 `data-impact-ring`、为线输出 `data-impact-edge="from|to"`；动作线使用 `marker-end`，状态线不使用。

- [ ] **Step 4: 实现专题完整组件**

`renderFullImpactGraph({graph,portraitFor,personHref})` 输出：

```html
<section class="impact-room reveal" id="people-impact-graph">
  <header class="room-head">...</header>
  <div class="impact-tabs" role="tablist">...</div>
  <article data-impact-panel="defeat">...</article>
  <article data-impact-panel="beijing" hidden>...</article>
  <article data-impact-panel="restoration" hidden>...</article>
  <div class="impact-legend">...</div>
</section>
```

在 `build_ming_exhibitions.mjs`：

- 读取并校验关系数据。
- 用现有 `portraitOf()` 与 `portraitKind()` 组成 `portraitFor(name) => ({file:portraitOf(name),kind:portraitKind(name),label:portraitKind(name)==='imagined'?'AI想象像':''})`。
- 只在 `e.id === 'tumu-crisis'` 时把组件插在地图和 `.people-room` 之间。
- 将侧边导航的“关键人物”拆为“人物作用图”和“关键人物”。
- 添加按钮事件：同步 `aria-selected` 与面板 `hidden`，不依赖动画。

- [ ] **Step 5: 添加已确认视觉样式**

样式必须包含：

```css
.impact-edge{fill:none;stroke-width:.82;stroke-linecap:round;vector-effect:non-scaling-stroke}
.impact-edge.status{stroke-width:.65;stroke-dasharray:1.2 1}
.impact-node-ring{fill:none;vector-effect:non-scaling-stroke}
.impact-node-ring.imagined{stroke-dasharray:1.3 1}
```

每个SVG marker固定 `markerWidth="10" markerHeight="10"`。阶段标题位于SVG外；阶段结果位于SVG下方。

- [ ] **Step 6: 运行专题验收**

Run: `npm run build:museum && npm run verify`

Expected: 三阶段、端点、箭头、头像和切换断言通过；已有验收仍通过。

- [ ] **Step 7: 检查本任务边界**

Run: `git diff --check -- scripts/lib/render_people_impact_graph.mjs scripts/build_ming_exhibitions.mjs scripts/verify_ming_museum.mjs`

Expected: 无空白错误；不提交当前工作区。

---

### Task 3: 在事件详情加入狭义三人紧凑图

**Files:**
- Modify: `scripts/lib/render_people_impact_graph.mjs`
- Modify: `scripts/build_ming_html.mjs`
- Modify: `scripts/verify_ming_museum.mjs`

**Interfaces:**
- Consumes: `graphForEvent(data,'e033')`、`compactStageId === 'defeat'`。
- Produces: `renderCompactImpactGraph(options)`、`raw.eventImpactHtmlById`、`eventImpactGraphHtml(e)`、`[data-impact-compact="tumu-crisis"]`。

- [ ] **Step 1: 写事件详情失败验收**

增加：

```js
await page.goto(url('events.html?event=e033'),{waitUntil:'networkidle'});
const tumuEventImpact=await page.evaluate(()=>({
  title:document.querySelector('#detail h2')?.textContent.trim(),
  compact:document.querySelector('[data-impact-compact]')?.dataset.impactCompact||'',
  nodes:[...document.querySelectorAll('[data-impact-compact] [data-impact-node]')].map(node=>node.dataset.impactNode).sort(),
  fullHref:document.querySelector('[data-impact-full-link]')?.getAttribute('href')||'',
  arrows:[...document.querySelectorAll('[data-impact-compact] marker')].map(marker=>[marker.getAttribute('markerWidth'),marker.getAttribute('markerHeight')])
}));
await page.goto(url('events.html?event=e035'),{waitUntil:'networkidle'});
const unrelatedImpactCount=await page.locator('[data-impact-compact]').count();
```

期望节点严格等于 `['也先','朱祁镇','王振']`，完整链接为 `exhibit-tumu-crisis.html#people-impact-graph`，`e035` 数量为0。

- [ ] **Step 2: 运行验收并确认失败**

Run: `npm run build:museum && npm run verify`

Expected: FAIL，`tumuEventImpact.compact === ''`。

- [ ] **Step 3: 预生成紧凑图HTML**

在 `build_ming_html.mjs` 顶部读取关系数据并调用共享模块：

```js
const impactGraphData=validateImpactGraphData(JSON.parse(await fs.readFile('data/ming_people_impact_graphs.json','utf8')));
const impactPortraitFor=name=>{
  const registered=portraits.people?.[name];
  if(['image','imagined'].includes(registered?.status)&&registered?.file){
    return {file:registered.file,kind:registered.status==='imagined'?'imagined':'sourced',label:registered.status==='imagined'?'AI想象像':''};
  }
  const imagined=storytelling.people?.[name]?.portrait||'';
  return imagined?{file:imagined,kind:'imagined',label:'AI想象像'}:{file:'',kind:'none',label:''};
};
const eventImpactHtmlById=Object.fromEntries(impactGraphData.graphs.map(graph=>[
  graph.eventId,
  renderCompactImpactGraph({graph,stageId:graph.compactStageId,portraitFor:impactPortraitFor,personHref:name=>`people.html?person=${encodeURIComponent(name)}`})
]));
```

把 `eventImpactHtmlById` 加入现有 `data` JSON；浏览器脚本定义：

```js
const eventImpactHtmlById=raw.eventImpactHtmlById||{};
function eventImpactGraphHtml(event){return eventImpactHtmlById[event.id]||''}
```

- [ ] **Step 4: 插入事件抽屉**

在 `openEventDetail(e)` 的“相关人物与制度”之后插入 `eventImpactGraphHtml(e)`。紧凑组件标题明确写“亲征与战败 · 1449年八月”，并包含：

```html
<a data-impact-full-link href="exhibit-tumu-crisis.html#people-impact-graph">查看完整三阶段人物作用图 →</a>
```

不添加事件ID判断分支；没有预生成HTML的事件自然返回空字符串。

- [ ] **Step 5: 添加抽屉响应式样式**

紧凑图宽度必须适配现有 `width:min(820px,96vw)` 面板；头像名称、标签和箭头不依赖横向滚动。人物链接的点击不关闭图，直接进入人物馆。

- [ ] **Step 6: 运行事件验收**

Run: `npm run build:museum && npm run verify`

Expected: `e033` 三人和完整链接通过；`e035` 不出现组件；现有事件—人物双向关联断言仍通过。

- [ ] **Step 7: 检查本任务边界**

Run: `git diff --check -- scripts/lib/render_people_impact_graph.mjs scripts/build_ming_html.mjs scripts/verify_ming_museum.mjs`

Expected: 无空白错误；不提交当前工作区。

---

### Task 4: 移动端、部署构建与最终验收

**Files:**
- Modify: `scripts/build_ming_exhibitions.mjs`
- Modify: `scripts/build_ming_html.mjs`
- Modify: `scripts/verify_ming_museum.mjs`
- Generated: `dist/**`

**Interfaces:**
- Consumes: Tasks 1—3 的数据和组件。
- Produces: 通过构建、部署、桌面与390px验收的可交付页面。

- [ ] **Step 1: 写390px与无障碍验收**

在390×844视口检查专题和事件页：

```js
const impactMobile=await page.evaluate(()=>({
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth,
  tabs:[...document.querySelectorAll('[data-impact-stage]')].map(button=>({
    tag:button.tagName,
    selected:button.getAttribute('aria-selected')
  })),
  brokenImages:[...document.querySelectorAll('#people-impact-graph image')].filter(image=>!image.getAttribute('href')).length
}));
```

事件抽屉同时断言 `[data-impact-compact]` 的右边界不超过视口、完整链接可聚焦。

- [ ] **Step 2: 运行移动端验收并修正失败**

Run: `npm run build:museum && npm run verify`

Expected: `bodyWidth === viewport`，三个阶段按钮均为 `BUTTON`，仅一个 `aria-selected="true"`，无缺失头像地址。

- [ ] **Step 3: 构建部署包**

Run: `npm run build:deploy`

Expected: exit 0；资源扫描不报告缺失头像；`dist/exhibit-tumu-crisis.html` 与 `dist/events.html` 均存在。

- [ ] **Step 4: 运行完整验收**

Run: `npm run build:museum && npm run build:deploy && npm run verify`

Expected: 所有命令退出码0；Playwright `audit.pass === true`；`errors.length === 0`。

- [ ] **Step 5: 静态核查生成结果**

Run: `rg -n "people-impact-graph|data-impact-stage|data-impact-compact|data-impact-full-link|markerWidth=\"10\"" outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/{exhibit-tumu-crisis,events}.html dist/{exhibit-tumu-crisis,events}.html`

Expected: 专题源页与部署页包含完整图；事件源页与部署页包含紧凑图和完整专题入口。

- [ ] **Step 6: 最终差异边界检查**

Run: `git status --short && git diff --check`

Expected: 无空白错误；用户原有未提交文件仍存在；报告本次新增/修改文件，不暂存、不提交、不覆盖无关改动。
