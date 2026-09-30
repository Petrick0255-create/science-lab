import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assignBoxes} from '../assets/pdf-figures-v40.js';
test('bicycle callouts are complete without including the question and view heading',()=>{
 const {items,box}=JSON.parse(fs.readFileSync(new URL('./callout-fixture.json',import.meta.url)));
 const viewport={width:841,height:1190,convertToViewportPoint:(x,y)=>[x,1190-y]};
 const actual=assignBoxes([box.map((v,i)=>v/1000*(i%2?841:1190))],items,viewport,[{number:'4'}],1)[0].box.map((v,i)=>v/1000*(i%2?841:1190));
 for(const t of items.filter(t=>t.transform[4]>420&&t.height<10&&t.transform[5]>=265&&t.transform[5]<=385)){
  const x=t.transform[4],y=1190-t.transform[5];
  assert.ok(actual[0]<=y-t.height&&actual[1]<=x&&actual[2]>=y&&actual[3]>=x+t.width,t.str);
 }
 assert.ok(actual[2]<1190-237.133088-11.515008);
});

