import { members, music, dances, risks } from './catalog.mjs';
const str = { type: 'string' };
const integer = (min, max) => ({ type: 'integer', minimum: min, maximum: max });
const en = values => ({ type: 'string', enum: values });
const arr = (items, minItems = 0, maxItems = 100) => ({ type: 'array', items, minItems, maxItems });
const obj = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const planSchema = obj({ music: en(music.map(m => m.id)), dance: en(dances), risk: en(risks),
  leads: arr(en(members.map(m => m.id)), 5, 5), practice: arr(integer(1, 8), 5, 5), direction: str });
export function schemaFor(kind) {
  const base = { agentId: str, text: str };
  if (kind === 'proposal' || kind === 'discussion') return obj({ ...base, plan: planSchema, sourceRefs: arr(str, 0, 3), memoryRefs: arr(str, 0, 10) });
  if (kind === 'vote') return obj({ ...base, approve: { type: 'boolean' }, planHash: str });
  if (kind === 'performance') return obj({ ...base, focus: en(['breath', 'rhythm', 'expression']), intensity: integer(1, 3) });
  if (kind === 'reflection') return obj({ ...base, eventRef: str, condition: str, action: str, expectedEffect: str });
  if (kind === 'judge') return obj({ ...base, scores: arr(obj({ teamId: str, evidenceHash: str,
    criteria: arr(integer(0, 20), 5, 5), reason: str }), 2, 20) });
  throw new Error('지원하지 않는 에이전트 작업');
}
export function validate(schema, value, path = 'response') {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: 객체가 필요합니다`);
    for (const key of schema.required) if (!(key in value)) throw new Error(`${path}.${key}: 필수 값 누락`);
    for (const key of Object.keys(value)) {
      if (!schema.properties[key]) throw new Error(`${path}.${key}: 허용되지 않은 값`);
      validate(schema.properties[key], value[key], `${path}.${key}`);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length < schema.minItems || value.length > schema.maxItems) throw new Error(`${path}: 배열 길이 오류`);
    value.forEach((v, i) => validate(schema.items, v, `${path}[${i}]`));
  } else if (schema.type === 'integer') {
    if (!Number.isInteger(value) || value < schema.minimum || value > schema.maximum) throw new Error(`${path}: 정수 범위 오류`);
  } else if (typeof value !== schema.type) throw new Error(`${path}: 자료형 오류`);
  if (schema.type === 'string' && value.length > 2000) throw new Error(`${path}: 너무 긴 문자열`);
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path}: 허용 목록 오류`);
  return value;
}
