import {placeCaptions,separateCaptions} from "../assets/figure-captions-v41.js";
import {parseBoxRuns,wrapBoxRuns,addBoxedText,BoxedGroup,boxedSymbolEvidence} from "../assets/inline-boxes-v41.js";
import {removeViewHeading,repairScientificTags,normalizeListMarkers} from "../assets/text-style-v41.js";
import {storePictureOriginals,brightenPixels,fractionColorRuns,applyFractionMath,fractionView,applyPictureBrightness,pictureBrightnessFilter} from "../assets/fraction-style-v41.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import JSZip from 'jszip';
import {applyFormatting,pageUnderlines,cellFraction} from '../assets/pdf-format-v41.js';
import {classifySymbol} from '../assets/pdf-symbols-v41.js';
import {assignBoxes} from '../assets/pdf-figures-v41.js';
import {tableHeight,pptRows,promptBeforeTables} from '../assets/native-tables-v41.js';
import {withFigures} from '../assets/image-tools-v41.js';
const source=fs.readFileSync(new URL('../assets/index-v41.js',import.meta.url),'utf8');
const ctx=vm.createContext({removeViewHeading,placeCaptions,parseBoxRuns,wrapBoxRuns,addBoxedText,BoxedGroup,repairScientificTags,normalizeListMarkers,storePictureOriginals,brightenPixels,fractionColorRuns,applyFractionMath,fractionView,applyPictureBrightness,pictureBrightnessFilter,tableHeight,pptRows,promptBeforeTables,withFigures,Blob,Buffer,Uint8Array,ArrayBuffer,Promise,setImmediate,clearImmediate,setTimeout,clearTimeout,console});
vm.runInContext(source.slice(source.indexOf('var Fo =')).replaceAll('import.meta.url','"file:///bundle.js"').replace(/ov\.createRoot\(document\.getElementById\("root"\)\)\.render\(at\.jsx\(My, \{\}\)\);\s*$/,'')+'\nglobalThis.api={plan:Ku,create:Ey};',ctx);
const table={kind:'table',rows:5,columns:2,cells:Array.from({length:10},(_,i)=>({row:Math.floor(i/2),column:i%2,rowSpan:1,colSpan:1,text:'셀 '+i}))};
test('underlines preserve body and native cell text and are idempotent',()=>{
 const doc={questions:[{number:'8',blocks:[{kind:'text',text:'㉠ 길이를 측정한다.'},{...table,cells:[{...table.cells[0],text:'수집한 데이터'}]}]}]};
 const evidence=[{question:'8',text:'길이',before:'㉠ ',after:'를'},{question:'8',text:'수집한 데이터',before:'',after:''}];
 const result=applyFormatting(doc,evidence);
 assert.equal(result.questions[0].blocks[0].text,'㉠ <u>길이</u>를 측정한다.');
 assert.equal(result.questions[0].blocks[1].cells[0].text,'<u>수집한 데이터</u>');
 assert.deepEqual(applyFormatting(result,evidence),result);
 assert.equal(doc.questions[0].blocks[0].text,'㉠ 길이를 측정한다.');
});
test('source symbol evidence corrects inline symbols without replacing ordinary text',()=>{
 const doc={questions:[{number:'8',blocks:[{kind:'text',text:'것이다. ◯, ◒, △는 각각 원소이다.'},{kind:'statements',text:'ㄱ. △는 이온이다.'}]}]};
 const out=applyFormatting(doc,[{type:'symbols',question:'8',before:'것이다.',after:'는',symbols:'○, ■, ▲'},{type:'symbols',question:'8',before:'ㄱ.',after:'는',symbols:'○'}]);
 assert.match(out.questions[0].blocks[0].text,/○, ■, ▲/);assert.match(out.questions[0].blocks[1].text,/○는/);
});
const v={width:600,height:800,convertToViewportPoint:(x,y)=>[x,y]};
const item=(str,x,y,w=30,h=12)=>({str,width:w,height:h,fontName:'f',transform:[h,0,0,h,x,y]});
const OPS={constructPath:91,stroke:20};
const ops=boxes=>({fnArray:boxes.map(()=>91),argsArray:boxes.map(b=>[20,[],[b[1],b[0],b[3],b[2]]])});
test('underline rules exclude fractions and connected table borders',()=>{
 const items=[item('8.',20,30),item('길이',60,100),item('분자',150,100),item('분모',150,114),item('경계',250,100)];
 const shapes=[[102,60,102.2,90],[102,145,102.2,185],[102,245,102.2,290],[80,245,110,245.2]];
 assert.deepEqual(pageUnderlines(ops(shapes),OPS,items,v,[{number:'8'}]).map(e=>e.text),['길이']);
 const fraction=cellFraction({sourceBox:[80/800*1000,130/600*1000,130/800*1000,200/600*1000]},shapes,items,v);
 assert.deepEqual(fraction,{numerator:'분자',denominator:'분모'});
});
test('circled inline blank is excluded while a separate diagram remains',()=>{
 const vp={...v,convertToViewportPoint:(x,y)=>[x,800-y]},t=(s,x,top,w)=>item(s,x,800-top-12,w);
 const result=assignBoxes([[100,60,116,160],[150,70,230,170]],[t('8.',20,20,15),t('㉠',105,101,12)],vp,[{number:'8'}],1);
 assert.equal(result.length,1);assert.ok(result[0].box[0]>150);
});
test('symbol classifier distinguishes circle square and triangle pixels',()=>{
 for(const [expected,inside] of [['○',(x,y)=>(x-30)**2+(y-30)**2<=25**2],['■',(x,y)=>x>=5&&x<=55&&y>=5&&y<=55],['▲',(x,y)=>y>=5&&y<=55&&Math.abs(x-30)<=(y-5)/2]]){
  const data=new Uint8ClampedArray(60*60*4).fill(255);for(let y=0;y<60;y++)for(let x=0;x<60;x++)if(inside(x,y))data.fill(0,(y*60+x)*4,(y*60+x)*4+3);
  assert.equal(classifySymbol(data,60,60),expected);
 }
});
test('long body and multiple tables paginate without overlap or missing cells',()=>{
 const q={number:'8',blocks:[{kind:'text',text:'긴 본문을 모두 유지합니다. '.repeat(30)},table,table,table,{kind:'statements',text:'ㄱ. 첫 번째 보기이다.\nㄴ. 두 번째 보기이다.'}],warnings:[]};
 const pages=ctx.api.plan(q,{numberFontSize:48});assert.ok(pages.length>=3);
 assert.equal(pages.flatMap(p=>p.body.groups).filter(g=>g.kind==='table').length,3);
 for(const p of pages){let bottom=p.body.y;for(const g of p.body.groups){assert.ok(g.y>=bottom-1e-8);assert.ok(g.y+g.h<=7.35);bottom=g.y+g.h;}if(p.body.groups[0]?.kind==='table')assert.ok(p.body.groups[0].y>=p.number.y+48/72);}
});
test('PPT contains native underline runs in both prose and real table cells',async()=>{
 const doc={title:'format test',questions:[{number:'8',blocks:[{kind:'text',text:'<u>길이</u>를 측정한다.'},{...table,cells:table.cells.map((c,i)=>({...c,text:i===0?'<u>표 밑줄</u>':c.text}))}],warnings:[]}]};
 const {blob}=await ctx.api.create(doc,{}),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const xml=(await Promise.all(Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).map(p=>zip.file(p).async('string')))).join('');
 assert.match(xml,/<a:tbl>/);assert.ok((xml.match(/u="sng"/g)||[]).length>=2);assert.match(xml,/w="28575"/);
});



test('v41 reserves prompt positions before misplaced or oversized tables',()=>{
 const first={kind:'text',text:'표는 실험 결과이다.'},second={kind:'passage',text:'조건을 확인하고 자료를 해석한다.'},statements={kind:'statements',text:'ㄱ. 자료는 일정하다.'};
 const baseline=ctx.api.plan({number:'3',blocks:[first,second,statements],warnings:[]})[0].body.groups.filter(g=>['text','passage'].includes(g.kind));
 for(const blocks of [[table,first,second,statements],[first,table,second,table,statements],[{...table,rows:13},first,second,statements]]){
  const pages=ctx.api.plan({number:'3',blocks,warnings:[]}),prompt=pages[0].body.groups.filter(g=>['text','passage'].includes(g.kind));
  assert.equal(JSON.stringify(prompt),JSON.stringify(baseline));
  const all=pages.flatMap(p=>p.body.groups);assert.equal(all.filter(g=>g.kind==='table').length,blocks.filter(b=>b.kind==='table').length);
  assert.equal(all[0].kind,'text');assert.equal(all[1].kind,'passage');
 }
});

test('v41 editor table attachment keeps prompt first on repeated updates',()=>{
 const doc={questions:[{number:'3',blocks:[{kind:'table'},{kind:'text',text:'발문'},{kind:'passage',text:'설명'},{kind:'statements',text:'보기'}]}]};
 const result=promptBeforeTables(doc.questions[0].blocks);
 assert.deepEqual(result.map(b=>b.kind),['text','passage','table','statements']);
 assert.deepEqual(promptBeforeTables(result),result);
});

test('v41 stacked fractions keep grouped denominators and produce editable math',async()=>{
 const runs=fractionColorRuns([{text:'시간 1/299 792 458 초와 (분자)/(분모)',underline:true}]);
 assert.equal(runs.filter(r=>r.fraction).length,2);assert.equal(runs.find(r=>r.fraction).fraction.denominator,'299 792 458');
 assert.ok(runs.every(r=>r.color!=='FF0000'));
 const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=';
 const doc={title:'equation test',questions:[{number:'1',blocks:[{kind:'text',text:'시간은 1/299 792 458 초이다.'},{...table,cells:table.cells.map((c,i)=>({...c,text:i===0?'(분자)/(분모)':c.text}))}],images:[{id:'test',data:pixel,width:10,height:10}],warnings:[]}]};
 const plan=ctx.api.plan(doc.questions[0]);assert.ok(plan.flatMap(p=>p.body.groups).flatMap(g=>g.lines||[]).flat().some(r=>r.fraction));
 const {blob}=await ctx.api.create(doc,{}),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const xml=(await Promise.all(Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).map(p=>zip.file(p).async('string')))).join('');
 assert.equal((xml.match(/<m:f>/g)||[]).length,2);assert.match(xml,/<m:den>[\s\S]*299 792 458/);assert.doesNotMatch(xml,/<a:lum/);
 assert.equal(applyPictureBrightness(applyPictureBrightness(xml)),applyPictureBrightness(xml));
});

test('v41 full comma-separated denominators remain inside one equation',()=>{
 for(const denominator of ['299,792,458','10,000,000','299 792 458','10 000 000']){
  const runs=fractionColorRuns([{text:'거리의 1/'+denominator+' 초'}]);
  assert.equal(runs.filter(r=>r.fraction).length,1);assert.equal(runs.find(r=>r.fraction).fraction.denominator,denominator);
  const xml=applyFractionMath('<a:r><a:rPr sz="1800"/><a:t>거리의 1/'+denominator+' 초</a:t></a:r>');
  assert.ok(xml.includes('<m:t>'+denominator+'</m:t>'));assert.equal((xml.match(/<m:f>/g)||[]).length,1);
 }
});
test('v41 Office correction preserves black and alpha while raising midtones',()=>{
 const pixels=new Uint8ClampedArray([0,0,0,255,64,64,64,128,255,255,255,0]);
 brightenPixels(pixels);assert.deepEqual([...pixels],[0,0,0,255,135,135,135,128,255,255,255,0]);
});

test('v41 comma fractions exported intact in real native table cells',async()=>{const q={number:'2',blocks:[{kind:'text',text:'분수 검증'}, {...table,cells:table.cells.map((c,i)=>({...c,text:i===0?'1/299,792,458':i===1?'1/10,000,000':c.text}))}],warnings:[]};const {blob}=await ctx.api.create({title:'comma fractions',questions:[q]},{});const zip=await JSZip.loadAsync(await blob.arrayBuffer());const xml=await zip.file('ppt/slides/slide1.xml').async('string');assert.match(xml,/<m:t>299,792,458<\/m:t>/);assert.match(xml,/<m:t>10,000,000<\/m:t>/);if(process.env.QA_COMMA_OUTPUT)fs.writeFileSync(process.env.QA_COMMA_OUTPUT,Buffer.from(await blob.arrayBuffer()));});

test('v41 uses small bullets for list circles but retains scientific circles',()=>{
 assert.equal(normalizeListMarkers('○ 땅속에 굴을 판다. ○ 잎 조각을 운반한다.'),'• 땅속에 굴을 판다. • 잎 조각을 운반한다.');
 assert.equal(normalizeListMarkers('[준비물]\n◯ 코일, 검류계'),'[준비물]\n• 코일, 검류계');
 for(const text of ['○, ■, ▲는 원소이다.','ㄱ. ○는 이온이다.','○ 는 원소를 나타낸다.','㉠ 길이와 ㉡ 질량','원 ○ 안에 표시한다.'])assert.equal(normalizeListMarkers(text),text);
});
test('v41 preview and PPT both normalize prose list markers',async()=>{
 const q={number:'5',blocks:[{kind:'passage',text:'○ 땅속에 굴을 판다. ○ 잎을 운반한다. ㉠ 길이를 비교한다.'}],warnings:[]};
 const text=ctx.api.plan(q).flatMap(p=>p.body.groups).flatMap(g=>g.lines).flat().map(r=>r.text).join('');
 assert.equal(text,'• 땅속에 굴을 판다. • 잎을 운반한다. ㉠ 길이를 비교한다.');
 const {blob}=await ctx.api.create({title:'bullet test',questions:[q]},{}),zip=await JSZip.loadAsync(await blob.arrayBuffer()),xml=await zip.file('ppt/slides/slide1.xml').async('string');
 assert.ok(xml.includes('•'));assert.ok(!xml.includes('○'));assert.ok(xml.includes('㉠'));
});

test('v41 source rectangle evidence boxes only the matching occurrence',()=>{
 const items=[item('4.',20,30),item('구성하는',30,100,40),item('㉠',90,100,10),item('광물로',120,100,40)];
 const shapes=[[88,80,88,110],[104,80,104,110],[88,80,104,80],[88,110,104,110]];
 const evidence=boxedSymbolEvidence(shapes,items,v,[{number:'4'}]);assert.equal(evidence.length,1);
 const doc={questions:[{number:'4',blocks:[{kind:'text',text:'구성하는 ㉠ 광물로 이루어진다.'},{kind:'statements',text:'ㄱ. ㉠은 물질이다.'}]}]};
 const out=applyFormatting(doc,evidence);assert.match(out.questions[0].blocks[0].text,/<box>㉠<\/box>/);assert.equal(out.questions[0].blocks[1].text,'ㄱ. ㉠은 물질이다.');
 assert.deepEqual(applyFormatting(out,evidence),out);
});
test('v41 symbol boxes export as native centered 2.25pt shapes',async()=>{
 const q={number:'4',blocks:[{kind:'text',text:'설명하는 <box>㉠</box> 물질과 <box>㉡</box> 소자이다.'}],warnings:[]};
 const {blob}=await ctx.api.create({title:'boxes',questions:[q]},{}),zip=await JSZip.loadAsync(await blob.arrayBuffer()),xml=await zip.file('ppt/slides/slide1.xml').async('string');
 const boxes=(xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g)||[]).filter(s=>s.includes('name="inline-symbol-box-'));
 assert.equal(boxes.length,2);for(const box of boxes){assert.match(box,/w="28575"/);assert.match(box,/algn="ctr"/);assert.match(box,/anchor="ctr"/);}
 if(process.env.QA_BOX_OUTPUT)fs.writeFileSync(process.env.QA_BOX_OUTPUT,Buffer.from(await blob.arrayBuffer()));
});
test('v41 panel captions are separated and exported as centered editable text',async()=>{
 const vp={width:600,height:800,convertToViewportPoint:(x,y)=>[x,y]},figure={box:[100,100,400,900]},items=[item('(가)',140,310,30),item('(나)',430,310,30)];
 const parsed=separateCaptions([figure],items,vp)[0];assert.equal(parsed.captions.length,2);assert.ok(parsed.box[2]<400);
 const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=';
 const q={number:'8',blocks:[{kind:'text',text:'두 그림을 비교한다.'}],images:[{...parsed,id:'panels',data:pixel,width:600,height:200}],warnings:[]};
 const pages=ctx.api.plan(q);for(const p of pages)for(const image of p.images||[])for(const cap of placeCaptions(image)){assert.ok(cap.y>=image.y+image.h);assert.ok(cap.y+cap.h<7.5);}
 const {blob}=await ctx.api.create({title:'captions',questions:[q]},{}),zip=await JSZip.loadAsync(await blob.arrayBuffer()),xml=await zip.file('ppt/slides/slide1.xml').async('string');
 const captions=(xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g)||[]).filter(s=>s.includes('name="figure-caption-'));assert.equal(captions.length,2);assert.match(captions[0],/\(가\)/);assert.match(captions[1],/\(나\)/);
});

test('v41 boxed prose stays in one editable text shape',async()=>{
 const q={number:'4',blocks:[{kind:'text',text:'첫 문장에 <box>㉠</box> 기호가 있다. 다음 문장에 <box>㉡</box> 기호를 넣는다. '.repeat(3)}],warnings:[]};
 const {blob}=await ctx.api.create({title:'continuous body',questions:[q]},{}),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 for(const path of Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p))){
  const xml=await zip.file(path).async('string'),shapes=xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g)||[];
  assert.equal(shapes.filter(s=>s.includes('name="question-boxed-body"')).length,1);
  assert.ok(!xml.includes('inline-symbol-text-'));assert.match(xml,/<a:tabLst>/);
  assert.ok(shapes.filter(s=>s.includes('inline-symbol-box-')).length>0);
 }
 if(process.env.QA_BODY_OUTPUT)fs.writeFileSync(process.env.QA_BODY_OUTPUT,Buffer.from(await blob.arrayBuffer()));
});

test('view heading is omitted while statement text remains',()=>{
 const blocks=[{kind:'text',text:'다음은 자전거와 관련된 자료이다.'},{kind:'text',text:'이에 대한 옳은 설명만을 <보기>에서 있는 대로 고른 것은?'},{kind:'statements',text:'< 보 기 >\nㄱ. 반응이 일어난다.\nㄴ. 에너지가 전환된다.'}];
 ctx.inputQuestion={blocks};
 const result=vm.runInContext('gv(inputQuestion)',ctx);
 const text=result.groups.map(g=>g.text).join(' ');
 assert.ok(!text.includes('보기')&&!text.includes('보 기')&&!text.includes('고른 것은'));
 assert.ok(text.includes('ㄱ. 반응이 일어난다.')&&text.includes('ㄴ. 에너지가 전환된다.'));
});
