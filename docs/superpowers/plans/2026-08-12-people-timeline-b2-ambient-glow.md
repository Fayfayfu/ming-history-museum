# 人物馆历史长卷 B2「岁月微光」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 B2 历史长卷增加随画布移动的静态暗金尘点与极慢呼吸微光，同时完整保留拖拽、人物交互、表格/抽屉配色和其他版本隔离。

**Architecture:** 在 B2 渲染阶段向 `.people-timeline-canvas` 首部注入一个 `aria-hidden` 装饰层。装饰层本体承载确定性静态尘点与纸张颗粒，两个伪元素分别承载 19 秒和 23 秒的低透明度呼吸微光；全部使用 CSS、`pointer-events:none`，不引入 Canvas、WebGL、随机脚本或网络资源。现有 B2 页面验证器负责真实浏览器中的图层尺寸、动画、减少动态效果、拖拽、命中、抽屉位置保持、响应式和版本隔离。

**Tech Stack:** Node.js ESM、静态 HTML/CSS、`node:test`、Playwright 页面验证、现有 `build:museum` / `verify` / `build:deploy` 脚本。

## Global Constraints

- 只修改 B2 预览页；A、B、C、current 和正式 `people.html` 不得出现微光层或相关效果。
- 静态层使用 1px 暗金尘点与少量约 1.5px 柔光点，普通尘点透明度保持 0.08—0.18。
- 呼吸微光使用约 19 秒和 23 秒两组周期，桌面可视区域内明显光点不超过 3—5 个。
- `prefers-reduced-motion: reduce` 下动画必须为 `none`，静态尘点必须保留。
- 装饰层必须 `aria-hidden="true"`、不可聚焦并使用 `pointer-events:none`。
- 鼠标拖拽、触控横向浏览、底部滚动条、人物单击/双击和键盘操作必须保持可用。
- 打开和关闭人物抽屉前后的 `scrollLeft` 必须保持不变。
- 不改变 163 位人物的时间坐标、泳道、头像尺寸、长卷高度或圆形头像几何。
- 不暂存或删除 `outputs/.../*.png` 中现有未跟踪截图；验证器可刷新同路径文件，但它们继续保持未跟踪。

---

### Task 1: 注入 B2 专属、无语义的微光图层

**Files:**
- Modify: `scripts/lib/people_timeline_variants.test.mjs:19-31,87-99`
- Modify: `scripts/lib/people_timeline_variants.mjs:200-227`

**Interfaces:**
- Consumes: `renderPeopleTimelineVariantPage(baseHtml, variant) -> string` 和现有 `.people-timeline-canvas` 起始标签。
- Produces: 仅 B2 HTML 中的 `<span class="b2-ambient" data-b2-ambient aria-hidden="true"></span>`；后续 CSS 与浏览器验证以 `[data-b2-ambient]` 为唯一选择器。

- [ ] **Step 1: 写入会失败的结构隔离测试**

在 `scripts/lib/people_timeline_variants.test.mjs` 的 B2 测试后新增：

```js
test('B2 alone renders one inaccessible ambient layer inside the timeline canvas', () => {
  const pages = Object.fromEntries(
    ['current', 'a', 'b', 'b2', 'c'].map((key) => [key, renderPeopleTimelineVariantPage(base, key)]),
  );
  assert.equal((pages.b2.match(/data-b2-ambient/g) || []).length, 1);
  assert.match(
    pages.b2,
    /<div class="people-timeline-canvas"[^>]*><span class="b2-ambient" data-b2-ambient aria-hidden="true"><\/span>/,
  );
  for (const key of ['current', 'a', 'b', 'c']) assert.doesNotMatch(pages[key], /data-b2-ambient/, key);
});
```

- [ ] **Step 2: 运行测试并确认 RED 原因正确**

Run:

```bash
npm run verify:people-timeline-variants-unit
```

Expected: FAIL；新测试报告 B2 中 `data-b2-ambient` 数量为 `0`，既有测试仍通过。

- [ ] **Step 3: 最小化注入 B2 装饰层**

在 `renderPeopleTimelineVariantPage` 的 `variant === 'b2'` 分支中，在现有 framed stage 和 rollers 注入之后增加：

```js
html = requiredReplace(
  html,
  /(<div class="people-timeline-canvas"[^>]*>)/,
  '$1<span class="b2-ambient" data-b2-ambient aria-hidden="true"></span>',
  'B2 ambient layer',
);
```

不要添加 `tabindex`、role、可见文案或 JavaScript事件。

- [ ] **Step 4: 运行单元测试并确认 GREEN**

Run:

```bash
npm run build:museum
npm run verify:people-timeline-variants-unit
```

Expected: build exit `0`；variants unit 全部通过；生成的 `people-timeline-b2.html` 只有一个 `data-b2-ambient`，其余四个预览页和正式页为零。

- [ ] **Step 5: 提交结构变更**

```bash
git add scripts/lib/people_timeline_variants.mjs scripts/lib/people_timeline_variants.test.mjs
git diff --cached --check
git commit -m "feat: add isolated B2 ambient layer"
```

---

### Task 2: 实现静态尘点、双周期微光并锁定全部交互

**Files:**
- Modify: `scripts/verify_ming_people_timeline_variants_page.mjs:177-195,197-230,324-450`
- Modify: `scripts/lib/people_timeline_variants.test.mjs:87-110`
- Modify: `scripts/lib/people_timeline_variants.mjs:27-43`

**Interfaces:**
- Consumes: Task 1 生成的 `[data-b2-ambient]` 元素和现有 `[data-scroll-drag-surface]`。
- Produces: `captureB2Ambience(page) -> { count, ariaHidden, pointerEvents, position, width, height, canvasWidth, canvasHeight, baseBackground, beforeBackground, afterBackground, beforeDuration, afterDuration, beforeAnimation, afterAnimation }`；`verifyB2` 使用该结果执行视觉层、减少动态效果和交互断言。

- [ ] **Step 1: 写入浏览器 RED 断言**

在 `scripts/verify_ming_people_timeline_variants_page.mjs` 中新增真实样式采集函数：

```js
async function captureB2Ambience(page) {
  return page.evaluate(() => {
    const ambience = document.querySelector('[data-b2-ambient]');
    const canvas = document.querySelector('.people-timeline-canvas');
    const box = ambience?.getBoundingClientRect();
    const canvasBox = canvas?.getBoundingClientRect();
    const base = ambience ? getComputedStyle(ambience) : null;
    const before = ambience ? getComputedStyle(ambience, '::before') : null;
    const after = ambience ? getComputedStyle(ambience, '::after') : null;
    return {
      count: document.querySelectorAll('[data-b2-ambient]').length,
      ariaHidden: ambience?.getAttribute('aria-hidden') || '',
      pointerEvents: base?.pointerEvents || '',
      position: base?.position || '',
      width: box?.width || 0,
      height: box?.height || 0,
      canvasWidth: canvasBox?.width || 0,
      canvasHeight: canvasBox?.height || 0,
      baseBackground: base?.backgroundImage || '',
      beforeBackground: before?.backgroundImage || '',
      afterBackground: after?.backgroundImage || '',
      beforeDuration: before?.animationDuration || '',
      afterDuration: after?.animationDuration || '',
      beforeAnimation: before?.animationName || '',
      afterAnimation: after?.animationName || '',
    };
  });
}
```

在 `verifyB2` 初始时间轴状态中采集并断言：

```js
const ambience = await captureB2Ambience(page);
check(
  ambience.count === 1
    && ambience.ariaHidden === 'true'
    && ambience.pointerEvents === 'none'
    && ambience.position === 'absolute'
    && Math.abs(ambience.width - ambience.canvasWidth) <= 1
    && Math.abs(ambience.height - ambience.canvasHeight) <= 1,
  'B2 ambience must be one inert full-canvas layer',
  ambience,
);
check(
  ambience.baseBackground.includes('radial-gradient')
    && ambience.beforeBackground.includes('radial-gradient')
    && ambience.afterBackground.includes('radial-gradient')
    && new Set([ambience.beforeDuration, ambience.afterDuration]).has('19s')
    && new Set([ambience.beforeDuration, ambience.afterDuration]).has('23s'),
  'B2 ambience must combine static dust with independent 19s and 23s glows',
  ambience,
);
```

同时把 `captureB2Geometry` 的返回值扩展为：

```js
stageOverflowX: stage ? getComputedStyle(stage).overflowX : '',
stageTouchAction: stage ? getComputedStyle(stage).touchAction : '',
```

并在现有 B2 几何断言后加入：

```js
check(
  ['auto', 'scroll'].includes(geometry.stageOverflowX)
    && geometry.stageTouchAction !== 'none',
  'B2 stage must preserve native horizontal touch scrolling',
  geometry,
);
```

新增减少动态效果 context，并确认静态纹理仍存在：

```js
const reducedPage = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
let reducedAmbience;
try {
  await reducedPage.goto(`file://${path.join(root, 'people-timeline-b2.html')}`, { waitUntil: 'domcontentloaded' });
  reducedAmbience = await captureB2Ambience(reducedPage);
} finally {
  await reducedPage.close();
}
check(
  reducedAmbience.baseBackground.includes('radial-gradient')
    && reducedAmbience.beforeAnimation === 'none'
    && reducedAmbience.afterAnimation === 'none',
  'B2 reduced motion must preserve static dust and disable breathing glows',
  reducedAmbience,
);
```

扩展现有 B2 返回 JSON，包含 `ambience` 与 `reducedAmbience`，便于失败时审阅实际值。

- [ ] **Step 2: 运行页面验证并确认 RED 原因正确**

Run:

```bash
npm run build:museum
npm run verify:people-timeline-variants-page
```

Expected: build exit `0`；页面验证 FAIL，原因是微光层 `position`、背景图和 19/23 秒动画尚未实现。既有拖拽、人物命中与表格/抽屉断言不应成为首个失败原因。

- [ ] **Step 3: 增加 CSS 单元契约**

在 B2 CSS 单元测试中加入最低结构约束，避免视觉层扩散或被未来重构删除：

```js
assert.match(css, /\[data-b2-ambient\]\{[^}]*position:absolute[^}]*inset:0[^}]*pointer-events:none/);
assert.match(css, /\[data-b2-ambient\]:before[^\n]*animation:b2GlowA 19s/);
assert.match(css, /\[data-b2-ambient\]:after[^\n]*animation:b2GlowB 23s/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?data-b2-ambient[\s\S]*?animation:none/);
```

Run:

```bash
npm run verify:people-timeline-variants-unit
```

Expected: FAIL，因为 B2 CSS 尚无微光图层、关键帧和 reduced-motion 规则。

- [ ] **Step 4: 实现确定性静态层和两组慢速微光**

在 `TIMELINE_VARIANT_CSS.b2` 中、人物文字规则之前加入以下 B2 专属样式。颜色和透明度必须保持在规范范围，不增加额外 DOM：

```css
body[data-scroll-variant="b2"] .people-timeline-canvas{isolation:isolate}
body[data-scroll-variant="b2"] [data-b2-ambient]{
  position:absolute;
  inset:0;
  z-index:0;
  overflow:hidden;
  pointer-events:none;
  background-image:
    radial-gradient(circle at 12% 23%,rgba(207,169,92,.14) 0 1px,transparent 1.7px),
    radial-gradient(circle at 67% 61%,rgba(184,142,70,.11) 0 1px,transparent 1.6px),
    radial-gradient(circle at 38% 76%,rgba(235,202,130,.09) 0 1.4px,transparent 2.2px),
    repeating-radial-gradient(ellipse at 43% 48%,rgba(246,232,195,.018) 0 .45px,transparent .8px 5px);
  background-size:487px 331px,719px 463px,941px 587px,9px 7px;
  background-position:17px 31px,109px 73px,251px 41px,0 0;
}
body[data-scroll-variant="b2"] [data-b2-ambient]:before,
body[data-scroll-variant="b2"] [data-b2-ambient]:after{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.18;
}
body[data-scroll-variant="b2"] [data-b2-ambient]:before{
  background-image:
    radial-gradient(circle,rgba(240,199,105,.32) 0 1px,rgba(240,199,105,.08) 2px,transparent 5px);
  background-size:1187px 743px;
  background-position:173px 131px;
  animation:b2GlowA 19s ease-in-out -7s infinite;
}
body[data-scroll-variant="b2"] [data-b2-ambient]:after{
  background-image:
    radial-gradient(circle,rgba(248,215,139,.28) 0 1.4px,rgba(248,215,139,.06) 3px,transparent 6px);
  background-size:1693px 971px;
  background-position:389px 211px;
  animation:b2GlowB 23s ease-in-out -13s infinite;
}
@keyframes b2GlowA{0%,100%{opacity:.12}50%{opacity:.28}}
@keyframes b2GlowB{0%,100%{opacity:.10}54%{opacity:.24}}
@media(prefers-reduced-motion:reduce){
  body[data-scroll-variant="b2"] [data-b2-ambient]:before,
  body[data-scroll-variant="b2"] [data-b2-ambient]:after{animation:none;opacity:.16}
}
```

如果实际截图呈现规则网格，唯一允许的视觉调整是改变 `background-size`、`background-position` 和不透明度；不得提高光点数量、添加星芒或改变人物内容层。

- [ ] **Step 5: 运行 unit 与页面验证并确认 GREEN**

Run:

```bash
npm run build:museum
npm run verify:people-timeline-variants-unit
npm run verify:people-timeline-variants-page
```

Expected:

- build exit `0`；variants unit 全部通过。
- 页面验证 `status:"ok"`。
- `ambience.count=1`、`pointerEvents="none"`、图层尺寸等于完整 canvas。
- 两个伪元素动画周期分别为 `19s` 和 `23s`。
- reduced-motion 下两个 animation name 均为 `none`，静态背景仍为径向渐变。
- B2 拖拽产生非零 `scrollLeft`，松开后 `data-dragging` 清空。
- 抽屉打开和关闭前后的 `scrollLeft` 差值不超过 1px。

- [ ] **Step 6: 审阅 B2 截图并做一次克制度检查**

打开验证器生成的：

```text
outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/人物馆_历史长卷_B2版.png
```

人工检查以下四点：

1. 第一眼仍是黑金长卷，不是星空背景。
2. 光点不能覆盖或降低头像、名字、身份和时间刻度可读性。
3. 不出现规则网格、明显重复、五角星或十字星芒。
4. 静态截图中可见微光，但光点数量不能主导画面。

- [ ] **Step 7: 运行完整回归与部署产物验证**

Run:

```bash
npm run verify
npm run build:deploy
npm run verify:deploy
```

Expected: 三条命令均 exit `0`；正式人物馆、五个预览页、六页双击交互和部署文件验证全部通过。部署报告仍包含 30 个页面，五个预览页维持 `noindex`，正式 `people.html` 不含 B2 marker。

- [ ] **Step 8: 精准提交视觉实现与验证**

```bash
git add scripts/lib/people_timeline_variants.mjs scripts/lib/people_timeline_variants.test.mjs scripts/verify_ming_people_timeline_variants_page.mjs
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add restrained ambient glow to B2 timeline"
```

提交后运行：

```bash
git status --short
```

Expected: tracked worktree clean；仅保留实施前已经存在的未跟踪 PNG 截图。
