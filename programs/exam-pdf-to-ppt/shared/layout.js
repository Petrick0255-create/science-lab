import { FONT, UserError } from './document.js';
import { wrapScientificText } from './scientific-text.js';
export const SLIDE = { width: 10, height: 7.5, background: '000000' };
const BODY = { x: .35, y: 1.02, w: 9.25, fontSize: 24, lineHeight: .44 };
const MAX_LINES = 13;

export function planQuestion(q, numberStyle = 'yellow28') {
  const paragraphs = [...q.blocks.map(b => b.text), ...q.choices].filter(Boolean);
  const pages = []; let lines = [];
  const flush = () => {
    while (lines.length && !lines.at(-1).length) lines.pop();
    if (lines.length) pages.push(lines);
    lines = [];
  };
  for (const paragraph of paragraphs) {
    const block = wrapScientificText(paragraph);
    if (lines.length && block.length <= MAX_LINES && lines.length + 1 + block.length > MAX_LINES) flush();
    if (lines.length && lines.length < MAX_LINES) lines.push([]);
    for (const line of block) { if (lines.length >= MAX_LINES) flush(); lines.push(line); }
  }
  flush();
  return pages.map((rows, page) => ({
    ...SLIDE, page: page + 1, pageCount: pages.length,
    number: { text: numberStyle === 'white40' ? `${q.number}번` : q.number,
      x: .12, y: .08, w: numberStyle === 'white40' ? 2.7 : 1.35, h: .85,
      fontSize: numberStyle === 'white40' ? 40 : 28,
      color: numberStyle === 'white40' ? 'FFFFFF' : 'FFFF00', fontFace: FONT },
    body: { ...BODY, h: rows.length * BODY.lineHeight + .12, lines: rows, fontFace: FONT, color: 'FFFFFF' },
    notes: [q.visual_note, ...(q.warnings || [])].filter(Boolean).join('\n'),
    sourcePage: q.sourcePage, questionNumber: q.number,
  }));
}
export function planDocument(doc, options) {
  const slides = doc.questions.flatMap(q => planQuestion(q, options.numberStyle));
  if (slides.length > 300) throw new UserError('생성 슬라이드가 300장을 초과합니다. 텍스트를 확인하세요.');
  return slides;
}
