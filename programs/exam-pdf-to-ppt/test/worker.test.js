import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { createSession, passwordMatches, readSession } from '../worker/index.js';

const secrets = { APP_PASSWORD: 'correct horse battery staple', SESSION_SECRET: 'session-secret-that-is-long-and-random' };

test('password comparison and signed session cookie work', async () => {
  assert.equal(await passwordMatches('correct horse battery staple', secrets.APP_PASSWORD), true);
  assert.equal(await passwordMatches('wrong', secrets.APP_PASSWORD), false);
  const token = await createSession(secrets.SESSION_SECRET);
  const session = await readSession(new Request('https://example.com/', { headers: { Cookie: `bbh_exam_session=${token}` } }), secrets.SESSION_SECRET);
  assert.ok(session?.sid);
  const tampered = await readSession(new Request('https://example.com/', { headers: { Cookie: `bbh_exam_session=${token}x` } }), secrets.SESSION_SECRET);
  assert.equal(tampered, null);
});

test('app is password-gated and successful login grants access', async () => {
  const env = {
    ...secrets,
    APP_BASE: '/programs/exam-pdf-to-ppt/',
    LOGIN_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response('APP', { headers: { 'Content-Type': 'text/html' } }) },
  };
  const anonymous = await worker.fetch(new Request('https://example.com/programs/exam-pdf-to-ppt/'), env);
  assert.match(await anonymous.text(), /공용 비밀번호/);
  const form = new FormData(); form.set('password', secrets.APP_PASSWORD);
  const login = await worker.fetch(new Request('https://example.com/programs/exam-pdf-to-ppt/api/login', { method: 'POST', body: form }), env);
  assert.equal(login.status, 303);
  const cookie = login.headers.get('Set-Cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  const authenticated = await worker.fetch(new Request('https://example.com/programs/exam-pdf-to-ppt/', { headers: { Cookie: cookie.split(';')[0] } }), env);
  assert.equal(await authenticated.text(), 'APP');
});

test('login also works when a Workers preview changes the Origin header', async () => {
  const env = {
    ...secrets,
    APP_BASE: '/programs/exam-pdf-to-ppt/',
    LOGIN_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response('APP') },
  };
  const form = new FormData();
  form.set('password', env.APP_PASSWORD);
  const response = await worker.fetch(new Request('https://example.com/programs/exam-pdf-to-ppt/api/login', {
    method: 'POST',
    headers: { Origin: 'https://preview.example.invalid' },
    body: form,
  }), env);
  assert.equal(response.status, 303);
  assert.match(response.headers.get('Set-Cookie') || '', /bbh_exam_session=/);
});

test('analysis endpoint rejects unauthenticated requests', async () => {
  const response = await worker.fetch(new Request('https://example.com/programs/exam-pdf-to-ppt/api/analyze', { method: 'POST' }), {
    ...secrets,
    APP_BASE: '/programs/exam-pdf-to-ppt/',
    ASSETS: { fetch: async () => new Response('APP') },
  });
  assert.equal(response.status, 401);
});
