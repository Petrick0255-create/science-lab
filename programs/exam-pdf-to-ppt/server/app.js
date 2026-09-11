import express from 'express';
import multer from 'multer';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePdf } from './gemini.js';
import { createPptx } from './pptx.js';
import { MAX_PDF_BYTES, UserError, coverage, validateDocument, validateOptions } from '../shared/document.js';

export function createApp({ analyze = analyzePdf, env = process.env } = {}) {
  const app = express(); app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' }); next();
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PDF_BYTES, files: 1, fields: 1, parts: 3, fieldSize: 20 } });
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  app.get('/api/health', (_req, res) => res.json({ ok: true, configured: Boolean(env.GEMINI_API_KEY), authRequired: Boolean(env.APP_PASSWORD), model, maxPdfBytes: MAX_PDF_BYTES }));
  app.use('/api', (req, _res, next) => {
    if (req.method !== 'POST') return next();
    if (req.get('Sec-Fetch-Site') === 'cross-site') return next(new UserError('다른 사이트에서 보낸 요청은 허용되지 않습니다.', 403));
    if (env.APP_PASSWORD) {
      const expected = Buffer.from(env.APP_PASSWORD);
      const actual = Buffer.from((req.get('Authorization') || '').replace(/^Bearer /, ''));
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return next(new UserError('앱 접속 암호가 올바르지 않습니다.', 401));
    }
    next();
  });
  let analysisBusy = false; let nextAnalysisAt = 0;
  app.post('/api/analyze', (req, res, next) => {
    if (!env.GEMINI_API_KEY) return next(new UserError('서버에 GEMINI_API_KEY가 설정되지 않았습니다.', 503));
    if (analysisBusy || Date.now() < nextAnalysisAt) return next(new UserError('다른 분석을 처리 중이거나 요청 간격이 짧습니다. 잠시 후 다시 시도하세요.', 429));
    analysisBusy = true;
    const release = () => { analysisBusy = false; };
    res.once('finish', release); res.once('close', release);
    nextAnalysisAt = Date.now() + 2000; next();
  }, upload.single('pdf'), async (req, res, next) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 185000);
    const abort = () => { if (!res.writableEnded) controller.abort(); };
    res.once('close', abort);
    try {
      if (!req.file || req.file.buffer.subarray(0, 1024).indexOf(Buffer.from('%PDF-')) < 0) throw new UserError('유효한 PDF 파일을 선택하세요.');
      if (!['application/pdf', 'application/octet-stream'].includes(req.file.mimetype)) throw new UserError('PDF 파일만 분석할 수 있습니다.');
      const expectedCount = Number(req.body.expectedCount);
      if (![20, 25].includes(expectedCount)) throw new UserError('20문항 또는 25문항을 선택하세요.');
      const result = await analyze(req.file.buffer, { apiKey: env.GEMINI_API_KEY, model, expectedCount, signal: controller.signal });
      if (!res.destroyed) res.json(result);
    } catch (error) { if (!res.destroyed) next(error); }
    finally { clearTimeout(timer); res.off('close', abort); if (req.file) req.file.buffer = null; }
  });
  app.post('/api/export', express.json({ limit: '2mb' }), async (req, res, next) => {
    try {
      const doc = validateDocument(req.body); const options = validateOptions(req.body);
      if (!coverage(doc).complete) throw new UserError('누락·중복·범위 밖 번호를 수정한 뒤 내보내세요.', 422);
      doc.questions.sort((a, b) => Number(a.number) - Number(b.number));
      const { buffer, slideCount } = await createPptx(doc, options);
      const title = doc.title.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').slice(0, 100);
      res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="exam.pptx"; filename*=UTF-8''${encodeURIComponent(`${title}_문항별.pptx`)}`,
        'X-Slide-Count': String(slideCount) }); res.send(buffer);
    } catch (error) { next(error); }
  });
  app.use('/api', (_req, _res, next) => next(new UserError('존재하지 않는 API 경로입니다.', 404)));
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  app.use(express.static(dist)); app.get('/', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'PDF는 최대 10MB까지 처리합니다.' : 'PDF 파일 한 개와 문항 수만 업로드하세요.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: '요청 데이터가 너무 큽니다.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON 형식이 올바르지 않습니다.' });
    res.status(error instanceof UserError ? error.status : 500).json({ error: error instanceof UserError ? error.message : '서버 처리 중 오류가 발생했습니다.' });
  });
  return app;
}
