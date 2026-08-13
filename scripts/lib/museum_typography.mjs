import fs from 'node:fs/promises';
import path from 'node:path';

export const TYPOGRAPHY_MARKER = 'data-museum-typography="scope-note-only"';

const css = `<style ${TYPOGRAPHY_MARKER}>
@font-face{font-family:"Ming Museum Sans";src:url("assets/fonts/MingMuseumSans-Regular.woff2") format("woff2");font-style:normal;font-weight:400;font-display:swap}
.hall-scope-footer .scope{font-family:"Ming Museum Sans","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif!important;font-size:15px!important;line-height:1.9!important;color:#514b40!important;max-width:72ch!important}
.hall-scope-footer .scope b{color:#181713!important;font-weight:700}
</style>`;

export async function applyMuseumTypography(root) {
  const files = ['people.html', 'events.html'];
  for (const relative of files) {
    const file = path.join(root, relative);
    let html = await fs.readFile(file, 'utf8');
    if (!html.includes(TYPOGRAPHY_MARKER)) {
      html = html.replace('</head>', `${css}</head>`);
      await fs.writeFile(file, html, 'utf8');
    }
  }
  return files.length;
}
