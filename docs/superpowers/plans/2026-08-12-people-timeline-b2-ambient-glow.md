# 人物馆 B2 等宽长卷与呼吸星芒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 B2 长卷与页面主内容容器等宽、两种视图的切换按钮位置完全一致，并以可在短暂停留中察觉的四向十字星芒替代暗金尘点。

**Architecture:** 继续复用现有 B2 专属 `[data-b2-ambient]` 全画布装饰层，不增加运行时粒子系统。CSS 本体保留纸张颗粒，两个伪元素绘制确定性十字星芒并分别以 6 秒、8 秒错峰呼吸；图层仍属于 `.people-timeline-canvas`，所以随 `scrollLeft` 移动且不捕获指针。B2 模块取消 26px 横向内缩，并将切换栏定位提升为 B2 两种视图共享规则。

**Tech Stack:** Node.js ESM、静态 HTML/CSS、`node:test`、Playwright、现有 `build:museum` / `verify` / `build:deploy` 门禁。

## Global Constraints

- 只修改 B2 预览页；A、B、C、current 与正式 `people.html` 不得出现 B2 星芒或布局变化。
- 保留当前纸张颗粒与明暗纹理；移除离散暗金尘点。
- 一个约 1490px 宽的可视区域分布约 4—6 枚柔和四向十字星芒。
- 两组呼吸周期分别约为 6 秒和 8 秒，使用负延迟错峰；短暂停留约 2—4 秒可察觉变化。
- 星芒不跟随鼠标，但必须作为画布子层随横向长卷移动。
- `[data-b2-ambient]` 必须保持 `aria-hidden="true"`、不可聚焦、`pointer-events:none`。
- `prefers-reduced-motion: reduce` 下动画为 `none`，保留纸质纹理与低亮度静态星芒。
- 长卷宽度跟随页面主内容容器，不写死 1490px；桌面、768px、390px 均左右对齐。
- 两种视图下两个切换按钮的 `x/y/width/height` 差异均不超过 1px，只改变选中态。
- 拖拽、触控横向浏览、底部滚动条、人物单击/双击、键盘和抽屉前后 `scrollLeft` 均不得退化。
- 不改变 163 位人物的时间坐标、泳道、头像尺寸、长卷高度或圆形头像几何。
- 不暂存、覆盖性处理或删除 `outputs/.../*.png` 中现有未跟踪截图。

---

### Task 1: 用失败测试锁定等宽、稳定切换栏与新星芒契约

**Files:**
- Modify: `scripts/lib/people_timeline_variants.test.mjs`
- Modify: `scripts/verify_ming_people_timeline_variants_page.mjs`

**Interfaces:**
- Consumes: `TIMELINE_VARIANT_CSS.b2: string`、现有 `captureB2Ambience(page)`、`verifyB2(browser,page,currentPage)`。
- Produces: B2 CSS 静态契约，以及真实浏览器中的容器对齐、切换栏稳定、动画节奏、画布归属和拖拽验收。

- [ ] **Step 1: 将 B2 单元契约改成新口径**

在 `scripts/lib/people_timeline_variants.test.mjs` 的 B2 测试中用下列断言替换旧的 26px、19秒、23秒断言：

```js
assert.match(css, /body\[data-scroll-variant="b2"\] \.people-timeline\{[^}]*margin-top:49px[^}]*padding:0/);
assert.match(css, /body\[data-scroll-variant="b2"\] \.people-view-tabs\{[^}]*position:absolute[^}]*left:0[^}]*top:-43px/);
assert.doesNotMatch(css, /padding:0 26px|left:26px|right:26px|padding:0 12px|left:12px|right:12px/);
assert.match(css, /\[data-b2-ambient\]:before[^\n]*animation:b2GlowA 6s/);
assert.match(css, /\[data-b2-ambient\]:after[^\n]*animation:b2GlowB 8s/);
assert.match(css, /linear-gradient\([^)]*transparent[^)]*rgba\(24[08],19[09],10[05]/);
assert.doesNotMatch(css, /radial-gradient\(circle at 12% 23%|radial-gradient\(circle at 67% 61%|radial-gradient\(circle at 38% 76%/);
```

- [ ] **Step 2: 扩展浏览器采集与断言**

在 `captureB2Ambience` 中补充画布和装饰层的文档坐标：

```js
canvasLeft: canvasBox?.left || 0,
ambienceLeft: box?.left || 0,
```

在 B2 首次加载后记录 `initialAmbience`；将舞台滚动到 `660` 后再次记录 `scrolledAmbience`，并断言：

```js
check(
  initialAmbience.beforeDuration === '6s'
    && initialAmbience.afterDuration === '8s'
    && initialAmbience.beforeBackground.includes('linear-gradient')
    && initialAmbience.afterBackground.includes('linear-gradient'),
  'B2 must use sparse cross-shaped 6s and 8s breathing glows',
  initialAmbience,
);
check(
  Math.abs((scrolledAmbience.ambienceLeft - initialAmbience.ambienceLeft) + 660) <= 2
    && Math.abs(scrolledAmbience.ambienceLeft - scrolledAmbience.canvasLeft) <= 1,
  'B2 starlight must move with the timeline canvas',
  { initialAmbience, scrolledAmbience },
);
```

新增 `captureB2Alignment(page)`，采集 `.people-timeline`、`#peopleTimelineView` 和两个按钮的矩形；在 1440、768、390 三个 viewport 中断言 timeline 状态下 module 与 stage 左右边界差不超过 1px。随后点击人物总表，重新采集按钮矩形并断言每个按钮的 `left/top/width/height` 与 timeline 状态差不超过 1px。

- [ ] **Step 3: 运行 RED**

Run:

```bash
npm run build:museum
npm run verify:people-timeline-variants-unit
node scripts/verify_ming_people_timeline_variants_page.mjs
```

Expected: build exit `0`；unit 因旧 `padding:0 26px`、19秒/23秒失败；页面验证因舞台左右内缩、切换后按钮跳位、旧动画周期和星芒未使用十字线性渐变失败。既有拖拽和人物命中不应成为首个失败原因。

- [ ] **Step 4: 提交测试 RED**

```bash
git add scripts/lib/people_timeline_variants.test.mjs scripts/verify_ming_people_timeline_variants_page.mjs
git diff --cached --check
git commit -m "test: define B2 full-width starlight behavior"
```

---

### Task 2: 实现等宽模块、共享切换栏与随卷十字星芒

**Files:**
- Modify: `scripts/lib/people_timeline_variants.mjs`

**Interfaces:**
- Consumes: 现有 `TIMELINE_VARIANT_CSS.b2` 与 HTML 中唯一的 `[data-b2-ambient]`。
- Produces: B2 两种视图共用的容器/切换栏几何，以及随 `.people-timeline-canvas` 移动的静态纸纹和双周期星芒。

- [ ] **Step 1: 统一 B2 模块与切换栏定位**

将仅限 timeline 状态的容器和 tabs 规则提升为 B2 共享规则：

```css
body[data-scroll-variant="b2"] .people-timeline{
  position:relative;
  display:block;
  margin-top:49px;
  padding:0;
  background:transparent;
}
body[data-scroll-variant="b2"] .people-view-tabs{
  position:absolute;
  left:0;
  top:-43px;
  display:flex;
  gap:8px;
  margin:0;
  padding:0;
  z-index:10;
}
```

timeline 状态的 `#peopleTimelineView` 保持 `width:100%`；将左右遮罩和两个 roller 的偏移从 `26px` 改成 `0`。删除 B2 的 `max-width:600px` 下 12px 横向内缩规则。table 状态继续隐藏 stage、roller 和伪元素，但不覆盖共享模块/tabs 几何。

- [ ] **Step 2: 保留纸纹并用十字星芒替换尘点**

保留 `[data-b2-ambient]` 本体中的 `repeating-radial-gradient` 纸张颗粒，删除三个离散暗金圆点渐变。两个伪元素分别使用“径向柔光核心＋水平线性光芒＋垂直线性光芒”的多背景组合，并使用确定性的 `background-size` / `background-position` 在完整 6704px 画布上稀疏重复：

```css
body[data-scroll-variant="b2"] [data-b2-ambient]:before{
  background-image:
    radial-gradient(circle,rgba(248,215,139,.58) 0 1px,rgba(240,199,105,.20) 2px,transparent 6px),
    linear-gradient(90deg,transparent 0 44%,rgba(240,199,105,.08) 47%,rgba(248,215,139,.42) 50%,rgba(240,199,105,.08) 53%,transparent 56% 100%),
    linear-gradient(0deg,transparent 0 42%,rgba(240,199,105,.06) 46%,rgba(248,215,139,.30) 50%,rgba(240,199,105,.06) 54%,transparent 58% 100%);
  background-size:1187px 743px,1187px 743px,1187px 743px;
  background-position:173px 131px;
  animation:b2GlowA 6s ease-in-out -2.1s infinite;
}
body[data-scroll-variant="b2"] [data-b2-ambient]:after{
  background-image:
    radial-gradient(circle,rgba(248,215,139,.52) 0 1.2px,rgba(240,199,105,.16) 2.5px,transparent 7px),
    linear-gradient(90deg,transparent 0 45%,rgba(248,215,139,.36) 50%,transparent 55% 100%),
    linear-gradient(0deg,transparent 0 43%,rgba(248,215,139,.26) 50%,transparent 57% 100%);
  background-size:1693px 971px,1693px 971px,1693px 971px;
  background-position:389px 211px;
  animation:b2GlowB 8s ease-in-out -5.3s infinite;
}
@keyframes b2GlowA{0%,100%{opacity:.16}45%{opacity:.62}70%{opacity:.24}}
@keyframes b2GlowB{0%,100%{opacity:.12}55%{opacity:.54}78%{opacity:.20}}
```

若浏览器截图显示星芒超过每屏约 4—6 枚或明显压过人物文字，只能通过提高 `background-size` 或降低峰值透明度收敛，不增加 DOM 或运行时随机逻辑。

- [ ] **Step 3: 保持减少动态效果**

继续使用：

```css
@media(prefers-reduced-motion:reduce){
  body[data-scroll-variant="b2"] [data-b2-ambient]:before,
  body[data-scroll-variant="b2"] [data-b2-ambient]:after{
    animation:none;
    opacity:.22;
  }
}
```

Expected: 纸纹与低亮度静态十字星芒可见，无动画。

- [ ] **Step 4: 运行局部 GREEN 并检查截图**

Run:

```bash
npm run build:museum
npm run verify:people-timeline-variants-unit
node scripts/verify_ming_people_timeline_variants_page.mjs
```

Expected: unit 全部通过；页面验证 `status:ok`；B2 module/stage 左右边界一致，三视口无 body 横向溢出；tabs 两种状态几何差不超过 1px；拖拽 `scrollLeft` 从 0 变为非零；装饰层相对 viewport 随 canvas 同步移动；截图仅刷新既有未跟踪 B2 PNG。

- [ ] **Step 5: 提交生产实现**

```bash
git add scripts/lib/people_timeline_variants.mjs
git diff --cached --check
git commit -m "feat: widen B2 scroll and add visible starlight"
```

---

### Task 3: 完整回归、部署包验证与最终提交审计

**Files:**
- Modify only if a test defect is proven: `scripts/verify_ming_people_timeline_variants_page.mjs`
- Do not modify: generated HTML under `outputs/` or `dist/`

**Interfaces:**
- Consumes: Tasks 1–2 的 B2 CSS 和页面验证。
- Produces: 可审查的全量门禁结果、部署包结果与干净的 tracked 工作区。

- [ ] **Step 1: 运行完整本地门禁**

```bash
npm run verify
```

Expected: 数据验证、30项人物时间轴单测、variants unit、legacy museum、正式人物馆、A/B/B2/C variants 页面和六页双击回归全部 exit `0`。

- [ ] **Step 2: 运行部署构建与验证**

```bash
npm run build:deploy
npm run verify:deploy
```

Expected: 两条命令 exit `0`；B2 预览页存在且带 `noindex,nofollow`；正式 `people.html` 保持可索引；broken links 为 `0`。

- [ ] **Step 3: 最终范围审计**

```bash
git diff --check
git status --short
git diff --stat HEAD~2..HEAD
```

Expected: tracked 修改只涉及计划、B2 CSS/结构契约和专用页面验证；六张既有 PNG 仍为未跟踪文件且未进入索引。

- [ ] **Step 4: 若 Task 3 产生必要测试修正则单独提交**

```bash
git add scripts/verify_ming_people_timeline_variants_page.mjs
git diff --cached --check
git commit -m "test: verify B2 responsive starlight layout"
```

若没有额外测试修正，不创建空提交。
