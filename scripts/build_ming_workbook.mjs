import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const core = JSON.parse(await fs.readFile('data/ming_core.json','utf8'));
const coreSorted = [...core].sort((a,b)=>(typeof a.birth==='number'?a.birth:9999)-(typeof b.birth==='number'?b.birth:9999)||a.name.localeCompare(b.name,'zh-CN'));
const children = JSON.parse(await fs.readFile('data/ming_children_important.json','utf8'));
const outDir = 'outputs/019fc8d2-0e97-7ed3-a23b-47b434c01dc9';
await fs.mkdir(outDir,{recursive:true});

const wb = Workbook.create();
const intro = wb.worksheets.add('使用说明');
const people = wb.worksheets.add('核心人物');
const kids = wb.worksheets.add('重要子嗣');
const emperors = wb.worksheets.add('皇帝速览');
const rubric = wb.worksheets.add('评分规则');
for (const s of [intro,people,kids,emperors,rubric]) s.showGridLines=false;

const colors={ink:'#1D1B17',paper:'#F4EEDD',paper2:'#E4D8BE',red:'#9B2F24',gold:'#A5772A',sage:'#5E6C58',muted:'#706859',white:'#FFFDF7',line:'#C9BDA3'};
const titleFmt={fill:colors.ink,font:{bold:true,color:colors.paper,fontSize:24},verticalAlignment:'center'};
const sectionFmt={fill:colors.red,font:{bold:true,color:'#FFFFFF',fontSize:12},verticalAlignment:'center'};
const headerFmt={fill:colors.paper2,font:{bold:true,color:colors.ink,fontSize:11},wrapText:true,verticalAlignment:'center',borders:{bottom:{style:'medium',color:colors.ink}}};
const bodyFmt={font:{color:colors.ink,fontSize:10},verticalAlignment:'top',wrapText:true,borders:{insideHorizontal:{style:'thin',color:'#DED4BE'}}};

// 使用说明
intro.getRange('A1:H2').merge();intro.getRange('A1').values=[['明史人物研究底表｜1368—1644']];intro.getRange('A1:H2').format=titleFmt;intro.getRange('A1:H2').format.rowHeight=30;
intro.getRange('A4:B9').values=[['指标','数量'],['记录条目',''],['皇帝',''],['重要子嗣',''],['文臣',''],['武官','']];
intro.getRange('A4:B4').format=headerFmt;intro.getRange('B5').formulas=[[`=COUNTA('核心人物'!$C$2:$C$${core.length+1})+COUNTA('重要子嗣'!$C$2:$C$${children.length+1})`]];
intro.getRange('B6').formulas=[[`=COUNTIF('核心人物'!$B$2:$B$${core.length+1},"皇帝")`]];
intro.getRange('B7').formulas=[[`=COUNTA('重要子嗣'!$C$2:$C$${children.length+1})`]];
intro.getRange('B8').formulas=[[`=COUNTIF('核心人物'!$B$2:$B$${core.length+1},"文臣")`]];
intro.getRange('B9').formulas=[[`=COUNTIF('核心人物'!$B$2:$B$${core.length+1},"武官")`]];
intro.getRange('D4:H4').merge();intro.getRange('D4').values=[['范围与读法']];intro.getRange('D4:H4').format=sectionFmt;
intro.getRange('D5:H10').merge();intro.getRange('D5').values=[['范围：北京明朝 1368—1644，共16帝；南明不单列，但生涯跨越1644的人物保留。\n子嗣：只保留继位、影响储位、参与政变/叛乱、具有独立文化贡献或卷入明亡的重要人物。\n纪年：皇帝任期按实际即位年，区别于次年改元。\n任期：官员采用“核心政治/军事活跃期”，不是把每一项官职逐年相加。\n缺失：待考/失载表示史料不足，不用传说或推算填补。']];intro.getRange('D5:H10').format={fill:colors.white,font:{color:colors.ink,fontSize:11},wrapText:true,verticalAlignment:'top',borders:{preset:'outside',style:'thin',color:colors.line}};
intro.getRange('A12:H12').merge();intro.getRange('A12').values=[['证据层级']];intro.getRange('A12:H12').format=sectionFmt;
intro.getRange('A13:H17').values=[['层级','用途','','例子','','','',''],['A','同时代或接近同时代材料','','《明实录》、诏令、奏疏','','','',''],['B','正史与制度史料','','《明史》本纪、列传、诸王世表、公主传','','','',''],['C','现代专业研究/博物馆','','故宫博物院、专业明史研究','','','',''],['D','结构化百科汇总','','用于查缺与导航，关键结论需回查A—C层','','','','']];
intro.getRange('B13:C17').merge(true);intro.getRange('D13:H17').merge(true);intro.getRange('A13:H13').format=headerFmt;intro.getRange('A14:H17').format=bodyFmt;intro.getRange('A13:H17').format.rowHeight=26;
intro.getRange('A19:H21').merge();intro.getRange('A19').values=[['关键限制：重要子嗣是研究型筛选，不等于完整谱系。建文帝子嗣、崇祯诸子与长平公主等人的姓名或结局存在史料冲突；低置信度记录只作线索。若研究宗室制度，应另建完整诸王、公主谱系。']];intro.getRange('A19:H21').format={fill:'#EFE4CE',font:{bold:true,color:colors.red,fontSize:11},wrapText:true,verticalAlignment:'center',borders:{left:{style:'thick',color:colors.red}}};
intro.getRange('A1:H21').format.font={name:'Songti SC'};intro.getRange('A:A').format.columnWidth=14;intro.getRange('B:B').format.columnWidth=16;intro.getRange('C:C').format.columnWidth=16;intro.getRange('D:H').format.columnWidth=18;intro.freezePanes.freezeRows(2);

// 核心人物
const ph=['序号','类别','姓名','别名/庙号','出生年','死亡年','寿命','关键职务','任期开始','任期结束','任期时长','家乡/籍贯','主要影响','主要评价','评分','置信度','备注','来源1','来源2'];
people.getRangeByIndexes(0,0,1,ph.length).values=[ph];
const pRows=coreSorted.map((p,i)=>[i+1,p.category,p.name,p.alt||'',typeof p.birth==='number'?p.birth:p.birth,typeof p.death==='number'?p.death:p.death,'',p.office,p.office_start,p.office_end,'',p.hometown,p.summary,p.evaluation,p.score,p.confidence,p.notes||'',p.source1,p.source2]);
people.getRangeByIndexes(1,0,pRows.length,ph.length).values=pRows;
people.getRange('G2').formulas=[['=IF(AND(ISNUMBER(E2),ISNUMBER(F2)),F2-E2,"")']];people.getRange(`G2:G${pRows.length+1}`).fillDown();
people.getRange('K2').formulas=[['=IF(C2="朱祁镇",21,IF(C2="朱常洛","约1月",IF(AND(ISNUMBER(I2),ISNUMBER(J2)),J2-I2,"")))']];people.getRange(`K2:K${pRows.length+1}`).fillDown();
people.getRange(`A1:S${pRows.length+1}`).format=bodyFmt;people.getRange('A1:S1').format=headerFmt;people.getRange('A1:S1').format.rowHeight=32;
people.getRange(`E2:K${pRows.length+1}`).format.horizontalAlignment='center';people.getRange(`O2:P${pRows.length+1}`).format.horizontalAlignment='center';
people.getRange(`O2:O${pRows.length+1}`).conditionalFormats.add('colorScale',{colors:['#B63B2B','#D6B86A','#4A7C5A'],thresholds:['min',{type:'percentile',value:50},'max']});
people.getRange(`P2:P${pRows.length+1}`).conditionalFormats.add('containsText',{text:'低',format:{fill:'#F4D8D1',font:{color:'#8C2E24',bold:true}}});
people.getRange(`A1:S${pRows.length+1}`).format.font={name:'Songti SC'};
people.tables.add(`A1:S${pRows.length+1}`,true,'MingCorePeople').style='TableStyleMedium2';people.freezePanes.freezeRows(1);people.freezePanes.freezeColumns(3);
const pWidths=[7,9,11,14,9,9,8,24,11,11,10,24,34,44,8,9,25,38,38];pWidths.forEach((w,i)=>people.getRangeByIndexes(0,i,pRows.length+1,1).format.columnWidth=w);

// 重要皇室子嗣
const kh=['父皇','序次','姓名','性别','出生年','死亡年','寿命','封爵/身份','入选原因','生母','主要影响','主要评价','评分','置信度','备注','正史依据','结构化来源'];
kids.getRangeByIndexes(0,0,1,kh.length).values=[kh];
const kRows=children.map(p=>[p.parent,p.order,p.name,p.sex,/^\d{3,4}$/.test(p.birth)?Number(p.birth):p.birth||'待考',/^\d{3,4}$/.test(p.death)?Number(p.death):p.death||'待考','',p.title,p.importance_reason,p.mother,p.summary,p.evaluation,p.score,p.confidence,p.notes,p.primary_source,p.source_url]);
kids.getRangeByIndexes(1,0,kRows.length,kh.length).values=kRows;
kids.getRange('G2').formulas=[['=IF(AND(ISNUMBER(E2),ISNUMBER(F2)),F2-E2,"")']];kids.getRange(`G2:G${kRows.length+1}`).fillDown();
kids.getRange(`A1:Q${kRows.length+1}`).format=bodyFmt;kids.getRange('A1:Q1').format=headerFmt;kids.getRange('A1:Q1').format.rowHeight=32;kids.getRange(`B2:G${kRows.length+1}`).format.horizontalAlignment='center';kids.getRange(`M2:N${kRows.length+1}`).format.horizontalAlignment='center';
kids.getRange(`M2:M${kRows.length+1}`).conditionalFormats.addCustom('=AND(ISNUMBER(M2),M2<60)',{fill:'#E9B3A7',font:{color:'#7B211B',bold:true}});
kids.getRange(`M2:M${kRows.length+1}`).conditionalFormats.addCustom('=AND(ISNUMBER(M2),M2>=60,M2<80)',{fill:'#E1C980',font:{color:'#654B12',bold:true}});
kids.getRange(`M2:M${kRows.length+1}`).conditionalFormats.addCustom('=AND(ISNUMBER(M2),M2>=80)',{fill:'#8FB092',font:{color:'#173C29',bold:true}});
kids.getRange(`N2:N${kRows.length+1}`).conditionalFormats.add('containsText',{text:'低',format:{fill:'#F4D8D1',font:{color:'#8C2E24',bold:true}}});
kids.getRange(`A1:Q${kRows.length+1}`).format.font={name:'Songti SC'};kids.tables.add(`A1:Q${kRows.length+1}`,true,'MingImportantChildren').style='TableStyleMedium4';kids.freezePanes.freezeRows(1);kids.freezePanes.freezeColumns(3);
const kWidths=[20,8,17,7,10,10,8,20,22,17,34,42,8,9,24,28,40];kWidths.forEach((w,i)=>kids.getRangeByIndexes(0,i,kRows.length+1,1).format.columnWidth=w);

// 皇帝速览
const ecore=core.filter(p=>p.category==='皇帝');const eh=['朝次','庙号/年号','姓名','出生','死亡','寿命','在位开始','在位结束','任期时长','家乡','评价摘要','评分','置信度','来源'];
emperors.getRangeByIndexes(0,0,1,eh.length).values=[eh];const eRows=ecore.map((p,i)=>[i+1,p.alt,p.name,p.birth,p.death,'',p.office_start,p.office_end,'',p.hometown,p.evaluation,p.score,p.confidence,p.source1]);emperors.getRangeByIndexes(1,0,eRows.length,eh.length).values=eRows;
emperors.getRange('F2').formulas=[['=IF(AND(ISNUMBER(D2),ISNUMBER(E2)),E2-D2,"")']];emperors.getRange(`F2:F${eRows.length+1}`).fillDown();emperors.getRange('I2').formulas=[['=IF(C2="朱祁镇",21,IF(C2="朱常洛","约1月",IF(AND(ISNUMBER(G2),ISNUMBER(H2)),H2-G2,"")))']];emperors.getRange(`I2:I${eRows.length+1}`).fillDown();
emperors.getRange(`A1:N${eRows.length+1}`).format=bodyFmt;emperors.getRange('A1:N1').format=headerFmt;emperors.getRange(`A1:N${eRows.length+1}`).format.font={name:'Songti SC'};emperors.getRange(`L2:L${eRows.length+1}`).conditionalFormats.add('colorScale',{colors:['#B63B2B','#D6B86A','#4A7C5A'],thresholds:['min',{type:'percentile',value:50},'max']});emperors.tables.add(`A1:N${eRows.length+1}`,true,'MingEmperors').style='TableStyleMedium2';emperors.freezePanes.freezeRows(1);const eWidths=[7,18,11,9,9,8,12,12,10,24,52,8,9,38];eWidths.forEach((w,i)=>emperors.getRangeByIndexes(0,i,eRows.length+1,1).format.columnWidth=w);

// 评分规则
rubric.getRange('A1:F2').merge();rubric.getRange('A1').values=[['综合历史评价量表｜研究用，不是道德榜']];rubric.getRange('A1:F2').format=titleFmt;
rubric.getRange('A4:F10').values=[['维度','权重','高分含义','低分含义','常见误区','备注'],['治国与制度','30%','建立可持续制度、改善行政','破坏决策与行政能力','把勤政等同于善治','皇帝与首辅权重最高'],['军事与危机','20%','战略正确、组织有效、损失可控','重大误判、组织失灵','只看胜负不看资源约束','文臣按职责适当折算'],['社会文化影响','20%','改善民生、知识与文化贡献','造成广泛压迫或倒退','以知名度代替影响','普通宗室通常无资料'],['长期遗产','20%','成果跨时期延续','留下结构性风险','以后世神话替代当时证据','需区分直接与间接因果'],['责任与代价','10%','承担责任、约束权力与成本','滥权、株连、失信、转嫁成本','只用传统忠奸标签','不是现代道德审判'],['综合分','100%','80+重要正面；60—79功过并存','<60重大失败或负面','机械比较不同角色','必须与置信度同读']];
rubric.getRange('A4:F4').format=headerFmt;rubric.getRange('A5:F10').format=bodyFmt;
rubric.getRange('A12:F12').merge();rubric.getRange('A12').values=[['置信度']];rubric.getRange('A12:F12').format=sectionFmt;rubric.getRange('A13:F16').values=[['等级','定义','使用方式','','',''],['高','生卒、任期和主流评价相对稳定','可作为专题研究起点','','',''],['中','存在重要细节或因果争议','必须打开来源继续核验','','',''],['低/未知','生平失载或材料冲突','只作线索，不应作确定结论','','','']];rubric.getRange('A13:F13').format=headerFmt;rubric.getRange('A14:F16').format=bodyFmt;
rubric.getRange('A18:F20').merge();rubric.getRange('A18').values=[['评分由本研究底表依据上述量表综合形成，不是某位史学家的原始打分。评价摘要吸收《明史》、制度史材料与现代研究中的主流争议；如要发表，必须回到具体专著、论文和原始史料逐条引用。']];rubric.getRange('A18:F20').format={fill:'#EFE4CE',font:{color:colors.red,bold:true,fontSize:11},wrapText:true,verticalAlignment:'center',borders:{left:{style:'thick',color:colors.red}}};
rubric.getRange('A1:F20').format.font={name:'Songti SC'};[18,12,30,30,32,28].forEach((w,i)=>rubric.getRangeByIndexes(0,i,20,1).format.columnWidth=w);rubric.freezePanes.freezeRows(2);

// Compact verification and previews.
console.log((await wb.inspect({kind:'table',range:'皇帝速览!A1:N17',include:'values,formulas',tableMaxRows:18,tableMaxCols:14,maxChars:5000})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',options:{useRegex:true,maxResults:100},summary:'formula error scan',maxChars:2000})).ndjson);
for (const [sheetName,range,file] of [['使用说明','A1:H21','intro'],['核心人物','A1:P18','core'],['重要子嗣','A1:Q18','children'],['皇帝速览','A1:N17','emperors'],['评分规则','A1:F20','rubric']]){
  const image=await wb.render({sheetName,range,scale:1,format:'png'});
  await fs.writeFile(`${outDir}/${file}.png`,new Uint8Array(await image.arrayBuffer()));
}
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(`${outDir}/明史人物研究底表_1368-1644.xlsx`);
console.log('workbook exported');
