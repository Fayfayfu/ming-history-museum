import assert from 'node:assert/strict';
import test from 'node:test';
import { phasesForPerson, validatePoliticalPhases } from './political_phases.mjs';

const validPhaseData = {
  people: {
    洪承畴: [
      { regime: '明', start: 1616, end: 1642, role: '明朝军政官员', confidence: '高', sourceIds: ['QSG237'] },
      { regime: '清', start: 1642, end: 1650, role: '大学士、经略', confidence: '高', sourceIds: ['QSG237'] },
    ],
  },
};

test('one person has phases but remains one identity', () => {
  const roster = new Set(['洪承畴']);
  assert.deepEqual(validatePoliticalPhases({ roster, phaseData: validPhaseData }), []);
  assert.deepEqual(phasesForPerson(validPhaseData, '洪承畴'), validPhaseData.people.洪承畴);
  assert.equal(phasesForPerson(validPhaseData, '不存在').length, 0);
});

test('rejects phase records that break the political-phase contract', () => {
  const roster = new Set(['甲']);
  const phaseData = {
    people: {
      未登记人物: [{ regime: '明', start: 1600, end: 1601, role: '官员', confidence: '高', sourceIds: ['MS251'] }],
      甲: [
        { regime: '南明', start: 1644, end: 1645, role: '官员', confidence: '高', sourceIds: ['MS251'] },
        { regime: '明', start: 1645.5, end: 1645, role: '', confidence: '可靠', sourceIds: [] },
        { regime: '明', start: 1646, end: 1645, role: '官员', confidence: '高', sourceIds: ['MS251'] },
        { regime: '清', start: 1662, end: 1663, role: '官员', confidence: '高', sourceIds: ['MS251'] },
      ],
    },
  };

  const errors = validatePoliticalPhases({ roster, phaseData });
  assert.ok(errors.some(error => error.includes('未登记人物') && error.includes('人物主表')));
  assert.ok(errors.some(error => error.includes('南明') && error.includes('未登记政权')));
  assert.ok(errors.some(error => error.includes('role')));
  assert.ok(errors.some(error => error.includes('sourceIds')));
  assert.ok(errors.some(error => error.includes('置信度')));
  assert.ok(errors.some(error => error.includes('年份必须为整数')));
  assert.ok(errors.some(error => error.includes('起止年份倒置')));
  assert.ok(errors.some(error => error.includes('超出博物馆时间范围')));
});

test('rejects source IDs absent from a supplied timeline catalog', () => {
  const phaseData = {
    source_catalog: { QSG237: { url: 'https://zh.wikisource.org/wiki/清史稿/卷237' } },
    people: {
      洪承畴: [{ regime: '清', start: 1642, end: 1650, role: '大学士', confidence: '高', sourceIds: ['UNKNOWN'] }],
    },
  };

  assert.ok(
    validatePoliticalPhases({ roster: new Set(['洪承畴']), phaseData })
      .some(error => error.includes('未登记来源 ID UNKNOWN'))
  );
});
