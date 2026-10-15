import {imageBoxes} from './pdf-figures-v32.js';
export function classifySymbol(data,width,height){
 const rows=[];for(let y=0;y<height;y++){let lo=width,hi=-1;for(let x=0;x<width;x++){const i=(y*width+x)*4;if(data[i+3]>100&&(data[i]+data[i+1]+data[i+2])/3<220){lo=Math.min(lo,x);hi=Math.max(hi,x);}}if(hi>=lo)rows.push({y,lo,hi});}
 if(rows.length<5)return null;const left=Math.min(...rows.map(r=>r.lo)),right=Math.max(...rows.map(r=>r.hi)),w=right-left+1,h=rows.at(-1).y-rows[0].y+1;if(w/h<.65||w/h>1.65)return null;
 const span=f=>{const r=rows[Math.min(rows.length-1,Math.floor(rows.length*f))];return r.hi-r.lo+1;};
 if(span(.15)<span(.8)*.45)return '▲';
 if(span(.08)>w*.85&&span(.9)>w*.85)return '■';
 if(span(.05)<w*.75&&span(.95)<w*.75&&span(.5)>w*.9)return '○';
 return null;
}
export async function inlineSymbols(page,ops,OPS,items,viewport,questions){
 const text=items.filter(t=>t.str?.trim()).map(t=>{const[x,y]=viewport.convertToViewportPoint(t.transform[4],t.transform[5]);return {text:t.str,x,y,h:t.height,w:t.width};});
 const heights=text.map(t=>t.h).sort((a,b)=>a-b),font=heights[Math.floor(heights.length/2)]||12;
 const boxes=imageBoxes(ops,OPS,viewport,1).filter(b=>b[2]-b[0]<font*1.7&&b[3]-b[1]<font*1.7&&text.some(t=>Math.abs(t.y-b[2])<font*.55&&Math.min(Math.abs(t.x-b[3]),Math.abs(t.x+t.w-b[1]))<font*1.5));
 if(!boxes.length)return [];
 const canvas=document.createElement('canvas'),scale=3,v=page.getViewport({scale});canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);const ctx=canvas.getContext('2d',{willReadFrequently:true});await page.render({canvasContext:ctx,viewport:v,background:'white'}).promise;
 const symbols=[];for(const b of boxes){const x=Math.floor(b[1]*scale),y=Math.floor(b[0]*scale),w=Math.max(1,Math.ceil((b[3]-b[1])*scale)),h=Math.max(1,Math.ceil((b[2]-b[0])*scale));const symbol=classifySymbol(ctx.getImageData(x,y,w,h).data,w,h);if(symbol)symbols.push({box:b,symbol});}canvas.width=canvas.height=1;
 const groups=[];for(const s of symbols.sort((a,b)=>a.box[0]-b.box[0]||a.box[1]-b.box[1])){const g=groups.find(g=>Math.abs(g[0].box[2]-s.box[2])<font*.4&&s.box[1]-g.at(-1).box[3]<font*3);if(g)g.push(s);else groups.push([s]);}
 const anchors=text.flatMap(t=>{const m=t.text.match(/^\s*(\d{1,3})\s*[.．](?:\s|$)/);return m?[{...t,n:Number(m[1])}]:[];}),columns=[];for(const a of anchors.sort((a,b)=>a.x-b.x))if(!columns.some(x=>Math.abs(x-a.x)<12))columns.push(a.x);
 return groups.flatMap(g=>{g.sort((a,b)=>a.box[1]-b.box[1]);const first=g[0].box,last=g.at(-1).box,col=columns.filter(x=>x<=first[1]+3).at(-1),a=anchors.filter(a=>Math.abs(a.x-col)<12&&a.y<=first[0]+font).sort((a,b)=>b.y-a.y)[0],question=questions.find(q=>Number(q.number)===a?.n)?.number;if(!question)return [];
 const row=text.filter(t=>t.x>=col-2&&t.x<(columns.find(x=>x>col+12)||viewport.width)&&Math.abs(t.y-first[2])<font*.55).sort((a,b)=>a.x-b.x),before=row.filter(t=>t.x+t.w<=first[1]+1&&first[1]-t.x-t.w<font*8).slice(-2).map(t=>t.text).join(''),after=row.filter(t=>t.x>=last[3]-1&&t.x-last[3]<font*8).slice(0,1).map(t=>t.text).join('');
 return before&&after?[{type:'symbols',question,before,after,symbols:g.map(s=>s.symbol).join(', ')}]:[];
 });
}
