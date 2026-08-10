import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, executablePath: chrome });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const url = (file) => `file://${path.join(root, file)}`;
const failures = [];
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};

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
  };
});
check(initial.view === 'timeline', 'people.html must default to timeline view', initial);
check(initial.timeline !== 'none' && initial.timeline !== 'missing', 'timeline must be visible by default', initial);
check(initial.table === 'none', 'table must be hidden by default', initial);
check(initial.timelineSelected === 'true' && initial.timelineTabIndex === '0', 'timeline tab must be selected and keyboard reachable', initial);
check(initial.tableSelected === 'false' && initial.tableTabIndex === '-1', 'table tab must be unselected', initial);
check(initial.timelineControls === 'peopleTimelineView' && initial.tableControls === 'peopleTableView' && initial.controlledPanelsExist, 'tabs must control existing panels', initial);
check(initial.timelineLabelled === 'peopleTimelineTab' && initial.tableLabelled === 'peopleTableTab', 'panels must reference their real tabs', initial);

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
  const boundaries = [...document.querySelectorAll('.timeline-boundary time')].map((node) => node.getAttribute('datetime'));
  return {
    count: nodes.length,
    uniqueCount: new Set(nodes.map((node) => node.dataset.timelinePerson)).size,
    people,
    boundaries,
  };
});
const anchorExpectations = { '于谦': 1421, '王守仁': 1499, '张居正': 1547 };
check(
  timelineGeometry.count === 163 && timelineGeometry.uniqueCount === 163,
  'timeline must render exactly 163 uniquely named people',
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
  timelineGeometry.boundaries.filter((year) => year === '1368').length === 1
    && timelineGeometry.boundaries.filter((year) => year === '1644').length === 1
    && timelineGeometry.boundaries.length === 2,
  'timeline must render one 1368 boundary and one 1644 boundary',
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
  const laneLabels = Object.fromEntries([...document.querySelectorAll('.timeline-lane-label')].map((node) => {
    const laneClass = [...node.classList].find((name) => name.startsWith('timeline-lane-label--')) || '';
    return [laneClass.replace('timeline-lane-label--', ''), node.getBoundingClientRect().top + node.getBoundingClientRect().height / 2 - canvas.top];
  }));
  const goldProbe = document.createElement('span');
  goldProbe.style.color = '#d0a743';
  document.body.append(goldProbe);
  const gold = getComputedStyle(goldProbe).color;
  goldProbe.remove();
  return {
    emperors: [...document.querySelectorAll('.timeline-person.size-emperor')].map(portraitSnapshot),
    featured: [...document.querySelectorAll('.timeline-person.size-featured')].map(portraitSnapshot),
    standard: [...document.querySelectorAll('.timeline-person.size-standard')].map(portraitSnapshot),
    gold,
    axisY: axis && canvas ? axis.top + axis.height / 2 - canvas.top : null,
    laneLabels,
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
  'all 16 emperor portraits must be 88px with a gold outline',
  { emperors: timelineSizingAndLanes.emperors, gold: timelineSizingAndLanes.gold },
);
check(
  timelineSizingAndLanes.featured.length === 3
    && timelineSizingAndLanes.featured.map((portrait) => portrait.name).sort().join('|') === ['于谦', '王守仁', '张居正'].sort().join('|')
    && timelineSizingAndLanes.featured.every((portrait) => exactSize(portrait, 72)),
  'the three featured portraits must be exactly the curated 72px anchors',
  timelineSizingAndLanes.featured,
);
check(
  timelineSizingAndLanes.standard.length === 144
    && timelineSizingAndLanes.standard.every((portrait) => portrait.width >= 56 && portrait.height >= 56),
  'all ordinary portraits must be at least 56px',
  timelineSizingAndLanes.standard.filter((portrait) => portrait.width < 56 || portrait.height < 56),
);
const expectedLaneIds = ['children', 'emperor', 'eunuch', 'external', 'independent', 'officials', 'women'];
const { laneLabels, axisY } = timelineSizingAndLanes;
check(
  timelineSizingAndLanes.unmappedLanePeople.length === 0
    && timelineSizingAndLanes.invalidLayerPeople.length === 0
    && timelineSizingAndLanes.representedLanes.join('|') === expectedLaneIds.join('|')
    && expectedLaneIds.every((lane) => Number.isFinite(laneLabels[lane])),
  'every timeline person and lane label must map to one of seven semantic swimlanes',
  timelineSizingAndLanes,
);
check(
  laneLabels.women < laneLabels.children
    && laneLabels.children < laneLabels.emperor
    && laneLabels.emperor < axisY
    && axisY < laneLabels.eunuch
    && laneLabels.eunuch < laneLabels.officials
    && laneLabels.officials < laneLabels.independent
    && laneLabels.independent < laneLabels.external,
  'swimlanes must retain their top-to-axis and axis-to-bottom order',
  { axisY, laneLabels },
);
check(!timelineSizingAndLanes.containsRecentEmperor, 'people page must not contain the phrase 最近皇帝');

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
  return {
    avatarLeft: avatar.left - canvas.left,
    avatarTop: avatar.top - canvas.top,
    transform: getComputedStyle(node).transform,
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
}));
check(
  yuqianSelected.selected && yuqianSelected.selectedCount === 1 && yuqianSelected.pressed === 'true'
    && yuqianSelected.zIndex >= 1000 && !yuqianSelected.openHidden
    && yuqianSelected.avatarLeft === yuqianBefore.avatarLeft && yuqianSelected.avatarTop === yuqianBefore.avatarTop
    && yuqianSelected.transform === yuqianBefore.transform,
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

const portraitLoad = await page.evaluate(async () => {
  const images = [...document.querySelectorAll('[data-timeline-image]')];
  await Promise.race([
    Promise.all(images.map((image) => new Promise((resolve, reject) => {
      image.loading = 'eager';
      if (image.complete) {
        if (image.naturalWidth > 0) resolve();
        else reject(new Error(image.currentSrc || image.src));
        return;
      }
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', () => reject(new Error(image.currentSrc || image.src)), { once: true });
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
  const errored = new Promise((resolve) => image.addEventListener('error', resolve, { once: true }));
  image.src = 'assets/does-not-exist-timeline-test.png';
  await errored;
  return {
    imageHidden: image.hidden,
    sourceHidden: person.querySelector('[data-timeline-image-source]')?.hidden,
    fallbackVisible: getComputedStyle(person.querySelector('[data-timeline-fallback]')).display !== 'none',
  };
});
check(
  !portraitFallback.missing && portraitFallback.imageHidden && portraitFallback.sourceHidden && portraitFallback.fallbackVisible,
  'a failed timeline portrait must hide image and source while exposing the initial fallback',
  portraitFallback,
);
await yuqian.locator('.timeline-person-select').click();
check(await yuqian.evaluate((node) => node.classList.contains('is-selected')), 'portrait fallback node must remain selectable');

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
}));
const eventsHtml = await fs.readFile(path.join(root, 'events.html'), 'utf8');
check(eventsView.timeline === 0 && eventsView.viewButtons === 0 && !eventsView.peopleView && eventsView.clientApi === 'undefined', 'events.html must not initialize the people timeline', eventsView);
check(!eventsHtml.includes('.people-timeline{'), 'events.html must not load people timeline styles');

const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
const noScriptPage = await noScriptContext.newPage();
await noScriptPage.goto(url('people.html'), { waitUntil: 'load' });
const noScript = await noScriptPage.evaluate(() => ({
  tabs: document.querySelector('.people-view-tabs') ? getComputedStyle(document.querySelector('.people-view-tabs')).display : 'missing',
  timeline: document.querySelector('#peopleTimelineView') ? getComputedStyle(document.querySelector('#peopleTimelineView')).display : 'missing',
  table: getComputedStyle(document.querySelector('.tablewrap')).display,
  rows: document.querySelectorAll('#rows tr[data-id]').length,
  hasYuQian: [...document.querySelectorAll('#rows tr[data-id]')].some((row) => row.textContent.includes('于谦')),
  headers: [...document.querySelectorAll('.roster thead th')].map((header) => header.textContent.trim().replace(/\s+/g, ' ')),
  zhuYuanzhangCells: [...[...document.querySelectorAll('#rows tr[data-id]')].find((row) => row.querySelector('.name')?.textContent.trim() === '朱元璋')?.children || []].map((cell) => cell.textContent.trim().replace(/\s+/g, ' ')),
  legacySections: [...document.querySelectorAll('.people-page>.shell>.timeline,.people-page>.shell>.toolbar,.people-page>.shell>.statusline,.people-page>.shell>.tablewrap,.people-page>.shell>.method')].map((section) => getComputedStyle(section).display),
}));
check(noScript.tabs === 'none' && noScript.timeline === 'none', 'no-script fallback must hide timeline controls and canvas', noScript);
check(noScript.table !== 'none' && noScript.legacySections.length === 5 && noScript.legacySections.every((display) => display !== 'none'), 'no-script fallback must expose the complete legacy roster', noScript);
check(noScript.rows === 163 && noScript.hasYuQian, 'no-script fallback must keep all 163 people readable', noScript);
const noScriptCellsByHeader = Object.fromEntries(noScript.headers.map((header, index) => [header, noScript.zhuYuanzhangCells[index] || '']));
const childrenHeader = noScript.headers.find((header) => header.startsWith('本人子女数量')) || '';
check(noScript.headers.length === 15 && noScript.zhuYuanzhangCells.length === noScript.headers.length, 'no-script rows must match the build-time table column count', noScript);
check(noScriptCellsByHeader['家乡 / 世系']?.includes('濠州钟离'), 'no-script lineage data must follow the real lineage header', noScript);
check(childrenHeader && noScriptCellsByHeader[childrenHeader]?.includes('合计'), 'no-script child counts must follow the real child-count header', noScript);
await noScriptContext.close();

const responsiveAudits = [];
for (const viewportSize of [
  { label: 'desktop', width: 1440, height: 1000 },
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
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    const viewportRect = viewport.getBoundingClientRect();
    const people = [...document.querySelectorAll('[data-timeline-person]')];
    const targetIndex = people.findIndex((node) => {
      const portrait = node.querySelector('.timeline-portrait')?.getBoundingClientRect();
      if (!portrait) return false;
      const x = portrait.left + portrait.width / 2;
      return x >= viewportRect.left + 8 && x <= viewportRect.right - 8;
    });
    return {
      targetIndex,
      targetName: targetIndex >= 0 ? people[targetIndex].dataset.timelinePerson : '',
      scrollLeft: viewport.scrollLeft,
      expectedMiddle: (viewport.scrollWidth - viewport.clientWidth) / 2,
    };
  });
  check(
    middleTarget.targetIndex >= 0 && Math.abs(middleTarget.scrollLeft - middleTarget.expectedMiddle) <= 1,
    `${viewportSize.label} timeline must expose a clickable person after scrolling to the middle`,
    middleTarget,
  );
  if (middleTarget.targetIndex >= 0) {
    await page.locator('[data-timeline-person]').nth(middleTarget.targetIndex).locator('.timeline-person-select').click();
  }
  const middleSelection = await page.evaluate(() => ({
    selected: [...document.querySelectorAll('.timeline-person.is-selected')].map((node) => node.dataset.timelinePerson),
    bodyWidth: document.body.scrollWidth,
    innerWidth,
  }));
  check(
    middleSelection.selected.length === 1
      && middleSelection.selected[0] === middleTarget.targetName
      && middleSelection.bodyWidth === middleSelection.innerWidth,
    `${viewportSize.label} middle timeline person must remain clickable without body overflow`,
    { middleTarget, middleSelection },
  );
  responsiveAudits.push({ viewportSize, beforeScroll, middleTarget, middleSelection });
}

const screenshotPaths = {
  desktop: path.join(root, '人物馆_历史长卷_桌面预览.png'),
  mobile: path.join(root, '人物馆_历史长卷_移动端预览.png'),
};
const loadTimelinePortraits = () => page.evaluate(async () => {
  const images = [...document.querySelectorAll('[data-timeline-image]')];
  await Promise.all(images.map((image) => new Promise((resolve, reject) => {
    image.loading = 'eager';
    if (image.complete) {
      if (image.naturalWidth > 0) resolve();
      else reject(new Error(image.currentSrc || image.src));
      return;
    }
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', () => reject(new Error(image.currentSrc || image.src)), { once: true });
  })));
});
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(url('people.html'), { waitUntil: 'networkidle' });
await loadTimelinePortraits();
await page.locator('#peopleTimelineView').screenshot({ path: screenshotPaths.desktop });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(url('people.html'), { waitUntil: 'networkidle' });
await loadTimelinePortraits();
await page.locator('#peopleTimelineView').screenshot({ path: screenshotPaths.mobile });
const screenshotStats = Object.fromEntries(await Promise.all(Object.entries(screenshotPaths).map(async ([label, file]) => {
  const stat = await fs.stat(file);
  return [label, { file, bytes: stat.size }];
})));
check(Object.values(screenshotStats).every((item) => item.bytes > 0), 'desktop and mobile timeline screenshots must be non-empty', screenshotStats);

check(pageErrors.length === 0, 'page must not emit JavaScript errors', pageErrors);
await browser.close();

if (failures.length) throw new Error(failures.join('\n'));
console.log(`PEOPLE_TIMELINE_PAGE_SUMMARY ${JSON.stringify({
  people: timelineGeometry.count,
  uniquePeople: timelineGeometry.uniqueCount,
  maximumOverlapRatio: overlapAudit.maximum.ratio,
  maximumOverlapPair: overlapAudit.maximum,
  responsive: responsiveAudits.map((audit) => ({
    label: audit.viewportSize.label,
    viewportWidth: audit.viewportSize.width,
    timelineClientWidth: audit.beforeScroll.clientWidth,
    timelineScrollWidth: audit.beforeScroll.scrollWidth,
    bodyWidth: audit.beforeScroll.bodyWidth,
    innerWidth: audit.beforeScroll.innerWidth,
    selected: audit.middleSelection.selected,
  })),
  noScript: { rows: noScript.rows, table: noScript.table, timeline: noScript.timeline },
  screenshots: screenshotStats,
})}`);
console.log(`People timeline page verified: 163 unique people, geometry, lanes, responsive scrolling, no-JS fallback, and screenshots (${responsiveAudits.length} viewports).`);
