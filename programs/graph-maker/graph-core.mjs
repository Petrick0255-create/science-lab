// Shared, deterministic renderer: browser, Worker and command-line use this file.
export const VERSION = '2.1.0';
export const PT_MM = 25.4 / 72;   // 1 pt = 0.3528 mm
const fail = message => { throw new Error(message); };
const finite = (v, name, min=-1e12, max=1e12) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(`${name}: ${min}~${max} 범위의 숫자가 필요합니다.`);
  return v;
};
const str = (v='', name='문자', max=120) => {
  if (typeof v !== 'string' || v.length > max) fail(`${name}: ${max}자 이내의 문자열이 필요합니다.`);
  return v;
};
const arr = (v, name, max) => { if (!Array.isArray(v) || v.length > max) fail(`${name}: 최대 ${max}개 배열이 필요합니다.`); return v; };
const obj = (v, name) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`${name}: 객체가 필요합니다.`); return v; };
const pick = (v, choices, name) => { if (!choices.includes(v)) fail(`${name}: ${choices.join(', ')} 중 선택하세요.`); return v; };
const bool = (v, fallback=false) => { if(v === undefined) return fallback; if(typeof v !== 'boolean') fail('켜기/끄기는 true 또는 false여야 합니다.'); return v; };
const colors = ['#111111','#555555','#888888','#aaaaaa'];
export const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fmt = n => Number(n.toFixed(3)).toString();
const scalar = (v,d,n,lo,hi) => finite(v ?? d,n,lo,hi);
function axis(v, name) {
  obj(v,name); const min=finite(v.min,`${name}.min`), max=finite(v.max,`${name}.max`);
  if(max-min < 1e-9) fail(`${name}: 최댓값은 최솟값보다 커야 합니다.`);
  const ticks=arr(v.ticks ?? [],`${name}.ticks`,60).map(t=> typeof t==='number' ? {value:finite(t,name),label:String(t)} : {value:finite(obj(t,name).value,name),label:str(t.label,name)});
  return {min,max,label:str(v.label),unit:str(v.unit),ticks,break:bool(v.break),vertical:bool(v.vertical,true),groups:arr(v.groups??[],`${name}.groups`,30).map(g=>({from:finite(g.from,name),to:finite(g.to,name),label:str(g.label)}))};
}
export function normalizeSpec(input) {
  obj(input,'그래프'); if(input.version!==1) fail('version은 1이어야 합니다.');
  const spec={version:1,title:str(input.title),description:str(input.description??'', '설명',1000),width:scalar(input.width,820,'너비',420,1800),height:scalar(input.height,520,'높이',300,1200),fontSize:scalar(input.fontSize,18,'글자 크기',10,30),font:pick(input.font??'serif',['serif','sans'],'글꼴'),panels:[]};
  // 범례·단위·음영 이름처럼 작게 쓰던 글자 크기. 지정하지 않으면 예전 비율(0.85~0.9)을 그대로 쓴다.
  if(input.subFontSize!==undefined)spec.subFontSize=scalar(input.subFontSize,0,'보조 글자 크기',8,30);
  // 한글·문서에 넣을 폭(mm)과 원하는 글자 크기(pt)로 fontSize를 계산한다.
  if(input.print!==undefined){
    const pr=obj(input.print,'인쇄 크기'),widthMm=finite(pr.widthMm,'print.widthMm(문서에 넣을 폭, mm)',20,400),textPt=finite(pr.textPt,'print.textPt(본문 글자, pt)',5,20);
    const subPt=pr.subPt===undefined?undefined:finite(pr.subPt,'print.subPt(보조 글자, pt)',5,20);
    const pxPerPt=PT_MM*spec.width/widthMm,fs=Math.round(textPt*pxPerPt*100)/100;
    if(fs<10||fs>30){const lo=Math.max(420,Math.ceil(10*widthMm/(textPt*PT_MM))),hi=Math.min(1800,Math.floor(30*widthMm/(textPt*PT_MM)));fail(`폭 ${widthMm} mm에 ${textPt} pt로 넣으려면 글자 크기가 ${fs}여야 해서 10~30을 벗어납니다. `+(lo<=hi?`그림 너비(width)를 ${lo}~${hi} 사이로 바꾸세요.`:'문서에 넣을 폭이나 글자 크기를 조정하세요.'));}
    spec.fontSize=fs;spec.print={widthMm,textPt,...(subPt!==undefined?{subPt}:{})};
    if(subPt!==undefined){const ss=Math.round(subPt*pxPerPt*100)/100;if(ss<8||ss>30)fail(`보조 글자 ${subPt} pt는 이 그림에서 ${ss}가 되어 8~30을 벗어납니다.`);spec.subFontSize=ss;}
  }
  let total=0;
  for (const [pi,p] of arr(input.panels,'panels',3).entries()) {
    obj(p,'패널'); const y=arr(p.y,'y축',3).map((a,i)=>axis(a,`패널 ${pi+1} y${i+1}`)); if(!y.length) fail('y축이 필요합니다.');
    const q={caption:str(p.caption),x:axis(p.x,'x축'),y,frame:pick(p.frame??'box',['box','arrows'],'축 모양'),grid:pick(p.grid??'none',['none','major','dense'],'격자'),legend:pick(p.legend??'top-right',['none','top-left','top-right','bottom-right','above'],'범례'),zeroLines:bool(p.zeroLines,true),series:[],bands:[],annotations:[]};
    for(const [si,s] of arr(p.series,'자료',12).entries()) {
      obj(s,'자료'); const points=arr(s.points,`자료 ${si+1} 좌표`,5000).map(pt=>{if(!Array.isArray(pt)||pt.length!==2)fail('좌표는 [x,y]입니다.');return [finite(pt[0],'x'),finite(pt[1],'y')];});
      if(!points.length) fail('자료마다 좌표가 하나 이상 필요합니다.'); total+=points.length;
      const a=scalar(s.axis,0,'자료의 y축',0,y.length-1); if(!Number.isInteger(a)) fail('axis는 정수입니다.');
      q.series.push({name:str(s.name),type:pick(s.type??'line',['line','scatter'],'자료 종류'),axis:a,points,line:pick(s.line??'solid',['solid','dash','dashdot','dot'],'선 모양'),color:pick(s.color??'#111111',colors,'선 색'),width:scalar(s.width,1.5,'선 굵기',.5,4),marker:pick(s.marker??'none',['none','circle','square','open','hidden'],'점 모양'),size:scalar(s.size,2.5,'점 크기',1,7),trend:bool(s.trend),trendLabel:str(s.trendLabel??'추세선'),trendLine:pick(s.trendLine??'solid',['solid','dash','dashdot','dot'],'추세선 모양'),fill:bool(s.fill)});
    }
    q.bands=arr(p.bands??[],'음영 구간',120).map(b=>{obj(b,'음영');if(b.to<=b.from)fail('음영 구간의 끝은 시작보다 커야 합니다.');return {from:finite(b.from,'음영 시작'),to:finite(b.to,'음영 끝'),shade:scalar(b.shade,.12,'음영 농도',.02,.4),label:str(b.label),legendLabel:str(b.legendLabel)};});
    q.annotations=arr(p.annotations??[],'표시',60).map(a=>{obj(a,'표시');const index=scalar(a.axis,0,'표시의 y축',0,y.length-1);if(!Number.isInteger(index))fail('axis는 정수입니다.');return {type:pick(a.type,['vline','hline','text','range'],'표시 종류'),x:scalar(a.x,0,'표시 x'),y:scalar(a.y,0,'표시 y'),to:scalar(a.to,a.x??0,'표시 끝'),axis:index,label:str(a.label),dx:scalar(a.dx,12,'표시 이동 x',-150,150),dy:scalar(a.dy,-14,'표시 이동 y',-150,150),leader:bool(a.leader),arrow:bool(a.arrow,true),labelPos:pick(a.labelPos??'right-above',['right-above','right-below','left-above','left-below'],'기준선 이름 위치')};});
    spec.panels.push(q);
  }
  if(!spec.panels.length) fail('패널이 하나 이상 필요합니다.'); if(total>12000) fail('한 그림의 좌표는 12,000개 이내로 입력하세요.');
  if(spec.panels.length>1 && spec.width/spec.panels.length<340) fail('여러 패널을 배치할 때는 패널당 너비를 340 이상 확보하세요.');
  return spec;
}
export function regression(points) {
  if(points.length<2) fail('추세선은 점이 두 개 이상 필요합니다.');
  const n=points.length, mx=points.reduce((a,p)=>a+p[0],0)/n, my=points.reduce((a,p)=>a+p[1],0)/n;
  let xx=0,xy=0,yy=0;for(const [x,y] of points){xx+=(x-mx)**2;xy+=(x-mx)*(y-my);yy+=(y-my)**2;}
  if(xx<=0) fail('모든 x값이 같아서 y에 대한 직선 추세선을 구할 수 없습니다.');
  const slope=xy/xx, intercept=my-slope*mx;
  return {n,slope,intercept,rSquared:yy>0?Math.max(0,Math.min(1,xy*xy/(xx*yy))):1};
}
export function encodeSpec(spec) {const bytes=new TextEncoder().encode(JSON.stringify(spec));let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export function decodeSpec(s) {if(s.length>300000)fail('공유 데이터가 너무 큽니다.');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));}
function rich(s) {
  // Only this small notation is parsed; arbitrary markup stays escaped text.
  return s.split(/([_^]\{[^{}]{1,30}\}|[_^][A-Za-z0-9])/g).map(t=>/^[_^]/.test(t)?`<tspan baseline-shift="${t[0]==='_'?'sub':'super'}" font-size="70%">${esc(t.slice(1).replace(/^\{|\}$/g,''))}</tspan>`:esc(t)).join('');
}
const dash = type => ({solid:'',dash:'7 4',dashdot:'8 3 2 3',dot:'1.3 3.2'}[type]);
const showPoints = s => s.marker!=='hidden'&&(s.marker!=='none'||s.type==='scatter');
// 글자 상자(box)가 선분이나 점과 겹치는지 검사한다.
function segHitsBox([x1,y1,x2,y2],b){
  let t0=0,t1=1;const dx=x2-x1,dy=y2-y1;
  for(const [pp,q] of [[-dx,x1-b.x],[dx,b.x+b.w-x1],[-dy,y1-b.y],[dy,b.y+b.h-y1]]){if(pp===0){if(q<0)return false;}else{const r=q/pp;if(pp<0){if(r>t1)return false;if(r>t0)t0=r;}else{if(r<t0)return false;if(r<t1)t1=r;}}}
  return true;
}
export function renderGraph(input) {
  const spec=normalizeSpec(input), warnings=[], regressions=[];
  let hash=2166136261;for(const c of VERSION+JSON.stringify(spec))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;const prefix='graph-'+hash.toString(36);
  const f=spec.fontSize, gap=22, pw=(spec.width-gap*(spec.panels.length-1))/spec.panels.length;
  const family=spec.font==='serif'?"'HCR Batang','Batang','Noto Serif CJK KR','Noto Serif KR',serif":"'Malgun Gothic','Noto Sans KR',sans-serif";
  const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc"><title id="${prefix}-title">${esc(spec.title||'과학 자료 그래프')}</title><desc id="${prefix}-desc">${esc(spec.description)}</desc><rect width="100%" height="100%" fill="white"/><g font-family="${esc(family)}" font-size="${f}" fill="#111111" stroke-linejoin="round" stroke-linecap="round">`];
  for(const [pi,p] of spec.panels.entries()){
    const estimate=(value,size=f)=>[...String(value).replace(/[_^]\{([^}]+)\}/g,'$1').replace(/[_^]/g,'')].reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.56)*size,0);
    const fsLegend=spec.subFontSize??f*.85, fsUnitLeft=spec.subFontSize??f*.9, fsUnit=spec.subFontSize??f*.85, fsBand=spec.subFontSize??f*.85;
    const leftAxis=p.y[0], labelWidth=Math.max(f,leftAxis.vertical?f:estimate(leftAxis.label),leftAxis.unit?estimate(`(${leftAxis.unit})`,fsUnitLeft):0), tickWidth=Math.max(f,...leftAxis.ticks.map(t=>estimate(t.label)));
    const bandLegend=[...new Map(p.bands.filter(b=>b.legendLabel).map(b=>[b.legendLabel,b])).values()];
    const legendRows=p.series.reduce((n,s)=>n+(s.name?1:0)+(s.trend&&s.trendLabel?1:0),0)+bandLegend.length;
    const rightOffsets=[];let rightCursor=0;for(const a of p.y.slice(1)){rightOffsets.push(rightCursor);rightCursor+=a.vertical?130:90;}
    const rightMargin=p.y.length>1?rightOffsets.at(-1)+(p.y.at(-1).vertical?136:106):24;
    const off=pi*(pw+gap), T=p.legend==='above'?Math.max(68,legendRows*fsLegend*1.45+38):68, B=spec.height-100-(p.x.groups.length?24:0);
    let L=off+Math.max(76,labelWidth+tickWidth+24), R=off+pw-rightMargin;
    const ticksIn=(a)=>a.ticks.filter(t=>t.value>=a.min&&t.value<=a.max);
    // 가로축 눈금 이름(가운데 정렬)이 그림 가장자리 밖으로 나가지 않도록 그림 영역을 줄인다.
    for(let k=0;k<2;k++)for(const t of ticksIn(p.x)){
      const u=(t.value-p.x.min)/(p.x.max-p.x.min), hw=estimate(t.label)/2+3;
      if(u>0)R=Math.min(R,L+(off+pw-2-hw-L)/u);
      if(u<1)L=Math.max(L,(off+2+hw-u*R)/(1-u));
    }
    if(R-L<110)fail('축과 글자를 배치할 공간이 부족합니다. 그림 너비를 늘려 주세요.');
    const X=x=>L+(x-p.x.min)/(p.x.max-p.x.min)*(R-L), Y=(y,a=0)=>B-(y-p.y[a].min)/(p.y[a].max-p.y[a].min)*(B-T);
    const text=(x,y,value,anchor='middle',size=f)=>{const lines=String(value).split('\n');lines.forEach((line,i)=>out.push(`<text x="${fmt(x)}" y="${fmt(y+i*size*1.12)}" font-size="${size}" text-anchor="${anchor}">${rich(line)}</text>`));};
    const line=(x1,y1,x2,y2,width=1,color='#111111',style='solid')=>out.push(`<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}" stroke="${color}" stroke-width="${width}"${dash(style)?` stroke-dasharray="${dash(style)}"`:''}/>`);
    const point=(x,y,marker,size,color)=>out.push(marker==='square'?`<rect x="${fmt(x-size)}" y="${fmt(y-size)}" width="${size*2}" height="${size*2}" fill="${color}"/>`:`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${size}" fill="${marker==='open'?'white':color}" stroke="${color}" stroke-width="1"/>`);
    const arrow=(x,y,dir)=>{out.push(`<path d="M ${fmt(x)} ${fmt(y)} l ${dir==='up'?'-3.2 8':dir==='down'?'-3.2 -8':'-8 -3.2'} l ${dir==='up'?'6.4 0':dir==='down'?'6.4 0':'0 6.4'} Z" fill="#111111"/>`);};
    const axisY=p.frame==='arrows'&&p.y[0].min<=0&&p.y[0].max>=0?Y(0):B;
    const axisX=p.frame==='arrows'&&p.x.min<=0&&p.x.max>=0?X(0):L;
    const clip=`${prefix}-plot-${pi}`, segs=[], dots=[];
    const hitsData=b=>segs.some(sg=>segHitsBox(sg,b))||dots.some(([x,y,r])=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);
    const labelBox=(x,y,label,anchor='middle',size=f)=>{const lines=String(label).split('\n'),w=Math.max(...lines.map(l=>estimate(l,size))),x0=anchor==='middle'?x-w/2:anchor==='end'?x-w:x;return {x:x0+1,y:y-size*.78+1,w:w-2,h:size*(.98+1.12*(lines.length-1))-2};};
    out.push(`<defs><clipPath id="${clip}"><rect x="${L}" y="${T}" width="${R-L}" height="${B-T}"/></clipPath></defs>`);
    text((L+R)/2,32,p.caption);
    out.push(`<g clip-path="url(#${clip})">`);
    for(const b of p.bands)out.push(`<rect x="${fmt(X(b.from))}" y="${T}" width="${fmt(X(b.to)-X(b.from))}" height="${B-T}" fill="#000000" fill-opacity="${b.shade}"/>`);
    if(p.grid!=='none'){
      for(const t of ticksIn(p.x))line(X(t.value),T,X(t.value),B,.6,'#999999','dot');
      for(const t of ticksIn(p.y[0]))line(L,Y(t.value),R,Y(t.value),.6,'#999999','dot');
      if(p.grid==='dense'){
        const minor=a=>{const ts=ticksIn(a).map(t=>t.value).sort((a,b)=>a-b);return ts.slice(1).flatMap((t,i)=>[1,2,3,4].map(j=>ts[i]+(t-ts[i])*j/5));};
        minor(p.x).forEach(x=>line(X(x),T,X(x),B,.4,'#bbbbbb','dot'));minor(p.y[0]).forEach(y=>line(L,Y(y),R,Y(y),.4,'#bbbbbb','dot'));
      }
    }
    if(p.zeroLines){if(p.x.min<0&&p.x.max>0)line(X(0),T,X(0),B,.75,'#aaaaaa');if(p.y[0].min<0&&p.y[0].max>0)line(L,Y(0),R,Y(0),.75,'#aaaaaa');}
    for(const a of p.annotations){if(a.type==='vline')line(X(a.x),T,X(a.x),B,1,'#555555','dash');if(a.type==='hline')line(L,Y(a.y,a.axis),R,Y(a.y,a.axis),.9,'#777777','dash');}
    for(const [si,s] of p.series.entries()){
      const coords=s.points.map(([x,y])=>[X(x),Y(y,s.axis)]);
      if(s.points.some(([x,y])=>x<p.x.min||x>p.x.max||y<p.y[s.axis].min||y>p.y[s.axis].max)) warnings.push(`패널 ${pi+1} · ${s.name||`자료 ${si+1}`}: 축 범위 밖 좌표는 잘려 보입니다.`);
      const d=coords.map(([x,y],i)=>`${i?'L':'M'}${fmt(x)} ${fmt(y)}`).join(' ');
      if(s.fill){const y0=Y(Math.max(p.y[s.axis].min,Math.min(p.y[s.axis].max,0)),s.axis);out.push(`<path d="${d} L${fmt(coords.at(-1)[0])} ${fmt(y0)} L${fmt(coords[0][0])} ${fmt(y0)} Z" fill="${s.color}" fill-opacity=".1"/>`);}
      if(s.type==='line')out.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width}"${dash(s.line)?` stroke-dasharray="${dash(s.line)}"`:''}/>`);
      if(s.type==='line'&&coords.length>1)coords.slice(1).forEach((c,i)=>segs.push([...coords[i],...c]));
      if(showPoints(s)){coords.forEach(([x,y])=>{point(x,y,s.marker==='none'?'circle':s.marker,s.size,s.color);dots.push([x,y,s.size]);});}
      if(s.trend){const r=regression(s.points);regressions.push({panel:pi,series:si,...r});const lo=Math.min(...s.points.map(p=>p[0])),hi=Math.max(...s.points.map(p=>p[0])),seg=[X(lo),Y(r.slope*lo+r.intercept,s.axis),X(hi),Y(r.slope*hi+r.intercept,s.axis)];line(...seg,1.4,'#111111',s.trendLine);segs.push(seg);}
    }
    out.push('</g>');
    if(p.frame==='box')out.push(`<rect x="${L}" y="${T}" width="${R-L}" height="${B-T}" fill="none" stroke="#111111" stroke-width="1"/>`);
    else {line(L,axisY,R+(p.y.length>1?0:13),axisY);if(p.y.length===1)arrow(R+13,axisY,'right');line(axisX,B,axisX,T-13);arrow(axisX,T-13,'up');}
    ticksIn(p.x).forEach(t=>{line(X(t.value),axisY,X(t.value),axisY-5,.8);text(X(t.value),axisY+f+8,t.label);});
    for(const [ai,a] of p.y.entries()){
      const xx=ai===0?axisX:R+rightOffsets[ai-1];
      if(ai>0){line(xx,T,xx,B,.8);if(p.frame==='arrows')arrow(xx,T-13,'up');}
      ticksIn(a).forEach(t=>{line(xx,Y(t.value,ai),xx+(ai===0?5:-5),Y(t.value,ai),.8);if(!(ai===0&&p.frame==='arrows'&&t.value===0&&p.x.min<=0&&p.x.max>=0&&p.x.ticks.some(t=>t.value===0)))text(xx+(ai===0?-9:9),Y(t.value,ai)+f*.32,t.label,ai===0?'end':'start');});
      const labelX=ai===0?off+8+labelWidth/2:xx+25;
      if(ai===0){const lines=a.vertical?a.label.replace(/\s+/g,'').split(''):a.label.split('\n');const h=(lines.length+(a.unit?1.6:0))*f*1.12;lines.forEach((t,i)=>text(labelX,(T+B-h)/2+f+i*f*1.12,t));if(a.unit)text(labelX,(T+B-h)/2+f+(lines.length+.25)*f*1.12,`(${a.unit})`,'middle',fsUnitLeft);}
      else if(a.vertical){const lines=a.label.replace(/\s+/g,'').split(''),start=(T+B-lines.length*f*1.12)/2;lines.forEach((t,i)=>text(xx+90,start+i*f*1.12,t));if(a.unit)text(xx+90,start+(lines.length+.4)*f*1.12,`(${a.unit})`,'middle',fsUnit);}
      else {text(labelX,B+f*2.5,a.label);if(a.unit)text(labelX,B+f*3.7,`(${a.unit})`,'middle',fsUnit);}
      if(a.break){if(a.min<=0)warnings.push(`패널 ${pi+1}: y축 생략 표시는 양수인 최솟값 위의 구간에 사용하세요.`);out.push(`<path d="M${xx-4} ${B-13} l8 -3 m-8 7 l8 -3" fill="none" stroke="white" stroke-width="4"/><path d="M${xx-4} ${B-13} l8 -3 m-8 7 l8 -3" fill="none" stroke="#111111" stroke-width="1"/>`);}
    }
    if(p.x.break){out.push(`<path d="M${L+9} ${axisY-4} l-3 8 m7 -8 l-3 8" fill="none" stroke="white" stroke-width="4"/><path d="M${L+9} ${axisY-4} l-3 8 m7 -8 l-3 8" fill="none" stroke="#111111" stroke-width="1"/>`);if(p.x.min<=0)warnings.push(`패널 ${pi+1}: x축 생략 범위를 확인하세요.`);}
    const groupY=B+f+15;
    p.x.groups.forEach(g=>{line(X(g.from),B+4,X(g.from),groupY+f+5,.7);line(X(g.to),B+4,X(g.to),groupY+f+5,.7);text((X(g.from)+X(g.to))/2,groupY+f,g.label);});
    text((L+R)/2,spec.height-18,p.x.label+(p.x.unit?`(${p.x.unit})`:''));
    for(const b of p.bands){if(b.label)text((X(b.from)+X(b.to))/2,T+f+5,b.label,'middle',fsBand);}
    const boxes=[], marks=[];
    for(const a of p.annotations){
      if(a.type==='vline'){text(X(a.x),T-22,a.label);if(a.label)marks.push(labelBox(X(a.x),T-22,a.label));if(a.arrow&&a.label){line(X(a.x),T-17,X(a.x),T-2,.8);arrow(X(a.x),T-1,'down');}}
      if(a.type==='range'){const x1=X(a.x),x2=X(a.to),yy=T-14;line(x1,yy,x2,yy,.7);line(x1,yy-5,x1,yy+5,.7);line(x2,yy-5,x2,yy+5,.7);text((x1+x2)/2,yy-5,a.label);if(a.label)marks.push(labelBox((x1+x2)/2,yy-5,a.label));}
      if(a.type==='hline'&&a.label){
        const [side,vert]=a.labelPos.split('-'),hx=side==='right'?R-5:L+5,hy=Y(a.y,a.axis)+(vert==='above'?-6:f*.78+6),anchor=side==='right'?'end':'start';
        text(hx,hy,a.label,anchor);const hb=labelBox(hx,hy,a.label,anchor);marks.push(hb);
        if(hitsData(hb))warnings.push(`패널 ${pi+1}: 기준선 이름 '${a.label}'이 그래프 선·점에 닿거나 겹칠 수 있습니다. labelPos(right-above, right-below, left-above, left-below)로 위치를 바꾸세요.`);
      }
      if(a.type==='text'){
        const x=X(a.x),y=Y(a.y,a.axis),tx=x+a.dx,ty=y+a.dy;
        if(a.leader)line(x,y,tx,ty,.7,'#555555');text(tx,ty,a.label,'middle');
        const box={x:tx-a.label.length*f*.3,y:ty-f,w:a.label.length*f*.6,h:f*1.2};
        if(hitsData(labelBox(tx,ty,a.label)))warnings.push(`패널 ${pi+1}: '${a.label}' 글자가 그래프 선·점에 닿거나 겹칠 수 있습니다. dx·dy로 위치를 옮기세요.`);
        if(boxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))warnings.push(`패널 ${pi+1}: '${a.label}' 주변 표시가 겹칠 수 있습니다. 위치를 확인하세요.`);
        if(tx<off+10||tx>off+pw-10||ty<10||ty>spec.height-10)warnings.push(`패널 ${pi+1}: '${a.label}' 표시가 그림 밖으로 나갈 수 있습니다.`);boxes.push(box);
      }
    }
    if(p.legend!=='none'){
      const entries=p.series.flatMap(s=>[...(s.name?[{label:s.name,...s}]:[]),...(s.trend&&s.trendLabel?[{label:s.trendLabel,line:s.trendLine,color:'#111111',width:1.4,marker:'none',type:'line'}]:[])]);
      entries.push(...bandLegend.map(b=>({label:b.legendLabel,band:true,shade:b.shade})));
      if(entries.length){const fs=fsLegend,row=fs*1.45,w=Math.max(90,...entries.map(e=>estimate(e.label,fs)+52)),h=entries.length*row+12;let xx=p.legend.includes('left')?L+9:R-w-8,yy=p.legend==='bottom-right'?B-h-8:p.legend==='above'?6:T+8;if(p.legend==='above')xx=R-w;
        out.push(`<rect x="${xx}" y="${yy}" width="${w}" height="${h}" fill="white" stroke="#777777" stroke-width=".65"/>`);
        const over=b=>b.x<xx+w&&b.x+b.w>xx&&b.y<yy+h&&b.y+b.h>yy;
        if([...marks,...boxes].some(over))warnings.push(`패널 ${pi+1}: 범례 상자가 표시 이름을 가립니다. legend 위치나 그림 크기를 바꾸세요.`);
        if(p.legend!=='above'&&hitsData({x:xx,y:yy,w,h}))warnings.push(`패널 ${pi+1}: 범례 상자가 그래프 선·점을 가립니다. legend 위치를 바꾸거나 'none'으로 두고 글자 표시를 쓰세요.`);
        entries.forEach((e,i)=>{const cy=yy+10+row*i+fs*.38;if(e.band)out.push(`<rect x="${xx+7}" y="${cy-5}" width="25" height="10" fill="#000000" fill-opacity="${e.shade}" stroke="#777777" stroke-width=".6"/>`);else{if(e.type!=='scatter')line(xx+7,cy,xx+32,cy,e.width,e.color,e.line);if(showPoints(e))point(xx+19,cy,e.marker==='none'?'circle':e.marker,e.size??2.4,e.color);}text(xx+39,cy+fs*.32,e.label,'start',fs);});
      }
    }
    if(p.x.ticks.some(t=>t.value<p.x.min||t.value>p.x.max)||p.y.some(a=>a.ticks.some(t=>t.value<a.min||t.value>a.max)))warnings.push(`패널 ${pi+1}: 범위 밖 눈금은 표시하지 않았습니다.`);
  }
  out.push('</g></svg>');
  let print=null;
  if(spec.print){
    const ptPerPx=spec.print.widthMm/spec.width/PT_MM,used=[spec.fontSize];
    for(const p of spec.panels){if(p.legend!=='none'&&(p.series.some(s=>s.name||(s.trend&&s.trendLabel))||p.bands.some(b=>b.legendLabel)))used.push(spec.subFontSize??spec.fontSize*.85);if(p.y.some(a=>a.unit))used.push(spec.subFontSize??spec.fontSize*.85);if(p.bands.some(b=>b.label))used.push(spec.subFontSize??spec.fontSize*.85);}
    const r1=v=>Math.round(v*10)/10;print={widthMm:spec.print.widthMm,heightMm:r1(spec.height*spec.print.widthMm/spec.width),textPt:r1(spec.fontSize*ptPerPx),smallestPt:r1(Math.min(...used)*ptPerPx)};
    if(print.smallestPt<7)warnings.push(`문서에 넣었을 때 가장 작은 글자가 ${print.smallestPt} pt입니다. print.subPt로 범례·단위 글자를 키울 수 있습니다.`);
  }
  return {spec,svg:out.join(''),warnings:[...new Set(warnings)],regressions,...(print?{print}:{})};
}
