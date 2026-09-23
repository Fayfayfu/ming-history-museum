import assert from 'node:assert/strict';
import test from 'node:test';
import {MUSEUM_BOUNDARIES, MUSEUM_TIMELINE_SCOPE} from './lib/museum_temporal_scope.mjs';

test('馆内时间轴保留1662永历终局，并以1664夔东终局收束', () => {
  assert.deepEqual(MUSEUM_TIMELINE_SCOPE, {start: 1368, end: 1664});
  assert.deepEqual(MUSEUM_BOUNDARIES.map((item) => [item.year, item.label]), [
    [1368, '明朝建立'],
    [1644, '北京明廷覆亡'],
    [1662, '永历政权终局'],
    [1664, '夔东抵抗终局'],
  ]);
});
