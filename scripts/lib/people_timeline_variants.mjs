const KEYS = ['current', 'a', 'b', 'b2', 'c'];

export const TIMELINE_VARIANT_CSS = Object.freeze({
  a: `body[data-scroll-variant="a"]{--scroll-paper:#f5f0e3;background:#e7deca}
body[data-scroll-variant="a"] .people-timeline{padding:10px 20px 14px;background:linear-gradient(90deg,#d1bd91 0 12px,#efe5cf 12px calc(100% - 12px),#d1bd91 calc(100% - 12px));box-shadow:0 14px 34px rgba(50,38,20,.12)}
body[data-scroll-variant="a"] .people-timeline-viewport{cursor:grab;border-color:#ad9367;background:linear-gradient(#eadcbd 0 7px,var(--scroll-paper) 7px calc(100% - 7px),#eadcbd calc(100% - 7px));box-shadow:inset 18px 0 24px -24px #4b3317,inset -18px 0 24px -24px #4b3317}
body[data-scroll-variant="a"] .people-timeline-viewport[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-scroll-variant="a"] [data-scroll-prologue],body[data-scroll-variant="a"] [data-scroll-epilogue]{position:absolute;top:18px;color:#8b6334;font:12px/1.3 "STKaiti","KaiTi",serif;writing-mode:vertical-rl;pointer-events:none}
body[data-scroll-variant="a"] [data-scroll-prologue]{left:38px}body[data-scroll-variant="a"] [data-scroll-epilogue]{right:38px}`,
  b: `body[data-scroll-variant="b"][data-people-view="timeline"]{--stage-ink:#171611;min-height:100vh;background:radial-gradient(circle at 50% 48%,#383226 0,#211f19 42%,var(--stage-ink) 100%);color:#eee6d3}
body[data-scroll-variant="b"] .museum-nav{min-height:54px;height:54px;background:rgba(17,16,13,.9)}
body[data-scroll-variant="b"] .people-timeline{position:relative;padding:18px 34px 24px}
body[data-scroll-variant="b"] .people-timeline-viewport{cursor:grab;border:10px solid #9a7741;border-width:10px 16px;background:#f5f0e3;box-shadow:0 24px 60px rgba(0,0,0,.42)}
body[data-scroll-variant="b"] .people-timeline:before,body[data-scroll-variant="b"] .people-timeline:after{content:"";position:absolute;z-index:8;top:56px;bottom:36px;width:42px;pointer-events:none}
body[data-scroll-variant="b"] .people-timeline:before{left:30px;background:linear-gradient(90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b"] .people-timeline:after{right:30px;background:linear-gradient(-90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b"] [data-scroll-roller]{position:absolute;z-index:9;top:52px;bottom:32px;width:12px;border-radius:8px;background:linear-gradient(90deg,#4a2e13,#b18448 45%,#3b240f);box-shadow:0 0 0 1px #241609,0 8px 18px rgba(0,0,0,.38);pointer-events:none}
body[data-scroll-variant="b"] [data-scroll-roller="start"]{left:24px}body[data-scroll-variant="b"] [data-scroll-roller="end"]{right:24px}
body[data-scroll-variant="b"][data-people-view="timeline"] .lede{color:#eee6d3}body[data-scroll-variant="b"][data-people-view="timeline"] .scope{color:#c9bfa9}body[data-scroll-variant="b"][data-people-view="timeline"] .scope b{color:#f5f0e3}body[data-scroll-variant="b"][data-people-view="timeline"] .mast h1 small{color:#c9bfa9}
body[data-scroll-variant="b"][data-people-view="timeline"] .stat{background:#f5f0e3;color:#171611}body[data-scroll-variant="b"][data-people-view="timeline"] .stat span{color:#625d50}body[data-scroll-variant="b"][data-people-view="timeline"] .stat strong{color:#171611}body[data-scroll-variant="b"][data-people-view="timeline"] .stat:nth-child(1) strong,body[data-scroll-variant="b"][data-people-view="timeline"] .stat:last-child strong{color:#9c2f23}
body[data-scroll-variant="b"] .drawer .panel{color:var(--ink)}`,
  b2: `body[data-scroll-variant="b2"] .people-timeline{position:relative;padding:14px 26px 20px;background:#efe5cf}
body[data-scroll-variant="b2"] #peopleTimelineView{--b2-stage-ink:#171611;cursor:grab;border:1px solid #8a6a3a;outline:5px solid #c8b58d;background:radial-gradient(circle at 50% 48%,#383226 0,#211f19 42%,var(--b2-stage-ink) 100%);box-shadow:inset 16px 0 22px -18px #000,inset -16px 0 22px -18px #000,0 12px 28px rgba(50,38,20,.2);color:#eee6d3}
body[data-scroll-variant="b2"] #peopleTimelineView[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-scroll-variant="b2"] #peopleTimelineView .timeline-axis,body[data-scroll-variant="b2"] #peopleTimelineView .timeline-person-guide{background:rgba(238,230,211,.46)}
body[data-scroll-variant="b2"] #peopleTimelineView .timeline-tick,body[data-scroll-variant="b2"] #peopleTimelineView .timeline-lane-label,body[data-scroll-variant="b2"] #peopleTimelineView .timeline-person small{color:#cfc5b0}
body[data-scroll-variant="b2"] #peopleTimelineView .timeline-person strong{color:#f5f0e3}
body[data-scroll-variant="b2"] .people-timeline:before,body[data-scroll-variant="b2"] .people-timeline:after{content:"";position:absolute;z-index:8;top:55px;bottom:20px;width:34px;pointer-events:none}
body[data-scroll-variant="b2"] .people-timeline:before{left:21px;background:linear-gradient(90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b2"] .people-timeline:after{right:21px;background:linear-gradient(-90deg,rgba(23,17,9,.72),transparent)}
body[data-scroll-variant="b2"] [data-scroll-roller]{position:absolute;z-index:9;top:55px;bottom:20px;width:12px;border-radius:8px;background:linear-gradient(90deg,#4a2e13,#b18448 45%,#3b240f);box-shadow:0 0 0 1px #241609,0 8px 18px rgba(0,0,0,.38);pointer-events:none}
body[data-scroll-variant="b2"] [data-scroll-roller="start"]{left:20px}body[data-scroll-variant="b2"] [data-scroll-roller="end"]{right:20px}`,
  c: `body[data-scroll-variant="c"]{--scroll-paper:#f5f0e3;background:#e7deca}
body[data-scroll-variant="c"] .people-timeline{height:984px;padding:10px 20px 14px;background:#efe5cf;overflow:hidden}
body[data-scroll-variant="c"] .people-view-tabs{position:absolute;z-index:5;top:18px;left:32px;margin:0}
body[data-scroll-variant="c"] .people-timeline-viewport{height:960px;cursor:grab;border-color:#ad9367;background:linear-gradient(#eadcbd 0 7px,var(--scroll-paper) 7px calc(100% - 7px),#eadcbd calc(100% - 7px));box-shadow:inset 18px 0 24px -24px #4b3317,inset -18px 0 24px -24px #4b3317}
body[data-scroll-variant="c"] .people-timeline-canvas{transform:scaleY(.967742);transform-origin:top left}
body[data-scroll-variant="c"] .people-timeline-viewport[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-scroll-variant="c"] [data-scroll-prologue],body[data-scroll-variant="c"] [data-scroll-epilogue]{position:absolute;top:18px;color:#8b6334;font:12px/1.3 "STKaiti","KaiTi",serif;writing-mode:vertical-rl;pointer-events:none}
body[data-scroll-variant="c"] [data-scroll-prologue]{left:38px}body[data-scroll-variant="c"] [data-scroll-epilogue]{right:38px}
body[data-scroll-variant="c"] .scroll-ritual{position:absolute;z-index:6;inset:0}body[data-scroll-variant="c"] .scroll-ritual:before,body[data-scroll-variant="c"] .scroll-ritual:after{content:"";position:absolute;top:0;bottom:0;width:14px;border-radius:8px;background:linear-gradient(90deg,#4a2e13,#b18448 45%,#3b240f)}
body[data-scroll-variant="c"] .scroll-ritual:before{left:calc(50% - 19px)}body[data-scroll-variant="c"] .scroll-ritual:after{right:calc(50% - 19px)}
body[data-scroll-variant="c"] .scroll-ritual h2{margin:62px 0 14px}body[data-scroll-variant="c"] [data-scroll-ritual] button{position:relative;z-index:1}body[data-scroll-variant="c"] [data-scroll-replay]{position:absolute;z-index:7;top:60px;right:32px}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="closed"] #peopleTimelineView{clip-path:inset(0 49%);opacity:0}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="opening"] #peopleTimelineView{animation:unfurlTimeline 800ms cubic-bezier(.22,.75,.25,1) both}
body[data-scroll-variant="c"].ritual-enhanced[data-ritual-state="open"] #peopleTimelineView{clip-path:inset(0);opacity:1}
@keyframes unfurlTimeline{from{clip-path:inset(0 49%);opacity:.35}to{clip-path:inset(0);opacity:1}}
@media(prefers-reduced-motion:reduce){body[data-scroll-variant="c"] #peopleTimelineView{animation:none!important;clip-path:inset(0)!important;opacity:1!important}}`,
});

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
      ritual.hidden = true;
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
      if (ritual) ritual.hidden = true;
      if (replay) replay.hidden = false;
      if (unfurl) unfurl.setAttribute('aria-expanded', 'true');
    };
    try {
      if (!ritual || !unfurl || !skip || !replay || !surface) throw new Error('Missing C ritual controls');
      unfurl.addEventListener('click', open);
      skip.addEventListener('click', finish);
      replay.addEventListener('click', () => {
        body.dataset.ritualState = 'closed';
        setTimelineInteractivity(false);
        ritual.hidden = false;
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

export function renderPeopleTimelineVariantPage(baseHtml, variant) {
  const config = PEOPLE_TIMELINE_VARIANTS[variant];
  if (!config) throw new Error('Unknown people timeline variant: ' + variant);
  let html = baseHtml
    .replace('<title>人物馆｜步入大明数字历史博物馆</title>', '<title>' + config.title + '</title>')
    .replace('<body class="people-page"', '<body class="people-page" data-scroll-variant="' + variant + '"');
  if (['a', 'b', 'b2', 'c'].includes(variant)) {
    html = html.replace('id="peopleTimelineView" class="people-timeline-viewport"', 'id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface');
  }
  if (variant === 'b') html = html.replace('class="people-timeline"', 'class="people-timeline" data-scroll-stage="immersive"');
  if (variant === 'b') html = html.replace('<section id="peopleTimelineView"', '<i data-scroll-roller="start" aria-hidden="true"></i><i data-scroll-roller="end" aria-hidden="true"></i><section id="peopleTimelineView"');
  if (variant === 'b2') html = html
    .replace('class="people-timeline"', 'class="people-timeline" data-scroll-stage="framed"')
    .replace('<section id="peopleTimelineView"', '<i data-scroll-roller="start" aria-hidden="true"></i><i data-scroll-roller="end" aria-hidden="true"></i><section id="peopleTimelineView"');
  if (variant === 'a' || variant === 'c') html = html.replace(/(<div class="people-timeline-canvas"[^>]*>)/, '$1<span data-scroll-prologue aria-hidden="true">大明人物长卷</span><span data-scroll-epilogue aria-hidden="true">二百七十六年人物录</span>');
  if (variant === 'c') html = html
    .replace('id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface', 'id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface tabindex="-1"')
    .replace('<section id="peopleTimelineView"', '<section class="scroll-ritual" data-scroll-ritual hidden aria-labelledby="scrollRitualTitle"><h2 id="scrollRitualTitle">明朝人物历史长卷</h2><button type="button" data-scroll-unfurl aria-controls="peopleTimelineView" aria-expanded="false">展卷</button><button type="button" data-scroll-skip>跳过</button></section><button type="button" data-scroll-replay hidden>重播开卷</button><section id="peopleTimelineView"');
  if (TIMELINE_VARIANT_CSS[variant]) html = html.replace('</style>', `${TIMELINE_VARIANT_CSS[variant]}</style>`);
  if (['a', 'b', 'b2', 'c'].includes(variant)) html = html.replace('</body>', `<script>${timelineVariantClientScript(variant)}</script></body>`);
  return html;
}
