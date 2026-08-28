import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'], ['.png', 'image/png'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
]);
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(root, pathname.replace(/^\/+/, '') || 'people.html');
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('invalid path');
    const body = await fs.readFile(file);
    response.writeHead(200, { 'cache-control': 'no-store', 'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/people.html`, { waitUntil: 'networkidle' });
  const rulerStrip = await page.evaluate(() => {
    const beijing = document.querySelector('#beijingMingRulers');
    const southern = document.querySelector('#southernMingRulers');
    return {
      beijingCount: beijing?.querySelectorAll('.emperor').length || 0,
      southernCount: southern?.querySelectorAll('.emperor').length || 0,
      beijingTop: beijing?.getBoundingClientRect().top || 0,
      southernTop: southern?.getBoundingClientRect().top || 0,
      detachedBranchCount: document.querySelectorAll('.southern-branch').length,
    };
  });
  check(rulerStrip.beijingCount === 16, 'compact ruler strip keeps sixteen Beijing Ming emperors', rulerStrip);
  check(rulerStrip.southernCount === 3, 'compact ruler strip appends three Southern Ming rulers', rulerStrip);
  check(Math.abs(rulerStrip.beijingTop - rulerStrip.southernTop) < 2, 'both ruler groups stay on one horizontal row', rulerStrip);
  check(rulerStrip.detachedBranchCount === 0, 'no detached Southern Ming exhibition block remains', rulerStrip);
  await page.locator('#peopleTimelineTab').click();
  await page.waitForFunction(() => document.body.dataset.peopleView === 'timeline');

  const state = await page.evaluate(() => ({
    max: document.querySelector('#peopleTimelineView')?.dataset.timelineMax,
    boundaries: [...document.querySelectorAll('[data-timeline-boundary]')].map((node) => node.dataset.year),
    boundaryLabels: [...document.querySelectorAll('[data-timeline-boundary]')].map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
    hongCount: document.querySelectorAll('[data-timeline-person="洪承畴"]').length,
    hongPhase: document.querySelector('[data-timeline-person="洪承畴"]')?.dataset.regimePhase || '',
    southernLane: [...document.querySelectorAll('[data-timeline-person="朱由崧"],[data-timeline-person="朱聿键"],[data-timeline-person="朱由榔"]')].map((node) => node.dataset.lane),
    emperorCount: document.querySelectorAll('[data-timeline-person][data-category-label="皇帝"]').length,
    southernRulerCount: document.querySelectorAll('[data-timeline-person][data-category-label="南明君主"]').length,
    rulerLaneLabel: document.querySelector('.timeline-lane-label--emperor')?.textContent.trim() || '',
    pre1368Years: [...document.querySelectorAll('[data-timeline-person]')].filter((node) => Number(node.dataset.year) < 1368).map((node) => ({name:node.dataset.timelinePerson,year:Number(node.dataset.year),x:node.style.getPropertyValue('--person-x')})),
    timelineAria: document.querySelector('#peopleTimelineView')?.getAttribute('aria-label') || '',
  }));

  check(state.max === '1662', 'timeline ends at 1662', state);
  check(JSON.stringify(state.boundaries) === JSON.stringify(['1368', '1644', '1662']), 'all scope breaks are visible in chronology order', state);
  check(state.boundaryLabels[1]?.includes('北京明廷覆亡') && state.boundaryLabels[2]?.includes('南明终局'), '1644 and 1662 carry distinct historical labels', state);
  check(state.hongCount === 1, 'cross-era person renders once', state);
  check(state.hongPhase === '明→清', 'cross-era anchor exposes its political progression without duplicating the person', state);
  check(state.southernLane.length === 3 && state.southernLane.every((lane) => lane === 'emperor'), 'Southern Ming rulers share the upper ruler lane', state);
  check(state.emperorCount === 16, 'timeline keeps Beijing Ming emperor spine at sixteen', state);
  check(state.southernRulerCount === 3, 'timeline distinguishes three Southern Ming rulers without recategorizing them as Beijing emperors', state);
  check(state.rulerLaneLabel === '皇帝／君主', 'upper ruler lane uses the combined visitor-facing label', state);
  check(new Set(state.pre1368Years.map((item) => item.x)).size > 1, 'people before 1368 retain distinct chronological positions', state.pre1368Years);
  check(state.timelineAria.includes('1368') && state.timelineAria.includes('1662') && state.timelineAria.includes('北京明廷覆亡'), 'timeline announces the full public scope and 1644 break', state);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error(`VERIFY_PEOPLE_TIMELINE_SOUTHERN_MING_PAGE_FAILED\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('VERIFY_PEOPLE_TIMELINE_SOUTHERN_MING_PAGE_OK');
