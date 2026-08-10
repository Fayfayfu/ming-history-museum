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

const yuqian = page.locator('[data-timeline-person="于谦"]');
const yuqianBefore = await yuqian.evaluate((node) => ({ left: node.style.left, top: node.style.top }));
await yuqian.locator('.timeline-person-select').click();
const yuqianSelected = await yuqian.evaluate((node) => ({
  selected: node.classList.contains('is-selected'),
  selectedCount: document.querySelectorAll('.timeline-person.is-selected').length,
  pressed: node.querySelector('.timeline-person-select')?.getAttribute('aria-pressed'),
  zIndex: Number(getComputedStyle(node).zIndex),
  left: node.style.left,
  top: node.style.top,
  openHidden: node.querySelector('.timeline-person-open')?.hidden,
}));
check(
  yuqianSelected.selected && yuqianSelected.selectedCount === 1 && yuqianSelected.pressed === 'true'
    && yuqianSelected.zIndex >= 1000 && !yuqianSelected.openHidden
    && yuqianSelected.left === yuqianBefore.left && yuqianSelected.top === yuqianBefore.top,
  'selecting 于谦 must elevate one stable node and reveal its archive action',
  yuqianSelected,
);
await yuqian.locator('.timeline-person-open').click();
check((await page.locator('#detail h2').textContent())?.trim() === '于谦', 'timeline archive action must open 于谦 drawer');

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

check(pageErrors.length === 0, 'page must not emit JavaScript errors', pageErrors);
await browser.close();

if (failures.length) throw new Error(failures.join('\n'));
console.log('People timeline page verified: default timeline, table switch, queries, fallback, and hall isolation.');
