import test from 'node:test';
import assert from 'node:assert/strict';
import {imageBoxes,assignBoxes} from '../assets/pdf-figures.js';
const viewport={width:842,height:1191,convertToViewportPoint:(x,y)=>[x,1191-y]};
const anchors=[{str:'3.',height:14,transform:[14,0,0,14,436,952]},{str:'4.',height:14,transform:[14,0,0,14,436,445]}];
test('embedded image bounds follow PDF transforms rather than AI crop estimates',()=>{
 const OPS={save:1,transform:2,paintImageXObject:3,restore:4};
 const boxes=imageBoxes({fnArray:[1,2,3,4],argsArray:[[],[75,0,0,62.4,671.88,849.96],[],[]]},OPS,viewport);
 assert.equal(boxes.length,1);assert.ok(Math.abs(boxes[0][0]-278.64)<.001);
 assert.equal(boxes[0][1],671.88);assert.equal(boxes[0][3],746.88);
});
test('a single-question retry never picks up the next question picture',()=>{
 const figures=assignBoxes([[278,672,341,747],[769,667,849,747]],anchors,viewport,[{number:'3'}],1);
 assert.equal(figures.length,1);assert.equal(figures[0].question,'3');
 assert.ok(figures[0].box[0]>220&&figures[0].box[2]<300);
});
test('adjacent strips are reunited into one complete illustration',()=>{
 const figures=assignBoxes([[278,672,300,747],[300,672,321,747],[321,672,341,747]],anchors,viewport,[{number:'3'}],1);
 assert.equal(figures.length,1);
 assert.ok(Math.abs(figures[0].box[0]-275/1191*1000)<.001);
 assert.ok(Math.abs(figures[0].box[2]-344/1191*1000)<.001);
});
test('question 5 in the left column never receives question 7 teacher images on the right',()=>{
 const items=[
  {str:'5.',height:14,transform:[14,0,0,14,87.9,1023]},
  {str:'6.',height:14,transform:[14,0,0,14,87.9,651]},
  {str:'7.',height:14,transform:[14,0,0,14,436.56,1023]},
  {str:'8.',height:14,transform:[14,0,0,14,436.56,479]},
 ];
 const figures=assignBoxes([[191,310,254,398],[185,451,225,480],[295,451,335,480]],items,viewport,[{number:'5'},{number:'7'}],2);
 const ants=figures.filter(f=>f.question==='5'),teachers=figures.filter(f=>f.question==='7');
 assert.equal(ants.length,1);assert.equal(teachers.length,2);
 assert.ok(ants[0].box[3]<500);assert.ok(teachers.every(f=>f.box[1]>500));
 const retry=assignBoxes([[191,310,254,398],[185,451,225,480]],items,viewport,[{number:'5'}],2);
 assert.equal(retry.length,1);assert.equal(retry[0].question,'5');
});
test('a box crossing a column or question boundary is rejected, never truncated',()=>{
 const items=[{str:'5.',height:14,transform:[14,0,0,14,87.9,1023]},{str:'6.',height:14,transform:[14,0,0,14,87.9,651]},{str:'7.',height:14,transform:[14,0,0,14,436.56,1023]}];
 assert.equal(assignBoxes([[185,400,300,490],[450,200,700,350]],items,viewport,[{number:'5'},{number:'7'}],2).length,0);
});
