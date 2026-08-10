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

export const TIMELINE_YEAR_PX = 22;
export const TIMELINE_SIZE_PX = { emperor: 88, featured: 72, standard: 56 };
export const TIMELINE_LANES = {
  '后妃与内廷女性': { id: 'women', side: 'top', order: 0, label: '后妃与内廷女性' },
  '皇室子女': { id: 'children', side: 'top', order: 1, label: '皇子女' },
  '皇帝': { id: 'emperor', side: 'top', order: 2, label: '皇帝' },
  '宦官': { id: 'eunuch', side: 'bottom', order: 0, label: '宦官' },
  '文臣': { id: 'officials', side: 'bottom', order: 1, label: '文臣／武官' },
  '武官': { id: 'officials', side: 'bottom', order: 1, label: '文臣／武官' },
  '在野人物': { id: 'independent', side: 'bottom', order: 2, label: '在野人物' },
  '政权人物': { id: 'external', side: 'bottom', order: 3, label: '政权人物／域外人物' },
  '域外人物': { id: 'external', side: 'bottom', order: 3, label: '政权人物／域外人物' },
};

const AXIS_GAP_PX = 8;
const LANE_GAP_PX = 8;

function compareTimelineNodes(left, right) {
  return left.timeline_year - right.timeline_year
    || right.sizePx - left.sizePx
    || String(left.name).localeCompare(String(right.name), 'zh-Hans-CN');
}

function assignSlots(nodes) {
  const slots = [];
  for (const node of nodes) {
    let slot = slots.findIndex((previous) => {
      if (!previous) return true;
      const minimum = 0.8 * (previous.sizePx + node.sizePx) / 2;
      return node.x - previous.x >= minimum;
    });
    if (slot < 0) {
      slot = slots.length;
      slots.push(null);
    }
    node.slot = slot;
    slots[slot] = node;
  }
  return slots.length;
}

function laneGroups(nodes, side) {
  const groups = new Map();
  for (const node of nodes) {
    if (node.lane.side !== side) continue;
    if (!groups.has(node.lane.id)) groups.set(node.lane.id, { ...node.lane, nodes: [] });
    groups.get(node.lane.id).nodes.push(node);
  }
  return [...groups.values()]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((lane) => {
      lane.nodes.sort(compareTimelineNodes);
      assignSlots(lane.nodes);
      lane.slotSizes = Array.from({ length: Math.max(...lane.nodes.map((node) => node.slot)) + 1 }, () => 0);
      for (const node of lane.nodes) lane.slotSizes[node.slot] = Math.max(lane.slotSizes[node.slot], node.sizePx);
      return lane;
    });
}

function measureSide(lanes) {
  let depth = AXIS_GAP_PX;
  let conflict = null;
  for (const lane of lanes) {
    lane.offset = depth;
    lane.slotCenters = [];
    for (const sizePx of lane.slotSizes) {
      const previousSize = lane.slotSizes[lane.slotCenters.length - 1];
      if (!lane.slotCenters.length) {
        lane.slotCenters.push(depth + sizePx / 2);
      } else {
        lane.slotCenters.push(
          lane.slotCenters.at(-1) + 0.8 * (previousSize + sizePx) / 2
        );
      }
    }
    depth = lane.slotCenters.at(-1) + lane.slotSizes.at(-1) / 2;
    lane.endDepth = depth;
    conflict = lane.nodes.find((node) => node.slot === lane.slotSizes.length - 1) || lane.nodes[lane.nodes.length - 1];
    depth += LANE_GAP_PX;
  }
  return { depth: lanes.length ? depth - LANE_GAP_PX : 0, conflict };
}

function positionSide(lanes, axisY, direction) {
  for (const lane of lanes) {
    for (let slot = 0; slot < lane.slotSizes.length; slot += 1) {
      for (const node of lane.nodes) {
        if (node.slot === slot) node.y = axisY + direction * lane.slotCenters[slot];
      }
    }
  }
}

export function layoutPeopleTimeline(people, options = {}) {
  if (!Array.isArray(people) || !people.length) throw new Error('Timeline requires at least one person');
  const yearPx = options.yearPx ?? TIMELINE_YEAR_PX;
  const paddingX = options.paddingX ?? 140;
  const minHeight = options.minHeight ?? 960;
  const maxHeight = options.maxHeight ?? 1400;
  const years = people.map((person) => person.timeline_year);
  if (!years.every(Number.isInteger)) throw new Error('Timeline people require integer timeline_year values');

  const minYear = Math.min(...years, 1368);
  const maxYear = Math.max(...years, 1644);
  const width = (maxYear - minYear) * yearPx + paddingX * 2;
  const nodes = people.map((person) => {
    const lane = TIMELINE_LANES[person.category];
    const sizePx = TIMELINE_SIZE_PX[person.timeline_size];
    if (!lane) throw new Error(`Unknown timeline category: ${person.category}`);
    if (!sizePx) throw new Error(`Unknown timeline size: ${person.timeline_size}`);
    return {
      ...person,
      lane: { ...lane },
      sizePx,
      x: paddingX + (person.timeline_year - minYear) * yearPx,
    };
  });
  const topLanes = laneGroups(nodes, 'top');
  const bottomLanes = laneGroups(nodes, 'bottom');
  const top = measureSide(topLanes);
  const bottom = measureSide(bottomLanes);
  const requiredHeight = 2 * Math.max(top.depth, bottom.depth);
  if (requiredHeight > maxHeight) {
    const overflowing = top.depth >= bottom.depth ? top : bottom;
    const lane = (top.depth >= bottom.depth ? topLanes : bottomLanes).find((item) => item.endDepth === overflowing.depth)
      || (top.depth >= bottom.depth ? topLanes : bottomLanes).at(-1);
    throw new Error(`Timeline height exceeds ${maxHeight}px in lane ${lane.label}: ${overflowing.conflict.name}`);
  }
  const height = Math.max(minHeight, requiredHeight);
  const axisY = height / 2;
  positionSide(topLanes, axisY, -1);
  positionSide(bottomLanes, axisY, 1);

  const ticks = [];
  for (let year = Math.ceil(minYear / 10) * 10; year <= maxYear; year += 10) {
    ticks.push({ year, x: paddingX + (year - minYear) * yearPx, type: 'decade' });
  }
  const boundaries = [1368, 1644].map((year) => ({
    year,
    x: paddingX + (year - minYear) * yearPx,
    type: 'boundary',
  }));

  return { minYear, maxYear, width, height, axisY, ticks, boundaries, nodes };
}

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
