export const ARTWORK_VIEWER_CSS = `
[data-artwork-viewer]{cursor:zoom-in}
.artwork-viewer-trigger{position:relative}
.artwork-open{position:absolute;z-index:4;right:12px;bottom:12px;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:44px;min-height:44px;padding:0 13px;border:1px solid rgba(235,226,205,.62);background:rgba(21,21,18,.88);color:#f1e6d0;font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;cursor:pointer;backdrop-filter:blur(8px);transition:background-color .16s cubic-bezier(.23,1,.32,1),border-color .16s cubic-bezier(.23,1,.32,1),transform .12s cubic-bezier(.23,1,.32,1)}
.artwork-open span{font-size:16px;line-height:1}.artwork-open:hover,.artwork-open:focus-visible{border-color:var(--accent2,#e07a62);background:var(--accent,#9c2f23);outline:2px solid var(--accent2,#e07a62);outline-offset:2px}.artwork-open:active{transform:scale(.97)}
.artwork-viewer{width:100vw;height:100svh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#0c0b09;color:#eee4cf;overflow:hidden}
.artwork-viewer::backdrop{background:#0c0b09}.artwork-viewer[open]{display:grid;grid-template-rows:64px minmax(0,1fr) 60px}
.artwork-viewer-head{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 12px 0 24px;border-bottom:1px solid rgba(235,226,205,.18);background:#15130f}.artwork-viewer-heading{min-width:0}.artwork-viewer-heading small{display:block;margin-bottom:5px;color:#b8a98e;font:700 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em}.artwork-viewer-heading h2{margin:0;overflow:hidden;color:#f2e7d2;font:800 18px/1.2 "Songti SC","STSong",serif;text-overflow:ellipsis;white-space:nowrap}.artwork-viewer-close{flex:none;width:44px;height:44px;border:1px solid rgba(235,226,205,.32);background:transparent;color:#f2e7d2;font:24px/1 ui-monospace,monospace;cursor:pointer}.artwork-viewer-close:hover,.artwork-viewer-close:focus-visible{border-color:#e07a62;background:#9c2f23;outline:2px solid #e07a62;outline-offset:2px}
.artwork-viewer-stage{position:relative;min-width:0;min-height:0;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 45%,rgba(235,226,205,.055),transparent 38rem),#080705;touch-action:none;cursor:grab}.artwork-viewer-stage[data-dragging="true"]{cursor:grabbing}.artwork-viewer-image{display:block;width:auto;height:auto;max-width:calc(100vw - 32px);max-height:calc(100svh - 156px);object-fit:contain;transform-origin:center;will-change:transform;user-select:none;-webkit-user-drag:none}
.artwork-viewer-foot{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:8px 12px 8px 24px;border-top:1px solid rgba(235,226,205,.18);background:#15130f}.artwork-viewer-hint{color:#a99d88;font:700 9px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em}.artwork-viewer-controls{display:flex;align-items:center;gap:5px}.artwork-viewer-control{min-width:44px;height:44px;padding:0 9px;border:1px solid rgba(235,226,205,.3);background:#201d17;color:#f2e7d2;font:700 12px/1 ui-monospace,monospace;cursor:pointer}.artwork-viewer-control:hover,.artwork-viewer-control:focus-visible{border-color:#e07a62;background:#37251e;outline:2px solid #e07a62;outline-offset:1px}.artwork-viewer-control[aria-pressed="true"]{border-color:#e07a62;background:#9c2f23;color:#fff}.artwork-viewer-scale{min-width:58px;color:#d9cdb8;font:700 11px/1 ui-monospace,monospace;text-align:center;font-variant-numeric:tabular-nums}body.artwork-viewer-open{overflow:hidden}
@media(max-width:620px){.artwork-open{right:8px;bottom:8px;padding:0 11px}.artwork-viewer[open]{grid-template-rows:58px minmax(0,1fr) 58px}.artwork-viewer-head{padding-left:14px}.artwork-viewer-heading small,.artwork-viewer-hint{display:none}.artwork-viewer-heading h2{font-size:16px}.artwork-viewer-foot{justify-content:center;padding:7px}.artwork-viewer-image{max-width:calc(100vw - 16px);max-height:calc(100svh - 132px)}}
@media(prefers-reduced-motion:reduce){.artwork-open{transition:none}}
`;

export function renderArtworkOpenButton() {
  return '<button class="artwork-open" type="button" data-artwork-open aria-haspopup="dialog" aria-label="查看作品大图"><span aria-hidden="true">⛶</span><b>查看大图</b></button>';
}

export function renderArtworkViewerDialog() {
  return '<dialog class="artwork-viewer" id="artworkViewer" aria-labelledby="artworkViewerTitle"><header class="artwork-viewer-head"><div class="artwork-viewer-heading"><small>FULL-SCREEN OBJECT VIEW · 作品大图</small><h2 id="artworkViewerTitle">作品大图</h2></div><button class="artwork-viewer-close" type="button" data-artwork-close aria-label="关闭作品大图">×</button></header><div class="artwork-viewer-stage" id="artworkViewerStage" tabindex="0" aria-label="作品查看区域，可滚轮缩放并拖动"><img class="artwork-viewer-image" id="artworkViewerImage" alt="" draggable="false"></div><footer class="artwork-viewer-foot"><span class="artwork-viewer-hint">选择 1× / 2× / 4× / 8× · 滚轮连续缩放 · 放大后拖动 · ESC 退出</span><div class="artwork-viewer-controls" aria-label="作品缩放倍率"><output class="artwork-viewer-scale" id="artworkViewerScale" aria-live="polite">1×</output><button class="artwork-viewer-control" type="button" data-artwork-scale="1" aria-label="以1倍完整显示作品" aria-pressed="true">1×</button><button class="artwork-viewer-control" type="button" data-artwork-scale="2" aria-label="以2倍显示作品" aria-pressed="false">2×</button><button class="artwork-viewer-control" type="button" data-artwork-scale="4" aria-label="以4倍显示作品局部" aria-pressed="false">4×</button><button class="artwork-viewer-control" type="button" data-artwork-scale="8" aria-label="以8倍显示作品局部" aria-pressed="false">8×</button></div></footer></dialog>';
}

export const ARTWORK_VIEWER_SCRIPT = `
(()=>{
  const dialog=document.getElementById('artworkViewer');
  if(!dialog)return;
  const stage=document.getElementById('artworkViewerStage');
  const image=document.getElementById('artworkViewerImage');
  const title=document.getElementById('artworkViewerTitle');
  const scaleOutput=document.getElementById('artworkViewerScale');
  const scaleButtons=[...dialog.querySelectorAll('[data-artwork-scale]')];
  const closeButton=dialog.querySelector('[data-artwork-close]');
  let scale=1,x=0,y=0,pointerId=null,startX=0,startY=0,originX=0,originY=0;
  const clampScale=value=>Math.max(1,Math.min(8,Math.round(value*4)/4));
  const paint=()=>{
    image.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+scale+')';
    scaleOutput.textContent=(Number.isInteger(scale)?String(scale):scale.toFixed(2).replace(/0$/,''))+'×';
    scaleButtons.forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.artworkScale)===scale?'true':'false'));
    stage.dataset.zoomed=scale>1?'true':'false';
  };
  const reset=()=>{scale=1;x=0;y=0;paint()};
  const changeScale=next=>{scale=clampScale(next);if(scale===1){x=0;y=0}paint()};
  const sourceImage=target=>target?.matches?.('img[data-artwork-viewer]')?target:target?.closest?.('[data-artwork-item]')?.querySelector('img[data-artwork-viewer]');
  const sourceTitle=(target,img)=>target?.closest?.('[data-artwork-item]')?.dataset.artworkTitle||img.alt||'作品大图';
  const openFrom=target=>{
    const source=sourceImage(target);if(!source)return;
    image.src=source.currentSrc||source.src;
    title.textContent=sourceTitle(target,source);
    image.alt=title.textContent;
    reset();
    dialog.showModal();
    document.body.classList.add('artwork-viewer-open');
    closeButton.focus();
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-artwork-open]');
    if(button){event.preventDefault();openFrom(button);return}
    const img=event.target.closest('img[data-artwork-viewer]');
    if(img&&(matchMedia('(pointer: coarse)').matches||matchMedia('(max-width: 620px)').matches)&&!dialog.open){event.preventDefault();openFrom(img)}
  });
  document.addEventListener('dblclick',event=>{
    if(dialog.open&&(event.target===image||event.target===stage)){event.preventDefault();changeScale(scale===1?2:1);return}
    const img=event.target.closest('img[data-artwork-viewer]');
    if(img&&!dialog.contains(img)){event.preventDefault();openFrom(img)}
  });
  scaleButtons.forEach(button=>button.addEventListener('click',()=>{x=0;y=0;changeScale(Number(button.dataset.artworkScale))}));
  closeButton.addEventListener('click',()=>dialog.close());
  stage.addEventListener('wheel',event=>{event.preventDefault();changeScale(scale+(event.deltaY<0?.25:-.25))},{passive:false});
  stage.addEventListener('pointerdown',event=>{
    if(scale<=1)return;pointerId=event.pointerId;startX=event.clientX;startY=event.clientY;originX=x;originY=y;stage.dataset.dragging='true';stage.setPointerCapture(pointerId);
  });
  stage.addEventListener('pointermove',event=>{if(event.pointerId!==pointerId)return;x=originX+event.clientX-startX;y=originY+event.clientY-startY;paint()});
  const endDrag=event=>{if(event.pointerId!==pointerId)return;pointerId=null;stage.dataset.dragging='false'};
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  dialog.addEventListener('close',()=>{document.body.classList.remove('artwork-viewer-open');reset()});
  dialog.addEventListener('keydown',event=>{
    if(event.key==='+'||event.key==='='){event.preventDefault();changeScale(scale+.5)}
    if(event.key==='-'){event.preventDefault();changeScale(scale-.5)}
    if(event.key==='0'){event.preventDefault();reset()}
  });
  paint();
})();
`;
