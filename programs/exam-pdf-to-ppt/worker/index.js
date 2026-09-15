const DEFAULT_APP_BASE = '/programs/exam-pdf-to-ppt/';
const SESSION_SECONDS = 8 * 60 * 60;
const COOKIE_NAME = 'bbh_exam_session';
const MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const MAX_DOCUMENT_BASE64 = 14_100_000;
const encoder = new TextEncoder();

function appBase(env) {
  const raw = String(env.APP_BASE || DEFAULT_APP_BASE).trim();
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function passwordMatches(candidate, expected) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  return constantTimeEqual(new Uint8Array(left), new Uint8Array(right));
}

async function createSession(secret) {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    sid: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })));
  const signature = bytesToBase64Url(await hmac(payload, secret));
  return `${payload}.${signature}`;
}

async function readSession(request, secret) {
  if (!secret) return null;
  const cookie = request.headers.get('Cookie') || '';
  const encoded = cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!encoded) return null;
  const [payload, signature, extra] = encoded.split('.');
  if (!payload || !signature || extra) return null;
  try {
    const expected = await hmac(payload, secret);
    if (!constantTimeEqual(base64UrlToBytes(signature), expected)) return null;
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (!data.sid || !Number.isInteger(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function securityHeaders(contentType = 'text/html; charset=utf-8') {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' blob: data:; frame-src blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  };
}

function loginPage(base, error = '') {
  const warning = error ? '<p class="error" role="alert">비밀번호가 올바르지 않습니다.</p>' : '';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>문항 슬라이드 스튜디오 로그인</title><style>
  :root{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0f14;color:#f5f6f9;padding:20px}.card{width:min(420px,100%);background:#151a23;border:1px solid #343c49;border-radius:10px;padding:30px}.mark{display:grid;place-items:center;width:44px;height:44px;background:#ffe400;color:#121212;border-radius:6px;font-size:26px;font-weight:800}h1{font-size:22px;margin:18px 0 6px}p{color:#adb5c3;font-size:14px;line-height:1.7}.error{color:#ffccd3;background:#351e27;border:1px solid #955362;border-radius:6px;padding:10px 12px}label{display:block;margin-top:22px;font-size:14px;font-weight:700}input{display:block;width:100%;margin-top:8px;padding:12px;border:1px solid #465163;border-radius:6px;background:#0c111a;color:#fff;font:inherit}button{width:100%;margin-top:18px;padding:13px;border:0;border-radius:6px;background:#ffe400;color:#121212;font:inherit;font-weight:800;cursor:pointer}
  </style></head><body><main class="card"><span class="mark">Q</span><h1>문항 슬라이드 스튜디오</h1><p>공용 비밀번호를 입력하면 8시간 동안 사용할 수 있습니다.</p>${warning}<form method="post" action="${base}api/login"><label>공용 비밀번호<input type="password" name="password" required maxlength="200" autocomplete="current-password" autofocus></label><button type="submit">로그인</button></form></main></body></html>`;
}

function redirect(location, cookie) {
  const headers = { Location: location, 'Cache-Control': 'no-store' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 303, headers });
}

async function checkLimit(binding, key) {
  if (!binding) return true;
  return (await binding.limit({ key })).success;
}

async function handleLogin(request, env, base) {
  if (!env.APP_PASSWORD || !env.SESSION_SECRET) return new Response('로그인 Secret이 설정되지 않았습니다.', { status: 503, headers: securityHeaders('text/plain; charset=utf-8') });
  const clientKey = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!await checkLimit(env.LOGIN_RATE_LIMITER, `login:${clientKey}`)) return new Response('로그인 시도가 너무 많습니다. 1분 후 다시 시도하세요.', { status: 429, headers: securityHeaders('text/plain; charset=utf-8') });
  const form = await request.formData();
  const candidate = String(form.get('password') || '');
  if (!candidate || candidate.length > 200 || !await passwordMatches(candidate, env.APP_PASSWORD)) return new Response(loginPage(base, 'invalid'), { status: 401, headers: securityHeaders() });
  const token = await createSession(env.SESSION_SECRET);
  const cookie = `${COOKIE_NAME}=${token}; Path=${base}; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
  return redirect(base, cookie);
}

async function handleAnalyze(request, env, session) {
  if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({ error: 'Gemini API Secret이 설정되지 않았습니다.' }), { status: 503, headers: securityHeaders('application/json; charset=utf-8') });
  if (!await checkLimit(env.ANALYZE_RATE_LIMITER, `analyze:${session.sid}`)) return new Response(JSON.stringify({ error: '분석 요청이 너무 많습니다. 1분 후 다시 시도하세요.' }), { status: 429, headers: securityHeaders('application/json; charset=utf-8') });
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) return new Response(JSON.stringify({ error: 'PDF 요청 크기가 너무 큽니다.' }), { status: 413, headers: securityHeaders('application/json; charset=utf-8') });
  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: '요청을 읽지 못했습니다.' }), { status: 400, headers: securityHeaders('application/json; charset=utf-8') }); }
  const model = String(body.model || '');
  const documentData = String(body.documentData || '');
  const instruction = String(body.instruction || '');
  const schemaText = JSON.stringify(body.schema || null);
  if (!/^gemini-[a-zA-Z0-9._-]{1,80}$/.test(model) || !documentData || documentData.length > MAX_DOCUMENT_BASE64 || instruction.length < 10 || instruction.length > 30_000 || schemaText.length > 30_000)
    return new Response(JSON.stringify({ error: '분석 요청 형식을 확인하세요.' }), { status: 400, headers: securityHeaders('application/json; charset=utf-8') });
  const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    signal: request.signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      model,
      input: [
        { type: 'document', data: documentData, mime_type: 'application/pdf' },
        { type: 'text', text: instruction },
      ],
      response_format: { type: 'text', mime_type: 'application/json', schema: body.schema },
    }),
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: securityHeaders(upstream.headers.get('Content-Type') || 'application/json; charset=utf-8'),
  });
}

async function addAppHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders(headers.get('Content-Type') || 'application/octet-stream'))) headers.set(name, value);
  if (!String(headers.get('Content-Type')).includes('text/html')) headers.delete('Cache-Control');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const base = appBase(env);
    if (url.pathname === '/') return Response.redirect(new URL(base, url).toString(), 302);
    if (!url.pathname.startsWith(base)) return env.ASSETS.fetch(request);
    const relative = url.pathname.slice(base.length);
    if (relative === 'api/login' && request.method === 'POST') return handleLogin(request, env, base);
    if (relative === 'api/logout') {
      const expired = `${COOKIE_NAME}=; Path=${base}; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
      return redirect(base, expired);
    }
    const session = await readSession(request, env.SESSION_SECRET);
    if (!session) {
      if (relative.startsWith('api/')) return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), { status: 401, headers: securityHeaders('application/json; charset=utf-8') });
      return new Response(loginPage(base), { status: 200, headers: securityHeaders() });
    }
    if (relative === 'api/analyze' && request.method === 'POST') return handleAnalyze(request, env, session);
    if (relative.startsWith('api/')) return new Response('Not Found', { status: 404 });
    return addAppHeaders(await env.ASSETS.fetch(request));
  },
};

export { appBase, createSession, passwordMatches, readSession };
