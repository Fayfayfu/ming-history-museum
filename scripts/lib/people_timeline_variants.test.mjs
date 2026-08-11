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
