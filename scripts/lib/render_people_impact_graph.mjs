const allowedTypes=new Set(['support','conflict','status']);
const allowedConfidence=new Set(['高','中','低','未知']);

export function validateImpactGraphData(data){
  if(data?.version!=='1.0'||!Array.isArray(data.graphs))throw new Error('Invalid impact graph root');
  if(!data.sourceCatalog||typeof data.sourceCatalog!=='object')throw new Error('Missing impact graph source catalog');
  for(const graph of data.graphs){
    if(!graph.id||!graph.exhibitionId||!graph.eventId||!Array.isArray(graph.stages))throw new Error(`Invalid graph ${graph.id||'unknown'}`);
    if(!graph.stages.some(stage=>stage.id===graph.compactStageId))throw new Error(`Unknown compact stage ${graph.compactStageId}`);
    for(const stage of graph.stages){
      if(!stage.id||!stage.label||!stage.range||!stage.intro||!stage.outcome)throw new Error(`Incomplete stage ${stage.id||'unknown'}`);
      if(!Array.isArray(stage.nodes)||!Array.isArray(stage.edges))throw new Error(`Invalid stage collections ${stage.id}`);
      const names=new Set(stage.nodes.map(node=>node.name));
      if(names.size!==stage.nodes.length)throw new Error(`Duplicate node in ${stage.id}`);
      for(const node of stage.nodes){
        if(!node.name||!Number.isFinite(node.x)||!Number.isFinite(node.y)||node.x<6||node.x>94||node.y<6||node.y>56)throw new Error(`Invalid node position ${node.name||'unknown'}`);
      }
      for(const edge of stage.edges){
        if(!names.has(edge.from)||!names.has(edge.to))throw new Error(`Unknown edge node ${edge.from} -> ${edge.to}`);
        if(!edge.label||!edge.note||!allowedTypes.has(edge.type))throw new Error(`Invalid edge ${edge.from} -> ${edge.to}`);
        if(edge.type==='status'&&edge.directed)throw new Error('Status edge cannot be directed');
        if(!allowedConfidence.has(edge.confidence))throw new Error(`Invalid confidence ${edge.confidence}`);
        if(!Array.isArray(edge.sourceIds)||!edge.sourceIds.length||edge.sourceIds.some(id=>!data.sourceCatalog[id]))throw new Error(`Invalid edge sources ${edge.from} -> ${edge.to}`);
        if(!Number.isFinite(edge.labelX)||!Number.isFinite(edge.labelY))throw new Error(`Invalid edge label position ${edge.from} -> ${edge.to}`);
      }
    }
  }
  return data;
}

export const graphForExhibition=(data,id)=>data.graphs.find(graph=>graph.exhibitionId===id)||null;
export const graphForEvent=(data,id)=>data.graphs.find(graph=>graph.eventId===id)||null;

export function edgeEndpoints(stage,edge,radius=6){
  const from=stage.nodes.find(node=>node.name===edge.from);
  const to=stage.nodes.find(node=>node.name===edge.to);
  if(!from||!to)throw new Error(`Unknown edge node ${edge.from} -> ${edge.to}`);
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
  if(!length)throw new Error(`Overlapping nodes ${edge.from} and ${edge.to}`);
  const ux=dx/length,uy=dy/length;
  return {x1:from.x+ux*radius,y1:from.y+uy*radius,x2:to.x-ux*radius,y2:to.y-uy*radius};
}

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const markerId=(prefix,type)=>`impact-arrow-${type}-${prefix}`;

function edgeTag(edge){
  const width=Math.max(18,Math.min(32,Math.max(edge.label.length,edge.note.length)*2.05));
  const x=edge.labelX-width/2;
  const y=edge.labelY-3.6;
  return `<g class="impact-tag"><rect x="${x}" y="${y}" width="${width}" height="7.2" rx="1"></rect><text class="impact-tag-label" x="${edge.labelX}" y="${edge.labelY-.4}">${esc(edge.label)}</text><text class="impact-tag-note" x="${edge.labelX}" y="${edge.labelY+2.1}">${esc(edge.note)} · ${esc(edge.confidence)}置信度</text></g>`;
}

function impactNode(node,index,{prefix,portraitFor,personHref}){
  const portrait=portraitFor(node.name)||{file:'',kind:'none',label:''};
  const href=personHref(node.name);
  const clipId=`impact-clip-${prefix}-${index}`;
  const image=portrait.file
    ? `<image href="${esc(portrait.file)}" x="${node.x-6}" y="${node.y-6}" width="12" height="12" preserveAspectRatio="xMidYMin slice" clip-path="url(#${clipId})"></image>`
    : `<circle class="impact-node-fallback" cx="${node.x}" cy="${node.y}" r="6"></circle><text class="impact-node-initial" x="${node.x}" y="${node.y+1.8}">${esc(node.name[0])}</text>`;
  const imagined=portrait.kind==='imagined';
  const contents=`<g data-impact-node="${esc(node.name)}"><defs><clipPath id="${clipId}"><circle cx="${node.x}" cy="${node.y}" r="6"></circle></clipPath></defs>${image}<circle data-impact-ring class="impact-node-ring${imagined?' imagined':''}" cx="${node.x}" cy="${node.y}" r="6"></circle><text class="impact-node-name" x="${node.x}" y="${node.y+9.8}">${esc(node.name)}</text>${imagined?`<text class="impact-node-note" x="${node.x}" y="${node.y+12.4}">AI想象像</text>`:''}</g>`;
  return href?`<a href="${esc(href)}" aria-label="查看${esc(node.name)}人物档案">${contents}</a>`:contents;
}

export function renderImpactSvg({graph,stage,portraitFor,personHref,compact=false}){
  const prefix=`${graph.id}-${stage.id}-${compact?'compact':'full'}`;
  const directedTypes=[...new Set(stage.edges.filter(edge=>edge.directed).map(edge=>edge.type))];
  const markers=directedTypes.map(type=>`<marker id="${markerId(prefix,type)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10z" fill="${type==='conflict'?'#cf5848':'#c49b4d'}"></path></marker>`).join('');
  const lines=stage.edges.map(edge=>{
    const points=edgeEndpoints(stage,edge);
    const marker=edge.directed?` marker-end="url(#${markerId(prefix,edge.type)})"`:'';
    return `<line data-impact-edge="${esc(edge.from)}|${esc(edge.to)}" data-impact-type="${esc(edge.type)}" class="impact-edge ${esc(edge.type)}" x1="${points.x1}" y1="${points.y1}" x2="${points.x2}" y2="${points.y2}"${marker}></line>`;
  }).join('');
  const tags=stage.edges.map(edgeTag).join('');
  const nodes=stage.nodes.map((node,index)=>impactNode(node,index,{prefix,portraitFor,personHref})).join('');
  const relations=stage.edges.map(edge=>`${edge.from}${edge.directed?'影响':'与'}${edge.to}：${edge.label}`).join('；');
  return `<svg viewBox="0 0 100 62" role="img" aria-label="${esc(stage.label)}人物作用关系：${esc(relations)}"><defs>${markers}</defs>${lines}${tags}${nodes}</svg>`;
}

export function renderFullImpactGraph({graph,portraitFor,personHref}){
  const tabs=graph.stages.map((stage,index)=>`<button type="button" role="tab" data-impact-stage="${esc(stage.id)}" aria-controls="impact-panel-${esc(graph.id)}-${esc(stage.id)}" aria-selected="${index===0?'true':'false'}">${esc(stage.label)}</button>`).join('');
  const panels=graph.stages.map((stage,index)=>`<article class="impact-panel" id="impact-panel-${esc(graph.id)}-${esc(stage.id)}" data-impact-panel="${esc(stage.id)}" role="tabpanel"${index===0?'':' hidden'}><header class="impact-context"><div><small>STAGE 0${index+1} · ${esc(stage.range)}</small><h3>${esc(stage.label)}</h3></div><p>${esc(stage.intro)}</p></header><div class="impact-graph">${renderImpactSvg({graph,stage,portraitFor,personHref})}</div><div class="impact-outcome"><b>阶段结果</b><span>${esc(stage.outcome)}</span></div></article>`).join('');
  return `<section class="impact-room reveal" id="people-impact-graph"><header class="room-head"><div><div class="eyebrow">PEOPLE & CONSEQUENCE</div><h2>人物怎样推动局势</h2></div><p>关系线表达本阶段可追溯的行动与状态，不把人物同现自动解释为因果。点击头像可进入人物档案。</p></header><div class="impact-shell"><div class="impact-tabs" role="tablist" aria-label="土木堡危机阶段">${tabs}</div>${panels}<div class="impact-legend"><span><i class="support"></i>支持／任用／协作</span><span><i class="conflict"></i>冲突／俘获／清算</span><span><i class="status"></i>身份或状态关系</span><span>虚线头像环＝AI想象像</span></div></div></section>`;
}

export function renderCompactImpactGraph({graph,stageId,portraitFor,personHref}){
  const stage=graph.stages.find(item=>item.id===stageId);
  if(!stage)return '';
  return `<section class="event-impact-compact" data-impact-compact="${esc(graph.id)}"><header><small>人物作用图 · ${esc(stage.range)}</small><h4>${esc(stage.label)}</h4><p>${esc(stage.intro)}</p></header><div class="event-impact-graph">${renderImpactSvg({graph,stage,portraitFor,personHref,compact:true})}</div><div class="event-impact-outcome"><b>直接结果</b><span>${esc(stage.outcome)}</span></div><a data-impact-full-link href="exhibit-${esc(graph.exhibitionId)}.html#people-impact-graph">查看完整三阶段人物作用图 →</a></section>`;
}
