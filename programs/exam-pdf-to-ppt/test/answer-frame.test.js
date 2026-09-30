import test from 'node:test';
import assert from 'node:assert/strict';
import {isAnswerHeadingRule} from '../assets/pdf-figures-v36.js';
const label=[{str:'보 기',box:[100,200,112,225]}];
test('decorated rules on either side of the answer heading are excluded',()=>{
 assert.equal(isAnswerHeadingRule([103,70,117,194],label,12),true);
 assert.equal(isAnswerHeadingRule([103,232,117,356],label,12),true);
});
test('thin arrows and graphs without an adjacent answer heading remain',()=>{
 assert.equal(isAnswerHeadingRule([103,70,117,194],[],12),false);
 assert.equal(isAnswerHeadingRule([160,70,174,194],label,12),false);
 assert.equal(isAnswerHeadingRule([103,70,190,194],label,12),false);
});
test('split PDF heading text also excludes answer frame rules',()=>{
 assert.equal(isAnswerHeadingRule([103,70,117,194],[{str:'보',box:[100,200,112,211]},{str:'기',box:[100,215,112,226]}],12),true);
});
