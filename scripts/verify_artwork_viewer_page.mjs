import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);
const failures = [];
const check = (condition, message, details) => {
  if (!condition) failures.push(`${message}: ${JSON.stringify(details)}`);
};

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(root, pathname.replace(/^\/+/, '') || 'people/qiu-ying.html');
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
  await page.goto(`${baseUrl}/people/qiu-ying.html`, {waitUntil: 'networkidle'});
  await page.locator('.art-card-panorama').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.art-card-panorama img')].every((image) => image.complete && image.naturalWidth > 0));

  await page.locator('[data-artwork-open]').first().click();
  await page.waitForSelector('#artworkViewer[open]');
  const opened = await page.evaluate(() => ({
    title: document.querySelector('#artworkViewerTitle')?.textContent.trim() || '',
    image: document.querySelector('#artworkViewerImage')?.getAttribute('src') || '',
    scale: document.querySelector('#artworkViewerScale')?.textContent.trim() || '',
    bodyLocked: document.body.classList.contains('artwork-viewer-open'),
    closeLabel: document.querySelector('[data-artwork-close]')?.getAttribute('aria-label') || '',
    quickScales: [...document.querySelectorAll('[data-artwork-scale]')].map((button) => button.dataset.artworkScale),
    header: (() => { const rect=document.querySelector('.artwork-viewer-head')?.getBoundingClientRect(); return rect?{top:rect.top,height:rect.height}:null })(),
    close: (() => { const rect=document.querySelector('[data-artwork-close]')?.getBoundingClientRect(); return rect?{top:rect.top,right:rect.right,width:rect.width,height:rect.height}:null })(),
    heading: (() => { const node=document.querySelector('#artworkViewerTitle'); const rect=node?.getBoundingClientRect(); const style=node?getComputedStyle(node):null; return rect&&style?{top:rect.top,width:rect.width,height:rect.height,color:style.color,visibility:style.visibility,opacity:style.opacity}:null })(),
  }));
  check(opened.title.includes('汉宫春晓图') && opened.image.includes('qiu-ying-han-palace.jpg'), '查看大图按钮没有打开对应作品', opened);
  check(opened.scale === '1×' && opened.bodyLocked && opened.closeLabel === '关闭作品大图', '查看器初始状态或可访问标签不正确', opened);
  check(opened.quickScales.join('|') === '1|2|4|8', '查看器没有直接显示1倍、2倍、4倍、8倍入口', opened);
  check(opened.header?.top === 0 && opened.header?.height >= 58 && opened.close?.top >= 0 && opened.close?.right <= 1440 && opened.close?.width >= 44 && opened.close?.height >= 44, '全屏查看器顶部标题或关闭按钮不在视口内', opened);
  check(opened.heading?.top >= 0 && opened.heading?.width > 100 && opened.heading?.height >= 18 && opened.heading?.visibility === 'visible' && opened.heading?.opacity === '1', '全屏查看器作品标题不可见', opened);

  await page.locator('[data-artwork-scale="2"]').click();
  const zoomed = await page.evaluate(() => ({
    scale: document.querySelector('#artworkViewerScale')?.textContent.trim() || '',
    transform: getComputedStyle(document.querySelector('#artworkViewerImage')).transform,
  }));
  check(zoomed.scale === '2×' && zoomed.transform !== 'none', '放大按钮没有把作品切换到2倍', zoomed);
  const stageBox = await page.locator('#artworkViewerStage').boundingBox();
  await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + stageBox.width / 2 + 90, stageBox.y + stageBox.height / 2 + 45, {steps: 4});
  await page.mouse.up();
  const draggedTransform = await page.locator('#artworkViewerImage').evaluate((node) => getComputedStyle(node).transform);
  check(draggedTransform !== zoomed.transform, '放大后的作品不能拖动查看其他区域', {before: zoomed.transform, after: draggedTransform});
  await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
  await page.mouse.wheel(0, -120);
  const wheelScale = await page.locator('#artworkViewerScale').textContent();
  check(wheelScale === '2.25×', '滚轮没有按0.25倍步长缩放作品', {wheelScale});
  await page.locator('[data-artwork-scale="4"]').click();
  const fourScale = await page.locator('#artworkViewerScale').textContent();
  check(fourScale === '4×', '4倍快捷入口没有生效', {fourScale});
  await page.locator('[data-artwork-scale="8"]').click();
  const maximumScale = await page.locator('#artworkViewerScale').textContent();
  check(maximumScale === '8×', '8倍快捷入口没有生效', {maximumScale});
  await page.locator('#artworkViewer').screenshot({path: '/tmp/ming-artwork-viewer.png'});

  await page.keyboard.press('Escape');
  check(!(await page.locator('#artworkViewer').evaluate((dialog) => dialog.open)), 'Escape没有关闭作品查看器', {});

  await page.locator('.art-card-landscape .art-frame img').dblclick();
  await page.waitForSelector('#artworkViewer[open]');
  const doubleClickedTitle = await page.locator('#artworkViewerTitle').textContent();
  check(doubleClickedTitle.includes('春夜宴桃李园图'), '双击没有打开被点击的作品', {doubleClickedTitle});
  await page.locator('[data-artwork-close]').click();

  await page.setViewportSize({width: 390, height: 844});
  await page.reload({waitUntil: 'networkidle'});
  await page.locator('.art-card-panorama').scrollIntoViewIfNeeded();
  await page.locator('.art-panorama-overview img').click();
  await page.waitForSelector('#artworkViewer[open]');
  const mobile = await page.evaluate(() => ({
    viewerWidth: document.querySelector('#artworkViewer')?.getBoundingClientRect().width || 0,
    viewport: innerWidth,
    pageWidth: document.body.scrollWidth,
  }));
  check(mobile.viewerWidth === mobile.viewport && mobile.pageWidth === mobile.viewport, '移动端单击查看器或页面宽度不正确', mobile);
  await page.locator('[data-artwork-close]').click();

  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto(`${baseUrl}/people.html?person=${encodeURIComponent('沈周')}`, {waitUntil: 'networkidle'});
  await page.waitForSelector('#drawer.open #detail .work-museum [data-artwork-open]');
  await page.locator('#detail .work-museum [data-artwork-open]').first().click();
  await page.waitForSelector('#artworkViewer[open]');
  const drawerViewerTitle = await page.locator('#artworkViewerTitle').textContent();
  check(drawerViewerTitle.includes('溪山秋色图'), '人物抽屉页面没有复用共享作品查看器', {drawerViewerTitle});
  await page.keyboard.press('Escape');
  const drawerEscape = await page.evaluate(() => ({
    viewerOpen: document.querySelector('#artworkViewer')?.open || false,
    drawerOpen: document.querySelector('#drawer')?.classList.contains('open') || false,
  }));
  check(!drawerEscape.viewerOpen && drawerEscape.drawerOpen, 'Escape关闭大图时连带关闭了人物抽屉', drawerEscape);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) throw new Error(`Artwork viewer verification failed:\n- ${failures.join('\n- ')}`);
console.log(JSON.stringify({pass: true, checks: 16, screenshot: '/tmp/ming-artwork-viewer.png'}));
