import test from 'node:test';
import assert from 'node:assert/strict';
import {assignBoxes,vectorBoxes,textDiagramBoxes} from '../assets/pdf-figures-v41.js';
const viewport={width:600,height:800,convertToViewportPoint:(x,y)=>[x,800-y]};
const item=(str,x,top,w=20,h=12)=>({str,width:w,height:h,transform:[h,0,0,h,x,800-top-h]});
const anchor=item('1.',50,50);
test('separate caption beneath an image is included without the following prose',()=>{
 const f=assignBoxes([[100,80,180,240]],[anchor,item('(가)',120,184,24),item('이 그림에 대한 설명이다.',70,210,200) ],viewport,[{number:'1'}],1)[0];
 assert.ok(f.box[2]*.8<184);assert.equal(f.captions[0].text,'(가)');
});
test('labels cannot expand a capture across the next question boundary',()=>{
 const f=assignBoxes([[100,80,180,240]],[anchor,item('2.',50,185),item('(나)',120,188,24)],viewport,[{number:'1'}],1)[0];
 assert.ok(f.box[2]*.8<=185);
});
test('painted graph paths are detected and white background masks are ignored',()=>{
 const OPS={constructPath:91,stroke:20,fill:22,endPath:28,setFillRGBColor:59};
 const paths=[[20,[[0,100,500,1,200,500,1,200,600]],[100,500,200,600]], [20,[[0,100,500,1,200,600]],[100,500,200,600]]];
 const operators={fnArray:[59,91,59,91,91],argsArray:[['#ffffff'],[22,[[0,80,480,1,220,480,1,220,620,4]],[80,480,220,620]],['#000000'],...paths]};
 assert.deepEqual(vectorBoxes(operators,OPS,viewport,[anchor]),[[200,100,300,200]]);
});
test('a passage frame overlapping prose is never captured as a figure',()=>{
 const OPS={constructPath:91,stroke:20,endPath:28};
 const operators={fnArray:[91,91],argsArray:[[20,[[0,70,500,1,230,500,1,230,600,4]],[70,500,230,600]],[20,[[0,71,501,1,231,501,1,231,601,4]],[71,501,231,601]]]};
 assert.deepEqual(vectorBoxes(operators,OPS,viewport,[anchor,item('이것은 그림이 아닌 설명이다.',60,230,230)]),[]);
});
test('chemical structure written with text bonds is detected, ordinary prose is not',()=>{
 const items=[anchor,item('H-N-C-COOH',100,230,90,10),item('H',140,212,8,10),item('H',140,249,8,10),item('문항 본문 설명',70,280,160)];
 assert.equal(textDiagramBoxes(items,viewport).length,1);
 assert.equal(textDiagramBoxes([anchor,item('A-B',100,230,40,10)],viewport).length,0);
});
test('same-size Korean picture names are retained without following prose',()=>{
 const f=assignBoxes([[100,80,180,240]],[anchor,item('그래핀',130,184,36),item('다음 설명이다.',70,210,200)],viewport,[{number:'1'}],1)[0];
 assert.ok(f.box[2]*.8>=198);assert.ok(f.box[2]*.8<210);
});
test('isolated typeset formula and subscript above a caption are captured',()=>{
 const items=[anchor,item('CH',110,150,20),item('3',130,156,5,7),item('CCH',135,150,30),item('(가)',126,185,24)];
 const result=textDiagramBoxes(items,viewport);
 assert.equal(result.length,1);assert.ok(result[0][1]<=110);assert.ok(result[0][3]>=165);
 assert.equal(textDiagramBoxes(items.filter(t=>t.str!=='(가)'),viewport).length,0);
});
