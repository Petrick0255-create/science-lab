import {questionAnchors} from "./pdf-figures-v41.js";
export function boxedSymbolEvidence(shapes,items,viewport,questions){
 const text=items.filter(t=>t.str?.trim()).map(t=>{const[x,y]=viewport.convertToViewportPoint(t.transform[4],t.transform[5]);return {...t,x,y,h:t.height};});
 const anchors=questionAnchors(items,viewport).map(a=>({...a,n:Number(a.number)})),cols=[];
 for(const a of anchors.sort((a,b)=>a.x-b.x))if(!cols.some(x=>Math.abs(x-a.x)<12))cols.push(a.x);
 const out=[];
 for(const t of text.filter(t=>/^[㉠-㉻]$/.test(t.str))){
  const cx=t.x+t.width/2,cy=t.y-t.h*.4;
  const vertical=shapes.filter(b=>b[3]-b[1]<1&&b[0]<cy&&b[2]>cy&&b[2]-b[0]<t.h*2);
  const left=vertical.filter(b=>b[1]<t.x).sort((a,b)=>b[1]-a[1])[0],right=vertical.filter(b=>b[1]>t.x+t.width).sort((a,b)=>a[1]-b[1])[0];
  if(!left||!right||right[1]-left[1]>t.h*12||Math.abs(left[0]-right[0])>1||Math.abs(left[2]-right[2])>1)continue;
  const horizontal=y=>shapes.some(b=>b[2]-b[0]<1&&Math.abs(b[0]-y)<1&&b[1]<=left[1]+1&&b[3]>=right[1]-1);
  if(!horizontal(left[0])||!horizontal(left[2]))continue;
  if(text.some(o=>o!==t&&o.x+o.width/2>left[1]&&o.x+o.width/2<right[1]&&o.y-o.h*.4>left[0]&&o.y-o.h*.4<left[2]))continue;
  const col=cols.filter(x=>x<=cx+3).at(-1),end=cols.find(x=>x>col+12)||viewport.width;
  const owner=anchors.filter(a=>Math.abs(a.x-col)<12&&a.y<=t.y).sort((a,b)=>b.y-a.y)[0];
  const question=questions.find(q=>Number(q.number)===owner?.n)?.number;if(!question)continue;
  const row=text.filter(o=>o.x>=col-2&&o.x<end&&Math.abs(o.y-t.y)<t.h*.55).sort((a,b)=>a.x-b.x);
  out.push({type:'box',question,text:t.str,before:row.filter(o=>o.x<t.x).slice(-2).map(o=>o.str).join(''),after:row.filter(o=>o.x>t.x).slice(0,2).map(o=>o.str).join('')});
 }return out;
}
export function parseBoxRuns(text,parse){
 if(!text.includes('<box>'))return parse(text);
 return text.split(/(<box>[㉠-㉻]<\/box>)/g).flatMap(s=>/^<box>/.test(s)?[{text:s.slice(5,-6),script:'normal',underline:false,boxed:true}]:s?parse(s):[]);
}
export function boxedRunWidth(run,font=24){
 if(run.boxed)return .85;
 const factor=run.script==='normal'?1:.75;
 if(typeof document!=='undefined'){
  const ctx=document.createElement('canvas').getContext('2d');ctx.font='100px "210 M고딕 070", "210M고딕 070", "Malgun Gothic", sans-serif';
  return ctx.measureText(run.text).width/100*font/72*factor;
 }
 return [...run.text].reduce((n,c)=>n+(/\s/.test(c)?.32:/[\u2e80-\uffff]/.test(c)?1:.6),0)*font/72*factor;
}
export function wrapBoxRuns(runs,width=9.05){
 const lines=[[]];let used=0;
 for(const run of runs)for(const text of run.boxed||run.fraction?[run.text]:[...run.text]){
  if(text==='\n'){lines.push([]);used=0;continue;}
  const piece={...run,text},w=boxedRunWidth(piece);
  if(used+w>width&&lines.at(-1).length){lines.push([]);used=0;}
  const last=lines.at(-1).at(-1);
  if(last&&!last.boxed&&!piece.boxed&&!last.fraction&&!piece.fraction&&last.script===piece.script&&last.underline===piece.underline&&last.color===piece.color)last.text+=text;
  else lines.at(-1).push(piece);
  used+=w;
 }return lines;
}
export function boxedLineSegments(group){
 return group.lines.flatMap((line,row)=>{let x=row===0?(group.firstLineIndent||0):0;
  return line.map(run=>{const w=boxedRunWidth(run),result={...run,x,y:row*group.lineHeight,w,h:group.lineHeight};x+=w;return result;});
 });
}
export function addBoxedText(slide,group,fontFace){
 const body=[];
 for(const [row,line] of group.lines.entries()){
  let x=row===0?(group.firstLineIndent||0):0;
  const tabs=x?[{position:x,alignment:'l'}]:[];
  for(const r of line){x+=boxedRunWidth(r);if(r.boxed)tabs.push({position:x,alignment:'l'});}
  const runs=line.map(r=>({text:r.boxed?'\t':r.text,options:{fontFace,fontSize:24,color:r.color||'FFFFFF',superscript:r.script==='sup',subscript:r.script==='sub',underline:r.underline?{style:'sng'}:undefined,tabStops:tabs}}));
  if(row===0&&group.firstLineIndent)runs.unshift({text:'\t',options:{tabStops:tabs}});
  if(runs.length&&row<group.lines.length-1)runs.at(-1).options.breakLine=true;
  body.push(...runs);
 }
 slide.addText(body,{x:group.x,y:group.y+.02,w:group.w,h:group.h,fontFace,fontSize:24,color:'FFFFFF',margin:0,align:'left',valign:'top',lineSpacing:group.lineHeight*72,paraSpaceAfterPt:0,paraSpaceBeforePt:0,objectName:'question-boxed-body'});
 for(const [i,r] of boxedLineSegments(group).entries()){
  if(!r.boxed)continue;
  slide.addText(r.text,{x:group.x+r.x,y:group.y+r.y+.02,w:r.w,h:.45,fontFace,fontSize:24,color:'FFFFFF',margin:0,align:'center',valign:'mid',line:{color:'FFFFFF',width:2.25},fill:{color:'000000'},objectName:'inline-symbol-box-'+i});
 }
}
export function BoxedGroup({React,group}){
 return React.createElement(React.Fragment,null,...boxedLineSegments(group).map((r,i)=>React.createElement('span',{key:i,style:{position:'absolute',left:(r.x/group.w*100)+'%',top:(r.y/group.h*100)+'%',width:(r.w/group.w*100)+'%',height:((r.boxed?.45:r.h)/group.h*100)+'%',display:'flex',alignItems:r.boxed?'center':'flex-start',justifyContent:r.boxed?'center':'flex-start',boxSizing:'border-box',border:r.boxed?'.3125cqw solid white':undefined,whiteSpace:'pre',textDecoration:r.underline?'underline':undefined,color:'#'+(r.color||'FFFFFF'),fontSize:r.script==='normal'?'3.333333cqw':'2.5cqw'}},r.text)));
}

