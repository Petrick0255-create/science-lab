import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questionAnchors,tableGrids} from '../assets/pdf-figures-v41.js';
test('textbook split and bare numbers resolve to all 28 unique question anchors',()=>{
 const pages=JSON.parse(fs.readFileSync(new URL('./book-anchors.json',import.meta.url)));
 pages.forEach((p,i)=>{const v={width:p.width,height:p.height,convertToViewportPoint:(x,y)=>[x,p.height-y]};assert.deepEqual(questionAnchors(p.items,v).map(a=>Number(a.number)).sort((a,b)=>a-b),[i*2+1,i*2+2]);});
});
test('segmented open-sided table rules retain all rows and implicit edges',()=>{
 const OPS={constructPath:1,stroke:2},fnArray=[],argsArray=[];
 const line=(x1,y1,x2,y2)=>{fnArray.push(1);argsArray.push([2,[[0,x1,y1,1,x2,y2]],[x1,y1,x2,y2]]);};
 for(const y of [0,10,20,30]){line(0,y,50,y);line(50,y,100,y);}
 for(const y of [0,10,20])line(50,y,50,y+10);
 const grids=tableGrids({fnArray,argsArray},OPS,{width:600,height:800,convertToViewportPoint:(x,y)=>[x,y]});
 assert.equal(grids.length,1);assert.deepEqual(grids[0].xs,[0,50,100]);assert.deepEqual(grids[0].ys,[0,10,20,30]);
});
