const correctedSources = Object.freeze({
  '黄得功': {
    title: '《明史》卷268《黄得功传》',
    location: '清修正史传记；须与南明纪事互校',
    original: ['得功怒叱曰：“汝乃降乎！”'],
    url: 'https://zh.wikisource.org/zh-hans/明史/卷268',
  },
  '刘良佐': {
    title: '《明史》卷268《黄得功传》',
    location: '清修正史传记；涉及刘良佐降附须与其他材料互校',
    original: ['而刘良佐已先归命，大呼岸上招降。'],
    url: 'https://zh.wikisource.org/zh-hans/明史/卷268',
  },
  '刘泽清': {
    title: '《明史》卷273《刘泽清传》',
    location: '清修正史传记；褒贬与动机须和事件事实分开阅读',
    original: ['顺治二年四月，扬州告急，命泽清等往援。'],
    url: 'https://zh.wikisource.org/zh-hans/明史/卷273',
  },
});

const isConfidence = value => ['高', '中', '低', '未知'].includes(value);

const sceneTimeRepairs = Object.freeze({
  '阎应元': [
    ['1644年以前', '明·崇祯末年'],
    ['1645年闰六月', '明·弘光元年／清·顺治二年'],
    ['1645年七—八月', '明·弘光元年／清·顺治二年'],
    ['1645年八月', '明·弘光元年／清·顺治二年'],
  ],
  '黄道周': [
    ['1630—1642年', '明·崇祯三年至十五年'],
    ['1644—1645年', '明·弘光元年'],
    ['1645年', '明·隆武元年'],
    ['1645—1646年', '明·隆武元年至二年'],
  ],
  '朱聿鐭': [
    ['1645—1646年八月', '明·弘光元年—隆武二年'],
    ['1646年十一月', '明·隆武二年／绍武元年'],
    ['1646年十一—十二月', '绍武元年／永历元年将启'],
    ['1646年十二月', '绍武元年'],
  ],
});

/**
 * Repair a narrowly-scoped legacy field-shift in three newly added cards.
 * The prose itself was preserved, but evidence fields were written one column
 * out of place. This projection restores the evidence contract for rendered
 * pages without inventing facts or reclassifying any historical claim.
 */
export function repairPersonPages(personPages) {
  for (const [name, page] of Object.entries(personPages?.people || {})) {
    const source = correctedSources[name];
    for (const scene of page.scenes || []) {
      scene.title = String(scene.title || '')
        .replace(/：[^：]+：材料边界$/, '')
        .replace(/[：:](?:材料核验(?:证)?|材料边界)$/, '');
    }
    if (source) for (const scene of page.scenes || []) {
      if (scene.interpretationBoundary || isConfidence(scene.confidence)) continue;
      scene.interpretationBoundary = scene.confidence || '该阶段的动机、兵力与具体过程仍须按不同材料分别判断。';
      scene.confidence = isConfidence(scene.evidenceNote) ? scene.evidenceNote : '中';
      scene.evidenceNote = `${source.title}可核对本幕活动主干；具体兵数、现场细节与责任比例需另作互证。`;
      scene.primarySource = {
        ...source,
        original: [...source.original],
        reading: '用于确认本幕可核节点，并标明清修正史的叙事属性。',
        boundary: scene.interpretationBoundary,
        confidence: scene.confidence,
      };
    }
    for (const [index, [year, reignYears]] of (sceneTimeRepairs[name] || []).entries()) {
      const scene = page.scenes?.[index];
      if (scene && !/\d|待考/.test(scene.year || '')) {
        scene.year = year;
        scene.reignYears = reignYears;
      }
    }
  }
  return personPages;
}
