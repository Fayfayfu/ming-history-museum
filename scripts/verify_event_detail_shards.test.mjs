import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const museum = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';

test('事件索引中的每一条记录都有可读取且 ID 匹配的详情分片', async () => {
  const index = JSON.parse(await fs.readFile(`${museum}/assets/data/events-index.json`, 'utf8'));
  assert.ok(index.events.length >= 105, '事件索引不应在构建时丢失新增事件');

  for (const entry of index.events) {
    const detail = JSON.parse(await fs.readFile(`${museum}/${entry.detailUrl}`, 'utf8'));
    assert.equal(detail.id, entry.id, `${entry.id} 的详情分片缺失或 ID 不匹配`);
  }
});
