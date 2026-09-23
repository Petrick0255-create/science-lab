import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import JSZip from 'jszip';
import { sampleExam } from './fixtures.js';
import { createPptxBlob } from '../src/pptx-client.js';

// Exercise the actual v21 distribution: it contains layout updates that predate
// this patch and are not present in the older modular source files.
const bundle = fs.readFileSync(new URL('../assets/index-v21.js', import.meta.url), 'utf8').replaceAll('import.meta.url', '"file:///test-bundle.js"');
const context = vm.createContext({ console, Blob, Buffer, Uint8Array, ArrayBuffer, Promise, setImmediate, clearImmediate, setTimeout, clearTimeout, TextEncoder, TextDecoder });
vm.runInContext(bundle.slice(bundle.indexOf('var Fo =')).replace(/ov\.createRoot\(document\.getElementById\("root"\)\)\.render\(at\.jsx\(My, \{\}\)\);\s*$/, '') + '\nglobalThis.outputApi = { plan: Ku, create: Ey };', context);

test('v21 and modular PPT outputs support optional 번 on all three styles at 42pt', async () => {
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
