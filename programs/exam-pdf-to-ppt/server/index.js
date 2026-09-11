import 'dotenv/config';
import { createApp } from './app.js';
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost'].includes(host) && !process.env.APP_PASSWORD) {
  throw new Error('외부 접속을 허용하려면 APP_PASSWORD를 설정하세요.');
}
const server = createApp().listen(port, host, () => console.log(`문항 슬라이드 스튜디오: http://${host}:${port}`));
server.requestTimeout = 240000;
