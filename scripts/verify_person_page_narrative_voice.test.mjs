import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆/people';
const contrast = /不是[^。；！？]{0,100}而是/g;

function storyHtml(html) {
  return (html.match(/<div class="story">([\s\S]*?)(?:<section class="history-slice|<section class="feature|<section class="gallery|<section class="work|<section class="connections)/) || [])[1] || '';
}

test('人物生平正文不把“不是……而是……”当作默认语气', async () => {
  await execFileAsync(process.execPath, ['scripts/build_ming_person_pages.mjs']);
  const files = (await fs.readdir(root)).filter(file => file.endsWith('.html'));
  assert.ok(files.length >= 176, 'must include every generated person page');

  for (const file of files) {
    const html = await fs.readFile(path.join(root, file), 'utf8');
    const matches = storyHtml(html).match(contrast) || [];
    assert.ok(matches.length <= 1, `${file} has ${matches.length} contrast constructions in its biography`);
  }
});
