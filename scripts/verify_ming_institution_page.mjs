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
  const judicialVisibilityFailures = [];
  const judicialEndpointFailures = [];
  const judicialLabelCollisions = [];
  const visibleNodeCollisions = [];
  for (const viewport of [{width: 1440, height: 1000}, {width: 1024, height: 768}]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
    const nodes = await page.evaluate(() => ['court_judicial_review', 'three_judicial_offices'].map(id => {
      const element = document.querySelector(`.institution-node[data-id="${id}"]`);
      return {id, hidden: element?.hidden ?? true, box: element?.getBoundingClientRect().toJSON() ?? null};
    }));
    for (const node of nodes) {
      if (node.hidden || !node.box || node.box.width <= 0 || node.box.height <= 0) {
        judicialVisibilityFailures.push(`${node.id}@${viewport.width}×${viewport.height}`);
      }
    }
    const boxes = nodes.map(node => node.box);
    const [court, offices] = boxes;
    const overlaps = court && offices && court.left < offices.right && court.right > offices.left && court.top < offices.bottom && court.bottom > offices.top;
    if (overlaps) judicialCollisions.push(`${viewport.width}×${viewport.height}`);
    const allVisibleNodes = await page.evaluate(() => [...document.querySelectorAll('.institution-node:not([hidden])')].map(node => ({
      id: node.dataset.id,
      box: node.getBoundingClientRect().toJSON()
    })));
    for (let leftIndex = 0; leftIndex < allVisibleNodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < allVisibleNodes.length; rightIndex += 1) {
        const left = allVisibleNodes[leftIndex];
        const right = allVisibleNodes[rightIndex];
        if (left.box.left < right.box.right && left.box.right > right.box.left && left.box.top < right.box.bottom && left.box.bottom > right.box.top) {
          visibleNodeCollisions.push(`${left.id}/${right.id}@${viewport.width}×${viewport.height}`);
        }
      }
    }
    const relationGeometry = await page.evaluate(() => ['r_ml_09', 'r_ml_10'].map(id => {
      const path = document.querySelector(`.relation-path[data-id="${id}"]`);
      const label = document.querySelector(`.relation-label[data-id="${id}"]`);
      if (!path || !label) return {id, missing: true, endpointDistances: [], labelNodeCollisions: []};
      const ctm = path.getScreenCTM();
      const screenPoint = point => new DOMPoint(point.x, point.y).matrixTransform(ctm);
      const start = screenPoint(path.getPointAtLength(0));
      const end = screenPoint(path.getPointAtLength(path.getTotalLength()));
      const nodeCenter = nodeId => {
        const rect = document.querySelector(`.institution-node[data-id="${nodeId}"]`).getBoundingClientRect();
        return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
      };
      const from = nodeCenter(path.dataset.from);
      const to = nodeCenter(path.dataset.to);
      const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const labelBox = label.getBoundingClientRect();
      const labelNodeCollisions = [...document.querySelectorAll('.institution-node:not([hidden])')]
        .filter(node => {
          const box = node.getBoundingClientRect();
          return labelBox.left < box.right && labelBox.right > box.left && labelBox.top < box.bottom && labelBox.bottom > box.top;
        })
        .map(node => node.dataset.id);
      return {
        id,
        missing: false,
        endpointDistances: [distance(start, from), distance(end, to)],
        labelNodeCollisions
      };
    }));
    for (const relation of relationGeometry) {
      if (relation.missing || relation.endpointDistances.some(distance => distance > 2.5)) {
        judicialEndpointFailures.push(`${relation.id}@${viewport.width}×${viewport.height}:${relation.endpointDistances.map(distance => distance.toFixed(1)).join('/') || 'missing'}`);
      }
      if (relation.labelNodeCollisions.length) {
        judicialLabelCollisions.push(`${relation.id}@${viewport.width}×${viewport.height}:${relation.labelNodeCollisions.join(',')}`);
      }
    }
  }
  expect(judicialVisibilityFailures.length === 0, `Dali Temple and Three Judicial Offices must both be visible with non-zero rectangles before collision checks; failures: ${judicialVisibilityFailures.join(', ')}`);
  expect(judicialCollisions.length === 0, `court of judicial review and three judicial offices must not overlap at desktop widths; collisions: ${judicialCollisions.join(', ')}`);
  expect(judicialEndpointFailures.length === 0, `judicial relation endpoints must stay attached after node nudges; failures: ${judicialEndpointFailures.join(', ')}`);
  expect(judicialLabelCollisions.length === 0, `judicial relation labels must not overlap visible institution nodes; collisions: ${judicialLabelCollisions.join(', ')}`);
  expect(visibleNodeCollisions.length === 0, `visible institution nodes must not overlap at desktop widths; collisions: ${visibleNodeCollisions.join(', ')}`);
  await page.setViewportSize({width: 1440, height: 1000});
  const before = await page.locator('.graph-stage').boundingBox();
  const clickedNode = page.locator('.institution-node[data-id="embroidered_uniform_guard"]');
  await clickedNode.click();
  const drawer = page.locator('.institution-drawer');
  const drawerExists = await drawer.count() === 1;
  expect(drawerExists, 'institution dossier drawer must exist for node focus');
  if (drawerExists) {
    expect(await drawer.getAttribute('role') === 'dialog', 'institution dossier must expose dialog semantics');
    expect(await drawer.getAttribute('aria-modal') === 'true', 'institution dossier must be marked modal');
    expect(await drawer.getAttribute('aria-labelledby') === 'detailTitle', 'institution dossier must be labelled by its visible title');
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
  const mobileRelations = await page.evaluate(() => {
    const graph = JSON.parse(document.querySelector('#institutionGraphData').textContent);
    const year = Number(document.querySelector('#yearValue').textContent);
    const viewId = document.querySelector('.view-button[aria-pressed="true"]')?.dataset.view;
    const view = graph.views.find(item => item.id === viewId);
    const institutionById = new Map(graph.institutions.map(item => [item.id, item]));
    const activeAt = item => item.active_periods.some(period => year >= period.start && year <= period.end);
    const viewRelationIds = new Set(view?.relation_ids ?? []);
    const activeViewRelations = graph.relations.filter(relation =>
      viewRelationIds.has(relation.id) && activeAt(relation) && activeAt(institutionById.get(relation.from)) && activeAt(institutionById.get(relation.to))
    );
    return [...document.querySelectorAll('.mobile-system-group')].map(group => {
      const list = group.querySelector('[aria-label="当前关键关系"]');
      const summaries = list ? [...list.querySelectorAll('li')].map(item => ({
        id: item.dataset.relationId,
        label: item.textContent.trim()
      })) : [];
      const name = group.querySelector('.mobile-system-head b')?.textContent.trim();
      const system = graph.systems.find(item => item.name === name);
      const validRelations = activeViewRelations.filter(relation =>
        institutionById.get(relation.from).system === system?.id || institutionById.get(relation.to).system === system?.id
      );
      return {
        name,
        hasLabelledList: Boolean(list),
        count: summaries.length,
        expectedCount: Math.min(3, validRelations.length),
        relationIds: summaries.map(summary => summary.id),
        expectedRelationIds: validRelations.slice(0, 3).map(relation => relation.id),
        usesActiveViewRelations: summaries.every(summary => validRelations.some(relation => relation.id === summary.id && relation.label === summary.label))
      };
    });
  });
  expect(mobileRelations.length >= 4, 'mobile relation verification requires the rendered system groups');
  expect(mobileRelations.every(group => group.hasLabelledList), 'every mobile system group must label its relation summary list as 当前关键关系');
  expect(mobileRelations.every(group => group.count <= 3), 'mobile system groups must render at most three relation summaries');
  expect(mobileRelations.some(group => group.count > 0), 'mobile system groups must render active in-view relation summaries');
  expect(mobileRelations.every(group => group.count === group.expectedCount), 'each mobile system group must summarize up to three relations that touch that system');
  expect(mobileRelations.every(group => JSON.stringify(group.relationIds) === JSON.stringify(group.expectedRelationIds)), 'mobile relation summaries must expose the exact ordered first-three active current-view relation IDs for their system');
  expect(mobileRelations.every(group => group.usesActiveViewRelations), 'mobile relation summaries must reuse active, in-view relation labels for their system');

  if (mobileDrawerExists) {
    const closeButton = mobileDrawer.locator('.drawer-close');
    const finalLink = mobileDrawer.locator('a').last();
    await closeButton.focus();
    await page.keyboard.press('Shift+Tab');
    expect(await finalLink.evaluate(node => node === document.activeElement), 'Shift+Tab from drawer close must wrap to the final focusable link');
    await page.keyboard.press('Tab');
    expect(await closeButton.evaluate(node => node === document.activeElement), 'Tab from the final drawer link must wrap to drawer close');
    await page.keyboard.press('Escape');
    const mobileTrigger = page.locator('.mobile-node').filter({hasText: '锦衣卫'});
    expect(await mobileTrigger.evaluate(node => node === document.activeElement), 'closing the mobile drawer must restore focus to its mobile node trigger');
    await mobileTrigger.click();
    await closeButton.click();
    expect(await mobileTrigger.evaluate(node => node === document.activeElement), 'clicking drawer close must restore focus to its mobile node trigger');
  }

  await page.evaluate(() => setInstitutionYear(1477));
  await page.locator('.mobile-node').filter({hasText: '西厂'}).click();
  await page.evaluate(() => setInstitutionYear(1390));
  const invalidatedFocus = await page.evaluate(() => {
    const active = document.activeElement;
    const box = active?.getBoundingClientRect();
    return {
      drawerHidden: document.querySelector('.institution-drawer')?.hidden,
      id: active?.id,
      visible: Boolean(box && box.width > 0 && box.height > 0 && getComputedStyle(active).visibility !== 'hidden')
    };
  });
  expect(invalidatedFocus.drawerHidden === true, 'invalidating the selected institution by year must close the drawer');
  expect(invalidatedFocus.id === 'yearRange', `invalidating the selected institution must focus the visible year control, got ${invalidatedFocus.id || 'no id'}`);
  expect(invalidatedFocus.visible, 'focus fallback after year invalidation must be visibly rendered');

  await page.evaluate(() => setInstitutionYear(1370));
  await page.locator('.view-button[data-view="military_command"]').click();
  const nonDefaultMobile = await page.evaluate(() => {
    const graph = JSON.parse(document.querySelector('#institutionGraphData').textContent);
    const year = Number(document.querySelector('#yearValue').textContent);
    const viewId = document.querySelector('.view-button[aria-pressed="true"]')?.dataset.view;
    const view = graph.views.find(item => item.id === viewId);
    const institutionById = new Map(graph.institutions.map(item => [item.id, item]));
    const activeAt = item => item.active_periods.some(period => year >= period.start && year <= period.end);
    const topicIds = new Set(view?.institution_ids ?? []);
    const relationIds = new Set(view?.relation_ids ?? []);
    const activeViewRelations = graph.relations.filter(relation =>
      relationIds.has(relation.id) && activeAt(relation) && activeAt(institutionById.get(relation.from)) && activeAt(institutionById.get(relation.to))
    );
    const expectedGroups = graph.systems.map(system => {
      const nodes = graph.institutions.filter(node => node.system === system.id && activeAt(node));
      return {
        name: system.name,
        nodeIds: nodes.map(node => node.id),
        contextNodeIds: nodes.filter(node => !topicIds.has(node.id)).map(node => node.id),
        relationIds: activeViewRelations.filter(relation =>
          institutionById.get(relation.from).system === system.id || institutionById.get(relation.to).system === system.id
        ).slice(0, 3).map(relation => relation.id)
      };
    }).filter(group => group.nodeIds.length);
    const renderedGroups = [...document.querySelectorAll('.mobile-system-group')].map(group => ({
      name: group.querySelector('.mobile-system-head b')?.textContent.trim(),
      nodeIds: [...group.querySelectorAll('.mobile-node')].map(node => node.dataset.id),
      contextNodeIds: [...group.querySelectorAll('.mobile-node.is-context')].map(node => node.dataset.id),
      relationIds: [...group.querySelectorAll('[aria-label="当前关键关系"] li')].map(item => item.dataset.relationId)
    }));
    return {
      year,
      viewId,
      renderedNodeIds: renderedGroups.flatMap(group => group.nodeIds),
      expectedNodeIds: expectedGroups.flatMap(group => group.nodeIds),
      renderedGroups,
      expectedGroups
    };
  });
  expect(nonDefaultMobile.year === 1370, `non-default mobile synchronization must use year 1370, got ${nonDefaultMobile.year}`);
  expect(nonDefaultMobile.viewId === 'military_command', `non-default mobile synchronization must use the military-command view, got ${nonDefaultMobile.viewId}`);
  expect(JSON.stringify(nonDefaultMobile.renderedNodeIds) === JSON.stringify(nonDefaultMobile.expectedNodeIds), 'non-default mobile nodes must exactly match all graph institutions active in 1370');
  expect(JSON.stringify(nonDefaultMobile.renderedGroups) === JSON.stringify(nonDefaultMobile.expectedGroups), 'non-default mobile grouping, view emphasis, and ordered relation IDs must exactly match the active graph contract');
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
