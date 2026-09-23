import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const museumRoot = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';

test('人物馆索引和详情分片必须写入同一服务根目录', async () => {
  const result = spawnSync(process.execPath, ['scripts/build_ming_html.mjs'], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const index = JSON.parse(await fs.readFile(`${museumRoot}/assets/data/people-index.json`, 'utf8'));
  const zheng = index.people.find((person) => person.name === '郑成功');
  assert.ok(zheng);
  await fs.access(`${museumRoot}/${zheng.detailUrl}`);
});
