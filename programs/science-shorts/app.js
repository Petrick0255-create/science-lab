import {CONFIG,MODELS} from './config.js';
import {seconds,normalize} from './core.js';
import {SheetDB,SCOPE,listModels,recommend,writeScript} from './api.js';
const $=id=>document.getElementById(id);
const STORAGE='jb-science-shorts-v1';
let settings={}, drafts=[], rows=[], active=null, token='', expires=0, busy=false, available=null, checkedKey='';
try { settings=JSON.parse(localStorage.getItem(STORAGE+'-settings')||'{}'); drafts=JSON.parse(localStorage.getItem(STORAGE+'-drafts')||'[]'); if(!Array.isArray(drafts))drafts=[]; } catch {settings={};drafts=[];}
const db=new SheetDB(()=>Date.now()<expires?token:'');
const notify=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
const speed=()=>Number($('speed').value);
const setSaveState=text=>$('save-state').textContent=text;
function persistDrafts(){localStorage.setItem(STORAGE+'-drafts',JSON.stringify(drafts));}
function keepDraft(r){drafts=drafts.filter(x=>x.id!==r.id);drafts.push({...r});persistDrafts();renderHistory();}
function refreshControls(){
  document.querySelectorAll('button,input,select').forEach(el=>{el.disabled=busy;});
  $('script').readOnly=busy;
  $('copy').disabled=busy||!active;
  $('save').disabled=busy||!active;
}
async function run(action){if(busy)return;busy=true;refreshControls();try{await action();}catch(e){notify(e.message||'작업을 완료하지 못했습니다.',true);}finally{busy=false;refreshControls();}}
function modelLabel(){ $('model-id').textContent=`실제 API ID: ${$('model').value}`; }
MODELS.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.label;$('model').append(o);});
$('api-key').value=settings.apiKey||'';
$('client-id').value=settings.clientId||CONFIG.googleClientId;
$('model').value=MODELS.some(m=>m.id===settings.model)?settings.model:MODELS[0].id;
$('sheet-link').href=`https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/edit`;
modelLabel();
function saveSettings(){
  const clientId=$('client-id').value.trim();
  if(clientId&&!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId))throw Error('Google 웹 OAuth 클라이언트 ID 형식을 확인해 주세요.');
  if(settings.clientId!==clientId){token='';expires=0;connectionState(false);}
  settings={apiKey:$('api-key').value.trim(),clientId,model:$('model').value};
  localStorage.setItem(STORAGE+'-settings',JSON.stringify(settings));
}
function connectionState(connected){$('db-dot').classList.toggle('connected',connected);$('db-status').textContent=connected?`DB 연결됨 · ${rows.length}개 기록`:'Google DB 연결이 필요합니다';$('disconnect').hidden=!connected;}
async function checkModels(){
  if(!settings.apiKey)throw Error('연결 설정에서 API 키를 저장해 주세요.');
  if(checkedKey!==settings.apiKey||!available){available=await listModels(settings.apiKey);checkedKey=settings.apiKey;}
  $('model-status').textContent=MODELS.map(m=>`${m.version}: ${available.includes(m.id)?'접근 가능':'현재 키에서 사용 불가'}`).join(' / ');
  if(!available.includes($('model').value))throw Error('선택한 모델을 현재 API 키로 사용할 수 없습니다. 다른 모델을 직접 선택해 주세요.');
}
async function readDB(){rows=await db.read();connectionState(true);renderHistory();return rows;}
function renderHistory(){
  const target=$('history');target.replaceChildren();
  const combined=[...drafts.map(r=>({...r,local:true})),...rows.filter(r=>!drafts.some(d=>d.id===r.id))].reverse();
  $('history-count').textContent=String(rows.length);
  if(!combined.length){const p=document.createElement('p');p.className='muted';p.textContent='아직 기록이 없습니다. 새로운 이야기를 만들어 보세요.';target.append(p);return;}
  combined.forEach(r=>{const b=document.createElement('button');b.className='history-card';b.disabled=busy;
    const title=document.createElement('strong');title.textContent=r.topic;
    const meta=document.createElement('small');const date=r.createdAt?new Date(r.createdAt):null;
    meta.textContent=`${r.field} · ${date&&!Number.isNaN(date.valueOf())?date.toLocaleString('ko-KR'):'기준 대본'}${r.local?' · 저장 대기':''}`;
    const model=document.createElement('small');model.textContent=r.model;
    b.append(title,meta,model);b.addEventListener('click',()=>{if(!busy){showRecord(r);$('script-heading').scrollIntoView({behavior:'smooth',block:'center'});}});target.append(b);
  });
}
function showRecord(r){active={...r};$('script').hidden=false;$('script-empty').hidden=true;$('script').value=r.script;$('script-heading').textContent=r.topic;updateDuration();setSaveState(drafts.some(d=>d.id===r.id)?'브라우저 보관 · DB 저장 대기':'Google Sheet에 저장됨');refreshControls();}
function updateDuration(){const t=seconds($('script').value,speed());$('duration').textContent=`예상 ${t}초`;$('duration').style.color=t>60?'#a04731':'';}
function currentRecord(){
  if(!active)throw Error('먼저 대본을 생성해 주세요.');
  const text=$('script').value.trim();
  if(!text)throw Error('대본이 비어 있습니다.');
  const estimate=seconds(text,speed());
  if(estimate>60)throw Error(`예상 ${estimate}초입니다. 60초 이하로 줄인 후 저장해 주세요.`);
  // An edited script is a new immutable revision. Never overwrite another row.
  if(text!==active.script){active={...active,id:crypto.randomUUID(),script:text,estimatedSeconds:estimate,status:'수정본',updatedAt:new Date().toISOString()};}
  return {...active,estimatedSeconds:estimate};
}
async function saveActive(){
  const r=currentRecord();keepDraft(r);setSaveState('DB 저장 중…');
  try {
    const write=async()=>{await db.save(r);};
    if(navigator.locks)await navigator.locks.request(STORAGE+'-save',write);else await write();
    drafts=drafts.filter(d=>d.id!==r.id);persistDrafts();
    active={...r,editing:false};await readDB();setSaveState('Google Sheet 저장 확인됨');notify('대본을 Google Sheet에 저장했습니다.');
  }catch(e){setSaveState('브라우저 보관 · DB 저장 실패');throw e;}
}
$('settings-toggle').addEventListener('click',()=>{const hidden=!$('settings').hidden;$('settings').hidden=hidden;$('settings-toggle').setAttribute('aria-expanded',String(!hidden));});
$('settings-save').addEventListener('click',()=>run(async()=>{saveSettings();notify('설정을 이 브라우저에 저장했습니다.');}));
$('forget-key').addEventListener('click',()=>run(async()=>{$('api-key').value='';settings.apiKey='';localStorage.setItem(STORAGE+'-settings',JSON.stringify(settings));available=null;checkedKey='';$('model-status').textContent='API 키가 삭제되었습니다.';notify('저장된 Gemini API 키를 삭제했습니다.');}));
$('check-models').addEventListener('click',()=>run(async()=>{saveSettings();available=null;notify('현재 키로 모델 접근 여부를 확인하고 있습니다…');await checkModels();notify('모델 접근 확인이 완료되었습니다.');}));
$('model').addEventListener('change',()=>{modelLabel();settings.model=$('model').value;try{localStorage.setItem(STORAGE+'-settings',JSON.stringify(settings));}catch{notify('브라우저 저장 공간을 사용할 수 없습니다.',true);}});
$('speed').addEventListener('change',()=>{if(active)updateDuration();});
$('connect').addEventListener('click',()=>run(async()=>{
  saveSettings();
  if(!settings.clientId)throw Error('Google OAuth 클라이언트 ID가 필요합니다. 연결 설정의 최초 연결 안내를 확인해 주세요.');
  if(!window.google?.accounts?.oauth2)throw Error('Google 로그인 모듈을 불러오지 못했습니다. 네트워크와 콘텐츠 차단 설정을 확인해 주세요.');
  notify('Google 로그인 창에서 DB 연결을 승인해 주세요.');
  const response=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Google 로그인이 완료되지 않았습니다. 연결을 다시 눌러 주세요.')),120000);
    google.accounts.oauth2.initTokenClient({client_id:settings.clientId,scope:SCOPE,include_granted_scopes:false,
      callback:r=>{clearTimeout(timer);r.error?reject(Error('Google 연결 승인이 완료되지 않았습니다.')):resolve(r);},
      error_callback:()=>{clearTimeout(timer);reject(Error('로그인 창이 닫혔거나 차단되었습니다. Google DB 연결을 다시 눌러 주세요.'));}
    }).requestAccessToken({prompt:''});
  });
  if(!google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE))throw Error('Sheets 읽기·쓰기 권한이 필요합니다.');
  token=response.access_token;expires=Date.now()+Number(response.expires_in)*1000-60000;
  await readDB();notify('DB가 연결되었습니다. 주제를 추천받거나 직접 입력해 주세요.');
}));
$('disconnect').addEventListener('click',()=>{token='';expires=0;rows=[];connectionState(false);renderHistory();notify('이 탭의 Google 연결을 해제했습니다.');});
$('refresh').addEventListener('click',()=>run(async()=>{await readDB();notify('최신 DB 기록을 불러왔습니다.');}));
$('recommend').addEventListener('click',()=>run(async()=>{
  notify('DB의 기존 주제를 확인하고 있습니다…');
  await readDB();await checkModels();
  notify('겹치지 않는 새로운 과학 주제 다섯 가지를 찾고 있습니다…');
  const topics=await recommend(settings.apiKey,$('model').value,[...rows,...drafts]);
  $('suggestions').replaceChildren();
  topics.forEach(t=>{const b=document.createElement('button');b.className='suggestion';b.type='button';b.setAttribute('aria-pressed','false');const title=document.createElement('strong');title.textContent=t.topic;const field=document.createElement('span');field.textContent=t.field+' ↗';b.append(title,field);b.addEventListener('click',()=>{$('topic').value=t.topic;document.querySelectorAll('.suggestion').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});});$('suggestions').append(b);});
  notify('마음에 드는 주제를 고르거나 직접 입력해 주세요.');
}));
$('generate').addEventListener('click',()=>run(async()=>{
  const topic=$('topic').value.trim();if(!topic)throw Error('이야기할 주제를 입력해 주세요.');
  notify('DB와 모델을 확인하고 있습니다…');await readDB();await checkModels();
  const duplicate=[...rows,...drafts].some(r=>normalize(r.topic)===normalize(topic)||normalize(r.topicKey)===normalize(topic));
  notify(duplicate?'사용했던 주제입니다. 새 버전 대본을 생성합니다…':'과학의 반전과 짧은 여운을 담고 있습니다…');
  const model=$('model').value;
  const result=await writeScript(settings.apiKey,model,topic,speed());
  const now=new Date().toISOString();
  const record={...result,id:crypto.randomUUID(),model,version:MODELS.find(m=>m.id===model).version,createdAt:now,updatedAt:now,status:'생성본'};
  showRecord(record);keepDraft(record);await saveActive();
}));
$('script').addEventListener('input',()=>{updateDuration();setSaveState('편집 중 · 저장 시 새 버전');
  if(active){
    // Preserve work even when a page is closed while editing.
    if(!active.editing){active={...active,id:crypto.randomUUID(),editing:true,status:'수정본',updatedAt:new Date().toISOString()};}
    active.script=$('script').value;active.estimatedSeconds=seconds(active.script,speed());
    try{keepDraft(active);}catch{notify('브라우저 저장 공간이 부족합니다. 대본을 복사해 보관해 주세요.',true);}
  }
});
$('save').addEventListener('click',()=>run(saveActive));
$('copy').addEventListener('click',()=>run(async()=>{await navigator.clipboard.writeText($('script').value);notify('대본을 복사했습니다.');}));
window.addEventListener('storage',event=>{if(event.key===STORAGE+'-settings'&&event.newValue){try{settings=JSON.parse(event.newValue);$('api-key').value=settings.apiKey||'';available=null;checkedKey='';}catch{}}});
if(drafts.length){showRecord(drafts.at(-1));renderHistory();notify('브라우저에 보관된 대본을 복원했습니다. DB 연결 후 저장할 수 있습니다.');}
if(!settings.apiKey||!settings.clientId){$('settings').hidden=false;$('settings-toggle').setAttribute('aria-expanded','true');}
refreshControls();
