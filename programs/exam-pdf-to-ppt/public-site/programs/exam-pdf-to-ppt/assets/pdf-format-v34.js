import {boxedSymbolEvidence} from "./inline-boxes-v34.js";
import {inlineSymbols} from './pdf-symbols-v34.js';
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
export function paintedBounds(ops,OPS,viewport){
 let m=[1,0,0,1,0,0],fill='#000000',stack=[],out=[];
 const point=(x,y)=>viewport.convertToViewportPoint(m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]);
 ops.fnArray.forEach((fn,i)=>{const a=ops.argsArray[i];if(fn===OPS.save)stack.push({m:[...m],fill});else if(fn===OPS.restore){const s=stack.pop();m=s?.m||[1,0,0,1,0,0];fill=s?.fill||'#000000';}else if(fn===OPS.transform)m=mul(m,a);else if(fn===OPS.setFillRGBColor)fill=a[0];else if(fn===OPS.constructPath&&a[2]&&a[0]!==OPS.endPath){if([OPS.fill,OPS.eoFill].includes(a[0])&&fill==='#ffffff')return;const r=a[2],p=[point(r[0],r[1]),point(r[2],r[3])];out.push([Math.min(...p.map(t=>t[1])),Math.min(...p.map(t=>t[0])),Math.max(...p.map(t=>t[1])),Math.max(...p.map(t=>t[0]))]);}});
 return out;
}
export function pageUnderlines(ops,OPS,items,viewport,questions){
 const shapes=paintedBounds(ops,OPS,viewport),widths=new Map();let font;
 ops.fnArray.forEach((fn,i)=>{const a=ops.argsArray[i];if(fn===OPS.setFont)font=a[0];if(fn===OPS.showText)for(const g of a[0])if(typeof g==='object'&&g.unicode?.length===1){if(!widths.has(font))widths.set(font,new Map());widths.get(font).set(g.unicode,g.width);}});
 const text=items.filter(t=>t.str?.trim()).map(t=>{const [x,y]=viewport.convertToViewportPoint(t.transform[4],t.transform[5]);return {...t,x,y,h:t.height||Math.abs(t.transform[3])};});
 const anchors=text.flatMap(t=>{const a=t.str.match(/^\s*(\d{1,3})\s*[.．](?:\s|$)/);return a?[{n:Number(a[1]),x:t.x,y:t.y-t.h}]:[];});
 const columns=[];for(const a of anchors.sort((a,b)=>a.x-b.x))if(!columns.some(x=>Math.abs(x-a.x)<12))columns.push(a.x);
 const owner=(x,y)=>{const col=columns.filter(c=>c<=x+3).at(-1);const a=anchors.filter(a=>Math.abs(a.x-col)<12&&a.y<=y).sort((a,b)=>b.y-a.y)[0];return questions.find(q=>Number(q.number)===a?.n)?.number;};
 const lines=[],out=[];for(const b of shapes.filter(b=>b[2]-b[0]<1&&b[3]-b[1]>4).sort((a,b)=>a[0]-b[0]||a[1]-b[1])){const last=lines.at(-1);if(last&&Math.abs(last[0]-b[0])<.4&&b[1]<=last[3]+1){last[3]=Math.max(last[3],b[3]);}else lines.push([...b]);}
 for(const b of lines){
  // A rule attached to vertical strokes is a cell/frame boundary, not underline.
  if(shapes.some(v=>v[3]-v[1]<1&&v[2]-v[0]>3&&v[0]-1<=b[0]&&v[2]+1>=b[0]&&(Math.abs(v[1]-b[1])<1.5||Math.abs(v[1]-b[3])<1.5)))continue;
  const near=text.filter(t=>b[0]-t.y>=.4&&b[0]-t.y<=t.h*.36&&t.x<b[3]&&t.x+t.width>b[1]);if(!near.length)continue;
  const h=Math.max(...near.map(t=>t.h));
  // Fraction bars have a nearby denominator. Do not turn them into underlines.
  if(text.some(t=>t.y-t.h>b[0]-h*.15&&t.y-b[0]<h*1.2&&t.x>=b[1]-3&&t.x+t.width<=b[3]+3&&Math.abs(t.x+t.width/2-(b[1]+b[3])/2)<h*.75))continue;
  const chunks=[];for(const t of near.sort((a,b)=>a.x-b.x)){
   const chars=[...t.str],ws=chars.map(c=>widths.get(t.fontName)?.get(c)||(/\s/.test(c)?300:/[\u2e80-\uffff]/.test(c)?1000:500)),total=ws.reduce((a,b)=>a+b,0);let x=t.x;const indices=[];
   chars.forEach((c,i)=>{const w=ws[i]/total*t.width;if(x+w*.5>=b[1]-.4&&x+w*.5<=b[3]+.4)indices.push(i);x+=w;});
   if(!indices.length)continue;const start=indices[0],end=indices.at(-1)+1,value=chars.slice(start,end).join('').trim();if(!value)continue;
   const q=owner(t.x+(b[3]-b[1])/2,t.y);if(!q)continue;
   const e={question:q,text:value,before:chars.slice(Math.max(0,start-25),start).join(''),after:chars.slice(end,end+25).join('')};
   chunks.push(e);
  }
  if(chunks.length){const e={...chunks[0],text:chunks.map(e=>e.text).join(''),after:chunks.at(-1).after};if(/[가-힣A-Za-z]/.test(e.text)&&!out.some(o=>o.question===e.question&&o.text===e.text&&o.before===e.before))out.push(e);}
 }
 return out;
}
export async function extractFormatting(session,questions,signal){
 const evidence=[];
 for(let n=1;n<=session.pdf.numPages;n++){if(signal?.aborted)throw new DOMException('취소됨','AbortError');const page=await session.pdf.getPage(n),v=page.getViewport({scale:1});const [ops,text]=await Promise.all([page.getOperatorList(),page.getTextContent()]);evidence.push(...boxedSymbolEvidence(paintedBounds(ops,session.OPS,v),text.items,v,questions),...pageUnderlines(ops,session.OPS,text.items,v,questions),...await inlineSymbols(page,ops,session.OPS,text.items,v,questions));}
 return evidence;
}
const norm=s=>s.replace(/<[^>]*>|\s/g,'');
function locate(text,target){let plain='',positions=[];for(let i=0;i<text.length;){if(text[i]==='<'&&text.indexOf('>',i)>=0){i=text.indexOf('>',i)+1;continue;}if(!/\s/.test(text[i])){plain+=text[i];positions.push(i);}i++;}const needle=norm(target),out=[];for(let at=plain.indexOf(needle);at>=0;at=plain.indexOf(needle,at+1))out.push({start:positions[at],end:positions[at+needle.length-1]+1,plain,at,len:needle.length});return out;}
export function applyFormatting(doc,evidence){
 return {...doc,questions:doc.questions.map(q=>{
  const blocks=q.blocks.map(b=>({...b,...(b.cells?{cells:b.cells.map(c=>({...c}))}:{})})),fields=blocks.flatMap(b=>b.cells?b.cells:[b]).filter(b=>typeof b.text==='string');
  for(const e of evidence.filter(e=>e.question===q.number)){
   if(e.type==='symbols'){
    for(const field of fields){for(const b of locate(field.text,e.before)){const suffix=field.text.slice(b.end),after=locate(suffix,e.after)[0];if(!after||after.start>70)continue;const gap=suffix.slice(0,after.start);if(/^(?:[○◯●◒◑□■▢△▲◬,，\s]|[（(]도형[）)])+$/.test(gap))field.text=field.text.slice(0,b.end)+' '+e.symbols+suffix.slice(after.start);}}
    continue;
   }
   const candidates=fields.flatMap(field=>locate(field.text,e.text).map(m=>{const before=norm(e.before),after=norm(e.after);let score=0;for(let k=1;k<=before.length;k++)if(m.plain.slice(Math.max(0,m.at-k),m.at)===before.slice(-k))score=k;for(let k=1;k<=after.length;k++)if(m.plain.slice(m.at+m.len,m.at+m.len+k)===after.slice(0,k))score+=1;return {field,...m,score};})).sort((a,b)=>b.score-a.score);
   if(!candidates.length||candidates.length>1&&candidates[0].score===candidates[1].score)continue;
   const c=candidates[0],prefix=c.field.text.slice(0,c.start),tag=e.type==='box'?'box':'u';if(prefix.lastIndexOf('<'+tag+'>')>prefix.lastIndexOf('</'+tag+'>'))continue;
   c.field.text=prefix+'<'+tag+'>'+c.field.text.slice(c.start,c.end)+'</'+tag+'>'+c.field.text.slice(c.end);
  }
  return {...q,blocks:blocks.flatMap(b=>{
   if(!['text','passage'].includes(b.kind)||!/(?:옳은 것은|적절한 것은|고른 것은)\s*\?\s*$/.test(b.text))return [b];
   const stops=[...b.text.matchAll(/[.。]\s+/g)],end=stops.length?stops.at(-1).index+1:0;
   return end?[{...b,text:b.text.slice(0,end)}]:[];
  })};
 })};
}
export function cellFraction(cell,shapes,items,viewport){
 const c=cell.sourceBox.map((v,i)=>v/1000*(i%2?viewport.width:viewport.height));
 const text=items.filter(t=>t.str?.trim()).map(t=>{const [x,y]=viewport.convertToViewportPoint(t.transform[4],t.transform[5]);return {text:t.str,x,y,w:t.width,h:t.height};});
 for(const b of shapes){if(b[2]-b[0]>=1||b[3]-b[1]<5||b[0]<=c[0]+1||b[2]>=c[2]-1||b[1]<=c[1]+1||b[3]>=c[3]-1)continue;
 const inside=t=>t.x>=b[1]-3&&t.x+t.w<=b[3]+3;
 const upper=text.filter(t=>inside(t)&&b[0]-t.y>.4&&b[0]-t.y<t.h*.5),lower=text.filter(t=>inside(t)&&t.y>b[0]&&t.y-b[0]<t.h*1.25&&t.y-t.h>b[0]-t.h*.15);
 if(!upper.length||!lower.length)continue;
 const center=ts=>(Math.min(...ts.map(t=>t.x))+Math.max(...ts.map(t=>t.x+t.w)))/2;
 if(Math.abs(center(upper)-(b[1]+b[3])/2)>8||Math.abs(center(lower)-(b[1]+b[3])/2)>8)continue;
 const join=ts=>ts.sort((a,b)=>a.x-b.x).map(t=>t.text).join(' ');
 return {numerator:join(upper),denominator:join(lower)};
 }return null;
}
