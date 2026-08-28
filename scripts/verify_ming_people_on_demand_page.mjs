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
  'display', 'domains', 'evaluation', 'hometown', 'id', 'institutionIds', 'institutions', 'politicalPhases',
  'lineageLines', 'mother', 'name', 'office', 'office_end', 'office_start', 'order', 'parent', 'periodIds',
  'personPageSlug', 'portrait', 'rowId', 'score', 'search', 'sex', 'summary', 'year',
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
check(!peopleIndexBuffer.includes(Buffer.from('"sourceIds"')), 'people index must not expose political phase source IDs');
check(
  ['ming', 'southern-ming', 'transition'].every((id) => (
    (peopleIndexArtifact.periodFilters || []).some((period) => period.id === id)
  )),
  'people index must expose all period filter options',
);
check(
  peopleIndexBuffer.byteLength < 240 * 1024,
  'final people index must stay below the 240 KiB boot budget',
  { bytes: peopleIndexBuffer.byteLength },
);
for (const name of ['朱文奎', '长平公主']) {
  check(
    peopleIndexArtifact.people.find((person) => person.name === name)?.year === 9999,
    `${name} unknown time anchor must normalize to the shared 9999 sentinel instead of zero`,
  );
}

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

async function selectedPeriods(page) {
  return page.locator('#period input[type="checkbox"]:checked').evaluateAll((inputs) => inputs.map((input) => input.value));
}

async function setSelectedPeriods(page, ids) {
  for (const id of ['ming', 'southern-ming', 'transition']) {
    const control = page.locator(`#period input[type="checkbox"][value="${id}"]`);
    if (ids.includes(id)) await control.check();
    else await control.uncheck();
  }
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
  for (const [name, rowId] of [['朱文奎', 'person-u6731-u6587-u594e'], ['长平公主', 'person-u957f-u5e73-u516c-u4e3b']]) {
    await page.locator('#search').fill(name);
    check(
      (await page.locator(`#rows tr[data-id="${rowId}"] td`).first().textContent())?.trim() === '年代待考',
      `${name} roster time anchor must display 年代待考 instead of 0`,
    );
  }
  for (const portraitName of ['朱由崧', '朱聿键', '朱由榔', '李自成', '于谦', '张居正', '戚继光', '李如松']) {
    await page.locator('#search').fill(portraitName);
    await page.waitForFunction((name) => {
      const row = [...document.querySelectorAll('#rows tr[data-id]')]
        .find((entry) => entry.querySelector('.name')?.textContent.trim() === name);
      const image = row?.querySelector('.portrait img');
      return Boolean(image?.complete && image.naturalWidth);
    }, portraitName, { timeout: 3000 });
    check(
      await page.evaluate((name) => {
        const row = [...document.querySelectorAll('#rows tr[data-id]')]
          .find((entry) => entry.querySelector('.name')?.textContent.trim() === name);
        const image = row?.querySelector('.portrait img');
        return Boolean(image?.naturalWidth && !row.querySelector('.portrait-fallback'));
      }, portraitName),
      `${portraitName} must render a loaded portrait image in the people roster`,
    );
  }
  await page.locator('#search').fill('');
  const southernRulerRowIds = {朱由崧: 'person-u6731-u7531-u5d27', 朱聿键: 'person-u6731-u807f-u952e', 朱由榔: 'person-u6731-u7531-u6994'};
  for (const rulerName of Object.keys(southernRulerRowIds)) {
    await page.locator('#search').fill(rulerName);
    await page.locator(`#rows tr[data-id="${southernRulerRowIds[rulerName]}"]`).click();
    await waitForPerson(page, rulerName);
    check(
      await page.locator('#detail .person-identity-flow').count() === 0,
      `${rulerName} must not repeat its single ruling phase as a separate identity progression`,
    );
    const identityEvidence = page.locator('#detail .person-identity .identity-evidence-badge');
    check(
      await identityEvidence.count() > 0
        && (await identityEvidence.textContent())?.includes('历史考据 · 高置信度'),
      `${rulerName} identity cell must carry the historical-evidence marker`,
    );
    check(
      JSON.stringify(await page.locator('#detail .southern-ruler-relations h5').allTextContents())
        === JSON.stringify(['父母/帝系', '子女', '继承']),
      `${rulerName} must render the three concise royal-relation columns`,
    );
    check(
      await page.locator('#detail .southern-ruler-relations').evaluate((relation) => {
        const grid = relation.querySelector('.founder-royal-grid')?.getBoundingClientRect();
        const boundary = relation.querySelector('.lineage-boundary')?.getBoundingClientRect();
        return Boolean(grid && boundary && boundary.top >= grid.bottom);
      }),
      `${rulerName} evidence boundary must not overlap the royal-relation grid`,
    );
    await closeDrawer(page);
  }
  await page.locator('#search').fill('黄道周');
  await page.locator('#rows tr[data-id]').filter({ hasText: '黄道周' }).click();
  await waitForPerson(page, '黄道周');
  const ordinaryFactOrder = await page.evaluate(() => {
    const facts = [...document.querySelectorAll('#detail .facts > .fact')];
    const indexOf = (className) => facts.findIndex((fact) => fact.classList.contains(className));
    const period = facts.find((fact) => fact.classList.contains('person-period'))?.getBoundingClientRect();
    const domain = facts.find((fact) => fact.classList.contains('person-domain'))?.getBoundingClientRect();
    return {
      labels: facts.map((fact) => fact.querySelector(':scope > span')?.textContent.trim() || ''),
      periodIndex: indexOf('person-period'),
      domainIndex: indexOf('person-domain'),
      periodTop: period?.top || 0,
      domainTop: domain?.top || 0,
    };
  });
  check(
    ordinaryFactOrder.periodIndex === 1
      && ordinaryFactOrder.domainIndex > ordinaryFactOrder.periodIndex
      && ordinaryFactOrder.periodTop < ordinaryFactOrder.domainTop,
    'ordinary person cards must swap the positions of 任职时期 and 历史领域',
    ordinaryFactOrder,
  );
  const identityPhaseLayout = await page.evaluate(() => [...document.querySelectorAll('#detail .person-identity-step')].map((row) => ({
    hasStandaloneConfidence: Boolean(row.querySelector('.person-identity-copy > span')),
    sourceRowText: row.querySelector('.identity-source-list')?.textContent.trim() || '',
    confidenceInSourceRow: Boolean(row.querySelector('.identity-source-list .identity-confidence')),
    height: row.getBoundingClientRect().height,
  })));
  check(
    identityPhaseLayout.length > 0
      && identityPhaseLayout.every((row) => !row.hasStandaloneConfidence && row.confidenceInSourceRow)
      && identityPhaseLayout.every((row) => Math.abs(row.height - identityPhaseLayout[0].height) < 0.1),
    '身份沿革的置信度应与史料同行显示，避免额外占一行',
    identityPhaseLayout,
  );
  await closeDrawer(page);
  for (const name of ['秦良玉', '客氏']) {
    await page.locator('#search').fill(name);
    await page.locator('#rows tr[data-detail-id]').filter({ has: page.locator('.name', { hasText: name }) }).first().click();
    await waitForPerson(page, name);
    const topRowLayout = await page.evaluate(() => {
      const facts = [...document.querySelectorAll('#detail .facts > .fact')];
      const identity = facts.find((fact) => fact.classList.contains('person-identity'));
      const period = facts.find((fact) => fact.classList.contains('person-period'));
      const domain = facts.find((fact) => fact.classList.contains('person-domain'));
      return {
        firstTwo: facts.slice(0, 2).map((fact) => fact.className),
        periodWide: period ? getComputedStyle(period).gridColumnEnd === '-1' : false,
        identityTop: identity?.getBoundingClientRect().top || 0,
        periodTop: period?.getBoundingClientRect().top || 0,
        domainTop: domain?.getBoundingClientRect().top || 0,
      };
    });
    check(
      topRowLayout.firstTwo[0] === 'fact person-identity'
        && topRowLayout.firstTwo[1] === 'fact person-period'
        && !topRowLayout.periodWide
        && Math.abs(topRowLayout.identityTop - topRowLayout.periodTop) < 1
        && topRowLayout.periodTop < topRowLayout.domainTop,
      `${name} 卡应将任职时期固定在右上，不再通栏占位`,
      topRowLayout,
    );
    await closeDrawer(page);
  }
  await page.locator('#search').fill('朱元璋');
  await page.locator('#rows tr[data-detail-id="zhu-yuan-zhang"]').click();
  await waitForPerson(page, '朱元璋');
  const emperorFactOrder = await page.evaluate(() => [...document.querySelectorAll('#detail .facts-founder > .fact')]
    .map((fact) => [...fact.classList].find((name) => name.startsWith('founder-')) || 'fact'));
  check(
    emperorFactOrder[0] === 'founder-identity'
      && emperorFactOrder[1] === 'founder-tenure'
      && emperorFactOrder.indexOf('founder-domain') > emperorFactOrder.indexOf('founder-tenure'),
    '皇帝卡应交换任职时期与历史领域的整格位置',
    emperorFactOrder,
  );
  await closeDrawer(page);
  await page.locator('#search').fill('');
  await page.locator('.chip[data-cat="文臣"]').click();
  const civilRows = page.locator('#rows tr[data-id]');
  check(await civilRows.count() > 0, 'category filtering must retain matching people');
  check(
    await civilRows.locator('.badge').allTextContents().then((values) => values.every((value) => value.trim() === '文臣')),
    'category filtering must exclude nonmatching people',
  );
  await page.locator('.chip[data-cat="全部"]').click();
  check(await page.locator('#period input[value="southern-ming"]').count() === 1, 'period filter must include Southern Ming');
  check(await page.locator('#period input[value="transition"]').count() === 1, 'period filter must include Ming-Qing transition');
  await setSelectedPeriods(page, ['southern-ming']);
  check(await page.locator('#rows tr[data-id="person-u6731-u7531-u5d27"]').count() === 1, 'Southern Ming period filter must find 朱由崧');
  check(await page.locator('#rows .phase-southern-ming').count() >= 3, 'Southern Ming rows must show lightweight period tags');
  await setSelectedPeriods(page, ['ming', 'transition']);
  check(JSON.stringify(await selectedPeriods(page)) === JSON.stringify(['ming', 'transition']), 'period control must retain the selected OR group');
  await page.locator('#search').fill('hongchengchou');
  check(await page.locator('#rows tr[data-id="hong-cheng-chou"]').count() === 1, 'multi-period filter must compose with pinyin search for 洪承畴');
  await page.locator('#rows tr[data-id="hong-cheng-chou"]').click();
  await waitForPerson(page, '洪承畴');
  check(await page.locator('#detail .person-identity-flow').isVisible(), 'cross-regime person detail must show identity progression');
  check(await page.locator('#detail .person-identity-flow .person-identity-step').count() >= 2, 'cross-regime person detail must keep both identity phases');
  await closeDrawer(page);
  await page.locator('#search').fill('');
  await page.locator('#personEvent').selectOption('e087');
  check(JSON.stringify(await selectedPeriods(page)) === JSON.stringify(['ming', 'transition']), 'event-related people entry must preserve every selected period');
  check(new URL(page.url()).searchParams.get('period') === 'ming,transition', 'event-related people entry must preserve multi-period URL state');
  check(await page.locator('#rows tr[data-id="hong-cheng-chou"]').count() === 1, 'period must intersect rather than replace an event-related people view');
  await page.locator('#personEvent').selectOption('');
  await page.evaluate(() => openEventDetail(eventRecord('e087')));
  await page.waitForSelector('#detail .personjump[data-person="洪承畴"]', { state: 'visible' });
  await page.locator('#detail .personjump[data-person="洪承畴"]').click();
  await waitForPerson(page, '洪承畴');
  check(JSON.stringify(await selectedPeriods(page)) === JSON.stringify(['ming', 'transition']), 'person jump must preserve every selected period');
  check(new URL(page.url()).searchParams.get('period') === 'ming,transition', 'person jump must preserve multi-period URL state');
  await closeDrawer(page);
  await page.locator('#search').fill('');
  await page.locator('.emperor[data-name="朱元璋"]').click();
  check(JSON.stringify(await selectedPeriods(page)) === JSON.stringify(['ming', 'transition']), 'emperor parent entry must preserve every selected period');
  check(new URL(page.url()).searchParams.get('period') === 'ming,transition', 'emperor parent entry must preserve multi-period URL state');
  check(await page.locator('#rows tr[data-id]').count() > 0, 'period must intersect rather than replace an emperor parent view');
  await page.locator('#reset').click();
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
      (await page.locator('#detail .founder-royal-column h5').allTextContents()).includes('父母/帝系'),
      'emperor detail must rename the family-origin column to 父母/帝系',
    );
    check(
      !(await page.locator('#detail .founder-royal-column h5').allTextContents()).includes('家庭出身'),
      'emperor detail must not retain the old 家庭出身 heading',
    );
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
