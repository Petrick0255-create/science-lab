import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import JSZip from 'jszip';

async function loadExport(version) {
  const source = fs.readFileSync(new URL(`../assets/index-v${version}.js`, import.meta.url), 'utf8');
  const dependencies = {};
  for (const match of source.slice(0, source.indexOf('var Fo =')).matchAll(/import\s*\{[^}]+\}\s*from\s*["']([^"']+)["']/g)) {
    Object.assign(dependencies, await import(new URL('../assets/' + match[1], import.meta.url)));
  }
  const context = vm.createContext({ ...dependencies, console, Blob, Buffer, Uint8Array, ArrayBuffer, Promise, setImmediate, clearImmediate, setTimeout, clearTimeout });
  vm.runInContext(source.slice(source.indexOf('var Fo =')).replaceAll('import.meta.url', '"file:///bundle.js"')
    .replace(/ov\.createRoot\(document\.getElementById\("root"\)\)\.render\(at\.jsx\(My, \{\}\)\);\s*$/, '')
    + '\nglobalThis.api={plan:Ku,create:Ey' + (version === 42 ? ',finalize:allowKoreanWordSplitting' : '') + '};', context);
  return { ...context.api, ...dependencies };
}
const before = await loadExport(41), after = await loadExport(42);
const table = {kind:'table',rows:2,columns:2,cells:Array.from({length:4},(_,i)=>({row:Math.floor(i/2),column:i%2,rowSpan:1,colSpan:1,text:'표의 값 '+i}))};
const question = {number:'6',sourcePage:1,blocks:[
  {kind:'text',text:'다음은 세포 분화에 대한 설명이다. 세포마다 발현되는 유전자가 다르기 때문이다. '.repeat(3)},
  {kind:'passage',text:'(가) 하나의 수정란이 세포 분열과 분화를 거친다.\n(나) 세포의 형태와 기능에 차이가 생긴다.'},
  table,
  {kind:'statements',text:'ㄱ. <u>세포들</u>의 형태와 기능을 비교한다.\nㄴ. H<sub>2</sub>O와 x<sup>2</sup>를 표시한다.'},
  {kind:'condition',text:'(단, 돌연변이는 고려하지 않는다.)'}
],warnings:[]};
async function slides(result) {
  const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());
  return Promise.all(Object.keys(zip.files).filter(path=>/^ppt\/slides\/slide\d+\.xml$/.test(path)).map(path=>zip.file(path).async('string')));
}

test('v42 only enables the final word-splitting flag; plans, shapes, paragraphs and text stay unchanged',async()=>{
  const doc={title:'layout regression',questions:[question,{...question,number:'7',blocks:[{kind:'text',text:'<box>㉠</box> 기호와 본문이 함께 있다. '.repeat(4)}]}]};
  const options={numberFontSize:42,numberSuffix:true};
  for(const q of doc.questions) assert.equal(JSON.stringify(before.plan(q,options)),JSON.stringify(after.plan(q,options)));
  const oldResult=await before.create(doc,options),newResult=await after.create(doc,options);
  assert.equal(newResult.slideCount,oldResult.slideCount);
  const oldSlides=await slides(oldResult),newSlides=await slides(newResult);
  newSlides.forEach((xml,i)=>{
    assert.equal(xml.replace(/ latinLnBrk="1"/g,''),oldSlides[i]);
    for(const p of xml.match(/<a:p>[\s\S]*?<\/a:p>/g)||[]) assert.match(p,/^<a:p><a:pPr\b[^>]*latinLnBrk="1"/);
    assert.equal(after.finalize(xml),xml);
  });
});

test('v42 finalization overrides disabled flags and supports missing or empty paragraph properties',()=>{
  for(const p of ['<a:p><a:r><a:t>문장</a:t></a:r></a:p>','<a:p><a:pPr/><a:r><a:t>문장</a:t></a:r></a:p>','<a:p><a:pPr latinLnBrk="0" eaLnBrk="0" algn="just"><a:buNone/></a:pPr></a:p>']){
    const xml=after.finalize(p);
    assert.match(xml,/latinLnBrk="1"/);
    assert.equal((xml.match(/latinLnBrk=/g)||[]).length,1);
    assert.equal(after.finalize(xml),xml);
    if(p.includes('eaLnBrk'))assert.match(xml,/eaLnBrk="0"/);
  }
});

test('v42 fractions use Normal Text, M Gothic 070 and 24pt in prose, tables and 18pt conditions',async()=>{
  const q={...question,blocks:[
    {kind:'text',text:'다음은 세포 분화에 대한 설명이다.'},
    {kind:'passage',text:'(가) 전체의 2/3에 해당한다.\n(나) 비율은 (분자)/(분모)이며 1/299,792,458과 비교한다.'},
    {...table,cells:table.cells.map((c,i)=>({...c,text:i===0?'(수정란 수)/(개체 수)':i===1?'3/4':c.text}))},
    {kind:'condition',text:'(단, 비율은 1/2이다.)'}
  ]};
  const result=await after.create({title:'v42 fraction check',questions:[q]},{numberFontSize:42,numberSuffix:true});
  const xml=(await slides(result)).join('');
  const fractions=xml.match(/<m:f>[\s\S]*?<\/m:f>/g)||[];
  assert.equal(fractions.length,6);
  for(const fraction of fractions){
    assert.equal((fraction.match(/<m:nor\/>/g)||[]).length,2);
    assert.doesNotMatch(fraction,/Cambria|<m:sty/);
    const props=fraction.match(/<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/g)||[];
    assert.equal(props.length,3);
    for(const p of props){
      assert.match(p,/sz="2400"/);assert.match(p,/i="0"/);
      for(const tag of ['latin','ea','cs'])assert.ok(p.includes(`<a:${tag} typeface="210 M고딕 070"/>`));
    }
  }
  assert.match(xml,/<a:rPr[^>]*sz="1800"[^>]*>[\s\S]*?<a:t>\(단, 비율은 /);
  if(process.env.QA_V42_OUTPUT)fs.writeFileSync(process.env.QA_V42_OUTPUT,Buffer.from(await result.blob.arrayBuffer()));
});

test('v42 fraction formatting preserves surrounding run styling and supports self-closing properties',()=>{
  const props='<a:rPr sz="1800" i="1" u="sng"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:latin typeface="Other"/></a:rPr>';
  const xml=after.applyFractionMath('<a:r>'+props+'<a:t>앞 2/3 뒤</a:t></a:r>');
  assert.ok(xml.startsWith('<a:r>'+props+'<a:t>앞 </a:t></a:r>'));
  assert.ok(xml.endsWith('<a:r>'+props+'<a:t> 뒤</a:t></a:r>'));
  assert.match(xml,/<m:r>[\s\S]*u="sng"[\s\S]*val="FF0000"/);
  assert.equal(after.applyFractionMath(xml),xml);
  assert.match(after.applyFractionMath('<a:r><a:rPr sz="1800"/><a:t>2/3</a:t></a:r>'),/<a:rPr sz="2400" i="0">/);
});
