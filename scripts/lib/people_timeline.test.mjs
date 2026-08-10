import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  canonicalPersonName,
  layoutPeopleTimeline,
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

test('layout uses one strict x scale and keeps the axis centered', () => {
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
  assert.equal(layout.axisY, layout.height / 2);
  assert.ok(byName.甲帝.y < layout.axisY);
  assert.ok(byName.甲宦官.y > layout.axisY);
  assert.ok(layout.boundaries.some((boundary) => boundary.year === 1368));
  assert.ok(layout.boundaries.some((boundary) => boundary.year === 1644));
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
  assert.ok(layout.height >= 960 && layout.height <= 1400);
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
