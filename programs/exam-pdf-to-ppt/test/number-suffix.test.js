import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import JSZip from 'jszip';
import { sampleExam } from './fixtures.js';
import { createPptxBlob } from '../src/pptx-client.js';

// Exercise the actual v22 distribution: it contains layout updates that predate
// this patch and are not present in the older modular source files.
const bundle = fs.readFileSync(new URL('../assets/index-v22.js', import.meta.url), 'utf8').replaceAll('import.meta.url', '"file:///test-bundle.js"');
const context = vm.createContext({ console, Blob, Buffer, Uint8Array, ArrayBuffer, Promise, setImmediate, clearImmediate, setTimeout, clearTimeout, TextEncoder, TextDecoder });
vm.runInContext(bundle.slice(bundle.indexOf('var Fo =')).replace(/ov\.createRoot\(document\.getElementById\("root"\)\)\.render\(at\.jsx\(My, \{\}\)\);\s*$/, '') + '\nglobalThis.outputApi = { plan: Ku, create: Ey };', context);

test('v22 aligns number and first-line baselines at every available size and style', () => {
  const q = sampleExam(20).questions[0];
  for (const numberStyle of ['yellow28', 'white2', 'white3']) {
    for (const numberSuffix of [false, true]) {
      for (let numberFontSize = 20; numberFontSize <= 48; numberFontSize += 2) {
        const plan = context.outputApi.plan(q, { numberStyle, numberSuffix, numberFontSize })[0];
        const first = plan.body.groups[0];
        // Without a browser the documented fallback ascent is 1em and
        // the CSS baseline is 0.95em (line-height 1.15, descent 0.25).
        assert.ok(Math.abs(plan.number.y + numberFontSize / 72 - (first.y + 24 / 72)) < 1e-9);
        assert.ok(Math.abs(plan.number.previewY + numberFontSize * .95 / 72 - (first.y + 24 * .95 / 72)) < 1e-9);
        assert.ok(first.firstLineIndent > 0);
        assert.ok(plan.number.y >= 0 && first.y >= 0);
      }
    }
  }
});

test('v22 PPT stores the corrected vertical coordinates', async () => {
  const doc = sampleExam(20), options = { numberStyle: 'white2', numberSuffix: true, numberFontSize: 48 };
  const plan = context.outputApi.plan(doc.questions[0], options)[0];
  const { blob } = await context.outputApi.create(doc, options);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('ppt/slides/slide1.xml').async('string');
  const shapes = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g);
  const number = shapes.find(s => s.includes('name="question-number"'));
  const body = shapes.find(s => s.includes('name="question-block-1-'));
  assert.ok(number.includes(`y="${Math.round(plan.number.y * 914400)}"`));
  assert.ok(body.includes(`y="${Math.round(plan.body.groups[0].y * 914400)}"`));
});

test('v22 and modular PPT outputs support optional 번 on all three styles at 42pt', async () => {
  for (const numberStyle of ['yellow28', 'white2', 'white3']) {
    for (const numberSuffix of [undefined, false, true]) {
      const options = { numberStyle, numberFontSize: 42, numberSuffix };
      const expected = (numberStyle === 'white3' ? '001' : '01') + (numberSuffix ? '번' : '');
      const doc = sampleExam(20);
      const plan = context.outputApi.plan(doc.questions[0], options)[0];
      assert.equal(plan.number.text, expected);
      assert.equal(plan.number.fontSize, 42);
      assert.equal(plan.number.color, numberStyle === 'yellow28' ? 'FFFF00' : 'FFFFFF');
      const without = context.outputApi.plan(doc.questions[0], { ...options, numberSuffix: false })[0];
      if (numberSuffix) assert.ok(plan.number.w > without.number.w);
      for (const create of [context.outputApi.create, createPptxBlob]) {
        const { blob } = await create(doc, options);
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const xml = await zip.file('ppt/slides/slide1.xml').async('string');
        assert.ok(xml.includes(`<a:t>${expected}</a:t>`));
        assert.match(xml, /sz="4200"/);
      }
    }
  }
});
