const KEYS = ['current', 'a', 'b', 'c'];

export const TIMELINE_VARIANT_CSS = Object.freeze({
  a: `body[data-scroll-variant="a"]{--scroll-paper:#f5f0e3;background:#e7deca}
body[data-scroll-variant="a"] .people-timeline{padding:10px 20px 14px;background:linear-gradient(90deg,#d1bd91 0 12px,#efe5cf 12px calc(100% - 12px),#d1bd91 calc(100% - 12px));box-shadow:0 14px 34px rgba(50,38,20,.12)}
body[data-scroll-variant="a"] .people-timeline-viewport{cursor:grab;border-color:#ad9367;background:linear-gradient(#eadcbd 0 7px,var(--scroll-paper) 7px calc(100% - 7px),#eadcbd calc(100% - 7px));box-shadow:inset 18px 0 24px -24px #4b3317,inset -18px 0 24px -24px #4b3317}
body[data-scroll-variant="a"] .people-timeline-viewport[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-scroll-variant="a"] [data-scroll-prologue],body[data-scroll-variant="a"] [data-scroll-epilogue]{position:absolute;top:18px;color:#8b6334;font:12px/1.3 "STKaiti","KaiTi",serif;writing-mode:vertical-rl;pointer-events:none}
body[data-scroll-variant="a"] [data-scroll-prologue]{left:38px}body[data-scroll-variant="a"] [data-scroll-epilogue]{right:38px}`,
});

export const PEOPLE_TIMELINE_VARIANTS = Object.freeze(Object.fromEntries(KEYS.map((key) => [key, Object.freeze({
  key,
  filename: 'people-timeline-' + key + '.html',
  title: '人物馆历史长卷 ' + (key === 'current' ? '当前版' : key.toUpperCase() + '版') + '｜步入大明',
})])));

export function timelineVariantClientScript(variant) {
  if (!['a', 'b', 'c'].includes(variant)) return '';
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
  })();`;
}

export function renderPeopleTimelineVariantPage(baseHtml, variant) {
  const config = PEOPLE_TIMELINE_VARIANTS[variant];
  if (!config) throw new Error('Unknown people timeline variant: ' + variant);
  let html = baseHtml
    .replace('<title>人物馆｜步入大明数字历史博物馆</title>', '<title>' + config.title + '</title>')
    .replace('<body class="people-page"', '<body class="people-page" data-scroll-variant="' + variant + '"');
  if (['a', 'b', 'c'].includes(variant)) {
    html = html.replace('id="peopleTimelineView" class="people-timeline-viewport"', 'id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface');
  }
  if (variant === 'b') html = html.replace('class="people-timeline"', 'class="people-timeline" data-scroll-stage="immersive"');
  if (variant === 'b') html = html.replace('<section id="peopleTimelineView"', '<i data-scroll-roller="start" aria-hidden="true"></i><i data-scroll-roller="end" aria-hidden="true"></i><section id="peopleTimelineView"');
  if (variant === 'a' || variant === 'c') html = html.replace(/(<div class="people-timeline-canvas"[^>]*>)/, '$1<span data-scroll-prologue aria-hidden="true">大明人物长卷</span><span data-scroll-epilogue aria-hidden="true">二百七十六年人物录</span>');
  if (variant === 'c') html = html.replace('<section id="peopleTimelineView"', '<section data-scroll-ritual hidden><h2>明朝人物历史长卷</h2><button data-scroll-unfurl>展卷</button><button data-scroll-skip>跳过</button></section><button data-scroll-replay hidden>重播开卷</button><section id="peopleTimelineView"');
  if (TIMELINE_VARIANT_CSS[variant]) html = html.replace('</style>', `${TIMELINE_VARIANT_CSS[variant]}</style>`);
  if (['a', 'b', 'c'].includes(variant)) html = html.replace('</body>', `<script>${timelineVariantClientScript(variant)}</script></body>`);
  return html;
}
