import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(
  process.env.MING_PEOPLE_ON_DEMAND_ROOT
    || 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆',
);
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);
const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}${details ? `: ${JSON.stringify(details)}` : ''}`);
};
const peopleIndexPath = path.join(root, 'assets/data/people-index.json');
const peopleIndexBuffer = await fs.readFile(peopleIndexPath);
const peopleIndexArtifact = JSON.parse(peopleIndexBuffer);
const allowedPersonIndexKeys = new Set([
  'alt', 'birth', 'category', 'childCounts', 'confidence', 'creativeWorkCount', 'death', 'detailUrl',
  'display', 'domains', 'evaluation', 'hometown', 'id', 'institutionIds', 'institutions', 'lineageLines',
  'mother', 'name', 'office', 'office_end', 'office_start', 'order', 'parent', 'personPageSlug', 'portrait',
  'rowId', 'score', 'search', 'sex', 'summary', 'year',
]);
const allowedSearchKeys = new Set(['native', 'pinyin']);
const allowedPortraitKeys = new Set([
  'file', 'objectPosition', 'portraitKind', 'portraitTransform', 'status', 'transformOrigin',
]);
const forbiddenIndexKeys = new Set([
  'commons', 'emperorIdentity', 'evidence', 'fileName', 'height', 'historicalSlice', 'lifeEraLabels',
  'lineage', 'note', 'notes', 'page', 'source1', 'source2', 'timeline', 'width', 'works',
]);
const unexpectedIndexFields = [];
for (const person of peopleIndexArtifact.people || []) {
  for (const key of Object.keys(person)) {
    if (!allowedPersonIndexKeys.has(key) || forbiddenIndexKeys.has(key)) unexpectedIndexFields.push(`${person.id}.${key}`);
  }
  for (const key of Object.keys(person.portrait || {})) {
    if (!allowedPortraitKeys.has(key) || forbiddenIndexKeys.has(key)) unexpectedIndexFields.push(`${person.id}.portrait.${key}`);
  }
  for (const key of Object.keys(person.search || {})) {
    if (!allowedSearchKeys.has(key) || forbiddenIndexKeys.has(key)) unexpectedIndexFields.push(`${person.id}.search.${key}`);
  }
}
check(unexpectedIndexFields.length === 0, 'final people index must contain only declared list fields', unexpectedIndexFields.slice(0, 20));
check(
  peopleIndexBuffer.byteLength < 240 * 1024,
  'final people index must stay below the 240 KiB boot budget',
  { bytes: peopleIndexBuffer.byteLength },
);

function safeFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const candidate = path.resolve(root, `.${pathname === '/' ? '/people.html' : pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  return candidate;
}

const server = http.createServer(async (request, response) => {
  const filePath = safeFilePath(request.url || '/');
  if (!filePath) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': mime.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message);
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

async function waitForPerson(page, name) {
  await page.waitForFunction(
    (expected) => (
      document.querySelector('#detail h2')?.textContent.trim() === expected
      && document.querySelector('#detail .facts')
    ),
    name,
  );
}

async function openRoster(page) {
  await page.waitForSelector('#rows tr[data-id]', { state: 'attached' });
  const tableTab = page.locator('#peopleTableTab');
  if (await tableTab.count() && await tableTab.getAttribute('aria-selected') !== 'true') {
    await tableTab.click();
  }
  await page.waitForSelector('#rows tr[data-id]', { state: 'visible' });
}

async function assertPeopleSearch(page, query, rowId) {
  await page.locator('#search').fill(query);
  await page.waitForSelector(`#rows tr[data-id="${rowId}"]`, { state: 'visible' });
  return page.locator(`#rows tr[data-id="${rowId}"]`).count();
}

async function assertEventSearch(page, query, eventId) {
  await page.locator('#eventSearch').fill(query);
  await page.waitForSelector(`#eventstream .eventcard[data-event="${eventId}"]`, { state: 'visible' });
  return page.locator(`#eventstream .eventcard[data-event="${eventId}"]`).count();
}

async function closeDrawer(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#drawer')?.classList.contains('open'));
}

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const requests = [];
  const pageErrors = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/people.html`, { waitUntil: 'domcontentloaded' });
  await openRoster(page);
  const indexRequests = requests.filter((requestPath) => requestPath.includes('/assets/data/'));
  if (!requests.includes('/assets/data/people-index.json')
    || !requests.includes('/assets/data/events-index.json')) {
    throw new Error(`first load must fetch both lightweight indexes: ${JSON.stringify(indexRequests)}`);
  }
  check(await page.locator('#rows tr[data-id]').count() >= 151, 'first load must render the full people roster');
  check(await page.locator('#stats .stat').count() === 11, 'first load must preserve all statistics');
  await page.locator('.chip[data-cat="文臣"]').click();
  const civilRows = page.locator('#rows tr[data-id]');
  check(await civilRows.count() > 0, 'category filtering must retain matching people');
  check(
    await civilRows.locator('.badge').allTextContents().then((values) => values.every((value) => value.trim() === '文臣')),
    'category filtering must exclude nonmatching people',
  );
  await page.locator('.chip[data-cat="全部"]').click();
  check(
    (await page.locator('#search').getAttribute('placeholder'))?.includes('拼音或繁体字'),
    'people search must explain pinyin and traditional-name support',
  );
  check(
    await assertPeopleSearch(page, 'tangyin', 'tang-yin') === 1,
    'full-pinyin person-name search must find 唐寅',
  );
  check(
    await assertPeopleSearch(page, 'ty', 'tang-yin') === 1,
    'initial-letter person-name search must find 唐寅',
  );
  check(
    await assertPeopleSearch(page, '唐伯虎', 'tang-yin') === 1,
    'Chinese alias search must find 唐寅',
  );
  check(
    await assertPeopleSearch(page, 'tangbohu', 'tang-yin') === 1,
    'pinyin alias search must find 唐寅',
  );
  check(
    await assertPeopleSearch(page, '朱祁鎮', 'zhu-qizhen') === 1,
    'traditional-name search must find 朱祁镇',
  );
  await page.locator('#search').fill('');

  const zhuRow = page.locator('#rows tr[data-id="zhu-yuan-zhang"]');
  check(await zhuRow.count() === 1, '朱元璋 must retain the stable row selector zhu-yuan-zhang');
  if (await zhuRow.count()) {
    await zhuRow.click();
    await waitForPerson(page, '朱元璋');
    check(await page.locator('#detail .profile-preview').isVisible(), '朱元璋 detail must retain the profile preview');
    check(
      requests.some((requestPath) => /\/assets\/data\/people-details\/[a-z0-9-]+\.json$/.test(requestPath)),
      'opening a person must request one person detail shard',
    );
  }
  check(pageErrors.length === 0, 'first-load and person-detail flow must not raise page errors', pageErrors);

  await page.goto(`${baseUrl}/events.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#eventstream .eventcard[data-event="e001"]');
  check(
    (await page.locator('#eventSearch').getAttribute('placeholder'))?.includes('拼音、简拼、繁体与别名'),
    'event search must explain pinyin, initials, traditional-name, and alias support',
  );
  check(
    await assertEventSearch(page, 'beijingbaoweizhan', 'e035') === 1,
    'full-pinyin event-title search must find 北京保卫战',
  );
  check(
    await assertEventSearch(page, 'bjbwz', 'e035') === 1,
    'initial-letter event-title search must find 北京保卫战',
  );
  check(
    await assertEventSearch(page, '北京保衛戰', 'e035') === 1,
    'traditional event-title search must find 北京保卫战',
  );
  check(
    await assertEventSearch(page, 'zhenghe', 'e020') === 1,
    'related-person full-pinyin search must find 郑和首次下西洋',
  );
  check(
    await assertEventSearch(page, 'zh', 'e020') === 1,
    'related-person initials search must find 郑和首次下西洋',
  );
  check(
    await assertEventSearch(page, 'masanbao', 'e020') === 1,
    'related-person alias pinyin search must find 郑和首次下西洋',
  );
  await page.locator('#eventSearch').fill('');
  await page.locator('#eventstream .eventcard[data-event="e001"]').click();
  await page.waitForFunction(() => document.querySelectorAll('#detail .event-detail-copy').length >= 4);
  check(await page.locator('#detail .event-detail-copy').count() >= 4, 'event detail must load its full narrative shard');

  const retryPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let failedOnce = false;
  await retryPage.route('**/assets/data/people-details/*.json', async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.fulfill({ status: 503, contentType: 'text/plain', body: 'one-time test failure' });
      return;
    }
    await route.continue();
  });
  await retryPage.goto(`${baseUrl}/people.html`, { waitUntil: 'domcontentloaded' });
  await openRoster(retryPage);
  await retryPage.waitForSelector('#rows tr[data-id="zhu-yuan-zhang"]');
  await retryPage.locator('#search').fill('朱元璋');
  const retryRowsBefore = await retryPage.locator('#rows tr[data-id]').count();
  await retryPage.locator('#rows tr[data-id="zhu-yuan-zhang"]').click();
  await retryPage.waitForSelector('#detail [data-detail-retry]');
  check(
    (await retryPage.locator('#detail').textContent()).includes('详情未能载入'),
    'failed detail fetch must explain that the detail could not load',
  );
  check(
    retryRowsBefore > 0 && await retryPage.locator('#rows tr[data-id]').count() === retryRowsBefore
      && await retryPage.locator('#search').inputValue() === '朱元璋',
    'failed detail fetch must preserve search and list state',
  );
  await retryPage.locator('#detail [data-detail-retry]').click();
  await waitForPerson(retryPage, '朱元璋');
  check(failedOnce, 'retry scenario must intercept exactly the first detail request');

  const bootRetryPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let bootIndexFailedOnce = false;
  const failedIndexPattern = '**/assets/data/events-index.json';
  await bootRetryPage.route(failedIndexPattern, async (route) => {
    if (!bootIndexFailedOnce) {
      bootIndexFailedOnce = true;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });
  await bootRetryPage.goto(
    `${baseUrl}/people.html?person=${encodeURIComponent('朱元璋')}`,
    { waitUntil: 'domcontentloaded' },
  );
  await bootRetryPage.waitForSelector('#indexStatus:not([hidden]) [data-index-retry]', { timeout: 3000 });
  check(
    await bootRetryPage.locator('#indexStatus').isVisible()
      && (await bootRetryPage.locator('#indexStatus').textContent()).includes('索引未能载入'),
    'failed index boot must expose a visible shared retry status in either hall',
  );
  await bootRetryPage.unroute(failedIndexPattern);
  await bootRetryPage.locator('#indexStatus [data-index-retry]').click();
  await bootRetryPage.waitForSelector('#detail .profile-preview');
  check(
    await bootRetryPage.locator('#drawer.open #detail h2').textContent().then((text) => text.trim()) === '朱元璋',
    'index retry must preserve and fulfill the original ?person= deep-link intent',
  );
  check(await bootRetryPage.locator('#indexStatus').isHidden(), 'successful index retry must clear the bootstrap error state');
  await closeDrawer(bootRetryPage);
  await openRoster(bootRetryPage);
  await bootRetryPage.waitForSelector('#eventstream .eventcard[data-event="e001"]', { state: 'attached' });
  check(
    await bootRetryPage.locator('#rows tr[data-id="zhu-yuan-zhang"]').count() === 1,
    'index retry must restore the people rows selected by the preserved deep link',
  );
  check(await bootRetryPage.locator('#eventstream .eventcard').count() >= 90, 'index retry must restore event cards');
  check(bootIndexFailedOnce, 'bootstrap retry scenario must abort exactly one initial index request');

  const deepPerson = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await deepPerson.goto(`${baseUrl}/people.html?person=${encodeURIComponent('朱元璋')}`, { waitUntil: 'domcontentloaded' });
  await deepPerson.waitForSelector('#detail .profile-preview');
  check(await deepPerson.locator('#drawer.open').count() === 1, '?person= must open the requested person drawer');

  const deepEvent = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await deepEvent.goto(`${baseUrl}/events.html?event=e001`, { waitUntil: 'domcontentloaded' });
  await deepEvent.waitForFunction(() => document.querySelectorAll('#detail .event-detail-copy').length >= 4);
  check(await deepEvent.locator('#drawer.open').count() === 1, '?event= must open the requested event drawer');

  const scrollPage = await browser.newPage({ viewport: { width: 1440, height: 400 } });
  await scrollPage.goto(`${baseUrl}/people.html`, { waitUntil: 'domcontentloaded' });
  await openRoster(scrollPage);
  await scrollPage.waitForSelector('#rows tr[data-id="zhu-yuan-zhang"]');
  await scrollPage.locator('#rows tr[data-id="zhu-yuan-zhang"]').click();
  await waitForPerson(scrollPage, '朱元璋');
  const firstScroll = await scrollPage.evaluate(() => {
    const panel = document.querySelector('#drawer .panel');
    panel.scrollTop = 600;
    return panel.scrollTop;
  });
  await closeDrawer(scrollPage);
  await scrollPage.locator('#rows tr[data-id="zhu-yuan-zhang"]').click();
  await waitForPerson(scrollPage, '朱元璋');
  const samePersonScroll = await scrollPage.locator('#drawer .panel').evaluate((panel) => panel.scrollTop);
  await closeDrawer(scrollPage);
  await scrollPage.locator('#search').fill('\u6731\u5141\u7086');
  const otherRow = scrollPage.locator('#rows tr[data-id="zhu-yunwen"]');
  await otherRow.click();
  await scrollPage.waitForTimeout(1000);
  const differentPersonName = (await scrollPage.locator('#detail h2').textContent()).trim();
  const differentPersonScroll = await scrollPage.locator('#drawer .panel').evaluate((panel) => panel.scrollTop);
  check(firstScroll >= 500, 'scroll test must move the first person detail away from the top', { firstScroll });
  check(
    Math.abs(samePersonScroll - firstScroll) <= 2,
    'cached current person must retain the stored drawer scroll',
    { firstScroll, samePersonScroll },
  );
  check(differentPersonName === '\u6731\u5141\u7086', 'a different person must render after closing the cached drawer', { differentPersonName });
  check(differentPersonScroll === 0, 'a different person must reset the drawer to the top', { differentPersonScroll });

  const racePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const raceDiagnostics = [];
  racePage.on('console', (message) => raceDiagnostics.push(`${message.type()}: ${message.text()}`));
  await racePage.route('**/assets/data/people-details/zhu-yuan-zhang.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    await route.continue();
  });
  await racePage.goto(`${baseUrl}/people.html`, { waitUntil: 'domcontentloaded' });
  await openRoster(racePage);
  await racePage.waitForSelector('#rows tr[data-id="zhu-yuan-zhang"]');
  await racePage.locator('#rows tr[data-id="zhu-yuan-zhang"]').click();
  await closeDrawer(racePage);
  await racePage.locator('#search').fill('\u6731\u5141\u7086');
  await racePage.locator('#rows tr[data-id="zhu-yunwen"]').click();
  await racePage.waitForTimeout(1400);
  const personRaceWinner = await racePage.locator('#detail h2').textContent();
  check(personRaceWinner.trim() === '\u6731\u5141\u7086', 'late person A response must not overwrite person B', { personRaceWinner, raceDiagnostics });

  await racePage.route('**/assets/data/event-details/e001.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    await route.continue();
  });
  await racePage.goto(`${baseUrl}/events.html`, { waitUntil: 'domcontentloaded' });
  await racePage.waitForSelector('#eventstream .eventcard[data-event="e001"]');
  const secondEventTitle = (await racePage.locator('#eventstream .eventcard[data-event="e002"] h3').textContent()).trim();
  await racePage.locator('#eventstream .eventcard[data-event="e001"]').click();
  await closeDrawer(racePage);
  await racePage.locator('#eventstream .eventcard[data-event="e002"]').click();
  await racePage.waitForTimeout(1400);
  const eventRaceWinner = await racePage.locator('#detail h2').textContent();
  check(eventRaceWinner.trim() === secondEventTitle, 'late event A response must not overwrite event B', { eventRaceWinner, secondEventTitle, raceDiagnostics });

  if (failures.length) {
    throw new Error(`People on-demand page verification failed:\n- ${failures.join('\n- ')}`);
  }
  console.log(JSON.stringify({
    status: 'ok',
    firstLoad: { rows: await page.locator('#rows tr[data-id]').count(), indexRequests: 2 },
    person: '朱元璋',
    event: 'e001',
    retry: { failedOnce, rowsPreserved: retryRowsBefore },
    bootstrapRetry: { failedOnce: bootIndexFailedOnce, rows: await bootRetryPage.locator('#rows tr[data-id]').count() },
    deepLinks: ['person', 'event'],
    scroll: { firstScroll, samePersonScroll, differentPersonScroll },
    races: { personRaceWinner: personRaceWinner.trim(), eventRaceWinner: eventRaceWinner.trim() },
    peopleIndexBytes: peopleIndexBuffer.byteLength,
  }));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
