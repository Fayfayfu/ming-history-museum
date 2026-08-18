import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const baseUrl = process.env.MING_TIMELINE_BASE_URL?.replace(/\/$/, '');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = (file) => baseUrl ? `${baseUrl}/${file}` : `file://${path.join(root, file)}`;
const failures = [];
const pageErrors = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};

let browser;
let noScriptContext;
try {
browser = await chromium.launch({ headless: true, executablePath: chrome });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (error) => pageErrors.push(error.message));

await page.goto(url('people.html'), { waitUntil: 'networkidle' });
const initial = await page.evaluate(() => {
  const timeline = document.querySelector('#peopleTimelineView');
  const table = document.querySelector('.tablewrap');
  const timelineTab = document.querySelector('button[data-people-view="timeline"]');
  const tableTab = document.querySelector('button[data-people-view="table"]');
  return {
    view: document.body.dataset.peopleView,
    timeline: timeline ? getComputedStyle(timeline).display : 'missing',
    table: table ? getComputedStyle(table).display : 'missing',
    timelineSelected: timelineTab?.getAttribute('aria-selected') || '',
    timelineTabIndex: timelineTab?.getAttribute('tabindex') || '',
    tableSelected: tableTab?.getAttribute('aria-selected') || '',
    tableTabIndex: tableTab?.getAttribute('tabindex') || '',
    timelineControls: timelineTab?.getAttribute('aria-controls') || '',
    tableControls: tableTab?.getAttribute('aria-controls') || '',
    controlledPanelsExist: [timelineTab, tableTab].every((tab) => document.getElementById(tab?.getAttribute('aria-controls') || '')),
    timelineLabelled: timeline?.getAttribute('aria-labelledby') || '',
    tableLabelled: table?.getAttribute('aria-labelledby') || '',
    timelineText: timelineTab?.textContent.trim() || '',
    tableText: tableTab?.textContent.trim() || '',
    scopePlacement: {
      mastCount: document.querySelectorAll('.mast .scope').length,
      footerCount: document.querySelectorAll('.people-scope-footer .scope').length,
      footerText: document.querySelector('.people-scope-footer .scope')?.textContent.replace(/\s+/g, ' ').trim() || '',
      footerFontSize: Number.parseFloat(getComputedStyle(document.querySelector('.people-scope-footer .scope')).fontSize),
      followsMethod: Boolean(
        document.querySelector('.method')
        && document.querySelector('.people-scope-footer')
        && (document.querySelector('.method').compareDocumentPosition(document.querySelector('.people-scope-footer')) & Node.DOCUMENT_POSITION_FOLLOWING)
      ),
    },
    legacySections: [...document.querySelectorAll('.people-page>.shell>.timeline,.people-page>.shell>.toolbar,.people-page>.shell>.statusline,.people-page>.shell>.tablewrap,.people-page>.shell>.method')].map((section) => ({
      className: section.className,
      hidden: section.hidden,
      display: getComputedStyle(section).display,
    })),
    emperorFilterSelects: document.querySelectorAll('#parent').length,
    emperorAxisButtons: document.querySelectorAll('#emperors .emperor').length,
  };
});
check(initial.view === 'timeline', 'people.html must default to timeline view', initial);
check(initial.timeline !== 'none' && initial.timeline !== 'missing', 'timeline must be visible by default', initial);
check(initial.table === 'none', 'table must be hidden by default', initial);
check(initial.timelineSelected === 'true' && initial.timelineTabIndex === '0', 'timeline tab must be selected and keyboard reachable', initial);
check(initial.tableSelected === 'false' && initial.tableTabIndex === '-1', 'table tab must be unselected', initial);
check(initial.timelineControls === 'peopleTimelineView' && initial.tableControls === 'peopleTableView' && initial.controlledPanelsExist, 'tabs must control existing panels', initial);
check(initial.timelineLabelled === 'peopleTimelineTab' && initial.tableLabelled === 'peopleTableTab', 'panels must reference their real tabs', initial);
check(initial.timelineText === '历史长卷' && initial.tableText === '人物总表', 'people view tabs must use the approved visitor wording', initial);
check(
  initial.scopePlacement.mastCount === 0
    && initial.scopePlacement.footerCount === 1
    && initial.scopePlacement.followsMethod
    && initial.scopePlacement.footerFontSize >= 14
    && ['本馆范围', '画像', '叙事协议', '纪年'].every((label) => initial.scopePlacement.footerText.includes(label)),
  'secondary people-hall scope copy must move from the masthead to one complete footer after the main content',
  initial.scopePlacement,
);
check(
  initial.legacySections.length === 5
    && initial.legacySections.every((section) => section.hidden && section.display === 'none'),
  'timeline view must hide every legacy table section including the roster title and current-view count',
  initial.legacySections,
);
check(initial.emperorFilterSelects === 0 && initial.emperorAxisButtons === 16, 'the imperial lineage must be the sole emperor-selection control', initial);

await page.waitForFunction(() => {
  const viewport = document.querySelector('.people-timeline-viewport');
  const viewportRect = viewport?.getBoundingClientRect();
  if (!viewportRect) return false;
  const visible = [...document.querySelectorAll('[data-timeline-person]')].filter((node) => {
    const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    return portrait && portrait.right > viewportRect.left && portrait.left < viewportRect.right;
  });
  return visible.length > 0 && visible.every((node) => node.querySelector('[data-timeline-image]')?.classList.contains('is-paint-ready'));
}, undefined, { timeout: 15000 }).catch(() => {});
const initialPortraitLoading = await page.evaluate(() => {
  const viewport = document.querySelector('.people-timeline-viewport');
  const viewportRect = viewport?.getBoundingClientRect();
  const viewportWidth = viewportRect?.width || 0;
  const portraits = [...document.querySelectorAll('[data-timeline-person]')].map((node) => {
    const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    const image = node.querySelector('[data-timeline-image]');
    return {
      name: node.dataset.timelinePerson,
      visible: Boolean(portrait && viewportRect && portrait.right > viewportRect.left && portrait.left < viewportRect.right),
      farAhead: Boolean(portrait && viewportRect && portrait.left > viewportRect.right + viewportWidth),
      loading: image?.loading || 'fallback',
      src: image?.getAttribute('src') || '',
      deferredSrc: image?.dataset.src || '',
      paintReady: image?.classList.contains('is-paint-ready') || false,
    };
  });
  const visible = portraits.filter((portrait) => portrait.visible);
  const farAhead = portraits.filter((portrait) => portrait.farAhead);
  return {
    count: visible.length,
    unprioritized: visible.filter((portrait) => portrait.loading !== 'eager'),
    visibleWithoutSrc: visible.filter((portrait) => !portrait.src || !portrait.deferredSrc),
    visibleNotPaintReady: visible.filter((portrait) => !portrait.paintReady),
    farAheadCount: farAhead.length,
    farAheadRequested: farAhead.filter((portrait) => portrait.src),
  };
});
check(
  initialPortraitLoading.count > 0
    && initialPortraitLoading.unprioritized.length === 0
    && initialPortraitLoading.visibleWithoutSrc.length === 0
    && initialPortraitLoading.visibleNotPaintReady.length === 0
    && initialPortraitLoading.farAheadCount > 0
    && initialPortraitLoading.farAheadRequested.length === 0,
  'timeline must request visible portraits without a click while leaving far-ahead portraits out of the initial network queue',
  initialPortraitLoading,
);

const timelineLabelPainting = await page.evaluate(() => {
  const selects = [...document.querySelectorAll('.timeline-person-select')];
  const portraits = [...document.querySelectorAll('.timeline-portrait')];
  const borderWidths = portraits.map((portrait) => Number.parseFloat(getComputedStyle(portrait).borderTopWidth));
  return {
    total: selects.length,
    clipped: selects.filter((select) => getComputedStyle(select).clipPath !== 'none').length,
    portraitBorders: {
      total: portraits.length,
      minimum: Math.min(...borderWidths),
      maximum: Math.max(...borderWidths),
    },
  };
});
check(
  timelineLabelPainting.total === 175 && timelineLabelPainting.clipped === 0,
  'all 175 timeline names and roles must paint outside their avatar buttons without button-level clipping',
  timelineLabelPainting,
);
check(
  timelineLabelPainting.portraitBorders.total === 175
    && timelineLabelPainting.portraitBorders.minimum >= 1
    && timelineLabelPainting.portraitBorders.maximum <= 2,
  'all 175 portrait outlines must stay crisp but visually lighter than the previous 3px rings',
  timelineLabelPainting.portraitBorders,
);

const timelineGeometry = await page.evaluate(() => {
  const canvas = document.querySelector('.people-timeline-canvas')?.getBoundingClientRect();
  const nodes = [...document.querySelectorAll('[data-timeline-person]')];
  const people = Object.fromEntries(nodes.map((node) => {
    const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    return [node.dataset.timelinePerson, {
      year: Number(node.dataset.year),
      x: portrait && canvas ? portrait.left + portrait.width / 2 - canvas.left : null,
    }];
  }));
  const boundaries = [...document.querySelectorAll('.timeline-boundary time')].map((node) => {
    const rect = node.getBoundingClientRect();
    return {
      year: node.getAttribute('datetime'),
      intersectsCanvas: Boolean(canvas)
        && rect.right > canvas.left && rect.left < canvas.right
        && rect.bottom > canvas.top && rect.top < canvas.bottom,
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
    };
  });
  return {
    count: nodes.length,
    uniqueCount: new Set(nodes.map((node) => node.dataset.timelinePerson)).size,
    people,
    boundaries,
  };
});
const anchorExpectations = { '于谦': 1421, '王守仁': 1499, '张居正': 1547 };
check(
  timelineGeometry.count === 175 && timelineGeometry.uniqueCount === 175,
  'timeline must render exactly 175 uniquely named people',
  timelineGeometry,
);
check(
  Object.entries(anchorExpectations).every(([name, year]) => timelineGeometry.people[name]?.year === year),
  'featured anchors must expose their curated years',
  timelineGeometry.people,
);
const firstAnchorDelta = timelineGeometry.people['王守仁']?.x - timelineGeometry.people['于谦']?.x;
const secondAnchorDelta = timelineGeometry.people['张居正']?.x - timelineGeometry.people['王守仁']?.x;
check(
  Math.abs(firstAnchorDelta - 78 * 22) <= 0.5 && Math.abs(secondAnchorDelta - 48 * 22) <= 0.5,
  'featured anchor geometry must retain the 22px-per-year scale',
  { firstAnchorDelta, secondAnchorDelta },
);
check(
  timelineGeometry.boundaries.filter((boundary) => boundary.year === '1368').length === 1
    && timelineGeometry.boundaries.filter((boundary) => boundary.year === '1644').length === 1
    && timelineGeometry.boundaries.length === 2,
  'timeline must render one 1368 boundary and one 1644 boundary',
  timelineGeometry.boundaries,
);
check(
  timelineGeometry.boundaries.every((boundary) => boundary.intersectsCanvas),
  '1368 and 1644 boundary labels must intersect the timeline canvas',
  timelineGeometry.boundaries,
);

const timelineSizingAndLanes = await page.evaluate(() => {
  const canvas = document.querySelector('.people-timeline-canvas')?.getBoundingClientRect();
  const axis = document.querySelector('.timeline-axis')?.getBoundingClientRect();
  const portraitSnapshot = (node) => {
    const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    return {
      name: node.dataset.timelinePerson,
      width: portrait?.width || 0,
      height: portrait?.height || 0,
      borderColor: getComputedStyle(node.querySelector('.timeline-portrait')).borderTopColor,
    };
  };
  const laneIdFor = (node) => node.dataset.lane || '';
  const nodes = [...document.querySelectorAll('[data-timeline-person]')];
  const emperorContentBounds = nodes.filter((node) => laneIdFor(node) === 'emperor').map((node) => {
    const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    const name = node.querySelector('.timeline-person-select > strong')?.getBoundingClientRect();
    const role = node.querySelector('.timeline-person-select > small')?.getBoundingClientRect();
    return {
      name: node.dataset.timelinePerson,
      portraitBottom: portrait?.bottom ?? Infinity,
      nameBottom: name?.bottom ?? Infinity,
      roleBottom: role?.bottom ?? Infinity,
      axisTop: axis?.top ?? -Infinity,
    };
  });
  const laneCenters = {};
  for (const node of nodes) {
    const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    const lane = laneIdFor(node);
    if (!portrait || !lane) continue;
    if (!laneCenters[lane]) laneCenters[lane] = [];
    laneCenters[lane].push(portrait.top + portrait.height / 2 - canvas.top);
  }
  const laneGeometry = Object.fromEntries(Object.entries(laneCenters).map(([lane, centers]) => [lane, {
    count: centers.length,
    minY: Math.min(...centers),
    maxY: Math.max(...centers),
  }]));
  const goldProbe = document.createElement('span');
  goldProbe.style.color = '#d0a743';
  document.body.append(goldProbe);
  const gold = getComputedStyle(goldProbe).color;
  goldProbe.remove();
  return {
    emperors: nodes.filter((node) => laneIdFor(node) === 'emperor').map(portraitSnapshot),
    emperorContentBounds,
    featured: [...document.querySelectorAll('.timeline-person.size-featured')].map(portraitSnapshot),
    standard: [...document.querySelectorAll('.timeline-person.size-standard')].map(portraitSnapshot),
    gold,
    axisY: axis && canvas ? axis.top + axis.height / 2 - canvas.top : null,
    laneGeometry,
    unmappedLanePeople: nodes.filter((node) => !laneIdFor(node)).map((node) => node.dataset.timelinePerson),
    invalidLayerPeople: nodes.filter((node) => !/^\d+$/.test(node.dataset.layer || '')).map((node) => node.dataset.timelinePerson),
    representedLanes: [...new Set(nodes.map(laneIdFor))].sort(),
    containsRecentEmperor: document.body.textContent.includes('最近皇帝'),
  };
});
const exactSize = (portrait, size) => Math.abs(portrait.width - size) <= 0.5 && Math.abs(portrait.height - size) <= 0.5;
check(
  timelineSizingAndLanes.emperors.length === 16
    && timelineSizingAndLanes.emperors.every((portrait) => exactSize(portrait, 88) && portrait.borderColor === timelineSizingAndLanes.gold),
  'all 16 data-lane emperor portraits must be 88px with a gold outline',
  { emperors: timelineSizingAndLanes.emperors, gold: timelineSizingAndLanes.gold },
);
check(
  timelineSizingAndLanes.emperorContentBounds.length === 16
    && timelineSizingAndLanes.emperorContentBounds.every((item) => Math.max(item.portraitBottom, item.nameBottom, item.roleBottom) < item.axisTop),
  'all emperor portraits, names, and roles must remain fully above the timeline axis',
  timelineSizingAndLanes.emperorContentBounds.filter((item) => Math.max(item.portraitBottom, item.nameBottom, item.roleBottom) >= item.axisTop),
);
check(
  timelineSizingAndLanes.featured.length === 11
    && timelineSizingAndLanes.featured.map((portrait) => portrait.name).sort().join('|') === ['于谦', '刘基', '张居正', '徐光启', '徐达', '戚继光', '李时珍', '海瑞', '王守仁', '郑和', '魏忠贤'].sort().join('|')
    && timelineSizingAndLanes.featured.every((portrait) => exactSize(portrait, 72)),
  'the eleven featured portraits must be exactly the curated 72px anchors',
  timelineSizingAndLanes.featured,
);
check(
  timelineSizingAndLanes.standard.length === 148
    && timelineSizingAndLanes.standard.every((portrait) => portrait.width >= 56 && portrait.height >= 56),
  'all ordinary portraits must be at least 56px',
  timelineSizingAndLanes.standard.filter((portrait) => portrait.width < 56 || portrait.height < 56),
);
const expectedLaneIds = ['children', 'emperor', 'eunuch', 'external', 'independent', 'officials', 'women'];
const { laneGeometry, axisY } = timelineSizingAndLanes;
check(
  timelineSizingAndLanes.unmappedLanePeople.length === 0
    && timelineSizingAndLanes.invalidLayerPeople.length === 0
    && timelineSizingAndLanes.representedLanes.join('|') === expectedLaneIds.join('|')
    && expectedLaneIds.every((lane) => laneGeometry[lane]?.count > 0 && Number.isFinite(laneGeometry[lane].minY) && Number.isFinite(laneGeometry[lane].maxY)),
  'every timeline person and lane label must map to one of seven semantic swimlanes',
  timelineSizingAndLanes,
);
check(
  laneGeometry.women.maxY < laneGeometry.children.minY
    && laneGeometry.children.maxY < laneGeometry.emperor.minY
    && laneGeometry.emperor.maxY < axisY
    && axisY < laneGeometry.eunuch.minY
    && laneGeometry.eunuch.maxY < laneGeometry.officials.minY
    && laneGeometry.officials.maxY < laneGeometry.independent.minY
    && laneGeometry.independent.maxY < laneGeometry.external.minY,
  'real data-lane portrait centers must retain their top-to-axis and axis-to-bottom order',
  { axisY, laneGeometry },
);
check(!timelineSizingAndLanes.containsRecentEmperor, 'people page must not contain the phrase 最近皇帝');

const timelineContracts = await page.evaluate(() => {
  const canvas = document.querySelector('.people-timeline-canvas')?.getBoundingClientRect();
  const axis = document.querySelector('.timeline-axis')?.getBoundingClientRect();
  const axisEdges = axis ? [axis.top, axis.bottom] : [];
  const nodes = [...document.querySelectorAll('[data-timeline-person]')];
  const guides = nodes.map((node) => {
    const avatar = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    const guide = node.querySelector('[data-timeline-guide]')?.getBoundingClientRect();
    return {
      name: node.dataset.timelinePerson,
      present: Boolean(guide),
      pointerEvents: guide ? getComputedStyle(node.querySelector('[data-timeline-guide]')).pointerEvents : '',
      xDelta: avatar && guide ? Math.abs((avatar.left + avatar.width / 2) - (guide.left + guide.width / 2)) : null,
      avatarEndpointDelta: avatar && guide
        ? Math.min(
          Math.abs(guide.top - (avatar.top + avatar.height / 2)),
          Math.abs(guide.bottom - (avatar.top + avatar.height / 2)),
        )
        : null,
      axisEndpointDelta: guide && axisEdges.length
        ? Math.min(...axisEdges.flatMap((edge) => [Math.abs(guide.top - edge), Math.abs(guide.bottom - edge)]))
        : null,
    };
  });
  const accessibility = nodes.map((node) => ({
    name: node.dataset.timelinePerson,
    category: node.dataset.categoryLabel || '',
    ariaLabel: node.querySelector('.timeline-person-select')?.getAttribute('aria-label') || '',
  }));
  const portraits = nodes.map((node) => {
    const image = node.querySelector('[data-timeline-image]');
    const source = node.querySelector('[data-timeline-image-source]');
    return {
      name: node.dataset.timelinePerson,
      label: node.querySelector('.timeline-portrait')?.dataset.portraitLabel || '',
      sourceText: source?.textContent.trim() || '',
      objectPosition: image?.style.objectPosition || '',
      transform: image?.style.transform || '',
      transformOrigin: image?.style.transformOrigin || '',
    };
  });
  return {
    canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
    guides,
    accessibility,
    portraits,
    zhengHe: portraits.find((portrait) => portrait.name === '郑和') || null,
  };
});
check(
  timelineContracts.guides.length === 175
    && timelineContracts.guides.every((guide) => guide.present && guide.pointerEvents === 'none'
      && guide.xDelta <= 0.5 && guide.avatarEndpointDelta <= 0.5 && guide.axisEndpointDelta <= 0.5),
  'all 175 people must have a pointer-transparent guide anchored from avatar center to axis',
  timelineContracts.guides.filter((guide) => !guide.present || guide.pointerEvents !== 'none'
    || guide.xDelta > 0.5 || guide.avatarEndpointDelta > 0.5 || guide.axisEndpointDelta > 0.5),
);
check(
  timelineContracts.accessibility.length === 175
    && timelineContracts.accessibility.every((person) => person.category
      && person.ariaLabel.includes(`，${person.category}，`)),
  'all 175 accessible names must include the normalized visitor-facing category',
  timelineContracts.accessibility.filter((person) => !person.category
    || !person.ariaLabel.includes(`，${person.category}，`)),
);
const portraitLabels = timelineContracts.portraits.map((portrait) => portrait.sourceText);
check(
  timelineContracts.portraits.length === 175
    && timelineContracts.portraits.filter((portrait) => portrait.objectPosition).length === 129
    && timelineContracts.portraits.filter((portrait) => portrait.transform).length === 1
    && timelineContracts.portraits.filter((portrait) => portrait.transformOrigin).length === 1
    && portraitLabels.filter((label) => label === '历史图像').length === 19
    && portraitLabels.filter((label) => label !== '历史图像').length === 146
    && portraitLabels.every((label) => /[\u3400-\u9fff]/u.test(label) && !/^(sourced|imagined)$/i.test(label)),
  'timeline portraits must preserve crop metadata and expose only Chinese visitor labels',
  {
    objectPositions: timelineContracts.portraits.filter((portrait) => portrait.objectPosition).length,
    transforms: timelineContracts.portraits.filter((portrait) => portrait.transform).length,
    transformOrigins: timelineContracts.portraits.filter((portrait) => portrait.transformOrigin).length,
    labels: Object.groupBy(portraitLabels, (label) => label),
  },
);
check(
  timelineContracts.zhengHe?.label === '明末小说插图'
    && timelineContracts.zhengHe.sourceText === '明末小说插图'
    && timelineContracts.zhengHe.objectPosition === '50% 24%'
    && timelineContracts.zhengHe.transform === 'scale(2.15)'
    && timelineContracts.zhengHe.transformOrigin === '100% 7%',
  '郑和 timeline portrait must retain its curated kind and crop transform',
  timelineContracts.zhengHe,
);

const overlapAudit = await page.evaluate(() => {
  const groups = new Map();
  for (const node of document.querySelectorAll('[data-timeline-person][data-lane][data-layer]')) {
    const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    if (!portrait) continue;
    const key = `${node.dataset.lane}:${node.dataset.layer}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      name: node.dataset.timelinePerson,
      x: portrait.left + portrait.width / 2,
      width: portrait.width,
    });
  }
  let maximum = { ratio: 0, laneLayer: '', people: [] };
  for (const [laneLayer, people] of groups) {
    people.sort((left, right) => left.x - right.x || left.name.localeCompare(right.name, 'zh-Hans-CN'));
    for (let index = 1; index < people.length; index += 1) {
      const left = people[index - 1];
      const right = people[index];
      const averageDiameter = (left.width + right.width) / 2;
      const overlap = Math.max(0, averageDiameter - (right.x - left.x));
      const ratio = averageDiameter ? overlap / averageDiameter : 0;
      if (ratio > maximum.ratio) maximum = { ratio, laneLayer, people: [left.name, right.name] };
    }
  }
  return { groupCount: groups.size, maximum };
});
check(
  overlapAudit.groupCount > 0 && overlapAudit.maximum.ratio <= 0.2 + Number.EPSILON,
  'adjacent portraits in the same data-lane and data-layer must overlap by at most 20%',
  overlapAudit,
);

const keyboardSnapshot = () => page.evaluate(() => ({
  focus: document.activeElement?.id || '',
  view: document.body.dataset.peopleView,
  timelineSelected: document.querySelector('#peopleTimelineTab')?.getAttribute('aria-selected') || '',
  tableSelected: document.querySelector('#peopleTableTab')?.getAttribute('aria-selected') || '',
  timelineDisplay: getComputedStyle(document.querySelector('#peopleTimelineView')).display,
  tableDisplay: getComputedStyle(document.querySelector('#peopleTableView')).display,
}));
const checkKeyboardView = (snapshot, expectedView, expectedFocus, key) => {
  const timeline = expectedView === 'timeline';
  check(
    snapshot.focus === expectedFocus
      && snapshot.view === expectedView
      && snapshot.timelineSelected === String(timeline)
      && snapshot.tableSelected === String(!timeline)
      && (timeline ? snapshot.timelineDisplay !== 'none' && snapshot.tableDisplay === 'none' : snapshot.timelineDisplay === 'none' && snapshot.tableDisplay !== 'none'),
    `${key} must move focus and activate the matching people view`,
    snapshot,
  );
};

await page.locator('#peopleTimelineTab').focus();
await page.keyboard.press('ArrowRight');
checkKeyboardView(await keyboardSnapshot(), 'table', 'peopleTableTab', 'ArrowRight');
await page.keyboard.press('ArrowLeft');
checkKeyboardView(await keyboardSnapshot(), 'timeline', 'peopleTimelineTab', 'ArrowLeft');
await page.keyboard.press('End');
checkKeyboardView(await keyboardSnapshot(), 'table', 'peopleTableTab', 'End');
await page.keyboard.press('Home');
checkKeyboardView(await keyboardSnapshot(), 'timeline', 'peopleTimelineTab', 'Home');

const tableButton = page.locator('button[data-people-view="table"]');
if (await tableButton.count()) await tableButton.click();
const tableView = await page.evaluate(() => ({
  view: document.body.dataset.peopleView,
  timeline: document.querySelector('#peopleTimelineView') ? getComputedStyle(document.querySelector('#peopleTimelineView')).display : 'missing',
  table: document.querySelector('.tablewrap') ? getComputedStyle(document.querySelector('.tablewrap')).display : 'missing',
  sections: [...document.querySelectorAll('.people-page>.shell>.timeline,.people-page>.shell>.toolbar,.people-page>.shell>.statusline,.people-page>.shell>.tablewrap,.people-page>.shell>.method')].map((section) => ({ className: section.className, display: getComputedStyle(section).display })),
  timelineSelected: document.querySelector('button[data-people-view="timeline"]')?.getAttribute('aria-selected') || '',
  tableSelected: document.querySelector('button[data-people-view="table"]')?.getAttribute('aria-selected') || '',
}));
check(tableView.view === 'table', 'table button must activate table view', tableView);
check(tableView.timeline === 'none' && tableView.table !== 'none' && tableView.table !== 'missing', 'table view visibility must be correct', tableView);
check(tableView.sections.length === 5 && tableView.sections.every((section) => section.display !== 'none'), 'all legacy table sections must remain visible in table view', tableView);
check(tableView.timelineSelected === 'false' && tableView.tableSelected === 'true', 'table tab selection state must update', tableView);

await page.goto(url('people.html?event=e035'), { waitUntil: 'networkidle' });
const eventView = await page.evaluate(() => ({
  view: document.body.dataset.peopleView,
  selectedEvent: document.querySelector('#personEvent')?.value || '',
  table: getComputedStyle(document.querySelector('.tablewrap')).display,
  timeline: document.querySelector('#peopleTimelineView') ? getComputedStyle(document.querySelector('#peopleTimelineView')).display : 'missing',
}));
check(eventView.view === 'table' && eventView.table !== 'none' && eventView.timeline === 'none', 'event query must open table view', eventView);
check(eventView.selectedEvent === 'e035', 'event query must preserve the event filter', eventView);

await page.goto(url(`people.html?person=${encodeURIComponent('于谦')}`), { waitUntil: 'networkidle' });
const personView = await page.evaluate(() => ({
  view: document.body.dataset.peopleView,
  timeline: document.querySelector('#peopleTimelineView') ? getComputedStyle(document.querySelector('#peopleTimelineView')).display : 'missing',
  table: getComputedStyle(document.querySelector('.tablewrap')).display,
  drawerOpen: document.querySelector('#drawer')?.classList.contains('open') || false,
  drawerName: document.querySelector('#detail h2')?.textContent.trim() || '',
}));
check(personView.view === 'timeline' && personView.timeline !== 'none' && personView.table === 'none', 'person query must retain timeline view', personView);
check(personView.drawerOpen && personView.drawerName === '于谦', 'person query must keep the requested profile open', personView);

await page.locator('#close').click();
const drawerClosed = await page.evaluate(() => ({
  open: document.querySelector('#drawer')?.classList.contains('open') || false,
  person: new URL(location.href).searchParams.get('person'),
}));
check(!drawerClosed.open, 'drawer must close before testing the timeline archive action', drawerClosed);
const yuqian = page.locator('[data-timeline-person="于谦"]');
const yuqianBefore = await yuqian.evaluate((node) => {
  const canvas = document.querySelector('.people-timeline-canvas')?.getBoundingClientRect();
  const avatar = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
  const guide = node.querySelector('[data-timeline-guide]');
  const guideStyle = guide ? getComputedStyle(guide) : null;
  return {
    avatarLeft: avatar.left - canvas.left,
    avatarTop: avatar.top - canvas.top,
    transform: getComputedStyle(node).transform,
    guideWidth: guide?.getBoundingClientRect().width || 0,
    guideColor: guideStyle?.backgroundColor || '',
    portraitShadow: getComputedStyle(node.querySelector('.timeline-portrait')).boxShadow,
  };
});
await yuqian.locator('.timeline-person-select').click();
const yuqianSelected = await yuqian.evaluate((node) => ({
  selected: node.classList.contains('is-selected'),
  selectedCount: document.querySelectorAll('.timeline-person.is-selected').length,
  pressed: node.querySelector('.timeline-person-select')?.getAttribute('aria-pressed'),
  zIndex: Number(getComputedStyle(node).zIndex),
  avatarLeft: node.querySelector('.timeline-portrait').getBoundingClientRect().left - document.querySelector('.people-timeline-canvas').getBoundingClientRect().left,
  avatarTop: node.querySelector('.timeline-portrait').getBoundingClientRect().top - document.querySelector('.people-timeline-canvas').getBoundingClientRect().top,
  transform: getComputedStyle(node).transform,
  openHidden: node.querySelector('.timeline-person-open')?.hidden,
  yearVisible: getComputedStyle(node.querySelector('time')).display !== 'none',
  basisVisible: node.querySelector('.timeline-person-basis')
    ? getComputedStyle(node.querySelector('.timeline-person-basis')).display !== 'none'
    : false,
  basis: node.querySelector('.timeline-person-basis')?.textContent.trim() || '',
  guideWidth: node.querySelector('[data-timeline-guide]')?.getBoundingClientRect().width || 0,
  guideColor: node.querySelector('[data-timeline-guide]')
    ? getComputedStyle(node.querySelector('[data-timeline-guide]')).backgroundColor
    : '',
  guidePointerEvents: node.querySelector('[data-timeline-guide]')
    ? getComputedStyle(node.querySelector('[data-timeline-guide]')).pointerEvents
    : '',
  portraitShadow: getComputedStyle(node.querySelector('.timeline-portrait')).boxShadow,
}));
check(
  yuqianSelected.selected && yuqianSelected.selectedCount === 1 && yuqianSelected.pressed === 'true'
    && yuqianSelected.zIndex >= 1000 && !yuqianSelected.openHidden
    && yuqianSelected.avatarLeft === yuqianBefore.avatarLeft && yuqianSelected.avatarTop === yuqianBefore.avatarTop
    && yuqianSelected.transform === yuqianBefore.transform
    && yuqianSelected.yearVisible && yuqianSelected.basisVisible && yuqianSelected.basis.includes('进士')
    && yuqianSelected.guideWidth > yuqianBefore.guideWidth
    && yuqianSelected.guideColor !== yuqianBefore.guideColor
    && yuqianSelected.guidePointerEvents === 'none'
    && yuqianSelected.portraitShadow !== yuqianBefore.portraitShadow
    && !yuqianSelected.portraitShadow.includes('rgb(23, 24, 21)')
    && yuqianSelected.portraitShadow.includes('rgb(240, 201, 106)'),
  'selecting 于谦 must elevate one stable node and reveal its archive action',
  { before: yuqianBefore, after: yuqianSelected },
);
await page.evaluate(() => {
  const next = new URL(location.href);
  next.searchParams.delete('person');
  history.replaceState(null, '', next.href);
});
check(await page.evaluate(() => new URL(location.href).searchParams.get('person') === null), 'archive test must start without a person query');
await yuqian.locator('.timeline-person-open').click();
const archiveOpen = await page.evaluate(() => ({
  open: document.querySelector('#drawer')?.classList.contains('open') || false,
  title: document.querySelector('#detail h2')?.textContent.trim() || '',
  person: new URL(location.href).searchParams.get('person'),
}));
check(archiveOpen.open && archiveOpen.title === '于谦' && archiveOpen.person === '于谦', 'timeline archive action must reopen 于谦 drawer and restore its person query', archiveOpen);
await page.locator('#close').click();

const interactionAudit = await page.evaluate(async () => {
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const clipContains = (outer, inner) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1
    && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
  const viewport = document.querySelector('#peopleTimelineView');
  const canvasNode = document.querySelector('.people-timeline-canvas');
  const people = [...document.querySelectorAll('[data-timeline-person]')];
  const failures = [];
  const laneCounts = {};
  const sideCounts = {};
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await nextFrame();

  for (const person of people) {
    const name = person.dataset.timelinePerson;
    const lane = person.dataset.lane || '';
    const side = person.dataset.side || '';
    laneCounts[lane] = (laneCounts[lane] || 0) + 1;
    sideCounts[side] = (sideCounts[side] || 0) + 1;
    const select = person.querySelector('.timeline-person-select');
    const avatar = person.querySelector('.timeline-portrait');
    const guide = person.querySelector('[data-timeline-guide]');
    if (!select || !avatar) {
      failures.push({ name, reason: 'missing select or avatar' });
      continue;
    }

    const initialCanvas = canvasNode.getBoundingClientRect();
    const initialAvatar = avatar.getBoundingClientRect();
    const avatarCanvasX = initialAvatar.left + initialAvatar.width / 2 - initialCanvas.left;
    viewport.scrollLeft = Math.max(0, Math.min(
      viewport.scrollWidth - viewport.clientWidth,
      avatarCanvasX - viewport.clientWidth / 2,
    ));
    await nextFrame();
    const verticalAvatar = avatar.getBoundingClientRect();
    const desiredScrollY = window.scrollY + verticalAvatar.top + verticalAvatar.height / 2 - innerHeight / 2;
    window.scrollTo({ top: Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, desiredScrollY)), behavior: 'instant' });
    await nextFrame();

    const canvasBefore = canvasNode.getBoundingClientRect();
    const avatarBefore = avatar.getBoundingClientRect();
    const before = {
      left: avatarBefore.left - canvasBefore.left,
      top: avatarBefore.top - canvasBefore.top,
      transform: getComputedStyle(person).transform,
      guideWidth: guide?.getBoundingClientRect().width || 0,
      guideColor: guide ? getComputedStyle(guide).backgroundColor : '',
    };
    const selectPoint = {
      x: avatarBefore.left + avatarBefore.width / 2,
      y: avatarBefore.top + avatarBefore.height / 2,
    };
    const selectHit = select.contains(document.elementFromPoint(selectPoint.x, selectPoint.y));
    select.click();
    await nextFrame();

    const open = person.querySelector('.timeline-person-open');
    if (open) {
      const actionRect = open.getBoundingClientRect();
      const actionScrollY = window.scrollY + actionRect.top + actionRect.height / 2 - innerHeight / 2;
      window.scrollTo({ top: Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, actionScrollY)), behavior: 'instant' });
      await nextFrame();
    }

    const canvas = canvasNode.getBoundingClientRect();
    const clip = viewport.getBoundingClientRect();
    const avatarAfter = avatar.getBoundingClientRect();
    const time = person.querySelector('time');
    const basis = person.querySelector('.timeline-person-basis');
    const info = [time, basis, open].filter(Boolean);
    const infoRects = info.map((node) => node.getBoundingClientRect());
    const visible = info.length === 3 && info.every((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return !node.hidden && style.display !== 'none' && style.visibility !== 'hidden'
        && rect.width > 0 && rect.height > 0;
    });
    const contained = infoRects.length === 3
      && infoRects.every((rect) => clipContains(canvas, rect) && clipContains(clip, rect));
    const axisward = side === 'top'
      ? infoRects.length === 3 && Math.min(...infoRects.map((rect) => rect.top)) >= avatarAfter.bottom - 1
      : side === 'bottom'
        && infoRects.length === 3 && Math.max(...infoRects.map((rect) => rect.bottom)) <= avatarAfter.top + 1;
    const openRect = open?.getBoundingClientRect();
    const openHit = Boolean(openRect)
      && open.contains(document.elementFromPoint(openRect.left + openRect.width / 2, openRect.top + openRect.height / 2));
    const stable = Math.abs((avatarAfter.left - canvas.left) - before.left) <= 0.01
      && Math.abs((avatarAfter.top - canvas.top) - before.top) <= 0.01
      && getComputedStyle(person).transform === before.transform;
    const guideStyle = guide ? getComputedStyle(guide) : null;
    const guideStrengthened = Boolean(guide)
      && guideStyle.pointerEvents === 'none'
      && guide.getBoundingClientRect().width > before.guideWidth
      && guideStyle.backgroundColor !== before.guideColor;
    const selected = person.classList.contains('is-selected')
      && select.getAttribute('aria-pressed') === 'true'
      && document.querySelectorAll('.timeline-person.is-selected').length === 1;

    if (!(selectHit && selected && visible && contained && axisward && openHit && stable && guideStrengthened
      && basis?.textContent.trim())) {
      failures.push({
        name, lane, side, selectHit, selected, visible, contained, axisward, openHit, stable,
        guideStrengthened, basis: basis?.textContent.trim() || '',
        avatar: { top: avatarAfter.top, bottom: avatarAfter.bottom },
        info: infoRects.map((rect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })),
        canvas: { left: canvas.left, right: canvas.right, top: canvas.top, bottom: canvas.bottom },
        clip: { left: clip.left, right: clip.right, top: clip.top, bottom: clip.bottom },
      });
    }
  }

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return {
    audited: people.length,
    unique: new Set(people.map((person) => person.dataset.timelinePerson)).size,
    laneCounts,
    sideCounts,
    failures,
  };
});
check(
  interactionAudit.audited === 175 && interactionAudit.unique === 175
    && interactionAudit.laneCounts.external > 0
    && interactionAudit.sideCounts.top > 0 && interactionAudit.sideCounts.bottom > 0
    && interactionAudit.failures.length === 0,
  'all 175 people, including outer external and upper nodes, must expose stable axisward and hittable selected details',
  { ...interactionAudit, failures: interactionAudit.failures.slice(0, 20) },
);

const portraitLoad = await page.evaluate(async () => {
  const images = [...document.querySelectorAll('[data-timeline-image]')];
  await Promise.race([
    Promise.all(images.map((image) => new Promise((resolve, reject) => {
      image.loading = 'eager';
      image.fetchPriority = 'auto';
      if (image.complete) {
        if (image.naturalWidth > 0) {
          resolve();
          return;
        }
      }
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', () => reject(new Error(image.currentSrc || image.src)), { once: true });
      if (!image.getAttribute('src') && image.dataset.src) image.src = image.dataset.src;
    }))),
    new Promise((_, reject) => setTimeout(() => reject(new Error('portrait load timed out')), 15000)),
  ]);
  return { count: images.length, naturalWidths: images.map((image) => image.naturalWidth) };
}).catch((error) => ({ error: error.message }));
check(
  !portraitLoad.error && portraitLoad.count > 0 && portraitLoad.naturalWidths.every((width) => width > 0),
  'timeline portraits must load before exercising the error fallback',
  portraitLoad,
);
const portraitFallback = await page.evaluate(async () => {
  const person = document.querySelector('[data-timeline-person="于谦"]');
  const image = person?.querySelector('[data-timeline-image]');
  if (!person || !image) return { missing: true };
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const selectedBefore = person.classList.contains('is-selected');
  const errored = new Promise((resolve) => image.addEventListener('error', resolve, { once: true }));
  image.src = 'assets/does-not-exist-timeline-test.png';
  await errored;
  return {
    selectedBefore,
    imageHidden: image.hidden,
    sourceHidden: person.querySelector('[data-timeline-image-source]')?.hidden,
    fallbackVisible: getComputedStyle(person.querySelector('[data-timeline-fallback]')).display !== 'none',
  };
});
check(
  !portraitFallback.missing && portraitFallback.selectedBefore === false
    && portraitFallback.imageHidden && portraitFallback.sourceHidden && portraitFallback.fallbackVisible,
  'a failed timeline portrait must hide image and source while exposing the initial fallback',
  portraitFallback,
);
await yuqian.locator('.timeline-person-select').click();
const failedPortraitSelection = await yuqian.evaluate((node) => ({
  after: node.classList.contains('is-selected'),
  pressed: node.querySelector('.timeline-person-select')?.getAttribute('aria-pressed') || '',
}));
check(
  portraitFallback.selectedBefore === false && failedPortraitSelection.after
    && failedPortraitSelection.pressed === 'true',
  'clicking a failed-image fallback must change selection from false to true',
  { before: portraitFallback.selectedBefore, ...failedPortraitSelection },
);

await page.locator('#peopleTableTab').focus();
await page.keyboard.press('Tab');
const keyboardFocus = await page.evaluate(() => {
  const person = document.activeElement?.closest('[data-timeline-person]');
  return {
    person: person?.dataset.timelinePerson || '',
    zIndex: person ? Number(getComputedStyle(person).zIndex) : 0,
    pressed: document.activeElement?.getAttribute('aria-pressed') || '',
  };
});
check(keyboardFocus.person && keyboardFocus.zIndex >= 1000 && keyboardFocus.pressed === 'false', 'Tab must focus a timeline selection control above the canvas', keyboardFocus);
await page.keyboard.press('Enter');
check(await page.evaluate(() => document.activeElement?.getAttribute('aria-pressed') === 'true'), 'Enter must select the focused timeline person');
await page.keyboard.press('Escape');
check(await page.evaluate(() => document.querySelectorAll('.timeline-person.is-selected').length === 0), 'Escape must clear timeline selection');
await yuqian.locator('.timeline-person-select').click();
const wangShouren = page.locator('[data-timeline-person="王守仁"]');
await wangShouren.locator('.timeline-person-select').click();
const exclusiveSelection = await page.evaluate(() => ({
  selected: [...document.querySelectorAll('.timeline-person.is-selected')].map((node) => node.dataset.timelinePerson),
  yuqianSelected: document.querySelector('[data-timeline-person="于谦"]')?.classList.contains('is-selected'),
}));
check(exclusiveSelection.selected.length === 1 && exclusiveSelection.selected[0] === '王守仁' && !exclusiveSelection.yuqianSelected, 'selecting another person must replace 于谦 selection', exclusiveSelection);
await page.locator('.people-timeline-canvas').click({ position: { x: 1, y: 1 } });
check(await page.evaluate(() => document.querySelectorAll('.timeline-person.is-selected').length === 0), 'clicking blank timeline canvas must clear selection');

await page.goto(url('events.html'), { waitUntil: 'networkidle' });
const eventsView = await page.evaluate(() => ({
  timeline: document.querySelectorAll('#peopleTimelineView').length,
  viewButtons: document.querySelectorAll('button[data-people-view]').length,
  peopleView: document.body.dataset.peopleView || '',
  clientApi: typeof window.setPeopleView,
  scopePlacement: {
    mastCount: document.querySelectorAll('.mast .scope').length,
    footerCount: document.querySelectorAll('.events-scope-footer .scope').length,
    footerText: document.querySelector('.events-scope-footer .scope')?.textContent.replace(/\s+/g, ' ').trim() || '',
    footerFontSize: document.querySelector('.events-scope-footer .scope')
      ? Number.parseFloat(getComputedStyle(document.querySelector('.events-scope-footer .scope')).fontSize)
      : 0,
    followsMethod: Boolean(
      document.querySelector('.method')
      && document.querySelector('.events-scope-footer')
      && (document.querySelector('.method').compareDocumentPosition(document.querySelector('.events-scope-footer')) & Node.DOCUMENT_POSITION_FOLLOWING)
    ),
  },
}));
const eventsHtml = await fs.readFile(path.join(root, 'events.html'), 'utf8');
check(eventsView.timeline === 0 && eventsView.viewButtons === 0 && !eventsView.peopleView && eventsView.clientApi === 'undefined', 'events.html must not initialize the people timeline', eventsView);
check(
  eventsView.scopePlacement.mastCount === 0
    && eventsView.scopePlacement.footerCount === 1
    && eventsView.scopePlacement.followsMethod
    && eventsView.scopePlacement.footerFontSize >= 14
    && ['本馆范围', '展览逻辑', '置信度', '跨馆'].every((label) => eventsView.scopePlacement.footerText.includes(label)),
  'secondary event-hall scope copy must move from the masthead to one readable footer after the main content',
  eventsView.scopePlacement,
);
check(!eventsHtml.includes('.people-timeline{'), 'events.html must not load people timeline styles');

let noScript;
noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
try {
const noScriptPage = await noScriptContext.newPage();
await noScriptPage.goto(url('people.html'), { waitUntil: 'load' });
const noScriptHome = await noScriptPage.evaluate(() => ({
  archiveHref: document.querySelector('noscript a[href="people-archive.html"]')?.getAttribute('href') || '',
  archiveNotice: document.querySelector('noscript')?.textContent.replace(/\s+/g, ' ').trim() || '',
}));
await noScriptPage.goto(url('people-archive.html'), { waitUntil: 'load' });
noScript = await noScriptPage.evaluate(() => ({
  title: document.title,
  scripts: document.scripts.length,
  table: getComputedStyle(document.querySelector('.tablewrap')).display,
  rows: document.querySelectorAll('#rows tr[data-id]').length,
  hasYuQian: [...document.querySelectorAll('#rows tr[data-id]')].some((row) => row.textContent.includes('于谦')),
  hasFuShan: [...document.querySelectorAll('#rows tr[data-id]')].some((row) => row.textContent.includes('傅山')),
  hasWangBaobao: [...document.querySelectorAll('#rows tr[data-id]')].some((row) => row.textContent.includes('王保保')),
  headers: [...document.querySelectorAll('.roster thead th')].map((header) => header.textContent.trim().replace(/\s+/g, ' ')),
  zhuYuanzhangCells: [...[...document.querySelectorAll('#rows tr[data-id]')].find((row) => row.querySelector('.name')?.textContent.trim() === '朱元璋')?.children || []].map((cell) => cell.textContent.trim().replace(/\s+/g, ' ')),
}));
check(noScriptHome.archiveHref === 'people-archive.html' && noScriptHome.archiveNotice.includes('完整人物名录'), 'people.html noscript content must link visitors to the static archive', noScriptHome);
check(noScript.title.includes('人物静态名录') && noScript.scripts === 0 && noScript.table !== 'none', 'no-script archive must be directly readable without JavaScript', noScript);
check(noScript.rows === 175 && noScript.hasYuQian && noScript.hasFuShan && noScript.hasWangBaobao, 'no-script archive must keep all 175 people readable', noScript);
const noScriptCellsByHeader = Object.fromEntries(noScript.headers.map((header, index) => [header, noScript.zhuYuanzhangCells[index] || '']));
const childrenHeader = noScript.headers.find((header) => header.startsWith('本人子女数量')) || '';
check(noScript.headers.length === 15 && noScript.zhuYuanzhangCells.length === noScript.headers.length, 'no-script archive rows must match the build-time table column count', noScript);
check(noScriptCellsByHeader['家乡 / 世系']?.includes('濠州钟离'), 'no-script archive lineage data must follow the real lineage header', noScript);
check(childrenHeader && noScriptCellsByHeader[childrenHeader]?.includes('合计'), 'no-script archive child counts must follow the real child-count header', noScript);
} finally {
  await noScriptContext.close();
  noScriptContext = undefined;
}

const responsiveAudits = [];
for (const viewportSize of [
  { label: 'desktop', width: 1440, height: 1000 },
  { label: 'tablet', width: 768, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
]) {
  await page.setViewportSize({ width: viewportSize.width, height: viewportSize.height });
  await page.goto(url('people.html'), { waitUntil: 'networkidle' });
  const beforeScroll = await page.evaluate(() => {
    const viewport = document.querySelector('#peopleTimelineView');
    const style = getComputedStyle(viewport);
    return {
      clientWidth: viewport.clientWidth,
      scrollWidth: viewport.scrollWidth,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      bodyWidth: document.body.scrollWidth,
      innerWidth,
    };
  });
  check(
    beforeScroll.scrollWidth > beforeScroll.clientWidth
      && beforeScroll.overflowX === 'auto'
      && beforeScroll.overflowY === 'hidden'
      && beforeScroll.bodyWidth === beforeScroll.innerWidth,
    `${viewportSize.label} timeline must scroll horizontally without body overflow`,
    beforeScroll,
  );

  const middleTarget = await page.evaluate(() => {
    const viewport = document.querySelector('#peopleTimelineView');
    const expectedMiddle = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollLeft = expectedMiddle;
    const people = [...document.querySelectorAll('[data-timeline-person]')];
    const candidates = people.map((node, targetIndex) => {
      const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      if (!portrait) return null;
      const clickX = portrait.left + portrait.width / 2;
      if (clickX < viewportRect.left + 8 || clickX > viewportRect.right - 8) return null;
      return { node, targetIndex };
    }).filter(Boolean);
    for (const candidate of candidates) {
      const portrait = candidate.node.querySelector('.timeline-portrait').getBoundingClientRect();
      const portraitCenterY = portrait.top + portrait.height / 2;
      window.scrollTo({ top: Math.max(0, window.scrollY + portraitCenterY - innerHeight / 2), behavior: 'instant' });
      const visiblePortrait = candidate.node.querySelector('.timeline-portrait').getBoundingClientRect();
      const clickX = visiblePortrait.left + visiblePortrait.width / 2;
      const clickY = visiblePortrait.top + visiblePortrait.height / 2;
      const hit = document.elementFromPoint(clickX, clickY);
      const select = candidate.node.querySelector('.timeline-person-select');
      if (hit && select?.contains(hit)) {
        return {
          targetIndex: candidate.targetIndex,
          targetName: candidate.node.dataset.timelinePerson,
          hitName: hit.closest('[data-timeline-person]')?.dataset.timelinePerson || '',
          clickX,
          clickY,
          scrollLeft: viewport.scrollLeft,
          expectedMiddle,
        };
      }
    }
    return {
      targetIndex: -1,
      targetName: '',
      hitName: '',
      clickX: null,
      clickY: null,
      scrollLeft: viewport.scrollLeft,
      expectedMiddle,
    };
  });
  check(
    middleTarget.targetIndex >= 0
      && middleTarget.hitName === middleTarget.targetName
      && Number.isFinite(middleTarget.clickX)
      && Number.isFinite(middleTarget.clickY)
      && Math.abs(middleTarget.scrollLeft - middleTarget.expectedMiddle) <= 1,
    `${viewportSize.label} timeline must expose a coordinate-hit person after scrolling to the middle`,
    middleTarget,
  );
  if (middleTarget.targetIndex >= 0) {
    await page.mouse.click(middleTarget.clickX, middleTarget.clickY);
  }
  const middleSelection = await page.evaluate(() => ({
    selected: [...document.querySelectorAll('.timeline-person.is-selected')].map((node) => node.dataset.timelinePerson),
    scrollLeft: document.querySelector('#peopleTimelineView').scrollLeft,
    bodyWidth: document.body.scrollWidth,
    innerWidth,
  }));
  check(
    middleSelection.selected.length === 1
      && middleSelection.selected[0] === middleTarget.targetName
      && Math.abs(middleSelection.scrollLeft - middleTarget.expectedMiddle) <= 1
      && middleSelection.bodyWidth === middleSelection.innerWidth,
    `${viewportSize.label} middle timeline person must remain coordinate-clickable without horizontal auto-scroll or body overflow`,
    { middleTarget, middleSelection },
  );
  responsiveAudits.push({ viewportSize, beforeScroll, middleTarget, middleSelection });
}

await page.setViewportSize({ width: 768, height: 900 });
await page.goto(url('people.html'), { waitUntil: 'networkidle' });
await page.locator('[data-timeline-person="于谦"] .timeline-person-select').click();
await page.locator('[data-timeline-person="于谦"] .timeline-person-open').click();
const tabletArchive = await page.evaluate(() => ({
  pathname: location.pathname,
  drawerOpen: document.querySelector('#drawer')?.classList.contains('open') || false,
  title: document.querySelector('#detail h2')?.textContent.trim() || '',
}));
check(
  tabletArchive.pathname.endsWith('/people.html') && tabletArchive.drawerOpen && tabletArchive.title === '于谦',
  '768px archive action must stay on people.html and use the existing drawer',
  tabletArchive,
);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(url('people.html'), { waitUntil: 'networkidle' });
const mobileErrorStart = pageErrors.length;
await page.locator('[data-timeline-person="于谦"] .timeline-person-select').click();
await Promise.all([
  page.waitForURL((target) => target.pathname.endsWith('/people/yu-qian.html')),
  page.locator('[data-timeline-person="于谦"] .timeline-person-open').click(),
]);
const mobileArchiveRoute = await page.evaluate(() => ({
  pathname: location.pathname,
  title: document.querySelector('h1')?.textContent.trim() || '',
  drawer: document.querySelector('#drawer')?.classList.contains('open') || false,
}));
const mobileArchiveErrors = pageErrors.slice(mobileErrorStart);
check(
  mobileArchiveRoute.pathname.endsWith('/people/yu-qian.html')
    && mobileArchiveRoute.title.startsWith('于谦') && !mobileArchiveRoute.drawer
    && mobileArchiveErrors.length === 0,
  '390px 于谦 archive action must route to the independent person page without page errors',
  { mobileArchiveRoute, mobileArchiveErrors },
);

await page.setViewportSize({ width: 1440, height: 500 });
await page.goto(url('people.html'), { waitUntil: 'networkidle' });
const navLayering = await page.evaluate(async () => {
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const nav = document.querySelector('.museum-nav');
  const navTarget = nav?.querySelector('a.active');
  const viewport = document.querySelector('#peopleTimelineView');
  const canvas = document.querySelector('.people-timeline-canvas');
  if (!nav || !navTarget || !viewport || !canvas) return { missing: true };
  const targetRect = navTarget.getBoundingClientRect();
  const target = { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 };
  const viewportRect = viewport.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const maxScrollY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const maxScrollX = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  const candidates = [...document.querySelectorAll('[data-timeline-person]')].map((node) => {
    const avatar = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
    if (!avatar) return null;
    const avatarCanvasX = avatar.left + avatar.width / 2 - canvasRect.left;
    const desiredX = avatarCanvasX - (target.x - viewportRect.left);
    const desiredY = avatar.top + avatar.height / 2 - target.y;
    return { node, desiredX, desiredY };
  }).filter((candidate) => candidate
    && candidate.desiredX >= 0 && candidate.desiredX <= maxScrollX
    && candidate.desiredY >= 0 && candidate.desiredY <= maxScrollY);
  const candidate = candidates[Math.floor(candidates.length / 2)];
  if (!candidate) return { missingCandidate: true, maxScrollX, maxScrollY };
  viewport.scrollLeft = candidate.desiredX;
  window.scrollTo({ top: candidate.desiredY, behavior: 'instant' });
  await nextFrame();
  candidate.node.querySelector('.timeline-person-select').click();
  await nextFrame();
  const avatar = candidate.node.querySelector('.timeline-portrait').getBoundingClientRect();
  const hit = document.elementFromPoint(target.x, target.y);
  return {
    selected: candidate.node.dataset.timelinePerson,
    selectedCoversTarget: target.x >= avatar.left && target.x <= avatar.right
      && target.y >= avatar.top && target.y <= avatar.bottom,
    hitInsideNav: Boolean(hit?.closest('.museum-nav')),
    hitText: hit?.closest('a')?.textContent.trim() || hit?.textContent.trim() || '',
    timelineIsolation: getComputedStyle(document.querySelector('.people-timeline')).isolation,
  };
});
check(
  navLayering.selected && navLayering.selectedCoversTarget
    && navLayering.hitInsideNav && navLayering.timelineIsolation === 'isolate',
  'sticky museum navigation must remain the top hit target above a selected timeline portrait',
  navLayering,
);

const screenshotPaths = {
  desktop: path.join(root, '人物馆_历史长卷_桌面预览.png'),
  mobile: path.join(root, '人物馆_历史长卷_移动端预览.png'),
};
const loadTimelinePortraits = () => page.evaluate(async () => {
  const images = [...document.querySelectorAll('[data-timeline-image]')];
  await Promise.race([
    Promise.all(images.map((image) => new Promise((resolve, reject) => {
      image.loading = 'eager';
      image.fetchPriority = 'auto';
      if (image.complete) {
        if (image.naturalWidth > 0) {
          resolve();
          return;
        }
      }
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', () => reject(new Error(image.currentSrc || image.src)), { once: true });
      if (!image.getAttribute('src') && image.dataset.src) image.src = image.dataset.src;
    }))),
    new Promise((_, reject) => setTimeout(() => reject(new Error('screenshot portrait load timed out')), 15000)),
  ]);
});
const prepareTimelineScreenshot = async () => {
  await loadTimelinePortraits();
  // Chrome's stitched element screenshots can paint an off-screen fixed skip
  // link inside the clip even though it is not focused or visible to visitors.
  await page.addStyleTag({ content: '.skip { visibility: hidden !important; }' });
};
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(url('people.html'), { waitUntil: 'networkidle' });
await prepareTimelineScreenshot();
await page.locator('#peopleTimelineView').screenshot({ path: screenshotPaths.desktop });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(url('people.html'), { waitUntil: 'networkidle' });
await prepareTimelineScreenshot();
await page.locator('#peopleTimelineView').screenshot({ path: screenshotPaths.mobile });
const screenshotStats = Object.fromEntries(await Promise.all(Object.entries(screenshotPaths).map(async ([label, file]) => {
  const stat = await fs.stat(file);
  return [label, { file, bytes: stat.size }];
})));
check(Object.values(screenshotStats).every((item) => item.bytes > 0), 'desktop and mobile timeline screenshots must be non-empty', screenshotStats);

check(pageErrors.length === 0, 'page must not emit JavaScript errors', pageErrors);

if (failures.length) throw new Error(failures.join('\n'));
console.log(`PEOPLE_TIMELINE_PAGE_SUMMARY ${JSON.stringify({
  people: timelineGeometry.count,
  uniquePeople: timelineGeometry.uniqueCount,
  emperorLanePeople: timelineSizingAndLanes.emperors.length,
  axisY: timelineSizingAndLanes.axisY,
  dataLaneGeometry: timelineSizingAndLanes.laneGeometry,
  maximumOverlapRatio: overlapAudit.maximum.ratio,
  maximumOverlapPair: overlapAudit.maximum,
  interactionAudit: {
    audited: interactionAudit.audited,
    unique: interactionAudit.unique,
    laneCounts: interactionAudit.laneCounts,
    sideCounts: interactionAudit.sideCounts,
    failures: interactionAudit.failures.length,
  },
  portraitMetadata: {
    objectPositions: timelineContracts.portraits.filter((portrait) => portrait.objectPosition).length,
    transforms: timelineContracts.portraits.filter((portrait) => portrait.transform).length,
    transformOrigins: timelineContracts.portraits.filter((portrait) => portrait.transformOrigin).length,
  },
  tabletArchive,
  mobileArchiveRoute,
  navLayering,
  responsive: responsiveAudits.map((audit) => ({
    label: audit.viewportSize.label,
    viewportWidth: audit.viewportSize.width,
    timelineClientWidth: audit.beforeScroll.clientWidth,
    timelineScrollWidth: audit.beforeScroll.scrollWidth,
    bodyWidth: audit.beforeScroll.bodyWidth,
    innerWidth: audit.beforeScroll.innerWidth,
    hitName: audit.middleTarget.hitName,
    expectedMiddle: audit.middleTarget.expectedMiddle,
    scrollLeftBeforeClick: audit.middleTarget.scrollLeft,
    scrollLeftAfterClick: audit.middleSelection.scrollLeft,
    selected: audit.middleSelection.selected,
  })),
  noScript: { rows: noScript.rows, table: noScript.table, timeline: noScript.timeline },
  screenshots: screenshotStats,
})}`);
console.log(`People timeline page verified: 175 unique people, geometry, lanes, responsive scrolling, no-JS archive, and screenshots (${responsiveAudits.length} viewports).`);
} finally {
  try {
    if (noScriptContext) await noScriptContext.close();
  } finally {
    if (browser) await browser.close();
  }
}
