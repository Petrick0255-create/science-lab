// Detect embedded PDF images directly: no model request or mock coordinates.
function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
export function imageBoxes(operators,OPS,viewport) {
  let matrix=[1,0,0,1,0,0];const stack=[],boxes=[];
  const add=()=>{
    const pts=[[0,0],[1,0],[0,1],[1,1]].map(([x,y])=>viewport.convertToViewportPoint(matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]));
    const box=[Math.min(...pts.map(p=>p[1])),Math.min(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0]))];
    const w=box[3]-box[1],h=box[2]-box[0];
    if(w>=8&&h>=8&&w*h<viewport.width*viewport.height*.65)boxes.push(box);
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
export function assignBoxes(boxes,items,viewport,questions,pageNumber) {
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
    if(inlineSymbol(box))continue;
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
    figures.push({question:keys.get(Number(owner.number)),page:pageNumber,box:padded.map((v,i)=>v/(i%2?viewport.width:viewport.height)*1000),label:'PDF 그림',inverted:true,origin:'pdf'});
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
  return merged;
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
export async function findPdfFigures(session,questions,OPS,signal,onProgress=()=>{}) {
  const figures=[];
  for(let n=1;n<=session.pdf.numPages;n++){
    if(signal?.aborted)throw new DOMException('취소됨','AbortError');
    onProgress(`PDF ${n}/${session.pdf.numPages}쪽의 그림을 찾는 중…`);
    const page=await session.pdf.getPage(n),viewport=page.getViewport({scale:1});
    const [ops,text]=await Promise.all([page.getOperatorList(),page.getTextContent()]);
    figures.push(...assignBoxes(imageBoxes(ops,OPS,viewport),text.items,viewport,questions,n));
  }
  return figures;
}
