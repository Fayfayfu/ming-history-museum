# 郑和抽屉与独立页六阶段文案统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将郑和人物抽屉和独立页统一为同一条六阶段生平主线，并在两个界面同时显示公元年份、明代年号和层级匹配的文案。

**Architecture:** `data/ming_person_pages_batch2.json` 继续作为郑和抽屉和独立页的唯一页面内容来源；同一个 `scenes` 数组同时提供抽屉的 `preview` 与独立页的 `body`。生成器只负责按页面层级渲染，不复制或改写历史内容；专项浏览器验证锁定六阶段、双纪年、摘要、独立页章节和来源入口。

**Tech Stack:** Node.js ESM、JSON 内容数据、静态 HTML 生成器、Playwright、npm 构建与验证脚本。

## Global Constraints

- 抽屉固定显示六段简明速览：公元年份、明代年号、直接标题和一句事实摘要。
- 独立页固定显示相同顺序的六个完整章节，并保留事实、解释与证据边界。
- 第一阶段出生年份保持“约1371”，不得写成无争议的精确出生年。
- 继续保留《明史》卷304、《明实录》、刘家港碑、长乐碑、故宫研究和航海图入口。
- 不虚构对话、心理和现场动作；卒年、卒地与归葬保留争议提示。
- 不修改其他人物独立页，不调整专题展整体视觉设计，不推送远端或上线。

---

### Task 1: 锁定六阶段双纪年页面合同

**Files:**
- Modify: `scripts/verify_zheng_he_quick_reign_years.mjs`
- Test: `scripts/verify_zheng_he_quick_reign_years.mjs`

**Interfaces:**
- Consumes: 构建结果 `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people.html` 与 `people/zheng-he.html`。
- Produces: 一个专项浏览器回归门，验证抽屉和独立页的六阶段、双纪年、摘要、来源入口及响应式布局。

- [ ] **Step 1: 扩展当前失败测试**

在现有脚本中把预期阶段从4段改为6段，并同时读取：

```js
const drawer=await page.evaluate(()=>({
  years:[...document.querySelectorAll('#detail .profile-quick-date>b')].map(node=>node.textContent.trim()),
  reignYears:[...document.querySelectorAll('#detail .profile-quick-reign')].map(node=>node.textContent.trim()),
  previews:[...document.querySelectorAll('#detail .profile-quick-summary')].map(node=>node.textContent.trim()),
  titles:[...document.querySelectorAll('#detail .profile-quick-copy>span')].map(node=>node.textContent.trim()),
  enterHref:document.querySelector('#detail .profile-enter')?.getAttribute('href')||''
}));
```

预期年号必须精确为：

```js
const expectedReignYears=[
  '明 · 洪武四年至建文四年',
  '明 · 永乐三年至五年',
  '明 · 永乐五年至十三年',
  '明 · 永乐十四年至二十二年',
  '明 · 永乐二十二年至宣德六年',
  '明 · 宣德六年至八年及身后'
];
```

再打开 `people/zheng-he.html`，断言：

```js
const independent=await page.evaluate(()=>({
  chapters:document.querySelectorAll('.story .chapter').length,
  years:[...document.querySelectorAll('.story .chapter-time')].map(node=>node.childNodes[0]?.textContent.trim()||''),
  reignYears:[...document.querySelectorAll('.story .chapter-reign')].map(node=>node.textContent.trim()),
  sourceText:document.body.innerText,
  bodyWidth:document.body.scrollWidth,
  viewport:innerWidth
}));
```

要求独立页为6章，并出现“刘家港天妃宫石刻”“长乐《天妃之神灵应记》”。

- [ ] **Step 2: 运行测试确认失败原因正确**

Run: `node scripts/verify_zheng_he_quick_reign_years.mjs`

Expected: FAIL，明确报告抽屉只有4段、年号为空、摘要为空或独立页只有4章；不得因语法错误或找不到页面失败。

---

### Task 2: 将郑和页面数据统一为六阶段

**Files:**
- Modify: `data/ming_person_pages_batch2.json`
- Test: `scripts/verify_zheng_he_quick_reign_years.mjs`

**Interfaces:**
- Consumes: Task 1 的六阶段页面合同；第三批 `data/ming_storytelling.json` 中郑和六阶段主线。
- Produces: `people.郑和.readingMode = "clear-biography"` 以及六个包含 `year`、`reignYears`、`age`、`kicker`、`title`、`preview`、`body`、`inference`、`evidence`、`primarySource`、`confidence` 的场景对象。

- [ ] **Step 1: 设置抽屉清晰传记模式**

在郑和对象中加入：

```json
"readingMode": "clear-biography"
```

该字段使非皇帝人物也显示年号和一句摘要，不改变其他人物的默认速览密度。

- [ ] **Step 2: 把旧四幕拆为六阶段**

将郑和 `scenes` 替换为以下六段日期与标题：

```json
[
  {"year":"约1371—1402","reignYears":"明 · 洪武四年至建文四年","title":"身份先被战争与宫廷改写"},
  {"year":"1405—1407","reignYears":"明 · 永乐三年至五年","title":"第一次组织跨洋船队"},
  {"year":"1407—1415","reignYears":"明 · 永乐五年至十三年","title":"外交、交换与武力同时发生"},
  {"year":"1416—1424","reignYears":"明 · 永乐十四年至二十二年","title":"远航成为反复运转的国家工程"},
  {"year":"1424—1431","reignYears":"明 · 永乐二十二年至宣德六年","title":"从跨洋正使转任南京守备"},
  {"year":"1431—1433及身后","reignYears":"明 · 宣德六年至八年及身后","title":"第七次远航留下未解的终点"}
]
```

每段 `preview` 写成45—75字的一句事实摘要；每段 `body` 写两段完整正文，并把旧四幕已有材料按时间重新分配，不重复堆砌。

- [ ] **Step 3: 明确六段证据边界**

分别确保：

- 第一段说明早年具体被俘、宫刑及战功细节不足；
- 第二段说明宝船尺寸和船队构成仍有争议；
- 第三段说明军事冲突主要来自明朝胜利者记录；
- 第四段说明各次远航动机不能压缩成单因论；
- 第五段说明远航暂停与南京守备的制度背景；
- 第六段说明卒年、卒地和归葬存在争议。

- [ ] **Step 4: 校验 JSON**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('data/ming_person_pages_batch2.json','utf8')); console.log('JSON OK')"
```

Expected: `JSON OK`

---

### Task 3: 重建页面并使专项测试转绿

**Files:**
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people.html`
- Generated: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people/zheng-he.html`
- Test: `scripts/verify_zheng_he_quick_reign_years.mjs`

**Interfaces:**
- Consumes: Task 2 的六场景 JSON；既有 `profilePreviewHtml()` 与 `build_ming_person_pages.mjs` 渲染合同。
- Produces: 抽屉六段速览和独立页六章正文。

- [ ] **Step 1: 重建博物馆页面**

Run: `npm run build:museum`

Expected: 成功写出人物馆与12个沉浸式人物页，无 JSON 或模板错误。

- [ ] **Step 2: 运行专项测试**

Run: `node scripts/verify_zheng_he_quick_reign_years.mjs`

Expected: PASS，报告抽屉和独立页均为六阶段，双纪年完整。

- [ ] **Step 3: 如专项测试仍失败，只修正对应数据或稳定选择器**

不得放宽以下合同：六段、六个年号、六条摘要、独立页六章、两篇碑记入口、桌面与移动端无横向溢出。

---

### Task 4: 锁定内容数据与第三批主线不再漂移

**Files:**
- Modify: `scripts/verify_ming_life_stories_batch3.mjs`
- Test: `scripts/verify_ming_life_stories_batch3.mjs`

**Interfaces:**
- Consumes: `data/ming_storytelling.json` 与 `data/ming_person_pages_batch2.json` 的郑和记录。
- Produces: 日期序列和阶段数一致性校验；标题允许页面长文和第三批短故事措辞不同，但阶段含义不得错位。

- [ ] **Step 1: 增加郑和跨数据一致性断言**

读取页面数据并加入：

```js
const personPages=JSON.parse(await fs.readFile('data/ming_person_pages_batch2.json','utf8'));
const zhengHePage=personPages.people?.['郑和'];
const zhengHeStory=data.people?.['郑和'];
const normalizeYear=value=>String(value||'').replace(/^约/,'');
if(zhengHePage?.scenes?.length!==6)errors.push('郑和：独立页应为六阶段');
if(zhengHePage?.scenes?.some(scene=>!scene.reignYears||!scene.preview))errors.push('郑和：抽屉双纪年或摘要不完整');
if(JSON.stringify(zhengHePage.scenes.map(scene=>normalizeYear(scene.year)))!==JSON.stringify(zhengHeStory.chapters.map(chapter=>normalizeYear(chapter.year))))errors.push('郑和：页面与第三批故事日期序列不一致');
```

- [ ] **Step 2: 运行第三批验证**

Run: `node scripts/verify_ming_life_stories_batch3.mjs`

Expected: PASS，且输出说明郑和页面与第三批故事六阶段日期序列一致。

---

### Task 5: 全站构建与回归验证

**Files:**
- Generated: 部署包与静态页面
- Test: existing verification scripts

**Interfaces:**
- Consumes: Tasks 1—4 的最终内容与测试。
- Produces: 可交付的本地构建和验证证据；不推送、不上线。

- [ ] **Step 1: 重建部署包**

Run: `npm run build:deploy`

Expected: 成功生成约30个页面、234个文件；精确数量允许随仓库既有资产变化，但命令必须退出0。

- [ ] **Step 2: 运行专项与人物故事验证**

Run:

```bash
node scripts/verify_zheng_he_quick_reign_years.mjs
node scripts/verify_ming_life_stories_batch3.mjs
node scripts/verify_all_person_life_stories.mjs
```

Expected: 三项全部 PASS。

- [ ] **Step 3: 运行全站与部署包验证**

Run:

```bash
npm run verify
npm run verify:deploy
git diff --check
```

Expected: 全部退出0，部署包 `errors` 为空，郑和独立页无断图或横向溢出。

- [ ] **Step 4: 审查提交范围**

Run: `git status --short`

只允许本次提交包含：

- `data/ming_person_pages_batch2.json`
- `scripts/verify_zheng_he_quick_reign_years.mjs`
- `scripts/verify_ming_life_stories_batch3.mjs`
- 本实施计划文件

不得暂存 `.agent-secrets/`、输出截图、其他设计文档或 `outputs/agent-evals/`。

- [ ] **Step 5: 创建本地提交**

```bash
git add data/ming_person_pages_batch2.json scripts/verify_zheng_he_quick_reign_years.mjs scripts/verify_ming_life_stories_batch3.mjs docs/superpowers/plans/2026-08-13-zheng-he-six-stage-copy.md
git commit -m "feat: unify Zheng He six-stage biography"
```

Expected: 本地提交成功；不执行 `git push` 或线上部署。
