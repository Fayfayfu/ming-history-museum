import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = 'data/media-originals/portraits/batch-19';
const outputDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/assets/portraits/batch-19';
const portraitDataFile = 'data/ming_portraits.json';
const childDataFile = 'data/ming_children_important.json';
const promptFile = 'data/portrait_prompts_batch19.md';

const rows = [
  ['朱橚', '1901_朱橚_AI想象像.png', '1901_朱橚_AI想象像.webp', '50% 20%', '开封藩府园圃、可食植物与植物图页'],
  ['朱柏', '1902_朱柏_AI想象像.png', '1902_朱柏_AI想象像.webp', '50% 19%', '建文削藩压力下的荆州书室与未开启诏书'],
  ['朱权', '1903_朱权_AI想象像.png', '1903_朱权_AI想象像.webp', '50% 18%', '南昌书室中的古琴、典籍与茶事'],
  ['朱文奎', '1904_朱文奎_AI想象像.png', '1904_朱文奎_AI想象像.webp', '50% 18%', '1402年前后的南京宫廷儿童书室'],
  ['朱文圭', '1905_朱文圭_AI想象像.png', '1905_朱文圭_AI想象像.webp', '50% 18%', '长期幽禁后走向开启院门的晚年时刻'],
  ['朱高煦', '1906_朱高煦_AI想象像.png', '1906_朱高煦_AI想象像.webp', '50% 18%', '宣德初年之前的藩府军务书室'],
  ['朱高燧', '1907_朱高燧_AI想象像.png', '1907_朱高燧_AI想象像.webp', '50% 18%', '永乐后期远离封缄文书的藩府前室'],
  ['朱瞻墡', '1908_朱瞻墡_AI想象像.png', '1908_朱瞻墡_AI想象像.webp', '50% 18%', '土木危机后克制自守的襄阳书室'],
  ['朱见济', '1909_朱见济_AI想象像.png', '1909_朱见济_AI想象像.webp', '50% 18%', '景泰朝宫廷课堂中的五岁储君'],
  ['朱载壡', '1910_朱载壡_AI想象像.png', '1910_朱载壡_AI想象像.webp', '50% 17%', '嘉靖朝东宫书室中的少年储君'],
  ['朱载圳', '1911_朱载圳_AI想象像.png', '1911_朱载圳_AI想象像.webp', '50% 17%', '储位长期未定时期准备就藩的景王'],
  ['朱翊镠', '1912_朱翊镠_AI想象像.png', '1912_朱翊镠_AI想象像.webp', '50% 17%', '晚万历藩府营建、田产册与工地'],
  ['朱常洵', '1913_朱常洵_AI想象像.png', '1913_朱常洵_AI想象像.webp', '50% 17%', '洛阳福藩粮册、仓门与旱院'],
  ['朱常浩', '1914_朱常浩_AI想象像.png', '1914_朱常浩_AI想象像.webp', '50% 18%', '明末西南避乱途中整理册籍与箱笼'],
  ['朱常润', '1915_朱常润_AI想象像.png', '1915_朱常润_AI想象像.webp', '50% 17%', '北京陷落后暂居江南河岸的流离处境'],
  ['朱常瀛', '1916_朱常瀛_AI想象像.png', '1916_朱常瀛_AI想象像.webp', '50% 17%', '从衡州向广西避乱并连接南明帝系'],
  ['朱慈烺', '1917_朱慈烺_AI想象像.png', '1917_朱慈烺_AI想象像.webp', '50% 17%', '1644年初东宫中面对城防危机的少年储君'],
  ['朱慈炯', '1918_朱慈炯_AI想象像.png', '1918_朱慈炯_AI想象像.webp', '50% 17%', '北京危机中抱着书卷行囊等待撤离的少年宗室'],
  ['朱慈炤', '1919_朱慈炤_AI想象像.png', '1919_朱慈炤_AI想象像.webp', '50% 17%', '1644年内廷书室中聆听远处动静的少年宗室'],
  ['朱慈煥', '1920_朱慈煥_AI想象像.png', '1920_朱慈煥_AI想象像.webp', '50% 17%', '仅表现1644年前的儿童身份，不采用后世案件的确定叙事'],
];

const children = JSON.parse(await fs.readFile(childDataFile, 'utf8'));
const childByName = new Map(children.map(person => [person.name, person]));
const portraits = JSON.parse(await fs.readFile(portraitDataFile, 'utf8'));

await fs.mkdir(outputDir, {recursive: true});

for (const [name, sourceName, outputName, objectPosition, scene] of rows) {
  const source = path.join(sourceDir, sourceName);
  const output = path.join(outputDir, outputName);
  await sharp(source)
    .rotate()
    .resize({width: 720, height: 960, fit: 'inside', withoutEnlargement: true})
    .webp({quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true})
    .toFile(output);

  const metadata = await sharp(output).metadata();
  const child = childByName.get(name);
  portraits.people[name] = {
    status: 'imagined',
    file: `assets/portraits/batch-19/${outputName}`,
    originalFile: `${sourceDir}/${sourceName}`,
    portraitKind: 'AI想象像',
    confidence: '未知',
    batch: 19,
    generatedWith: 'OpenAI image generation',
    promptFile,
    evidence: child?.source_url ? [child.source_url] : [],
    width: metadata.width,
    height: metadata.height,
    objectPosition,
    note: `未找到来源链可靠的本人旧像。画面锚定${scene}；五官、年龄状态、服饰细节、陈设与具体时刻均为艺术想象。`,
  };
  console.log(`${name}: ${metadata.width}×${metadata.height} -> ${outputName}`);
}

portraits.generatedAt = new Date().toISOString();
portraits.generated = (portraits.generated ?? 0) + rows.length;
portraits.currentBatch = {
  id: 19,
  label: '第十九批 · 剩余重要皇嗣AI想象像',
  count: rows.length,
  selection: '补齐人物馆剩余20位重要皇嗣画像；全部明确标注AI想象像，史实只用于身份、时代和情境锚定，相貌与现场不作史实。',
};
portraits.total = Object.keys(portraits.people).length;

await fs.writeFile(portraitDataFile, `${JSON.stringify(portraits, null, 2)}\n`, 'utf8');
console.log(`updated ${portraitDataFile}: ${portraits.total} portrait records`);
