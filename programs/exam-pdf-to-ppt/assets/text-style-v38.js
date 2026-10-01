// Normalize list markers, not circles used as scientific symbols.
export function normalizeListMarkers(text){
  return String(text).replace(/(^|\n|[.!?。\]](?:<\/(?:u|sup|sub)>)*[ \t]*)[ \t]*[○◯◦][ \t]+(?=[가-힣])(?![은는이가을를의와과도](?:[ \t]|$))/g,
    (_,boundary)=>boundary+'• ');
}

export function repairScientificTags(value){
 const stack=[];let out='';
 const closeTo=index=>{while(stack.length>index)out+='</'+stack.pop()+'>';};
 for(const token of String(value).split(/(<\/?(?:sup|sub|u)>)/g)){
  const m=token.match(/^<(\/?)(sup|sub|u)>$/);
  if(!m){out+=token;continue;}
  const tag=m[2];
  if(m[1]){const i=stack.lastIndexOf(tag);if(i>=0)closeTo(i);}
  else{if(tag!=='u'){const i=stack.findIndex(t=>t==='sup'||t==='sub');if(i>=0)closeTo(i);}stack.push(tag);out+=token;}
 }
 closeTo(0);return out;
}
