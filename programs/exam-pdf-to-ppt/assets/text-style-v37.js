// Normalize list markers, not circles used as scientific symbols.
export function normalizeListMarkers(text){
  return String(text).replace(/(^|\n|[.!?。\]](?:<\/(?:u|sup|sub)>)*[ \t]*)[ \t]*[○◯◦][ \t]+(?=[가-힣])(?![은는이가을를의와과도](?:[ \t]|$))/g,
    (_,boundary)=>boundary+'• ');
}
