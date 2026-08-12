# 朱元璋人物页清晰生平 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让没有明史背景的成年人仅凭朱元璋人物速览与独立人物页，就能建立连续、清楚的生平骨架，同时不被证据说明打断阅读。

**Architecture:** 只在朱元璋人物数据中增加可选的速览摘要与低声量证据浅注字段；人物卡仅显示“年份＋直接标题＋一句摘要”，独立页才承载完整背景、过程、影响与证据。生成器检测这些字段后采用新渲染，其他人物继续使用原有标题与证据块。

**Tech Stack:** Node.js ES modules、JSON 内容数据、静态 HTML/CSS 生成器。

## Global Constraints

- 本次只修改朱元璋，不改其他人物文案。
- 人物卡保持简短，只负责建立六阶段生平轮廓。
- 独立页正文交代人物、背景、行动和结果，不要求读者具备明史预备知识。
- 史料来源显示为段末低声量浅注；详细原文继续通过弹窗查看。
- 只有存在推断或争议时才显示解释边界。
- 不把心理动机、案件争议或结构性解释写成确定事实。
- 保留现有可考史实、合理推演、艺术想象的可信度边界。

---

### Task 1: 固定朱元璋人物页可读性合同

**Files:**
- Create: `scripts/verify_zhu_yuanzhang_readability.mjs`
- Test: `scripts/verify_zhu_yuanzhang_readability.mjs`

**Interfaces:**
- Consumes: `data/ming_person_pages.json` 与构建后的 `people.html`、`people/zhu-yuan-zhang.html`。
- Produces: 失败即非零退出的结构与文案验收命令。

- [ ] **Step 1: 写失败检查**

检查朱元璋启用 `readingMode: "clear-biography"`、六幕都有简短 `preview` 和 `evidenceNote`，速览包含六条一句摘要，独立页包含浅注且不再为朱元璋渲染旧的两块醒目证据框。

- [ ] **Step 2: 运行检查并确认按预期失败**

Run: `node scripts/verify_zhu_yuanzhang_readability.mjs`

Expected: FAIL，指出缺少清晰生平模式或速览摘要。

### Task 2: 重写朱元璋人物主叙事与速览

**Files:**
- Modify: `data/ming_person_pages.json`

**Interfaces:**
- Consumes: 既有朱元璋六幕、原典入口和事实边界。
- Produces: `readingMode`、`preview`、`evidenceNote`、可选 `interpretationBoundary` 以及清晰直述的标题和正文。

- [ ] **Step 1: 改写人物总述与六幕**

依次覆盖饥荒失亲、投军成长、击败主要对手、建国恢复、废相集权、继承危机；`preview` 保持一句，独立页正文显式交代原因、行动与结果。

- [ ] **Step 2: 保留来源和争议边界**

每幕提供一行 `evidenceNote`；涉及心理、制度后果或案件因果时增加 `interpretationBoundary`。

### Task 3: 渲染速览摘要和段末证据浅注

**Files:**
- Modify: `scripts/build_ming_html.mjs`
- Modify: `scripts/build_ming_person_pages.mjs`

**Interfaces:**
- Consumes: Task 2 的可选字段。
- Produces: 朱元璋速览的“标题＋事实摘要”和独立页的低声量段末脚注；其他人物保持原样。

- [ ] **Step 1: 为速览增加可选摘要渲染**

有 `scene.preview` 时显示清楚的阶段标题和事实摘要；无该字段时保持旧输出。

- [ ] **Step 2: 为清晰生平模式增加浅注渲染**

用细分隔线、小字号、低对比色呈现史料依据、置信度、查看原文和可选解释边界。

- [ ] **Step 3: 构建并运行可读性检查**

Run: `npm run build:museum && node scripts/verify_zhu_yuanzhang_readability.mjs`

Expected: PASS。

### Task 4: 全量与视觉验收

**Files:**
- Verify only.

**Interfaces:**
- Consumes: 构建后的静态站。
- Produces: 桌面与移动端视觉证据，以及全站回归结果。

- [ ] **Step 1: 运行相关结构和全站验证**

Run: `node scripts/verify_zhu_yuanzhang_readability.mjs && npm run verify`

Expected: 所有命令退出码为 0；若浏览器环境失败，必须区分环境失败与页面断言失败。

- [ ] **Step 2: 检查桌面与移动端**

确认正文、浅注和查看原文按钮层级清楚，无水平溢出，其他人物页面未切换到新模式。

## Self-Review

- 需求覆盖：速览完整性、独立页清晰主叙事、浅注、原文弹窗、单人物隔离均有对应任务。
- 占位符检查：无 TBD、TODO 或未定义接口。
- 字段一致性：`readingMode`、`preview`、`evidenceNote`、`interpretationBoundary` 在数据、生成器与验证脚本中名称一致。
