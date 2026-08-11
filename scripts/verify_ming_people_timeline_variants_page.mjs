import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const screenshotPath = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/人物馆_历史长卷_B版.png');
const failures = [];
const verifiedVariants = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};

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

let browser;
let result;
try {
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
  const drawerDuring = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
  check(Math.abs(drawerDuring - drawerBefore) <= 1, 'B opening drawer must preserve scrollLeft', { drawerBefore, drawerDuring });
  await page.locator('#close').click();
  await page.waitForFunction(() => !document.querySelector('#drawer')?.classList.contains('open'));
  const drawerAfter = await page.evaluate(() => document.querySelector('[data-scroll-drag-surface]')?.scrollLeft || 0);
  check(Math.abs(drawerAfter - drawerBefore) <= 1, 'B drawer must preserve scrollLeft', { drawerBefore, drawerAfter });

  const peopleHtml = await fs.readFile(path.join(root, 'people.html'), 'utf8');
  check(!peopleHtml.includes('data-scroll-variant="b"'), 'people.html must remain isolated from B variant');
  check(!peopleHtml.includes('data-scroll-drag-surface'), 'people.html must not receive B drag surface');
  await page.locator('.people-timeline').screenshot({ path: screenshotPath });
  result = { status: 'ok', screenshotPath, a, b: { beforeDrag, readability, afterDrag, drawerBefore, drawerDuring, drawerAfter } };
} finally {
  await browser?.close();
}

check(verifiedVariants.includes('a') && verifiedVariants.includes('b'), 'variant page verifier must cover both A and B', verifiedVariants);
if (failures.length) throw new Error(`People timeline variant page verification failed:\n- ${failures.join('\n- ')}`);
console.log(JSON.stringify(result));
