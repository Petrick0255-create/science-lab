import test from 'node:test';
import assert from 'node:assert/strict';
import {gridTable,applyTableText,attachTables} from '../assets/native-tables-v40.js';
const viewport={convertToViewportPoint:(x,y)=>[x,y]};
const item=(str,x,y)=>({str,width:10,height:10,transform:[10,0,0,10,x,y]});
const table={kind:'table',rows:2,columns:2,cells:[{row:0,column:0,rowSpan:1,colSpan:2,text:'제목'},{row:1,column:0,rowSpan:1,colSpan:1,text:'값'},{row:1,column:1,rowSpan:1,colSpan:1,text:'2'}]};
test('partial internal rule creates a merged header rather than losing a column',()=>{
 const grid={xs:[0,50,100],ys:[0,30,60],lines:[[0,0,0,100],[30,0,30,100],[60,0,60,100],[0,0,60,0],[0,100,60,100],[30,50,60,50]]};
 const result=gridTable(grid,[item('제목',40,20),item('값',10,50),item('2',60,50)],viewport);
 assert.equal(result.cells.length,3);assert.equal(result.cells[0].colSpan,2);
});
test('missing or duplicate AI cells preserve local values and flag review',()=>{
 const input=new Map([['1',[table]]]);
 assert.equal(applyTableText(input,{tables:[{id:'1:0',readable:true,cells:[]}]}).get('1')[0].cells[2].text,'2');
 const answer={id:'1:0',readable:true,cells:table.cells.map(c=>({row:c.row,column:c.column,text:c.text}))};
 assert.equal(applyTableText(input,{tables:[answer]}).get('1')[0].cells[2].text,'2');
 assert.equal(applyTableText(input,{tables:[answer,answer]}).get('1')[0].cells[2].needsReview,true);
});
test('two real tables replace one placeholder and preserve surrounding prose',()=>{
 const doc={questions:[{number:'1',blocks:[{kind:'text',text:'본문'},{kind:'table',rows:2,columns:3},{kind:'statements',text:'보기'}],images:[]}]};
 const q=attachTables(doc,new Map([['1',[table,table]]])).questions[0];
 assert.deepEqual(q.blocks.map(b=>b.kind),['text','table','table','statements']);assert.equal(q.blocks[0].text,'본문');assert.equal(q.blocks[3].text,'보기');
});
test('partial response preserves other tables and a retry preserves accepted cells',()=>{
 const input=new Map([['01',[table]],['20',[{...table,cells:table.cells.map((c,i)=>({...c,text:i===2?'\uE001':c.text}))}]]]);
 const result=applyTableText(input,{tables:[{id:'01:0',readable:true,cells:table.cells.map(c=>({...c,text:'인식 '+c.text}))},{id:'20:0',readable:true,cells:[{row:0,column:0,text:'정상 제목'}]}]});
 assert.equal(result.get('01')[0].cells[2].text,'인식 2');
 assert.equal(result.get('20')[0].cells[2].text,'[확인 필요]');
 const retry=applyTableText(result,{tables:[{id:'20:0',readable:true,cells:[{row:1,column:1,text:'3/4'}]}]});
 assert.equal(retry.get('01')[0].cells[2].text,'인식 2');
 assert.equal(retry.get('20')[0].cells[0].text,'정상 제목');
 assert.equal(retry.get('20')[0].cells[2].text,'3/4');
});
test('pictures stay inside their native table across repeated attachment',()=>{
 const t={...table,sourcePage:1,sourceBox:[100,100,300,400]},f={id:'cell-picture',page:1,box:[120,120,250,260]};
 const doc={questions:[{number:'1',blocks:[{kind:'table'}],images:[f]}]};
 const once=attachTables(doc,new Map([['1',[t]]]));
 const twice=attachTables(once,new Map([['1',[t]]]));
 assert.equal(twice.questions[0].images.length,0);
 assert.equal(twice.questions[0].blocks[0].tableFigures[0].id,f.id);
});
test('truncated multiline cell is reviewed instead of accepting only its denominator',()=>{
 const c={row:0,column:0,rowSpan:1,colSpan:1,text:'전자가 들어 있는 p 오비탈 수\n전자가 들어 있는 s 오비탈 수'};
 const input=new Map([['12',[{...table,cells:[c]}]]]);
 const result=applyTableText(input,{tables:[{id:'12:0',readable:true,cells:[{row:0,column:0,text:'전자가 들어 있는 s 오비탈 수'}]}]});
 assert.equal(result.get('12')[0].cells[0].needsReview,true);
 assert.equal(result.get('12')[0].cells[0].text,c.text);
});
