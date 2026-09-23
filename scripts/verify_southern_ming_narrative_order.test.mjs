import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import {promisify} from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const editorialLabels = /材料核验|材料边界|材料褒贬/;
const repeatedEditorialCopy = /因此页面只在材料支持|这一节点必须放回同时代军政制度|这不是孤立人物故事/;

test('23张新增人物页先叙事后考据：标题和正文不承载编辑标签', async () => {
  await execFileAsync(process.execPath, ['scripts/build_ming_person_pages.mjs']);
  const pages = JSON.parse(await fs.readFile('data/ming_person_pages_batch40_southern_ming_expansion.json', 'utf8')).people;
  assert.equal(Object.keys(pages).length, 23);

  for (const [name, page] of Object.entries(pages)) {
    const html = await fs.readFile(`${root}/people/${page.slug}.html`, 'utf8');
    const headings = [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map(([, value]) => value);
    const chapters = html.split('<section class="chapter reveal"').slice(1);

    assert.equal(chapters.length, 4, `${name} must retain four narrative chapters`);
    assert.equal(headings.length >= 4, true, `${name} must render chapter headings`);
    assert.equal(headings.slice(0, 4).some((title) => editorialLabels.test(title)), false, `${name} must not expose evidence labels in narrative headings`);
    assert.equal(repeatedEditorialCopy.test(html), false, `${name} must not expose repeated editorial copy in narrative prose`);

    for (const chapter of chapters) {
      const narrativeEnd = chapter.indexOf('<div class="chapter-source-note">');
      const hint = chapter.indexOf('阅读提示：');
      assert.ok(narrativeEnd > 0 && hint > narrativeEnd, `${name} must place the reading hint below the narrative`);
    }
  }
});
