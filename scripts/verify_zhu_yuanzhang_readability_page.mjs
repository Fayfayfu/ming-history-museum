import {chromium} from 'playwright';
import path from 'node:path';

const root = path.resolve('outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9/明史数字博物馆');
const url = file => `file://${path.join(root, file)}`;
const errors = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});

try {
  const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('pageerror', error => errors.push(`桌面页面异常：${error.message}`));

  await page.goto(`${url('people.html')}?person=${encodeURIComponent('朱元璋')}`, {waitUntil:'networkidle'});
  const card = await page.evaluate(() => ({
    open: document.querySelector('#drawer')?.classList.contains('open') || false,
    sealText: document.querySelector('#detail .seal')?.childNodes[0]?.textContent.trim() || '',
    confidenceText: document.querySelector('#detail .seal-confidence')?.textContent.trim() || '',
    confidenceColor: getComputedStyle(document.querySelector('#detail .seal-confidence')).color,
    confidenceFontSize: getComputedStyle(document.querySelector('#detail .seal-confidence')).fontSize,
    sealColor: getComputedStyle(document.querySelector('#detail .seal')).color,
    leadFontSize: getComputedStyle(document.querySelector('#detail .profile-preview>p')).fontSize,
    nodes: document.querySelectorAll('#detail .profile-quick-node').length,
    summaries: [...document.querySelectorAll('#detail .profile-quick-summary')].map(node => node.textContent.trim()),
    summaryFontSizes: [...document.querySelectorAll('#detail .profile-quick-summary')].map(node => getComputedStyle(node).fontSize),
    summaryColors: [...document.querySelectorAll('#detail .profile-quick-summary')].map(node => getComputedStyle(node).color),
    titles: [...document.querySelectorAll('#detail .profile-quick-copy>span')].map(node => node.textContent.trim()),
    titleFontSizes: [...document.querySelectorAll('#detail .profile-quick-copy>span')].map(node => getComputedStyle(node).fontSize),
    titleFontWeights: [...document.querySelectorAll('#detail .profile-quick-copy>span')].map(node => getComputedStyle(node).fontWeight),
    yearFontSizes: [...document.querySelectorAll('#detail .profile-quick-date>b')].map(node => getComputedStyle(node).fontSize),
    reignYears: [...document.querySelectorAll('#detail .profile-quick-reign')].map(node => node.textContent.trim()),
    reignYearFontSizes: [...document.querySelectorAll('#detail .profile-quick-reign')].map(node => getComputedStyle(node).fontSize),
    evidenceLabels: document.querySelectorAll('#detail .chapter-source-note').length,
    founderFacts: document.querySelectorAll('#detail .facts-founder').length,
    founderIdentityLabels: [...document.querySelectorAll('#detail .founder-identity-row span')].map(node => node.textContent.trim()),
    founderIdentityValues: [...document.querySelectorAll('#detail .founder-identity-row b')].map(node => node.textContent.trim()),
    founderIdentityRowGap: getComputedStyle(document.querySelector('#detail .founder-identity')).rowGap,
    founderIdentityRowsSingleLine: [...document.querySelectorAll('#detail .founder-identity-row b')].every(node => { const range=document.createRange(); range.selectNodeContents(node); return range.getClientRects().length===1; }),
    founderIdentityDomains: [...document.querySelectorAll('#detail .founder-domain .domain-tag')].map(node => node.textContent.trim()),
    standaloneFounderDomains: document.querySelectorAll('#detail .founder-domain').length,
    royalRelations: document.querySelectorAll('#detail .founder-royal-relations').length,
    royalColumns: [...document.querySelectorAll('#detail .founder-royal-column')].map(node => node.textContent.trim()),
    reformsInsideFacts: document.querySelectorAll('#detail .facts-founder .founder-reforms,#detail .facts-founder .founder-reform-item').length,
    governanceSections: document.querySelectorAll('#detail .founder-governance').length,
    governanceItems: [...document.querySelectorAll('#detail .founder-governance-item')].map(node => node.textContent.trim()),
    governanceAfterPreview: (() => {
      const preview = document.querySelector('#detail .profile-preview');
      const governance = document.querySelector('#detail .founder-governance');
      return Boolean(preview && governance && (preview.compareDocumentPosition(governance) & Node.DOCUMENT_POSITION_FOLLOWING));
    })(),
    assessmentFacts: document.querySelectorAll('#detail .facts-founder>.founder-assessment-fact').length,
    assessmentSectionsOutsideFacts: document.querySelectorAll('#detail>.founder-assessment').length,
    assessmentCards: [...document.querySelectorAll('#detail .founder-assessment-fact .founder-assessment-card')].map(node => node.textContent.trim()),
    assessmentLabels: [...document.querySelectorAll('#detail .founder-assessment-fact .founder-assessment-card h5')].map(node => node.textContent.trim()),
    assessmentBodySizes: [...document.querySelectorAll('#detail .founder-assessment-fact .founder-assessment-card p')].map(node => getComputedStyle(node).fontSize),
    assessmentBodyColors: [...document.querySelectorAll('#detail .founder-assessment-fact .founder-assessment-card p')].map(node => getComputedStyle(node).color),
    assessmentBoundary: document.querySelector('#detail .founder-basic-notes p:nth-child(2)')?.textContent.trim() || '',
    boundariesInsideFacts: document.querySelectorAll('#detail .facts-founder .founder-boundary,#detail .facts-founder .founder-assessment-boundary').length,
    basicNotes: [...document.querySelectorAll('#detail .founder-basic-notes p')].map(node => node.textContent.trim()),
    notesBetweenFactsAndScore: (() => {
      const facts = document.querySelector('#detail .facts-founder');
      const notes = document.querySelector('#detail .founder-basic-notes');
      const score = document.querySelector('#detail .profile-score-section');
      return Boolean(facts && notes && score && (facts.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING) && (notes.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING));
    })(),
    legacyDrawerNarratives: document.querySelectorAll('#detail>.narrative').length,
    oldLabels: [...document.querySelectorAll('#detail .facts>.fact>span')].map(node => node.textContent.trim()),
    oldLineageCards: document.querySelectorAll('#detail .lineage-fact').length,
    scoreInsideFacts: document.querySelectorAll('#detail .facts .score-summary').length,
    standaloneScores: document.querySelectorAll('#detail .profile-score-section .score-summary').length,
    scoreLabelSizes: [...document.querySelectorAll('#detail .profile-score-section .score-summary-item span')].map(node => getComputedStyle(node).fontSize),
    scoreVerticalBalance: [...document.querySelectorAll('#detail .profile-score-section .score-summary-item')].every(node => {
      const box = node.getBoundingClientRect();
      const first = node.firstElementChild.getBoundingClientRect();
      const last = node.lastElementChild.getBoundingClientRect();
      return Math.abs((first.top - box.top) - (box.bottom - last.bottom)) < 4;
    }),
    bodyWidth: document.body.scrollWidth,
    viewport: innerWidth
  }));
  if (!card.open) errors.push('朱元璋人物卡抽屉未打开');
  if (card.sealText !== '皇帝' || card.confidenceText !== '高置信度') errors.push(`抽屉顶部类别与置信度标注错误：${card.sealText}/${card.confidenceText}`);
  if (card.confidenceColor === card.sealColor || card.confidenceFontSize !== '9px') errors.push(`置信度标注应使用不抢眼的独立颜色和 9px 字号：${card.confidenceColor}/${card.confidenceFontSize}`);
  if (card.leadFontSize !== '15px') errors.push(`人物卡顶部概括应为 15px，实际为 ${card.leadFontSize}`);
  if (card.nodes !== 6 || card.summaries.length !== 6) errors.push(`人物卡应有六个阶段和六条摘要，实际为 ${card.nodes}/${card.summaries.length}`);
  if (card.titles.join('|') !== '在饥荒中失去家人|参加起义军|击败主要对手|建立明朝|废除丞相|继承安排留下危机') errors.push('人物卡六个直接标题不符合合同');
  if (card.titleFontSizes.length !== 6 || card.titleFontSizes.some(size => size !== '16px')) errors.push(`人物卡六条阶段标题应为 16px，实际为 ${card.titleFontSizes.join('/') || '无'}`);
  if (card.titleFontWeights.length !== 6 || card.titleFontWeights.some(weight => weight !== '700')) errors.push(`人物卡六条阶段标题应为 700 字重，实际为 ${card.titleFontWeights.join('/') || '无'}`);
  if (!card.summaries[0]?.includes('父母和兄长相继去世后') || !card.summaries[5]?.includes('太子朱标早逝后')) errors.push('人物卡首尾摘要没有形成清晰生平骨架');
  if (card.summaryFontSizes.length !== 6 || card.summaryFontSizes.some(size => size !== '14px')) errors.push(`人物卡六条摘要正文应为 14px，实际为 ${card.summaryFontSizes.join('/') || '无'}`);
  if (card.summaryColors.length !== 6 || card.summaryColors.some(color => color !== 'rgb(64, 57, 47)')) errors.push(`人物卡六条摘要正文应使用深色 #40392f，实际为 ${card.summaryColors.join('/') || '无'}`);
  if (card.yearFontSizes.length !== 6 || card.yearFontSizes.some(size => size !== '14px')) errors.push(`人物卡公元年份应为 14px，实际为 ${card.yearFontSizes.join('/') || '无'}`);
  if (card.reignYearFontSizes.length !== 6 || card.reignYearFontSizes.some(size => size !== '12px')) errors.push(`人物卡年号应为 12px，实际为 ${card.reignYearFontSizes.join('/') || '无'}`);
  if (card.reignYears.length !== 6 || !card.reignYears[0]?.includes('至正四年') || !card.reignYears[4]?.includes('洪武十三年')) errors.push('人物卡双纪年不完整');
  if (card.evidenceLabels !== 0) errors.push('人物卡不应显示独立页证据浅注');
  if (card.founderFacts !== 1 || card.royalRelations !== 1) errors.push(`朱元璋应使用开国皇帝基本信息结构，实际为 ${card.founderFacts}/${card.royalRelations}`);
  if (card.founderIdentityLabels.join('|') !== '身份 / 庙号|年号' || card.founderIdentityValues.join('|') !== '皇帝 · 太祖|洪武（通称洪武帝）') errors.push(`朱元璋身份格应压缩为身份庙号、年号两行，实际为 ${card.founderIdentityLabels.join('/') || '无'}：${card.founderIdentityValues.join('/') || '无'}`);
  if (parseFloat(card.founderIdentityRowGap) > 6 || !card.founderIdentityRowsSingleLine) errors.push(`朱元璋身份格行距或换行不符合紧凑两行标准：gap ${card.founderIdentityRowGap}，单行 ${card.founderIdentityRowsSingleLine}`);
  if (card.standaloneFounderDomains !== 1 || card.founderIdentityDomains.length < 2 || !card.founderIdentityDomains.includes('政治制度') || !card.founderIdentityDomains.includes('军事边疆')) errors.push(`历史领域应独立成格并显示全部领域，实际为 ${card.founderIdentityDomains.join('|') || '无'} / 独立格 ${card.standaloneFounderDomains}`);
  if (card.royalColumns.length !== 3) errors.push(`皇室关系应为三栏，实际为 ${card.royalColumns.length}`);
  if (!card.royalColumns[0]?.includes('朱世珍') || !card.royalColumns[0]?.includes('陈氏') || !card.royalColumns[0]?.includes('濠州朱氏开国一系')) errors.push('家庭出身栏缺少父母或支系信息');
  if (!card.royalColumns[1]?.includes('皇子 26') || !card.royalColumns[1]?.includes('皇女 16') || !card.royalColumns[1]?.includes('合计 42') || !card.royalColumns[1]?.includes('本馆收录 6')) errors.push('子女栏数量或本馆收录边界不完整');
  if (!card.royalColumns[2]?.includes('帝位来源') || !card.royalColumns[2]?.includes('1368') || !card.royalColumns[2]?.includes('朱标') || !card.royalColumns[2]?.includes('朱允炆') || card.royalColumns[2]?.includes('入继')) errors.push('帝位与继承栏叙述不符合开国皇帝语义');
  if (card.reformsInsideFacts !== 0) errors.push(`基本信息表不应包含关键制度改造，实际命中 ${card.reformsInsideFacts} 个节点`);
  if (card.governanceSections !== 1 || !card.governanceAfterPreview) errors.push(`人物速览后应有一个独立“统治与制度”模块，实际为 ${card.governanceSections}，顺序正确：${card.governanceAfterPreview}`);
  if (card.governanceItems.length !== 4 || !['中书省与丞相','六部','军事中枢','监察与侦缉'].every(label => card.governanceItems.some(item => item.includes(label)))) errors.push(`统治与制度应有四项，实际为 ${card.governanceItems.join(' / ') || '无'}`);
  if (!card.governanceItems.some(item => item.includes('废除')) || !card.governanceItems.some(item => item.includes('六个并列机构的合称') && item.includes('直接向皇帝奏事')) || !card.governanceItems.some(item => item.includes('五军都督府')) || !card.governanceItems.some(item => item.includes('都察院') && item.includes('锦衣卫'))) errors.push('统治与制度的关系或说明不完整');
  if (card.assessmentFacts !== 1 || card.assessmentSectionsOutsideFacts !== 0 || card.assessmentCards.length !== 2) errors.push(`统治要点与历史评价应作为基础信息表内一个通栏，实际为表内 ${card.assessmentFacts} / 表外 ${card.assessmentSectionsOutsideFacts} / 两栏 ${card.assessmentCards.length}`);
  if (card.assessmentLabels.join('|') !== '统治要点|历史评价') errors.push(`皇帝评价字段应使用中性标题“统治要点／历史评价”，实际为 ${card.assessmentLabels.join('/') || '无'}`);
  if (!card.assessmentCards[0]?.includes('建立明朝') || !card.assessmentCards[0]?.includes('恢复战后秩序') || !card.assessmentCards[0]?.includes('重组行政、军事与监察体系') || !card.assessmentCards[1]?.includes('结束长期割据') || !card.assessmentCards[1]?.includes('大规模株连') || !card.assessmentCards[1]?.includes('严重政治代价')) errors.push('统治要点或历史评价的压缩正文不完整');
  if (card.assessmentCards.some(text => text.includes('功绩极大') || text.includes('文字狱')) || card.legacyDrawerNarratives !== 0) errors.push('朱元璋仍显示结论化旧评价或通用事迹评价排版');
  if (!card.assessmentBoundary.includes('后世称为“文字狱”') || !card.assessmentBoundary.includes('存在争议')) errors.push('文字狱争议边界缺失');
  if (card.boundariesInsideFacts !== 0) errors.push(`基础信息表内部不应包含说明文字，实际命中 ${card.boundariesInsideFacts} 条`);
  if (card.basicNotes.length !== 2 || !card.basicNotes[0]?.includes('本馆收录 6 位重要子嗣') || !card.basicNotes[1]?.includes('洪武朝部分案件被后世称为“文字狱”')) errors.push(`表格外统一说明区应有两条说明，实际为 ${card.basicNotes.join(' / ') || '无'}`);
  if (!card.notesBetweenFactsAndScore) errors.push('统一说明区应位于基础信息表之后、评分区之前');
  if (card.assessmentBodySizes.length !== 2 || card.assessmentBodySizes.some(size => size !== '14px')) errors.push(`表内评价正文应为 14px，实际为 ${card.assessmentBodySizes.join('/') || '无'}`);
  if (card.assessmentBodyColors.length !== 2 || card.assessmentBodyColors.some(color => color !== 'rgb(64, 57, 47)')) errors.push(`评价正文应使用深色 #40392f，实际为 ${card.assessmentBodyColors.join('/') || '无'}`);
  if (card.oldLabels.includes('关联机构') || card.oldLabels.includes('子女数量') || card.oldLineageCards !== 0) errors.push('朱元璋基本信息仍保留旧的机构、子女或帝系模块');
  if (card.scoreInsideFacts !== 0 || card.standaloneScores !== 1) errors.push(`评分区应独立于基本信息表，实际为 ${card.scoreInsideFacts}/${card.standaloneScores}`);
  if (card.scoreLabelSizes.length !== 6 || card.scoreLabelSizes.some(size => size !== '11px')) errors.push(`评分维度标题应为 11px，实际为 ${card.scoreLabelSizes.join('/') || '无'}`);
  if (!card.scoreVerticalBalance) errors.push('评分标题和分数的上下留白不对称');
  if (card.bodyWidth > card.viewport) errors.push(`人物卡桌面端水平溢出：${card.bodyWidth}/${card.viewport}`);
  await page.locator('#detail .founder-governance').screenshot({path:'/tmp/zhu-yuanzhang-governance.png'});
  await page.locator('#detail .facts-founder').screenshot({path:'/tmp/zhu-yuanzhang-basic-info.png'});
  await page.locator('#detail .founder-basic-notes').screenshot({path:'/tmp/zhu-yuanzhang-basic-notes.png'});
  await page.locator('#detail .profile-preview').screenshot({path:'/tmp/zhu-yuanzhang-card.png'});

  await page.goto(`${url('people.html')}?person=${encodeURIComponent('朱棣')}`, {waitUntil:'networkidle'});
  const nextEmperor = await page.evaluate(() => ({
    readableFacts: document.querySelectorAll('#detail .facts-founder').length,
    royalColumns: document.querySelectorAll('#detail .founder-royal-column').length,
    quickNodes: document.querySelectorAll('#detail .profile-quick-node').length,
    governance: document.querySelectorAll('#detail .founder-governance').length,
    oldLineageCards: document.querySelectorAll('#detail .lineage-fact.rich').length,
    hasInstitutionLabel: [...document.querySelectorAll('#detail .facts>.fact>span')].some(node => node.textContent.trim() === '关联机构'),
    scoreInsideFacts: document.querySelectorAll('#detail .facts .score-summary').length,
    scoreOutsideFacts: document.querySelectorAll('#detail .profile-score-section .score-summary').length
  }));
  if (nextEmperor.readableFacts !== 1 || nextEmperor.royalColumns !== 3 || nextEmperor.quickNodes !== 6 || nextEmperor.governance !== 1 || nextEmperor.oldLineageCards !== 0 || nextEmperor.hasInstitutionLabel || nextEmperor.scoreInsideFacts !== 0 || nextEmperor.scoreOutsideFacts !== 1) errors.push(`朱棣应使用统一皇帝新版人物卡：${JSON.stringify(nextEmperor)}`);

  await page.goto(url('people/zhu-yuan-zhang.html'), {waitUntil:'networkidle'});
  const independent = await page.evaluate(() => ({
    chapters: document.querySelectorAll('.chapter').length,
    titles: [...document.querySelectorAll('.chapter-copy h2')].map(node => node.textContent.trim()),
    paragraphs: [...document.querySelectorAll('.chapter')].map(node => node.querySelectorAll('.chapter-copy>p').length),
    notes: document.querySelectorAll('.chapter-source-note').length,
    boundaries: document.querySelectorAll('.chapter-interpretation-boundary').length,
    triggers: [...document.querySelectorAll('.chapter-source-note .source-trigger')].map(node => node.textContent.trim()),
    reignYears: [...document.querySelectorAll('.chapter-reign')].map(node => node.textContent.trim()),
    legacyEvidence: document.querySelectorAll('.chapter .evidence,.chapter .inference').length,
    bodyWidth: document.body.scrollWidth,
    viewport: innerWidth
  }));
  if (independent.chapters !== 6 || independent.notes !== 6) errors.push(`独立页应有六章和六条证据浅注，实际为 ${independent.chapters}/${independent.notes}`);
  if (independent.paragraphs.some(count => count < 3)) errors.push(`独立页每章应有至少三段完整叙述，实际为 ${independent.paragraphs.join('/')}`);
  if (independent.boundaries !== 6) errors.push(`独立页应有六条解释边界，实际为 ${independent.boundaries}`);
  if (independent.triggers.length !== 6 || independent.triggers.some(text => !text.includes('查看原文'))) errors.push('独立页原文入口不完整');
  if (independent.reignYears.length !== 6) errors.push('独立页双纪年不完整');
  if (independent.legacyEvidence !== 0) errors.push('独立页仍显示旧的醒目证据块');
  if (independent.bodyWidth > independent.viewport) errors.push(`独立页桌面端水平溢出：${independent.bodyWidth}/${independent.viewport}`);
  await page.locator('.chapter').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const desktopVisibility = await page.locator('.chapter').first().evaluate(node => ({
    opacity: getComputedStyle(node).opacity,
    visible: node.classList.contains('visible')
  }));
  if (!desktopVisibility.visible || desktopVisibility.opacity !== '1') errors.push(`独立页桌面端首章未进入可见状态：${JSON.stringify(desktopVisibility)}`);
  await page.locator('.chapter').first().screenshot({path:'/tmp/zhu-yuanzhang-independent-first-chapter.png'});

  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'networkidle'});
  const mobile = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewport: innerWidth,
    notes: document.querySelectorAll('.chapter-source-note').length,
    reignYears: document.querySelectorAll('.chapter-reign').length
  }));
  if (mobile.bodyWidth > mobile.viewport) errors.push(`独立页移动端水平溢出：${mobile.bodyWidth}/${mobile.viewport}`);
  if (mobile.notes !== 6 || mobile.reignYears !== 6) errors.push('独立页移动端缺少证据浅注或双纪年');
  await page.locator('.chapter').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.locator('.chapter').first().screenshot({path:'/tmp/zhu-yuanzhang-independent-mobile-first-chapter.png'});
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(`朱元璋页面浏览器验证失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('朱元璋页面浏览器验证通过：开国皇帝基本信息、四项制度改造、三栏皇室关系、人物卡六阶段摘要及独立页布局均符合合同。');
