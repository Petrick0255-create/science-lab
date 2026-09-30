import test from 'node:test';
import assert from 'node:assert/strict';
import {repairScientificTags} from '../assets/text-style-v40.js';
import {parseScientificText} from '../shared/scientific-text.js';
test('malformed formatting preserves text and yields balanced tags',()=>{
 for(const input of ['H<sub>2','<u>밑줄','a</sup>b','<u>x<sup>2</u> 끝','<sup><sub>2</sub></sup>']){
  const fixed=repairScientificTags(input);
  assert.equal(repairScientificTags(fixed),fixed);
  assert.equal(parseScientificText(input).map(r=>r.text).join(''),input.replace(/<\/?(?:sup|sub|u)>/g,''));
 }
});
