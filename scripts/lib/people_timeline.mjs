const CHAR_VARIANTS = {
  熾: '炽',
  鎮: '镇',
  鈺: '钰',
  見: '见',
  載: '载',
  鈞: '钧',
  檢: '检',
  權: '权',
  標: '标',
  潤: '润',
};

const CONFIDENCE = new Set(['高', '中', '低', '未知']);
const SIZES = new Set(['emperor', 'featured', 'standard']);

export function canonicalPersonName(value) {
  return [...String(value ?? '').replace(/\s+/g, '')]
    .map((char) => CHAR_VARIANTS[char] || char)
    .join('');
}

export function uniquePeopleRoster(core, children) {
  const seen = new Set();
  const result = [];
  for (const person of core) {
    const key = canonicalPersonName(person.name);
    if (!key || seen.has(key)) throw new Error(`Duplicate core person: ${person.name || 'unnamed'}`);
    seen.add(key);
    result.push({ ...person, source: 'core' });
  }
  for (const child of children) {
    const name = child.name || child.title;
    const key = canonicalPersonName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...child,
      name,
      category: '皇室子女',
      office: child.title || '皇室子女',
      source: 'important_child',
    });
  }
  return result;
}

export function validatePeopleTimelineData({ core, children, timelineData }) {
  const roster = uniquePeopleRoster(core, children);
  const expected = new Map(roster.map((person) => [canonicalPersonName(person.name), person]));
  const records = timelineData?.people || [];
  const actual = new Map();
  const failures = [];

  if (timelineData?.version !== '1.0') failures.push('timeline version must be 1.0');
  if (!timelineData?.source_catalog || typeof timelineData.source_catalog !== 'object') {
    failures.push('missing source_catalog');
  }
  for (const [sourceId, source] of Object.entries(timelineData?.source_catalog || {})) {
    if (!source || typeof source !== 'object' || !source.label || !source.url || !source.kind) {
      failures.push(`Incomplete timeline source ${sourceId}`);
    }
  }
  for (const record of records) {
    const key = canonicalPersonName(record.name);
    if (actual.has(key)) failures.push(`Duplicate timeline record: ${record.name}`);
    actual.set(key, record);
    if (!expected.has(key)) failures.push(`Extra timeline record: ${record.name}`);
    if (expected.has(key) && record.source !== expected.get(key).source) {
      failures.push(`${record.name}: source must be ${expected.get(key).source}`);
    }
    if (!Number.isInteger(record.timeline_year)) failures.push(`${record.name}: invalid timeline_year`);
    if (!record.timeline_year_label) failures.push(`${record.name}: missing timeline_year_label`);
    if (!record.timeline_year_basis) failures.push(`${record.name}: missing timeline_year_basis`);
    if (!CONFIDENCE.has(record.timeline_year_confidence)) failures.push(`${record.name}: invalid confidence`);
    if (!Array.isArray(record.timeline_source_refs) || !record.timeline_source_refs.length) {
      failures.push(`${record.name}: missing timeline_source_refs`);
    }
    for (const sourceId of record.timeline_source_refs || []) {
      if (!timelineData.source_catalog?.[sourceId]) failures.push(`Unknown timeline source ${sourceId}`);
    }
    if (!record.timeline_role || [...record.timeline_role].length > 12) {
      failures.push(`${record.name}: timeline_role must be 1-12 characters`);
    }
    if (!SIZES.has(record.timeline_size)) failures.push(`${record.name}: invalid timeline_size`);
    const category = expected.get(key)?.category;
    if (category === '皇帝' && record.timeline_size !== 'emperor') {
      failures.push(`${record.name}: emperor must use emperor size`);
    }
    if (category !== '皇帝' && record.timeline_size === 'emperor') {
      failures.push(`${record.name}: non-emperor cannot use emperor size`);
    }
  }

  const missing = [...expected]
    .filter(([key]) => !actual.has(key))
    .map(([, person]) => person.name);
  if (missing.length) failures.push(`Missing timeline records: ${missing.join('、')}`);
  if (failures.length) throw new Error(failures.join('\n'));
  return roster.map((person) => ({ ...person, ...actual.get(canonicalPersonName(person.name)) }));
}
