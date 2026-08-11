const KEYS = ['current', 'a', 'b', 'c'];

export const PEOPLE_TIMELINE_VARIANTS = Object.freeze(Object.fromEntries(KEYS.map((key) => [key, Object.freeze({
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
  if (['a', 'b', 'c'].includes(variant)) {
    html = html.replace('id="peopleTimelineView" class="people-timeline-viewport"', 'id="peopleTimelineView" class="people-timeline-viewport" data-scroll-drag-surface');
  }
  if (variant === 'b') html = html.replace('class="people-timeline"', 'class="people-timeline" data-scroll-stage="immersive"');
  if (variant === 'b') html = html.replace('<section id="peopleTimelineView"', '<i data-scroll-roller="start" aria-hidden="true"></i><i data-scroll-roller="end" aria-hidden="true"></i><section id="peopleTimelineView"');
  if (variant === 'a' || variant === 'c') html = html.replace(/(<div class="people-timeline-canvas"[^>]*>)/, '$1<span data-scroll-prologue aria-hidden="true">大明人物长卷</span><span data-scroll-epilogue aria-hidden="true">二百七十六年人物录</span>');
  if (variant === 'c') html = html.replace('<section id="peopleTimelineView"', '<section data-scroll-ritual hidden><h2>明朝人物历史长卷</h2><button data-scroll-unfurl>展卷</button><button data-scroll-skip>跳过</button></section><button data-scroll-replay hidden>重播开卷</button><section id="peopleTimelineView"');
  return html;
}
