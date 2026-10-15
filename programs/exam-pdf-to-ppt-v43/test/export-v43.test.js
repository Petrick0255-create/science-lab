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
  const context = vm.createContext({...dependencies, console, Blob, Buffer, Uint8Array, ArrayBuffer, Promise, setImmediate, clearImmediate, setTimeout, clearTimeout});
  vm.runInContext(source.slice(source.indexOf('var Fo =')).replaceAll('import.meta.url', '"file:///bundle.js"')
    .replace(/ov\.createRoot\(document\.getElementById\("root"\)\)\.render\(at\.jsx\(My, \{\}\)\);\s*$/, '')
    + '\nglobalThis.api={plan:Ku,create:Ey' + (version === 43 ? ',finalize:applyTextBoxEditingOptions' : '') + '};', context);
  return context.api;
}
const before = await loadExport(42), after = await loadExport(43);
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=';
const doc={title:'v43 text box settings',questions:[
 {number:'1',sourcePage:1,blocks:[{kind:'text',text:'표는 물질의 특징이다.'},{kind:'table',rows:4,columns:2,cells:['물질','특징','A','지질에 속한다.','B','핵산에 속한다.','C','탄수화물에 속한다.'].map((text,i)=>({row:Math.floor(i/2),column:i%2,rowSpan:1,colSpan:1,text}))}],warnings:[]},
 {number:'6',sourcePage:1,blocks:[{kind:'text',text:'다음은 세포 분화에 대한 설명이다.'},{kind:'passage',text:'(가) 전체의 2/3에 해당한다.\n(나) 비율은 (분자)/(분모)이다.'},{kind:'statements',text:'ㄱ. <u>세포들</u>의 형태와 기능을 비교한다.\nㄴ. H<sub>2</sub>O와 x<sup>2</sup>를 표시한다.'},{kind:'condition',text:'(단, 비율은 1/2이다.)'}],warnings:[]},
 {number:'7',sourcePage:2,blocks:[{kind:'text',text:'<box>㉠</box> 기호와 <box>㉡</box> 기호를 비교한다.'}],images:[{id:'panels',data:pixel,width:600,height:200,captions:[{text:'(가)',center:.25},{text:'(나)',center:.75}]}],warnings:[]}
]};
async function slideXml(result) {
 const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());
 return Promise.all(Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).map(p=>zip.file(p).async('string')));
}
function checkBody(body) {
 const props=body.match(/<a:bodyPr\b[^>]*>[\s\S]*?<\/a:bodyPr>/)?.[0];
 assert.ok(props);
 for(const [name,value] of Object.entries({wrap:'square',lIns:'90000',rIns:'90000',tIns:'46800',bIns:'46800'})){
   assert.ok(props.includes(`${name}="${value}"`));
   assert.equal((props.match(new RegExp(`\\b${name}=`, 'g'))||[]).length,1);
 }
 assert.equal((props.match(/<a:spAutoFit\/>/g)||[]).length,1);
 assert.doesNotMatch(props,/<a:(?:noAutofit|normAutofit)\b/);
}

test('v43 applies all screenshot settings to text shapes and preserves native table cell layout and v42 content',async()=>{
 const options={numberFontSize:42,numberSuffix:true};
 for(const q of doc.questions)assert.equal(JSON.stringify(before.plan(q,options)),JSON.stringify(after.plan(q,options)));
 const oldResult=await before.create(doc,options),result=await after.create(doc,options);
 assert.equal(result.slideCount,oldResult.slideCount);
 const oldSlides=await slideXml(oldResult),slides=await slideXml(result);
 const normalize=xml=>xml.replace(/<p:txBody>[\s\S]*?<\/p:txBody>/g,body=>body.replace(/<a:bodyPr\b[^>]*(?:\/>|>[\s\S]*?<\/a:bodyPr>)/,'<a:bodyPr/>'))
   .replace(/<p:sp>[\s\S]*?<\/p:sp>/g,shape=>shape.includes('name="question-number"')?shape.replace(/(<a:ext\s+cx=")\d+/, '$1NUMBER_WIDTH'):shape);
 let shapes=0;
 slides.forEach((xml,i)=>{
   assert.equal(normalize(xml),normalize(oldSlides[i]));
   const numberShape=s=>(s.match(/<p:sp>[\s\S]*?<\/p:sp>/g)||[]).find(shape=>shape.includes('name="question-number"'));
   const width=s=>Number(numberShape(s).match(/<a:ext\s+cx="(\d+)"/)[1]);
   assert.ok(Math.abs(width(xml)-width(oldSlides[i])-180000)<=1, 'Question number retains its original content width after adding margins');
   assert.equal(after.finalize(xml),xml);
   for(const body of xml.match(/<p:txBody>[\s\S]*?<\/p:txBody>/g)||[]){checkBody(body);shapes++;}
   assert.deepEqual(xml.match(/<a:tc>[\s\S]*?<\/a:tc>/g),oldSlides[i].match(/<a:tc>[\s\S]*?<\/a:tc>/g));
   for(const p of xml.match(/<a:p>[\s\S]*?<\/a:p>/g)||[])assert.match(p,/latinLnBrk="1"/);
   for(const frac of xml.match(/<m:f>[\s\S]*?<\/m:f>/g)||[]){
     assert.equal((frac.match(/<m:nor\/>/g)||[]).length,2);
     for(const props of frac.match(/<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/g)||[]){assert.match(props,/sz="2400"/);assert.match(props,/typeface="210 M고딕 070"/);}
   }
 });
 assert.ok(shapes>=10);
 if(process.env.QA_V43_OUTPUT)fs.writeFileSync(process.env.QA_V43_OUTPUT,Buffer.from(await result.blob.arrayBuffer()));
});

test('v43 replaces prior fitting modes, preserves other text properties and respects XML child order',()=>{
 for(const props of ['<a:bodyPr/>','<a:bodyPr wrap="none" lIns="0" rIns="1" tIns="2" bIns="3" anchor="ctr"><a:noAutofit/></a:bodyPr>','<a:bodyPr rot="60000"><a:prstTxWarp prst="textNoShape"><a:avLst/></a:prstTxWarp><a:normAutofit fontScale="80000"/><a:scene3d/><a:extLst/></a:bodyPr>']){
   const xml=after.finalize('<p:txBody>'+props+'<a:lstStyle/><a:p/></p:txBody>');
   checkBody(xml);
   assert.equal(after.finalize(xml),xml);
   if(props.includes('anchor'))assert.match(xml,/anchor="ctr"/);
   if(props.includes('scene3d'))assert.match(xml,/<a:prstTxWarp[\s\S]*<a:spAutoFit\/><a:scene3d\/>/);
 }
 const cell='<a:txBody><a:bodyPr/><a:lstStyle/><a:p/></a:txBody>';
 assert.equal(after.finalize(cell),cell);
});
