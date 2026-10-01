(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const EPS = 1e-9;
  const SHAPES = ['circle','square','triangle','diamond'];

  const state = {
    metals: [
      {id:'A', charge:1, initial:2},
      {id:'B', charge:2, initial:2},
      {id:'C', charge:2, initial:0}
    ],
    activityOrder: ['C','B','A'],
    steps: [
      {metalId:'C', amount:1},
      {metalId:'C', amount:1}
    ],
    unitMode: 'N',
    anion: {label:'Cl', charge:1},
    showAnion: false,
    view: 'particles',
    sim: null
  };

  const clone = obj => JSON.parse(JSON.stringify(obj));
  const round = (n,p=8) => Math.round((n+Number.EPSILON)*10**p)/10**p;
  const fmt = n => Number.isInteger(round(n,4)) ? String(Math.round(n)) : String(round(n,4)).replace(/0+$/,'').replace(/\.$/,'');
  const metal = id => state.metals.find(m => m.id === id);
  const superscript = z => z === 1 ? '⁺' : ({2:'²⁺',3:'³⁺',4:'⁴⁺'}[z] || `${z}+`);
  const ion = m => `${m.id}${superscript(m.charge)}`;
  const amountText = n => state.unitMode === 'N' ? `${fmt(n)}N mol` : `${fmt(n)} mol`;
  const amountShort = n => state.unitMode === 'N' ? `${fmt(n)}N` : fmt(n);

  function gcdInt(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){[a,b]=[b,a%b]} return a||1; }
  function gcdValues(values){
    const vals = values.filter(v=>v>EPS);
    if(!vals.length) return 1;
    const scale = 10000;
    const ints = vals.map(v=>Math.round(v*scale));
    return ints.reduce((a,b)=>gcdInt(a,b))/scale || 1;
  }
  function simplestRatio(values){
    const positive = values.filter(v=>v>EPS);
    if(!positive.length) return '-';
    let unit = gcdValues(positive);
    let ints = positive.map(v=>Math.round(v/unit));
    const g = ints.reduce((a,b)=>gcdInt(a,b));
    ints = ints.map(v=>v/g);
    return ints.join(':');
  }

  function permutations(arr){
    if(arr.length<=1) return [arr];
    return arr.flatMap((x,i)=>permutations([...arr.slice(0,i),...arr.slice(i+1)]).map(p=>[x,...p]));
  }

  function normalizeState(){
    const ids = state.metals.map(m=>m.id);
    state.activityOrder = state.activityOrder.filter(id=>ids.includes(id));
    ids.forEach(id=>{ if(!state.activityOrder.includes(id)) state.activityOrder.push(id); });
    state.steps.forEach(s=>{ if(!ids.includes(s.metalId)) s.metalId=ids[ids.length-1]||''; });
  }

  function renderSetup(){
    normalizeState();
    renderMetals();
    renderActivityOrder();
    renderSteps();
    $$('[data-unit]').forEach(b=>b.classList.toggle('active',b.dataset.unit===state.unitMode));
    $('#anionSelect').value = `${state.anion.label}|${state.anion.charge}`;
    $('#showAnion').checked = state.showAnion;
  }

  function renderMetals(){
    const wrap=$('#metalRows'); wrap.innerHTML='';
    state.metals.forEach((m,i)=>{
      const row=document.createElement('div'); row.className='species-row';
      row.innerHTML=`
        <input class="symbol-input" data-role="id" data-index="${i}" maxlength="2" value="${m.id}" aria-label="금속 기호">
        <select data-role="charge" data-index="${i}" aria-label="이온 전하">
          ${[1,2,3].map(z=>`<option value="${z}" ${m.charge===z?'selected':''}>${z}+</option>`).join('')}
        </select>
        <div class="amount-wrap">
          <input data-role="initial" data-index="${i}" type="number" min="0" step="0.5" value="${fmt(m.initial)}" aria-label="처음 이온의 양">
          <span class="amount-suffix">${state.unitMode==='N'?'N mol':'mol'}</span>
        </div>
        <button class="remove-btn" data-role="remove-metal" data-index="${i}" title="삭제">×</button>`;
      wrap.appendChild(row);
    });
    $$('[data-role="id"]').forEach(el=>el.addEventListener('change',e=>{
      const i=+e.target.dataset.index, old=state.metals[i].id;
      let next=(e.target.value||'').trim().replace(/[^A-Za-z]/g,'').slice(0,2);
      if(!next) next=old;
      next=next.length===1?next.toUpperCase():next[0].toUpperCase()+next.slice(1).toLowerCase();
      if(state.metals.some((m,j)=>j!==i&&m.id===next)){ alert('같은 금속 기호는 두 번 쓸 수 없습니다.'); e.target.value=old; return; }
      state.metals[i].id=next;
      state.activityOrder=state.activityOrder.map(x=>x===old?next:x);
      state.steps.forEach(s=>{if(s.metalId===old)s.metalId=next});
      changed(true);
    }));
    $$('[data-role="charge"]').forEach(el=>el.addEventListener('change',e=>{state.metals[+e.target.dataset.index].charge=+e.target.value; changed(false);}));
    $$('[data-role="initial"]').forEach(el=>el.addEventListener('input',e=>{state.metals[+e.target.dataset.index].initial=Math.max(0,+e.target.value||0); changed(false);}));
    $$('[data-role="remove-metal"]').forEach(el=>el.addEventListener('click',e=>{
      if(state.metals.length<=2){alert('금속은 최소 2개가 필요합니다.');return;}
      const id=state.metals[+e.currentTarget.dataset.index].id;
      state.metals.splice(+e.currentTarget.dataset.index,1);
      state.activityOrder=state.activityOrder.filter(x=>x!==id);
      normalizeState(); changed(true);
    }));
  }

  function renderActivityOrder(){
    const sel=$('#activityOrder');
    const options=permutations(state.metals.map(m=>m.id));
    const current=state.activityOrder.join('|');
    sel.innerHTML=options.map(p=>`<option value="${p.join('|')}" ${p.join('|')===current?'selected':''}>${p.join('  >  ')}</option>`).join('');
    if(!options.some(p=>p.join('|')===current)){
      state.activityOrder=options[0]||[];
      sel.value=state.activityOrder.join('|');
    }
  }

  function renderSteps(){
    const wrap=$('#stepRows'); wrap.innerHTML='';
    if(!state.steps.length){
      wrap.innerHTML='<div class="tiny-note" style="margin:0">아직 넣는 금속이 없습니다. “+ 과정”을 눌러 추가하세요.</div>'; return;
    }
    state.steps.forEach((s,i)=>{
      const row=document.createElement('div'); row.className='step-row';
      row.innerHTML=`
        <div class="step-name">${['(나)','(다)','(라)','(마)'][i]||`${i+1}단계`}</div>
        <select data-role="step-metal" data-index="${i}" aria-label="넣는 금속">
          ${state.metals.map(m=>`<option value="${m.id}" ${s.metalId===m.id?'selected':''}>${m.id}(s)</option>`).join('')}
        </select>
        <div class="amount-wrap">
          <input data-role="step-amount" data-index="${i}" type="number" min="0" step="0.5" value="${fmt(s.amount)}" aria-label="넣는 금속의 양">
          <span class="amount-suffix">${state.unitMode==='N'?'N mol':'mol'}</span>
        </div>
        <button class="remove-btn" data-role="remove-step" data-index="${i}" title="삭제">×</button>`;
      wrap.appendChild(row);
    });
    $$('[data-role="step-metal"]').forEach(el=>el.addEventListener('change',e=>{state.steps[+e.target.dataset.index].metalId=e.target.value; changed(false);}));
    $$('[data-role="step-amount"]').forEach(el=>el.addEventListener('input',e=>{state.steps[+e.target.dataset.index].amount=Math.max(0,+e.target.value||0); changed(false);}));
    $$('[data-role="remove-step"]').forEach(el=>el.addEventListener('click',e=>{state.steps.splice(+e.currentTarget.dataset.index,1); changed(true);}));
  }

  function activityRank(id){ return state.activityOrder.indexOf(id); }

  function simulate(){
    normalizeState();
    const ions={}; state.metals.forEach(m=>ions[m.id]=Math.max(0,m.initial));
    const initialAnionCharge = state.metals.reduce((s,m)=>s+m.initial*m.charge,0);
    const anionAmount = initialAnionCharge/state.anion.charge;
    const stages=[{name:'반응 전',ions:clone(ions),leftover:null}];
    const logs=[]; const notices=[];

    state.steps.forEach((step,stepIndex)=>{
      const solid=metal(step.metalId);
      let remaining=Math.max(0,step.amount);
      const stepLogs=[];
      if(!solid||remaining<=EPS){ stages.push({name:`${['(나)','(다)','(라)','(마)'][stepIndex]||`${stepIndex+1}단계`} 후`,ions:clone(ions),leftover:null}); return; }

      const targets=state.metals
        .filter(t=>t.id!==solid.id && (ions[t.id]||0)>EPS && activityRank(solid.id)<activityRank(t.id))
        .sort((a,b)=>activityRank(b.id)-activityRank(a.id));

      for(const target of targets){
        if(remaining<=EPS) break;
        const available=ions[target.id]||0;
        const targetConsumed=Math.min(available, remaining*solid.charge/target.charge);
        const solidConsumed=targetConsumed*target.charge/solid.charge;
        if(targetConsumed<=EPS) continue;
        ions[target.id]=round(available-targetConsumed);
        ions[solid.id]=round((ions[solid.id]||0)+solidConsumed);
        remaining=round(remaining-solidConsumed);
        const lcm=solid.charge*target.charge/gcdInt(solid.charge,target.charge);
        const cs=lcm/solid.charge, ct=lcm/target.charge;
        stepLogs.push({
          step:stepIndex+1, solid:solid.id, target:target.id,
          solidConsumed,targetConsumed,electrons:solidConsumed*solid.charge,
          equation:`${cs===1?'':cs}${solid.id}(s) + ${ct===1?'':ct}${ion(target)} → ${cs===1?'':cs}${ion(solid)} + ${ct===1?'':ct}${target.id}(s)`
        });
      }

      if(!stepLogs.length) logs.push({step:stepIndex+1,noReaction:true,solid:solid.id,added:step.amount,remaining});
      else logs.push(...stepLogs);
      if(remaining>EPS) notices.push(`${stepIndex+1}단계에서 ${solid.id}(s) ${amountText(remaining)}이 반응하지 않고 남습니다.`);
      stages.push({name:`${['(나)','(다)','(라)','(마)'][stepIndex]||`${stepIndex+1}단계`} 후`,ions:clone(ions),leftover:remaining>EPS?{id:solid.id,amount:remaining}:null});
    });

    const differentCharges=logs.some(l=>!l.noReaction && metal(l.solid).charge!==metal(l.target).charge);
    if(differentCharges) notices.unshift('전하량이 다른 금속 사이의 반응이 포함되어 전자 수에 따른 계수 계산이 필요합니다.');

    state.sim={stages,logs,notices,anionAmount,differentCharges};
    renderResults();
  }

  function changed(full){
    if(full) renderSetup();
    simulate();
  }

  function stageStats(stage){
    const active=state.metals.filter(m=>(stage.ions[m.id]||0)>EPS);
    return {kinds:active.length, ratio:simplestRatio(active.map(m=>stage.ions[m.id])), active};
  }

  function particleUnit(){
    const vals=[];
    state.sim.stages.forEach(s=>state.metals.forEach(m=>{const v=s.ions[m.id]||0;if(v>EPS)vals.push(v)}));
    if(state.showAnion && state.sim.anionAmount>EPS) vals.push(state.sim.anionAmount);
    let unit=gcdValues(vals);
    const maxParticles=Math.max(...state.sim.stages.map(s=>{
      let total=state.metals.reduce((sum,m)=>sum+(s.ions[m.id]||0),0);
      if(state.showAnion) total+=state.sim.anionAmount;
      return total/unit;
    }),1);
    if(maxParticles>28) unit*=Math.ceil(maxParticles/28);
    return unit;
  }

  function particlePositions(count,seed){
    const out=[];
    for(let i=0;i<count;i++){
      const x=12+((i*37+seed*19)%76);
      const y=24+((i*53+seed*17)%66);
      out.push([x,y]);
    }
    return out;
  }

  function renderResults(){
    const sim=state.sim;
    $('#rangeBadge').textContent=sim.differentCharges?'전자수 계산 포함':'통합과학형 1:1 추론 가능';
    $('#rangeBadge').className='range-badge'+(sim.differentCharges?' warn':'');
    if(sim.notices.length){$('#notice').classList.remove('hidden');$('#notice').innerHTML=sim.notices.map(x=>`• ${x}`).join('<br>');}
    else $('#notice').classList.add('hidden');
    $$('.view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    if(state.view==='particles') renderParticleView();
    else if(state.view==='ratio') renderRatioView();
    else renderTableView();
    renderReactionLog();
    $('#questionDraft').value=buildDraft();
  }

  function renderParticleView(){
    const unit=particleUnit();
    const html=state.sim.stages.map((stage,si)=>{
      const stats=stageStats(stage); const particles=[]; let seed=si*11;
      state.metals.forEach((m,mi)=>{
        const count=Math.max(0,Math.round((stage.ions[m.id]||0)/unit));
        particlePositions(count,seed+mi*3).forEach((p,j)=>particles.push(`<div class="particle ${SHAPES[mi%SHAPES.length]}" style="left:${p[0]}%;top:${p[1]}%"><span>${m.id}</span></div>`));
      });
      if(state.showAnion){
        const count=Math.max(0,Math.round(state.sim.anionAmount/unit));
        particlePositions(count,seed+29).forEach(p=>particles.push(`<div class="particle anion" style="left:${p[0]}%;top:${p[1]}%">−</div>`));
      }
      const legend=state.metals.filter(m=>(stage.ions[m.id]||0)>EPS).map((m,mi)=>{
        const originalIndex=state.metals.indexOf(m); return `<div class="legend-chip"><i class="legend-dot ${SHAPES[originalIndex%SHAPES.length]}"></i>${ion(m)} ${amountShort(stage.ions[m.id])}</div>`;
      }).join('');
      return `<article class="stage-card">
        <div class="stage-top"><strong>${stage.name}</strong><span>${stats.kinds}종류 · ${stats.ratio}</span></div>
        <div class="beaker">${particles.join('')}</div>
        <div class="species-legend">${legend}</div>
        <div class="stage-summary"><div><span>금속 양이온 종류</span><strong>${stats.kinds}가지</strong></div><div><span>금속 양이온 수 비</span><strong>${stats.ratio}</strong></div>${stage.leftover?`<div><span>남은 고체</span><strong>${stage.leftover.id} ${amountText(stage.leftover.amount)}</strong></div>`:''}</div>
      </article>`;
    }).join('');
    $('#visualResult').innerHTML=`<div class="stage-grid">${html}</div>`;
  }

  function renderRatioView(){
    const fills=['#dfe5eb','#9da8b4','#727e8a','#bcc5ce'];
    const html=state.sim.stages.map(stage=>{
      const stats=stageStats(stage); const total=stats.active.reduce((s,m)=>s+stage.ions[m.id],0);
      let acc=0; const stops=[];
      stats.active.forEach(m=>{const idx=state.metals.indexOf(m);const pct=total?stage.ions[m.id]/total*100:0;stops.push(`${fills[idx%fills.length]} ${acc}% ${acc+pct}%`);acc+=pct;});
      const labels=stats.active.map(m=>`<div><span>${ion(m)}</span><strong>${amountShort(stage.ions[m.id])}</strong></div>`).join('');
      return `<article class="stage-card"><div class="stage-top"><strong>${stage.name}</strong><span>${stats.ratio}</span></div><div class="pie-wrap"><div class="ratio-pie" style="background:conic-gradient(${stops.join(',')})"></div></div><div class="ratio-labels">${labels}</div><div class="stage-summary"><div><span>금속 양이온 종류</span><strong>${stats.kinds}가지</strong></div><div><span>수 비</span><strong>${stats.ratio}</strong></div></div></article>`;
    }).join('');
    $('#visualResult').innerHTML=`<div class="stage-grid">${html}</div>`;
  }

  function renderTableView(){
    const headers=state.sim.stages.map(s=>`<th>${s.name}</th>`).join('');
    const rows=state.metals.map(m=>`<tr><td>${ion(m)}</td>${state.sim.stages.map(s=>`<td>${amountText(s.ions[m.id]||0)}</td>`).join('')}</tr>`).join('');
    const kindRow=`<tr><td><strong>양이온 종류</strong></td>${state.sim.stages.map(s=>`<td><strong>${stageStats(s).kinds}</strong></td>`).join('')}</tr>`;
    const ratioRow=`<tr><td><strong>수 비</strong></td>${state.sim.stages.map(s=>`<td><strong>${stageStats(s).ratio}</strong></td>`).join('')}</tr>`;
    $('#visualResult').innerHTML=`<table class="composition-table"><thead><tr><th>종류</th>${headers}</tr></thead><tbody>${rows}${kindRow}${ratioRow}</tbody></table>`;
  }

  function renderReactionLog(){
    if(!state.sim.logs.length){$('#reactionLog').innerHTML='<div class="tiny-note" style="margin:0">금속을 넣는 과정을 추가하면 여기에 반응이 표시됩니다.</div>';return;}
    const grouped=new Map();
    state.sim.logs.forEach(l=>{if(!grouped.has(l.step))grouped.set(l.step,[]);grouped.get(l.step).push(l)});
    $('#reactionLog').innerHTML=[...grouped.entries()].map(([step,logs])=>{
      const no=logs.every(l=>l.noReaction);
      if(no){const l=logs[0];return `<div class="reaction-item"><div class="tag">${step}단계</div><div class="reaction-main"><strong>반응 없음</strong><p>${l.solid}(s)가 현재 수용액의 금속 양이온보다 반응성이 크지 않습니다.</p></div></div>`;}
      const eq=logs.filter(l=>!l.noReaction).map(l=>`<code>${l.equation}</code>`).join(' &nbsp; ');
      const desc=logs.filter(l=>!l.noReaction).map(l=>`${l.solid}(s) ${amountText(l.solidConsumed)} 산화 · ${ion(metal(l.target))} ${amountText(l.targetConsumed)} 환원`).join('<br>');
      return `<div class="reaction-item"><div class="tag">${step}단계</div><div class="reaction-main"><strong>${eq}</strong><p>${desc}</p></div></div>`;
    }).join('');
  }

  function buildDraft(){
    const lines=['다음은 금속의 산화·환원 반응 실험이다.','', '[실험 과정]'];
    const initial=state.metals.filter(m=>m.initial>EPS).map(m=>`${ion(m)} ${amountText(m.initial)}`);
    lines.push(`(가) ${initial.join('과 ')}이 들어 있는 수용액을 준비한다.`);
    state.steps.forEach((s,i)=>{
      const label=['나','다','라','마'][i]||String(i+2);
      lines.push(`(${label}) 앞 과정의 수용액에 ${s.metalId}(s) ${amountText(s.amount)}을 넣어 반응을 완결시킨다.`);
    });
    lines.push('', '[실험 결과]');
    state.sim.stages.slice(1).forEach((s,i)=>{
      const st=stageStats(s); const label=['나','다','라','마'][i]||String(i+2);
      lines.push(`• (${label}) 후 수용액에 존재하는 금속 양이온은 ${st.kinds}종류이고, 금속 양이온 수의 비는 ${st.ratio}이다.`);
    });
    lines.push('', '이에 대한 설명으로 옳은 것만을 <보기>에서 있는 대로 고른 것은?', '', '<보기>');
    const first=state.sim.logs.find(l=>!l.noReaction);
    if(first){
      lines.push(`ㄱ. ${first.solid}는 산화된다.`);
      lines.push(`ㄴ. ${ion(metal(first.target))}은 환원된다.`);
      lines.push(`ㄷ. 금속의 반응성은 ${first.solid}가 ${first.target}보다 크다.`);
    } else {
      lines.push('ㄱ. ________________________________');
      lines.push('ㄴ. ________________________________');
      lines.push('ㄷ. ________________________________');
    }
    return lines.join('\n');
  }

  function resultText(){
    const lines=[];
    state.sim.stages.forEach(s=>{
      const st=stageStats(s); lines.push(`[${s.name}]`);
      state.metals.forEach(m=>lines.push(`${ion(m)}: ${amountText(s.ions[m.id]||0)}`));
      lines.push(`양이온 종류: ${st.kinds}가지`,`양이온 수 비: ${st.ratio}`,'');
    });
    lines.push('[반응]');
    state.sim.logs.forEach(l=>lines.push(l.noReaction?`${l.step}단계: 반응 없음`:`${l.step}단계: ${l.equation}`));
    return lines.join('\n');
  }

  function copy(text){
    if(navigator.clipboard) navigator.clipboard.writeText(text).then(()=>toast('복사했습니다.')).catch(()=>fallbackCopy(text));
    else fallbackCopy(text);
  }
  function fallbackCopy(text){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('복사했습니다.');}
  function toast(msg){const el=document.createElement('div');el.textContent=msg;Object.assign(el.style,{position:'fixed',right:'18px',bottom:'18px',background:'#18212b',color:'#fff',padding:'9px 13px',borderRadius:'9px',fontSize:'11px',fontWeight:'800',zIndex:9999});document.body.appendChild(el);setTimeout(()=>el.remove(),1300)}

  function escapeXml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
  function svgShape(shape,x,y,label){
    const text=`<text x="${x}" y="${y+3}" text-anchor="middle" font-size="8" font-family="Arial" font-weight="700" fill="#27313b">${escapeXml(label)}</text>`;
    if(shape==='circle')return `<circle cx="${x}" cy="${y}" r="10" fill="#e3e8ed" stroke="#697684"/>${text}`;
    if(shape==='square')return `<rect x="${x-10}" y="${y-10}" width="20" height="20" fill="#9aa5b1" stroke="#66717d"/>${text}`;
    if(shape==='triangle')return `<polygon points="${x},${y-11} ${x-11},${y+10} ${x+11},${y+10}" fill="#7e8995" stroke="#66717d"/>${text}`;
    return `<rect x="${x-8}" y="${y-8}" width="16" height="16" transform="rotate(45 ${x} ${y})" fill="#b7c0c9" stroke="#6f7a85"/>${text}`;
  }

  function exportSvg(){
    const unit=particleUnit(), cardW=230, cardH=235, gap=14, width=state.sim.stages.length*(cardW+gap)-gap;
    const cards=state.sim.stages.map((stage,si)=>{
      const st=stageStats(stage), particles=[]; let seed=si*11;
      state.metals.forEach((m,mi)=>{
        const count=Math.max(0,Math.round((stage.ions[m.id]||0)/unit));
        particlePositions(count,seed+mi*3).forEach(p=>{const x=20+p[0]/100*190,y=55+p[1]/100*125;particles.push(svgShape(SHAPES[mi%SHAPES.length],x,y,m.id));});
      });
      if(state.showAnion){const count=Math.max(0,Math.round(state.sim.anionAmount/unit));particlePositions(count,seed+29).forEach(p=>{const x=20+p[0]/100*190,y=55+p[1]/100*125;particles.push(`<circle cx="${x}" cy="${y}" r="10" fill="white" stroke="#9ba5b0" stroke-dasharray="3 2"/><text x="${x}" y="${y+3}" text-anchor="middle" font-size="9" fill="#6d7781">−</text>`);});}
      return `<g transform="translate(${si*(cardW+gap)},0)"><rect width="${cardW}" height="${cardH}" rx="12" fill="white" stroke="#cfd6dd"/><text x="12" y="22" font-size="13" font-family="Arial" font-weight="700" fill="#18212b">${escapeXml(stage.name)}</text><path d="M18 48 V188 Q18 198 28 198 H202 Q212 198 212 188 V48" fill="#eef6fc" stroke="#aeb8c2" stroke-width="2"/>${particles.join('')}<text x="12" y="220" font-size="10" font-family="Arial" fill="#5f6b77">양이온 ${st.kinds}종류 · 수 비 ${st.ratio}</text></g>`;
    }).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${cardH}" viewBox="0 0 ${width} ${cardH}">${cards}</svg>`;
    const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='redox-question-figure.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function applyPreset(name){
    if(name==='agcu'){
      state.metals=[{id:'Ag',charge:1,initial:3},{id:'Cu',charge:2,initial:0}];
      state.activityOrder=['Cu','Ag']; state.steps=[{metalId:'Cu',amount:1}]; state.anion={label:'NO3',charge:1}; state.showAnion=false;
    } else if(name==='xy'){
      state.metals=[{id:'X',charge:1,initial:6},{id:'Y',charge:2,initial:0}];
      state.activityOrder=['Y','X']; state.steps=[{metalId:'Y',amount:1.5}]; state.anion={label:'Cl',charge:1}; state.showAnion=true;
    } else {
      state.metals=[{id:'A',charge:1,initial:2},{id:'B',charge:2,initial:2},{id:'C',charge:2,initial:0}];
      state.activityOrder=['C','B','A']; state.steps=[{metalId:'C',amount:1},{metalId:'C',amount:1}]; state.anion={label:'Cl',charge:1}; state.showAnion=false;
    }
    state.unitMode='N'; state.view='particles'; renderSetup(); simulate();
  }

  function bind(){
    $('#addMetalBtn').addEventListener('click',()=>{if(state.metals.length>=4){alert('문항 제작용으로 금속은 최대 4개까지 지원합니다.');return;}const ids='ABCD';let id=[...ids].find(x=>!state.metals.some(m=>m.id===x))||`M${state.metals.length+1}`;state.metals.push({id,charge:2,initial:0});state.activityOrder.unshift(id);changed(true);});
    $('#addStepBtn').addEventListener('click',()=>{if(state.steps.length>=4){alert('과정은 최대 4단계까지 지원합니다.');return;}state.steps.push({metalId:state.activityOrder[0]||state.metals[0].id,amount:1});changed(true);});
    $('#activityOrder').addEventListener('change',e=>{state.activityOrder=e.target.value.split('|');changed(false);});
    $$('[data-unit]').forEach(b=>b.addEventListener('click',()=>{state.unitMode=b.dataset.unit;renderSetup();simulate();}));
    $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;renderResults();}));
    $('#anionSelect').addEventListener('change',e=>{const [label,z]=e.target.value.split('|');state.anion={label,charge:+z};simulate();});
    $('#showAnion').addEventListener('change',e=>{state.showAnion=e.target.checked;renderResults();});
    $$('[data-preset]').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.preset)));
    $('#resetBtn').addEventListener('click',()=>applyPreset('abc'));
    $('#copyResultBtn').addEventListener('click',()=>copy(resultText()));
    $('#copyDraftBtn').addEventListener('click',()=>copy($('#questionDraft').value));
    $('#saveSvgBtn').addEventListener('click',exportSvg);
  }

  renderSetup(); bind(); simulate();
})();
