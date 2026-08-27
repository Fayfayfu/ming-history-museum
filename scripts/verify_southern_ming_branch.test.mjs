import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  layoutPeopleTimeline,
  validatePeopleTimelineData,
} from './lib/people_timeline.mjs';
import { validatePoliticalPhases } from './lib/political_phases.mjs';

const branchPrimary = [
  { name: '朱由崧', era: '弘光', start: 1644, end: 1645 },
  { name: '朱聿键', era: '隆武', start: 1645, end: 1646 },
  { name: '朱由榔', era: '永历', start: 1646, end: 1662 },
];
const branchNames = branchPrimary.map((item) => item.name);
const reviewedLateMingPhases = [
  { name: '史可法', regime: '弘光', start: 1644, end: 1645, sourceId: 'MS274', confidence: '高' },
  { name: '黄道周', regime: '隆武', start: 1645, end: 1646, sourceId: 'MS255', confidence: '高' },
  { name: '李自成', regime: '大顺', start: 1644, end: 1645, sourceId: 'MS309', confidence: '高' },
  { name: '多尔衮', regime: '清', start: 1644, end: 1650, sourceId: 'DPM_DORGON', confidence: '高' },
];
const outputHtml = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史人物谱_1368-1644.html';

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

test('late-Ming connected people have source-bounded 1644—1662 political phases without creating new identities', async () => {
  const [core, timelineData, phaseData] = await Promise.all([
    readJson('data/ming_core.json'),
    readJson('data/ming_people_timeline.json'),
    readJson('data/ming_political_phases.json'),
  ]);

  assert.deepEqual(
    validatePoliticalPhases({
      roster: new Set(core.map((person) => person.name)),
      phaseData: { ...phaseData, source_catalog: timelineData.source_catalog },
    }),
    [],
  );
  for (const expected of reviewedLateMingPhases) {
    const phase = phaseData.people[expected.name]?.find((item) => item.regime === expected.regime && item.start === expected.start && item.end === expected.end);
    assert.ok(phase, `${expected.name} must retain the reviewed ${expected.regime} phase`);
    assert.equal(phase.confidence, expected.confidence);
    assert.deepEqual(phase.sourceIds, [expected.sourceId]);
    assert.ok(timelineData.source_catalog[expected.sourceId], `${expected.name} source must exist in the shared catalog`);
    assert.match(phase.note || '', /可核|可证|可确认/, `${expected.name} phase must keep a source boundary`);
    assert.equal(core.filter((person) => person.name === expected.name).length, 1, `${expected.name} must remain one formal person`);
  }
});

test('branch has three rulers without changing the emperor spine', async () => {
  const [core, branch] = await Promise.all([
    readJson('data/ming_core.json'),
    readJson('data/ming_southern_ming_branch.json'),
  ]);

  assert.equal(core.filter((person) => person.category === '皇帝').length, 16);
  assert.deepEqual(branch.primary.map((item) => item.name), ['朱由崧', '朱聿键', '朱由榔']);
  for (const item of branch.primary) {
    assert.equal(core.find((person) => person.name === item.name)?.category, '政权人物');
  }
});

test('branch rulers stay in the external timeline lane and ruler political phases', async () => {
  const [core, children, timelineData, branch, phaseData] = await Promise.all([
    readJson('data/ming_core.json'),
    readJson('data/ming_children_important.json'),
    readJson('data/ming_people_timeline.json'),
    readJson('data/ming_southern_ming_branch.json'),
    readJson('data/ming_political_phases.json'),
  ]);
  const people = validatePeopleTimelineData({ core, children, timelineData });
  const layout = layoutPeopleTimeline(people);
  const peopleByName = new Map(people.map((person) => [person.name, person]));
  const nodeByName = new Map(layout.nodes.map((node) => [node.name, node]));

  assert.equal(people.length, 178);
  assert.deepEqual(
    branch.primary.map(({ name, era, start, end }) => ({ name, era, start, end })),
    branchPrimary,
  );
  assert.deepEqual(layout.boundaries.map((boundary) => boundary.year), [1368, 1644, 1662]);
  assert.equal(layout.maxYear, 1662);
  assert.deepEqual(
    validatePoliticalPhases({
      roster: new Set(core.map((person) => person.name)),
      phaseData: { ...phaseData, source_catalog: timelineData.source_catalog },
    }),
    [],
  );

  for (const name of branchNames) {
    assert.equal(peopleByName.get(name)?.source, 'core');
    assert.equal(peopleByName.get(name)?.timeline_size, 'standard');
    assert.equal(nodeByName.get(name)?.lane.id, 'external');
    assert.equal(phaseData.people[name]?.[0]?.phase, 'ruler');
  }

  for (const item of branch.primary) {
    assert.equal(item.sourceIds.length, 2, `${item.name} must retain two traceable sources`);
    for (const sourceId of item.sourceIds) {
      assert.ok(timelineData.source_catalog[sourceId], `${item.name} source is missing from the shared catalog: ${sourceId}`);
    }
  }
  assert.equal(core.find((person) => person.name === '朱由崧')?.source1, timelineData.source_catalog.DPM_NANMING_HONGGUANG.url);
  assert.equal(core.find((person) => person.name === '朱聿键')?.source1, timelineData.source_catalog.DPM_NANMING_LONGWU.url);
  assert.equal(core.find((person) => person.name === '朱由榔')?.source1, timelineData.source_catalog.NMC_YONGLI_EDICT.url);
  assert.deepEqual(timelineData.source_catalog.NMC_YONGLI_EDICT, {
    label: '中国国家博物馆·康熙元年三月十二日俘获永历帝宣捷诏谕',
    url: 'https://www.chnmuseum.cn/zp/zpml/gjwxbt/202008/t20200824_247135.shtml',
    kind: '博物馆',
  });
});

test('static people build renders the branch after the emperor spine with people links', async () => {
  const result = spawnSync(process.execPath, ['scripts/build_ming_html.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

  const html = await fs.readFile(path.resolve(outputHtml), 'utf8');
  const emperorIndex = html.indexOf('id="emperors"');
  const branchIndex = html.indexOf('南明延续政权 · 1644—1662');
  const eventIndex = html.indexOf('id="eventLab"');

  assert.ok(emperorIndex > 0, 'emperor spine section must render');
  assert.ok(branchIndex > emperorIndex, 'Southern Ming branch must follow the emperor spine');
  assert.ok(eventIndex > branchIndex, 'Southern Ming branch must render before the event hall');
  for (const name of branchNames) {
    assert.match(html, new RegExp(`people\\.html\\?person=${encodeURIComponent(name)}`));
  }
  assert.doesNotMatch(html, /第17|第18|第19/);
});
