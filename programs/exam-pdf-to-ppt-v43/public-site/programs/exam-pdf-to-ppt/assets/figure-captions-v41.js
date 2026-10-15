export function separateCaptions(figures,items,viewport){
 let text=items.filter(t=>t.str?.trim()).map(t=>{const[x,y]=viewport.convertToViewportPoint(t.transform[4],t.transform[5]);return {text:t.str.trim(),x,y,w:t.width,h:t.height};});
 const removed=new Set(),joined=[];
 for(const t of text.filter(t=>/^[가-하]$/.test(t.text))){
  const left=text.find(o=>o.text==='('&&Math.abs(o.y-t.y)<t.h*.3&&Math.abs(o.x+o.w-t.x)<t.h*.5),right=text.find(o=>o.text===')'&&Math.abs(o.y-t.y)<t.h*.3&&Math.abs(t.x+t.w-o.x)<t.h*.5);
  if(left&&right){[left,t,right].forEach(o=>removed.add(o));joined.push({...t,text:'('+t.text+')',x:left.x,w:right.x+right.w-left.x});}
 }
 text=[...text.filter(t=>!removed.has(t)),...joined];
 return figures.map(f=>{
  const b=f.box.map((v,i)=>v/1000*(i%2?viewport.width:viewport.height));
  const labels=text.filter(t=>/^\([가-하]\)$/.test(t.text)&&t.x+t.w/2>=b[1]&&t.x+t.w/2<=b[3]&&t.y>=b[0]+(b[2]-b[0])*.55&&t.y<=b[2]+t.h*1.5);
  if(!labels.length)return f;
  const last=Math.max(...labels.map(t=>t.y)),row=labels.filter(t=>Math.abs(t.y-last)<t.h*.55).sort((a,b)=>a.x-b.x),top=Math.min(...row.map(t=>t.y-t.h));
  // Do not cut through other text in the same bottom band.
  if(text.some(t=>!row.includes(t)&&t.x+t.w/2>b[1]&&t.x+t.w/2<b[3]&&t.y>top&&t.y<b[2]))return f;
  const bottom=Math.min(b[2],top-2);if(bottom<=b[0]+4)return f;
  return {...f,box:[f.box[0],f.box[1],bottom/viewport.height*1000,f.box[3]],captions:row.map(t=>({text:t.text,center:(t.x+t.w/2-b[1])/(b[3]-b[1])}))};
 });
}
export function placeCaptions(figure){
 const captions=figure.captions||[];
 return captions.map((c,i)=>{const left=i?(captions[i-1].center+c.center)/2:0,right=i<captions.length-1?(c.center+captions[i+1].center)/2:1;
  const w=Math.max(.4,figure.w*(right-left));return {text:c.text,x:figure.x+figure.w*c.center-w/2,y:figure.y+figure.h+.05,w,h:.35};
 });
}
