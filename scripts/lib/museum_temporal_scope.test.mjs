import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MUSEUM_BOUNDARIES,
  MUSEUM_TIMELINE_SCOPE,
  clampMuseumYear,
} from './museum_temporal_scope.mjs';

test('scope keeps the Ming founding, Beijing court collapse, Yongli ending, and Kuizhou resistance ending distinct', () => {
  assert.deepEqual(MUSEUM_TIMELINE_SCOPE, { start: 1368, end: 1664 });
  assert.deepEqual(MUSEUM_BOUNDARIES, [
    { year: 1368, label: '明朝建立' },
    { year: 1644, label: '北京明廷覆亡' },
    { year: 1662, label: '永历政权终局' },
    { year: 1664, label: '夔东抵抗终局' },
  ]);
  assert.equal(clampMuseumYear(1300), 1368);
  assert.equal(clampMuseumYear(1644), 1644);
  assert.equal(clampMuseumYear(1700), 1664);
});
