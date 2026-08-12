const KEYS = ['current', 'a', 'b', 'b2', 'c'];

export const TIMELINE_VARIANT_CSS = Object.freeze({
  a: `body[data-scroll-variant="a"]{--scroll-paper:#f5f0e3;background:#e7deca}
body[data-scroll-variant="a"][data-people-view="timeline"] .people-timeline{display:grid;grid-template-columns:150px minmax(0,1fr);padding:0 20px;background:linear-gradient(90deg,#d1bd91 0 12px,#efe5cf 12px calc(100% - 12px),#d1bd91 calc(100% - 12px));box-shadow:0 14px 34px rgba(50,38,20,.12)}
body[data-scroll-variant="a"][data-people-view="timeline"] .people-view-tabs{grid-column:1;grid-row:1;display:grid;align-content:start;gap:8px;margin:0;padding:14px 10px;z-index:10}
body[data-scroll-variant="a"][data-people-view="timeline"] .people-timeline-viewport{grid-column:2;grid-row:1;cursor:grab;border-color:#ad9367;background:linear-gradient(#eadcbd 0 7px,var(--scroll-paper) 7px calc(100% - 7px),#eadcbd calc(100% - 7px));box-shadow:inset 18px 0 24px -24px #4b3317,inset -18px 0 24px -24px #4b3317}
body[data-scroll-variant="a"] .people-timeline-viewport[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-scroll-variant="a"] [data-scroll-prologue],body[data-scroll-variant="a"] [data-scroll-epilogue]{position:absolute;top:18px;color:#8b6334;font:12px/1.3 "STKaiti","KaiTi",serif;writing-mode:vertical-rl;pointer-events:none}
body[data-scroll-variant="a"] [data-scroll-prologue]{left:38px}body[data-scroll-variant="a"] [data-scroll-epilogue]{right:38px}
@media(max-width:600px){body[data-scroll-variant="a"][data-people-view="timeline"] .people-timeline{grid-template-columns:100px minmax(0,1fr);padding:0 12px}body[data-scroll-variant="a"][data-people-view="timeline"] .people-view-tabs{padding:10px 6px}}`,
  b: `body[data-scroll-variant="b"][data-people-view="timeline"]{--stage-ink:#171611;min-height:100vh;background:radial-gradient(circle at 50% 48%,#383226 0,#211f19 42%,var(--stage-ink) 100%);color:#eee6d3}
body[data-scroll-variant="b"] .museum-nav{min-height:54px;height:54px;background:rgba(17,16,13,.9)}
body[data-scroll-variant="b"][data-people-view="timeline"] .people-timeline{position:relative;display:grid;grid-template-columns:170px minmax(0,1fr);padding:0 34px}
body[data-scroll-variant="b"][data-people-view="timeline"] .people-view-tabs{grid-column:1;grid-row:1;display:grid;align-content:start;gap:8px;margin:0;padding:14px 10px;z-index:10}
body[data-scroll-variant="b"][data-people-view="timeline"] .people-timeline-viewport{grid-column:2;grid-row:1;cursor:grab;border:3px solid #9a7741;border-width:3px 16px;background:#f5f0e3;box-shadow:0 24px 60px rgba(0,0,0,.42)}
body[data-scroll-variant="b"][data-people-view="timeline"] .people-timeline:before,body[data-scroll-variant="b"][data-people-view="timeline"] .people-timeline:after{content:"";position:relative;grid-column:2;grid-row:1;z-index:8;align-self:stretch;width:42px;pointer-events:none}
body[data-scroll-variant="b"][data-people-view="timeline"] .people-timeline:before{justify-self:start;background:linear-gradient(90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b"][data-people-view="timeline"] .people-timeline:after{justify-self:end;background:linear-gradient(-90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b"][data-people-view="timeline"] [data-scroll-roller]{position:relative;grid-column:2;grid-row:1;z-index:9;align-self:stretch;width:12px;border-radius:8px;background:linear-gradient(90deg,#4a2e13,#b18448 45%,#3b240f);box-shadow:0 0 0 1px #241609,0 8px 18px rgba(0,0,0,.38);pointer-events:none}
body[data-scroll-variant="b"][data-people-view="timeline"] [data-scroll-roller="start"]{justify-self:start}body[data-scroll-variant="b"][data-people-view="timeline"] [data-scroll-roller="end"]{justify-self:end}
body[data-scroll-variant="b"][data-people-view="table"] [data-scroll-roller]{display:none}body[data-scroll-variant="b"][data-people-view="table"] .people-timeline:before,body[data-scroll-variant="b"][data-people-view="table"] .people-timeline:after{content:none;background:none}
body[data-scroll-variant="b"][data-people-view="timeline"] .lede{color:#eee6d3}body[data-scroll-variant="b"][data-people-view="timeline"] .scope{color:#c9bfa9}body[data-scroll-variant="b"][data-people-view="timeline"] .scope b{color:#f5f0e3}body[data-scroll-variant="b"][data-people-view="timeline"] .mast h1 small{color:#c9bfa9}
body[data-scroll-variant="b"][data-people-view="timeline"] .stat{background:#f5f0e3;color:#171611}body[data-scroll-variant="b"][data-people-view="timeline"] .stat span{color:#625d50}body[data-scroll-variant="b"][data-people-view="timeline"] .stat strong{color:#171611}body[data-scroll-variant="b"][data-people-view="timeline"] .stat:nth-child(1) strong,body[data-scroll-variant="b"][data-people-view="timeline"] .stat:last-child strong{color:#9c2f23}
body[data-scroll-variant="b"] .drawer .panel{color:var(--ink)}
@media(max-width:600px){body[data-scroll-variant="b"][data-people-view="timeline"] .people-timeline{grid-template-columns:100px minmax(0,1fr);padding:0 12px}body[data-scroll-variant="b"][data-people-view="timeline"] .people-view-tabs{padding:10px 6px}}`,
  b2: `body[data-scroll-variant="b2"] .people-timeline{position:relative;display:block;margin-top:49px;padding:0;background:transparent}
body[data-scroll-variant="b2"] .people-view-tabs{position:absolute;left:0;top:-43px;display:flex;gap:8px;margin:0;padding:0;z-index:10}
body[data-scroll-variant="b2"][data-people-view="timeline"] #peopleTimelineView{--b2-stage-ink:#171611;display:block;width:100%;cursor:grab;border:1px solid #8a6a3a;outline:5px solid #c8b58d;background:radial-gradient(circle at 50% 48%,#383226 0,#211f19 42%,var(--b2-stage-ink) 100%);box-shadow:inset 16px 0 22px -18px #000,inset -16px 0 22px -18px #000,0 12px 28px rgba(50,38,20,.2);color:#eee6d3}
body[data-scroll-variant="b2"] .people-timeline-canvas{isolation:isolate}
body[data-scroll-variant="b2"] [data-b2-ambient]{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background-image:repeating-radial-gradient(ellipse at 43% 48%,rgba(246,232,195,.018) 0 .45px,transparent .8px 5px);background-size:9px 7px;background-position:0 0}
body[data-scroll-variant="b2"] .b2-star{position:absolute;left:var(--star-x);top:var(--star-y);z-index:0;width:18px;height:27px;pointer-events:none;transform:translate(-50%,-50%);opacity:.1;background:radial-gradient(circle,rgba(255,231,177,.78) 0 1px,rgba(240,199,105,.2) 2px,transparent 5px);animation-duration:var(--star-duration);animation-delay:var(--star-delay);animation-timing-function:linear;animation-iteration-count:infinite;animation-fill-mode:both}
body[data-scroll-variant="b2"] .b2-star:before,body[data-scroll-variant="b2"] .b2-star:after{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);filter:blur(.25px)}
body[data-scroll-variant="b2"] .b2-star:before{width:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(248,215,139,.72),transparent)}
body[data-scroll-variant="b2"] .b2-star:after{width:1px;height:27px;background:linear-gradient(0deg,transparent,rgba(248,215,139,.78),transparent)}
body[data-scroll-variant="b2"] .b2-star--1{animation-name:b2Twinkle1}body[data-scroll-variant="b2"] .b2-star--2{animation-name:b2Twinkle2}body[data-scroll-variant="b2"] .b2-star--3{animation-name:b2Twinkle3}
@keyframes b2Twinkle1{0%,11%,22%,100%{opacity:.1}16%{opacity:var(--star-peak)}}@keyframes b2Twinkle2{0%,42%,56%,100%{opacity:.11}49%{opacity:var(--star-peak)}}@keyframes b2Twinkle3{0%,72%,84%,100%{opacity:.09}78%{opacity:var(--star-peak)}}
@media(prefers-reduced-motion:reduce){body[data-scroll-variant="b2"] .b2-star{animation:none;opacity:.16}}
body[data-scroll-variant="b2"] #peopleTimelineView[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-scroll-variant="b2"] #peopleTimelineView .timeline-axis,body[data-scroll-variant="b2"] #peopleTimelineView .timeline-person-guide{background:rgba(238,230,211,.46)}
body[data-scroll-variant="b2"] #peopleTimelineView .timeline-person.is-selected .timeline-person-guide,body[data-scroll-variant="b2"] #peopleTimelineView .timeline-person:focus-within .timeline-person-guide{background:#efb09a}
body[data-scroll-variant="b2"] #peopleTimelineView .timeline-tick,body[data-scroll-variant="b2"] #peopleTimelineView .timeline-lane-label,body[data-scroll-variant="b2"] #peopleTimelineView .timeline-person small{color:#cfc5b0}
body[data-scroll-variant="b2"] #peopleTimelineView .timeline-boundary,body[data-scroll-variant="b2"] #peopleTimelineView .timeline-boundary time{color:#efb09a}
body[data-scroll-variant="b2"] #peopleTimelineView .timeline-person strong{color:#f5f0e3}
body[data-scroll-variant="b2"][data-people-view="timeline"] .people-timeline:before,body[data-scroll-variant="b2"][data-people-view="timeline"] .people-timeline:after{content:"";position:absolute;top:0;bottom:0;z-index:8;width:34px;pointer-events:none}
body[data-scroll-variant="b2"][data-people-view="timeline"] .people-timeline:before{left:0;background:linear-gradient(90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b2"][data-people-view="timeline"] .people-timeline:after{right:0;background:linear-gradient(-90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b2"][data-people-view="timeline"] [data-scroll-roller]{position:absolute;top:0;bottom:0;z-index:9;width:12px;border-radius:8px;background:linear-gradient(90deg,#4a2e13,#b18448 45%,#3b240f);box-shadow:0 0 0 1px #241609,0 8px 18px rgba(0,0,0,.38);pointer-events:none}
body[data-scroll-variant="b2"][data-people-view="timeline"] [data-scroll-roller="start"]{left:0}body[data-scroll-variant="b2"][data-people-view="timeline"] [data-scroll-roller="end"]{right:0}
body[data-scroll-variant="b2"][data-people-view="table"] .people-timeline{height:0}
body[data-scroll-variant="b2"][data-people-view="table"] [data-scroll-roller]{display:none}
body[data-scroll-variant="b2"][data-people-view="table"] .people-timeline:before,body[data-scroll-variant="b2"][data-people-view="table"] .people-timeline:after{content:none;background:none}`,
  c: `body[data-scroll-variant="c"]{--scroll-paper:#f5f0e3;background:#e7deca}
body[data-scroll-variant="c"][data-people-view="timeline"] .people-timeline{display:grid;grid-template-columns:170px minmax(0,1fr);padding:0 20px;background:#efe5cf;overflow:hidden}
body[data-scroll-variant="c"][data-people-view="timeline"] .people-view-tabs{grid-column:1;grid-row:1;display:grid;align-content:start;gap:8px;margin:0;padding:14px 10px;z-index:5}
body[data-scroll-variant="c"][data-people-view="timeline"] .people-timeline-viewport{grid-column:2;grid-row:1;cursor:grab;border-color:#ad9367;background:linear-gradient(#eadcbd 0 7px,var(--scroll-paper) 7px calc(100% - 7px),#eadcbd calc(100% - 7px));box-shadow:inset 18px 0 24px -24px #4b3317,inset -18px 0 24px -24px #4b3317}
body[data-scroll-variant="c"] .people-timeline-viewport[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-scroll-variant="c"] [data-scroll-prologue],body[data-scroll-variant="c"] [data-scroll-epilogue]{position:absolute;top:18px;color:#8b6334;font:12px/1.3 "STKaiti","KaiTi",serif;writing-mode:vertical-rl;pointer-events:none}
body[data-scroll-variant="c"] [data-scroll-prologue]{left:38px}body[data-scroll-variant="c"] [data-scroll-epilogue]{right:38px}
body[data-scroll-variant="c"] .scroll-ritual{position:relative;grid-column:2;grid-row:1;z-index:6}body[data-scroll-variant="c"] .scroll-ritual:before,body[data-scroll-variant="c"] .scroll-ritual:after{content:"";position:absolute;top:0;bottom:0;width:14px;border-radius:8px;background:linear-gradient(90deg,#4a2e13,#b18448 45%,#3b240f)}
body[data-scroll-variant="c"] .scroll-ritual:before{left:calc(50% - 19px)}body[data-scroll-variant="c"] .scroll-ritual:after{right:calc(50% - 19px)}
body[data-scroll-variant="c"] .scroll-ritual h2{margin:62px 0 14px}body[data-scroll-variant="c"] [data-scroll-ritual] button{position:relative;z-index:1}body[data-scroll-variant="c"] [data-scroll-replay]{position:relative;grid-column:1;grid-row:1;z-index:7;align-self:start;justify-self:start;margin:108px 10px 0}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="closed"] #peopleTimelineView{clip-path:inset(0 49%);opacity:0}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="opening"] #peopleTimelineView{animation:unfurlTimeline 800ms cubic-bezier(.22,.75,.25,1) both}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="opening"] .scroll-ritual{pointer-events:none}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="opening"] .scroll-ritual h2,body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="opening"] .scroll-ritual button{visibility:hidden;opacity:0;pointer-events:none}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="opening"] .scroll-ritual:before{animation:unfurlRollerStart 800ms cubic-bezier(.22,.75,.25,1) both}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="opening"] .scroll-ritual:after{animation:unfurlRollerEnd 800ms cubic-bezier(.22,.75,.25,1) both}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="open"] #peopleTimelineView{clip-path:inset(0);opacity:1}
@keyframes unfurlTimeline{from{clip-path:inset(0 49%);opacity:.35}to{clip-path:inset(0);opacity:1}}
@keyframes unfurlRollerStart{from{left:calc(50% - 19px)}to{left:0}}
@keyframes unfurlRollerEnd{from{right:calc(50% - 19px)}to{right:0}}
@media(prefers-reduced-motion:reduce){body[data-scroll-variant="c"] #peopleTimelineView{animation:none!important;clip-path:inset(0)!important;opacity:1!important}}
@media(max-width:600px){body[data-scroll-variant="c"][data-people-view="timeline"] .people-timeline{grid-template-columns:100px minmax(0,1fr);padding:0 12px}body[data-scroll-variant="c"][data-people-view="timeline"] .people-view-tabs{padding:10px 6px}}`,
});

const B2_STAR_WIDTH = 18;
const B2_STAR_HEIGHT = 27;
const B2_STAR_X_STEP = 104;
const B2_STAR_Y_STEP = 71;
const B2_STAR_SEGMENT_WIDTH = 1341;
const B2_STARS_PER_SEGMENT = 10;

function numericCssVar(style, name) {
  const match = String(style || '').match(new RegExp(`--${name}:([\\d.]+)px`));
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
    .map((match) => numericCssVar(match[1], 'tick-x'))
    .filter(Number.isFinite);
  const laneYs = [...baseHtml.matchAll(/class="[^"]*timeline-lane-label[^"]*"[^>]*style="([^"]+)"/g)]
    .map((match) => numericCssVar(match[1], 'lane-y'))
    .filter(Number.isFinite);
  return { width, height, axisY, people, ticks, laneYs };
}

function buildB2Exclusions({ width, height, axisY, people, ticks }) {
  const exclusions = [
    { left: 0, top: 0, right: 150, bottom: height, kind: 'lane-labels' },
    { left: 0, top: axisY - 14, right: width, bottom: axisY + 14, kind: 'axis' },
    ...ticks.map((x) => ({ left: x - 12, top: axisY - 26, right: x + 12, bottom: axisY + 26, kind: 'tick' })),
  ];
  for (const { x, y, avatarSize } of people) {
    const horizontalRadius = Math.max(avatarSize / 2, 58) + 14;
    exclusions.push({
      left: x - horizontalRadius,
      top: y - avatarSize / 2 - 14,
      right: x + horizontalRadius,
      bottom: y + avatarSize / 2 + 52,
      kind: 'person',
    });
    exclusions.push({
      left: x - 5,
      top: Math.min(y, axisY),
      right: x + 5,
      bottom: Math.max(y, axisY),
      kind: 'guide',
    });
  }
  return exclusions;
}

function rectanglesOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function pointDistanceToRect(x, y, rect) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
}

function starRect(x, y) {
  return {
    left: x - B2_STAR_WIDTH / 2,
    right: x + B2_STAR_WIDTH / 2,
    top: y - B2_STAR_HEIGHT / 2,
    bottom: y + B2_STAR_HEIGHT / 2,
  };
}

function animationForB2Star(index) {
  const variant = (index % 3) + 1;
  const ranges = [[3.8, 5], [5.1, 6.8], [6.9, 8.5]];
  const [min, max] = ranges[variant - 1];
  const stepCount = Math.round((max - min) * 10);
  const duration = Number((min + ((index * 7) % (stepCount + 1)) / 10).toFixed(1));
  const rawDelay = Number((0.4 + ((index * 23) % 61) / 10).toFixed(1));
  const delay = -Math.min(rawDelay, Number((duration - 0.1).toFixed(1)));
  const peak = Number((0.42 + ((index * 7) % 27) / 100).toFixed(2));
  return { variant, duration, delay, peak };
}

function selectB2Stars(geometry, exclusions) {
  const candidates = [];
  let column = 0;
  for (let x = 176; x <= geometry.width - B2_STAR_WIDTH / 2; x += B2_STAR_X_STEP, column += 1) {
    const offset = column % 2 ? B2_STAR_Y_STEP / 2 : 0;
    for (let y = 28 + offset; y <= geometry.height - B2_STAR_HEIGHT / 2; y += B2_STAR_Y_STEP) {
      const roundedY = Number(y.toFixed(1));
      const rect = starRect(x, roundedY);
      if (exclusions.some((exclusion) => rectanglesOverlap(rect, exclusion))) continue;
      const clearance = Math.min(...exclusions.map((exclusion) => pointDistanceToRect(x, roundedY, exclusion)));
      const texture = ((x * 31 + Math.round(roundedY * 10) * 17) % 83) / 10;
      candidates.push({ x, y: roundedY, score: clearance + texture });
    }
  }

  const selected = [];
  const segmentCount = Math.ceil(geometry.width / B2_STAR_SEGMENT_WIDTH);
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const left = segment * B2_STAR_SEGMENT_WIDTH;
    const right = Math.min(geometry.width, left + B2_STAR_SEGMENT_WIDTH);
    const pool = candidates
      .filter((candidate) => candidate.x >= left && candidate.x < right)
      .sort((a, b) => b.score - a.score || a.x - b.x || a.y - b.y);
    const segmentStars = [];
    const usedRows = new Set();
    const bucketCounts = new Map();
    for (const candidate of pool) {
      const row = candidate.y.toFixed(1);
      const bucket = Math.min(4, Math.floor(candidate.y / (geometry.height / 5)));
      if (usedRows.has(row) || (bucketCounts.get(bucket) || 0) >= 3) continue;
      if (selected.some((star) => Math.hypot(star.x - candidate.x, star.y - candidate.y) < 92)) continue;
      segmentStars.push(candidate);
      selected.push(candidate);
      usedRows.add(row);
      bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
      if (segmentStars.length === B2_STARS_PER_SEGMENT) break;
    }
  }

  if (selected.length < 40) {
    throw new Error(`B2 ambient placement found only ${selected.length} safe stars`);
  }
  return selected
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .slice(0, 50)
    .map(({ x, y }, index) => ({ x, y, ...animationForB2Star(index) }));
}

export function buildB2AmbientStars(baseHtml) {
  const geometry = parseB2TimelineGeometry(baseHtml);
  return selectB2Stars(geometry, buildB2Exclusions(geometry));
}

function renderB2Star(star, index) {
  return `<i class="b2-star b2-star--${star.variant}" data-b2-star="${index}" aria-hidden="true" style="--star-x:${star.x}px;--star-y:${star.y}px;--star-duration:${star.duration}s;--star-delay:${star.delay}s;--star-peak:${star.peak}"></i>`;
}

export function renderB2AmbientMarkup(baseHtml) {
  const stars = buildB2AmbientStars(baseHtml).map(renderB2Star).join('');
  return `<span class="b2-ambient" data-b2-ambient aria-hidden="true">${stars}</span>`;
}

export const PEOPLE_TIMELINE_VARIANTS = Object.freeze(Object.fromEntries(KEYS.map((key) => [key, Object.freeze({
  key,
  filename: 'people-timeline-' + key + '.html',
  title: '人物馆历史长卷 ' + (key === 'current' ? '当前版' : key.toUpperCase() + '版') + '｜步入大明',
})])));

export function timelineVariantClientScript(variant) {
  if (!['a', 'b', 'b2', 'c'].includes(variant)) return '';
  return `(()=>{
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
    document.querySelectorAll('[data-scroll-drag-surface]').forEach(mountTimelineDrag);
    ${variant === 'c' ? `(()=>{
    const body = document.body;
    const ritual = document.querySelector('[data-scroll-ritual]');
    const unfurl = document.querySelector('[data-scroll-unfurl]');
    const skip = document.querySelector('[data-scroll-skip]');
    const replay = document.querySelector('[data-scroll-replay]');
    const surface = document.querySelector('[data-scroll-drag-surface]');
    const storageKey = 'ming.peopleTimelineC.opened';
    let timer = 0;
    const safeStore = () => { try { sessionStorage.setItem(storageKey, '1'); } catch (_) {} };
    const setTimelineInteractivity = (interactive) => {
      surface.inert = !interactive;
      if (interactive) surface.removeAttribute('aria-hidden');
      else surface.setAttribute('aria-hidden', 'true');
    };
    const moveFocusToSurface = () => { if (surface) surface.focus({ preventScroll: true }); };
    const moveFocusToBody = () => { body.setAttribute('tabindex', '-1'); body.focus({ preventScroll: true }); };
    const finish = () => {
      clearTimeout(timer);
      setTimelineInteractivity(true);
      body.dataset.ritualState = 'open';
      ritual.hidden = true;
      ritual.removeAttribute('aria-hidden');
      replay.hidden = false;
      unfurl.setAttribute('aria-expanded', 'true');
      safeStore();
      moveFocusToSurface();
      body.removeAttribute('tabindex');
    };
    const open = () => {
      clearTimeout(timer);
      body.dataset.ritualState = 'opening';
      setTimelineInteractivity(false);
      ritual.hidden = false;
      ritual.setAttribute('aria-hidden', 'true');
      replay.hidden = true;
      unfurl.setAttribute('aria-expanded', 'true');
      moveFocusToBody();
      timer = setTimeout(finish, 800);
    };
    const failOpen = () => {
      clearTimeout(timer);
      body.classList.add('ritual-enhanced');
      body.dataset.ritualState = 'open';
      if (surface) setTimelineInteractivity(true);
      if (ritual) {
        ritual.hidden = true;
        ritual.removeAttribute('aria-hidden');
      }
      if (replay) replay.hidden = false;
      if (unfurl) unfurl.setAttribute('aria-expanded', 'true');
      moveFocusToSurface();
      body.removeAttribute('tabindex');
    };
    try {
      if (!ritual || !unfurl || !skip || !replay || !surface) throw new Error('Missing C ritual controls');
      unfurl.addEventListener('click', open);
      skip.addEventListener('click', finish);
      replay.addEventListener('click', () => {
        body.dataset.ritualState = 'closed';
        setTimelineInteractivity(false);
        ritual.hidden = false;
        ritual.removeAttribute('aria-hidden');
        replay.hidden = true;
        unfurl.setAttribute('aria-expanded', 'false');
        requestAnimationFrame(open);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && body.dataset.ritualState !== 'open') finish();
      });
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const previouslyOpened = sessionStorage.getItem(storageKey) === '1';
      body.classList.add('ritual-enhanced');
      if (reduced || previouslyOpened) finish();
      else {
        setTimelineInteractivity(false);
        body.dataset.ritualState = 'closed';
        ritual.hidden = false;
        ritual.removeAttribute('aria-hidden');
        replay.hidden = true;
        unfurl.setAttribute('aria-expanded', 'false');
        unfurl.focus();
      }
    } catch (_) {
      failOpen();
    }
    })();` : ''}
  })();`;
}

function requiredReplace(source, sentinel, replacement, label) {
  const matched = typeof sentinel === 'string' ? source.includes(sentinel) : sentinel.test(source);
  if (sentinel instanceof RegExp) sentinel.lastIndex = 0;
  if (!matched) throw new Error(`Required replacement sentinel missing: ${label}`);
  return source.replace(sentinel, replacement);
}

export function renderPeopleTimelineVariantPage(baseHtml, variant) {
  const config = PEOPLE_TIMELINE_VARIANTS[variant];
  if (!config) throw new Error('Unknown people timeline variant: ' + variant);
  let html = requiredReplace(
    baseHtml,
    '<title>人物馆｜步入大明数字历史博物馆</title>',
    '<title>' + config.title + '</title>',
    'people page title',
  );
  html = requiredReplace(html, '</head>', '<meta name="robots" content="noindex,nofollow"></head>', 'head closing tag for robots marker');
  html = requiredReplace(html, '<body class="people-page"', '<body class="people-page" data-scroll-variant="' + variant + '"', 'people page body');
  if (['a', 'b', 'b2', 'c'].includes(variant)) {
    html = requiredReplace(html, 'id="peopleTimelineView" class="people-timeline-viewport"', 'id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface', `${variant} drag surface`);
  }
  if (variant === 'b') html = requiredReplace(html, 'class="people-timeline"', 'class="people-timeline" data-scroll-stage="immersive"', 'B immersive stage');
  if (variant === 'b') html = requiredReplace(html, '<section id="peopleTimelineView"', '<i data-scroll-roller="start" aria-hidden="true"></i><i data-scroll-roller="end" aria-hidden="true"></i><section id="peopleTimelineView"', 'B rollers');
  if (variant === 'b2') {
    html = requiredReplace(html, 'class="people-timeline"', 'class="people-timeline" data-scroll-stage="framed"', 'B2 framed stage');
    html = requiredReplace(html, '<section id="peopleTimelineView"', '<i data-scroll-roller="start" aria-hidden="true"></i><i data-scroll-roller="end" aria-hidden="true"></i><section id="peopleTimelineView"', 'B2 rollers');
    const ambientMarkup = renderB2AmbientMarkup(baseHtml);
    html = requiredReplace(
      html,
      /(<div class="people-timeline-canvas"[^>]*>)/,
      `$1${ambientMarkup}`,
      'B2 ambient layer',
    );
  }
  if (variant === 'a' || variant === 'c') html = requiredReplace(html, /(<div class="people-timeline-canvas"[^>]*>)/, '$1<span data-scroll-prologue aria-hidden="true">大明人物长卷</span><span data-scroll-epilogue aria-hidden="true">二百七十六年人物录</span>', `${variant} prologue and epilogue`);
  if (variant === 'c') {
    html = requiredReplace(html, 'id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface', 'id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface tabindex="-1"', 'C focusable surface');
    html = requiredReplace(html, '<section id="peopleTimelineView"', '<section class="scroll-ritual" data-scroll-ritual hidden aria-labelledby="scrollRitualTitle"><h2 id="scrollRitualTitle">明朝人物历史长卷</h2><button type="button" data-scroll-unfurl aria-controls="peopleTimelineView" aria-expanded="false">展卷</button><button type="button" data-scroll-skip>跳过</button></section><button type="button" data-scroll-replay hidden>重播开卷</button><section id="peopleTimelineView"', 'C ritual controls');
  }
  if (TIMELINE_VARIANT_CSS[variant]) html = requiredReplace(html, '</style>', `${TIMELINE_VARIANT_CSS[variant]}</style>`, `${variant} style injection`);
  if (['a', 'b', 'b2', 'c'].includes(variant)) html = requiredReplace(html, '</body>', `<script>${timelineVariantClientScript(variant)}</script></body>`, `${variant} client script`);
  return html;
}

export function renderPeopleTimelineFormalPage(baseHtml, variant = 'b2') {
  const config = PEOPLE_TIMELINE_VARIANTS[variant];
  if (!config) throw new Error('Unknown formal people timeline variant: ' + variant);
  let html = renderPeopleTimelineVariantPage(baseHtml, variant);
  html = requiredReplace(
    html,
    '<title>' + config.title + '</title>',
    '<title>人物馆｜步入大明数字历史博物馆</title>',
    'formal people page title',
  );
  return requiredReplace(
    html,
    '<meta name="robots" content="noindex,nofollow">',
    '',
    'formal people page robots marker',
  );
}
