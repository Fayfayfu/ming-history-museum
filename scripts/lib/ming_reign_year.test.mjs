import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  addMingEraDates,
  addStorytellingEraDates,
  formatHistoricalYearLabel,
  formatMingEraDate,
  formatMingEraLabel,
  mingEraYear,
} from './ming_reign_year.mjs';

test('event dates follow the actual改元 year instead of the emperor field', () => {
  assert.equal(formatMingEraDate({ id: 'e018', date: '1402年六月', emperor: '永乐帝' }), '建文四年六月');
  assert.equal(formatMingEraDate({ id: 'e034', date: '1449年九月', emperor: '景泰帝' }), '正统十四年九月');
  assert.equal(formatMingEraDate({ id: 'e081', date: '1627年', emperor: '崇祯帝' }), '天启七年');
});

test('event date ranges and accession-year exceptions remain explicit', () => {
  assert.equal(formatMingEraDate({ date: '1398—1399年' }), '洪武三十一年至建文元年');
  assert.equal(formatMingEraDate({ id: 'e076', date: '1620年', emperor: '天启帝' }), '万历四十八年／泰昌元年');
  assert.equal(formatMingEraLabel({ id: 'e076', date: '1620年' }), '万历四十八年');
  assert.equal(formatMingEraDate({ id: 'e094', date: '1646年起', emperor: '永历帝' }), '隆武二年（永历帝即位，翌年改元永历）');
});

test('person-story dates pair the historical reign year with the original Gregorian label', () => {
  assert.equal(formatHistoricalYearLabel('1355'), '至正十五年 · 1355');
  assert.equal(formatHistoricalYearLabel('1368'), '洪武元年 · 1368');
  assert.equal(formatHistoricalYearLabel('1392年'), '洪武二十五年 · 1392年');
  assert.equal(formatHistoricalYearLabel('1449年九月'), '正统十四年九月 · 1449年九月');
  assert.equal(formatHistoricalYearLabel('1592—1598'), '万历二十年至二十六年 · 1592—1598');
  assert.equal(formatHistoricalYearLabel('1570年代'), '隆庆四年至万历七年 · 1570年代');
  assert.equal(formatHistoricalYearLabel('1350—1360年代'), '至正十年至洪武二年 · 1350—1360年代');
  assert.equal(formatHistoricalYearLabel('1366年末'), '至正二十六年末 · 1366年末');
  assert.equal(formatHistoricalYearLabel('成化年间'), '成化年间');
});

test('story enrichment covers chapters, historical slices, and decision scenes without replacing Gregorian labels', () => {
  const enriched = addStorytellingEraDates({ people: { 示例: {
    chapters: [{ year: '1368' }],
    historicalSlice: { year: '1392年' },
    decisionScene: { year: '1449' },
  } } });
  assert.equal(enriched.people.示例.chapters[0].eraYear, '洪武元年 · 1368');
  assert.equal(enriched.people.示例.historicalSlice.eraYear, '洪武二十五年 · 1392年');
  assert.equal(enriched.people.示例.decisionScene.eraYear, '正统十四年 · 1449');
});

test('every event receives a readable era label and era date', () => {
  const raw = JSON.parse(fs.readFileSync(new URL('../../data/ming_events.json', import.meta.url), 'utf8'));
  const enriched = addMingEraDates(raw);
  assert.equal(enriched.events.length, 95);
  assert.ok(enriched.events.every((event) => event.eraYear && event.eraDate));
  assert.equal(mingEraYear(1368).text, '洪武元年');
  assert.equal(mingEraYear(1600).text, '万历二十八年');
});
