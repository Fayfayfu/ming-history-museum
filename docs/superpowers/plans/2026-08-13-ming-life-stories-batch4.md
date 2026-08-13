# 人物一生故事第四批实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为商辂、石亨、刘瑾、魏忠贤、孙承宗、秦良玉完成《明史》基础叙事版人物一生故事，并接入人物抽屉。

**Architecture:** 六人的专属故事继续写入 `data/ming_storytelling.json`，由现有人物故事渲染器显示并自动补充年号。新增第四批专项校验和独立证据卡；不修改视觉组件、不新增独立人物页，也不把研究笔记直接渲染给读者。

**Tech Stack:** JSON、Node.js ESM、Playwright、现有静态博物馆构建链。

## Global Constraints

- 本批只处理商辂、石亨、刘瑾、魏忠贤、孙承宗、秦良玉。
- 每人必须有专属 `hook`、不少于 70 字的 `arc`、4—6 个专属章节、`reading`、`moment`、`sources`、`sourceBasis` 和 `followupQuestions`。
- 禁止使用“生卒与出身”“进入历史现场”“主要行动与位置”“结局与历史影响”。
- 事实层只写能够定位的事件、职务、人物关系与结果；结构性解释使用 `inference` 层。
- 不虚构对白、心理、临终场景或无法核实的现场动作。
- 公历年份由现有年号模块生成双纪年，不在故事数据中手写重复年号字段。
- 以《明史》卷 176、173、304、305、250、270 及相关本纪、列传建立基础叙事；多源对读只登记后续问题，不作为本批完成条件。
- 本批不新增独立页；现有 12 个独立页必须通过回归。
- 只提交本批源数据、研究记录、专项校验和计划状态；不提交 `dist/`、生成页面、截图、Agent 或无关未跟踪文件。
- 默认不推送、不部署。

---

### Task 1: 建立第四批失败验收门

**Files:**
- Create: `scripts/verify_ming_life_stories_batch4.mjs`
- Reference: `scripts/verify_ming_life_stories_batch3.mjs`

**Interfaces:**
- Consumes: `data/ming_storytelling.json` 的 `people[name]`。
- Produces: 退出码 0/1；逐人检查故事结构、禁用标题、来源卷次和后续待核问题。

- [ ] **Step 1: 写六人名单与基础合同**

创建脚本，核心常量与循环如下：

```js
const names=['商辂','石亨','刘瑾','魏忠贤','孙承宗','秦良玉'];
const banned=new Set(['生卒与出身','进入历史现场','主要行动与位置','结局与历史影响']);

for(const name of names){
  const story=data.people?.[name];
  if(!story){errors.push(`${name}: 缺少完整故事`);continue}
  if((story.hook||'').length<22)errors.push(`${name}: 专属主旨过短`);
  if((story.arc||'').length<70)errors.push(`${name}: 生平主线不足`);
  if(!Array.isArray(story.chapters)||story.chapters.length<4||story.chapters.length>6){
    errors.push(`${name}: 应有4至6个转折章节`);
  }
}
```

- [ ] **Step 2: 加入章节、解释与来源校验**

每章必须有 `year`、`title`、至少 45 字的 `text` 和 `fact`/`inference` 层；每人 `reading` 至少 55 字且 `readingLayer === 'inference'`。`sources` 至少一个 HTTP(S) URL；`sourceBasis` 每项必须有 `volume`、`scope`、`confidence`；`followupQuestions` 至少两项。

- [ ] **Step 3: 加入批次差异化校验**

```js
const joined=name=>JSON.stringify(data.people?.[name]||{});
if(!/三元|内阁/.test(joined('商辂')))errors.push('商辂：未呈现科举声望与中枢位置');
if(!/北京|夺门/.test(joined('石亨')))errors.push('石亨：未同时呈现守城军功与夺门政治');
if(!/司礼监|奏章|批红/.test(joined('刘瑾')))errors.push('刘瑾：未解释司礼监控制方式');
if(!/厂卫|东林|阉党/.test(joined('魏忠贤')))errors.push('魏忠贤：未解释跨机构网络');
if(!/辽东|关宁|经略/.test(joined('孙承宗')))errors.push('孙承宗：未解释辽东防御体系');
if(!/石砫|白杆兵|总兵/.test(joined('秦良玉')))errors.push('秦良玉：未呈现地方动员与正式军职');
```

同时检查批次内无重复章节标题。

- [ ] **Step 4: 运行测试确认按预期失败**

Run: `node scripts/verify_ming_life_stories_batch4.mjs`

Expected: FAIL，明确列出六人仍缺少完整故事；不得因 JSON 解析或路径错误失败。

- [ ] **Step 5: 提交失败验收门**

```bash
git add scripts/verify_ming_life_stories_batch4.mjs
git commit -m "test: define fourth life story batch"
```

---

### Task 2: 建立六人《明史》证据卡

**Files:**
- Create: `data/research/ming_life_stories_batch4_source_notes.json`

**Interfaces:**
- Consumes: 《明史》卷 176、173、304、305、250、270 及相关本纪、列传。
- Produces: `meta` 与 `people[name]`；每人包含 `questions`、`claims`、`boundaries`、`followupQuestions`。

- [ ] **Step 1: 写研究记录元数据**

```json
{
  "meta": {
    "title": "人物一生故事第四批《明史》证据卡",
    "version": "2026-08-13",
    "scope": "《明史》基础叙事版；未完成《明实录》、奏疏、文集、地方志或域外史料系统对读",
    "method": "以本传形成问题，以相关本纪和互见列传校正事件先后；正史评价、数字、对白和定罪叙事不自动视为无争议事实"
  },
  "people": {}
}
```

- [ ] **Step 2: 核对商辂与石亨**

阅读卷 176、173，并参照英宗本纪、于谦传及夺门相关互见材料。商辂至少记录三元及第、入阁、反对石亨扩权、去职、成化复出和反对厂卫扩张；石亨至少记录北京保卫战、夺门之变、封赏扩权、亲党网络、定罪与死亡。把军功与后续政治责任分开记录。

- [ ] **Step 3: 核对刘瑾与魏忠贤**

阅读卷 304、305，并参照武宗、熹宗、庄烈帝本纪。刘瑾证据卡区分司礼监职权、批红/奏章控制、行政整饬、安化王之乱后的定罪和财产数字；魏忠贤证据卡区分客氏关系、司礼监与厂卫、东林案件、祠祀网络、崇祯初处置与后世妖魔化细节。

- [ ] **Step 4: 核对孙承宗与秦良玉**

阅读卷 250、270，并参照辽东、播州、四川战事相关条目。孙承宗证据卡记录两次经略、关宁体系的城防/军队/财政条件、与辽将关系、去职及守高阳；秦良玉证据卡记录石砫土司背景、白杆兵、播州、援辽、勤王、四川战事和正式军职。

- [ ] **Step 5: 为每人写边界和后续问题**

每人至少四条 `claims`，每条格式：

```json
{"claim":"可核对命题","source":"《明史》卷号及篇名","confidence":"高或中"}
```

每人至少三条 `boundaries`、两条 `followupQuestions`。明确记录兵力/财产数字、精确对白、谋反罪证、因果归责和死亡细节的证据限度。

- [ ] **Step 6: 验证 JSON 可解析并提交**

Run: `node -e "JSON.parse(require('fs').readFileSync('data/research/ming_life_stories_batch4_source_notes.json','utf8')); console.log('batch4 source notes ok')"`

Expected: `batch4 source notes ok`

```bash
git add data/research/ming_life_stories_batch4_source_notes.json
git commit -m "docs: add fourth life story source notes"
```

---

### Task 3: 写入六人专属故事

**Files:**
- Modify: `data/ming_storytelling.json`
- Test: `scripts/verify_ming_life_stories_batch4.mjs`

**Interfaces:**
- Consumes: Task 2 的 `claims`、`boundaries` 和 `followupQuestions`。
- Produces: 六个符合现有 `personStoryHtml` 合同的故事对象。

- [ ] **Step 1: 写商辂与石亨**

商辂使用 5 个转折：三元及第与入阁、土木危机后的中枢、反对石亨扩权、被迫离职、成化复出与厂卫问题。石亨使用 5 个转折：边镇将领、北京保卫战、夺门之变、权力网络膨胀、定罪死亡。两人的章节标题不得重复，且必须互相说明对方的制度位置而非复制事件段落。

- [ ] **Step 2: 运行第四批测试，确认只剩其余四人失败**

Run: `node scripts/verify_ming_life_stories_batch4.mjs`

Expected: FAIL，商辂、石亨不再报告内容问题；刘瑾、魏忠贤、孙承宗、秦良玉仍缺少完整故事。

- [ ] **Step 3: 写刘瑾与魏忠贤**

刘瑾使用 5 个转折：东宫近侍、正德初入司礼监、控制奏章与官僚处分、改革与敛财并存、安化王之乱后的处死。魏忠贤使用 5 个转折：进入内廷、通过客氏接近皇帝、司礼监/厂卫网络、东林案件与祠祀、崇祯初失势自缢。正文必须明确两人不处于同一皇帝、同一政治联盟或完全相同的制度环境。

- [ ] **Step 4: 写孙承宗与秦良玉**

孙承宗使用 5 个转折：科举与帝师、第一次经略辽东、关宁体系成形、党争中去职与再起、守高阳殉难。秦良玉使用 5 个转折：石砫与家族军政、播州战事、援辽与正式军职、勤王和平乱、四川残局与晚年。军事章节同时写任务、组织资源和限制。

- [ ] **Step 5: 运行第四批专项校验**

Run: `node scripts/verify_ming_life_stories_batch4.mjs`

Expected: PASS，六人均有专属主旨、完整主线、非模板转折、《明史》卷次定位和至少两项后续待核问题。

- [ ] **Step 6: 提交六人故事**

```bash
git add data/ming_storytelling.json
git commit -m "feat: add fourth batch of life stories"
```

---

### Task 4: 构建并验收人物抽屉

**Files:**
- Modify: `scripts/verify_ming_life_stories_batch4.mjs`
- Generated only: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people.html`

**Interfaces:**
- Consumes: 六个完整故事对象和现有年号转换模块。
- Produces: 六个人物抽屉的浏览器级验证结果。

- [ ] **Step 1: 在专项脚本加入浏览器验证**

用 Playwright 逐人打开：

```js
const pageUrl=name=>`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`;
```

逐人断言：`.life-story-foundation` 数量为 0；`.life-line .life-chapter` 为 4—6；每个 `.life-year > span` 与 `.life-era` 非空；正文包含“怎样理解这个人”；`document.body.scrollWidth <= innerWidth`。

- [ ] **Step 2: 先运行浏览器验证确认因生成页尚未更新而失败**

Run: `node scripts/verify_ming_life_stories_batch4.mjs`

Expected: FAIL，指出生成页面仍未包含第四批专属故事。

- [ ] **Step 3: 重建正式博物馆**

Run: `npm run build:museum`

Expected: 构建完成，无 JSON 或年号转换错误。

- [ ] **Step 4: 再次运行专项校验**

Run: `node scripts/verify_ming_life_stories_batch4.mjs`

Expected: PASS，六人抽屉均显示 4—6 个专属章节与双纪年，桌面端无横向溢出。

- [ ] **Step 5: 加入移动端代表验证**

将视口设为 `390 × 844`，分别验证商辂、刘瑾、秦良玉：章节仍完整，`bodyWidth === viewport`，年份列和正文未发生横向溢出。

- [ ] **Step 6: 提交增强后的专项校验**

```bash
git add scripts/verify_ming_life_stories_batch4.mjs
git commit -m "test: verify fourth life stories in browser"
```

---

### Task 5: 全站回归与批次收尾

**Files:**
- Modify: `docs/superpowers/plans/2026-08-13-ming-life-stories-batch4.md`（仅勾选已完成步骤）
- Generated only: `dist/`

**Interfaces:**
- Consumes: 已通过的第四批数据与专项校验。
- Produces: 可安全提交、但尚未推送或部署的第四批本地版本。

- [ ] **Step 1: 运行内容与年号回归**

```bash
node scripts/verify_ming_life_stories_batch4.mjs
node scripts/verify_all_person_life_stories.mjs
node scripts/verify_ming_reign_year_page.mjs
```

Expected: 三项全部 PASS。

- [ ] **Step 2: 运行全站源数据回归**

Run: `npm run verify`

Expected: 人物数据、时间轴、独立页和现有专项测试全部 PASS。

- [ ] **Step 3: 构建并验证部署包**

```bash
npm run build:deploy
npm run verify:deploy
```

Expected: 30 个页面均返回 200，破图 0，`pass: true`。若沙箱禁止监听 `127.0.0.1`，使用获准的同一命令在允许回环端口的环境重跑，不修改验证器以绕过检查。

- [ ] **Step 4: 检查差异边界**

```bash
git diff --check
git status --short
git diff --name-only HEAD~4..HEAD
```

Expected: 提交范围仅包含第四批规格、计划、专项校验、证据卡和 `data/ming_storytelling.json`；生成页面、`dist/`、截图、Agent 与其他未跟踪文件不进入提交。

- [ ] **Step 5: 更新计划勾选并提交收尾记录**

```bash
git add docs/superpowers/plans/2026-08-13-ming-life-stories-batch4.md
git commit -m "docs: complete fourth life story batch"
```

- [ ] **Step 6: 停在本地完成状态**

输出六人名单、测试结果、提交哈希和本地预览地址。不得执行 `git push`、打发布标签或运行 `vercel --prod`，除非用户另行明确要求。

