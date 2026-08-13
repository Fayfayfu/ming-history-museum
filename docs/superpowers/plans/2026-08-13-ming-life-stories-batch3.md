# 人物一生故事第三批实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为杨溥、夏原吉、蹇义、郑和、王景弘完成《明史》基础叙事版人物一生故事，并接入人物抽屉。

**Architecture:** 内容继续写入 `data/ming_storytelling.json`，由现有博物馆构建链自动补充年号并渲染人物抽屉。新增一份批次验收脚本和一份待核问题清单，分别负责结构质量与后续多源升级边界，不修改人物馆的视觉组件。

**Tech Stack:** JSON、Node.js ESM、现有静态站生成器、Playwright、npm 校验脚本。

## Global Constraints

- 本批只处理杨溥、夏原吉、蹇义、郑和、王景弘，不新增人物。
- 采用《明史》基础叙事版；每个核心转折定位到具体卷次。
- 每人四至六个非模板章节，事实与合理推演分层，不虚构对白、心理或现场动作。
- 公历年份由现有年号模块生成双纪年，不手写重复年号字段。
- 多源对读不阻塞本批，但必须登记待核问题。
- 默认只形成独立本地提交，不推送、不部署。

---

### Task 1: 建立失败的第三批验收门

**Files:**
- Create: `scripts/verify_ming_life_stories_batch3.mjs`
- Reference: `scripts/verify_ming_life_stories_batch2.mjs`

**Interfaces:**
- Consumes: `data/ming_storytelling.json` 的 `people[name]`。
- Produces: 退出码 0/1；检查五人覆盖、主旨、生平主线、章节、层级、来源和待核问题。

- [ ] **Step 1:** 复制第二批的结构约束，名单改为五位第三批人物；增加 `sourceBasis` 必须含《明史》卷次、`followupQuestions` 至少一项的检查。
- [ ] **Step 2:** 运行 `node scripts/verify_ming_life_stories_batch3.mjs`，预期因五人缺少完整故事而失败。
- [ ] **Step 3:** 确认失败信息逐人列名，避免测试因 JSON 语法或路径错误而失败。

### Task 2: 阅读《明史》并形成五人证据卡

**Files:**
- Create: `data/research/ming_life_stories_batch3_source_notes.json`

**Interfaces:**
- Consumes: 《明史》卷148、149、304及相关本纪或列传。
- Produces: 每人 `questions`、`claims`、`boundaries`、`followupQuestions`；每项 claim 含卷次与置信度。

- [ ] **Step 1:** 阅读卷148，提取蹇义、杨溥的任官、下狱、复职与身后评价。
- [ ] **Step 2:** 阅读卷149，提取夏原吉的财政治理、水利、下狱与复职。
- [ ] **Step 3:** 阅读卷304，提取郑和、王景弘的奉使、远航、军事行动与材料缺口。
- [ ] **Step 4:** 把精确对白、评价语、数字和死因列入 `boundaries`，不得直接改写为确定事实。
- [ ] **Step 5:** 为每人列出需要《明实录》、文集、地方志或域外史料复核的具体问题。

### Task 3: 写入第三批专属故事

**Files:**
- Modify: `data/ming_storytelling.json`
- Test: `scripts/verify_ming_life_stories_batch3.mjs`

**Interfaces:**
- Consumes: Task 2 的证据卡。
- Produces: 五个符合现有 `personStoryHtml` 契约的故事对象。

- [ ] **Step 1:** 为每人写专属 `hook`、不少于70字的 `arc`、四至六个章节。
- [ ] **Step 2:** 每章写 `year`、专属 `title`、不少于45字的 `text` 和 `fact`/`inference` 层级。
- [ ] **Step 3:** 写 `reading`、`moment`、`sources`、`sourceBasis` 与 `followupQuestions`。
- [ ] **Step 4:** 运行第三批验收脚本，预期通过且无重复标题。

### Task 4: 重建并验收人物抽屉

**Files:**
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people.html`
- Generated: `dist/people.html`

**Interfaces:**
- Consumes: 第三批故事数据与现有年号转换模块。
- Produces: 五个人物抽屉的专属故事渲染。

- [ ] **Step 1:** 运行 `npm run build:museum` 与 `npm run build:deploy`。
- [ ] **Step 2:** 用 Playwright 逐一打开五人，检查 `.life-story-foundation` 为 0、章节数为四至六、年份含年号、正文宽度不溢出。
- [ ] **Step 3:** 运行 `node scripts/verify_ming_reign_year_page.mjs`。

### Task 5: 完整回归与独立提交

**Files:**
- Modify: 仅前三个任务明确列出的源文件。

**Interfaces:**
- Consumes: 完成后的源数据、证据卡和验收脚本。
- Produces: 一个不包含 Agent、截图、`dist/` 或无关文件的本地提交。

- [ ] **Step 1:** 运行 `npm run verify`、`npm run verify:deploy` 与 `git diff --check`。
- [ ] **Step 2:** 精确暂存 `data/ming_storytelling.json`、证据卡与第三批验收脚本。
- [ ] **Step 3:** 用 `git diff --cached --name-only` 确认没有 Agent、截图、`dist/` 或无关文件。
- [ ] **Step 4:** 提交为 `feat: add third batch of life stories`，不推送、不部署。
