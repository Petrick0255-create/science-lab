import {renderGraph,encodeSpec,decodeSpec,peakPoints} from './graph-core.mjs';
import {PRESETS,getPreset} from './presets.mjs';
const $=id=>document.getElementById(id), copy=v=>structuredClone(v);
const STORE='jnb-graph-studio-v2'; let spec=getPreset('weather'), result, pi=0, si=0, yi=0, past=[], future=[];
const panel=()=>spec.panels[pi];
const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
const value=id=>$(id).value, num=id=>{if(!value(id).trim())throw new Error('숫자 입력칸이 비어 있습니다.');return Number(value(id));};
function options(id,items,selected){const el=$(id);el.replaceChildren(...items.map(([val,label])=>{const op=document.createElement('option');op.value=val;op.textContent=label;return op;}));el.value=selected;}
function readTicks(text){if(!text.trim())return [];return text.split(',').map(part=>{const [v,...label]=part.trim().split(':');if(!v.trim()||!Number.isFinite(Number(v)))throw new Error('눈금은 1, 2 또는 1:t_1 형식으로 입력하세요.');return label.length?{value:Number(v),label:label.join(':')}:Number(v);});}
const tickText=ticks=>ticks.map(t=>typeof t==='number'?t:t.label===String(t.value)?t.value:`${t.value}:${t.label}`).join(', ');
function fillControls(){
  pi=Math.min(pi,spec.panels.length-1);si=Math.max(0,Math.min(si,panel().series.length-1));yi=Math.min(yi,panel().y.length-1);
  for(const id of ['title','width','height','fontSize','font'])$(id).value=spec[id];
  options('panel',spec.panels.map((p,i)=>[i,p.caption||`패널 ${i+1}`]),pi);
  for(const id of ['caption','frame','grid','legend'])$(id).value=panel()[id];
  options('yAxis',panel().y.map((a,i)=>[i,`${i+1}축 · ${a.label||'이름 없음'}`]),yi);
  for(const [prefix,a] of [['x',panel().x],['y',panel().y[yi]]]){
    for(const key of ['Label','Unit','Min','Max'])$(prefix+key).value=a[key.toLowerCase()];
    $(prefix+'Ticks').value=tickText(a.ticks);$(prefix+'Break').checked=a.break;
  }
  $('yVertical').checked=panel().y[yi].vertical;
  options('series',panel().series.map((s,i)=>[i,s.name||`자료 ${i+1}`]),si);
  options('seriesAxis',panel().y.map((a,i)=>[i,`${i+1}축 · ${a.label}`]),0);
  const s=panel().series[si];
  if(s){for(const key of ['Name','Axis','Type','Line','Marker','Color'])$('series'+key).value=s[key.toLowerCase()];$('seriesTrend').checked=s.trend;$('data').value=s.points.map(p=>p.join(', ')).join('\n');}
  else{$('data').value='';$('seriesName').value='';}
  ['applyData','applyPeak','removeSeries','seriesName','seriesAxis','seriesType','seriesLine','seriesMarker','seriesColor','seriesTrend','data'].forEach(id=>$(id).disabled=!s);
  $('subFontSize').value=spec.subFontSize??'';$('printWidth').value=spec.print?.widthMm??'';$('printPt').value=spec.print?.textPt??'';
  $('printInfo').textContent=result?.print?`문서에 넣으면 폭 ${result.print.widthMm} mm · 높이 약 ${result.print.heightMm} mm, 본문 ${result.print.textPt} pt · 가장 작은 글자 ${result.print.smallestPt} pt`:'한글에 넣을 폭과 원하는 글자 크기를 적으면 글자 크기를 자동으로 맞춥니다.';
  $('spec').value=JSON.stringify(spec,null,2);$('undo').disabled=!past.length;$('redo').disabled=!future.length;
}
function show(res,controls=true){
  result=res;spec=res.spec;$('preview').innerHTML=res.svg;$('previewTitle').textContent=spec.title||'미리보기';
  $('warnings').replaceChildren(...res.warnings.map(w=>{const li=document.createElement('li');li.textContent=w;return li;}));
  $('stats').textContent=[...res.regressions.map(r=>`패널 ${r.panel+1} · 자료 ${r.series+1} 추세선: y = ${r.slope.toPrecision(4)}x ${r.intercept<0?'−':'+'} ${Math.abs(r.intercept).toPrecision(4)} · R² = ${r.rSquared.toFixed(4)} · ${r.n}개 좌표`),...(res.areas||[]).map(a=>`패널 ${a.panel+1} · ${a.name||`자료 ${a.series+1}`} 그래프 아래 넓이: ${Number(a.area.toPrecision(4))}${a.unit?` ${a.unit}`:''}`)].join(' / ');
  try{localStorage.setItem(STORE,JSON.stringify(spec));}catch{status('브라우저 저장 공간을 사용할 수 없습니다. 작업 파일로 저장해 주세요.');}
  if(controls)fillControls();
}
function commit(change,message='미리보기에 반영했습니다.'){
  const next=copy(spec);try{change(next);const res=renderGraph(next);past.push(copy(spec));if(past.length>25)past.shift();future=[];show(res);status(message);}catch(e){status(e.message,true);}
}
function bind(id,change){$(id).addEventListener('change',()=>commit(change));}
for(const id of ['title','font'])bind(id,s=>s[id]=value(id));
for(const id of ['width','height'])bind(id,s=>s[id]=num(id));
bind('fontSize',s=>{s.fontSize=num('fontSize');delete s.print;});
bind('subFontSize',s=>{if(s.print)delete s.print.subPt;if(value('subFontSize').trim())s.subFontSize=num('subFontSize');else delete s.subFontSize;});
for(const id of ['printWidth','printPt'])$(id).addEventListener('change',()=>{const w=value('printWidth').trim(),pt=value('printPt').trim();if(w&&pt)commit(s=>{s.print={widthMm:num('printWidth'),textPt:num('printPt'),...(s.print?.subPt!==undefined?{subPt:s.print.subPt}:{})};},'문서 크기에 맞춰 글자 크기를 바꿨습니다.');else if(!w&&!pt)commit(s=>{delete s.print;});else status('문서에 넣을 폭(mm)과 글자(pt)를 모두 입력하면 반영됩니다.');});
for(const id of ['caption','frame','grid','legend'])bind(id,s=>s.panels[pi][id]=value(id));
for(const prefix of ['x','y'])for(const key of ['Label','Unit','Min','Max','Ticks','Break']){
  const id=prefix+key;bind(id,s=>{const a=prefix==='x'?s.panels[pi].x:s.panels[pi].y[yi];a[key.toLowerCase()]=key==='Break'?$(id).checked:key==='Ticks'?readTicks(value(id)):['Min','Max'].includes(key)?num(id):value(id);});
}
bind('yVertical',s=>s.panels[pi].y[yi].vertical=$('yVertical').checked);
for(const key of ['Name','Axis','Type','Line','Marker','Color','Trend'])bind('series'+key,s=>{if(!s.panels[pi].series[si])return;s.panels[pi].series[si][key.toLowerCase()]=key==='Trend'?$('seriesTrend').checked:key==='Axis'?Number(value('seriesAxis')):value('series'+key);});
$('panel').onchange=()=>{pi=Number(value('panel'));si=yi=0;fillControls();};$('yAxis').onchange=()=>{yi=Number(value('yAxis'));fillControls();};$('series').onchange=()=>{si=Number(value('series'));fillControls();};
$('addPanel').onclick=()=>commit(s=>{if(s.panels.length>=3)throw new Error('패널은 최대 3개입니다.');s.panels.push(copy(s.panels[pi]));s.panels.at(-1).caption=`(${['가','나','다'][s.panels.length-1]})`;s.width=Math.min(1800,Math.max(s.width,s.panels.length*560));},'패널을 복제했습니다. 편집할 패널에서 선택하세요.');
$('addAxis').onclick=()=>commit(s=>{const p=s.panels[pi];if(p.y.length>=3)throw new Error('세로축은 최대 3개입니다.');p.y.push({min:0,max:100,label:'보조축',unit:'',ticks:[0,50,100]});});
$('addSeries').onclick=()=>commit(s=>{const p=s.panels[pi];p.series.push({name:`자료 ${p.series.length+1}`,points:[[p.x.min,p.y[0].min],[p.x.max,p.y[0].max]]});},'자료를 추가했습니다. 자료 목록에서 선택하세요.');
$('removeSeries').onclick=()=>commit(s=>{s.panels[pi].series.splice(si,1);});
export function parseData(text){const rows=text.trim().split(/\r?\n/).filter(x=>x.trim());let data=[];rows.forEach((r,i)=>{const cols=r.trim().split(/[\t,;]+/).map(x=>x.trim());if(i===0&&cols.length===2&&cols.every(x=>x&&!Number.isFinite(Number(x))))return;if(cols.length!==2||cols.some(x=>!x||!Number.isFinite(Number(x))))throw new Error(`데이터 ${i+1}행: x와 y 숫자 두 개를 입력하세요.`);data.push(cols.map(Number));});if(!data.length)throw new Error('좌표를 하나 이상 입력하세요.');return data;}
$('applyData').onclick=()=>commit(s=>s.panels[pi].series[si].points=parseData(value('data')));
$('applyPeak').onclick=()=>commit(s=>{const from=num('peakFrom'),to=num('peakTo');if(to<=from)throw new Error('봉우리 끝 x는 시작 x보다 커야 합니다.');const ser=s.panels[pi].series[si];ser.points=peakPoints(from,to,num('peakMax'));ser.type='line';},'봉우리 곡선으로 바꿨습니다.');
$('addBand').onclick=()=>commit(s=>s.panels[pi].bands.push({from:num('bandFrom'),to:num('bandTo'),shade:.13,label:''}));
$('addMark').onclick=()=>commit(s=>s.panels[pi].annotations.push({type:'vline',x:num('markX'),label:value('markLabel')}));
$('clearBands').onclick=()=>commit(s=>s.panels[pi].bands=[]);$('clearMarks').onclick=()=>commit(s=>s.panels[pi].annotations=[]);
$('applySpec').onclick=()=>{let parsed;try{parsed=JSON.parse(value('spec'));}catch{status('JSON 형식을 확인해 주세요. 마지막으로 반영한 그래프는 유지됩니다.',true);return;}commit(s=>{Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,parsed);},'그래프 설정을 불러왔습니다.');};
$('undo').onclick=()=>{if(!past.length)return;future.push(copy(spec));show(renderGraph(past.pop()));status('이전 상태로 되돌렸습니다.');};
$('redo').onclick=()=>{if(!future.length)return;past.push(copy(spec));show(renderGraph(future.pop()));status('다시 적용했습니다.');};
for(const p of PRESETS){const b=document.createElement('button');const title=document.createElement('b');title.textContent=p.name;const note=document.createElement('small');note.textContent=p.note;b.append(title,note);b.onclick=()=>{commit(s=>{Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,getPreset(p.id));},'예시를 불러왔습니다. 수치는 형태 설명용 합성 데이터입니다.');document.querySelectorAll('.preset-list button').forEach(el=>el.classList.toggle('active',el===b));};$('presetList').append(b);}
const filename=()=> (spec.title||'science-graph').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,60);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);}
async function clipboard(text){try{await navigator.clipboard.writeText(text);status('복사했습니다.');}catch{status('복사 권한이 없습니다. 안내나 설정을 직접 선택해 복사해 주세요.',true);}}
$('saveSvg').onclick=()=>download(new Blob([result.svg],{type:'image/svg+xml;charset=utf-8'}),filename()+'.svg');
$('saveJson').onclick=()=>download(new Blob([JSON.stringify(spec,null,2)],{type:'application/json;charset=utf-8'}),filename()+'.json');
$('copySpec').onclick=()=>clipboard(JSON.stringify(spec,null,2));
$('loadJson').onclick=()=>$('file').click();$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;try{if(file.size>250000)throw new Error('작업 파일은 250 KB 이내여야 합니다.');const data=JSON.parse(await file.text());commit(s=>{Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,data);},'작업 파일을 불러왔습니다.');}catch(e){status(e.message,true);}finally{$('file').value='';}};
$('savePng').onclick=async()=>{try{await document.fonts.ready;const scale=Math.min(3,4096/spec.width,4096/spec.height),c=document.createElement('canvas');c.width=Math.round(spec.width*scale);c.height=Math.round(spec.height*scale);const image=new Image(),url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});c.getContext('2d').drawImage(image,0,0,c.width,c.height);const b=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!b)throw new Error('PNG 변환에 실패했습니다.');download(b,filename()+'.png');status('PNG 파일을 저장했습니다.');}finally{URL.revokeObjectURL(url);}}catch(e){status(e.message||'PNG 변환에 실패했습니다.',true);}};
$('print').onclick=()=>{const win=window.open('','_blank');if(!win){status('인쇄 창을 열려면 팝업을 허용해 주세요.',true);return;}win.document.write(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>그래프 인쇄</title><style>@page{margin:15mm}body{margin:0}svg{width:100%;height:auto;max-height:95vh}</style><body>${result.svg}</body></html>`);win.document.close();win.document.fonts.ready.then(()=>{if(!win.closed)win.print();});};
$('share').onclick=()=>{const token=encodeSpec(spec);if(token.length>20000){status('이 그래프는 링크가 길어질 수 있습니다. 작업 파일로 전달해 주세요.',true);return;}clipboard(location.origin+location.pathname+'#spec='+token);};
const base=location.origin+'/programs/graph-maker/';const mcp=base+'mcp';$('mcpUrl').textContent=mcp;$('codeCommand').textContent=`claude mcp add --transport http science-graph ${mcp}`;
$('connectBtn').onclick=()=>{$('connection').hidden=false;$('connection').scrollIntoView({behavior:'smooth'});};$('closeConnect').onclick=()=>$('connection').hidden=true;
$('copyMcp').onclick=()=>clipboard(mcp);$('copyCommand').onclick=()=>clipboard($('codeCommand').textContent);
$('copyGuide').onclick=async()=>{try{const r=await fetch('./claude-guide.txt');if(!r.ok)throw new Error('안내를 불러오지 못했습니다.');await clipboard(await r.text());}catch(e){status(e.message,true);}};
let initialError='';
try{if(location.hash.startsWith('#spec='))spec=decodeSpec(location.hash.slice(6));else{const saved=localStorage.getItem(STORE);if(saved)spec=JSON.parse(saved);}show(renderGraph(spec));}catch(e){initialError=e.message;show(renderGraph(getPreset('weather')));}
status(initialError?`불러오지 못한 설정: ${initialError}`:'그래프를 편집하거나 Claude가 만든 작업 파일을 열어 주세요.',!!initialError);
window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#spec='))try{const data=decodeSpec(location.hash.slice(6));commit(s=>{Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,data);},'편집 링크의 그래프를 불러왔습니다.');}catch(e){status(e.message,true);}});
