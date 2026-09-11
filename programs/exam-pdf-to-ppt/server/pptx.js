import pptxgen from 'pptxgenjs';
import { FONT } from '../shared/document.js';
import { planDocument, SLIDE } from '../shared/layout.js';

export async function createPptx(doc, options) {
  const plans = planDocument(doc, options);
  const ppt = new pptxgen();
  ppt.defineLayout({ name: 'BBH_4X3', width: SLIDE.width, height: SLIDE.height });
  ppt.layout = 'BBH_4X3'; ppt.author = 'BBH COMPANY'; ppt.title = doc.title;
  ppt.subject = '편집 가능한 문항별 텍스트'; ppt.lang = 'ko-KR';
  ppt.theme = { headFontFace: FONT, bodyFontFace: FONT, lang: 'ko-KR' };
  for (const plan of plans) {
    const slide = ppt.addSlide(); slide.background = { color: SLIDE.background };
    const base = { fontFace: FONT, lang: 'ko-KR', margin: 0, valign: 'top', bold: false,
      paraSpaceAfterPt: 0, paraSpaceBeforePt: 0 };
    slide.addText(plan.number.text, { ...base, ...plan.number, objectName: 'question-number' });
    // One text box per visual line guarantees no auto-shrink or paragraph metric drift.
    plan.body.lines.forEach((line, i) => {
      if (!line.length) return;
      const runs = line.map(r => ({ text: r.text, options: {
        fontFace: FONT, fontSize: r.script === 'normal' ? 24 : 18,
        superscript: r.script === 'sup', subscript: r.script === 'sub', underline: r.underline ? { style: 'sng' } : undefined,
      } }));
      slide.addText(runs, { ...base, x: plan.body.x, y: plan.body.y + i * plan.body.lineHeight,
        w: plan.body.w, h: .44, fontSize: 24, color: 'FFFFFF', objectName: `question-body-${i + 1}` });
    });
    slide.addNotes(`원본 PDF ${plan.sourcePage}쪽 · ${plan.questionNumber}번 · ${plan.page}/${plan.pageCount}\n${plan.notes}`);
  }
  return { buffer: await ppt.write({ outputType: 'nodebuffer', compression: true }), slideCount: plans.length };
}
