import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,seconds,validateScript,uniqueSuggestions,parseRows,HEADERS,toRow} from '../core.js';
test('Korean concept normalization handles whitespace and law suffix',()=>{
  assert.equal(normalize('질량 보존의 법칙'),normalize('질량보존'));
  assert.equal(normalize('관성 법칙'),normalize('관성'));
});
test('recommendations exclude prior names, concept synonyms and duplicates in same response',()=>{
  const items=[{topic:'질량보존',topicKey:'질량보존',field:'화학'},{topic:'관성의 법칙',topicKey:'관성',field:'물리학'},{topic:'관성',topicKey:'관성',field:'물리학'},{topic:'자연선택',topicKey:'자연선택',field:'생명과학'}];
  assert.deepEqual(uniqueSuggestions(items,[{topic:'질량 보존의 법칙',topicKey:'질량보존'}]).map(t=>t.topic),['관성의 법칙','자연선택']);
});
test('invalid recommendations cannot fill the result list',()=>{
  assert.equal(uniqueSuggestions([{topic:'',field:'화학',topicKey:'a'},{topic:'foo',field:'금융',topicKey:'foo'},null],[]).length,0);
});
test('duration and response shape validation reject excessive or incomplete scripts',()=>{
  const good={topic:'관성',topicKey:'관성',field:'물리학',segments:['여기, 공이 있습니다.','공이 굴러갑니다.','멈춰야 할 것 같습니다.','그런데 계속 움직입니다.','이것이 관성입니다.','사람도 어쩌면 비슷합니다.']};
  assert.ok(validateScript(good).estimatedSeconds<=60);
  assert.throws(()=>validateScript({...good,segments:good.segments.slice(0,5)}));
  assert.throws(()=>validateScript({...good,segments:[good.segments[0],'가'.repeat(500),...good.segments.slice(2)]}),/60초/);
  assert.ok(seconds('가'.repeat(300),5)>seconds('가'.repeat(300),7));
});
test('DB schema drift fails closed and literal formula text survives mapping',()=>{
  assert.throws(()=>parseRows([['topic']]));
  const r={id:'1',topic:'관성',field:'물리학',createdAt:'2026-09-12T00:00:00Z',script:'=IMPORTXML("example")',model:'gemini-3.1-flash-lite',version:'3.1',estimatedSeconds:10,status:'생성본',topicKey:'관성',updatedAt:'2026-09-12T00:00:00Z'};
  assert.equal(parseRows([HEADERS,toRow(r)])[0].script,r.script);
});
