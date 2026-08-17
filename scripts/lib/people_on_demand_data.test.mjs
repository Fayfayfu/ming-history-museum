import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPeopleOnDemandData, emitPeopleOnDemandData } from './people_on_demand_data.mjs';

const fixture = {
  core: [{
    name: '朱元璋',
    category: '皇帝',
    office: '明太祖',
    birth: 1328,
    death: 1398,
    domains: ['政治制度'],
    scenes: [{ title: '即位', text: '叙事文本不应进入索引。' }],
    historicalSlices: [{ title: '洪武元年', text: '历史切片不应进入索引。' }],
  }],
  personInstitutionIds: { 朱元璋: ['stale-fallback-only'] },
  institutionData: {
    institutions: [
      { id: 'central-secretariat', people: [{ name: '朱元璋', relation: '设立' }] },
      { id: 'censorate-platform', people: [{ name: '朱元璋', relation: '整顿' }, { name: '朱棣', relation: '无关' }] },
    ],
  },
  portraits: { people: { 朱元璋: { file: 'assets/portraits/zhu.jpg', kind: 'sourced' } } },
  storytelling: { people: { 朱元璋: { scenes: [{ title: '幼年' }] } } },
  historicalSlices: { people: { 朱元璋: { title: '建立明朝' } } },
  creativeWorks: { people: { 朱元璋: { works: [{ title: '长篇作品' }] } } },
  personPages: { people: { 朱元璋: { slug: 'zhu-yuan-zhang' } } },
  emperorDrawerProfiles: { identities: { 朱元璋: { templeName: '太祖', eraName: '洪武' } } },
  eventData: {
    stages: [{ id: 'founding', label: '开国' }],
    events: [{
      id: 'hongwu-founding',
      year: 1368,
      date: '1368年正月',
      title: '建立明朝',
      stage: 'founding',
      category: '政权更替',
      emperor: '洪武帝',
      location: '南京',
      people: ['朱元璋'],
      institutions: ['皇帝制度'],
      cause: '完整事件文本不应进入索引。',
      course: '完整事件文本不应进入索引。',
      result: '完整事件文本不应进入索引。',
      impact: '完整事件文本不应进入索引。',
    }],
  },
};

test('keeps narrative fields out of people index', () => {
  const result = buildPeopleOnDemandData(fixture);
  const entry = result.peopleIndex.people.find((person) => person.id === 'c0');

  assert.deepEqual(entry, {
    id: 'c0', name: '朱元璋', category: '皇帝', office: '明太祖',
    birth: 1328, death: 1398, domains: ['政治制度'], institutionIds: ['central-secretariat', 'censorate-platform'],
    portrait: { file: 'assets/portraits/zhu.jpg', kind: 'sourced' },
    detailUrl: 'assets/data/people-details/c0.json',
  });
  assert.equal('scenes' in entry, false);
  assert.equal('historicalSlices' in entry, false);
  assert.ok(result.peopleDetails.get('c0').drawer);
  assert.equal(result.peopleDetails.get('c0').id, 'c0');
  assert.deepEqual(result.peopleIndex, { version: 1, people: result.peopleIndex.people });
  assert.equal(result.eventsIndex.version, 1);
  assert.deepEqual(result.eventsIndex.stages, fixture.eventData.stages);
});

test('derives every institution association and retains both drawer profile shapes', () => {
  const emperor = buildPeopleOnDemandData(fixture);
  assert.deepEqual(emperor.peopleIndex.people[0].institutionIds, ['central-secretariat', 'censorate-platform']);
  assert.deepEqual(emperor.peopleDetails.get('c0').drawer.emperorDrawerProfile, { templeName: '太祖', eraName: '洪武' });

  const nonEmperor = buildPeopleOnDemandData({
    ...fixture,
    core: [{ ...fixture.core[0], id: 'civil-minister', category: '文臣' }],
    emperorDrawerProfiles: { people: { 朱元璋: { lead: '非皇帝人物抽屉资料' } } },
  });
  assert.deepEqual(nonEmperor.peopleDetails.get('civil-minister').drawer.emperorDrawerProfile, { lead: '非皇帝人物抽屉资料' });
});

test('maps all source IDs to exactly one detail', () => {
  const result = buildPeopleOnDemandData(fixture);

  assert.deepEqual([...result.peopleDetails.keys()].sort(), ['c0']);
  assert.deepEqual([...result.eventDetails.keys()].sort(), fixture.eventData.events.map((event) => event.id).sort());
  assert.equal(result.eventsIndex.events[0].cause, undefined);
  assert.equal(result.eventDetails.get('hongwu-founding').id, 'hongwu-founding');
  assert.equal(result.eventDetails.get('hongwu-founding').cause, '完整事件文本不应进入索引。');
});

test('gives each index record a matching detail path', () => {
  const result = buildPeopleOnDemandData(fixture);

  for (const entry of result.peopleIndex.people) {
    assert.equal(result.peopleDetails.get(entry.id).id, entry.id);
    assert.match(entry.detailUrl, /^assets\/data\/people-details\/[a-z0-9-]+\.json$/);
  }
});

test('emits deterministic index and detail shards while removing only stale JSON details', async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'people-on-demand-data-'));
  const dataRoot = path.join(outDir, 'assets', 'data');
  const peopleDetails = path.join(dataRoot, 'people-details');
  const eventDetails = path.join(dataRoot, 'event-details');
  try {
    await fs.mkdir(peopleDetails, { recursive: true });
    await fs.mkdir(eventDetails, { recursive: true });
    await fs.writeFile(path.join(peopleDetails, 'stale.json'), '{}');
    await fs.writeFile(path.join(eventDetails, 'stale.json'), '{}');
    await fs.writeFile(path.join(peopleDetails, 'keep.txt'), 'preserve');

    const result = buildPeopleOnDemandData(fixture);
    await emitPeopleOnDemandData(outDir, result);

    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(dataRoot, 'people-index.json'), 'utf8')),
      result.peopleIndex,
    );
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(dataRoot, 'event-details', 'hongwu-founding.json'), 'utf8')),
      result.eventDetails.get('hongwu-founding'),
    );
    await assert.rejects(fs.access(path.join(peopleDetails, 'stale.json')));
    await assert.rejects(fs.access(path.join(eventDetails, 'stale.json')));
    assert.equal(await fs.readFile(path.join(peopleDetails, 'keep.txt'), 'utf8'), 'preserve');
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test('deeply isolates every returned index and detail object from source data', () => {
  const source = structuredClone(fixture);
  const result = buildPeopleOnDemandData(fixture);

  result.peopleIndex.people[0].domains.push('军事边疆');
  result.peopleIndex.people[0].institutionIds.push('six-ministries');
  result.peopleIndex.people[0].portrait.file = 'changed.jpg';
  result.eventsIndex.stages[0].label = 'changed';
  result.eventsIndex.events[0].people.push('徐达');
  result.peopleDetails.get('c0').drawer.person.scenes[0].text = 'changed';
  result.peopleDetails.get('c0').drawer.storytelling.scenes[0].title = 'changed';
  result.peopleDetails.get('c0').drawer.creativeWorks.works[0].title = 'changed';
  result.peopleDetails.get('c0').drawer.emperorDrawerProfile.templeName = 'changed';
  result.eventDetails.get('hongwu-founding').cause = 'changed';
  assert.deepEqual(fixture, source);
});

test('rejects missing and duplicate people and event IDs', () => {
  assert.throws(
    () => buildPeopleOnDemandData({ ...fixture, core: [{ ...fixture.core[0], id: '' }] }),
    /missing person id/i,
  );
  assert.throws(
    () => buildPeopleOnDemandData({ ...fixture, core: [{ ...fixture.core[0], id: 'same' }, { ...fixture.core[0], id: 'same', name: '朱棣' }] }),
    /duplicate person id: same/i,
  );
  assert.throws(
    () => buildPeopleOnDemandData({ ...fixture, eventData: { ...fixture.eventData, events: [{ ...fixture.eventData.events[0], id: '' }] } }),
    /missing event id/i,
  );
  assert.throws(
    () => buildPeopleOnDemandData({ ...fixture, eventData: { ...fixture.eventData, events: [{ ...fixture.eventData.events[0] }, { ...fixture.eventData.events[0] }] } }),
    /duplicate event id: hongwu-founding/i,
  );
});
