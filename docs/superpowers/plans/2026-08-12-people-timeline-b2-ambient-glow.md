# 人物馆 B2 空白区独立微闪 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 B2 现有规则重复星芒替换为避开人物信息区的确定性小型十字星芒，让每颗星芒以独立节奏微闪，同时保留全宽长卷、稳定切换栏和拖拽交互。

**Architecture:** 在构建阶段从生成后的人物馆 HTML 读取 163 位人物的 `--person-x`、`--person-y`、`--avatar-size`，同时读取画布尺寸、时间轴与泳道位置。纯函数 `buildB2AmbientStars()` 在固定候选网格中排除头像、姓名、身份、引导线、刻度和泳道标题占位，按横向分区与空白距离选出约 40—50 个稳定坐标；`renderB2AmbientMarkup()` 将其渲染为 B2 独有的不可交互节点。CSS 使用 18×27px 竖长十字星芒、三组关键帧和每颗独立的周期/负延迟，星芒节点属于完整 `.people-timeline-canvas`，因此随长卷拖拽而移动。

**Tech Stack:** Node.js ESM、静态 HTML/CSS、自定义属性、`node:test`、Playwright、现有 `build:museum` / `verify` / `build:deploy` 门禁。

## Global Constraints

- 只修改 B2 预览页；A、B、C、current 与正式 `people.html` 不得出现 B2 星芒或布局变化。
- 保留当前纸张颗粒与明暗纹理；移除离散暗金尘点和规则重复的伪元素星芒。
- 一个约 1490px 宽的可视区域约有 8—12 枚星芒；完整 6704px 长卷约 40—50 枚，密集区允许减量。
- 星芒约 18×27px，纵向长于横向；不得覆盖人物头像、姓名、身份、时间轴、刻度、泳道标题或人物引导线。
- 每颗星芒使用 3.8—8.5 秒的独立确定性周期、负延迟和三类关键帧之一；约 0.3—0.5 秒达到短促峰值，任一时刻只约 2—4 枚明显亮起。
- 星芒不跟随鼠标，但必须作为画布子层随横向长卷移动。
- `[data-b2-ambient]` 与全部星芒必须保持 `aria-hidden="true"`、不可聚焦、`pointer-events:none`。
- `prefers-reduced-motion: reduce` 下动画为 `none`，保留纸质纹理与低亮度静态星芒。
- 长卷继续与页面主内容容器等宽；桌面、768px、390px 均左右对齐且页面本身无横向溢出。
- 两种视图下两个切换按钮的 `x/y/width/height` 差异均不超过 1px，只改变选中态。
- 拖拽、触控横向浏览、底部滚动条、人物单击/双击、键盘和抽屉前后 `scrollLeft` 均不得退化。
- 不改变 163 位人物的时间坐标、泳道、头像尺寸、长卷高度或圆形头像几何。
- 不暂存、覆盖性处理或删除 `outputs/.../*.png` 中现有未跟踪截图。

---

### Task 1: 确定性空白区布点算法

**Files:**
- Modify: `scripts/lib/people_timeline_variants.mjs`
- Modify: `scripts/lib/people_timeline_variants.test.mjs`

**Interfaces:**
- Consumes: 含 `.people-timeline-canvas`、`.timeline-person`、`.timeline-axis`、`.timeline-tick` 和 `.timeline-lane-label` 的生成后 `baseHtml: string`。
- Produces: `parseB2TimelineGeometry(baseHtml: string): {width:number,height:number,axisY:number,people:Array<{x:number,y:number,avatarSize:number}>,ticks:number[],laneYs:number[]}`。
- Produces: `buildB2Exclusions(geometry): Array<{left:number,top:number,right:number,bottom:number,kind:string}>` 与 `selectB2Stars(geometry, exclusions): B2Star[]` 两个模块私有纯函数。
- Produces: `buildB2AmbientStars(baseHtml: string): Array<{x:number,y:number,variant:1|2|3,duration:number,delay:number,peak:number}>`。
- Produces: `renderB2Star(star: B2Star, index: number): string` 与 `renderB2AmbientMarkup(baseHtml: string): string`，返回唯一的 `[data-b2-ambient]` 及其星芒子节点。

- [ ] **Step 1: 写入能表达真实坐标的失败 fixture 与断言**

在测试文件中新增独立 `timelineBase` fixture，至少包含三个人物、时间轴、刻度和泳道标题；人物样式必须使用生产页同名自定义属性：

```js
const timelineBase = base.replace(
  '<div class="people-timeline-canvas" style="--timeline-width:6704px"></div>',
  `<div class="people-timeline-canvas" style="--timeline-width:6704px;--timeline-height:992.48px;--timeline-axis-y:391.68px">
    <div class="timeline-axis"></div>
    <span class="timeline-tick" style="--tick-x:360px"></span>
    <p class="timeline-lane-label" style="--lane-y:56px">后妃与内廷女性</p>
    <article class="timeline-person" data-timeline-person="甲" style="--person-x:492px;--person-y:307.68px;--avatar-size:88px"><strong>甲</strong><small>皇帝</small></article>
    <article class="timeline-person" data-timeline-person="乙" style="--person-x:1152px;--person-y:562.43px;--avatar-size:56px"><strong>乙</strong><small>文臣</small></article>
    <article class="timeline-person" data-timeline-person="丙" style="--person-x:1820px;--person-y:895.70px;--avatar-size:56px"><strong>丙</strong><small>域外人物</small></article>
  </div>`,
);
```

导入尚不存在的 `buildB2AmbientStars` 与 `renderB2AmbientMarkup`，断言：

```js
const first = buildB2AmbientStars(timelineBase);
const second = buildB2AmbientStars(timelineBase);
assert.deepEqual(first, second);
assert.ok(first.length >= 40 && first.length <= 50);
assert.ok(first.every(({x,y}) => x >= 150 && x <= 6686 && y >= 18 && y <= 974));
assert.ok(first.every(({variant}) => [1,2,3].includes(variant)));
assert.equal(new Set(first.map(({variant}) => variant)).size, 3);
assert.ok(first.every(({duration}) => duration >= 3.8 && duration <= 8.5));
assert.ok(first.every(({duration,delay}) => delay < 0 && Math.abs(delay) <= duration));
assert.ok(first.every(({peak}) => peak >= 0.42 && peak <= 0.68));

const markup = renderB2AmbientMarkup(timelineBase);
assert.equal((markup.match(/data-b2-star=/g) || []).length, first.length);
assert.match(markup, /data-b2-ambient aria-hidden="true"/);
assert.match(markup, /--star-x:\d+px;--star-y:\d+px;--star-duration:[\d.]+s;--star-delay:-[\d.]+s/);
```

再为 fixture 中三个人物建立与生产算法相同的扩展矩形，断言没有星芒中心或 18×27px 外框与矩形相交；并断言没有星芒落入 `axisY ± 14px`、刻度 `x ± 12px / axisY ± 26px` 或左侧 150px 泳道标题带。

- [ ] **Step 2: 运行单元 RED**

Run:

```bash
node --test scripts/lib/people_timeline_variants.test.mjs
```

Expected: FAIL，错误明确为 `buildB2AmbientStars` / `renderB2AmbientMarkup` 未导出；既有测试仍可加载。

- [ ] **Step 3: 实现 HTML 坐标解析与占位矩形**

在 `people_timeline_variants.mjs` 中加入下列纯函数边界：

```js
function numericCssVar(style, name) {
  const match = style.match(new RegExp(`--${name}:([\\d.]+)px`));
  return match ? Number(match[1]) : null;
}

function parseB2TimelineGeometry(baseHtml) {
  const canvas = baseHtml.match(/<div class="people-timeline-canvas"[^>]*style="([^"]+)"/);
  if (!canvas) throw new Error('B2 ambient placement requires a timeline canvas');
  const width = numericCssVar(canvas[1], 'timeline-width');
  const height = numericCssVar(canvas[1], 'timeline-height');
  const axisY = numericCssVar(canvas[1], 'timeline-axis-y');
  if (![width, height, axisY].every(Number.isFinite)) {
    throw new Error('B2 ambient placement requires timeline width, height, and axis');
  }
  const people = [...baseHtml.matchAll(/<article class="[^"]*timeline-person[^"]*"[^>]*style="([^"]+)"/g)].map((match) => ({
    x: numericCssVar(match[1], 'person-x'),
    y: numericCssVar(match[1], 'person-y'),
    avatarSize: numericCssVar(match[1], 'avatar-size'),
  }));
  if (!people.length || people.some((person) => !Object.values(person).every(Number.isFinite))) {
    throw new Error('B2 ambient placement requires valid timeline people');
  }
  const ticks = [...baseHtml.matchAll(/class="timeline-tick"[^>]*style="([^"]+)"/g)]
    .map((match) => numericCssVar(match[1], 'tick-x')).filter(Number.isFinite);
  const laneYs = [...baseHtml.matchAll(/class="[^"]*timeline-lane-label[^"]*"[^>]*style="([^"]+)"/g)]
    .map((match) => numericCssVar(match[1], 'lane-y')).filter(Number.isFinite);
  return { width, height, axisY, people, ticks, laneYs };
}

export function buildB2AmbientStars(baseHtml) {
  const geometry = parseB2TimelineGeometry(baseHtml);
  const exclusions = buildB2Exclusions(geometry);
  return selectB2Stars(geometry, exclusions);
}

export function renderB2AmbientMarkup(baseHtml) {
  const stars = buildB2AmbientStars(baseHtml).map(renderB2Star).join('');
  return `<span class="b2-ambient" data-b2-ambient aria-hidden="true">${stars}</span>`;
}
```

人物占位使用明确边界：水平半径为 `Math.max(avatarSize / 2, 58) + 14`；垂直范围为头像中心上方 `avatarSize / 2 + 14` 至下方 `avatarSize / 2 + 52`，覆盖头像、姓名与身份。引导线占位为人物 `x ± 5px`、人物 `y` 到 `axisY` 之间；时间轴占位为 `axisY ± 14px`；刻度为 `x ± 12px / axisY ± 26px`；泳道标题保留左侧 `0—150px` 全高禁区。

- [ ] **Step 4: 实现候选评分与稳定分区**

候选网格使用固定步长和固定错位，不依赖 `Math.random()`：

```js
const STAR_WIDTH = 18;
const STAR_HEIGHT = 27;
const X_STEP = 104;
const Y_STEP = 71;
const SEGMENT_WIDTH = 1490;
const TARGET_PER_SEGMENT = 10;
```

从 `x=176`、`y=28` 开始生成候选；奇数列 `y` 增加 `35.5px`。先排除与任一禁区相交的候选，再按“最近禁区距离降序、同分时 x/y 升序”排序。每个 1490px 横向分区最多选 10 枚，且任意两颗星中心距离至少 92px；最后总量裁剪到 40—50 枚。动画参数只由最终索引计算；三种动画分别使用短、中、长周期：

```js
const variant = (index % 3) + 1;
const ranges = [[3.8, 5.0], [5.1, 6.8], [6.9, 8.5]];
const [min, max] = ranges[variant - 1];
const stepCount = Math.round((max - min) * 10);
const duration = Number((min + ((index * 7) % (stepCount + 1)) / 10).toFixed(1));
const rawDelay = Number((0.4 + ((index * 23) % 61) / 10).toFixed(1));
const delay = -Math.min(rawDelay, Number((duration - 0.1).toFixed(1)));
const peak = Number((0.42 + ((index * 7) % 27) / 100).toFixed(2));
return { x, y, variant, duration, delay, peak };
```

若安全候选不足 40 枚，函数必须抛出包含实际数量的错误，而不是回退到覆盖人物的点位。

- [ ] **Step 5: 运行单元 GREEN 并提交算法**

Run:

```bash
node --test scripts/lib/people_timeline_variants.test.mjs
```

Expected: 全部 PASS；两次构建结果深度相等；星芒数量、三类动画、周期、延迟和全部 fixture 避让断言通过。

```bash
git add scripts/lib/people_timeline_variants.mjs scripts/lib/people_timeline_variants.test.mjs
git diff --cached --check
git commit -m "feat: place B2 starlight in timeline gaps"
```

---

### Task 2: 渲染 18×27px 独立微闪并保持 B2 隔离

**Files:**
- Modify: `scripts/lib/people_timeline_variants.mjs`
- Modify: `scripts/lib/people_timeline_variants.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `renderB2AmbientMarkup(baseHtml): string`。
- Produces: B2 页面中的唯一 `.b2-ambient`、40—50 个 `.b2-star` 节点和三类独立动画；其他五个页面无相关节点。

- [ ] **Step 1: 写入渲染与 CSS 失败断言**

将旧的 `:before/:after` 6秒/8秒契约替换为：

```js
const css = TIMELINE_VARIANT_CSS.b2;
assert.match(css, /\.b2-star\{[^}]*width:18px[^}]*height:27px[^}]*pointer-events:none/);
assert.match(css, /\.b2-star:before\{[^}]*width:18px[^}]*height:/);
assert.match(css, /\.b2-star:after\{[^}]*width:[^}]*height:27px/);
assert.match(css, /animation-duration:var\(--star-duration\)/);
assert.match(css, /animation-delay:var\(--star-delay\)/);
assert.match(css, /b2Twinkle1|b2Twinkle2|b2Twinkle3/);
assert.doesNotMatch(css, /b2GlowA|b2GlowB|animation:[^;]* 6s|animation:[^;]* 8s/);
assert.match(css, /prefers-reduced-motion:reduce[\s\S]*?\.b2-star\{animation:none/);

const pages = Object.fromEntries(
  ['current','a','b','b2','c'].map((key) => [key, renderPeopleTimelineVariantPage(timelineBase, key)]),
);
assert.ok((pages.b2.match(/data-b2-star=/g) || []).length >= 40);
for (const key of ['current','a','b','c']) assert.doesNotMatch(pages[key], /data-b2-ambient|data-b2-star/);
```

- [ ] **Step 2: 运行渲染 RED**

Run:

```bash
node --test scripts/lib/people_timeline_variants.test.mjs
```

Expected: FAIL，因为 B2 仍注入空装饰层并使用两个共享伪元素动画。

- [ ] **Step 3: 接入构建期 markup**

在 `renderPeopleTimelineVariantPage()` 的 B2 分支中，将固定字符串改为：

```js
const ambientMarkup = renderB2AmbientMarkup(baseHtml);
html = requiredReplace(
  html,
  /(<div class="people-timeline-canvas"[^>]*>)/,
  `$1${ambientMarkup}`,
  'B2 ambient layer',
);
```

星芒节点形态固定为：

```html
<i class="b2-star b2-star--2" data-b2-star="17"
   style="--star-x:2144px;--star-y:744px;--star-duration:6.7s;--star-delay:-2.9s;--star-peak:.53"></i>
```

容器和星芒都不提供文本或 `tabindex`；容器保留 `aria-hidden="true"`。

- [ ] **Step 4: 用 CSS 绘制竖长十字与独立微闪**

保留 `[data-b2-ambient]` 本体的纸张颗粒，只删除其星点伪元素规则。新增：

```css
body[data-scroll-variant="b2"] .b2-star{
  position:absolute;left:var(--star-x);top:var(--star-y);z-index:0;
  width:18px;height:27px;transform:translate(-50%,-50%);
  pointer-events:none;opacity:.12;
  animation-duration:var(--star-duration);animation-delay:var(--star-delay);
  animation-timing-function:linear;animation-iteration-count:infinite;
}
body[data-scroll-variant="b2"] .b2-star:before,
body[data-scroll-variant="b2"] .b2-star:after{
  content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  background:linear-gradient(90deg,transparent,rgba(247,213,139,.72),transparent);
  filter:blur(.25px);
}
body[data-scroll-variant="b2"] .b2-star:before{width:18px;height:1px}
body[data-scroll-variant="b2"] .b2-star:after{width:1px;height:27px}
body[data-scroll-variant="b2"] .b2-star--1{animation-name:b2Twinkle1}
body[data-scroll-variant="b2"] .b2-star--2{animation-name:b2Twinkle2}
body[data-scroll-variant="b2"] .b2-star--3{animation-name:b2Twinkle3}
@keyframes b2Twinkle1{
  0%,11%,22%,100%{opacity:.10}16%{opacity:var(--star-peak)}
}
@keyframes b2Twinkle2{
  0%,42%,56%,100%{opacity:.11}49%{opacity:var(--star-peak)}
}
@keyframes b2Twinkle3{
  0%,72%,84%,100%{opacity:.09}78%{opacity:var(--star-peak)}
}
```

三组关键帧都以低亮度为常态，只在不同百分比位置出现短峰值；短、中、长周期分别配 10%、7%、6% 左右的亮起段，使上升到峰值约需 0.3—0.5 秒。关键帧不得改变 `left/top/transform`，避免星芒漂移。

减少动态效果规则固定为：

```css
@media(prefers-reduced-motion:reduce){
  body[data-scroll-variant="b2"] .b2-star{animation:none;opacity:.16}
}
```

- [ ] **Step 5: 运行局部 GREEN 并提交渲染**

Run:

```bash
npm run build:museum
npm run verify:people-timeline-variants-unit
```

Expected: build exit `0`；variants unit 全部 PASS；生成的 `people-timeline-b2.html` 有唯一装饰层和 40—50 个星芒，其他预览页及正式页均无星芒节点。

```bash
git add scripts/lib/people_timeline_variants.mjs scripts/lib/people_timeline_variants.test.mjs
git diff --cached --check
git commit -m "feat: give B2 stars independent twinkle rhythms"
```

---

### Task 3: 浏览器碰撞、节奏、拖拽与完整发布回归

**Files:**
- Modify: `scripts/verify_ming_people_timeline_variants_page.mjs`

**Interfaces:**
- Consumes: Task 2 生成的 `[data-b2-ambient]`、`[data-b2-star]`、人物节点与拖拽 surface。
- Produces: 真实浏览器中的全量碰撞审计、动画多样性、随卷移动、三视口与 reduced-motion 证据。

- [ ] **Step 1: 将旧伪元素采集改为显式星芒采集**

重写 `captureB2Ambience(page)`，返回：

```js
return {
  layer: { count, ariaHidden, pointerEvents, left, width, height, baseBackground },
  stars: [...document.querySelectorAll('[data-b2-star]')].map((star) => {
    const box = star.getBoundingClientRect();
    const style = getComputedStyle(star);
    return {
      id: star.dataset.b2Star,
      left: box.left, top: box.top, right: box.right, bottom: box.bottom,
      width: box.width, height: box.height,
      animationName: style.animationName,
      duration: parseFloat(style.animationDuration),
      delay: parseFloat(style.animationDelay),
      pointerEvents: style.pointerEvents,
    };
  }),
  canvasLeft: canvasBox?.left || 0,
};
```

新增 `captureB2StarCollisions(page)`：把每颗星的 `getBoundingClientRect()` 与所有 `.timeline-portrait`、`.timeline-person strong`、`.timeline-person small`、`.timeline-axis`、`.timeline-tick`、`.timeline-lane-label` 和 `.timeline-person-guide` 的矩形逐一比较；允许边界相切，不允许正面积相交。返回星芒总数、冲突数组和当前 1490px 窗口内星芒数。

- [ ] **Step 2: 写浏览器失败断言**

在 `verifyB2()` 中断言：

```js
check(ambience.stars.length >= 40 && ambience.stars.length <= 50, 'B2 must render 40-50 deterministic stars', ambience);
check(ambience.stars.every((star) => Math.abs(star.width - 18) <= 1 && Math.abs(star.height - 27) <= 1), 'B2 stars must be small vertical crosses', ambience.stars);
check(new Set(ambience.stars.map((star) => star.animationName)).size === 3, 'B2 stars must use three twinkle families', ambience.stars);
check(new Set(ambience.stars.map((star) => `${star.duration}/${star.delay}`)).size >= 20, 'B2 stars must not share one rhythm', ambience.stars);
check(ambience.stars.every((star) => star.duration >= 3.8 && star.duration <= 8.5 && star.delay < 0), 'B2 star timing must stay in the approved range', ambience.stars);
check(collisions.items.length === 0, 'B2 stars must avoid all historical content', collisions);
check(collisions.visibleCount >= 8 && collisions.visibleCount <= 12, 'B2 viewport must show 8-12 stars', collisions);
```

Expected before production integration: FAIL，因为旧页面没有 `[data-b2-star]`。

- [ ] **Step 3: 验证星芒随画布而非视口移动**

记录 `scrollLeft=0` 时至少三个可见星芒的 `left`；将 surface 设为 `scrollLeft=660` 后按 `data-b2-star` 对应采集，断言每颗星的 viewport `left` 减少约 660px，而内联 `--star-x/--star-y` 不变。随后执行现有真实 mouse drag，断言 `scrollLeft` 再次变化、`data-dragging` 在松开后清空，并继续执行人物命中与双击抽屉断言。

- [ ] **Step 4: 验证 reduced motion、三视口和视图隔离**

在 `reducedMotion:'reduce'` context 中断言所有星芒 `animationName === 'none'`、静态 `opacity > 0`。在 1440、768、390 三个 viewport 中分别断言：

- 页面 `body.scrollWidth === innerWidth`；
- 模块/舞台左右边界仍对齐；
- 切换人物总表前后 tabs 几何差不超过 1px；
- 人物总表与抽屉配色和 current 完全一致；
- A、B、C、current 与正式 `people.html` 的 `[data-b2-star]` 数量均为 0。

- [ ] **Step 5: 运行浏览器 GREEN 并人工审图**

Run:

```bash
node scripts/verify_ming_people_timeline_variants_page.mjs
```

Expected: exit `0`、`status:ok`；B2 星芒 40—50 枚、当前桌面窗口 8—12 枚、碰撞 0、三类动画且至少 20 组不同周期/延迟；拖拽与抽屉保持 `scrollLeft`；只刷新既有未跟踪 B2 截图。

人工检查 B2 截图：第一眼仍是黑金纸质长卷；星芒明显小于头像，竖向略长，主要分布在人物稀少处，不形成规律网格或银河背景。

- [ ] **Step 6: 运行完整门禁和部署验证**

Run:

```bash
npm run verify
npm run build:deploy
npm run verify:deploy
```

Expected: 三条命令 exit `0`；数据、人物时间轴、legacy museum、正式人物馆、A/B/B2/C variants、六页双击回归全部通过；部署页 broken links 为 `0`，B2 预览页仍为 `noindex,nofollow`。

- [ ] **Step 7: 提交浏览器验收并审计工作区**

```bash
git add scripts/verify_ming_people_timeline_variants_page.mjs
git diff --cached --check
git commit -m "test: verify B2 collision-free independent starlight"
git status --short
```

Expected: tracked 工作区干净；六张既有 PNG 仍为未跟踪文件且未进入索引。
