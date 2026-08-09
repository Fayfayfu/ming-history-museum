import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const url = file => `file://${path.join(root, file)}`;
const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
page.on('pageerror', error => failures.push(`page error: ${error.message}`));

try {
  await page.goto(url('institutions.html'), {waitUntil: 'domcontentloaded'});
  const initial = await page.evaluate(() => {
    const data = JSON.parse(document.querySelector('#institutionGraphData').textContent);
    return {
      title: document.title,
      nodes: data.institutions.length,
      relations: data.relations.length,
      views: data.views.length,
      year: Number(document.querySelector('#yearValue').textContent),
      activePhase: document.querySelector('.phase-button[aria-pressed="true"]')?.textContent.trim(),
      visibleNodes: document.querySelectorAll('.institution-node:not([hidden])').length,
      secretariatVisible: Boolean(document.querySelector('.institution-node[data-id="central_secretariat"]:not([hidden])')),
      cabinetVisible: Boolean(document.querySelector('.institution-node[data-id="grand_secretariat"]:not([hidden])')),
      westernDepotVisible: Boolean(document.querySelector('.institution-node[data-id="western_depot"]:not([hidden])')),
      legendItems: document.querySelectorAll('.relation-legend li').length,
      topicButtons: document.querySelectorAll('.view-button').length,
      hasRuler: Boolean(document.querySelector('.dynasty-ruler')),
      hasAxis: Boolean(document.querySelector('.imperial-axis')),
      hasTopicRail: Boolean(document.querySelector('.topic-rail')),
      legacyControlDeck: document.querySelectorAll('.control-deck').length,
      drawerHidden: document.querySelector('.institution-drawer')?.hidden,
      heroHeight: document.querySelector('.hall-hero')?.getBoundingClientRect().height,
      emperorBox: document.querySelector('[data-id="emperor"]')?.getBoundingClientRect().toJSON(),
      cabinetBox: document.querySelector('[data-id="grand_secretariat"]')?.getBoundingClientRect().toJSON(),
      bodyWidth: document.body.scrollWidth,
      viewport: innerWidth
    };
  });
  expect(initial.title.includes('制度馆'), 'page title must identify the institution hall');
  expect(initial.nodes === 29, `expected 29 embedded nodes, got ${initial.nodes}`);
  expect(initial.relations === 47, `expected 47 embedded relations, got ${initial.relations}`);
  expect(initial.views === 6, `expected 6 embedded views, got ${initial.views}`);
  expect(initial.year === 1600, `expected default year 1600, got ${initial.year}`);
  expect(initial.activePhase?.includes('正统至崇祯'), 'mid-late phase must be active by default');
  expect(initial.visibleNodes > 12, 'default graph must show a meaningful set of active nodes');
  expect(!initial.secretariatVisible, 'central secretariat must be hidden in 1600');
  expect(initial.cabinetVisible, 'grand secretariat must be visible in 1600');
  expect(!initial.westernDepotVisible, 'western depot must be hidden in 1600');
  expect(initial.legendItems === 7, `expected 7 relation legend items, got ${initial.legendItems}`);
  expect(initial.topicButtons === 6, `expected 6 view buttons, got ${initial.topicButtons}`);
  expect(initial.hasRuler, 'high-fidelity page must expose the dynasty ruler');
  expect(initial.hasAxis, 'high-fidelity page must expose the imperial axis');
  expect(initial.hasTopicRail, 'topic views must move into a narrow rail');
  expect(initial.legacyControlDeck === 0, 'legacy dashboard control deck must be removed');
  expect(initial.drawerHidden === true, 'institution dossier drawer must start closed');
  expect(initial.heroHeight >= 500 && initial.heroHeight <= 780, 'desktop hero must occupy the intended editorial range');
  expect(initial.emperorBox && initial.cabinetBox && Math.abs((initial.emperorBox.x + initial.emperorBox.width / 2) - (initial.cabinetBox.x + initial.cabinetBox.width / 2)) < 8, 'emperor and cabinet must share the central axis');
  expect(initial.bodyWidth <= initial.viewport, 'desktop page must not overflow horizontally');

  await page.locator('.phase-button[data-phase="early_hongwu"]').click();
  const early = await page.evaluate(() => ({
    year: Number(document.querySelector('#yearValue').textContent),
    secretariatVisible: Boolean(document.querySelector('.institution-node[data-id="central_secretariat"]:not([hidden])')),
    cabinetVisible: Boolean(document.querySelector('.institution-node[data-id="grand_secretariat"]:not([hidden])')),
    grandCommissionVisible: Boolean(document.querySelector('.institution-node[data-id="chief_military_commission"]:not([hidden])'))
  }));
  expect(early.year === 1370, `early phase must set year 1370, got ${early.year}`);
  expect(early.secretariatVisible, 'central secretariat must be visible in 1370');
  expect(!early.cabinetVisible, 'grand secretariat must be hidden in 1370');
  expect(early.grandCommissionVisible, 'chief military commission must be visible in 1370');

  await page.evaluate(() => setInstitutionYear(1477));
  await page.locator('.institution-node[data-id="western_depot"]').click();
  const westernDepot = await page.evaluate(() => ({
    visible: Boolean(document.querySelector('.institution-node[data-id="western_depot"]:not([hidden])')),
    title: document.querySelector('#detailTitle')?.textContent.trim(),
    state: document.querySelector('#detailState')?.textContent.trim(),
    boundary: document.querySelector('#detailBoundary')?.textContent.trim()
  }));
  expect(westernDepot.visible, 'western depot must be visible at the 1477 range');
  expect(westernDepot.title === '西厂', 'western depot detail must open');
  expect(westernDepot.state?.includes('反复设置'), 'western depot must be marked intermittent');
  expect(westernDepot.boundary?.includes('不得伪造'), 'western depot detail must expose the evidence boundary');

  await page.evaluate(() => setInstitutionYear(1390));
  await page.locator('.institution-node[data-id="court_judicial_review"]').click();
  const courtEarlyState = await page.locator('#detailState').textContent();
  await page.evaluate(() => setInstitutionYear(1425));
  const courtLaterState = await page.locator('#detailState').textContent();
  const courtFocusPreserved = await page.evaluate(() => document.activeElement?.classList.contains('drawer-close'));
  expect(courtEarlyState?.includes('反复改组 · 1381—1395'), 'court of judicial review drawer must show its 1390 active period');
  expect(courtLaterState?.includes('恢复后渐趋稳定 · 1399—1644'), 'open drawer must refresh when the selected institution crosses into a later active period');
  expect(courtFocusPreserved, 'drawer refresh must not steal focus from the current drawer control');
  await page.keyboard.press('Escape');

  await page.evaluate(() => setInstitutionYear(1600));
  await page.locator('.view-button[data-view="document_to_decree"]').click();
  const topic = await page.evaluate(() => ({
    activeView: document.querySelector('.view-button[aria-pressed="true"]')?.dataset.view,
    title: document.querySelector('#viewTitle')?.textContent.trim(),
    visibleNodes: [...document.querySelectorAll('.institution-node:not([hidden])')].map(node => node.dataset.id)
  }));
  expect(topic.activeView === 'document_to_decree', 'document-flow view must become active');
  expect(topic.title === '一道奏章如何变成命令', 'document-flow view title must update');
  expect(topic.visibleNodes.includes('transmission_office') && topic.visibleNodes.includes('directorate_ceremonial'), 'document-flow view must show its core institutions');

  await page.locator('.view-button[data-view="justice_vs_imperial_prison"]').click();
  const judicialCollisions = [];
  for (const viewport of [{width: 1440, height: 1000}, {width: 1024, height: 768}]) {
    await page.setViewportSize(viewport);
    const boxes = await page.evaluate(() => ['court_judicial_review', 'three_judicial_offices'].map(id =>
      document.querySelector(`.institution-node[data-id="${id}"]`)?.getBoundingClientRect().toJSON()
    ));
    const [court, offices] = boxes;
    const overlaps = court && offices && court.left < offices.right && court.right > offices.left && court.top < offices.bottom && court.bottom > offices.top;
    if (overlaps) judicialCollisions.push(`${viewport.width}×${viewport.height}`);
  }
  expect(judicialCollisions.length === 0, `court of judicial review and three judicial offices must not overlap at desktop widths; collisions: ${judicialCollisions.join(', ')}`);
  await page.setViewportSize({width: 1440, height: 1000});
  const before = await page.locator('.graph-stage').boundingBox();
  const clickedNode = page.locator('.institution-node[data-id="embroidered_uniform_guard"]');
  await clickedNode.click();
  const drawer = page.locator('.institution-drawer');
  const drawerExists = await drawer.count() === 1;
  expect(drawerExists, 'institution dossier drawer must exist for node focus');
  if (drawerExists) {
    expect(await drawer.getAttribute('aria-hidden') === 'false', 'node click must open dossier drawer');
    expect(await drawer.evaluate(node => node === document.activeElement || node.contains(document.activeElement)), 'node click must move focus into dossier drawer');
  }
  expect(await page.locator('.institution-node.is-dimmed').count() > 0, 'node focus must dim unrelated nodes');
  expect(await page.locator('.relation-path.is-focused').count() > 0, 'node focus must highlight adjacent relations');
  const after = await page.locator('.graph-stage').boundingBox();
  expect(before?.width === after?.width && before?.height === after?.height, 'drawer must not reflow the atlas');
  await page.keyboard.press('Escape');
  if (drawerExists) {
    expect(await drawer.getAttribute('aria-hidden') === 'true', 'Escape must close dossier drawer');
    expect(await clickedNode.evaluate(node => node === document.activeElement), 'Escape must return focus to the clicked institution node');
  }
  const linkedPeople = await page.locator('#detailPeople a').allTextContents();
  expect(linkedPeople.includes('陆炳'), '锦衣卫 detail must link 陆炳');
  expect(linkedPeople.includes('纪纲'), '锦衣卫 detail must link 纪纲');
  expect(linkedPeople.includes('蒋瓛'), '锦衣卫 detail must link 蒋瓛');
  expect(linkedPeople.includes('田尔耕'), '锦衣卫 detail must link 田尔耕');
  expect(linkedPeople.includes('钱宁'), '锦衣卫 detail must link 钱宁');

  if (!failures.length) {
    await page.screenshot({path: path.join(root, '制度馆_桌面预览.png'), fullPage: false});
  }

  for (const file of ['index.html', 'people.html', 'events.html', 'exhibitions.html']) {
    await page.goto(url(file), {waitUntil: 'domcontentloaded'});
    const navHasInstitutionHall = await page.locator('.museum-links a[href="institutions.html"]').count();
    expect(navHasInstitutionHall === 1, `${file}: navigation must link the institution hall`);
  }

  await page.setViewportSize({width: 390, height: 844});
  await page.goto(url('institutions.html'), {waitUntil: 'domcontentloaded'});
  const mobile = await page.evaluate(() => {
    const graphStage = document.querySelector('.graph-stage');
    const mobileStructure = document.querySelector('.mobile-structure');
    const drawer = document.querySelector('.institution-drawer');
    return {
      graphDisplay: graphStage ? getComputedStyle(graphStage).display : null,
      mobileDisplay: mobileStructure ? getComputedStyle(mobileStructure).display : null,
      mobileGroups: document.querySelectorAll('.mobile-system-group').length,
      drawerPosition: drawer ? getComputedStyle(drawer).position : null,
      bodyWidth: document.body.scrollWidth,
      viewport: innerWidth
    };
  });
  expect(mobile.graphDisplay === 'none', 'mobile must replace the dense graph instead of shrinking it');
  expect(mobile.mobileDisplay !== 'none', 'mobile narrative structure must be visible');
  expect(mobile.mobileGroups >= 4, 'mobile narrative must retain system grouping');
  expect(mobile.drawerPosition === 'fixed', 'mobile dossier drawer must exist and use fixed positioning');
  expect(mobile.bodyWidth <= mobile.viewport, 'mobile page must not overflow horizontally');
  await page.locator('.mobile-node').filter({hasText: '锦衣卫'}).click();
  const mobileDrawer = page.locator('.institution-drawer');
  const mobileDrawerExists = await mobileDrawer.count() === 1;
  expect(mobileDrawerExists, 'mobile institution selection must expose dossier drawer');
  const mobileDrawerBox = mobileDrawerExists ? await mobileDrawer.boundingBox() : null;
  expect((mobileDrawerBox?.height ?? 0) >= 844 * .75, 'mobile dossier drawer must reach at least 75% of viewport height');
  if (!failures.length) {
    await page.screenshot({path: path.join(root, '制度馆_移动端预览.png'), fullPage: false});
  }

  const motionEnabled = await browser.newPage({viewport: {width: 1440, height: 1000}});
  await motionEnabled.goto(url('institutions.html'), {waitUntil: 'domcontentloaded'});
  const normalTransition = await motionEnabled.locator('.institution-node').first().evaluate(node => getComputedStyle(node).transitionDuration);
  expect(normalTransition !== '0s', 'motion-enabled mode must retain node transitions before reduced-motion is applied');
  await motionEnabled.close();

  const reduced = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  await reduced.goto(url('institutions.html'), {waitUntil: 'domcontentloaded'});
  const transition = await reduced.locator('.institution-node').first().evaluate(node => getComputedStyle(node).transitionDuration);
  expect(transition === '0s', 'reduced-motion mode must remove node transitions');
  await reduced.close();
} catch (error) {
  failures.push(error.message);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Institution page verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Institution page verification passed: timeline, views, node details, people links, navigation and mobile layout.');
