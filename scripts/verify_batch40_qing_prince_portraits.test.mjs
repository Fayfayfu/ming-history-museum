import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const root = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆';
const expected = {
  多铎: '4001_多铎_AI想象像.webp',
  尼堪: '4002_尼堪_AI想象像.webp',
  豪格: '4003_豪格_AI想象像.webp',
  阿济格: '4004_阿济格_AI想象像.webp',
  李定国: '4005_李定国_AI想象像.webp',
  孙可望: '4006_孙可望_AI想象像.webp',
  刘文秀: '4007_刘文秀_AI想象像.webp',
  艾能奇: '4008_艾能奇_AI想象像.webp',
  马士英: '4009_马士英_AI想象像.webp',
  左良玉: '4010_左良玉_AI想象像.webp',
  高杰: '4011_高杰_AI想象像.webp',
  黄得功: '4012_黄得功_AI想象像.webp',
  刘良佐: '4013_刘良佐_AI想象像.webp',
  刘泽清: '4014_刘泽清_AI想象像.webp',
  阎应元: '4015_阎应元_AI想象像.webp',
  郑成功: '4016_郑成功_AI想象像.webp',
  郑芝龙: '4017_郑芝龙_AI想象像.webp',
  朱聿鐭: '4018_绍武帝_AI想象像.webp',
  张献忠: '4019_张献忠_AI想象像.webp',
  孔有德: '4020_孔有德_AI想象像.webp',
  李来亨: '4021_李来亨_AI想象像.webp',
  陈圆圆: '4022_陈圆圆_AI想象像.webp',
};

test('批次40画像存在且明确标为AI想象像', async () => {
  const [portraits, index] = await Promise.all([
    fs.readFile('data/ming_portraits.json', 'utf8').then(JSON.parse),
    fs.readFile(`${root}/assets/data/people-index.json`, 'utf8').then(JSON.parse),
  ]);

  for (const [name, fileName] of Object.entries(expected)) {
    const portrait = portraits.people[name];
    const person = index.people.find(item => item.name === name);
    assert.equal(portrait.status, 'imagined', `${name} must not be presented as a historical likeness`);
    assert.equal(portrait.portraitKind, 'AI想象像');
    assert.match(portrait.note, /不代表本人相貌/);
    assert.ok(portrait.file.endsWith(fileName));
    assert.equal(person.portrait.status, 'imagined');
    assert.equal(person.portrait.portraitKind, 'AI想象像');
    await fs.access(`${root}/${portrait.file}`);
  }

  assert.equal(portraits.people.黄道周.status, 'image', '黄道周保留已有来源画像，不应被AI图覆盖');
});
