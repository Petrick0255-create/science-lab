const atom=String.raw`(?:\([^()\n]+\)|\d+(?:[.,]\d+)?(?:[ \u00a0]\d{3}(?!\d))*)`;
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
export const pictureBrightnessFilter='invert(1) brightness(0.6) invert(1)';
export function applyPictureBrightness(xml){
 return xml.replace(/<p:pic>[\s\S]*?<\/p:pic>/g,pic=>{
  if(!/name="(?:question-image-|table-picture-)/.test(pic))return pic;
  return pic.replace(/<a:blip\b([^>]*?)(?:\/>|>([\s\S]*?)<\/a:blip>)/g,(_,attrs,body='')=>`<a:blip${attrs}>${body.replace(/<a:lum\b[^>]*\/>/g,'')}<a:lum bright="40000" contrast="0"/></a:blip>`);
 });
}
