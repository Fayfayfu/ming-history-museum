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
const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(root, pathname.replace(/^\/+/, '') || 'people.html');
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('invalid path');
    const body = await fs.readFile(file);
    response.writeHead(200, { 'content-type': mime.get(path.extname(file)) || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${baseUrl}/people.html`, { waitUntil: 'networkidle' });

  const defaultView = await page.evaluate(() => {
    const timeline = document.querySelector('#peopleTimelineView');
    const table = document.querySelector('#peopleTableView');
    const longScroll = document.querySelector('#peopleTimelineTab');
    const tableTab = document.querySelector('#peopleTableTab');
    const hint = longScroll?.querySelector('.people-view-tab-hint');
    const rect = longScroll?.getBoundingClientRect();
    const emperors = document.querySelector('#emperors')?.getBoundingClientRect();
    return {
      view: document.body.dataset.peopleView,
      timeline: timeline ? getComputedStyle(timeline).display : 'missing',
      table: table ? getComputedStyle(table).display : 'missing',
      tableSelected: document.querySelector('#peopleTableTab')?.getAttribute('aria-selected'),
      timelineSelected: longScroll?.getAttribute('aria-selected'),
      longScrollVisible: Boolean(rect && rect.width > 0 && rect.height > 0),
      longScrollText: longScroll?.textContent.trim() || '',
      longScrollHasArrow: Boolean(longScroll?.querySelector('b')),
      longScrollWidth: rect?.width || 0,
      tableWidth: tableTab?.getBoundingClientRect().width || 0,
      hint: hint?.textContent.trim() || '',
      longScrollBottom: rect?.bottom || 0,
      emperorTop: emperors?.top || 0,
    };
  });
  check(
    defaultView.view === 'table' && defaultView.table !== 'none' && defaultView.timeline === 'none'
      && defaultView.tableSelected === 'true' && defaultView.timelineSelected === 'false',
    '人物总表 must be the initial people-hall view',
    defaultView,
  );
  check(
    defaultView.longScrollVisible && defaultView.hint === '' && defaultView.longScrollText === '历史长卷'
      && !defaultView.longScrollHasArrow && Math.abs(defaultView.longScrollWidth - defaultView.tableWidth) <= 20
      && defaultView.longScrollBottom <= defaultView.emperorTop,
    '历史长卷入口 must be a compact text-only sibling of 人物总表',
    defaultView,
  );

  await page.locator('#peopleTimelineTab').click();
  const switched = await page.evaluate(() => ({
    view: document.body.dataset.peopleView,
    timeline: getComputedStyle(document.querySelector('#peopleTimelineView')).display,
    table: getComputedStyle(document.querySelector('#peopleTableView')).display,
  }));
  check(switched.view === 'timeline' && switched.timeline !== 'none' && switched.table === 'none', '历史长卷入口 must switch to the visual timeline', switched);

  await page.goto(`${baseUrl}/people.html?event=e035`, { waitUntil: 'networkidle' });
  const eventDeepLink = await page.evaluate(() => ({
    view: document.body.dataset.peopleView,
    event: document.querySelector('#personEvent')?.value || '',
    table: getComputedStyle(document.querySelector('#peopleTableView')).display,
  }));
  check(eventDeepLink.view === 'table' && eventDeepLink.table !== 'none' && eventDeepLink.event === 'e035', 'event deep links must open the filtered roster', eventDeepLink);

  await page.goto(`${baseUrl}/people.html?person=${encodeURIComponent('于谦')}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#drawer.open #detail .facts');
  const personDeepLink = await page.evaluate(() => ({
    view: document.body.dataset.peopleView,
    drawerName: document.querySelector('#detail h2')?.textContent.trim() || '',
    table: getComputedStyle(document.querySelector('#peopleTableView')).display,
  }));
  check(personDeepLink.view === 'table' && personDeepLink.table !== 'none' && personDeepLink.drawerName === '于谦', 'person deep links must open the requested card from the roster', personDeepLink);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/people.html`, { waitUntil: 'networkidle' });
  const mobile = await page.evaluate(() => {
    const longScroll = document.querySelector('#peopleTimelineTab')?.getBoundingClientRect();
    return {
      scrollWidth: document.body.scrollWidth,
      viewport: window.innerWidth,
      longScrollVisible: Boolean(longScroll && longScroll.width > 0 && longScroll.right <= window.innerWidth),
    };
  });
  check(mobile.scrollWidth === mobile.viewport && mobile.longScrollVisible, 'mobile roster must keep the long-scroll entrance visible without horizontal overflow', mobile);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) throw new Error(`People default-view verification failed:\n- ${failures.join('\n- ')}`);
console.log(JSON.stringify({ pass: true, checks: 6 }));
