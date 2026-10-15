import {separateCaptions} from "./figure-captions-v36.js";
// Detect embedded PDF images directly: no model request or mock coordinates.
function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
export function imageBoxes(operators,OPS,viewport,minSize=8) {
  let matrix=[1,0,0,1,0,0];const stack=[],boxes=[];
  const add=()=>{
    const pts=[[0,0],[1,0],[0,1],[1,1]].map(([x,y])=>viewport.convertToViewportPoint(matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]));
    const box=[Math.min(...pts.map(p=>p[1])),Math.min(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0]))];
    const w=box[3]-box[1],h=box[2]-box[0];
    if(w>=minSize&&h>=minSize&&w*h<viewport.width*viewport.height*.65)boxes.push(box);
  };
  operators.fnArray.forEach((fn,i)=>{
    const args=operators.argsArray[i];
    if(fn===OPS.save)stack.push([...matrix]);
    else if(fn===OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0];
    else if(fn===OPS.transform)matrix=multiply(matrix,args);
    else if(fn===OPS.paintFormXObjectBegin){stack.push([...matrix]);if(args[0])matrix=multiply(matrix,args[0]);}
    else if(fn===OPS.paintFormXObjectEnd)matrix=stack.pop()||[1,0,0,1,0,0];
    else if([OPS.paintImageXObject,OPS.paintInlineImageXObject,OPS.paintImageMaskXObject,OPS.paintSolidColorImageMask].includes(fn))add();
    else if(fn===OPS.paintImageXObjectRepeat||fn===OPS.paintImageMaskXObjectRepeat){
      const old=matrix;for(let j=0;j<args[3].length;j+=2){matrix=multiply(old,[args[1],0,0,args[2],args[3][j],args[3][j+1]]);add();}matrix=old;
    }
  });
  return boxes;
}
const union=(a,b)=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])];
const gap=(a,b)=>[Math.max(a[0]-b[2],b[0]-a[2],0),Math.max(a[1]-b[3],b[1]-a[3],0)];
const overlaps=(a,b)=>Math.min(a[2],b[2])-Math.max(a[0],b[0])>.2&&Math.min(a[3],b[3])-Math.max(a[1],b[1])>.2;
function textGeometry(items,viewport){
  return items.filter(i=>i.str?.trim()&&i.height>0&&i.width>0).map(i=>{
    const [x,y]=viewport.convertToViewportPoint(i.transform[4],i.transform[5]);
    return {str:i.str.trim(),box:[y-i.height,x,y,x+i.width],h:i.height};
  });
}
function proseText(text){
  return text.filter(t=>{
    const neighbors=text.filter(o=>Math.abs(o.box[2]-t.box[2])<Math.min(t.h,o.h)*.35&&gap(t.box,o.box)[1]<t.h*.8);
    const str=neighbors.map(o=>o.str).join('');
    return str.length>17||/[ㄱㄴㄷ]\.\s|[다까요][.?。]$/.test(str)||/[①②③④⑤]|^\d+\s*[.．]/.test(t.str);
  });
}
// Collect painted vector paths, including graph axes, curves and apparatus.
// Coordinates come from the uploaded PDF's drawing operations, not a template.
export function vectorBoxes(operators,OPS,viewport,items,cells=[]){
  let matrix=[1,0,0,1,0,0],fill='#000000';const stack=[],paths=[];
  const text=textGeometry(items,viewport),prose=proseText(text);
  const heights=text.map(t=>t.h).sort((a,b)=>a-b),font=heights[Math.floor(heights.length/2)]||12;
  for(let i=0;i<operators.fnArray.length;i++){
    const fn=operators.fnArray[i],args=operators.argsArray[i];
    if(fn===OPS.save)stack.push({matrix:[...matrix],fill});
    else if(fn===OPS.restore){const state=stack.pop();matrix=state?.matrix||[1,0,0,1,0,0];fill=state?.fill||'#000000';}
    else if(fn===OPS.setFillRGBColor)fill=args[0];
    else if(fn===OPS.transform)matrix=multiply(matrix,args);
    else if(fn===OPS.paintFormXObjectBegin){stack.push({matrix:[...matrix],fill});if(args[0])matrix=multiply(matrix,args[0]);}
    else if(fn===OPS.paintFormXObjectEnd){const state=stack.pop();matrix=state?.matrix||[1,0,0,1,0,0];fill=state?.fill||'#000000';}
    else if(fn===OPS.constructPath&&args[2]&&args[0]!==OPS.endPath){
      if((args[0]===OPS.fill||args[0]===OPS.eoFill)&&fill==='#ffffff')continue;
      const r=args[2],pts=[[r[0],r[1]],[r[2],r[1]],[r[0],r[3]],[r[2],r[3]]].map(([x,y])=>viewport.convertToViewportPoint(matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]));
      const b=[Math.min(...pts.map(p=>p[1])),Math.min(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0]))];
      const w=b[3]-b[1],h=b[2]-b[0];
      if(cells.some(c=>(h<1&&(Math.abs(b[0]-c[0])<1||Math.abs(b[0]-c[2])<1)&&b[1]<c[3]&&b[3]>c[1])||(w<1&&(Math.abs(b[1]-c[1])<1||Math.abs(b[1]-c[3])<1)&&b[0]<c[2]&&b[2]>c[0])))continue;
      // Page rules and passage/answer frames must not connect to illustrations.
      if(w>viewport.width*.39||h>viewport.height*.36||w+h<.5)continue;
      if(prose.some(t=>overlaps(t.box,b)))continue;
      const data=Array.from(args[1]?.[0]||[]);let special=args[0]!==OPS.stroke&&args[0]!==OPS.closeStroke,x=0,y=0;
      for(let j=0;j<data.length;){const op=data[j++];if(op===0||op===1){const nx=data[j++],ny=data[j++];if(op===1&&Math.abs(nx-x)>.1&&Math.abs(ny-y)>.1)special=true;x=nx;y=ny;}else if(op===2){special=true;j+=6;}else if(op===3){special=true;j+=4;}else if(op!==4)break;}
      paths.push({box:b,count:1,special,cell:cells.findIndex(c=>b[0]>=c[0]-1&&b[1]>=c[1]-1&&b[2]<=c[2]+1&&b[3]<=c[3]+1)});
    }
  }
  const groups=[];
  for(const path of paths){let current=path,changed=true;while(changed){changed=false;for(let i=0;i<groups.length;i++){
    const d=gap(current.box,groups[i].box),b=union(current.box,groups[i].box);
    if(current.cell===groups[i].cell&&d[0]<=font*.65&&d[1]<=font*.65&&!prose.some(t=>overlaps(t.box,b))){
      current={box:b,count:current.count+groups[i].count,special:current.special||groups[i].special,cell:current.cell};groups.splice(i,1);changed=true;break;
    }
  }}groups.push(current);}
  return groups.filter(g=>{const w=g.box[3]-g.box[1],h=g.box[2]-g.box[0];return !isAnswerHeadingRule(g.box,text,font)&&!isBlankBox(g.box,text,font)&&g.count>=2&&(g.special||(g.count>=3&&Math.max(w,h)<font*8))&&Math.max(w,h)>font*1.5&&Math.min(w,h)>font*.4;}).map(g=>g.box);
}
// A decorated answer-frame rule is not a diagram or graph axis. Require the
// standalone heading at the rule's end, so unrelated thin diagrams survive.
export function isAnswerHeadingRule(box,text,font){
 if(box[3]-box[1]<font*4||box[2]-box[0]>font*2)return false;
 const labels=text.flatMap(t=>{
   if(/^[<〈《\[]?보기[>〉》\]]?$/.test(t.str.replace(/\s/g,'')))return [t];
   if(t.str.trim()!=='보')return [];
   const next=text.find(n=>n.str.trim()==='기'&&Math.abs(n.box[2]-t.box[2])<font*.3&&n.box[1]>=t.box[3]-1&&n.box[1]-t.box[3]<font);
   return next?[{...t,box:union(t.box,next.box)}]:[];
 });
 return labels.some(t=>gap(box,t.box)[0]<font*.35&&
   Math.min(Math.abs(box[3]-t.box[1]),Math.abs(box[1]-t.box[3]))<font*1.5);
}
function isBlankBox(box,text,font){
 const inside=text.filter(t=>(t.box[1]+t.box[3])/2>=box[1]-1&&(t.box[1]+t.box[3])/2<=box[3]+1&&(t.box[0]+t.box[2])/2>=box[0]-1&&(t.box[0]+t.box[2])/2<=box[2]+1);
 return box[2]-box[0]<font*2&&box[3]-box[1]<font*25&&inside.length>0&&inside.every(t=>/^[㉠-㉻ⓐ-ⓩ]$/.test(t.str));
}
function includeLabels(figures,items,viewport){
  const text=textGeometry(items,viewport),prose=new Set(proseText(text));
  const heights=text.map(t=>t.h).sort((a,b)=>a-b),font=heights[Math.floor(heights.length/2)]||12;
  return figures.map(f=>{
    const original=f.box.map((v,i)=>v/1000*(i%2?viewport.width:viewport.height));let box=[...original];
    for(let pass=0;pass<12;pass++)for(const t of text){
      if(prose.has(t)||t.str.length>17||/^[,.:;·]+$/.test(t.str))continue;
      const caption=/^(?:\([가-힣A-Za-z0-9ⅠⅡⅢⅣ]+\)|[A-Za-z0-9₀-₉⁺⁻+−–()]+|[ㄱ-ㅎ])$/.test(t.str.replace(/\s/g,''));
        const namedCaption=/^[가-힣]{2,8}$/.test(t.str)&&t.box[0]>=original[2]-2&&t.box[0]-original[2]<font*1.5&&t.box[1]>=original[1]-font&&t.box[3]<=original[3]+font;
        if(!caption&&!namedCaption&&t.h>=font*.96)continue;
      const d=gap(box,t.box),reach=gap(original,t.box);
      if(reach[0]>font*3||reach[1]>font*8||d[0]>font*1.05||d[1]>font*1.05)continue;
      const candidate=union(box,[t.box[0]-2,t.box[1]-2,t.box[2]+2,t.box[3]+2]);
      if(candidate.some((v,i)=>i<2?v<f.limits[i]:v>f.limits[i]))continue;
      if([...prose].some(p=>p.box[1]<candidate[3]&&p.box[3]>candidate[1]&&p.box[0]<candidate[2]&&p.box[2]>candidate[0]))continue;
      box=candidate;
    }
    for(const t of text){
      // Choice diagrams keep their own isolated choice number, never a prose answer.
      if(/^[①②③④⑤]$/.test(t.str)&&Math.abs(t.box[0]-original[0])<font*1.5&&t.box[3]<=box[1]+font&&gap(t.box,box)[1]<font*1.5){
        const b=union(box,[t.box[0]-2,t.box[1]-2,t.box[2]+2,t.box[3]+2]);
        if(b.every((v,i)=>i<2?v>=f.limits[i]:v<=f.limits[i]))box=b;
      }
    }
    const {limits,...rest}=f;return {...rest,box:box.map((v,i)=>v/(i%2?viewport.width:viewport.height)*1000)};
  });
}
export function textDiagramBoxes(items,viewport){
    const text=textGeometry(items,viewport),boxes=[];
    const prose=new Set(proseText(text));
    // A typeset formula above an isolated (가)/(나) caption is also a diagram.
    // Join split subscript runs using geometry, without matching a question number.
    for(const caption of text.filter(t=>/^\([가-힣]\)$/.test(t.str))){
      if(text.some(t=>t!==caption&&!/^\([가-힣]\)$/.test(t.str)&&Math.abs(t.box[2]-caption.box[2])<caption.h*.7&&gap(t.box,caption.box)[1]<caption.h*10))continue;
      const near=text.filter(t=>!prose.has(t)&&/^[A-Za-z0-9₀-₉+−=()]+$/.test(t.str)&&t.box[2]<caption.box[0]&&caption.box[0]-t.box[2]<caption.h*3&&Math.abs((t.box[1]+t.box[3]-caption.box[1]-caption.box[3])/2)<caption.h*3);
      if(!near.some(t=>/[A-Z][A-Za-z]/.test(t.str)))continue;
      const b=near.reduce((b,t)=>union(b,t.box),caption.box);
      if(![...prose].some(t=>overlaps(t.box,b)))boxes.push(b);
    }
  for(const t of text){
    if(!/[A-Z][A-Za-z0-9£™]*[-−–][A-Z]/.test(t.str))continue;
    const atoms=text.filter(a=>/^[A-Z]$/.test(a.str)&&a.box[1]>=t.box[1]-t.h&&a.box[3]<=t.box[3]+t.h&&Math.abs(a.box[0]-t.box[0])>t.h*.6&&gap(a.box,t.box)[0]<t.h*1.8);
    if(atoms.length>=2)boxes.push(atoms.reduce((b,a)=>union(b,a.box),t.box));
  }
  return boxes;
}
export function assignBoxes(boxes,items,viewport,questions,pageNumber,cells=[]) {
  const keys=new Map(questions.map(q=>[Number(q.number),q.number]));
  const anchors=items.flatMap(item=>{
    const match=item.str?.match(/^\s*(\d{1,3})\s*[.．](?:\s|$)/);
    if(!match)return [];
    const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
    return [{number:match[1],x,y:y-Math.abs(item.height||item.transform[3])}];
  });
  const columns=[];for(const a of anchors.sort((a,b)=>a.x-b.x))if(!columns.some(x=>Math.abs(x-a.x)<12))columns.push(a.x);
  const text=items.filter(i=>i.str?.trim()&&i.height>0&&i.width>0).map(i=>{
    const [x,y]=viewport.convertToViewportPoint(i.transform[4],i.transform[5]);
    return {x,y:y-i.height,w:i.width,h:i.height};
  });
  const heights=text.map(i=>i.h).sort((a,b)=>a-b),fontHeight=heights[Math.floor(heights.length/2)]||12;
  const inlineSymbol=box=>{
    const [top,left,bottom,right]=box,w=right-left,h=bottom-top;
    if(h>fontHeight*1.65||w>fontHeight*2.5)return false;
    return text.some(t=>{
      const overlap=Math.min(bottom,t.y+t.h)-Math.max(top,t.y);
      const gap=Math.max(t.x-right,left-(t.x+t.w),0);
      return overlap>=Math.min(h,t.h)*.5 && gap<=fontHeight*1.5;
    });
  };
  const figures=[];
  for(const box of boxes){
    // Inline pictographic glyphs belong to the existing text transcription.
    // Filter them BEFORE merging, or a sequence of glyphs looks like a diagram.
    if(inlineSymbol(box)||isBlankBox(box,textGeometry(items,viewport),fontHeight))continue;
    const center=(box[1]+box[3])/2;
    const col=columns.filter(x=>x<=center+3).at(-1);
    if(col===undefined)continue;
    const candidates=anchors.filter(a=>Math.abs(a.x-col)<12&&a.y<=box[0]+4).sort((a,b)=>b.y-a.y);
    const owner=candidates[0];if(!owner||!keys.has(Number(owner.number)))continue;
    const next=anchors.filter(a=>Math.abs(a.x-col)<12&&a.y>owner.y).sort((a,b)=>a.y-b.y)[0];
    const right=columns.find(x=>x>col+12)||viewport.width;
    // Never rescue an ambiguous image by cutting it at a question/column edge.
    // Reject it instead; a manual crop is safer than another question's picture.
    if(box[0]<owner.y-3||box[1]<col-3||box[3]>right-3||(next&&box[2]>next.y))continue;
    // Minimal padding preserves neighboring prose instead of capturing the box.
    const padded=[Math.max(0,owner.y-3,box[0]-3),Math.max(0,col-3,box[1]-3),Math.min(next?.y||viewport.height,box[2]+3),Math.min(right-3,box[3]+3)];
    const cell=cells.find(c=>box[0]>=c[0]-1&&box[1]>=c[1]-1&&box[2]<=c[2]+1&&box[3]<=c[3]+1);
    if(cell)for(let i=0;i<4;i++)padded[i]=i<2?Math.max(padded[i],cell[i]+.8):Math.min(padded[i],cell[i]-.8);
    figures.push({question:keys.get(Number(owner.number)),page:pageNumber,limits:cell||[Math.max(0,owner.y-3),Math.max(0,col-3),next?.y||viewport.height,right-3],box:padded.map((v,i)=>v/(i%2?viewport.width:viewport.height)*1000),label:'PDF 그림',inverted:true,origin:'pdf'});
  }
  // PDFs often store a single illustration as adjacent horizontal image strips.
  // Rejoin those strips before capturing so the illustration is not fragmented.
  const merged=[];
  for(const figure of figures){
    let current=figure,changed=true;
    while(changed){
      changed=false;
      for(let i=0;i<merged.length;i++){
        const other=merged[i];if(other.question!==current.question)continue;
        const a=current.box,b=other.box;
        const ox=Math.min(a[3],b[3])-Math.max(a[1],b[1]),oy=Math.min(a[2],b[2])-Math.max(a[0],b[0]);
        const vertical=ox>=.75*Math.min(a[3]-a[1],b[3]-b[1])&&oy>=-5;
        const horizontal=oy>=.75*Math.min(a[2]-a[0],b[2]-b[0])&&ox>=-5;
        if(vertical||horizontal){current={...current,box:[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])]};merged.splice(i,1);changed=true;break;}
      }
    }
    merged.push(current);
  }
  return separateCaptions(includeLabels(merged,items,viewport),items,viewport);
}
export async function verifyFigureOwnership(session,figures,questions) {
  const cache=new Map(),accepted=[];
  for(const figure of figures){
    if(!cache.has(figure.page)){
      const page=await session.pdf.getPage(figure.page);
      cache.set(figure.page,{viewport:page.getViewport({scale:1}),items:(await page.getTextContent()).items});
    }
    const {viewport,items}=cache.get(figure.page);
    const box=figure.box.map((v,i)=>v/1000*(i%2?viewport.width:viewport.height));
    const assigned=assignBoxes([box],items,viewport,questions,figure.page);
    if(assigned.length===1&&Number(assigned[0].question)===Number(figure.question))accepted.push(figure);
  }
  return accepted;
}
export function tableGrids(operators,OPS,viewport){
  let matrix=[1,0,0,1,0,0];const stack=[],lines=[];
  const point=(x,y)=>viewport.convertToViewportPoint(matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]);
  const line=(a,b)=>{const p=point(...a),q=point(...b);if(Math.abs(p[0]-q[0])<.8&&Math.abs(p[1]-q[1])>=12)lines.push([Math.min(p[1],q[1]),p[0],Math.max(p[1],q[1]),p[0]]);else if(Math.abs(p[1]-q[1])<.8&&Math.abs(p[0]-q[0])>=12)lines.push([p[1],Math.min(p[0],q[0]),p[1],Math.max(p[0],q[0])]);};
  for(let i=0;i<operators.fnArray.length;i++){
    const fn=operators.fnArray[i],a=operators.argsArray[i];
    if(fn===OPS.save)stack.push([...matrix]);else if(fn===OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0];
    else if(fn===OPS.transform)matrix=multiply(matrix,a);
    else if(fn===OPS.paintFormXObjectBegin){stack.push([...matrix]);if(a[0])matrix=multiply(matrix,a[0]);}
    else if(fn===OPS.paintFormXObjectEnd)matrix=stack.pop()||[1,0,0,1,0,0];
    else if(fn===OPS.constructPath&&[OPS.stroke,OPS.closeStroke,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(a[0])){
      const data=Array.from(a[1]?.[0]||[]);let p=[0,0],start=p;
      for(let j=0;j<data.length;){const op=data[j++];if(op===0){p=[data[j++],data[j++]];start=p;}else if(op===1){const q=[data[j++],data[j++]];line(p,q);p=q;}else if(op===2){j+=4;p=[data[j++],data[j++]];}else if(op===3){j+=2;p=[data[j++],data[j++]];}else if(op===4){line(p,start);p=start;}else break;}
    }
  }
  // Connected grid rules, rather than a rectangular passage border, identify tables.
  const groups=[];
  for(const l of lines){let g=[l],changed=true;while(changed){changed=false;for(let i=0;i<groups.length;i++)if(g.some(a=>groups[i].some(b=>gap(a,b).every(d=>d<=1.5)))){g.push(...groups.splice(i,1)[0]);changed=true;break;}}groups.push(g);}
  const unique=values=>values.sort((a,b)=>a-b).filter((v,i,a)=>!i||v-a[i-1]>2);
  return groups.flatMap(g=>{
    const b=g.reduce(union),w=b[3]-b[1],h=b[2]-b[0];
    if(w<35||h<18||w>viewport.width*.9||h>viewport.height*.55)return [];
    const horizontal=g.filter(l=>l[3]-l[1]>w*.55),vertical=g.filter(l=>l[2]-l[0]>h*.55);
    const rows=unique(g.filter(l=>l[3]-l[1]>=12).map(l=>l[0])),cols=unique(g.filter(l=>l[2]-l[0]>=12).map(l=>l[1]));
    return horizontal.length>=2&&vertical.length>=2&&rows.length>=2&&cols.length>=2&&(rows.length>=3||cols.length>=3)?[{box:b,lines:g,ys:rows,xs:cols}]:[];
  });
}
export async function findPdfFigures(session,questions,OPS,signal,onProgress=()=>{}) {
  const figures=[];
  for(let n=1;n<=session.pdf.numPages;n++){
    if(signal?.aborted)throw new DOMException('취소됨','AbortError');
    onProgress(`PDF ${n}/${session.pdf.numPages}쪽의 그림을 찾는 중…`);
    const page=await session.pdf.getPage(n),viewport=page.getViewport({scale:1});
    const [ops,text]=await Promise.all([page.getOperatorList(),page.getTextContent()]);
    const cells=questions.flatMap(q=>(q.blocks||[]).filter(b=>b.kind==='table'&&b.sourcePage===n).flatMap(b=>(b.cells||[]).filter(c=>c.sourceBox).map(c=>c.sourceBox.map((v,i)=>v/1000*(i%2?viewport.width:viewport.height)))));
    const rasters=imageBoxes(ops,OPS,viewport);
    const vectors=vectorBoxes(ops,OPS,viewport,text.items,cells).filter(b=>!rasters.some(r=>b[0]>=r[0]-3&&b[1]>=r[1]-3&&b[2]<=r[2]+3&&b[3]<=r[3]+3));
    figures.push(...assignBoxes([...rasters,...vectors,...textDiagramBoxes(text.items,viewport)],text.items,viewport,questions,n,cells));
  }
  return figures.sort((a,b)=>Number(a.question)-Number(b.question)||a.page-b.page||(Math.min(a.box[2],b.box[2])-Math.max(a.box[0],b.box[0])<.5*Math.min(a.box[2]-a.box[0],b.box[2]-b.box[0])&&Math.abs(a.box[0]-b.box[0])>8?a.box[0]-b.box[0]:a.box[1]-b.box[1]));
}
