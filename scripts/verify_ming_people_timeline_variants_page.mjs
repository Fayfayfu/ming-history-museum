import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const screenshotPath = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/人物馆_历史长卷_B版.png');
const screenshotAlreadyExists = await fs.access(screenshotPath).then(() => true, () => false);
const b2ScreenshotPath = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/人物馆_历史长卷_B2版.png');
const cScreenshotPaths = Object.freeze({
  closed: path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/C版_收拢.png'),
  opening: path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/C版_展开中.png'),
  open: path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/C版_展开后.png'),
});
let cPageUrl = '';
const cServerLifecycle = { started: false, closed: false, port: 0 };
const cStage = (name) => console.error(`[C ritual] ${name}`);
const failures = [];
const verifiedVariants = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};
const sameStyle = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const contentTypeFor = (file) => ({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
})[path.extname(file)] || 'application/octet-stream';

async function startCServer() {
  const server = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const requested = path.resolve(root, `.${pathname}`);
    if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    try {
      const body = await fs.readFile(requested);
      response.writeHead(200, { 'content-type': contentTypeFor(requested), 'cache-control': 'no-store' }).end(body);
    } catch (_) {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('C verifier server did not receive a TCP port');
  cPageUrl = `http://127.0.0.1:${address.port}/people-timeline-c.html`;
  cServerLifecycle.started = true;
  cServerLifecycle.port = address.port;
  cStage(`server:start:${address.port}`);
  return server;
}

async function stopCServer(server) {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  cServerLifecycle.closed = true;
  cStage(`server:closed:${cServerLifecycle.port}`);
}

async function captureTableStyles(page) {
  return page.evaluate(() => {
    const read = (selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      return { color: style.color, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage };
    };
    return Object.fromEntries([
      ['body', read('body')],
      ['mastSmall', read('.mast h1 small')],
      ['lede', read('.lede')],
      ['scope', read('.scope')],
      ['scopeBold', read('.scope b')],
      ['stat', read('.stat')],
      ['statLabel', read('.stat span')],
      ['statStrong', read('.stat:nth-child(2) strong')],
      ['toolbar', read('.toolbar')],
      ['statusline', read('.statusline')],
      ['tablewrap', read('.tablewrap')],
      ['tableHead', read('.roster thead th')],
      ['tableRow', read('.roster tbody tr')],
      ['method', read('.method')],
    ]);
  });
}

async function captureDrawerStyles(page) {
  return page.evaluate(() => {
    const read = (selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      return { color: style.color, backgroundColor: style.backgroundColor, borderColor: style.borderColor };
    };
    return Object.fromEntries([
      ['panel', read('.panel')],
      ['panelHeading', read('.panel h2')],
      ['fact', read('.fact')],
      ['factLabel', read('.fact span')],
      ['identity', read('.identity')],
      ['close', read('.close')],
    ]);
  });
}

async function capturePageStyles(page) {
  return page.evaluate(() => {
    const read = (selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      return { color: style.color, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage };
    };
    return Object.fromEntries([
      ['body', read('body')],
      ['mast', read('.mast')],
      ['lede', read('.lede')],
      ['scope', read('.scope')],
      ['stat', read('.stat')],
      ['tabs', read('.people-view-tabs')],
    ]);
  });
}

async function captureB2StageStyles(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('#peopleTimelineView');
    const timeline = document.querySelector('.people-timeline');
    const canvas = document.querySelector('.people-timeline-canvas');
    const rollers = [...document.querySelectorAll('[data-scroll-roller]')];
    return {
      background: stage ? getComputedStyle(stage).backgroundImage : '',
      color: stage ? getComputedStyle(stage).color : '',
      cursor: stage ? getComputedStyle(stage).cursor : '',
      stageInk: stage ? getComputedStyle(stage).getPropertyValue('--b2-stage-ink').trim() : '',
      maskPointerEvents: timeline ? [getComputedStyle(timeline, '::before').pointerEvents, getComputedStyle(timeline, '::after').pointerEvents] : [],
      rollerPointerEvents: rollers.map((roller) => getComputedStyle(roller).pointerEvents),
      stage: timeline?.dataset.scrollStage || '',
      ritualControlCount: document.querySelectorAll('[data-scroll-ritual],[data-scroll-unfurl],[data-scroll-skip],[data-scroll-replay]').length,
      canvasTransform: canvas ? getComputedStyle(canvas).transform : '',
    };
  });
}

async function captureB2Geometry(page) {
  return page.evaluate(() => {
    const timeline = document.querySelector('.people-timeline');
    const stage = document.querySelector('#peopleTimelineView');
    const portrait = document.querySelector('.timeline-portrait');
    const portraitBox = portrait?.getBoundingClientRect();
    const stageBox = stage?.getBoundingClientRect();
    const verticallyVisible = (element) => {
      const box = element?.getBoundingClientRect();
      return Boolean(stageBox && box && box.top >= stageBox.top && box.bottom <= stageBox.bottom);
    };
    const peopleVisibility = [...document.querySelectorAll('[data-timeline-person]')].map((person) => ({
      name: person.dataset.timelinePerson || '',
      avatar: verticallyVisible(person.querySelector('.timeline-portrait')),
      nameLabel: verticallyVisible(person.querySelector('strong')),
      identity: verticallyVisible(person.querySelector('small')),
    }));
    const hiddenPeople = peopleVisibility.filter((person) => !person.avatar || !person.nameLabel || !person.identity);
    const bottomSamples = peopleVisibility.filter((person) => ['张士诚', '李自成', '李舜臣'].includes(person.name));
    return {
      componentHeight: timeline?.getBoundingClientRect().height || 0,
      stageHeight: stage?.getBoundingClientRect().height || 0,
      stageClientHeight: stage?.clientHeight || 0,
      stageScrollHeight: stage?.scrollHeight || 0,
      stageOverflowY: stage ? getComputedStyle(stage).overflowY : '',
      portraitWidth: portraitBox?.width || 0,
      portraitHeight: portraitBox?.height || 0,
      scrollWidth: stage?.scrollWidth || 0,
      clientWidth: stage?.clientWidth || 0,
      personCount: peopleVisibility.length,
      hiddenPeople,
      bottomSamples,
    };
  });
}

async function captureB2Readability(page) {
  return page.evaluate(() => {
    const parseColor = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (rgb) => rgb.map((value) => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (foreground, background) => (Math.max(luminance(foreground), luminance(background)) + .05) / (Math.min(luminance(foreground), luminance(background)) + .05);
    const stageSurface = [56, 50, 38];
    const read = (selector) => parseColor(getComputedStyle(document.querySelector(selector)).color);
    const strong = read('.timeline-person strong');
    const small = read('.timeline-person small');
    const tick = read('.timeline-tick');
    const boundary = read('.timeline-boundary time');
    return {
      stageSurface,
      strong: { color: strong, contrast: contrast(strong, stageSurface) },
      small: { color: small, contrast: contrast(small, stageSurface) },
      tick: { color: tick, contrast: contrast(tick, stageSurface) },
      boundary: { color: boundary, contrast: contrast(boundary, stageSurface) },
    };
  });
}

async function captureB2ControlAudit(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('#peopleTimelineView');
    const tabs = document.querySelector('.people-view-tabs');
    const initialWindowY = window.scrollY;
    window.scrollTo({ top: Math.max(0, (stage?.getBoundingClientRect().top || 0) + window.scrollY) });
    const rect = (element) => {
      const box = element?.getBoundingClientRect();
      return box ? { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height } : null;
    };
    const intersects = (left, right) => Boolean(left && right && left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top);
    const capture = (scrollLeft) => {
      stage.scrollLeft = scrollLeft;
      const stageRect = rect(stage);
      const tabsRect = rect(tabs);
      const clipToStage = (box) => {
        if (!box || !stageRect || !intersects(box, stageRect)) return null;
        return {
          left: Math.max(box.left, stageRect.left),
          top: Math.max(box.top, stageRect.top),
          right: Math.min(box.right, stageRect.right),
          bottom: Math.min(box.bottom, stageRect.bottom),
        };
      };
      const personOverlaps = [...document.querySelectorAll('[data-timeline-person]')].flatMap((person) => [
        ['avatar', person.querySelector('.timeline-portrait')],
        ['nameLabel', person.querySelector('strong')],
        ['identity', person.querySelector('small')],
      ].filter(([, element]) => intersects(tabsRect, clipToStage(rect(element)))).map(([part]) => ({ name: person.dataset.timelinePerson || '', part })));
      const tabHits = [...tabs.querySelectorAll('button')].map((button) => {
        const buttonRect = rect(button);
        const hit = buttonRect ? document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2) : null;
        return { id: button.id, hitId: hit?.closest('button')?.id || '' };
      });
      const visiblePerson = [...document.querySelectorAll('[data-timeline-person]')].find((person) => {
        const avatar = rect(person.querySelector('.timeline-portrait'));
        return Boolean(stageRect && avatar && avatar.left >= stageRect.left && avatar.right <= stageRect.right && avatar.top >= 80 && avatar.bottom <= innerHeight);
      });
      const avatarRect = rect(visiblePerson?.querySelector('.timeline-portrait'));
      const hit = avatarRect ? document.elementFromPoint(avatarRect.left + avatarRect.width / 2, avatarRect.top + avatarRect.height / 2) : null;
      return {
        scrollLeft: stage.scrollLeft,
        tabsRect,
        stageRect,
        tabsIntersectStage: intersects(tabsRect, stageRect),
        personOverlaps,
        tabHits,
        personHit: { expected: visiblePerson?.dataset.timelinePerson || '', actual: hit?.closest('[data-timeline-person]')?.dataset.timelinePerson || '', tag: hit?.tagName || '' },
      };
    };
    const initial = capture(0);
    const scrolled = capture(Math.min(660, Math.max(1, stage.scrollWidth - stage.clientWidth)));
    stage.scrollLeft = 0;
    const result = { initial, scrolled };
    window.scrollTo({ top: initialWindowY });
    return result;
  });
}

async function verifyB2(page, currentPage) {
  await page.goto(`file://${path.join(root, 'people-timeline-b2.html')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-scroll-stage="framed"] [data-scroll-drag-surface]');
  const pagePalette = await capturePageStyles(page);
  const currentTimeline = await capturePageStyles(currentPage);
  const stagePalette = await captureB2StageStyles(page);
  const geometry = await captureB2Geometry(page);
  const readability = await captureB2Readability(page);
  const controls = await captureB2ControlAudit(page);
  check(sameStyle(pagePalette, currentTimeline), 'B2 outer page must keep current palette', { pagePalette, currentTimeline });
  check(stagePalette.background.includes('radial-gradient'), 'B2 must darken only its framed timeline', stagePalette);
  check(stagePalette.color === 'rgb(238, 230, 211)', 'B2 timeline text must use light ink', stagePalette);
  check(stagePalette.stage === 'framed' && stagePalette.ritualControlCount === 0, 'B2 must use framed stage with no C ritual controls', stagePalette);
  check(stagePalette.cursor === 'grab' && stagePalette.stageInk === '#171611', 'B2 framed stage must expose the approved grab surface', stagePalette);
  check(stagePalette.maskPointerEvents.every((value) => value === 'none') && stagePalette.rollerPointerEvents.length === 2 && stagePalette.rollerPointerEvents.every((value) => value === 'none'), 'B2 masks and rollers must not capture pointers', stagePalette);
  check(stagePalette.canvasTransform === 'none', 'B2 must not scale the timeline canvas', stagePalette);
  check(geometry.componentHeight <= 1000, 'B2 component height must stay within 1000px', geometry);
  check(geometry.stageScrollHeight <= geometry.stageClientHeight && geometry.stageOverflowY === 'hidden', 'B2 stage must fit its full canvas with no usable vertical scroll', geometry);
  check(geometry.personCount === 163 && geometry.hiddenPeople.length === 0, 'B2 must fully show every avatar, name, and identity within the stage', geometry);
  check(geometry.bottomSamples.length === 3 && geometry.bottomSamples.every((person) => person.avatar && person.nameLabel && person.identity), 'B2 bottom people must remain fully visible', geometry.bottomSamples);
  check([controls.initial, controls.scrolled].every((audit) => !audit.tabsIntersectStage && audit.personOverlaps.length === 0), 'B2 tabs must not overlap the stage or any avatar, name, or identity at either scroll position', controls);
  check([controls.initial, controls.scrolled].every((audit) => audit.tabHits.every((hit) => hit.id === hit.hitId) && audit.personHit.expected && audit.personHit.expected === audit.personHit.actual), 'B2 tabs and visible people must both win elementFromPoint hit testing at either scroll position', controls);
  check(Math.abs(geometry.portraitWidth - geometry.portraitHeight) <= 1, 'B2 portraits must remain circular', geometry);
  check(geometry.scrollWidth > geometry.clientWidth, 'B2 long scroll must retain horizontal overflow', geometry);
  check(Object.values(readability).filter((value) => value?.contrast).every((item) => item.contrast >= 4.5), 'B2 timeline text must meet 4.5:1 contrast against its brightest stage surface', readability);
  check(readability.boundary.contrast >= 4.5, 'B2 12px boundary text must meet 4.5:1 contrast against its brightest stage surface', readability.boundary);

  await page.locator('#peopleTableTab').click();
  await currentPage.locator('#peopleTableTab').click();
  await page.waitForSelector('.tablewrap:not([hidden])');
  await currentPage.waitForSelector('.tablewrap:not([hidden])');
  const table = await captureTableStyles(page);
  const currentTable = await captureTableStyles(currentPage);
  check(sameStyle(table, currentTable), 'B2 table view must retain current page colors', { table, currentTable });
  await page.locator('#peopleTimelineTab').click();
  await currentPage.locator('#peopleTimelineTab').click();
  await page.waitForSelector('[data-scroll-drag-surface]');
  await currentPage.waitForSelector('#peopleTimelineView');

  const surface = page.locator('[data-scroll-drag-surface]');
  const box = await surface.boundingBox();
  if (!box) throw new Error('B2 drag surface has no bounding box');
  await page.mouse.move(box.x + box.width * .75, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .25, box.y + 10, { steps: 8 });
  await page.mouse.up();
  const drag = await page.evaluate(() => ({ scrollLeft: document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0, dragging: document.querySelector('[data-scroll-drag-surface]')?.dataset.dragging || '' }));
  check(drag.scrollLeft > 0 && drag.dragging === '', 'B2 pointer drag must scroll and clear data-dragging', drag);

  const personName = await page.evaluate(() => {
    const surfaceBounds = document.querySelector('[data-scroll-drag-surface]')?.getBoundingClientRect();
    return [...document.querySelectorAll('[data-timeline-person]')].find((person) => {
      const avatar = person.querySelector('.timeline-portrait')?.getBoundingClientRect();
      return surfaceBounds && avatar && avatar.left >= surfaceBounds.left && avatar.right <= surfaceBounds.right && avatar.top >= surfaceBounds.top && avatar.bottom <= surfaceBounds.bottom;
    })?.dataset.timelinePerson || '';
  });
  check(Boolean(personName), 'B2 drag position must expose a selectable person', { drag });
  let drawer = {};
  let drawerBefore = 0;
  let drawerDuring = 0;
  let drawerAfter = 0;
  if (personName) {
    const person = page.locator(`[data-timeline-person="${personName}"]`);
    await person.locator('.timeline-person-select').click();
    drawerBefore = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
    await person.locator('.timeline-person-open').click();
    await page.waitForSelector('#drawer.open');
    await currentPage.locator('[data-timeline-person="朱元璋"] .timeline-person-select').click();
    await currentPage.locator('[data-timeline-person="朱元璋"] .timeline-person-open').click();
    await currentPage.waitForSelector('#drawer.open');
    drawer = await captureDrawerStyles(page);
    const currentDrawer = await captureDrawerStyles(currentPage);
    check(sameStyle(drawer, currentDrawer), 'B2 drawer paper colors must retain current page colors', { drawer, currentDrawer });
    drawerDuring = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
    check(Math.abs(drawerDuring - drawerBefore) <= 1, 'B2 opening drawer must preserve scrollLeft', { drawerBefore, drawerDuring });
    await page.locator('#close').click();
    await page.waitForFunction(() => !document.querySelector('#drawer')?.classList.contains('open'));
    drawerAfter = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
    check(Math.abs(drawerAfter - drawerBefore) <= 1, 'B2 closing drawer must preserve scrollLeft', { drawerBefore, drawerAfter });
    await currentPage.locator('#close').click();
  }

  const widths = [];
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    widths.push(await page.evaluate(() => ({ width: innerWidth, bodyScrollWidth: document.body.scrollWidth, scrollWidth: document.querySelector('[data-scroll-drag-surface]')?.scrollWidth || 0, clientWidth: document.querySelector('[data-scroll-drag-surface]')?.clientWidth || 0 })));
  }
  check(widths.every((item) => item.bodyScrollWidth === item.width && item.scrollWidth > item.clientWidth), 'B2 must keep body width contained and scroll horizontally at 1440, 768, and 390', widths);
  await page.setViewportSize({ width: 1440, height: 1000 });

  const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  let noJs;
  try {
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto(`file://${path.join(root, 'people-timeline-b2.html')}`, { waitUntil: 'load' });
    noJs = await noJsPage.evaluate(() => ({ tableVisible: getComputedStyle(document.querySelector('.tablewrap')).display !== 'none', scrollVisible: getComputedStyle(document.querySelector('#peopleTimelineView')).display !== 'none' }));
  } finally {
    await noJsContext.close();
  }
  check(noJs.tableVisible && !noJs.scrollVisible, 'B2 no-JS fallback must show the table and hide the long scroll', noJs);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0 }));
  await page.locator('.museum-nav').evaluate((nav) => { nav.style.visibility = 'hidden'; });
  try {
    await page.locator('.people-timeline').screenshot({ path: b2ScreenshotPath });
  } finally {
    await page.locator('.museum-nav').evaluate((nav) => { nav.style.removeProperty('visibility'); });
  }
  verifiedVariants.push('b2');
  return { pagePalette, currentTimeline, stagePalette, geometry, readability, controls, drag, table, drawer, drawerBefore, drawerDuring, drawerAfter, widths, noJs, screenshotPath: b2ScreenshotPath };
}

async function verifyA(page) {
  await page.goto(`file://${path.join(root, 'people-timeline-a.html')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-scroll-drag-surface]');
  const beforeDrag = await page.evaluate(() => {
    const surface = document.querySelector('[data-scroll-drag-surface]');
    const timeline = document.querySelector('.people-timeline');
    return {
      scrollHeight: surface?.scrollHeight || 0,
      scrollWidth: surface?.scrollWidth || 0,
      clientWidth: surface?.clientWidth || 0,
      scrollLeft: surface?.scrollLeft || 0,
      hasPrologue: Boolean(document.querySelector('[data-scroll-prologue]')),
      hasEpilogue: Boolean(document.querySelector('[data-scroll-epilogue]')),
      hasStage: Boolean(document.querySelector('[data-scroll-stage]')),
      hasRitual: Boolean(document.querySelector('[data-scroll-ritual]')),
      cursor: surface ? getComputedStyle(surface).cursor : 'missing',
      paper: timeline ? getComputedStyle(timeline).getPropertyValue('--scroll-paper').trim() : '',
    };
  });
  check(beforeDrag.scrollHeight <= 1000, 'A drag surface scrollHeight must be at most 1000', beforeDrag);
  check(beforeDrag.scrollWidth > beforeDrag.clientWidth, 'A drag surface must overflow horizontally', beforeDrag);
  check(beforeDrag.hasPrologue && beforeDrag.hasEpilogue, 'A must include prologue and epilogue', beforeDrag);
  check(!beforeDrag.hasStage && !beforeDrag.hasRitual, 'A must not include B or C shell', beforeDrag);
  check(beforeDrag.cursor === 'grab', 'A drag surface must use grab cursor', beforeDrag);
  check(beforeDrag.paper === '#f5f0e3', 'A must set the approved paper token', beforeDrag);

  const surface = page.locator('[data-scroll-drag-surface]');
  const box = await surface.boundingBox();
  if (!box) throw new Error('A drag surface has no bounding box');
  await page.mouse.move(box.x + box.width * 0.75, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + 10, { steps: 8 });
  await page.mouse.up();
  const afterDrag = await page.evaluate(() => {
    const surface = document.querySelector('[data-scroll-drag-surface]');
    return {
      scrollLeft: surface?.scrollLeft || 0,
      dragging: surface?.dataset.dragging || '',
    };
  });
  check(afterDrag.scrollLeft > beforeDrag.scrollLeft, 'A pointer drag must increase scrollLeft', { beforeDrag, afterDrag });
  check(afterDrag.dragging === '', 'A pointerup must clear data-dragging', afterDrag);

  const peopleHtml = await fs.readFile(path.join(root, 'people.html'), 'utf8');
  check(!peopleHtml.includes('data-scroll-variant="a"'), 'people.html must remain isolated from A variant');
  check(!peopleHtml.includes('data-scroll-drag-surface'), 'people.html must not receive A drag surface');
  verifiedVariants.push('a');
  return { beforeDrag, afterDrag };
}

async function resetC(page) {
  cStage('reset:start');
  await page.goto(cPageUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  cStage('reset:done');
}

async function verifyC(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    cStage('fresh-session:start');
    await resetC(page);
    await page.waitForFunction(() => document.body.dataset.ritualState === 'closed');
    const closed = await page.evaluate(() => ({
      state: document.body.dataset.ritualState,
      focused: document.activeElement?.matches('[data-scroll-unfurl]') || false,
      ritualHidden: document.querySelector('[data-scroll-ritual]')?.hidden,
      replayHidden: document.querySelector('[data-scroll-replay]')?.hidden,
      scrollHeight: document.querySelector('[data-scroll-drag-surface]')?.scrollHeight || 0,
      scrollWidth: document.querySelector('[data-scroll-drag-surface]')?.scrollWidth || 0,
      clientWidth: document.querySelector('[data-scroll-drag-surface]')?.clientWidth || 0,
      stage: Boolean(document.querySelector('[data-scroll-stage]')),
      stageInk: getComputedStyle(document.body).getPropertyValue('--stage-ink').trim(),
      paper: getComputedStyle(document.querySelector('.people-timeline')).getPropertyValue('--scroll-paper').trim(),
      componentHeight: Math.ceil(document.querySelector('.people-timeline')?.getBoundingClientRect().height || 0),
      timelineInert: document.querySelector('[data-scroll-drag-surface]')?.inert || false,
      timelineAriaHidden: document.querySelector('[data-scroll-drag-surface]')?.getAttribute('aria-hidden') || '',
    }));
    check(closed.state === 'closed' && closed.focused && !closed.ritualHidden, 'C fresh session must be closed with focus on 展卷', closed);
    check(closed.replayHidden, 'C must hide replay before opening', closed);
    check(closed.scrollHeight <= 1000 && closed.scrollWidth > closed.clientWidth, 'C must retain A horizontal scroll geometry', closed);
    check(closed.componentHeight <= 1000, 'C closed visible component must be at most 1000px tall', closed);
    check(closed.timelineInert && closed.timelineAriaHidden === 'true', 'C closed timeline must be inert and hidden from assistive technology', closed);
    check(!closed.stage && !closed.stageInk && closed.paper === '#f5f0e3', 'C must retain the bright A structure without B stage', closed);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    check(!await page.evaluate(() => Boolean(document.activeElement?.closest('[data-timeline-person]'))), 'C closed tab sequence must not enter a person control');
    await page.locator('.people-timeline').screenshot({ path: cScreenshotPaths.closed });
    cStage('fresh-session:done');

    cStage('unfurl:start');
    const unfurlStartedAt = Date.now();
    await page.locator('[data-scroll-unfurl]').click();
    await page.waitForFunction(() => document.body.dataset.ritualState === 'opening');
    const opening = await page.evaluate(() => ({ state: document.body.dataset.ritualState, ritualHidden: document.querySelector('[data-scroll-ritual]')?.hidden, active: document.activeElement?.id || '', componentHeight: Math.ceil(document.querySelector('.people-timeline')?.getBoundingClientRect().height || 0), timelineInert: document.querySelector('[data-scroll-drag-surface]')?.inert || false, timelineAriaHidden: document.querySelector('[data-scroll-drag-surface]')?.getAttribute('aria-hidden') || '' }));
    check(opening.state === 'opening' && opening.ritualHidden && opening.active !== 'peopleTimelineView', 'C opening must move focus away from the hidden ritual and inert timeline', opening);
    check(opening.componentHeight <= 1000 && opening.timelineInert && opening.timelineAriaHidden === 'true', 'C opening component must stay compact and inert', opening);
    await page.keyboard.press('Tab');
    check(!await page.evaluate(() => Boolean(document.activeElement?.closest('[data-timeline-person]'))), 'C opening tab sequence must not enter a person control');
    await page.locator('.people-timeline').screenshot({ path: cScreenshotPaths.opening });
    await page.waitForFunction(() => document.body.dataset.ritualState === 'open', undefined, { timeout: 1200 });
    const unfurlElapsedMs = Date.now() - unfurlStartedAt;
    const opened = await page.evaluate(() => ({ state: document.body.dataset.ritualState, ritualHidden: document.querySelector('[data-scroll-ritual]')?.hidden, replayHidden: document.querySelector('[data-scroll-replay]')?.hidden, componentHeight: Math.ceil(document.querySelector('.people-timeline')?.getBoundingClientRect().height || 0), timelineInert: document.querySelector('[data-scroll-drag-surface]')?.inert || false, timelineAriaHidden: document.querySelector('[data-scroll-drag-surface]')?.getAttribute('aria-hidden') || '' }));
    check(opened.state === 'open' && opened.ritualHidden && !opened.replayHidden, 'C must finish within 1200ms and expose replay', opened);
    check(unfurlElapsedMs >= 650 && unfurlElapsedMs <= 1200, 'C unfurl must remain opening for approximately 800ms', { unfurlElapsedMs });
    check(opened.componentHeight <= 1000 && !opened.timelineInert && opened.timelineAriaHidden === '', 'C open component must stay compact and restore timeline accessibility', opened);
    await page.keyboard.press('Tab');
    check(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-timeline-person]'))), 'C open tab sequence must restore person controls');
    await page.locator('.people-timeline').screenshot({ path: cScreenshotPaths.open });
    cStage('unfurl:done');

    cStage('replay-escape:start');
    await page.locator('[data-scroll-replay]').click();
    await page.waitForFunction(() => document.body.dataset.ritualState === 'opening');
    check(await page.evaluate(() => document.body.dataset.ritualState) === 'opening', 'C replay must restart opening');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.body.dataset.ritualState === 'open');
    cStage('replay-escape:done');

    cStage('escape-skip:start');
    await resetC(page);
    await page.locator('[data-scroll-unfurl]').click();
    await page.waitForFunction(() => document.body.dataset.ritualState === 'opening');
    await page.keyboard.press('Escape');
    check(await page.evaluate(() => document.body.dataset.ritualState) === 'open', 'C Escape must finish opening immediately');

    await resetC(page);
    await page.locator('[data-scroll-skip]').click();
    check(await page.evaluate(() => document.body.dataset.ritualState) === 'open', 'C skip must finish opening immediately');
    cStage('escape-skip:done');

    cStage('reduced-session:start');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await resetC(page);
    const reduced = await page.evaluate(() => ({ state: document.body.dataset.ritualState, ritualHidden: document.querySelector('[data-scroll-ritual]')?.hidden }));
    check(reduced.state === 'open' && reduced.ritualHidden, 'C reduced motion must start open', reduced);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await page.evaluate(() => sessionStorage.setItem('ming.peopleTimelineC.opened', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    const remembered = await page.evaluate(() => document.body.dataset.ritualState);
    check(remembered === 'open', 'C opened session must start open', { remembered });
    cStage('reduced-session:done');

    cStage('drag-doubleclick:start');
    const surface = page.locator('[data-scroll-drag-surface]');
    const box = await surface.boundingBox();
    if (!box) throw new Error('C drag surface has no bounding box');
    await page.mouse.move(box.x + box.width * .75, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .25, box.y + 10, { steps: 8 });
    await page.mouse.up();
    const cDrag = await page.evaluate(() => ({ scrollLeft: document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0, dragging: document.querySelector('[data-scroll-drag-surface]')?.dataset.dragging || '' }));
    check(cDrag.scrollLeft > 0 && !cDrag.dragging, 'C must retain shared pointer dragging', cDrag);

    const doubleClickName = await page.evaluate(() => {
      const surfaceBounds = document.querySelector('[data-scroll-drag-surface]')?.getBoundingClientRect();
      return [...document.querySelectorAll('[data-timeline-person]')].find((person) => {
        const avatar = person.querySelector('.timeline-portrait')?.getBoundingClientRect();
        return surfaceBounds && avatar && avatar.left >= surfaceBounds.left && avatar.right <= surfaceBounds.right && avatar.top >= surfaceBounds.top && avatar.bottom <= surfaceBounds.bottom;
      })?.dataset.timelinePerson || '';
    });
    check(Boolean(doubleClickName), 'C drag position must expose an avatar for double-click', { doubleClickName, cDrag });
    if (doubleClickName) {
      const avatar = page.locator(`[data-timeline-person="${doubleClickName}"] .timeline-person-select`);
      const beforeDoubleClick = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
      await avatar.dblclick();
      await page.waitForSelector('#drawer.open');
      const doubleClick = await page.evaluate(() => ({ drawer: document.querySelector('#drawer')?.classList.contains('open') || false, person: new URL(location.href).searchParams.get('person'), scrollLeft: document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0 }));
      check(doubleClick.drawer && doubleClick.person === doubleClickName && Math.abs(doubleClick.scrollLeft - beforeDoubleClick) <= 1, 'C double-click must preserve the shared archive behavior and scroll position', { doubleClickName, beforeDoubleClick, doubleClick });
    }
    cStage('drag-doubleclick:done');

    cStage('no-js:start');
    const noScriptContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
    try {
      const noScriptPage = await noScriptContext.newPage();
      await noScriptPage.goto(cPageUrl, { waitUntil: 'load' });
      const noScript = await noScriptPage.evaluate(() => ({
        ritualHidden: document.querySelector('[data-scroll-ritual]')?.hidden,
        enhanced: document.body.classList.contains('ritual-enhanced'),
        clipPath: getComputedStyle(document.querySelector('#peopleTimelineView')).clipPath,
        opacity: getComputedStyle(document.querySelector('#peopleTimelineView')).opacity,
      }));
      check(noScript.ritualHidden && !noScript.enhanced && noScript.clipPath === 'none' && noScript.opacity === '1', 'C no-JS fallback must keep the full scroll visible with no closed mask', noScript);
    } finally {
      await noScriptContext.close();
    }
    cStage('no-js:done');
    return { closed, opening, opened, reduced, remembered, cDrag, unfurlElapsedMs, screenshots: cScreenshotPaths };
  } finally {
    await context.close();
  }
}

async function verifyCFailOpen(browser, initScript, label) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(initScript);
  try {
    cStage(`${label}:start`);
    const page = await context.newPage();
    await page.goto(cPageUrl, { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => ({
      ritualState: document.body.dataset.ritualState,
      ritualHidden: document.querySelector('[data-scroll-ritual]')?.hidden,
      clipPath: getComputedStyle(document.querySelector('#peopleTimelineView')).clipPath,
      opacity: getComputedStyle(document.querySelector('#peopleTimelineView')).opacity,
    }));
    check(state.ritualState === 'open' && state.ritualHidden && state.clipPath === 'inset(0px)' && state.opacity === '1', `C ${label} must fail open`, state);
    cStage(`${label}:done`);
    return state;
  } finally {
    await context.close();
  }
}

if (process.env.PEOPLE_TIMELINE_C_ONLY === '1') {
  let cOnlyBrowser;
  let cOnlyServer;
  let cOnlyResult;
  try {
    cOnlyServer = await startCServer();
    cOnlyBrowser = await chromium.launch({ headless: true, executablePath: chrome });
    const c = await verifyC(cOnlyBrowser);
    const storageFailure = await verifyCFailOpen(cOnlyBrowser, () => {
      Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value: () => { throw new Error('storage unavailable'); } });
    }, 'storage failure');
    const scriptFailure = await verifyCFailOpen(cOnlyBrowser, () => {
      window.matchMedia = () => { throw new Error('matchMedia unavailable'); };
    }, 'script exception');
    cOnlyResult = { c: { ...c, storageFailure, scriptFailure } };
  } finally {
    await cOnlyBrowser?.close();
    await stopCServer(cOnlyServer);
  }
  if (failures.length) throw new Error(`People timeline C verification failed:\n- ${failures.join('\n- ')}`);
  console.log(JSON.stringify({ status: 'ok', ...cOnlyResult, serverLifecycle: cServerLifecycle }));
  process.exit(0);
}

let browser;
let cServer;
let result;
try {
  cServer = await startCServer();
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const a = await verifyA(page);
  await page.goto(`file://${path.join(root, 'people-timeline-b.html')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-scroll-drag-surface]');
  await page.waitForSelector('.stat strong');
  verifiedVariants.push('b');

  const beforeDrag = await page.evaluate(() => {
    const surface = document.querySelector('[data-scroll-drag-surface]');
    const timeline = document.querySelector('.people-timeline');
    const body = document.body;
    const rollerPointerEvents = [...document.querySelectorAll('[data-scroll-roller]')].map((roller) => getComputedStyle(roller).pointerEvents);
    return {
      scrollHeight: surface?.scrollHeight || 0,
      scrollWidth: surface?.scrollWidth || 0,
      clientWidth: surface?.clientWidth || 0,
      scrollLeft: surface?.scrollLeft || 0,
      stage: document.querySelector('[data-scroll-stage]')?.getAttribute('data-scroll-stage') || '',
      ritualControlCount: document.querySelectorAll('[data-scroll-ritual],[data-scroll-unfurl],[data-scroll-skip],[data-scroll-replay]').length,
      cursor: surface ? getComputedStyle(surface).cursor : 'missing',
      stageInk: getComputedStyle(body).getPropertyValue('--stage-ink').trim(),
      bodyBackground: getComputedStyle(body).backgroundImage,
      paper: surface ? getComputedStyle(surface).backgroundColor : '',
      maskPointerEvents: timeline ? [getComputedStyle(timeline, '::before').pointerEvents, getComputedStyle(timeline, '::after').pointerEvents] : [],
      rollerPointerEvents,
      nav: document.querySelector('.museum-nav') ? {
        height: getComputedStyle(document.querySelector('.museum-nav')).height,
        zIndex: getComputedStyle(document.querySelector('.museum-nav')).zIndex,
      } : null,
    };
  });
  const readability = await page.evaluate(() => {
    const parseColor = (value) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) || [];
      return { rgb: channels.slice(0, 3), alpha: channels[3] ?? 1 };
    };
    const composite = (foreground, background) => foreground.rgb.map((value, index) => Math.round(value * foreground.alpha + background[index] * (1 - foreground.alpha)));
    const luminance = (rgb) => rgb.map((value) => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (foreground, background) => {
      const a = luminance(foreground);
      const b = luminance(background);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    };
    const stageSurface = [56, 50, 38];
    const readText = (selector) => parseColor(getComputedStyle(document.querySelector(selector)).color).rgb;
    const stat = document.querySelector('.stat');
    const statSurface = composite(parseColor(getComputedStyle(stat).backgroundColor), stageSurface);
    const lede = readText('.lede');
    const scope = readText('.scope');
    const scopeBold = readText('.scope b');
    const mastSmall = readText('.mast h1 small');
    const statLabel = readText('.stat span');
    const statStrong = readText('.stat:nth-child(2) strong');
    const firstAccent = readText('.stat:first-child strong');
    const lastAccent = readText('.stat:last-child strong');
    return {
      stageSurface,
      statSurface,
      stageText: {
        lede: { color: lede, contrast: contrast(lede, stageSurface) },
        scope: { color: scope, contrast: contrast(scope, stageSurface) },
        scopeBold: { color: scopeBold, contrast: contrast(scopeBold, stageSurface) },
        mastSmall: { color: mastSmall, contrast: contrast(mastSmall, stageSurface) },
      },
      stats: {
        background: statSurface,
        label: { color: statLabel, contrast: contrast(statLabel, statSurface) },
        strong: { color: statStrong, contrast: contrast(statStrong, statSurface) },
        firstAccent: { color: firstAccent, contrast: contrast(firstAccent, statSurface) },
        lastAccent: { color: lastAccent, contrast: contrast(lastAccent, statSurface) },
      },
    };
  });
  check(beforeDrag.scrollHeight <= 1000, 'B drag surface scrollHeight must be at most 1000', beforeDrag);
  check(beforeDrag.scrollWidth > beforeDrag.clientWidth, 'B drag surface must overflow horizontally', beforeDrag);
  check(beforeDrag.stage === 'immersive', 'B must include the immersive stage shell', beforeDrag);
  check(beforeDrag.ritualControlCount === 0, 'B must not include C ritual controls', beforeDrag);
  check(beforeDrag.cursor === 'grab', 'B drag surface must use grab cursor', beforeDrag);
  check(beforeDrag.stageInk === '#171611' && beforeDrag.bodyBackground.includes('radial-gradient'), 'B body must use the approved dark stage', beforeDrag);
  check(beforeDrag.paper === 'rgb(245, 240, 227)', 'B paper must remain bright against the dark stage', beforeDrag);
  check(beforeDrag.maskPointerEvents.every((value) => value === 'none'), 'B side masks must not capture pointers', beforeDrag);
  check(beforeDrag.rollerPointerEvents.length === 2 && beforeDrag.rollerPointerEvents.every((value) => value === 'none'), 'B rollers must not capture pointers', beforeDrag);
  check(beforeDrag.nav?.height === '54px', 'B secondary navigation must be compact', beforeDrag);
  check(Object.values(readability.stageText).every((item) => item.contrast >= 4.5), 'B stage text must meet 4.5:1 against its brightest stage surface', readability);
  check(readability.stats.label.contrast >= 4.5 && readability.stats.strong.contrast >= 4.5, 'B light stat cards must use readable dark text', readability);
  check(readability.stats.firstAccent.contrast >= 4.5 && readability.stats.lastAccent.contrast >= 4.5, 'B stat accents must remain readable red emphasis', readability);
  check(
    readability.stats.firstAccent.color.join(',') === readability.stats.lastAccent.color.join(',')
      && readability.stats.firstAccent.color.join(',') !== readability.stats.strong.color.join(','),
    'B first and last stat values must retain their distinct red emphasis',
    readability,
  );

  const currentPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await currentPage.goto(`file://${path.join(root, 'people-timeline-current.html')}`, { waitUntil: 'domcontentloaded' });
  await currentPage.waitForSelector('.stat strong');
  const b2Page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const b2 = await verifyB2(b2Page, currentPage);
  await page.locator('#peopleTableTab').click();
  await currentPage.locator('#peopleTableTab').click();
  await page.waitForSelector('.tablewrap:not([hidden])');
  await currentPage.waitForSelector('.tablewrap:not([hidden])');
  const bTable = await captureTableStyles(page);
  const currentTable = await captureTableStyles(currentPage);
  check(sameStyle(bTable, currentTable), 'B table view must restore current page colors', { bTable, currentTable });

  await page.locator('#peopleTimelineTab').click();
  await page.waitForSelector('[data-scroll-drag-surface]');
  const bTimelineAfterTable = await page.evaluate(() => ({
    view: document.body.dataset.peopleView,
    background: getComputedStyle(document.body).backgroundImage,
    color: getComputedStyle(document.body).color,
  }));
  check(
    bTimelineAfterTable.view === 'timeline' && bTimelineAfterTable.background.includes('radial-gradient') && bTimelineAfterTable.color === 'rgb(238, 230, 211)',
    'B timeline must retain its dark stage after table view closes',
    bTimelineAfterTable,
  );

  const surface = page.locator('[data-scroll-drag-surface]');
  const box = await surface.boundingBox();
  if (!box) throw new Error('B drag surface has no bounding box');
  await page.mouse.move(box.x + box.width * 0.75, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + 10, { steps: 8 });
  await page.mouse.up();
  const afterDrag = await page.evaluate(() => {
    const surface = document.querySelector('[data-scroll-drag-surface]');
    return {
      scrollLeft: surface?.scrollLeft || 0,
      dragging: surface?.dataset.dragging || '',
    };
  });
  check(afterDrag.scrollLeft > beforeDrag.scrollLeft, 'B pointer drag must increase scrollLeft', { beforeDrag, afterDrag });
  check(afterDrag.dragging === '', 'pointerup must clear data-dragging', afterDrag);

  const visiblePersonName = await page.evaluate(() => {
    const surface = document.querySelector('[data-scroll-drag-surface]')?.getBoundingClientRect();
    return [...document.querySelectorAll('[data-timeline-person]')].find((person) => {
      const box = person.getBoundingClientRect();
      return surface && box.left >= surface.left && box.right <= surface.right && box.top >= surface.top && box.bottom <= surface.bottom;
    })?.getAttribute('data-timeline-person') || '';
  });
  check(Boolean(visiblePersonName), 'B must expose a person in the current scroll viewport', { afterDrag });
  if (!visiblePersonName) throw new Error('B has no selectable person in the current scroll viewport');
  const visiblePerson = page.locator(`[data-timeline-person="${visiblePersonName}"]`);
  await visiblePerson.locator('.timeline-person-select').click();
  const drawerBefore = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
  await visiblePerson.locator('.timeline-person-open').click();
  await page.waitForSelector('#drawer.open');
  await currentPage.locator('#peopleTimelineTab').click();
  await currentPage.locator('[data-timeline-person="朱元璋"] .timeline-person-select').click();
  await currentPage.locator('[data-timeline-person="朱元璋"] .timeline-person-open').click();
  await currentPage.waitForSelector('#drawer.open');
  const bDrawerContext = await page.evaluate(() => ({
    view: document.body.dataset.peopleView,
    bodyColor: getComputedStyle(document.body).color,
    panelColor: getComputedStyle(document.querySelector('#drawer .panel')).color,
  }));
  const bDrawer = await captureDrawerStyles(page);
  const currentDrawer = await captureDrawerStyles(currentPage);
  check(
    bDrawerContext.view === 'timeline'
      && bDrawerContext.bodyColor === 'rgb(238, 230, 211)'
      && bDrawerContext.panelColor === 'rgb(24, 23, 19)'
      && bDrawerContext.panelColor === currentDrawer.panel.color,
    'B open drawer must keep the timeline stage light text while restoring current ink on its paper panel',
    { bDrawerContext, currentPanelColor: currentDrawer.panel.color },
  );
  check(sameStyle(bDrawer, currentDrawer), 'B drawer paper colors must restore current page colors', { bDrawer, currentDrawer });
  const drawerDuring = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
  check(Math.abs(drawerDuring - drawerBefore) <= 1, 'B opening drawer must preserve scrollLeft', { drawerBefore, drawerDuring });
  await page.locator('#close').click();
  await page.waitForFunction(() => !document.querySelector('#drawer')?.classList.contains('open'));
  const drawerAfter = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
  check(Math.abs(drawerAfter - drawerBefore) <= 1, 'B drawer must preserve scrollLeft', { drawerBefore, drawerAfter });
  const bStageAfterDrawer = await page.evaluate(() => ({ background: getComputedStyle(document.body).backgroundImage, color: getComputedStyle(document.body).color }));
  check(bStageAfterDrawer.background.includes('radial-gradient') && bStageAfterDrawer.color === 'rgb(238, 230, 211)', 'B must restore its dark stage after drawer closes', bStageAfterDrawer);

  const peopleHtml = await fs.readFile(path.join(root, 'people.html'), 'utf8');
  check(!peopleHtml.includes('data-scroll-variant="b"'), 'people.html must remain isolated from B variant');
  check(!peopleHtml.includes('data-scroll-drag-surface'), 'people.html must not receive B drag surface');
  if (!screenshotAlreadyExists) await page.locator('.people-timeline').screenshot({ path: screenshotPath });
  const c = await verifyC(browser);
  const cStorageFailure = await verifyCFailOpen(browser, () => {
    Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value: () => { throw new Error('storage unavailable'); } });
  }, 'storage failure');
  const cScriptFailure = await verifyCFailOpen(browser, () => {
    window.matchMedia = () => { throw new Error('matchMedia unavailable'); };
  }, 'script exception');
  verifiedVariants.push('c');
  result = { status: 'ok', screenshotPath, b2ScreenshotPath, cScreenshotPaths, serverLifecycle: cServerLifecycle, a, b: { beforeDrag, readability, table: bTable, timelineAfterTable: bTimelineAfterTable, afterDrag, drawerContext: bDrawerContext, drawer: bDrawer, drawerBefore, drawerDuring, drawerAfter, stageAfterDrawer: bStageAfterDrawer }, b2, c: { ...c, storageFailure: cStorageFailure, scriptFailure: cScriptFailure }, current: { table: currentTable, drawer: currentDrawer } };
} finally {
  await browser?.close();
  await stopCServer(cServer);
}

check(verifiedVariants.includes('a') && verifiedVariants.includes('b') && verifiedVariants.includes('b2') && verifiedVariants.includes('c'), 'variant page verifier must cover A, B, B2, and C', verifiedVariants);
if (failures.length) throw new Error(`People timeline variant page verification failed:\n- ${failures.join('\n- ')}`);
console.log(JSON.stringify(result));
