const atom=String.raw`(?:\([^()\n]+\)|(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?:[ \u00a0]\d{3}(?!\d))*)`;
export function fractionMatches(text){return [...text.matchAll(new RegExp('('+atom+')'+String.raw`\s*[/⁄]\s*`+'('+atom+')','g'))];}
const unparen=s=>s.startsWith('(')&&s.endsWith(')')?s.slice(1,-1):s;
export function fractionColorRuns(runs){
 const text=runs.map(r=>r.text).join(''),matches=fractionMatches(text);if(!matches.length)return runs;
 let offset=0;const located=runs.map(r=>{const start=offset;offset+=r.text.length;return {...r,start,end:offset};}),out=[];
 const copy=(a,b)=>{for(const r of located){const lo=Math.max(a,r.start),hi=Math.min(b,r.end);if(hi>lo)out.push({...r,text:r.text.slice(lo-r.start,hi-r.start)});}};
 let cursor=0;for(const m of matches){copy(cursor,m.index);const base=located.find(r=>r.start<=m.index&&r.end>m.index)||{};out.push({...base,text:m[0],fraction:{numerator:unparen(m[1]),denominator:unparen(m[2])}});cursor=m.index+m[0].length;}copy(cursor,text.length);return out;
}
export function fractionView(React,text){return fractionColorRuns([{text}]).map((r,i)=>r.fraction?React.createElement('span',{key:i,className:'stacked-fraction'},React.createElement('span',null,r.fraction.numerator),React.createElement('span',null,r.fraction.denominator)):r.text);}
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const decode=s=>s.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');
export function applyFractionMath(xml){
 return xml.replace(/<a:r>([\s\S]*?)<\/a:r>/g,(run,inner)=>{
 const t=inner.match(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/);if(!t)return run;
 const text=decode(t[1]),matches=fractionMatches(text);if(!matches.length)return run;
 const props=inner.match(/<a:rPr\b[^>]*(?:\/>|>[\s\S]*?<\/a:rPr>)/)?.[0]||'<a:rPr sz="2400"/>';
 const plain=s=>s?'<a:r>'+props+'<a:t>'+esc(s)+'</a:t></a:r>':'';
 const math=s=>'<m:r><m:rPr><m:sty m:val="p"/></m:rPr>'+props+'<m:t>'+esc(unparen(s))+'</m:t></m:r>';
 let cursor=0,out='';for(const m of matches){out+=plain(text.slice(cursor,m.index));out+='<a14:m xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main"><m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:f><m:fPr><m:type m:val="bar"/><m:ctrlPr>'+props+'</m:ctrlPr></m:fPr><m:num>'+math(m[1])+'</m:num><m:den>'+math(m[2])+'</m:den></m:f></m:oMath></a14:m>';cursor=m.index+m[0].length;}return out+plain(text.slice(cursor));
 });
}

// Transfer table measured from PowerPoint PictureEffects brightness +40%, contrast 0%.
const brightness40=[0, 2, 4, 7, 9, 11, 13, 15, 17, 20, 22, 24, 26, 28, 31, 33, 35, 37, 39, 42, 44, 46, 48, 50, 52, 55, 57, 59, 61, 63, 66, 68, 70, 72, 74, 76, 79, 81, 83, 85, 87, 90, 92, 94, 96, 98, 101, 103, 105, 107, 109, 111, 114, 116, 118, 120, 122, 124, 126, 127, 129, 130, 132, 133, 135, 136, 137, 139, 140, 142, 143, 145, 146, 147, 149, 150, 152, 153, 155, 156, 157, 159, 160, 162, 163, 164, 166, 167, 168, 170, 171, 173, 174, 175, 177, 178, 179, 181, 182, 184, 185, 186, 188, 189, 190, 192, 193, 194, 196, 197, 198, 200, 201, 202, 204, 205, 206, 208, 209, 210, 212, 213, 214, 216, 217, 218, 220, 221, 222, 224, 225, 226, 228, 229, 230, 232, 233, 234, 236, 237, 238, 239, 241, 242, 243, 245, 246, 247, 249, 250, 251, 252, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255];
export function brightenPixels(data){for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)data[i+c]=brightness40[data[i+c]];return data;}
export const pictureBrightnessFilter='none';
// Pixels are already corrected using the measured Office curve. Do not add
// legacy luminance or apply a second brightness correction on export.
export function applyPictureBrightness(xml){return xml.replace(/<a:lum\b[^>]*\/>/g,'');}
export async function storePictureOriginals(zip,path,xml,plan){
 const images=[...(plan.images||[]),...(plan.body?.groups||[]).flatMap(g=>g.tableFigures||[])],ids={};
 const relPath=path.replace('/slides/','/slides/_rels/')+'.rels';let rel=await zip.file(relPath).async('string'),index=0;
 for(const pic of xml.match(/<p:pic>[\s\S]*?<\/p:pic>/g)||[]){const name=pic.match(/name="((?:question-image-|table-picture-)[^"]+)"/)?.[1];if(!name)continue;
 const image=images.find(i=>name.endsWith('-'+i.id));if(!image?.originalData)continue;
 const rid='rIdOriginal'+(++index),file='original-'+path.match(/slide(\d+)/)[1]+'-'+index+'.png';ids[name]=rid;
 zip.file('ppt/media/'+file,image.originalData.split(',')[1],{base64:true});rel=rel.replace('</Relationships>','<Relationship Id="'+rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/'+file+'"/></Relationships>');
 }zip.file(relPath,rel);return ids;
}
