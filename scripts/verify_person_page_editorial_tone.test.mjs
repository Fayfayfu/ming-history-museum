import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const dataFiles = [
  'data/ming_person_pages_batch18_central.json',
  'data/ming_person_pages_batch18_senior.json',
  'data/ming_person_pages_batch18_hairui.json',
  'data/ming_person_pages_batch19_nine_borders.json',
  'data/ming_person_pages_batch19_liaodong_aid.json',
  'data/ming_person_pages_batch19_korea_commanders.json'
];
const hedgeLanguage = /不等于|照单全收|不能(?:单独|直接|完全|仅凭)|不可(?:直接|仅凭)|不宜(?:直接|仅凭)|不足以|无法仅凭|不把|不将/;
const disputedRecords = {
  '申时行': 'ctext.org',
  '沈一贯': 'shidianguji.com',
  '沈鲤': 'zh.wikisource.org',
  '叶向高': 'shidianguji.com',
  '海瑞': 'diancang.xyz',
  '谭纶': 'ctext.org',
  '马芳': 'shidianguji.com',
  '李成梁': 'shidianguji.com',
  '宋应昌': 'shidianguji.com',
  '李如松': 'sillok.history.go.kr'
};

test('人物章节标题直接说明人物经历，不以史料免责声明代替叙事', async () => {
  const batches = await Promise.all(dataFiles.map(async (file) => JSON.parse(await fs.readFile(file, 'utf8'))));
  for (const page of batches.flatMap((batch) => Object.values(batch.people))) {
    for (const scene of page.scenes) {
      assert.doesNotMatch(scene.title, hedgeLanguage, `${page.slug}: ${scene.title}`);
      for (const paragraph of scene.body) assert.doesNotMatch(paragraph, hedgeLanguage, `${page.slug}: ${paragraph}`);
      assert.ok(scene.primarySource?.boundary, `${page.slug} should retain evidence notes in the source drawer`);
    }
  }
});

test('本批有争议或跨境战事的人物保留第二材料入口', async () => {
  const batches = await Promise.all(dataFiles.map(async (file) => JSON.parse(await fs.readFile(file, 'utf8'))));
  const pages = Object.assign({}, ...batches.map((batch) => batch.people));
  for (const [name, domain] of Object.entries(disputedRecords)) {
    assert.ok(pages[name].sources.some((source) => source.url.includes(domain)), `${name} needs a second-source entry from ${domain}`);
  }
});
