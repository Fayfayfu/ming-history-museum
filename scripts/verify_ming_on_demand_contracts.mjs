import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.env.MING_ON_DEMAND_CONTRACT_ROOT || 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const expectedInstitutions = ['中书省','御史台','大都督府','五军都督府','翰林院','内阁','都察院','吏部','户部','礼部','兵部','刑部','工部','司礼监','锦衣卫','东厂','西厂'].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
const expectedEventPeople = ['于谦','朱祁钰','朱祁镇','石亨'];
const requiredPreviewPeople = ['朱元璋','朱棣','朱祁镇','朱由检','朱允炆','朱高炽','朱瞻基','朱祁钰','朱见深','朱祐樘','朱厚照','朱厚熜','朱载坖','朱翊钧','朱常洛','朱由校'];
const fail = (message) => { throw new Error(`On-demand UI contract verification failed: ${message}`); };
const scope = process.env.MING_ON_DEMAND_CONTRACT_SCOPE || 'all';
if (!['all', 'stats', 'archive', 'links', 'institutions', 'event'].includes(scope)) fail(`unknown scope: ${scope}`);
async function activatePeopleTable(page) {
  await page.waitForSelector('#peopleTableTab');
  if (await page.locator('#peopleTableTab').getAttribute('aria-selected') !== 'true') await page.locator('#peopleTableTab').click();
  await page.waitForSelector('#peopleTableView:not([hidden])');
  await page.waitForSelector('#rows tr[data-id]', { state: 'visible' });
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/people.html' : pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('invalid path');
    const body = await fs.readFile(file);
    const type = { '.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml' }[path.extname(file).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': type }).end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled: scope !== 'archive' });
  if (scope === 'archive') {
    await page.goto(`${base}/people.html`, { waitUntil: 'domcontentloaded' });
    const archiveHref = await page.locator('noscript a').getAttribute('href');
    if (archiveHref !== 'people-archive.html') fail(`archive noscript link invalid: ${archiveHref || '<missing>'}`);
    await page.goto(`${base}/${archiveHref}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('tbody tr[data-id]');
    const archive = await page.evaluate(() => ({
      rows: document.querySelectorAll('tbody tr[data-id]').length,
      headers: document.querySelectorAll('th').length,
      scripts: document.querySelectorAll('script').length,
    }));
    if (archive.rows !== 175 || archive.headers !== 15 || archive.scripts !== 0) fail(`archive static roster mismatch: ${JSON.stringify(archive)}`);
    console.log(JSON.stringify({ status: 'ok', archive }));
  } else {
  await page.goto(`${base}/people.html`, { waitUntil: 'domcontentloaded' });
  await activatePeopleTable(page);
  const stats = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#stats .stat')].map((stat) => [stat.querySelector('span')?.textContent.trim(), stat.querySelector('strong')?.textContent.trim()])));
  if (scope === 'all' || scope === 'stats') {
    if (stats['不重复人物'] !== '175' || !Number.isInteger(+stats['独立页面人物']) || +stats['独立页面人物'] <= 0) {
      fail(`current stats mismatch: ${JSON.stringify(stats)}`);
    }
  }

  const options = await page.locator('#institution option').evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean));
  if (scope === 'all' || scope === 'institutions') {
    if (JSON.stringify(options) !== JSON.stringify(expectedInstitutions)) fail(`institution options are not complete and sorted: ${JSON.stringify(options)}`);
    for (const institution of ['内阁','都察院','吏部','户部','礼部','兵部','刑部','工部','司礼监','锦衣卫','东厂','西厂']) {
      await page.selectOption('#institution', institution);
      const rows = await page.locator('#rows tr[data-id]').count();
      if (!rows || await page.locator('#institution').inputValue() !== institution) fail(`institution selection failed for ${institution}`);
    }
  }

  const previewPeople = scope === 'links' ? requiredPreviewPeople.slice(0, 1) : requiredPreviewPeople;
  if (scope === 'all' || scope === 'links') for (const name of previewPeople) {
    await page.goto(`${base}/people.html?person=${encodeURIComponent(name)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction((expectedName) => (
      document.querySelector('#drawer')?.classList.contains('open')
      && document.querySelector('#detail h2')?.textContent.trim() === expectedName
      && document.querySelector('#detail .profile-enter')
    ), name);
    const href = await page.locator('#detail .profile-enter').getAttribute('href');
    if (!href || !/^people\/[a-z0-9-]+\.html$/.test(href)) fail(`invalid individual-page link for ${name}: ${href || '<missing>'}`);
    await fs.access(path.join(root, href)).catch(() => fail(`missing individual-page file for ${name}: ${href}`));
  }

  let eventRows = null;
  if (scope === 'all' || scope === 'event') {
  await page.goto(`${base}/events.html?q=${encodeURIComponent('北京保卫战')}`, { waitUntil: 'domcontentloaded' });
  await page.locator('.eventcard').first().click();
  await page.waitForFunction(() => (
    document.querySelector('#detail h2')?.textContent.includes('北京保卫战')
    && document.querySelectorAll('#detail .event-detail-copy').length >= 4
  ));
  const eventPeopleControl = page.locator('#detail [data-event-people="e035"]');
  if (await eventPeopleControl.count() !== 1) fail('event linkage control missing for e035');
  await eventPeopleControl.click();
  await page.waitForURL((url) => url.pathname.endsWith('/people.html') && url.searchParams.get('event') === 'e035');
  await activatePeopleTable(page);
  await page.waitForFunction(() => document.querySelectorAll('#rows tr[data-detail-id]').length === 4);
  eventRows = await page.locator('#rows tr[data-detail-id]').evaluateAll((rows) => ({
    selected: document.querySelector('#personEvent')?.value || '',
    title: document.querySelector('#viewTitle')?.textContent.trim() || '',
    names: rows.map((row) => row.querySelector('.name')?.textContent.trim() || ''),
    ids: rows.map((row) => row.dataset.detailId || ''),
  }));
  if (eventRows.selected !== 'e035' || eventRows.title !== '北京保卫战 · 相关人物' || JSON.stringify(eventRows.names) !== JSON.stringify(expectedEventPeople) || eventRows.ids.some((id) => !id)) {
    fail(`event linkage failed: ${JSON.stringify(eventRows)}`);
  }
  }
  console.log(JSON.stringify({ status: 'ok', stats, institutions: options.length, previews: previewPeople.length, event: eventRows }));
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
