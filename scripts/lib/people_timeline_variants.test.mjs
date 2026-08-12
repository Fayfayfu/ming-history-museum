import test from 'node:test';
import assert from 'node:assert/strict';
import * as variantModule from './people_timeline_variants.mjs';
import {
  PEOPLE_TIMELINE_VARIANTS,
  TIMELINE_VARIANT_CSS,
  renderPeopleTimelineFormalPage,
  renderPeopleTimelineVariantPage,
  timelineVariantClientScript,
} from './people_timeline_variants.mjs';

const base = '<html><head><title>人物馆｜步入大明数字历史博物馆</title><style>.fixture{display:block}</style></head><body class="people-page" data-people-view="timeline"><section class="people-timeline"><div class="people-view-tabs"><button id="peopleTimelineTab" data-people-view="timeline">历史长卷</button><button id="peopleTableTab" data-people-view="table">人物总表</button></div><section id="peopleTimelineView" class="people-timeline-viewport"><div class="people-timeline-canvas" style="--timeline-width:6704px"></div></section></section><script>window.sharedPeople=true</script></body></html>';

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

const rectanglesOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

test('B2 deterministically places small starlight outside historical content', () => {
  assert.equal(typeof variantModule.buildB2AmbientStars, 'function');
  assert.equal(typeof variantModule.renderB2AmbientMarkup, 'function');
  const first = variantModule.buildB2AmbientStars(timelineBase);
  const second = variantModule.buildB2AmbientStars(timelineBase);
  assert.deepEqual(first, second);
  assert.ok(first.length >= 40 && first.length <= 50);
  assert.ok(first.every(({ x, y }) => x >= 159 && x <= 6695 && y >= 13.5 && y <= 978.5));
  assert.equal(new Set(first.map(({ variant }) => variant)).size, 3);
  assert.ok(first.every(({ variant }) => [1, 2, 3].includes(variant)));
  assert.ok(first.every(({ duration }) => duration >= 3.8 && duration <= 8.5));
  assert.ok(first.every(({ duration, delay }) => delay < 0 && Math.abs(delay) < duration));
  assert.ok(first.every(({ peak }) => peak >= 0.42 && peak <= 0.68));

  const people = [
    { x:492, y:307.68, avatarSize:88 },
    { x:1152, y:562.43, avatarSize:56 },
    { x:1820, y:895.70, avatarSize:56 },
  ];
  const personRects = people.map(({ x, y, avatarSize }) => ({
    left:x - (Math.max(avatarSize / 2, 58) + 14),
    right:x + (Math.max(avatarSize / 2, 58) + 14),
    top:y - avatarSize / 2 - 14,
    bottom:y + avatarSize / 2 + 52,
  }));
  const guideRects = people.map(({ x, y }) => ({ left:x - 5, right:x + 5, top:Math.min(y, 391.68), bottom:Math.max(y, 391.68) }));
  const forbidden = [
    ...personRects,
    ...guideRects,
    { left:0, right:6704, top:391.68 - 14, bottom:391.68 + 14 },
    { left:360 - 12, right:360 + 12, top:391.68 - 26, bottom:391.68 + 26 },
    { left:0, right:150, top:0, bottom:992.48 },
  ];
  assert.ok(first.every(({ x, y }) => !forbidden.some((rect) => rectanglesOverlap(
    { left:x - 9, right:x + 9, top:y - 13.5, bottom:y + 13.5 },
    rect,
  ))));

  const markup = variantModule.renderB2AmbientMarkup(timelineBase);
  assert.equal((markup.match(/data-b2-star=/g) || []).length, first.length);
  assert.match(markup, /data-b2-ambient aria-hidden="true"/);
  assert.match(markup, /--star-x:[\d.]+px;--star-y:[\d.]+px;--star-duration:[\d.]+s;--star-delay:-[\d.]+s/);
});

test('registry exposes five stable filenames', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PEOPLE_TIMELINE_VARIANTS).map(([key, value]) => [key, value.filename])),
    { current:'people-timeline-current.html', a:'people-timeline-a.html', b:'people-timeline-b.html', b2:'people-timeline-b2.html', c:'people-timeline-c.html' },
  );
});

test('B2 is a framed local stage and leaves B isolated', () => {
  const b = renderPeopleTimelineVariantPage(base, 'b');
  const b2 = renderPeopleTimelineVariantPage(timelineBase, 'b2');
  assert.equal(PEOPLE_TIMELINE_VARIANTS.b2.filename, 'people-timeline-b2.html');
  assert.match(b2, /data-scroll-variant="b2"/);
  assert.match(b2, /data-scroll-stage="framed"/);
  assert.match(b2, /data-scroll-drag-surface/);
  assert.equal((b2.match(/<i data-scroll-roller=/g) || []).length, 2);
  assert.doesNotMatch(b2, /data-scroll-stage="immersive"/);
  assert.match(b, /data-scroll-stage="immersive"/);
  assert.doesNotMatch(b, /data-scroll-variant="b2"/);
});

test('all five preview pages are noindex while the formal source stays indexable', () => {
  const formal = renderPeopleTimelineFormalPage(timelineBase, 'b2');
  assert.doesNotMatch(formal, /<meta name="robots"/);
  assert.match(formal, /<title>人物馆｜步入大明数字历史博物馆<\/title>/);
  assert.match(formal, /data-scroll-variant="b2"/);
  assert.match(formal, /data-scroll-stage="framed"/);
  assert.match(formal, /data-scroll-drag-surface/);
  assert.match(formal, /data-b2-ambient/);
  for (const key of Object.keys(PEOPLE_TIMELINE_VARIANTS)) {
    const html = renderPeopleTimelineVariantPage(key === 'b2' ? timelineBase : base, key);
    assert.equal((html.match(/<meta name="robots" content="noindex,nofollow">/g) || []).length, 1, key);
  }
});

test('renderer injects variant CSS into a real style element and fails when a required sentinel is absent', () => {
  const a = renderPeopleTimelineVariantPage(base, 'a');
  assert.match(a, /<style>\.fixture\{display:block\}[\s\S]*--scroll-paper:#f5f0e3[\s\S]*<\/style>/);
  assert.throws(
    () => renderPeopleTimelineVariantPage(base.replace('<style>.fixture{display:block}</style>', ''), 'a'),
    /required replacement.*style/i,
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

test('A is bright, draggable, and has no B or C shell', () => {
  assert.match(TIMELINE_VARIANT_CSS.a, /--scroll-paper:#f5f0e3/);
  assert.match(TIMELINE_VARIANT_CSS.a, /cursor:grab/);
  assert.match(timelineVariantClientScript('a'), /setPointerCapture/);
  const html = renderPeopleTimelineVariantPage(base, 'a');
  assert.doesNotMatch(html, /data-scroll-stage/);
  assert.doesNotMatch(html, /data-scroll-ritual/);
});

test('B is immersive and has no ritual controls', () => {
  assert.match(TIMELINE_VARIANT_CSS.b, /--stage-ink:#171611/);
  const html = renderPeopleTimelineVariantPage(base, 'b');
  assert.match(html, /data-scroll-stage="immersive"/);
  assert.doesNotMatch(html, /data-scroll-ritual/);
});

test('B2 scopes darkness to the framed timeline without scaling portraits', () => {
  const css = TIMELINE_VARIANT_CSS.b2;
  assert.match(css, /body\[data-scroll-variant="b2"\] #peopleTimelineView/);
  assert.match(css, /--b2-stage-ink:#171611/);
  assert.match(css, /cursor:grab/);
  assert.match(css, /pointer-events:none/);
  assert.match(css, /body\[data-scroll-variant="b2"\] \.people-timeline\{position:relative;display:block;margin-top:49px;padding:0/);
  assert.match(css, /body\[data-scroll-variant="b2"\] \.people-view-tabs\{position:absolute;left:0;top:-43px;display:flex/);
  assert.doesNotMatch(css, /padding:0 26px|left:26px|right:26px|padding:0 12px|left:12px|right:12px/);
  assert.doesNotMatch(css, /grid-template-columns:170px/);
  assert.match(css, /\[data-b2-ambient\]\{[^}]*position:absolute[^}]*inset:0[^}]*pointer-events:none/);
  assert.match(css, /\.b2-star\{[^}]*width:18px[^}]*height:27px[^}]*pointer-events:none/);
  assert.match(css, /\.b2-star:before\{[^}]*width:18px[^}]*height:1px/);
  assert.match(css, /\.b2-star:after\{[^}]*width:1px[^}]*height:27px/);
  assert.match(css, /animation-duration:var\(--star-duration\)/);
  assert.match(css, /animation-delay:var\(--star-delay\)/);
  assert.match(css, /b2Twinkle1/);
  assert.match(css, /b2Twinkle2/);
  assert.match(css, /b2Twinkle3/);
  assert.doesNotMatch(css, /b2GlowA|b2GlowB|animation:[^;]* 6s|animation:[^;]* 8s/);
  assert.doesNotMatch(css, /radial-gradient\(circle at 12% 23%|radial-gradient\(circle at 67% 61%|radial-gradient\(circle at 38% 76%/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.b2-star\{animation:none/);
  assert.match(css, /#peopleTimelineView \.timeline-boundary[^\n]*#efb09a/);
  assert.match(css, /\.timeline-person\.is-selected \.timeline-person-guide[^\n]*#efb09a/);
  assert.doesNotMatch(css, /body\[data-scroll-variant="b2"\]\[data-people-view="timeline"\]\{[^}]*background:/);
  assert.doesNotMatch(css, /scaleY|scale\(/);
});

test('B2 alone renders one inaccessible ambient layer inside the timeline canvas', () => {
  const pages = Object.fromEntries(
    ['current', 'a', 'b', 'b2', 'c'].map((key) => [key, renderPeopleTimelineVariantPage(key === 'b2' ? timelineBase : base, key)]),
  );
  assert.equal((pages.b2.match(/data-b2-ambient aria-hidden="true"/g) || []).length, 1);
  assert.ok((pages.b2.match(/data-b2-star=/g) || []).length >= 40);
  assert.match(
    pages.b2,
    /<div class="people-timeline-canvas"[^>]*><span class="b2-ambient" data-b2-ambient aria-hidden="true"><i class="b2-star/,
  );
  for (const key of ['current', 'a', 'b', 'c']) assert.doesNotMatch(pages[key], /data-b2-ambient/, key);
});

test('B2 table state removes every dark stage decoration and restores normal module flow', () => {
  const css = TIMELINE_VARIANT_CSS.b2;
  assert.match(css, /body\[data-scroll-variant="b2"\] \.people-timeline\{[^}]*display:block[^}]*padding:0[^}]*background:transparent/);
  assert.match(css, /data-people-view="table"[^\n]*\.people-timeline\{height:0/);
  assert.match(css, /data-people-view="table"[^\n]*\[data-scroll-roller\]\{display:none/);
  assert.match(css, /data-people-view="table"[^\n]*\.people-timeline:before[^\n]*content:none/);
});

test('A and B reflow controls beside an unscaled complete timeline module', () => {
  for (const key of ['a', 'b']) {
    const css = TIMELINE_VARIANT_CSS[key];
    assert.match(css, /data-people-view="timeline"[^\n]*\.people-timeline\{[^}]*display:grid[^}]*grid-template-columns:/, key);
    assert.match(css, /data-people-view="timeline"[^\n]*\.people-view-tabs\{[^}]*grid-column:1/, key);
    assert.doesNotMatch(css, /scaleY|scale\(/, key);
  }
});

test('C exposes an accessible 800ms ritual that degrades to open', () => {
  const html = renderPeopleTimelineVariantPage(base, 'c');
  assert.match(html, /data-scroll-unfurl/);
  assert.match(html, /data-scroll-skip/);
  assert.match(html, /data-scroll-replay/);
  assert.match(timelineVariantClientScript('c'), /800/);
  assert.match(timelineVariantClientScript('c'), /prefers-reduced-motion: reduce/);
  assert.match(TIMELINE_VARIANT_CSS.c, /unfurlRollerStart 800ms/);
  assert.match(TIMELINE_VARIANT_CSS.c, /unfurlRollerEnd 800ms/);
  assert.doesNotMatch(TIMELINE_VARIANT_CSS.c, /scaleY|scale\(/);
  assert.match(timelineVariantClientScript('c'), /ritual\.hidden = false/);
});

test('C emits a syntactically executable client script', () => {
  assert.doesNotThrow(() => new Function(timelineVariantClientScript('c')));
});
