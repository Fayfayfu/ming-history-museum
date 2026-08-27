import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.env.MING_PEOPLE_ON_DEMAND_ROOT || 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const index = JSON.parse(await fs.readFile(path.join(root, 'assets/data/people-index.json'), 'utf8'));
const hong = index.people.find((person) => person.name === '洪承畴');
const hongguang = index.people.find((person) => person.name === '朱由崧');
const expectedPeriodIds = {
  '史可法': ['ming', 'southern-ming'],
  '黄道周': ['ming', 'southern-ming'],
  '李自成': ['transition'],
  '多尔衮': ['transition'],
  '洪承畴': ['ming', 'transition'],
  '朱由崧': ['southern-ming'],
  '朱聿键': ['southern-ming'],
  '朱由榔': ['southern-ming'],
};

assert.ok(hong, 'political phase index must include 洪承畴');
assert.equal(index.people.filter((person) => person.name === '洪承畴').length, 1, 'political phase filtering must not duplicate a person');
assert.deepEqual(hong.politicalPhases?.map((phase) => phase.regime), ['明', '清'], 'index must expose 洪承畴的完整政权阶段');
assert.equal(hong.politicalPhases?.[1]?.sourceIds, undefined, 'lightweight index must not expose phase source IDs');
assert.deepEqual(index.periodFilters?.map((filter) => filter.id), ['ming', 'southern-ming', 'transition'], 'period filters must expose stable URL values');
assert.deepEqual(hongguang?.periodIds, ['southern-ming'], 'Southern Ming phases must not be misclassified as Ming-Qing transition');
for (const [name, periodIds] of Object.entries(expectedPeriodIds)) {
  assert.deepEqual(index.people.find((person) => person.name === name)?.periodIds, periodIds, `${name} must have reviewed period-filter membership`);
}

const server = http.createServer(async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
  const target = path.resolve(root, `.${requestPath === '/' ? '/people.html' : requestPath}`);
  if (!target.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await fs.readFile(target);
    response.writeHead(200).end(body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.message);
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

let browser;
try {
  const { port } = server.address();
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const selectedPeriods = async () => page.locator('#period input[type="checkbox"]:checked').evaluateAll((inputs) => inputs.map((input) => input.value));
  const setPeriods = async (ids) => {
    for (const id of ['ming', 'southern-ming', 'transition']) {
      const control = page.locator(`#period input[type="checkbox"][value="${id}"]`);
      if (ids.includes(id)) await control.check();
      else await control.uncheck();
    }
  };

  await page.goto(`http://127.0.0.1:${port}/people.html?period=ming,transition`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#rows tr[data-id]', { state: 'visible' });
  assert.deepEqual(await selectedPeriods(), ['ming', 'transition'], 'combined period URL state must hydrate the multi-select control');
  const names = await page.locator('#rows tr[data-id] td:nth-child(2) .name').allTextContents();
  for (const name of ['史可法', '黄道周', '李自成', '多尔衮', '洪承畴']) {
    assert.ok(names.includes(name), `北京明廷＋明清交替的 OR 筛选必须包含 ${name}`);
  }
  assert.equal(names.filter((name) => name.trim() === '洪承畴').length, 1, 'multi-period filter must render 洪承畴 exactly once');
  await page.locator('#search').fill('hongchengchou');
  assert.equal(await page.locator('#rows tr[data-id="hong-cheng-chou"]').count(), 1, 'multi-period filter must intersect pinyin search state');
  await page.locator('#search').fill('');
  await page.locator('#personEvent').selectOption('e087');
  assert.deepEqual(await selectedPeriods(), ['ming', 'transition'], 'event entry must preserve every selected period');
  assert.equal(new URL(page.url()).searchParams.get('period'), 'ming,transition', 'combined periods must round-trip in one stable URL parameter');
  assert.equal(await page.locator('#rows tr[data-id="hong-cheng-chou"]').count(), 1, 'event entry must intersect with multi-period state');
  await page.locator('#personEvent').selectOption('');
  await page.evaluate(() => openEventDetail(eventRecord('e087')));
  await page.waitForSelector('#detail .personjump[data-person="洪承畴"]', { state: 'visible' });
  await page.locator('#detail .personjump[data-person="洪承畴"]').click();
  await page.waitForFunction(() => document.querySelector('#detail h2')?.textContent.trim() === '洪承畴');
  assert.deepEqual(await selectedPeriods(), ['ming', 'transition'], 'person jump must preserve every selected period');
  await page.keyboard.press('Escape');
  await page.locator('#search').fill('');
  await page.locator('.emperor[data-name="朱元璋"]').click();
  assert.deepEqual(await selectedPeriods(), ['ming', 'transition'], 'emperor parent entry must preserve every selected period');
  assert.ok(await page.locator('#rows tr[data-id]').count() > 0, 'parent entry must still intersect with multi-period state');
  await page.locator('#reset').click();
  await setPeriods(['southern-ming']);
  assert.equal(new URL(page.url()).searchParams.get('period'), 'southern-ming', 'one selected checkbox must keep the legacy single-value URL form');
  assert.equal(await page.locator('#rows tr[data-id="person-u6731-u7531-u5d27"]').count(), 1, 'Southern Ming checkbox must find 朱由崧');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

console.log(JSON.stringify({ status: 'ok', person: '洪承畴', period: 'ming,transition' }));
