# 人物馆历史长卷 A/B/C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 不替换正式 people.html，冻结当前长卷，并生成可独立预览、逐版验收的 current、A、B、C 四个页面。

**Architecture:** people_timeline.mjs 继续独占人物数据、年份布局、头像加载和人物交互；新增 people_timeline_variants.mjs，只负责四个预览页的外壳、样式和版本控制器。build_ming_museum.mjs 只生成一次正式人物馆 HTML，再派生四页，避免人物数据和布局逻辑分叉。

**Tech Stack:** Node.js ES modules、静态 HTML/CSS/JavaScript、Node test、Playwright/Google Chrome、现有 museum/deploy 构建。

## Global Constraints

- 正式 people.html 在最终选版前不接入 A/B/C。
- 生成 people-timeline-current.html、people-timeline-a.html、people-timeline-b.html、people-timeline-c.html。
- 四版共享 163 人、严格年份比例、泳道、头像、抽屉和 no-JS 回退。
- 画布总高度不超过 1000px。
- A 只验证克制型画轴；B 只验证沉浸观卷台；C 以 A 的明亮结构验证开卷仪式，不叠加 B 暗色舞台。
- C 开卷 800ms；reduce-motion、Escape、跳过或脚本异常直接显示完整长卷。
- 不加入声音、旁白、背景音乐、粒子或持续装饰动画。
- 每版完成后停止给用户预览；看过 A 前不开始 B，看过 B 前不开始 C。
- 所有生产改动测试先行，先观察 RED，再写最小实现。

## File Map

- Create: scripts/lib/people_timeline_variants.mjs — 配置、CSS、外壳、拖拽和开卷控制器。
- Create: scripts/lib/people_timeline_variants.test.mjs — 派生契约和语义单测。
- Create: scripts/verify_ming_people_timeline_variants_page.mjs — 四页 Playwright 行为、几何和截图。
- Modify: scripts/build_ming_museum.mjs — 同一 peopleHallHtml 写正式页和四个预览页。
- Modify: scripts/verify_vercel_bundle.mjs — 四页进入部署验证。
- Modify: package.json — variants unit/page 接入默认 verify。
- Create after review: docs/superpowers/reviews/2026-08-11-people-timeline-variant-{a,b,c}.md。

---

### Task 1: 冻结当前版并建立四版派生契约

**Interfaces:**
- Consumes: baseHall('people'): string。
- Produces: PEOPLE_TIMELINE_VARIANTS 和 renderPeopleTimelineVariantPage(baseHtml, variant)。
- Produces: 四个 people-timeline-*.html。

- [ ] **Step 1: 记录恢复基线**

~~~bash
git rev-parse --verify dace80b
git tag -a people-timeline-current-2026-08-11 dace80b -m "Current people timeline before scroll variants"
git show --no-patch --oneline people-timeline-current-2026-08-11
~~~

预期标签指向 dace80b。标签已存在时只验证，不强制移动。

- [ ] **Step 2: 写失败测试**

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PEOPLE_TIMELINE_VARIANTS, renderPeopleTimelineVariantPage } from './people_timeline_variants.mjs';

const base = '<html><head><title>人物馆｜步入大明数字历史博物馆</title></head><body class="people-page"><section class="people-timeline"><section id="peopleTimelineView" class="people-timeline-viewport"><div class="people-timeline-canvas" style="--timeline-width:6704px"></div></section></section><script>window.sharedPeople=true</script></body></html>';

test('registry exposes four stable filenames', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PEOPLE_TIMELINE_VARIANTS).map(([key, value]) => [key, value.filename])),
    { current:'people-timeline-current.html', a:'people-timeline-a.html', b:'people-timeline-b.html', c:'people-timeline-c.html' },
  );
});

test('renderer preserves shared markup and isolates semantics', () => {
  const pages = Object.fromEntries(['current','a','b','c'].map(key => [key, renderPeopleTimelineVariantPage(base, key)]));
  for (const [key, html] of Object.entries(pages)) {
    assert.match(html, new RegExp('data-scroll-variant="' + key + '"'));
    assert.match(html, /id="peopleTimelineView"/);
    assert.match(html, /window\.sharedPeople=true/);
  }
  assert.doesNotMatch(pages.current, /data-scroll-ritual/);
  assert.match(pages.a, /data-scroll-drag-surface/);
  assert.match(pages.a, /data-scroll-prologue/);
  assert.match(pages.a, /data-scroll-epilogue/);
  assert.match(pages.b, /data-scroll-stage="immersive"/);
  assert.match(pages.b, /data-scroll-roller="start"/);
  assert.match(pages.b, /data-scroll-roller="end"/);
  assert.match(pages.c, /data-scroll-ritual/);
  assert.doesNotMatch(base, /data-scroll-variant/);
});

test('unknown variant fails closed', () => {
  assert.throws(() => renderPeopleTimelineVariantPage(base, 'unknown'), /Unknown people timeline variant/);
});
~~~

- [ ] **Step 3: 运行 RED**

~~~bash
node --test scripts/lib/people_timeline_variants.test.mjs
~~~

预期 FAIL：模块或导出不存在。

- [ ] **Step 4: 写最小模块**

~~~js
const KEYS = ['current','a','b','c'];
export const PEOPLE_TIMELINE_VARIANTS = Object.freeze(Object.fromEntries(KEYS.map(key => [key, Object.freeze({
  key,
  filename: 'people-timeline-' + key + '.html',
  title: '人物馆历史长卷 ' + (key === 'current' ? '当前版' : key.toUpperCase() + '版') + '｜步入大明',
})])));

export function renderPeopleTimelineVariantPage(baseHtml, variant) {
  const config = PEOPLE_TIMELINE_VARIANTS[variant];
  if (!config) throw new Error('Unknown people timeline variant: ' + variant);
  let html = baseHtml
    .replace('<title>人物馆｜步入大明数字历史博物馆</title>', '<title>' + config.title + '</title>')
    .replace('<body class="people-page"', '<body class="people-page" data-scroll-variant="' + variant + '"');
  if (['a','b','c'].includes(variant)) {
    html = html.replace('id="peopleTimelineView" class="people-timeline-viewport"', 'id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface');
  }
  if (variant === 'b') html = html.replace('class="people-timeline"', 'class="people-timeline" data-scroll-stage="immersive"');
  if (variant === 'b') html = html.replace('<section id="peopleTimelineView"', '<i data-scroll-roller="start" aria-hidden="true"></i><i data-scroll-roller="end" aria-hidden="true"></i><section id="peopleTimelineView"');
  if (variant === 'a' || variant === 'c') html = html.replace(/(<div class="people-timeline-canvas"[^>]*>)/, '$1<span data-scroll-prologue aria-hidden="true">大明人物长卷</span><span data-scroll-epilogue aria-hidden="true">二百七十六年人物录</span>');
  if (variant === 'c') html = html.replace('<section id="peopleTimelineView"', '<section data-scroll-ritual hidden><h2>明朝人物历史长卷</h2><button data-scroll-unfurl>展卷</button><button data-scroll-skip>跳过</button></section><button data-scroll-replay hidden>重播开卷</button><section id="peopleTimelineView"');
  return html;
}
~~~

- [ ] **Step 5: 构建器写四页**

~~~js
const peopleHallHtml = baseHall('people');
await fs.writeFile(museum + '/people.html', peopleHallHtml, 'utf8');
for (const config of Object.values(PEOPLE_TIMELINE_VARIANTS)) {
  await fs.writeFile(museum + '/' + config.filename, renderPeopleTimelineVariantPage(peopleHallHtml, config.key), 'utf8');
}
await fs.writeFile(museum + '/events.html', baseHall('events'), 'utf8');
~~~

确保 baseHall('people') 只调用一次。

- [ ] **Step 6: package.json 增加 unit 命令并接入 verify**

~~~json
"verify:people-timeline-variants-unit": "node --test scripts/lib/people_timeline_variants.test.mjs"
~~~

- [ ] **Step 7: GREEN 与提交**

~~~bash
npm run verify:people-timeline-variants-unit
npm run build:museum
for file in current a b c; do test -f "outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people-timeline-$file.html"; done
git diff --check
git add package.json scripts/build_ming_museum.mjs scripts/lib/people_timeline_variants.mjs scripts/lib/people_timeline_variants.test.mjs
git commit -m "feat: add independent people timeline variant pages"
~~~

---

### Task 2: 实现并展示 A 版克制型画轴

**Interfaces:**
- Consumes: data-scroll-variant="a" 和 data-scroll-drag-surface。
- Produces: TIMELINE_VARIANT_CSS.a 与 timelineVariantClientScript('a')。

- [ ] **Step 1: 写 A RED**

~~~js
test('A is bright, draggable, and has no B or C shell', () => {
  assert.match(TIMELINE_VARIANT_CSS.a, /--scroll-paper:#f5f0e3/);
  assert.match(TIMELINE_VARIANT_CSS.a, /cursor:grab/);
  assert.match(timelineVariantClientScript('a'), /setPointerCapture/);
  const html = renderPeopleTimelineVariantPage(base, 'a');
  assert.doesNotMatch(html, /data-scroll-stage/);
  assert.doesNotMatch(html, /data-scroll-ritual/);
});
~~~

创建 page verifier，以 pointerdown/move/up 拖动 A；断言 scrollLeft 增加、data-dragging 清除、scrollHeight <= 1000。

- [ ] **Step 2: 运行 RED**

~~~bash
npm run verify:people-timeline-variants-unit
node scripts/verify_ming_people_timeline_variants_page.mjs
~~~

- [ ] **Step 3: 写 A CSS**

~~~css
body[data-scroll-variant="a"]{--scroll-paper:#f5f0e3;background:#e7deca}
body[data-scroll-variant="a"] .people-timeline{padding:10px 20px 14px;background:linear-gradient(90deg,#d1bd91 0 12px,#efe5cf 12px calc(100% - 12px),#d1bd91 calc(100% - 12px));box-shadow:0 14px 34px rgba(50,38,20,.12)}
body[data-scroll-variant="a"] .people-timeline-viewport{cursor:grab;border-color:#ad9367;background:linear-gradient(#eadcbd 0 7px,var(--scroll-paper) 7px calc(100% - 7px),#eadcbd calc(100% - 7px));box-shadow:inset 18px 0 24px -24px #4b3317,inset -18px 0 24px -24px #4b3317}
body[data-scroll-variant="a"] .people-timeline-viewport[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-scroll-variant="a"] [data-scroll-prologue],body[data-scroll-variant="a"] [data-scroll-epilogue]{position:absolute;top:18px;color:#8b6334;font:12px/1.3 "STKaiti","KaiTi",serif;writing-mode:vertical-rl;pointer-events:none}
body[data-scroll-variant="a"] [data-scroll-prologue]{left:38px}body[data-scroll-variant="a"] [data-scroll-epilogue]{right:38px}
~~~

- [ ] **Step 4: 写共享拖拽控制器**

~~~js
function mountTimelineDrag(surface) {
  let pointerId = null;
  let startX = 0;
  let startScroll = 0;
  surface.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button,a')) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScroll = surface.scrollLeft;
    surface.dataset.dragging = 'true';
    surface.setPointerCapture(pointerId);
  });
  surface.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    surface.scrollLeft = startScroll - (event.clientX - startX);
  });
  const finish = (event) => {
    if (event.pointerId !== pointerId) return;
    if (surface.hasPointerCapture(pointerId)) surface.releasePointerCapture(pointerId);
    pointerId = null;
    delete surface.dataset.dragging;
  };
  surface.addEventListener('pointerup', finish);
  surface.addEventListener('pointercancel', finish);
}
~~~

A/B/C 只调用这一份函数。

- [ ] **Step 5: A GREEN、截图和提交**

~~~bash
npm run build:museum
npm run verify:people-timeline-variants-unit
node scripts/verify_ming_people_timeline_variants_page.mjs
npm run verify:people-timeline-page
~~~

保存 人物馆_历史长卷_A版.png，提交：

~~~bash
git add scripts/lib/people_timeline_variants.mjs scripts/lib/people_timeline_variants.test.mjs scripts/verify_ming_people_timeline_variants_page.mjs
git commit -m "feat: add restrained scroll timeline variant A"
~~~

- [ ] **Step 6: 打开 A 并停止**

打开 http://127.0.0.1:56228/people-timeline-a.html。不得开始 B。用户确认后写 A review 文档并单独提交。

---

### Task 3: 实现并展示 B 版沉浸型观卷台

**Interfaces:**
- Consumes: Task 2 拖拽控制器。
- Produces: B 暗色舞台、明亮画心、次级导航和非阻塞左右遮罩。

- [ ] **Step 1: 写 B RED**

~~~js
test('B is immersive and has no ritual controls', () => {
  assert.match(TIMELINE_VARIANT_CSS.b, /--stage-ink:#171611/);
  const html = renderPeopleTimelineVariantPage(base, 'b');
  assert.match(html, /data-scroll-stage="immersive"/);
  assert.doesNotMatch(html, /data-scroll-ritual/);
});
~~~

Page verifier 断言：body 深色、画卷亮于舞台、scrollHeight <= 1000、拖拽可用、抽屉开关前后 scrollLeft 差值 <= 1、左右遮罩 pointer-events:none。

- [ ] **Step 2: 运行 RED**

~~~bash
npm run build:museum
npm run verify:people-timeline-variants-unit
node scripts/verify_ming_people_timeline_variants_page.mjs
~~~

- [ ] **Step 3: 写 B CSS**

~~~css
body[data-scroll-variant="b"]{--stage-ink:#171611;min-height:100vh;background:radial-gradient(circle at 50% 48%,#383226 0,#211f19 42%,var(--stage-ink) 100%);color:#eee6d3}
body[data-scroll-variant="b"] .museum-nav{min-height:54px;height:54px;background:rgba(17,16,13,.9)}
body[data-scroll-variant="b"] .people-timeline{position:relative;padding:18px 34px 24px}
body[data-scroll-variant="b"] .people-timeline-viewport{cursor:grab;border:10px solid #9a7741;border-width:10px 16px;background:#f5f0e3;box-shadow:0 24px 60px rgba(0,0,0,.42)}
body[data-scroll-variant="b"] .people-timeline:before,body[data-scroll-variant="b"] .people-timeline:after{content:"";position:absolute;z-index:8;top:56px;bottom:36px;width:42px;pointer-events:none}
body[data-scroll-variant="b"] .people-timeline:before{left:30px;background:linear-gradient(90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b"] .people-timeline:after{right:30px;background:linear-gradient(-90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b"] [data-scroll-roller]{position:absolute;z-index:9;top:52px;bottom:32px;width:12px;border-radius:8px;background:linear-gradient(90deg,#4a2e13,#b18448 45%,#3b240f);box-shadow:0 0 0 1px #241609,0 8px 18px rgba(0,0,0,.38);pointer-events:none}
body[data-scroll-variant="b"] [data-scroll-roller="start"]{left:24px}body[data-scroll-variant="b"] [data-scroll-roller="end"]{right:24px}
~~~

- [ ] **Step 4: B GREEN、截图、提交和停止**

~~~bash
npm run build:museum
npm run verify:people-timeline-variants-unit
node scripts/verify_ming_people_timeline_variants_page.mjs
npm run verify:people-timeline-page
git add scripts/lib/people_timeline_variants.mjs scripts/lib/people_timeline_variants.test.mjs scripts/verify_ming_people_timeline_variants_page.mjs
git commit -m "feat: add immersive scroll timeline variant B"
~~~

保存 人物馆_历史长卷_B版.png，打开 http://127.0.0.1:56228/people-timeline-b.html，保留 A，并停止等待用户。

---

### Task 4: 实现并展示 C 版仪式型开卷

**Interfaces:**
- Consumes: A 明亮画卷 CSS 和共享拖拽。
- Produces: data-ritual-state="closed|opening|open"、展卷/跳过/重播和 800ms 动画。

- [ ] **Step 1: 写 C RED**

~~~js
test('C exposes an accessible 800ms ritual that degrades to open', () => {
  const html = renderPeopleTimelineVariantPage(base, 'c');
  assert.match(html, /data-scroll-unfurl/);
  assert.match(html, /data-scroll-skip/);
  assert.match(html, /data-scroll-replay/);
  assert.match(timelineVariantClientScript('c'), /800/);
  assert.match(timelineVariantClientScript('c'), /prefers-reduced-motion: reduce/);
});
~~~

Page verifier：清 sessionStorage 后初态 closed 且展卷获焦；点击后 opening；1200ms 内 open；重播再次 opening；Escape/skip 立即 open；reduce-motion 直接 open；禁用 JS 不出现收拢遮罩。

- [ ] **Step 2: 运行 RED**

~~~bash
npm run build:museum
npm run verify:people-timeline-variants-unit
node scripts/verify_ming_people_timeline_variants_page.mjs
~~~

- [ ] **Step 3: 写 C CSS**

~~~css
body[data-scroll-variant="c"]{--scroll-paper:#f5f0e3;background:#e7deca}
body[data-scroll-variant="c"] .people-timeline{padding:10px 20px 14px;background:#efe5cf;overflow:hidden}
body[data-scroll-variant="c"] [data-scroll-prologue],body[data-scroll-variant="c"] [data-scroll-epilogue]{position:absolute;top:18px;color:#8b6334;font:12px/1.3 "STKaiti","KaiTi",serif;writing-mode:vertical-rl;pointer-events:none}
body[data-scroll-variant="c"] [data-scroll-prologue]{left:38px}body[data-scroll-variant="c"] [data-scroll-epilogue]{right:38px}
body[data-scroll-variant="c"] .scroll-ritual{position:relative}body[data-scroll-variant="c"] .scroll-ritual:before,body[data-scroll-variant="c"] .scroll-ritual:after{content:"";position:absolute;top:0;bottom:0;width:14px;border-radius:8px;background:linear-gradient(90deg,#4a2e13,#b18448 45%,#3b240f)}
body[data-scroll-variant="c"] .scroll-ritual:before{left:calc(50% - 19px)}body[data-scroll-variant="c"] .scroll-ritual:after{right:calc(50% - 19px)}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="closed"] #peopleTimelineView{clip-path:inset(0 49%);opacity:0}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="opening"] #peopleTimelineView{animation:unfurlTimeline 800ms cubic-bezier(.22,.75,.25,1) both}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="open"] #peopleTimelineView{clip-path:inset(0);opacity:1}
@keyframes unfurlTimeline{from{clip-path:inset(0 49%);opacity:.35}to{clip-path:inset(0);opacity:1}}
@media(prefers-reduced-motion:reduce){body[data-scroll-variant="c"] #peopleTimelineView{animation:none!important;clip-path:inset(0)!important;opacity:1!important}}
~~~

- [ ] **Step 4: 写状态机**

~~~js
const body = document.body;
const ritual = document.querySelector('[data-scroll-ritual]');
const unfurl = document.querySelector('[data-scroll-unfurl]');
const skip = document.querySelector('[data-scroll-skip]');
const replay = document.querySelector('[data-scroll-replay]');
const storageKey = 'ming.peopleTimelineC.opened';
let timer = 0;
const finish = () => {
  clearTimeout(timer);
  body.dataset.ritualState = 'open';
  ritual.hidden = true;
  replay.hidden = false;
  sessionStorage.setItem(storageKey, '1');
};
const open = () => {
  clearTimeout(timer);
  body.dataset.ritualState = 'opening';
  ritual.hidden = true;
  replay.hidden = true;
  timer = setTimeout(finish, 800);
};
body.classList.add('ritual-enhanced');
if (matchMedia('(prefers-reduced-motion: reduce)').matches || sessionStorage.getItem(storageKey) === '1') finish();
else {
  body.dataset.ritualState = 'closed';
  ritual.hidden = false;
  replay.hidden = true;
  unfurl.focus();
}
unfurl.addEventListener('click', open);
skip.addEventListener('click', finish);
replay.addEventListener('click', () => {
  body.dataset.ritualState = 'closed';
  ritual.hidden = false;
  replay.hidden = true;
  requestAnimationFrame(open);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && body.dataset.ritualState !== 'open') finish();
});
~~~

脚本成功后才添加 ritual-enhanced；脚本失败前完整长卷默认可见。

- [ ] **Step 5: C GREEN、三态截图、提交和停止**

~~~bash
npm run build:museum
npm run verify:people-timeline-variants-unit
node scripts/verify_ming_people_timeline_variants_page.mjs
npm run verify:people-timeline-page
git add scripts/lib/people_timeline_variants.mjs scripts/lib/people_timeline_variants.test.mjs scripts/verify_ming_people_timeline_variants_page.mjs
git commit -m "feat: add ritual scroll timeline variant C"
~~~

保存 C版_收拢.png、C版_展开中.png、C版_展开后.png；打开 http://127.0.0.1:56228/people-timeline-c.html，保留 A/B，停止等待用户。

---

### Task 5: 四版共同回归与部署包交付

**Interfaces:**
- Consumes: current/A/B/C 四页。
- Produces: 默认 verify 的四版 E2E；包含四页的 dist/，正式导航不链接这些页面。

- [ ] **Step 1: 写共同 RED**

~~~js
const shared = await page.evaluate(() => {
  const people = [...document.querySelectorAll('[data-timeline-person]')];
  const canvas = document.querySelector('.people-timeline-canvas');
  const viewport = document.querySelector('#peopleTimelineView');
  return {
    variant: document.body.dataset.scrollVariant || '',
    people: people.length,
    unique: new Set(people.map((node) => node.dataset.timelinePerson)).size,
    emperors: document.querySelectorAll('[data-lane="emperor"]').length,
    height: canvas.getBoundingClientRect().height,
    width: canvas.getBoundingClientRect().width,
    bodyOverflow: document.body.scrollWidth - innerWidth,
    scrollable: viewport.scrollWidth > viewport.clientWidth,
  };
});
~~~

断言四版均 163 人、163 唯一、16 皇帝、高度 <= 1000、宽度一致。比较正式 people.html 与 current 的全部 163 个 data-timeline-person，逐人断言 x、y、头像尺寸差值均 <= 0.01px。正式 people.html 无 data-scroll-variant 和 ritual 控制。1440/768/390 下 body 不溢出且 timeline 可横滚。

在每个视口滚动前后，等待可见 data-timeline-image 全部同时满足 naturalWidth > 0 与 is-paint-ready；失败列表必须为空。另建 JavaScript 禁用的 context，断言四版人物总表 163 行可见、历史长卷隐藏，C 不残留收拢遮罩或不可操作按钮。

- [ ] **Step 2: 运行 RED**

~~~bash
npm run verify
npm run build:deploy
npm run verify:deploy
~~~

预期 variants page 尚未进入默认门禁或 deploy 清单不含四页。

- [ ] **Step 3: 接入默认门禁**

package.json 增加：

~~~json
"verify:people-timeline-variants-page": "node scripts/verify_ming_people_timeline_variants_page.mjs"
~~~

默认 verify 最后追加 npm run verify:people-timeline-variants-page。

- [ ] **Step 4: deploy verifier 纳入四页**

files 数组增加四个 people-timeline-*.html；保留 data-src 主动加载，避免延迟头像误判坏图。

- [ ] **Step 5: 完整 GREEN**

~~~bash
npm run build:museum
npm run verify
npm run build:deploy
npm run verify:deploy
git diff --check
~~~

预期数据、现有 timeline、variants unit/page、legacy museum 全通过；deploy 四页 broken:0、errors:[]、pass:true；正式 people.html 无版本外壳。

- [ ] **Step 6: 四页交付并等待最终选版**

保留 current/A/B/C 四个浏览器页面，不切换正式 people.html。报告每版人数、画布高度、坏图数和交互结果。

- [ ] **Step 7: 提交共同门禁**

~~~bash
git add package.json scripts/verify_ming_people_timeline_variants_page.mjs scripts/verify_vercel_bundle.mjs
git commit -m "test: verify all people timeline scroll variants"
~~~

## Final Self-Review Checklist

- [ ] current/A/B/C 四个 URL 都有构建任务。
- [ ] A 无暗舞台/仪式，B 无仪式，C 无暗舞台。
- [ ] current 与正式 people.html 独立，选版前不覆盖。
- [ ] 人物、年份、泳道、头像解码、抽屉和 no-JS 有共同门禁。
- [ ] A 拖拽清理、B 抽屉位置、C skip/Escape/reduce-motion/脚本失败有页面测试。
- [ ] 1440/768/390 都验收 body 不溢出、timeline 可横滚。
- [ ] 每版暂停给用户预览，不跳过反馈。
