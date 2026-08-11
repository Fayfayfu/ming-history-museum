import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PEOPLE_TIMELINE_VARIANTS,
  TIMELINE_VARIANT_CSS,
  renderPeopleTimelineVariantPage,
  timelineVariantClientScript,
} from './people_timeline_variants.mjs';

const base = '<html><head><title>人物馆｜步入大明数字历史博物馆</title><style>.fixture{display:block}</style></head><body class="people-page" data-people-view="timeline"><section class="people-timeline"><div class="people-view-tabs"><button id="peopleTimelineTab" data-people-view="timeline">历史长卷</button><button id="peopleTableTab" data-people-view="table">人物总表</button></div><section id="peopleTimelineView" class="people-timeline-viewport"><div class="people-timeline-canvas" style="--timeline-width:6704px"></div></section></section><script>window.sharedPeople=true</script></body></html>';

test('registry exposes five stable filenames', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PEOPLE_TIMELINE_VARIANTS).map(([key, value]) => [key, value.filename])),
    { current:'people-timeline-current.html', a:'people-timeline-a.html', b:'people-timeline-b.html', b2:'people-timeline-b2.html', c:'people-timeline-c.html' },
  );
});

test('B2 is a framed local stage and leaves B isolated', () => {
  const b = renderPeopleTimelineVariantPage(base, 'b');
  const b2 = renderPeopleTimelineVariantPage(base, 'b2');
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
  assert.doesNotMatch(base, /<meta name="robots"/);
  for (const key of Object.keys(PEOPLE_TIMELINE_VARIANTS)) {
    const html = renderPeopleTimelineVariantPage(base, key);
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
  assert.match(css, /\.people-timeline\{position:relative;display:block;margin-top:49px;padding:0 26px/);
  assert.match(css, /\.people-view-tabs\{position:absolute;left:26px;top:-43px;display:flex/);
  assert.doesNotMatch(css, /grid-template-columns:170px/);
  assert.match(css, /#peopleTimelineView \.timeline-boundary[^\n]*#efb09a/);
  assert.doesNotMatch(css, /body\[data-scroll-variant="b2"\]\[data-people-view="timeline"\]\{[^}]*background:/);
  assert.doesNotMatch(css, /scaleY|scale\(/);
});

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

test('B2 table state removes every dark stage decoration and restores normal module flow', () => {
  const css = TIMELINE_VARIANT_CSS.b2;
  assert.match(css, /data-people-view="table"[^\n]*\.people-timeline\{[^}]*display:block[^}]*padding:0[^}]*background:transparent/);
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
