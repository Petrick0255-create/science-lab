import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import JSZip from 'jszip';
import {normalizeBox,invertPixels,parseFigureResponse,withFigures} from '../assets/image-tools.js';
import {sampleExam} from './fixtures.js';
function api(version) {
 const source=fs.readFileSync(new URL(`../assets/index-${version}.js`,import.meta.url),'utf8');
 const context=vm.createContext({withFigures,Blob,Buffer,Uint8Array,ArrayBuffer,Promise,setImmediate,clearImmediate,setTimeout,clearTimeout,console});
 vm.runInContext(source.slice(source.indexOf('var Fo =')).replaceAll('import.meta.url','"file:///bundle.js"').replace(/ov\.createRoot\(document\.getElementById\("root"\)\)\.render\(at\.jsx\(My, \{\}\)\);\s*$/,'')+'\nglobalThis.api={plan:Ku,create:Ey,prompt:Tv,parse:_v,validate:Fu,request:Rv};',context);
 return context.api;
}
const old=api('v22'),current=api('v23');
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=';
const image={id:'test',label:'구리 정육면체',data:pixel,width:200,height:160};
test('v23 leaves the transcription prompt, parser, validator and request unchanged',()=>{
 assert.equal(current.prompt,old.prompt);
 for(const key of ['parse','validate','request'])assert.equal(current[key].toString(),old[key].toString());
 const q=sampleExam(20).questions[0];
 assert.equal(JSON.stringify(current.plan(q)),JSON.stringify(old.plan(q)));
});
test('image coordinates reject reversed or empty boxes and clamp margins',()=>{
 assert.deepEqual(normalizeBox([-2,30,900,1100]),[0,30,900,1000]);
 for(const box of [[100,100,90,200],[0,0,0,2],[NaN,1,2,3],[]])assert.throws(()=>normalizeBox(box));
});
test('inversion is exact, reversible, and preserves alpha',()=>{
 const values=new Uint8ClampedArray([255,255,255,255,0,10,100,130]);
 invertPixels(values);assert.deepEqual([...values],[0,0,0,255,255,245,155,130]);
 invertPixels(values);assert.deepEqual([...values],[255,255,255,255,0,10,100,130]);
});
test('detection validates page numbers and matches padded question numbers',()=>{
 const payload={output_text:JSON.stringify({figures:[{question:'3',page:1,box:[230,790,290,880],label:'구리'},{question:'4',page:99,box:[0,0,100,100]},{question:'999',page:1,box:[0,0,100,100]}]})};
 const parsed=parseFigureResponse(payload,[{number:'03'},{number:'4'}],6);
 assert.equal(parsed.figures[0].question,'03');assert.equal(parsed.skipped,2);
});
test('figures fill unused space or continue on new slides without altering text',()=>{
 const q=sampleExam(20).questions[0],before=current.plan(q),after=current.plan({...q,images:Array.from({length:7},(_,i)=>({...image,id:String(i)}))});
 assert.equal(after.flatMap(p=>p.images||[]).length,7);
 assert.equal(JSON.stringify(after[0].body),JSON.stringify(before[0].body));
 for(const p of after)for(const pic of p.images||[]) {
   assert.ok(pic.x>=0&&pic.y>=0&&pic.x+pic.w<=10&&pic.y+pic.h<=7.5);
   for(const group of p.body.groups)assert.ok(pic.y+pic.h<=group.y||pic.y>=group.y+group.h);
 }
 assert.equal(current.plan({...q,images:[{...image,enabled:false}]}).length,before.length);
});
test('PPT contains actual embedded images and keeps existing text',async()=>{
 const doc=sampleExam(20);doc.questions[0].images=[image];
 const {blob}=await current.create(doc,{}),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 assert.ok(Object.keys(zip.files).some(n=>n.startsWith('ppt/media/')&&!zip.files[n].dir));
 const xml=await zip.file('ppt/slides/slide1.xml').async('string');
 assert.match(xml,/<p:pic>/);assert.match(xml,/question-number/);assert.match(xml,/question-block-1-/);
});
