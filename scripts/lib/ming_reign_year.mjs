const ERA_PERIODS = [
  ['至正', 1341, 1367],
  ['洪武', 1368, 1398],
  ['建文', 1399, 1402],
  ['永乐', 1403, 1424],
  ['洪熙', 1425, 1425],
  ['宣德', 1426, 1435],
  ['正统', 1436, 1449],
  ['景泰', 1450, 1456],
  ['天顺', 1457, 1464],
  ['成化', 1465, 1487],
  ['弘治', 1488, 1505],
  ['正德', 1506, 1521],
  ['嘉靖', 1522, 1566],
  ['隆庆', 1567, 1572],
  ['万历', 1573, 1620],
  ['天启', 1621, 1627],
  ['崇祯', 1628, 1644],
];

const CARD_LABEL_OVERRIDES = {
  e076: '万历四十八年',
  e094: '隆武二年',
};

const DATE_OVERRIDES = {
  e076: '万历四十八年／泰昌元年',
  e094: '隆武二年（永历帝即位，翌年改元永历）',
};

function chineseNumber(value) {
  if (!Number.isInteger(value) || value < 1 || value > 99) throw new Error(`Unsupported reign year: ${value}`);
  if (value < 10) return '一二三四五六七八九'[value - 1];
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${tens === 1 ? '' : '一二三四五六七八九'[tens - 1]}十${ones ? '一二三四五六七八九'[ones - 1] : ''}`;
}

function periodFor(year, event = {}) {
  const standard = ERA_PERIODS.find(([, start, end]) => year >= start && year <= end);
  if (standard) return standard;
  if (year === 1645 || (event.emperor || '').includes('弘光')) return year === 1645 ? ['弘光', 1645, 1645] : null;
  if (year === 1646 || (event.emperor || '').includes('隆武')) return year >= 1645 && year <= 1646 ? ['隆武', 1645, 1646] : null;
  if ((year >= 1647 && year <= 1662) || (event.emperor || '').includes('永历')) return year >= 1647 && year <= 1662 ? ['永历', 1647, 1662] : null;
  return null;
}

export function mingEraYear(year, event = {}) {
  const numericYear = Number(year);
  const period = periodFor(numericYear, event);
  if (!period) return null;
  const [era, start] = period;
  const yearNumber = numericYear - start + 1;
  const ordinal = yearNumber === 1 ? '元' : chineseNumber(yearNumber);
  return { era, yearNumber, ordinal, text: `${era}${ordinal}年` };
}

export function formatMingEraLabel(event) {
  if (CARD_LABEL_OVERRIDES[event?.id]) return CARD_LABEL_OVERRIDES[event.id];
  const firstYear = String(event?.date || event?.year || '').match(/\d{4}/)?.[0];
  return firstYear ? (mingEraYear(Number(firstYear), event)?.text || String(firstYear)) : '年代待考';
}

export function formatMingEraDate(event) {
  if (DATE_OVERRIDES[event?.id]) return DATE_OVERRIDES[event.id];
  const date = String(event?.date || event?.year || '');
  return date.replace(/(\d{4})(?:—(\d{4}))?年/g, (match, startText, endText) => {
    const start = mingEraYear(Number(startText), event);
    if (!start) return match;
    if (!endText) return start.text;
    const end = mingEraYear(Number(endText), event);
    if (!end) return `${start.text}至${endText}年`;
    return start.era === end.era ? `${start.text}至${end.ordinal}年` : `${start.text}至${end.text}`;
  });
}

function storyEraFor(year) {
  if (year === 1620) return { text: '万历四十八年／泰昌元年', era: '万历／泰昌', ordinal: '四十八／元' };
  return mingEraYear(year);
}

const YUAN_LIFE_PERIODS = [
  ['至大', 1308, 1311], ['皇庆', 1312, 1313], ['延祐', 1314, 1320], ['至治', 1321, 1323],
  ['泰定', 1324, 1327], ['天历', 1329, 1329], ['至顺', 1330, 1332], ['元统', 1334, 1334],
  ['至元', 1335, 1340], ['至正', 1341, 1367],
];

function lifeEraFor(year) {
  if (year === 1328) return { text: '致和元年／天顺元年／天历元年', era: '致和／天顺／天历', ordinal: '元' };
  if (year === 1333) return { text: '至顺四年／元统元年', era: '至顺／元统', ordinal: '四／元' };
  const yuan = YUAN_LIFE_PERIODS.find(([, start, end]) => year >= start && year <= end);
  if (yuan) {
    const [era, start] = yuan;
    const yearNumber = year - start + 1;
    const ordinal = yearNumber === 1 ? '元' : chineseNumber(yearNumber);
    return { text: `${era}${ordinal}年`, era, ordinal };
  }
  if (year >= 1645 && year <= 1661) {
    const yearNumber = year - 1643;
    const ordinal = chineseNumber(yearNumber);
    return { text: `顺治${ordinal}年`, era: '顺治', ordinal };
  }
  if (year >= 1662 && year <= 1722) {
    const yearNumber = year - 1661;
    const ordinal = yearNumber === 1 ? '元' : chineseNumber(yearNumber);
    return { text: `康熙${ordinal}年`, era: '康熙', ordinal };
  }
  return storyEraFor(year);
}

function lifeDynasty(era = '') {
  if (YUAN_LIFE_PERIODS.some(([name]) => era.includes(name)) || /(致和|天历|元统)/.test(era)) return '元';
  if (/(顺治|康熙)/.test(era)) return '清';
  return '明';
}

function eraRangeText(startYear, endYear) {
  const start = lifeEraFor(startYear);
  const end = lifeEraFor(endYear);
  if (!start || !end) return '';
  return start.era === end.era && !start.era.includes('／')
    ? `${start.text}至${end.ordinal}年`
    : `${start.text}至${end.text}`;
}

export function formatHistoricalYearLabel(value) {
  const original = String(value || '').trim();
  const years = [...original.matchAll(/\d{4}/g)].map((match) => Number(match[0]));
  if (!years.length) return original;

  const first = years[0];
  const isDecade = /年代/.test(original);
  const last = isDecade ? years.at(-1) + 9 : years.at(-1);
  const eraText = years.length > 1 || isDecade ? eraRangeText(first, last) : lifeEraFor(first)?.text;
  if (!eraText) return original;

  const writtenLastYear = years.at(-1);
  const lastYearIndex = original.lastIndexOf(String(writtenLastYear)) + 4;
  const suffix = isDecade ? '' : original.slice(lastYearIndex).replace(/^年/, '');
  const eraWithQualifier = suffix && !/^—/.test(suffix) ? `${eraText}${suffix}` : eraText;
  return `${eraWithQualifier} · ${original}`;
}

export function formatLifeEraLabel(value) {
  const original = String(value || '').trim();
  const years = [...original.matchAll(/\d{4}/g)].map((match) => Number(match[0]));
  if (!years.length) return '年号待考';
  const firstYear = years[0];
  const lastYear = /年代/.test(original) ? years.at(-1) + 9 : years.at(-1);
  const first = lifeEraFor(firstYear);
  const last = lifeEraFor(lastYear);
  if (!first && !last) return '年号待考';
  if (!first || !last) {
    const known = first || last;
    return `${lifeDynasty(known.era)} · ${known.text}`;
  }
  const firstDynasty = lifeDynasty(first.era);
  const lastDynasty = lifeDynasty(last.era);
  const dynasty = firstDynasty === lastDynasty ? firstDynasty : `${firstDynasty}至${lastDynasty}`;
  if (firstYear === lastYear) return `${dynasty} · ${first.text}`;
  const eraText = first.era === last.era && !first.era.includes('／')
    ? `${first.text}至${last.ordinal}年`
    : `${first.text}至${last.text}`;
  return `${dynasty} · ${eraText}`;
}

const enrichStory = (story = {}) => ({
  ...story,
  ...(story.historicalSlice ? { historicalSlice: { ...story.historicalSlice, eraYear: formatHistoricalYearLabel(story.historicalSlice.year) } } : {}),
  ...(story.decisionScene ? { decisionScene: { ...story.decisionScene, eraYear: formatHistoricalYearLabel(story.decisionScene.year) } } : {}),
  ...(story.chapters ? { chapters: story.chapters.map((chapter) => ({ ...chapter, eraYear: formatHistoricalYearLabel(chapter.year) })) } : {}),
});

export function addStorytellingEraDates(storytelling = {}) {
  return {
    ...storytelling,
    people: Object.fromEntries(Object.entries(storytelling.people || {}).map(([name, story]) => [name, enrichStory(story)])),
  };
}

export function addHistoricalSliceEraDates(historicalSlices = {}) {
  return {
    ...historicalSlices,
    people: Object.fromEntries(Object.entries(historicalSlices.people || {}).map(([name, slice]) => [name, {
      ...slice,
      eraYear: formatHistoricalYearLabel(slice.year),
    }])),
  };
}

export function addMingEraDates(eventData) {
  return {
    ...eventData,
    events: (eventData.events || []).map((event) => ({
      ...event,
      eraYear: formatMingEraLabel(event),
      eraDate: formatMingEraDate(event),
    })),
  };
}
