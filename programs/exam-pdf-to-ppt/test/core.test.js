import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { parseScientificText, wrapScientificText } from '../shared/scientific-text.js';
import { coverage, FONT, validateDocument } from '../shared/document.js';
import { planQuestion } from '../shared/layout.js';
import { createPptx } from '../server/pptx.js';
import { parseExtraction } from '../server/gemini.js';
import { sampleExam, sampleQuestion } from './fixtures.js';

test('native superscripts, subscripts, unicode and underline preserve meaning', () => {
  const runs = parseScientificText('H<sub>2</sub>O + SO₄²⁻ + <u>x<sup>2</sup></u>');
  assert.equal(runs.map(r => r.text).join(''), 'H2O + SO42- + x2');
  assert.ok(runs.some(r => r.script === 'sub' && r.text === '4'));
  assert.ok(runs.some(r => r.script === 'sup' && r.text === '2-'));
  assert.ok(runs.some(r => r.script === 'sup' && r.underline));
  assert.equal(parseScientificText('a < b & c > d')[0].text, 'a < b & c > d');
  assert.throws(() => parseScientificText('H<sub>2'), /닫히지/);
  assert.throws(() => parseScientificText('<sup><sub>2</sub></sup>'), /겹쳐/);
});
test('20/25 exams reject missing, duplicate and out-of-range numbers', () => {
  for (const n of [20, 25]) assert.equal(coverage(validateDocument(sampleExam(n))).complete, true);
  const doc = sampleExam(); doc.questions.pop(); doc.questions[1].number = '1'; doc.questions[2].number = '99';
  assert.deepEqual(coverage(doc).missing, [2, 3, 25]);
  assert.deepEqual(coverage(doc).duplicate, [1]); assert.deepEqual(coverage(doc).extra, [99]);
});
test('long content paginates without deleting text or losing script', () => {
  const q = { ...sampleQuestion, blocks: [{ kind: 'text', text: '가나다 x<sup>2</sup> '.repeat(300) }], choices: [] };
  const plans = planQuestion(q);
  assert.ok(plans.length > 1);
  const actual = plans.flatMap(p => p.body.lines.flat().map(r => r.text)).join('');
  assert.equal(actual, parseScientificText(q.blocks[0].text).map(r => r.text).join(''));
  assert.ok(plans.every(p => p.body.fontSize === 24 && p.body.y + p.body.h <= 7.5));
  assert.ok(wrapScientificText('x<sup>2</sup>').flat().some(r => r.script === 'sup'));
});
test('PPTX contains the requested font, separate number and real baseline runs', async () => {
  for (const numberStyle of ['yellow28', 'white40']) {
    const { buffer, slideCount } = await createPptx(sampleExam(20), { numberStyle });
    const zip = await JSZip.loadAsync(buffer);
    const files = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    assert.equal(files.length, slideCount);
    const xml = await zip.file('ppt/slides/slide1.xml').async('string');
    assert.ok(xml.includes(FONT));
    assert.match(xml, /name="question-number"/);
    assert.match(xml, /sz="2400"/);
    assert.match(xml, numberStyle === 'yellow28' ? /sz="2800"/ : /sz="4000"/);
    assert.match(xml, numberStyle === 'yellow28' ? /val="FFFF00"/ : /val="FFFFFF"/);
    assert.match(xml, /baseline="[1-9]\d*"/); assert.match(xml, /baseline="-\d+"/);
    assert.match(xml, /u="sng"/);
    assert.doesNotMatch(xml, /<a:normAutofit|<a:spAutoFit/);
    assert.doesNotMatch(xml, /&lt;\/?(?:sup|sub)&gt;/);
    const presentation = await zip.file('ppt/presentation.xml').async('string');
    assert.match(presentation, /cx="9144000" cy="6858000"/);
  }
});
test('truncated Gemini output is not silently accepted', () => {
  assert.throws(() => parseExtraction({ candidates: [{ finishReason: 'MAX_TOKENS' }] }, 25), /한도/);
  assert.throws(() => parseExtraction({ candidates: [{ finishReason: 'STOP' }], text: '{' }, 25), /완전하지/);
  const result = parseExtraction({ candidates: [{ finishReason: 'STOP' }], text: JSON.stringify(sampleExam()) }, 25);
  assert.equal(result.questions.length, 25);
});
