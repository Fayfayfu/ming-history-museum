import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('.');
const assetRoot = path.join(root, 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9');
const requiredFields = ['title', 'date', 'medium', 'display', 'image', 'source', 'collection', 'license', 'confidence', 'reading'];

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

async function allPersonPages() {
  const files = (await fs.readdir(path.join(root, 'data')))
    .filter((file) => /^ming_person_pages.*\.json$/.test(file));
  const pages = {};
  for (const file of files) {
    const data = await readJson(path.join('data', file));
    Object.assign(pages, data.people || {});
  }
  return pages;
}

function usesFeaturedWorkGallery(page) {
  return page?.feature?.type === 'gallery' || page?.creativeGallery === true;
}

test('显式启用作品型展厅的人物满足项目级作品合同', async () => {
  const pages = await allPersonPages();
  const creative = await readJson('data/ming_creative_works.json');
  const featured = Object.entries(pages).filter(([, page]) => usesFeaturedWorkGallery(page));

  assert.ok(featured.length >= 6, '至少应覆盖当前六位作品型人物');
  for (const [name] of featured) {
    const works = creative.people?.[name]?.works;
    assert.ok(Array.isArray(works) && works.length >= 2, `${name}启用大型作品展厅时至少需要两件作品`);
    for (const work of works) {
      for (const field of requiredFields) assert.ok(work[field], `${name}《${work.title || '未命名'}》缺字段 ${field}`);
      assert.match(work.display, /^(panorama|landscape|portrait)$/, `${name}《${work.title}》画幅类型无效`);
      assert.match(work.source, /^https:\/\//, `${name}《${work.title}》馆藏页必须使用HTTPS具体链接`);
      assert.match(work.confidence, /^(高|中|低)$/, `${name}《${work.title}》置信度无效`);
      await fs.access(path.join(assetRoot, work.image));
    }
  }
});
test('文本或知识型作品不会因存在创作记录而自动套用书画画廊', async () => {
  const pages = await allPersonPages();
  for (const name of ['李时珍', '徐霞客']) {
    assert.equal(usesFeaturedWorkGallery(pages[name]), false, `${name}应使用文本或知识型展陈，而不是书画画廊`);
  }
});
