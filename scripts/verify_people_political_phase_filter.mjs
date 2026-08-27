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

assert.ok(hong, 'political phase index must include 洪承畴');
assert.equal(index.people.filter((person) => person.name === '洪承畴').length, 1, 'political phase filtering must not duplicate a person');
assert.deepEqual(hong.politicalPhases?.map((phase) => phase.regime), ['明', '清'], 'index must expose 洪承畴的完整政权阶段');
assert.equal(hong.politicalPhases?.[1]?.sourceIds, undefined, 'lightweight index must not expose phase source IDs');
assert.deepEqual(index.periodFilters?.map((filter) => filter.id), ['ming', 'southern-ming', 'transition'], 'period filters must expose stable URL values');
assert.deepEqual(hongguang?.periodIds, ['southern-ming'], 'Southern Ming phases must not be misclassified as Ming-Qing transition');

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
  await page.goto(`http://127.0.0.1:${port}/people.html?period=transition`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#rows tr[data-id]', { state: 'visible' });
  const names = await page.locator('#rows tr[data-id] td:nth-child(2) .name').allTextContents();
  assert.ok(names.includes('洪承畴'), 'transition filter must include 洪承畴');
  assert.equal(names.filter((name) => name.trim() === '洪承畴').length, 1, 'transition filter must render 洪承畴 exactly once');
  assert.equal(await page.locator('#period').inputValue(), 'transition', 'period URL state must hydrate the period control');
  await page.locator('#search').fill('hongchengchou');
  assert.equal(await page.locator('#rows tr[data-id="hong-cheng-chou"]').count(), 1, 'period filter must intersect pinyin search state');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

console.log(JSON.stringify({ status: 'ok', person: '洪承畴', period: 'transition' }));
