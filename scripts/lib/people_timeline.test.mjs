import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  canonicalPersonName,
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
