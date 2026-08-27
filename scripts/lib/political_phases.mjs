import { MUSEUM_TIMELINE_SCOPE } from './museum_temporal_scope.mjs';

const VALID_REGIMES = new Set(['明', '弘光', '隆武', '永历', '鲁王监国', '大顺', '清', '遗民']);
const VALID_CONFIDENCE = new Set(['高', '中', '低', '未知']);

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

export const phasesForPerson = (phaseData, name) => phaseData?.people?.[name] || [];

export const validatePoliticalPhases = ({ roster, phaseData }) => {
  const errors = [];
  const registeredPeople = roster instanceof Set ? roster : new Set(roster || []);
  const people = phaseData?.people;
  const sourceCatalog = phaseData?.source_catalog;

  if (!people || typeof people !== 'object' || Array.isArray(people)) {
    return ['政治阶段数据缺少 people 对象'];
  }

  for (const [name, phases] of Object.entries(people)) {
    if (!registeredPeople.has(name)) errors.push(`${name}：政治阶段人物不在人物主表`);
    if (!Array.isArray(phases) || phases.length === 0) {
      errors.push(`${name}：政治阶段必须为非空数组`);
      continue;
    }

    for (const [index, phase] of phases.entries()) {
      const prefix = `${name} 第${index + 1}段`;
      if (!phase || typeof phase !== 'object' || Array.isArray(phase)) {
        errors.push(`${prefix}：政治阶段必须为对象`);
        continue;
      }
      if (!VALID_REGIMES.has(phase.regime)) errors.push(`${prefix}：未登记政权 ${phase.regime || '空值'}`);
      if (!isNonEmptyString(phase.role)) errors.push(`${prefix}：缺少 role`);
      if (!VALID_CONFIDENCE.has(phase.confidence)) errors.push(`${prefix}：置信度值无效：${phase.confidence || '空值'}`);
      if (!Array.isArray(phase.sourceIds) || phase.sourceIds.length === 0 || phase.sourceIds.some(sourceId => !isNonEmptyString(sourceId))) {
        errors.push(`${prefix}：缺少有效 sourceIds`);
      } else if (sourceCatalog && typeof sourceCatalog === 'object') {
        for (const sourceId of phase.sourceIds) {
          if (!sourceCatalog[sourceId]) errors.push(`${prefix}：未登记来源 ID ${sourceId}`);
        }
      }
      if (!Number.isInteger(phase.start) || !Number.isInteger(phase.end)) {
        errors.push(`${prefix}：年份必须为整数`);
      }
      if (Number.isInteger(phase.start) && Number.isInteger(phase.end) && phase.start > phase.end) {
        errors.push(`${prefix}：起止年份倒置`);
      }
      if (
        (Number.isInteger(phase.start) && (phase.start < MUSEUM_TIMELINE_SCOPE.start || phase.start > MUSEUM_TIMELINE_SCOPE.end))
        || (Number.isInteger(phase.end) && (phase.end < MUSEUM_TIMELINE_SCOPE.start || phase.end > MUSEUM_TIMELINE_SCOPE.end))
      ) {
        errors.push(`${prefix}：年份超出博物馆时间范围`);
      }
    }
  }

  return errors;
};
