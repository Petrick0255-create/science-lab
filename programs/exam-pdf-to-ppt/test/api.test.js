import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { sampleExam } from './fixtures.js';

async function withApp(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('missing key, bad JSON and unknown route return safe JSON errors', async () => {
  await withApp({ env: {} }, async url => {
    const health = await (await fetch(url + '/api/health')).json(); assert.equal(health.configured, false);
    assert.equal((await fetch(url + '/api/analyze', { method: 'POST' })).status, 503);
    assert.equal((await fetch(url + '/api/nope')).status, 404);
    assert.equal((await fetch(url + '/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  });
});
test('export protects incomplete exams and produces PPTX', async () => {
  await withApp({ env: {} }, async url => {
    const doc = sampleExam(20);
    const post = body => fetch(url + '/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const good = await post(doc); assert.equal(good.status, 200);
    assert.ok(good.headers.get('content-type').includes('presentationml'));
    assert.ok((await good.arrayBuffer()).byteLength > 1000);
    doc.questions.pop(); assert.equal((await post(doc)).status, 422);
  });
});
test('PDF multipart path uses injected Gemini adapter without network or billing', async () => {
  let called = false;
  await withApp({ env: { GEMINI_API_KEY: 'test-placeholder' }, analyze: async (buffer, options) => {
    called = true; assert.ok(buffer.toString().startsWith('%PDF-')); assert.equal(options.expectedCount, 25); return sampleExam();
  } }, async url => {
    const form = new FormData(); form.append('pdf', new Blob(['%PDF-1.7\nfixture'], { type: 'application/pdf' }), 'test.pdf'); form.append('expectedCount', '25');
    const r = await fetch(url + '/api/analyze', { method: 'POST', body: form });
    assert.equal(r.status, 200); assert.equal((await r.json()).questions.length, 25); assert.ok(called);
  });
});
test('password guard rejects unauthenticated paid requests and never exposes secrets', async () => {
  await withApp({ env: { APP_PASSWORD: 'test-password', GEMINI_API_KEY: 'test-key' } }, async url => {
    const res = await fetch(url + '/api/analyze', { method: 'POST' });
    assert.equal(res.status, 401); assert.ok(!(await res.text()).includes('test-key'));
  });
});
