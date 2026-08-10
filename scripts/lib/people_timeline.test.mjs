import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  canonicalPersonName,
  layoutPeopleTimeline,
  PEOPLE_TIMELINE_CSS,
  renderPeopleTimeline,
  uniquePeopleRoster,
  validatePeopleTimelineData,
} from './people_timeline.mjs';

const core = JSON.parse(await fs.readFile('data/ming_core.json', 'utf8'));
const children = JSON.parse(await fs.readFile('data/ming_children_important.json', 'utf8'));

test('canonicalPersonName normalizes traditional variants used by the two datasets', () => {
  assert.equal(canonicalPersonName('朱祁鎮'), '朱祁镇');
  assert.equal(canonicalPersonName(' 朱載坖 '), '朱载坖');
});

test('uniquePeopleRoster keeps core records and removes 13 duplicate child records', () => {
  const roster = uniquePeopleRoster(core, children);
  assert.equal(roster.length, 163);
  assert.equal(new Set(roster.map((person) => canonicalPersonName(person.name))).size, 163);
  assert.equal(roster.find((person) => person.name === '朱棣').source, 'core');
});

test('validatePeopleTimelineData rejects missing people and unregistered sources', () => {
  const fixtureCore = [{ name: '甲', category: '文臣', office: '尚书' }];
  const fixture = { version: '1.0', source_catalog: {}, people: [] };
  assert.throws(
    () => validatePeopleTimelineData({ core: fixtureCore, children: [], timelineData: fixture }),
    /Missing timeline records: 甲/
  );
  fixture.people.push({
    name: '甲', source: 'core', timeline_year: 1400, timeline_year_label: '1400',
    timeline_year_basis: '进入仕途', timeline_year_confidence: '高',
    timeline_source_refs: ['UNKNOWN'], timeline_role: '尚书', timeline_size: 'standard'
  });
  assert.throws(
    () => validatePeopleTimelineData({ core: fixtureCore, children: [], timelineData: fixture }),
    /Unknown timeline source UNKNOWN/
  );
});

test('validatePeopleTimelineData aggregates null and undefined source entry failures', () => {
  const fixtureCore = [{ name: '甲', category: '文臣', office: '尚书' }];
  const fixture = {
    version: '1.0',
    source_catalog: { SRC_NULL: null, SRC_UNDEFINED: undefined },
    people: [{
      name: '甲', source: 'core', timeline_year: '1400', timeline_year_label: '1400',
      timeline_year_basis: '进入仕途', timeline_year_confidence: '高',
      timeline_source_refs: ['SRC_NULL'], timeline_role: '尚书', timeline_size: 'standard',
    }],
  };

  assert.throws(
    () => validatePeopleTimelineData({ core: fixtureCore, children: [], timelineData: fixture }),
    (error) => {
      assert.match(error.message, /Incomplete timeline source SRC_NULL/);
      assert.match(error.message, /Incomplete timeline source SRC_UNDEFINED/);
      assert.match(error.message, /甲: invalid timeline_year/);
      return true;
    }
  );
});

test('layout uses one strict x scale and keeps people on the correct side of the axis', () => {
  const people = [
    { name: '前朝人物', category: '政权人物', timeline_year: 1352, timeline_size: 'standard' },
    { name: '于谦', category: '文臣', timeline_year: 1421, timeline_size: 'featured' },
    { name: '王守仁', category: '文臣', timeline_year: 1499, timeline_size: 'featured' },
    { name: '张居正', category: '文臣', timeline_year: 1547, timeline_size: 'featured' },
    { name: '甲帝', category: '皇帝', timeline_year: 1450, timeline_size: 'emperor' },
    { name: '甲宦官', category: '宦官', timeline_year: 1450, timeline_size: 'standard' },
    { name: '过渡人物', category: '政权人物', timeline_year: 1650, timeline_size: 'standard' },
  ];
  const layout = layoutPeopleTimeline(people, { yearPx: 22, paddingX: 140, minHeight: 960, maxHeight: 1400 });
  const byName = Object.fromEntries(layout.nodes.map((node) => [node.name, node]));
  assert.equal(byName.王守仁.x - byName.于谦.x, (1499 - 1421) * 22);
  assert.equal(byName.张居正.x - byName.王守仁.x, (1547 - 1499) * 22);
  assert.ok(byName.甲帝.y < layout.axisY);
  assert.ok(byName.甲宦官.y > layout.axisY);
  assert.ok(layout.boundaries.some((boundary) => boundary.year === 1368));
  assert.ok(layout.boundaries.some((boundary) => boundary.year === 1644));
});

test('top lanes run women children emperor toward the axis while eunuchs stay nearest below', () => {
  const people = [
    { name: '甲后妃', category: '后妃与内廷女性', timeline_year: 1450, timeline_size: 'standard' },
    { name: '甲皇子', category: '皇室子女', timeline_year: 1450, timeline_size: 'standard' },
    { name: '甲皇帝', category: '皇帝', timeline_year: 1450, timeline_size: 'emperor' },
    { name: '甲宦官', category: '宦官', timeline_year: 1450, timeline_size: 'standard' },
    { name: '甲文臣', category: '文臣', timeline_year: 1450, timeline_size: 'standard' },
  ];
  const layout = layoutPeopleTimeline(people);
  const byName = Object.fromEntries(layout.nodes.map((node) => [node.name, node]));
  const distance = (node) => Math.abs(node.y - layout.axisY);

  assert.ok(distance(byName.甲后妃) > distance(byName.甲皇子));
  assert.ok(distance(byName.甲皇子) > distance(byName.甲皇帝));
  assert.ok(distance(byName.甲宦官) < distance(byName.甲文臣));
});

test('dense people stay on their year and never overlap more than 20 percent in one slot', () => {
  const people = Array.from({ length: 10 }, (_, index) => ({
    name: `同年人物${index}`, category: '文臣', timeline_year: 1449,
    timeline_size: index === 0 ? 'featured' : 'standard',
  }));
  const layout = layoutPeopleTimeline(people);
  const nodes = layout.nodes.filter((node) => node.timeline_year === 1449);
  assert.equal(new Set(nodes.map((node) => node.x)).size, 1);
  assert.ok(new Set(nodes.map((node) => node.slot)).size > 1);
  assert.ok(layout.height >= 960 && layout.height <= 1400);
  for (const slot of new Set(nodes.map((node) => node.slot))) {
    const inSlot = nodes.filter((node) => node.slot === slot).sort((left, right) => left.x - right.x);
    for (let index = 1; index < inSlot.length; index += 1) {
      const previous = inSlot[index - 1];
      const current = inSlot[index];
      assert.ok(current.x - previous.x >= 0.8 * (previous.sizePx + current.sizePx) / 2);
    }
  }
});

test('layout keeps real timeline data on the strict year scale', async () => {
  const timelineData = JSON.parse(await fs.readFile('data/ming_people_timeline.json', 'utf8'));
  const people = validatePeopleTimelineData({ core, children, timelineData });
  const layout = layoutPeopleTimeline(people);
  const repeated = layoutPeopleTimeline(people);
  const names = new Set(layout.nodes.map((node) => canonicalPersonName(node.name)));

  assert.equal(layout.nodes.length, 163);
  assert.equal(names.size, 163);
  assert.ok(layout.width >= 6500 && layout.width <= 7500);
  assert.ok(layout.height >= 960 && layout.height <= 1000, `timeline height must stay within one 1000px canvas, got ${layout.height}px`);
  const topNodes = layout.nodes.filter((node) => node.lane.side === 'top');
  const topContentEdge = Math.min(...topNodes.map((node) => node.y - node.sizePx / 2));
  assert.ok(
    topContentEdge >= 48 && topContentEdge <= 64,
    `top whitespace must stay compact without clipping portraits, got ${topContentEdge}px`
  );
  const laneBounds = (laneId) => {
    const laneNodes = layout.nodes.filter((node) => node.lane.id === laneId);
    return {
      min: Math.min(...laneNodes.map((node) => node.y - node.sizePx / 2)),
      max: Math.max(...laneNodes.map((node) => node.y + node.sizePx / 2)),
    };
  };
  for (const [outerLane, innerLane] of [
    ['women', 'children'],
    ['children', 'emperor'],
    ['eunuch', 'officials'],
    ['officials', 'independent'],
    ['independent', 'external'],
  ]) {
    const gap = laneBounds(innerLane).min - laneBounds(outerLane).max;
    assert.ok(gap >= 0 && gap <= 4, `${outerLane}/${innerLane} category gap must stay compact, got ${gap}px`);
  }
  assert.ok(layout.minYear < 1368);
  assert.ok(layout.maxYear >= 1644);
  assert.deepEqual(
    repeated.nodes.map((node) => [node.name, node.x, node.y, node.slot]),
    layout.nodes.map((node) => [node.name, node.x, node.y, node.slot])
  );
  for (const node of layout.nodes) {
    assert.equal(node.x, 140 + (node.timeline_year - layout.minYear) * 22);
  }
  for (const nodes of Object.values(Object.groupBy(layout.nodes, (node) => `${node.lane.id}:${node.slot}`))) {
    nodes.sort((left, right) => left.x - right.x);
    for (let index = 1; index < nodes.length; index += 1) {
      const previous = nodes[index - 1];
      const current = nodes[index];
      assert.ok(current.x - previous.x >= 0.8 * (previous.sizePx + current.sizePx) / 2);
    }
  }
});

test('timeline enlarges the complete curated group of eleven influential non-emperors', async () => {
  const timelineData = JSON.parse(await fs.readFile('data/ming_people_timeline.json', 'utf8'));
  const people = validatePeopleTimelineData({ core, children, timelineData });
  const layout = layoutPeopleTimeline(people);
  const featuredNames = layout.nodes
    .filter((node) => node.sizePx === 72)
    .map((node) => node.name)
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));

  assert.deepEqual(featuredNames, [
    '于谦', '刘基', '张居正', '徐光启', '徐达', '戚继光', '李时珍', '海瑞', '王守仁', '郑和', '魏忠贤',
  ].sort((left, right) => left.localeCompare(right, 'zh-CN')));
});

test('renderer outputs every semantic lane and never writes 最近皇帝', async () => {
  const timelineData = JSON.parse(await fs.readFile('data/ming_people_timeline.json', 'utf8'));
  const people = validatePeopleTimelineData({ core, children, timelineData });
  const layout = layoutPeopleTimeline(people);
  const html = renderPeopleTimeline({ people, layout, portraitFor: () => null });

  assert.match(html, /id="peopleTimelineView"/);
  assert.equal((html.match(/data-timeline-person=/g) || []).length, 163);
  const personArticles = html.match(/<article class="timeline-person[^>]*>/g) || [];
  const allowedLanes = new Set(['women', 'children', 'emperor', 'eunuch', 'officials', 'independent', 'external']);
  assert.equal(personArticles.length, 163);
  for (const article of personArticles) {
    const lane = article.match(/data-lane="([^"]+)"/)?.[1];
    const layer = article.match(/data-layer="([^"]+)"/)?.[1];
    assert.ok(allowedLanes.has(lane), `unexpected or missing lane in ${article}`);
    assert.match(layer || '', /^\d+$/, `invalid layer in ${article}`);
  }
  for (const label of ['后妃与内廷女性', '皇子女', '皇帝', '宦官', '文臣／武官', '在野人物', '政权人物／域外人物']) {
    assert.match(html, new RegExp(label));
  }
  assert.doesNotMatch(html, /最近皇帝/);
  assert.match(html, /data-people-view="timeline"/);
  assert.match(html, /data-people-view="table"/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.people-timeline-viewport\{overflow-x:auto/);
});

test('renderer gives all 163 people escaped basis text and one non-blocking axis guide', async () => {
  const timelineData = JSON.parse(await fs.readFile('data/ming_people_timeline.json', 'utf8'));
  const people = validatePeopleTimelineData({ core, children, timelineData });
  const layout = layoutPeopleTimeline(people);
  const html = renderPeopleTimeline({ people, layout, portraitFor: () => null });

  assert.equal((html.match(/data-timeline-guide=/g) || []).length, 163);
  assert.equal((html.match(/class="timeline-person-basis"/g) || []).length, 163);
  assert.equal((html.match(/data-side="(?:top|bottom)"/g) || []).length, 163);
  assert.match(html, /永乐十九年中进士，进入仕途/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.timeline-person-guide\{[^}]*pointer-events:none/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.timeline-person\.is-selected \.timeline-person-guide/);
});

test('selected details expand toward the axis inside an isolated timeline stack', () => {
  const people = [
    {
      name: '甲后妃', category: '后妃与内廷女性', timeline_year: 1421,
      timeline_year_label: '1421', timeline_year_basis: '进入宫廷',
      timeline_role: '皇后', timeline_year_confidence: '高', timeline_size: 'standard',
    },
    {
      name: '乙外臣', category: '域外人物', timeline_year: 1422,
      timeline_year_label: '1422', timeline_year_basis: '首次遣使<入明',
      timeline_role: '使臣', timeline_year_confidence: '中', timeline_size: 'standard',
    },
  ];
  const html = renderPeopleTimeline({ people, layout: layoutPeopleTimeline(people) });

  assert.match(html, /首次遣使&lt;入明/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.people-timeline\{[^}]*isolation:isolate/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.timeline-person\[data-side="top"\][^{]*\.timeline-person-context/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.timeline-person\[data-side="bottom"\][^{]*\.timeline-person-context/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.timeline-boundary\{[^}]*top:0[^}]*height:100%/);
});

test('renderer uses final view wording and includes normalized category in every accessible name', () => {
  const people = [
    {
      name: '甲皇子', category: '皇室子女', timeline_year: 1421,
      timeline_year_label: '1421', timeline_year_basis: '受封',
      timeline_role: '亲王', timeline_year_confidence: '高', timeline_size: 'standard',
    },
    {
      name: '乙文臣', category: '文臣', timeline_year: 1422,
      timeline_year_label: '1422', timeline_year_basis: '中进士',
      timeline_role: '尚书', timeline_year_confidence: '高', timeline_size: 'standard',
    },
  ];
  const html = renderPeopleTimeline({ people, layout: layoutPeopleTimeline(people) });

  assert.match(html, />历史长卷<\/button>/);
  assert.match(html, />人物总表<\/button>/);
  assert.doesNotMatch(html, />时间长卷<\/button>|>人物表格<\/button>/);
  assert.match(html, /data-category-label="皇子女"/);
  assert.match(html, /aria-label="甲皇子，皇子女，亲王，1421进入历史叙事，高置信度"/);
  assert.match(html, /aria-label="乙文臣，文臣，尚书，1422进入历史叙事，高置信度"/);
});

test('renderer applies portrait crop metadata while showing a Chinese visitor label', () => {
  const people = [{
    name: '郑和', category: '宦官', timeline_year: 1401, timeline_year_label: '约1399—1402',
    timeline_year_basis: '首次进入宫廷差遣', timeline_role: '航海使臣',
    timeline_year_confidence: '中', timeline_size: 'featured',
  }];
  const html = renderPeopleTimeline({
    people,
    layout: layoutPeopleTimeline(people),
    portraitFor: () => ({
      file: 'assets/zheng-he.jpg',
      kind: 'sourced',
      label: '明末小说插图',
      objectPosition: '50% 24%',
      portraitTransform: 'scale(2.15)',
      transformOrigin: '100% 7%',
    }),
  });

  assert.match(html, /data-portrait-label="明末小说插图"/);
  assert.match(html, /style="[^"]*object-position:50% 24%[^"]*transform:scale\(2\.15\)[^"]*transform-origin:100% 7%/);
  assert.match(html, /data-timeline-image-source[^>]*>明末小说插图<\/span>/);
  assert.doesNotMatch(html, /data-timeline-image-source[^>]*>sourced<\/span>/);
});

test('renderer escapes person metadata and keeps portrait fallbacks available', () => {
  const people = [{
    name: '甲<乙', category: '文臣', timeline_year: 1421, timeline_year_label: '宣德六年',
    timeline_role: '兵部<尚书', timeline_year_confidence: '高', timeline_size: 'featured',
  }];
  const layout = layoutPeopleTimeline(people);
  const withPortrait = renderPeopleTimeline({
    people,
    layout,
    portraitFor: () => ({ file: 'assets/portrait?x="<x>', kind: 'AI想象像', label: '艺术<想象' }),
  });
  const withoutPortrait = renderPeopleTimeline({ people, layout, portraitFor: () => null });

  assert.match(withPortrait, /loading="lazy" decoding="async"/);
  assert.match(withPortrait, /data-portrait-kind="AI想象像"/);
  assert.match(withPortrait, /src="assets\/portrait\?x=&quot;&lt;x&gt;"/);
  assert.match(withPortrait, /甲&lt;乙/);
  assert.match(withPortrait, /兵部&lt;尚书/);
  assert.match(withPortrait, /<time datetime="1421">宣德六年<\/time>/);
  assert.match(withPortrait, /<button class="timeline-person-select"/);
  assert.match(withPortrait, /<button class="timeline-person-open"[^>]*>/);
  assert.doesNotMatch(withPortrait, /<button class="timeline-person-open"[^>]* hidden>/);
  assert.match(withPortrait, /timeline-portrait-fallback/);
  assert.match(withoutPortrait, /timeline-portrait--fallback/);
  assert.doesNotMatch(withoutPortrait, /<img /);
});

test('renderer only connects ARIA tabs to panels it renders and uses CSS selection for archive buttons', () => {
  const people = [{
    name: '甲', category: '文臣', timeline_year: 1421, timeline_year_label: '1421年',
    timeline_role: '尚书', timeline_year_confidence: '高', timeline_size: 'standard',
  }];
  const html = renderPeopleTimeline({ people, layout: layoutPeopleTimeline(people), portraitFor: () => null });

  assert.match(html, /id="peopleTimelineTab"[^>]*role="tab"[^>]*aria-controls="peopleTimelineView"/);
  assert.match(html, /id="peopleTimelineView"[^>]*role="tabpanel"[^>]*aria-labelledby="peopleTimelineTab"/);
  assert.doesNotMatch(html, /aria-controls="peopleTableView"/);
  assert.doesNotMatch(html, /peopleTableView/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.timeline-person-open\{display:none/);
  assert.match(PEOPLE_TIMELINE_CSS, /\.timeline-person\.is-selected [^{]*\.timeline-person-open[^}]*\{display:block/);
});
