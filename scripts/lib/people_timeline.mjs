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
  '后妃与内廷女性': { id: 'women', side: 'top', order: 2, label: '后妃与内廷女性' },
  '皇室子女': { id: 'children', side: 'top', order: 1, label: '皇子女' },
  '皇帝': { id: 'emperor', side: 'top', order: 0, label: '皇帝' },
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

const CATEGORY_STYLES = {
  '后妃与内廷女性': 'women',
  '皇室子女': 'children',
  '皇帝': 'emperor',
  '宦官': 'eunuch',
  '文臣': 'civil',
  '武官': 'military',
  '在野人物': 'independent',
  '政权人物': 'external',
  '域外人物': 'external',
};

const CATEGORY_LABELS = {
  '后妃与内廷女性': '后妃与内廷女性',
  '皇室子女': '皇子女',
  '皇帝': '皇帝',
  '宦官': '宦官',
  '文臣': '文臣',
  '武官': '武官',
  '在野人物': '在野人物',
  '政权人物': '政权人物',
  '域外人物': '域外人物',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstCharacter(value) {
  return [...String(value ?? '').trim()][0] || '人';
}

function portraitMarkup(name, portrait) {
  const initial = escapeHtml(firstCharacter(name));
  if (!portrait?.file) {
    return `<span class="timeline-portrait timeline-portrait--fallback" aria-hidden="true"><span class="timeline-portrait-fallback" data-timeline-fallback>${initial}</span></span>`;
  }

  const file = escapeHtml(portrait.file);
  const kindValue = portrait.kind || 'sourced';
  const visitorLabelValue = portrait.label || (kindValue === 'imagined' ? 'AI想象像' : '历史图像');
  const kind = escapeHtml(kindValue);
  const visitorLabel = escapeHtml(visitorLabelValue);
  const alt = escapeHtml(`${name}：${visitorLabelValue}`);
  const imageStyles = [
    portrait.objectPosition ? `object-position:${escapeHtml(portrait.objectPosition)}` : '',
    portrait.portraitTransform ? `transform:${escapeHtml(portrait.portraitTransform)}` : '',
    portrait.transformOrigin ? `transform-origin:${escapeHtml(portrait.transformOrigin)}` : '',
  ].filter(Boolean).join(';');
  const styleAttribute = imageStyles ? ` style="${imageStyles}"` : '';
  return `<span class="timeline-portrait" data-portrait-kind="${kind}" data-portrait-label="${visitorLabel}"><img class="timeline-portrait-image" data-timeline-image src="${file}" alt="${alt}" loading="lazy" decoding="async"${styleAttribute}><span class="timeline-portrait-source" data-timeline-image-source aria-hidden="true">${visitorLabel}</span><span class="timeline-portrait-fallback" data-timeline-fallback aria-hidden="true">${initial}</span></span>`;
}

function laneMarkup(layout) {
  const lanes = new Map();
  for (const node of layout.nodes) {
    if (!lanes.has(node.lane.id)) lanes.set(node.lane.id, { ...node.lane, positions: [] });
    lanes.get(node.lane.id).positions.push(node.y);
  }
  return [...lanes.values()]
    .sort((left, right) => left.side.localeCompare(right.side) || left.order - right.order)
    .map((lane) => {
      const y = lane.positions.reduce((total, position) => total + position, 0) / lane.positions.length;
      return `<p class="timeline-lane-label timeline-lane-label--${escapeHtml(lane.id)}" style="--lane-y:${y}px">${escapeHtml(lane.label)}</p>`;
    })
    .join('');
}

function personMarkup(node, portraitFor, axisY) {
  const name = escapeHtml(node.name);
  const role = escapeHtml(node.timeline_role || node.office || '人物');
  const yearLabel = escapeHtml(node.timeline_year_label || String(node.timeline_year));
  const basis = escapeHtml(node.timeline_year_basis || '登场依据待补');
  const categoryLabelValue = CATEGORY_LABELS[node.category] || node.lane.label || '人物';
  const categoryLabel = escapeHtml(categoryLabelValue);
  const categoryStyle = CATEGORY_STYLES[node.category] || 'external';
  const size = escapeHtml(node.timeline_size);
  const x = Number(node.x);
  const y = Number(node.y);
  const avatarSize = Number(node.sizePx);
  const axisDistance = Math.abs(Number(axisY) - y);
  const portrait = portraitFor(node.name);
  const ariaLabel = escapeHtml(`${node.name}，${categoryLabelValue}，${node.timeline_role || node.office || '人物'}，${node.timeline_year_label || node.timeline_year}进入历史叙事，${node.timeline_year_confidence || '未知'}置信度`);

  return `<article class="timeline-person category-${categoryStyle} size-${size}" data-timeline-person="${name}" data-year="${node.timeline_year}" data-lane="${escapeHtml(node.lane.id)}" data-layer="${Number(node.slot)}" data-side="${escapeHtml(node.lane.side)}" data-category-label="${categoryLabel}" style="--person-x:${x}px;--person-y:${y}px;--avatar-size:${avatarSize}px;--axis-distance:${axisDistance}px">
    <span class="timeline-person-guide" data-timeline-guide="${name}" aria-hidden="true"></span>
    <button class="timeline-person-select" type="button" aria-pressed="false" aria-label="${ariaLabel}">
      ${portraitMarkup(node.name, portrait)}
      <strong>${name}</strong><small>${role}</small>
      <span class="timeline-person-context"><time datetime="${node.timeline_year}">${yearLabel}</time><span class="timeline-person-basis">${basis}</span></span>
    </button>
    <button class="timeline-person-open" type="button" data-open-person="${name}">查看人物档案</button>
  </article>`;
}

/**
 * Render the static, semantic timeline shell. Selection and image-error state
 * are intentionally left to the page client script.
 */
export function renderPeopleTimeline({ people, layout, portraitFor = () => null }) {
  if (!Array.isArray(people) || !layout?.nodes || typeof portraitFor !== 'function') {
    throw new Error('renderPeopleTimeline requires people, layout, and portraitFor');
  }
  if (layout.nodes.length !== people.length) {
    throw new Error('Timeline layout node count must match people count');
  }

  const ticks = layout.ticks.map((tick) => `<span class="timeline-tick" style="--tick-x:${tick.x}px"><time datetime="${tick.year}">${tick.year}</time></span>`).join('');
  const boundaries = layout.boundaries.map((boundary) => `<span class="timeline-boundary" style="--boundary-x:${boundary.x}px"><time datetime="${boundary.year}">${boundary.year}</time></span>`).join('');
  const peopleMarkup = layout.nodes.map((node) => personMarkup(node, portraitFor, layout.axisY)).join('');

  return `<section class="people-timeline" aria-label="明朝人物时间长卷">
  <div class="people-view-tabs" role="tablist" aria-label="人物浏览方式">
    <button id="peopleTimelineTab" type="button" role="tab" aria-selected="true" aria-controls="peopleTimelineView" data-people-view="timeline">历史长卷</button>
    <button id="peopleTableTab" type="button" role="tab" aria-selected="false" data-people-view="table">人物总表</button>
  </div>
  <section id="peopleTimelineView" class="people-timeline-viewport" role="tabpanel" aria-labelledby="peopleTimelineTab">
    <div class="people-timeline-canvas" style="--timeline-width:${layout.width}px;--timeline-height:${layout.height}px">
      <div class="timeline-axis" aria-hidden="true"></div>
      <div class="timeline-ticks" aria-hidden="true">${ticks}</div>
      <div class="timeline-boundaries" aria-hidden="true">${boundaries}</div>
      <div class="timeline-lanes" aria-label="人物类别泳道">${laneMarkup(layout)}</div>
      ${peopleMarkup}
    </div>
  </section>
</section>`;
}

export const PEOPLE_TIMELINE_CSS = `.people-timeline{position:relative;z-index:0;isolation:isolate;color:#171815;font-family:ui-serif,"Noto Serif SC",serif}
.people-view-tabs{display:flex;gap:8px;margin-bottom:12px}
.people-view-tabs button{border:1px solid #8f8876;background:#f5f0e3;color:#171815;padding:7px 12px;cursor:pointer}
.people-view-tabs button[aria-selected="true"]{background:#171815;color:#f5f0e3}
.people-timeline-viewport{overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-gutter:stable;border:1px solid #c7bea9;background:#f5f0e3}
.people-timeline-canvas{position:relative;width:var(--timeline-width);height:var(--timeline-height);min-width:6500px}
.timeline-axis{position:absolute;left:0;right:0;top:50%;height:1px;background:#8f8876}
.timeline-tick{position:absolute;left:var(--tick-x);top:calc(50% - 8px);height:16px;border-left:1px solid #8f8876;color:#625d50;font:12px/1 ui-monospace,monospace}
.timeline-tick time{position:absolute;top:18px;left:4px;white-space:nowrap}
.timeline-boundary{position:absolute;left:var(--boundary-x);top:0;height:100%;border-left:2px solid #b64a35;color:#8e3022;font:12px/1 ui-monospace,monospace}
.timeline-boundary time{position:absolute;top:calc(50% + 18px);left:4px;font-weight:700;white-space:nowrap}
.timeline-lane-label{position:absolute;z-index:1;left:18px;top:var(--lane-y);margin:0;transform:translateY(-50%);width:108px;color:#625d50;font-size:12px;line-height:1.25;text-align:center}
.timeline-person{position:absolute;left:var(--person-x);top:var(--person-y);z-index:2;width:var(--avatar-size);height:var(--avatar-size);transform:translate(-50%,-50%);text-align:center}
.timeline-person-guide{position:absolute;z-index:0;left:50%;width:1px;pointer-events:none;transform:translateX(-50%);background:rgba(98,93,80,.36)}
.timeline-person[data-side="top"] .timeline-person-guide{top:50%;height:var(--axis-distance)}
.timeline-person[data-side="bottom"] .timeline-person-guide{bottom:50%;height:var(--axis-distance)}
.timeline-person-select{position:absolute;z-index:1;inset:0;display:block;width:100%;height:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}
.timeline-portrait{position:relative;display:grid;place-items:center;width:100%;height:100%;box-sizing:border-box;border:3px solid var(--category-color);border-radius:50%;overflow:hidden;background:#dfd6c4;color:#171815;font-weight:700;line-height:1}
.timeline-portrait-image{display:block;width:100%;height:100%;object-fit:cover}
.timeline-portrait-source{position:absolute;right:0;bottom:0;max-width:100%;padding:1px 3px;overflow:hidden;background:rgba(23,24,21,.78);color:#f5f0e3;font:8px/1.15 ui-sans-serif,sans-serif;text-overflow:ellipsis;white-space:nowrap}
.timeline-portrait .timeline-portrait-fallback{display:none}
.timeline-portrait--fallback .timeline-portrait-fallback,.timeline-portrait.is-failed .timeline-portrait-fallback{display:grid;place-items:center;width:100%;height:100%}
.timeline-portrait.is-failed .timeline-portrait-image{display:none}
.timeline-person strong,.timeline-person small{position:absolute;left:50%;display:block;width:110px;overflow:hidden;transform:translateX(-50%);pointer-events:none;text-overflow:ellipsis;white-space:nowrap}
.timeline-person strong{top:calc(100% + 3px);font-size:13px;line-height:1.2}
.timeline-person small{top:calc(100% + 20px);color:#625d50;font-size:11px;line-height:1.2}
.timeline-person-context{position:absolute;left:50%;display:none;width:220px;transform:translateX(-50%);pointer-events:none;padding:5px 7px;border:1px solid #8f8876;background:rgba(245,240,227,.97);box-shadow:0 5px 15px rgba(23,24,21,.12);color:#625d50}
.timeline-person-context time{display:block;color:#8e3022;font-size:11px;font-weight:700;line-height:1.2;white-space:nowrap}
.timeline-person-basis{display:-webkit-box;margin-top:3px;overflow:hidden;font-size:10px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.timeline-person[data-side="top"] .timeline-person-context{top:calc(100% + 38px)}
.timeline-person[data-side="bottom"] .timeline-person-context{bottom:calc(100% + 8px)}
.timeline-person-open{display:none;position:absolute;z-index:2;left:50%;transform:translateX(-50%);margin:0;border:1px solid #171815;background:#f5f0e3;color:#171815;padding:4px 7px;font:12px/1.2 inherit;white-space:nowrap;cursor:pointer}
.timeline-person[data-side="top"] .timeline-person-open{top:calc(100% + 101px)}
.timeline-person[data-side="bottom"] .timeline-person-open{bottom:calc(100% + 72px)}
.size-emperor{--avatar-size:88px;--category-color:#d0a743}
.size-featured{--avatar-size:72px}
.size-standard{--avatar-size:56px}
.category-emperor{--category-color:#d0a743}
.category-children{--category-color:#547aa5}
.category-women{--category-color:#a44e6e}
.category-eunuch{--category-color:#76528b}
.category-civil{--category-color:#4f7d56}
.category-military{--category-color:#9a4b37}
.category-independent{--category-color:#9d6b38}
.category-external{--category-color:#61778b}
.timeline-person.is-selected,.timeline-person:focus-within{z-index:1000}
.timeline-person.is-selected .timeline-person-guide,.timeline-person:focus-within .timeline-person-guide{width:3px;background:#8e3022}
.timeline-person.is-selected .timeline-portrait,.timeline-person:focus-within .timeline-portrait{box-shadow:0 0 0 4px #171815,0 0 0 7px #f0e1b6}
.timeline-person.is-selected .timeline-person-context,.timeline-person:focus-within .timeline-person-context{display:block}
.timeline-person.is-selected .timeline-person-open{display:block}
`;

export function peopleTimelineClientScript() {
  return `(()=>{
    const body=document.body;
    const timeline=document.getElementById('peopleTimelineView');
    const tableSections=[...document.querySelectorAll('.people-page>.shell>.timeline,.people-page>.shell>.toolbar,.people-page>.shell>.statusline,.people-page>.shell>.tablewrap,.people-page>.shell>.method')];
    const buttons=[...document.querySelectorAll('button[data-people-view]')];
    window.setPeopleView=view=>{
      const showTimeline=view==='timeline';
      body.dataset.peopleView=showTimeline?'timeline':'table';
      timeline.hidden=!showTimeline;
      tableSections.forEach(section=>section.hidden=showTimeline);
      buttons.forEach(button=>{
        const selected=button.dataset.peopleView===body.dataset.peopleView;
        button.setAttribute('aria-selected',String(selected));
        button.tabIndex=selected?0:-1;
      });
    };
    buttons.forEach((button,index)=>{
      button.addEventListener('click',()=>setPeopleView(button.dataset.peopleView));
      button.addEventListener('keydown',event=>{
        let target=-1;
        if(event.key==='ArrowRight')target=(index+1)%buttons.length;
        else if(event.key==='ArrowLeft')target=(index-1+buttons.length)%buttons.length;
        else if(event.key==='Home')target=0;
        else if(event.key==='End')target=buttons.length-1;
        if(target<0)return;
        event.preventDefault();
        const next=buttons[target];
        setPeopleView(next.dataset.peopleView);
        next.focus();
      });
    });
    const people=[...document.querySelectorAll('[data-timeline-person]')];
    const clearPersonSelection=()=>people.forEach(person=>{
      person.classList.remove('is-selected');
      const select=person.querySelector('.timeline-person-select');
      const open=person.querySelector('.timeline-person-open');
      if(select)select.setAttribute('aria-pressed','false');
      if(open)open.hidden=true;
    });
    const selectPerson=person=>{
      clearPersonSelection();
      person.classList.add('is-selected');
      const select=person.querySelector('.timeline-person-select');
      const open=person.querySelector('.timeline-person-open');
      if(select)select.setAttribute('aria-pressed','true');
      if(open)open.hidden=false;
    };
    const openTimelinePerson=name=>{
      const person=personRecord(name);
      if(!person)return;
      syncPeopleQuery('person',person.name);
      if(personPageMeta(person)&&matchMedia('(max-width:720px)').matches){
        location.href=personPageHref(person);
        return;
      }
      openDetail(person);
    };
    timeline.addEventListener('click',event=>{
      const person=event.target.closest('[data-timeline-person]');
      if(!person){clearPersonSelection();return}
      if(event.target.closest('.timeline-person-select')){selectPerson(person);return}
      const open=event.target.closest('.timeline-person-open');
      if(open){openTimelinePerson(person.dataset.timelinePerson)}
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')clearPersonSelection();
    });
    document.querySelectorAll('[data-timeline-image]').forEach(image=>{
      image.addEventListener('error',()=>{
        image.hidden=true;
        const portrait=image.closest('.timeline-portrait');
        portrait?.classList.add('is-failed');
        const source=portrait?.querySelector('[data-timeline-image-source]');
        if(source)source.hidden=true;
      },{once:true});
    });
    setPeopleView(new URLSearchParams(location.search).has('event')?'table':'timeline');
  })();`;
}
