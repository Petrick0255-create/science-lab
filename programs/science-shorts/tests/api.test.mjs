import test from 'node:test';
import assert from 'node:assert/strict';
import {SheetDB,listModels,recommend,writeScript} from '../api.js';
import {HEADERS,toRow} from '../core.js';
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json'}});
const r={id:'stable-id',topic:'관성',field:'물리학',createdAt:'2026-09-12T00:00:00Z',script:'여기, 공이 있습니다.',model:'gemini-3.1-flash-lite',version:'3.1',estimatedSeconds:4,status:'생성본',topicKey:'관성',updatedAt:'2026-09-12T00:00:00Z'};
test('model list follows pages and never puts API key in URL',async(t)=>{
  let count=0;
  t.mock.method(globalThis,'fetch',async(url,options)=>{assert.ok(!url.includes('test-key'));assert.equal(options.headers['x-goog-api-key'],'test-key');return json(++count===1?{models:[{name:'models/gemini-3.1-flash-lite',supportedGenerationMethods:['generateContent']}],nextPageToken:'next'}:{models:[{name:'models/embedding',supportedGenerationMethods:['embedContent']}]});});
  assert.deepEqual(await listModels('test-key'),['gemini-3.1-flash-lite']);assert.equal(count,2);
});
test('DB read failure is not treated as an empty database',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>json({error:{message:'sensitive-upstream-content'}},403));
  await assert.rejects(()=>new SheetDB(()=> 'token').read(),e=>e.message.includes('403')&&!e.message.includes('sensitive'));
});
test('expired auth stops before any request',async(t)=>{
  const mock=t.mock.method(globalThis,'fetch',()=>{throw Error('must not fetch');});
  await assert.rejects(()=>new SheetDB(()=> '').read(),/연결/);assert.equal(mock.mock.callCount(),0);
});
test('append uses RAW, stable IDs and readback; repeating save does not append',async(t)=>{
  let values=[HEADERS],writes=0;
  t.mock.method(globalThis,'fetch',async(url,opts)=>{
    assert.equal(opts.headers.Authorization,'Bearer test-token');assert.ok(!JSON.stringify(opts).includes('apiKey'));
    if(opts.method==='POST'){writes++;assert.ok(url.includes('valueInputOption=RAW'));values.push(...JSON.parse(opts.body).values);return json({updates:{updatedRows:1}});}
    return json({values});
  });
  const db=new SheetDB(()=> 'test-token');await db.save(r);await db.save(r);assert.equal(writes,1);
});
test('lost append response can be retried without duplicating confirmed record',async(t)=>{
  let values=[HEADERS],writes=0;
  t.mock.method(globalThis,'fetch',async(url,opts)=>{if(opts.method==='POST'){writes++;values.push(toRow(r));throw Error('network gone');}return json({values});});
  const db=new SheetDB(()=> 'token');await assert.rejects(()=>db.save(r),/연결/);await db.save(r);assert.equal(writes,1);
});
test('a readback mismatch is not reported as successful save',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>json({values:[HEADERS]}));
  await assert.rejects(()=>new SheetDB(()=> 'token').save(r),/저장 확인/);
});
test('recommendation repairs duplicate topics and returns exactly five',async(t)=>{
  let count=0;const names=['관성','삼투압','표면장력','자연선택','판구조론'];
  t.mock.method(globalThis,'fetch',async()=>{count++;const topics=(count===1?['질량 보존의 법칙',...names.slice(0,4)]:[names[4]]).map(topic=>({topic,field:'물리학',topicKey:topic}));return json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({topics})}]}}]});});
  const result=await recommend('key','gemini-3.1-flash-lite',[{topic:'질량보존',topicKey:'질량보존'}]);assert.equal(result.length,5);assert.equal(count,2);
});
test('overlong script is regenerated before it can be saved',async(t)=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({topic:'관성',field:'물리학',topicKey:'관성',segments:['여기, 공이 있습니다.',calls===1?'가'.repeat(600):'공이 굴러갑니다.','곧 멈출 것 같습니다.','그런데 계속 갑니다.','이것이 관성입니다.','사람도 어쩌면 비슷합니다.']})}]}}]});});
  assert.ok((await writeScript('key','gemini-3.1-flash-lite','관성',6)).estimatedSeconds<=60);assert.equal(calls,2);
});
test('blocked or truncated model responses fail explicitly',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>json({candidates:[{finishReason:'SAFETY'}]}));
  await assert.rejects(()=>writeScript('key','gemini-3.1-flash-lite','관성',6),/차단/);
});
