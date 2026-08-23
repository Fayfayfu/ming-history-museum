import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);
const failures = [];
const check = (condition, message, details = {}) => {
  if (!condition) failures.push(`${message}: ${JSON.stringify(details)}`);
};

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(root, pathname.replace(/^\/+/, '') || 'people/tang-yin.html');
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('invalid path');
    const body = await fs.readFile(file);
    response.writeHead(200, {'content-type': mime.get(path.extname(file)) || 'application/octet-stream'});
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
  browser = await chromium.launch({headless: true, executablePath: chrome});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  await page.goto(`${baseUrl}/people/tang-yin.html`, {waitUntil: 'networkidle'});
  const tang = await page.evaluate(() => {
    const locator = document.querySelector('.page-locator');
    const toggle = locator?.querySelector('[data-locator-toggle]');
    const panel = locator?.querySelector('.page-locator-panel');
    const links = [...(locator?.querySelectorAll('a[href^="#"]') || [])];
    return {
      position: locator ? getComputedStyle(locator).position : '',
      label: locator?.getAttribute('aria-label') || '',
      text: locator?.textContent.replace(/\s+/g, ' ').trim() || '',
      expanded: toggle?.getAttribute('aria-expanded') || '',
      panelHidden: panel?.getAttribute('aria-hidden') || '',
      panelVisibility: panel ? getComputedStyle(panel).visibility : '',
      toggleRight: toggle ? Math.round(innerWidth - toggle.getBoundingClientRect().right) : -1,
      currentLabel: locator?.querySelector('[data-locator-current]')?.textContent.trim() || '',
      sectionLabels: [...(locator?.querySelectorAll('a.page-locator-section') || [])].map((link) => link.textContent.trim()),
      hrefs: links.map((link) => link.getAttribute('href')),
      chapterLinks: locator?.querySelectorAll('.page-locator-chapters a').length || 0,
      chapterSections: document.querySelectorAll('.chapter[id]').length,
      missingTargets: links.map((link) => link.hash).filter((hash) => !document.querySelector(hash)),
      bodyWidth: document.body.scrollWidth,
      viewport: innerWidth,
    };
  });
  check(tang.position === 'fixed' && tang.label === '展厅导览', '桌面端没有吸附在视口的展厅导览', tang);
  check(tang.expanded === 'false' && tang.panelHidden === 'true' && tang.panelVisibility === 'hidden', '桌面端导览抽屉没有默认收起', tang);
  check(tang.toggleRight === 0 && tang.currentLabel === '开篇', '贴边签没有吸附在右侧边缘或缺少当前章节', tang);
  check(['开篇', '生平脉络', '历史切片', '作品展陈', '跨馆参观', '证据台'].every((label) => tang.text.includes(label)), '唐寅定位器缺少主要区块', tang);
  check(!tang.sectionLabels.includes('艺文留痕') && !tang.sectionLabels.includes('作品现场'), '导览仍混用旧的作品区名称', tang);
  check(!tang.text.includes('六幕') && !tang.text.includes('作品区'), '定位器仍使用固定“六幕”或“作品区”命名', tang);
  check(tang.chapterSections === 6 && tang.chapterLinks === tang.chapterSections, '唐寅的生平子目录没有由实际章节生成', tang);
  check(tang.missingTargets.length === 0 && tang.bodyWidth === tang.viewport, '唐寅定位器存在无效锚点或水平溢出', tang);
  await page.screenshot({path: '/tmp/tang-yin-locator-desktop-closed.png'});

  const desktopToggle = page.locator('[data-locator-toggle]');
  await desktopToggle.click();
  await page.waitForFunction(() => {
    const toggle = document.querySelector('[data-locator-toggle]');
    const panel = document.querySelector('.page-locator-panel');
    return toggle?.getAttribute('aria-expanded') === 'true' && panel && getComputedStyle(panel).visibility === 'visible' && Math.abs(innerWidth - panel.getBoundingClientRect().right) <= 1;
  });
  const desktopOpen = await page.evaluate(() => ({
    expanded: document.querySelector('[data-locator-toggle]')?.getAttribute('aria-expanded') || '',
    panelHidden: document.querySelector('.page-locator-panel')?.getAttribute('aria-hidden') || '',
    panelVisibility: getComputedStyle(document.querySelector('.page-locator-panel')).visibility,
    panelRight: Math.round(innerWidth - document.querySelector('.page-locator-panel').getBoundingClientRect().right),
  }));
  check(desktopOpen.expanded === 'true' && desktopOpen.panelHidden === 'false' && desktopOpen.panelVisibility === 'visible' && Math.abs(desktopOpen.panelRight) <= 1, '桌面端点击贴边签后没有打开右侧抽屉', desktopOpen);
  await page.screenshot({path: '/tmp/tang-yin-locator-desktop-open.png'});

  const worksLink = page.locator('.page-locator a[href="#works"]');
  if (await worksLink.count()) {
    await worksLink.click();
    await page.waitForFunction(() => location.hash === '#works');
    await page.evaluate(() => new Promise((resolve) => {
      const fallback = setTimeout(resolve, 4000);
      addEventListener('scrollend', () => { clearTimeout(fallback); resolve(); }, {once: true});
    }));
  }
  const worksJump = await page.evaluate(() => ({
    hash: location.hash,
    targetTop: document.querySelector('#works')?.getBoundingClientRect().top || 0,
    current: document.querySelector('.page-locator a[aria-current="location"]')?.getAttribute('href') || '',
    currentLabel: document.querySelector('[data-locator-current]')?.textContent.trim() || '',
    expanded: document.querySelector('[data-locator-toggle]')?.getAttribute('aria-expanded') || '',
    panelHidden: document.querySelector('.page-locator-panel')?.getAttribute('aria-hidden') || '',
  }));
  check(worksJump.hash === '#works' && worksJump.current === '#works' && worksJump.currentLabel === '作品展陈' && worksJump.targetTop >= 60 && worksJump.targetTop < 140, '作品展陈定位或当前章节提示无效', worksJump);
  check(worksJump.expanded === 'false' && worksJump.panelHidden === 'true', '桌面端选择章节后没有自动收起', worksJump);

  await desktopToggle.click();
  await page.locator('main').click({position: {x: 20, y: 20}});
  const outsideClose = await desktopToggle.getAttribute('aria-expanded');
  check(outsideClose === 'false', '点击导览外部后没有收起抽屉', {outsideClose});

  await desktopToggle.click();
  await page.keyboard.press('Escape');
  const escapeClose = await desktopToggle.getAttribute('aria-expanded');
  check(escapeClose === 'false', '按 Esc 后没有收起抽屉', {escapeClose});

  await page.goto(`${baseUrl}/people/shen-zhou.html`, {waitUntil: 'networkidle'});
  const shen = await page.evaluate(() => ({
    chapterSections: document.querySelectorAll('.chapter[id]').length,
    chapterLinks: document.querySelectorAll('.page-locator-chapters a').length,
    locatorText: document.querySelector('.page-locator')?.textContent.replace(/\s+/g, ' ').trim() || '',
  }));
  check(shen.chapterSections === 5 && shen.chapterLinks === 5 && !shen.locatorText.includes('六幕'), '沈周页没有按实际五个生平章节生成定位器', shen);

  await page.goto(`${baseUrl}/people/hong-cheng-chou.html`, {waitUntil: 'networkidle'});
  const hong = await page.evaluate(() => ({
    hasWorks: Boolean(document.querySelector('#works')),
    locatorHasWorks: Boolean(document.querySelector('.page-locator a[href="#works"]')),
  }));
  check(!hong.hasWorks && !hong.locatorHasWorks, '无作品展陈的人物页不应出现“作品展陈”入口', hong);

  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`${baseUrl}/people/tang-yin.html`, {waitUntil: 'networkidle'});
  const mobileBefore = await page.evaluate(() => ({
    expanded: document.querySelector('[data-locator-toggle]')?.getAttribute('aria-expanded') || '',
    panelHidden: document.querySelector('.page-locator-panel')?.getAttribute('aria-hidden') || '',
    bodyWidth: document.body.scrollWidth,
    viewport: innerWidth,
  }));
  check(mobileBefore.expanded === 'false' && mobileBefore.panelHidden === 'true' && mobileBefore.bodyWidth === mobileBefore.viewport, '移动端定位器未默认收起或造成溢出', mobileBefore);
  const toggle = page.locator('[data-locator-toggle]');
  if (await toggle.count()) {
    await toggle.click();
    await page.waitForFunction(() => {
      const toggle = document.querySelector('[data-locator-toggle]');
      const panel = document.querySelector('.page-locator-panel');
      return toggle?.getAttribute('aria-expanded') === 'true' && panel && getComputedStyle(panel).visibility === 'visible' && Number.parseFloat(getComputedStyle(panel).opacity) >= .99;
    });
    await page.screenshot({path: '/tmp/tang-yin-locator-mobile.png'});
    await page.locator('.page-locator a[href="#history-slice"]').click();
    await page.waitForFunction(() => location.hash === '#history-slice');
  }
  const mobileAfter = await page.evaluate(() => ({
    hash: location.hash,
    expanded: document.querySelector('[data-locator-toggle]')?.getAttribute('aria-expanded') || '',
    panelHidden: document.querySelector('.page-locator-panel')?.getAttribute('aria-hidden') || '',
  }));
  check(mobileAfter.hash === '#history-slice' && mobileAfter.expanded === 'false' && mobileAfter.panelHidden === 'true', '移动端选择章节后没有定位并自动收起', mobileAfter);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) throw new Error(`Person page locator verification failed:\n- ${failures.join('\n- ')}`);
console.log(JSON.stringify({pass: true, checks: 15, screenshots: ['/tmp/tang-yin-locator-desktop-closed.png', '/tmp/tang-yin-locator-desktop-open.png', '/tmp/tang-yin-locator-mobile.png']}));
