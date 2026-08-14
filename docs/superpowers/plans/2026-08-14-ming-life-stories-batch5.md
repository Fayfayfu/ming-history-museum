# 第五批人物文案同步优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 同步优化王守仁、张居正、李时珍、徐光启的基本人物卡、抽屉速览与独立页，使普通读者无需明史预备知识也能理解四人的关键经历、工作方法、历史影响和证据边界。

**Architecture:** 保留现有数据驱动生成架构：基本信息继续来自 `ming_core.json`；四人已有独立页，因此抽屉速览和独立页共用两个 `ming_person_pages` 数据文件，速览读取 `heroQuestion`、`lead` 与 `scenes[].year/title/preview`，独立页读取同一场景的完整正文和证据字段。先新增第五批专项发布门，再按“史料记录 → 基本卡 → 共用人物页数据”顺序修改，最后使用现有构建器和浏览器回归验证三个阅读层级一致。

**Tech Stack:** Node.js ES modules、JSON 数据文件、现有静态 HTML 构建器、Playwright/Google Chrome、Node `assert`/自定义验证脚本、npm scripts。

## Global Constraints

- 本批只修改王守仁、张居正、李时珍、徐光启；朱元璋、朱棣文案保持不变。
- 人物卡负责简明结论，抽屉负责五至六段完整速览，独立页负责深入解释与证据边界。
- 每段先交代局面，再写行动和结果；不得默认读者理解龙场、宁王之乱、考成、清丈、历局或本草分类。
- 不使用“生卒与出身”“进入历史现场”“主要行动与位置”“结局与历史影响”四个模板标题。
- 不虚构对白、私人心理、临终场景或无法核实的现场动作。
- 事实、解释和合理推演继续分层；原始引文必须能定位，策展摘要不得冒充原文。
- 抽屉和独立页的公历、年号、职务、事件顺序与评价重点必须一致。
- 基本卡至少两条可定位来源，不以维基百科或古籍泛首页作为核心入口。
- 不重做视觉组件、不新增图片、不扩展或发布王守仁 Agent。
- 本批只生成本地预览；不自动合并、推送或上线。

---

### Task 1: 建立第五批专项发布门

**Files:**
- Create: `scripts/verify_ming_life_stories_batch5.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `data/ming_core.json`、`data/ming_person_pages.json`、`data/ming_person_pages_batch2.json` 与生成后的 `people.html`、四个独立页。
- Produces: `npm run verify:life-stories-batch5`，在数据、文案层级、双纪年、入口或页面布局不满足合同时以退出码 1 失败。

- [ ] **Step 1: 写入失败的专项数据验证器**

创建脚本，锁定四人、禁用模板、抽屉章节数、基本卡来源和独立页结构：

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const names=['王守仁','张居正','李时珍','徐光启'];
const banned=['生卒与出身','进入历史现场','主要行动与位置','结局与历史影响'];
const core=JSON.parse(await fs.readFile('data/ming_core.json','utf8'));
const primary=JSON.parse(await fs.readFile('data/ming_person_pages.json','utf8')).people||{};
const batch2=JSON.parse(await fs.readFile('data/ming_person_pages_batch2.json','utf8')).people||{};
const pages={...primary,...batch2};
const errors=[];

for(const name of names){
  const person=core.find(item=>item.name===name);
  const profile=pages[name];
  if(!person)errors.push(`${name}: 人物主表缺失`);
  if((person?.summary||'').length<34)errors.push(`${name}: 主要作为仍过短`);
  if((person?.evaluation||'').length<38)errors.push(`${name}: 历史评价仍过短`);
  const sourceUrls=[person?.source1,person?.source2].filter(Boolean);
  if(sourceUrls.length<2||sourceUrls.some(url=>/wikipedia\.org|^https:\/\/ctext\.org\/?(?:zh)?$/.test(url)))errors.push(`${name}: 基本卡来源仍是百科或泛入口`);
  if(!profile||!Array.isArray(profile.scenes)||profile.scenes.length<5||profile.scenes.length>6)errors.push(`${name}: 独立页阶段不完整`);
  for(const scene of profile?.scenes||[]){
    if(!scene.year||!scene.title||(scene.preview||'').length<28)errors.push(`${name}: 抽屉速览字段不完整`);
    if(!Array.isArray(scene.body)||scene.body.length<2||scene.body.some(text=>text.length<55)||!scene.evidence)errors.push(`${name}: 独立页场景不完整`);
    if(banned.includes(scene.title))errors.push(`${name}: 使用禁用模板标题`);
  }
  if((profile?.sources||[]).length<4)errors.push(`${name}: 独立页证据入口不足`);
}
```

在同一脚本加入四人的关键内容锁：

```js
const joined=name=>JSON.stringify({core:core.find(item=>item.name===name),page:pages[name]});
if(!/龙场|知行合一|宁王/.test(joined('王守仁')))errors.push('王守仁: 思想、贬谪与军政行动未贯通');
if(!/李太后|冯保|考成|清丈|夺情/.test(joined('张居正')))errors.push('张居正: 辅政结构与改革代价不完整');
if(!/辨误|分类|本草纲目|现代临床/.test(joined('李时珍')))errors.push('李时珍: 编纂方法或现代医学边界不完整');
if(!/几何原本|农政|历局|火器/.test(joined('徐光启')))errors.push('徐光启: 知识工程链条不完整');
```

- [ ] **Step 2: 写入失败的浏览器验证部分**

在无数据错误时打开生成页面，验证抽屉双纪年、独立页入口、桌面与移动端宽度，并锁定朱元璋、朱棣未被修改：

```js
const root=path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  for(const name of names){
    await page.goto(`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`,{waitUntil:'networkidle'});
    const drawer=await page.evaluate(()=>({
      chapters:[...document.querySelectorAll('#detail .profile-quick-node')].map(node=>node.querySelector('.profile-quick-date b')?.textContent.trim()||''),
      enter:document.querySelector('#detail .profile-enter')?.getAttribute('href')||'',
      bodyWidth:document.body.scrollWidth,
      viewport:innerWidth
    }));
    if(drawer.chapters.length<5||drawer.chapters.some(value=>!value.includes('·'))||!drawer.enter||drawer.bodyWidth>drawer.viewport)errors.push(`${name}: 抽屉双纪年、入口或桌面宽度异常`);
  }
  await page.setViewportSize({width:390,height:844});
  for(const name of names){
    await page.goto(`file://${path.join(root,'people.html')}?person=${encodeURIComponent(name)}`,{waitUntil:'networkidle'});
    const width=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));
    if(width.body>width.viewport)errors.push(`${name}: 390px横向溢出`);
  }
}finally{await browser.close()}

if(errors.length){errors.forEach(error=>console.error(`- ${error}`));process.exit(1)}
console.log('第五批四人人物卡、抽屉与独立页通过专项验证。');
```

- [ ] **Step 3: 注册 npm 命令并确认测试失败**

在 `package.json` 的 `scripts` 中加入：

```json
"verify:life-stories-batch5": "node scripts/verify_ming_life_stories_batch5.mjs"
```

运行：

```bash
npm run verify:life-stories-batch5
```

预期：FAIL，至少指出四人的 `scenes[].preview` 尚未全部达到新速览合同，张居正独立页不足五段，四人的基本卡或来源尚未满足新合同。

- [ ] **Step 4: 提交失败发布门**

```bash
git add package.json scripts/verify_ming_life_stories_batch5.mjs
git commit -m "test: define fifth person copy batch"
```

---

### Task 2: 建立四人史料记录并重写基本人物卡

**Files:**
- Create: `data/research/ming_life_stories_batch5_source_notes.json`
- Modify: `data/ming_core.json`

**Interfaces:**
- Consumes: 设计文档规定的《明史》卷次、人物著作和权威机构入口。
- Produces: 四人的短版 `summary`、平衡版 `evaluation`、至少两个可定位来源，以及独立的史料边界记录，供抽屉和独立页复用。

- [ ] **Step 1: 建立结构化史料记录**

写入 `meta` 与四个人物对象。每人必须包含以下字段：

```json
{
  "primary_question": "普通读者需要理解的核心问题",
  "verified_facts": [
    {"claim":"可核事实","source":"具体篇名或卷次","url":"https://...","confidence":"高"}
  ],
  "interpretive_boundaries": ["不能从材料推出的心理、因果或现代结论"],
  "followup_questions": ["后续多源升级时需要核对的问题一","问题二"]
}
```

四人的最低来源范围固定为：

- 王守仁：《明史》卷195、《传习录》卷上、《传习录》卷下。
- 张居正：《明史》卷213、故宫博物院张居正人物或改革专题、可定位的张居正奏疏/文集入口。
- 李时珍：《明史》卷299、《本草纲目》可定位文本、UNESCO Memory of the World 条目。
- 徐光启：《明史》卷251、《几何原本》或《农政全书》可定位文本、历法或人物权威机构入口。

- [ ] **Step 2: 重写四人的主要作为**

将 `summary` 改为普通语言，内容合同如下：

- 王守仁：同时出现南赣治理、宁王之乱、知行合一/致良知，明确其不是只有思想身份。
- 张居正：解释考成是追踪期限和责任，清丈是重新核对土地与税基，不只罗列政策名。
- 李时珍：说明长期行医、核对旧本草、重分类和编成《本草纲目》的过程。
- 徐光启：说明翻译几何、试验农业、参与军事技术与主持历法改革的共同方法。

- [ ] **Step 3: 重写四人的历史评价**

每人以“贡献 + 限制”两句完成：

- 王守仁：道德主体性与行动检验；后学分化不等于本人全部主张。
- 张居正：提高执行与财政能力；改革依赖个人联盟且政治代价高。
- 李时珍：分类、汇集、辨误的知识史价值；传统药效不能直接转为现代临床有效性。
- 徐光启：把知识转成测量和国家工程；军事与政策方案受资源、组织和时代条件限制。

- [ ] **Step 4: 替换基本卡弱来源并运行数据审计**

运行：

```bash
npm run audit:museum
```

预期：`errors: 0`；四人的来源不再触发百科或泛入口复核项。审计仍可返回 `PASS WITH REVIEW`，但不得新增结构错误。

- [ ] **Step 5: 提交史料记录与基本卡**

```bash
git add data/research/ming_life_stories_batch5_source_notes.json data/ming_core.json docs/明史数字博物馆_全馆质量审校_2026-08-08.md
git commit -m "feat: refine fifth batch person summaries"
```

---

### Task 3: 重写四人的人物抽屉速览字段

**Files:**
- Modify: `data/ming_person_pages.json`
- Modify: `data/ming_person_pages_batch2.json`
- Test: `scripts/verify_ming_life_stories_batch5.mjs`

**Interfaces:**
- Consumes: Task 2 的史料记录和基本卡结论。
- Produces: 四个人物页对象的 `heroQuestion`、`lead` 与 5—6 个 `scenes[].year/title/preview`；这些字段由 `profilePreviewHtml` 直接生成抽屉速览，并与独立页共用同一阶段。

- [ ] **Step 1: 改写王守仁抽屉为六个具体转折**

固定阶段：

1. 1488—1499：兵学、问学与进入官场。
2. 1506：营救言官、廷杖与远谪。
3. 1508—1509：龙场困境与思想转向。
4. 1509—1516：知行合一针对“知道却不做”。
5. 1516—1519：南赣治理与宁王之乱。
6. 1520—1529及身后：致良知、去世与后学分化。

每段 `preview` 用一至两句说明发生了什么及其影响；龙场阶段明确“思想转折可考，某一夜的精确顿悟现场不可考”；宁王阶段不得写成心学自动产生战术。

- [ ] **Step 2: 改写张居正抽屉为六个具体转折**

固定阶段：

1. 1525—1547：江陵成长、科举与进入翰林。
2. 1547—1567：裕王府、内阁观察与进入中枢。
3. 1572：幼帝、李太后、冯保与首辅联盟。
4. 1573—1581：考成、清丈和赋役整顿。
5. 1577：夺情维持改革，也破坏共同政治规范。
6. 1582—1584及身后：去世、清算与制度余波。

必须在 `preview` 中用白话解释考成法和清丈，不将“一条鞭法”写成张居正某年一次发布并全国整齐完成的单项政策。

- [ ] **Step 3: 新增李时珍抽屉六阶段故事**

固定阶段：

1. 1518—1530年代：蕲州医家环境与科举选择。
2. 1540年代：行医、读旧本草并发现冲突。
3. 1550年代：楚王府/太医院相关经历与短暂官职。
4. 1552—1578：访问、观察、分类、释名和辨误。
5. 1578—1593：定稿、求刊与生前未见正式刊行。
6. 1596及身后：《本草纲目》刊行、传播与现代阅读边界。

不得把传统药物记载写成现代疗效承诺；“27年”只有在起讫依据与项目现有数据一致时使用。新增或改写的每个 `scene` 同时保留独立页所需字段，Task 4 再精修完整正文。

- [ ] **Step 4: 新增徐光启抽屉六阶段故事**

固定阶段：

1. 1562—1600：上海地方经验、科举与现实问题。
2. 1600—1607：结识利玛窦、受洗与翻译《几何原本》。
3. 1607—1613：天津试验、农业观察与知识方法。
4. 1619—1622：辽东危机、火器与练兵方案。
5. 1629—1633：日食推算争议与主持历局修历。
6. 身后：《农政全书》整理刊行与知识遗产。

不得将“西学”写成单向输入；必须出现翻译、测量、试验和组织执行四个动作。新增或改写的每个 `scene` 同时保留独立页所需字段，Task 4 再精修完整正文。

- [ ] **Step 5: 构建并运行专项验证**

运行：

```bash
npm run build:museum
npm run verify:life-stories-batch5
```

预期：数据层仍可能因独立页正文或基本卡长度锁而失败，但四人的抽屉必须通过 5—6 段、禁用标题、双纪年、桌面和移动宽度检查。

- [ ] **Step 6: 提交人物抽屉速览**

```bash
git add data/ming_person_pages.json data/ming_person_pages_batch2.json
git commit -m "feat: rewrite fifth batch drawer stories"
```

---

### Task 4: 精修四人的独立页

**Files:**
- Modify: `data/ming_person_pages.json`
- Modify: `data/ming_person_pages_batch2.json`
- Test: `scripts/verify_ming_life_stories_batch5.mjs`

**Interfaces:**
- Consumes: Task 2 的证据记录、Task 3 的六阶段日期与叙事主轴。
- Produces: 四个完整独立页数据对象，继续由 `scripts/build_ming_person_pages.mjs` 生成相同 slug 的 HTML。

- [ ] **Step 1: 精修王守仁独立页**

保留 `wang-shou-ren`、`theme: mind`、思想特色模块与《传习录》作品模块。逐幕检查并执行：

- 第一幕明确兵学、科举和官署经验为何与后来的行动问题相关。
- 第二幕把龙场写成长期困境中的思想转折，不复原神秘瞬间。
- 第三幕用徐爱的日常反例解释知行合一，不把它压缩成励志口号。
- 第四幕把南赣治理和宁王之乱放回兵员、情报和行政条件。
- 第五幕区分王守仁本人、明代后学和东亚传播。

删除与抽屉 `arc`、`reading` 重复但没有新增信息的句子，保持每幕两段正文、一个推演、一个证据说明和一个原典卡。

- [ ] **Step 2: 将张居正独立页补足为六幕**

保留 `zhang-ju-zheng` 与 `theme: system`，把现有三幕扩为六幕，与抽屉固定阶段对齐。特色模块继续解释执行链，但必须分别呈现：

- 皇帝/太后授权。
- 司礼监文书通道。
- 内阁与六部督办。
- 督抚和府县落实。
- 清丈与赋役数据反馈。
- 夺情和身后清算的政治反作用。

每幕加入可定位的 `primarySource` 或明确证据说明；不得以故宫人物简介为所有制度细节的唯一来源。

- [ ] **Step 3: 精修李时珍独立页**

保留 `li-shi-zhen` 和现有专题模块。按六阶段检查：

- 普通读者能分清旧本草、实物观察、分类、释名、辨误和附方。
- 楚王府与太医院相关任职只占一个阶段，不把官职塑造成其主要成就来源。
- 成书、定稿、刊行三个时间节点不混写。
- 作品模块明确《本草纲目》兼有文献保存、分类和经验记录价值。
- 结尾明确传统医学记录不能直接等于现代临床有效性。

- [ ] **Step 4: 精修徐光启独立页**

保留 `xu-guang-qi` 与现有专题模块。按六阶段检查：

- 《几何原本》解释“为什么证明步骤和定义重要”，不只写合作翻译。
- 农业阶段写天津试验、作物与水利观察怎样进入《农政全书》体系。
- 军事阶段说明火器、训练、财政和组织条件，不能只写技术先进。
- 历局阶段解释日食推算误差为何促使国家制度接受可复算方法。
- 身后阶段区分本人完成的工作与后人整理刊行。

- [ ] **Step 5: 运行专项数据与页面验证**

运行：

```bash
npm run build:museum
npm run verify:life-stories-batch5
```

预期：PASS；四个抽屉各显示 5—6 段双纪年，四个独立页各显示 5—6 幕、至少四个来源入口，桌面与 390px 均无横向溢出。

- [ ] **Step 6: 提交独立页精修**

```bash
git add data/ming_person_pages.json data/ming_person_pages_batch2.json
git commit -m "feat: refine fifth batch person pages"
```

---

### Task 5: 全站回归、预览与交付

**Files:**
- Modify only if generated audit output changes: `docs/明史数字博物馆_全馆质量审校_2026-08-08.md`
- Generated preview: `outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people.html`
- Generated pages: four HTML files under `outputs/.../明史数字博物馆/people/`

**Interfaces:**
- Consumes: Tasks 1—4 的数据与验证器。
- Produces: 可供用户本地审阅的第五批预览、干净的分支提交和完整验证记录。

- [ ] **Step 1: 运行内容与数据发布门**

```bash
npm run build:museum
npm run audit:museum
npm run audit:portraits
npm run verify:life-stories-batch5
node scripts/verify_all_person_life_stories.mjs
npm run verify:reign-years
```

预期：专项验证、全人物故事和年号验证通过；数据审计结构错误为 0，画像缺失为 0。

- [ ] **Step 2: 运行完整浏览器回归**

```bash
npm run verify
```

预期：`VERIFY_SUMMARY` 的 `pass` 为 `true`；人物馆、独立页、390px 移动端和抽屉交互全部通过。

- [ ] **Step 3: 构建并验证部署包**

```bash
npm run build:deploy
npm run verify:deploy
```

预期：部署包 31 个或更多页面全部返回 200，图片断链 0，`people.html` 与四个独立页没有横向溢出，最终 `pass` 为 `true`。

- [ ] **Step 4: 核对朱元璋、朱棣没有文案变化**

运行：

```bash
git diff d37f0fa -- data/ming_person_pages.json data/ming_core.json | rg '朱元璋|朱棣|zhu-yuan-zhang|zhu-di'
```

预期：没有属于朱元璋或朱棣对象的新增或删除行；若上下文命中，只允许相邻四人对象的差异，需用 `git diff --word-diff` 再确认。

- [ ] **Step 5: 提交验证报告的必要更新**

仅当 `audit:museum` 改写了已跟踪报告时执行：

```bash
git add docs/明史数字博物馆_全馆质量审校_2026-08-08.md
git commit -m "docs: refresh fifth batch museum audit"
```

- [ ] **Step 6: 输出本地预览链接并停止发布**

交付以下文件链接：

- `people.html?person=王守仁`
- `people.html?person=张居正`
- `people.html?person=李时珍`
- `people.html?person=徐光启`
- `people/wang-shou-ren.html`
- `people/zhang-ju-zheng.html`
- `people/li-shi-zhen.html`
- `people/xu-guang-qi.html`

报告专项、全站、移动端和部署包验证结果。不得合并 `main`、推送 GitHub 或执行 Vercel 生产部署，等待用户审阅后另行授权。
