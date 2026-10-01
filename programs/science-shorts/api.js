import {CONFIG, MODELS} from './config.js';
import {FIELDS, STYLE, parseRows, toRow, uniqueSuggestions, validateScript} from './core.js';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}`;
export const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
async function request(url, options = {}) {
  let response;
  try { response = await fetch(url,{...options,signal:AbortSignal.timeout(90000)}); }
  catch { throw Error('네트워크 연결이 끊겼거나 응답 시간이 초과되었습니다. 저장 중이었다면 재시도로 기록을 확인해 주세요.'); }
  const data = await response.json().catch(()=>({}));
  if (!response.ok) {
    const messages = {400:'요청 설정을 확인해 주세요.',401:'인증이 만료되었습니다. 다시 연결해 주세요.',403:'키의 API 권한, Sheets API 활성화 및 시트 접근 권한을 확인해 주세요.',404:'선택한 모델 또는 시트를 찾을 수 없습니다.',429:'요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.'};
    // Do not surface upstream text that could reflect credentials or full prompts.
    throw Error(`API ${response.status}: ${messages[response.status]||'서비스 오류입니다. 잠시 후 다시 시도해 주세요.'}`);
  }
  return data;
}
export async function listModels(key) {
  if (!key) throw Error('설정에서 Gemini API 키를 입력해 주세요.');
  let token='', models=[];
  do {
    const data = await request(`${GEMINI}/models?pageSize=1000${token?'&pageToken='+encodeURIComponent(token):''}`,{headers:{'x-goog-api-key':key}});
    models.push(...(data.models||[])); token=data.nextPageToken||'';
  } while(token);
  return models.filter(m=>m.supportedGenerationMethods?.includes('generateContent')).map(m=>m.name.replace(/^models\//,''));
}
const scriptSchema = {type:'OBJECT',properties:{topic:{type:'STRING'},field:{type:'STRING',enum:FIELDS},topicKey:{type:'STRING'},segments:{type:'ARRAY',items:{type:'STRING'},minItems:6,maxItems:6}},required:['topic','field','topicKey','segments']};
const topicSchema = {type:'OBJECT',properties:{topics:{type:'ARRAY',items:{type:'OBJECT',properties:{topic:{type:'STRING'},field:{type:'STRING',enum:FIELDS},topicKey:{type:'STRING'}},required:['topic','field','topicKey']}}},required:['topics']};
async function generate(key,model,prompt,schema) {
  if (!MODELS.some(m=>m.id===model)) throw Error('지원하지 않는 모델입니다.');
  const data = await request(`${GEMINI}/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:STYLE}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',responseSchema:schema,maxOutputTokens:8192}})});
  const candidate=data.candidates?.[0];
  if (candidate?.finishReason!=='STOP') throw Error('모델 응답이 차단되었거나 완성되지 않았습니다. 주제를 바꿔 다시 시도해 주세요.');
  try { return JSON.parse(candidate.content.parts.filter(p=>!p.thought).map(p=>p.text||'').join('')); }
  catch { throw Error('모델의 JSON 응답을 읽을 수 없습니다. 다시 시도해 주세요.'); }
}
export async function recommend(key,model,records) {
  let accepted=[];
  for (let attempt=0;attempt<3 && accepted.length<5;attempt++) {
    const exclusions=[...records,...accepted].map(r=>({topic:r.topic,topicKey:r.topicKey}));
    const data=await generate(key,model,`이미 사용한 개념과 의미가 겹치지 않는 자연과학 주제 ${5-accepted.length}개를 추천하라. 2~12자 정도의 짧은 단어/구와 분야, 대표개념 topicKey를 반환하라. 동의어·표현만 바꾼 같은 원리도 제외한다. 물리·화학·생명·지구·천문에서 다양하게 고른다. 데이터: ${JSON.stringify(exclusions)}`,topicSchema);
    accepted.push(...uniqueSuggestions(data.topics,records,accepted));
  }
  if (accepted.length<5) throw Error('새로운 주제 5개를 확보하지 못했습니다. 주제 추천을 다시 눌러 주세요.');
  return accepted.slice(0,5);
}
export async function writeScript(key,model,topic,speed) {
  let feedback='';
  for (let attempt=0;attempt<3;attempt++) {
    const data=await generate(key,model,`요청 주제: ${JSON.stringify(topic)}. 6단계 한국어 대본을 생성하라. 낭독 속도 초당 ${speed}자, 휴지 포함 55초 목표, 최대 60초. ${feedback}`,scriptSchema);
    try { return validateScript(data,speed); }
    catch(e) { feedback=`이전 응답의 문제: ${e.message} 문장을 더 짧게 고쳐 새로 작성하라.`; }
  }
  throw Error('세 번 시도했지만 1분 대본 조건을 충족하지 못했습니다. 주제를 더 좁혀 다시 시도해 주세요.');
}
export class SheetDB {
  constructor(getToken){this.getToken=getToken;}
  headers(){const token=this.getToken();if(!token)throw Error('Google DB 연결을 먼저 눌러 주세요.');return {Authorization:`Bearer ${token}`,'Content-Type':'application/json'};}
  async read(){
    const data=await request(`${SHEETS}/values/${encodeURIComponent("'"+CONFIG.sheetName+"'!A:K")}`,{headers:this.headers()});
    return parseRows(data.values);
  }
  async save(record){
    // Client-side serial lock plus stable ID makes explicit retries idempotent.
    const rows=await this.read();
    const existing=rows.find(r=>r.id===record.id);
    if(existing) {
      if(existing.script===record.script && existing.topic===record.topic) return existing;
      throw Error('같은 기록ID가 다른 내용으로 저장되어 있습니다. 새 버전으로 저장해 주세요.');
    }
    await request(`${SHEETS}/values/${encodeURIComponent("'"+CONFIG.sheetName+"'!A:K")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,{method:'POST',headers:this.headers(),body:JSON.stringify({majorDimension:'ROWS',values:[toRow(record)]})});
    const saved=(await this.read()).find(r=>r.id===record.id);
    if(!saved || saved.script!==record.script) throw Error('저장 확인에 실패했습니다. 대본은 브라우저에 보관됩니다. 재시도해 주세요.');
    return saved;
  }
}
