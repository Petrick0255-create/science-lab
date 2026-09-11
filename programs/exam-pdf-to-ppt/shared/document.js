export const FONT = '210 M고딕 070';
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const BLOCK_KINDS = ['text', 'passage', 'statements', 'question', 'table'];
export const BLOCK_LABELS = { text: '본문', passage: '자료·제시문', statements: 'ㄱ·ㄴ·ㄷ 보기', question: '질문 문장', table: '표 안의 텍스트' };

export class UserError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function text(value, name, limit, fallback) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || value.length > limit) throw new UserError(`${name}: 문자열 형식과 길이를 확인하세요.`);
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\r\n?/g, '\n').trim();
}
function strings(value, name, count, length) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > count) throw new UserError(`${name} 형식이 올바르지 않습니다.`);
  return value.map(v => text(v, name, length));
}
export function validateDocument(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.questions)) throw new UserError('문항 데이터 형식이 올바르지 않습니다.');
  if (!input.questions.length || input.questions.length > 50) throw new UserError('분석된 문항 수를 확인하세요.');
  if (![20, 25].includes(input.expectedCount)) throw new UserError('20문항 또는 25문항을 선택하세요.');
  const questions = input.questions.map((q, index) => {
    if (!q || typeof q !== 'object') throw new UserError(`${index + 1}번째 문항을 확인하세요.`);
    const number = text(q.number, '문항 번호', 4);
    if (!/^\d{1,3}$/.test(number)) throw new UserError('문항 번호는 숫자여야 합니다.');
    if (!Number.isInteger(q.sourcePage) || q.sourcePage < 1 || q.sourcePage > 1000) throw new UserError(`${number}번의 원본 쪽수를 확인하세요.`);
    if (!Array.isArray(q.blocks) || q.blocks.length > 100) throw new UserError(`${number}번의 본문 형식을 확인하세요.`);
    const blocks = q.blocks.map(b => {
      if (!b || !BLOCK_KINDS.includes(b.kind)) throw new UserError(`${number}번의 텍스트 종류를 확인하세요.`);
      return { kind: b.kind, text: text(b.text, '본문', 20000) };
    }).filter(b => b.text);
    const choices = strings(q.choices, '선택지', 10, 5000).filter(Boolean);
    if (!blocks.length && !choices.length) throw new UserError(`${number}번의 내용이 비어 있습니다.`);
    return { number, sourcePage: q.sourcePage, blocks, choices,
      visual_note: text(q.visual_note, '그림 확인 메모', 2000, ''), warnings: strings(q.warnings, '검토 메모', 30, 1000) };
  });
  const doc = { title: text(input.title, '제목', 200, '모의고사') || '모의고사', expectedCount: input.expectedCount,
    questions, warnings: strings(input.warnings, '전체 검토 메모', 100, 1000) };
  if (JSON.stringify(doc).length > 300000) throw new UserError('데이터가 너무 큽니다. 문항별 텍스트를 확인하세요.');
  return doc;
}
export function coverage(doc) {
  const counts = new Map();
  for (const q of doc.questions) counts.set(Number(q.number), (counts.get(Number(q.number)) || 0) + 1);
  const missing = Array.from({ length: doc.expectedCount }, (_, i) => i + 1).filter(n => !counts.has(n));
  const duplicate = [...counts].filter(([, n]) => n > 1).map(([n]) => n);
  const extra = [...counts.keys()].filter(n => n < 1 || n > doc.expectedCount || !Number.isInteger(n));
  return { missing, duplicate, extra, complete: !missing.length && !duplicate.length && !extra.length && doc.questions.length === doc.expectedCount };
}
export function validateOptions(input = {}) {
  const numberStyle = input.numberStyle ?? 'yellow28';
  if (!['yellow28', 'white40'].includes(numberStyle)) throw new UserError('번호 스타일을 확인하세요.');
  return { numberStyle };
}
