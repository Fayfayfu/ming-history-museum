import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const screenshotPath = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/人物馆_历史长卷_A版.png');
const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};

let browser;
let result;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`file://${path.join(root, 'people-timeline-a.html')}`, { waitUntil: 'networkidle' });
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
  check(afterDrag.scrollLeft > beforeDrag.scrollLeft, 'pointer drag must increase scrollLeft', { beforeDrag, afterDrag });
  check(afterDrag.dragging === '', 'pointerup must clear data-dragging', afterDrag);

  const peopleHtml = await fs.readFile(path.join(root, 'people.html'), 'utf8');
  check(!peopleHtml.includes('data-scroll-variant="a"'), 'people.html must remain isolated from A variant');
  check(!peopleHtml.includes('data-scroll-drag-surface'), 'people.html must not receive A drag surface');
  await page.locator('.people-timeline').screenshot({ path: screenshotPath });
  result = { status: 'ok', screenshotPath, beforeDrag, afterDrag };
} finally {
  await browser?.close();
}

if (failures.length) throw new Error(`People timeline variant page verification failed:\n- ${failures.join('\n- ')}`);
console.log(JSON.stringify(result));
