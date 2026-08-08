# 人物馆—事件馆双向关联 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让访客能从事件进入相关人物筛选，也能从人物速览进入其相关事件，并让链接可刷新、收藏和分享。

**Architecture:** 继续以 `data/ming_events.json` 的 `events[].people` 为唯一人物—事件关系来源；生成时不复制关系数据。人物馆通过 `event` 查询参数筛选人物，事件馆通过同名参数直达并展开事件。

**Tech Stack:** Node.js ESM、静态 HTML/CSS、原生 JavaScript、Playwright 验收脚本。

## Global Constraints

- 不新增人物—事件关系数据库，不手工维护第二份名单。
- 姓名匹配必须复用现有 `canonical()` 规则。
- 事件筛选只展示人物馆已有记录；未收录的人名仍在事件详情保留为普通标签。
- “事件”和“皇帝视图”是两种主视角，选择其中一个时清除另一个；身份、领域、置信度、搜索和排序可继续叠加。
- 保留当前工作区已有的“历史切片”未提交修改，不覆盖两个无关未跟踪文件。
- 因目标文件已有其他未提交修改，本计划不自动提交 Git；完成后只报告本次改动和验证结果。

---

### Task 1: 先写双向关联验收

**Files:**
- Modify: `scripts/verify_ming_museum.mjs`

**Interfaces:**
- Consumes: `people.html?event=<event-id>`、`events.html?event=<event-id>`。
- Produces: 对事件筛选、跨馆跳转、人物相关事件和 URL 直达的浏览器断言。

- [x] **Step 1: 增加事件馆到人物馆的失败验收**

在“北京保卫战”事件详情中断言存在 `[data-event-people]`；点击后 URL 必须带 `event`，人物馆事件选择器值必须等于该事件 ID，表格姓名必须全部来自该事件的 `people`。

- [x] **Step 2: 增加人物馆到事件馆的失败验收**

打开于谦速览，断言存在相关事件列表；点击“北京保卫战”后，事件馆 URL 必须带 `event`，抽屉标题必须为“北京保卫战”。

- [x] **Step 3: 运行验收并确认新增断言失败**

Run: `npm run build:museum && npm run verify`

Expected: FAIL，缺少 `#personEvent`、`[data-event-people]` 或人物详情相关事件元素。

---

### Task 2: 实现共享关系查询与人物馆事件筛选

**Files:**
- Modify: `scripts/build_ming_html.mjs`

**Interfaces:**
- Produces: `eventRecord(id)`、`peopleForEvent(event)`、`eventsForPerson(person)`、`state.event`、`#personEvent`。
- Consumes: `events[].id`、`events[].people`、现有 `canonical()` 与 `allRecords`。

- [x] **Step 1: 扩展人物筛选状态和工具栏**

在 `state` 增加 `event:''`；在皇帝视图之后新增 `<select id="personEvent">`，首项为“全部关联事件”。选项按六个 `eventStages` 使用 `<optgroup>` 分组，标签格式为“年份 · 事件标题（本馆 N 人）”。

- [x] **Step 2: 增加关系查询函数**

`peopleForEvent(event)` 必须按 `event.people` 的顺序映射到人物馆已有、不重复的记录；`eventsForPerson(person)` 必须按年份和事件 ID 排序返回包含该人物的事件。

- [x] **Step 3: 把事件加入过滤链**

`currentBase()` 在 `state.event` 存在时返回 `peopleForEvent(eventRecord(state.event))`。选择事件时清空 `state.parent`；选择皇帝时清空 `state.event`。现有其他筛选继续应用。

- [x] **Step 4: 更新标题、人数和 URL**

事件视图标题显示“事件标题 · 相关人物”；人数显示“显示 X / Y 位本馆相关人物”。选择或重置事件时使用 `history.replaceState` 同步 `?event=<id>`，不制造浏览器历史垃圾。

- [x] **Step 5: 支持页面初始化直达**

人物馆初始化读取 `event`。合法 ID 自动选择并筛选；非法 ID 忽略并保持人物总表。

---

### Task 3: 实现事件详情到人物馆，以及人物详情到事件馆

**Files:**
- Modify: `scripts/build_ming_html.mjs`
- Modify: `scripts/build_ming_museum.mjs`

**Interfaces:**
- Produces: 事件详情 `[data-event-people]` 入口、人物详情 `.related-events`、事件馆 `?event=<id>` 直达。
- Consumes: Task 2 的 `peopleForEvent()` 与 `eventsForPerson()`。

- [x] **Step 1: 在事件详情增加总人物入口**

若本馆至少收录一位相关人物，在“相关人物与制度”下显示“查看本事件全部人物 · N 位 →”；事件馆生成版链接到 `people.html?event=<id>`。

- [x] **Step 2: 在人物速览增加相关事件**

人物详情抽屉显示按时间排列的相关事件，内容包含年份、标题与事件类型；每项链接到 `events.html?event=<id>`。没有关联事件时不渲染空章节。

- [x] **Step 3: 给事件馆增加事件 ID 直达**

初始化读取合法的 `event` 参数，渲染后直接调用 `openEventDetail()`；非法 ID 不打开抽屉。

- [x] **Step 4: 补充响应式样式与可访问状态**

确保事件按钮、相关事件列表在桌面抽屉和 390px 移动端不横向溢出，键盘可聚焦，链接文字无需依赖颜色理解。

---

### Task 4: 构建、自动验收与静态核查

**Files:**
- Modify: `scripts/verify_ming_museum.mjs`
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people.html`
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/events.html`

**Interfaces:**
- Consumes: Tasks 1–3 的页面行为。
- Produces: 可部署的静态页面与通过的验收结果。

- [x] **Step 1: 重建博物馆**

Run: `npm run build:museum`

Expected: 生成流程退出码 0，人物馆和事件馆页面均更新。

- [x] **Step 2: 运行浏览器验收**

Run: `npm run verify`

Expected: 全部断言通过，桌面端和 390px 移动端无横向溢出。

- [x] **Step 3: 静态核查生成结果**

Run: `rg -n "personEvent|data-event-people|related-events|eventParams.get\('event'\)" outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/{people,events}.html`

Expected: 两个生成页面包含相应入口和查询参数逻辑。

- [x] **Step 4: 检查修改边界**

Run: `git status --short && git diff --check`

Expected: 无空白错误；原有未跟踪文件保持未跟踪，未被修改或删除。
