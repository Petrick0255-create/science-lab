# 문항 슬라이드 스튜디오

공용 비밀번호로 로그인한 사용자만 이용할 수 있으며, Gemini API 키는 Cloudflare Worker Secret에만 저장됩니다. 배포 순서와 Secret 설정 방법은 [DEPLOY_PASSWORD.md](DEPLOY_PASSWORD.md)를 참고하세요.

20문항, 25문항 또는 사용자가 지정한 문제 번호 범위의 PDF를 Gemini로 전사하고, 편집 가능한 PowerPoint 파일로 내려받는 Cloudflare Worker 앱입니다. Worker가 로그인, 정적 사이트, Gemini API 중계를 함께 처리합니다.

## 최초 배포

압축을 푼 폴더에서 다음 명령을 실행합니다.

```bash
npm install
npx wrangler login
npx wrangler deploy
```

그다음 `GEMINI_API_KEY`, `APP_PASSWORD`, `SESSION_SECRET` 세 Secret을 설정합니다. 전체 순서는 [DEPLOY_PASSWORD.md](DEPLOY_PASSWORD.md)에 설명되어 있습니다.

## 페이지 사용법

1. 공용 비밀번호로 로그인합니다.
2. Gemini 모델을 드롭다운에서 선택합니다. 기본값은 비용과 속도에 유리한 `Gemini 3.1 Flash-Lite`입니다.
3. PDF를 선택하고 20문항, 25문항 또는 자유 형식의 시작·끝 문제 번호를 지정한 뒤 분석합니다. 자유 형식은 `012`처럼 앞자리 0이 있는 1~3자리 번호도 지원합니다.
4. 원본 PDF와 인식 결과를 대조하고, 위첨자·아래첨자·밑줄을 수정합니다.
5. 누락·중복 번호가 없으면 번호 색상·자릿수·글자 크기와 ㄱ·ㄴ·ㄷ 보기 포함 여부를 선택해 PPTX를 내려받습니다.

PDF는 로그인된 요청에 한해 Worker를 거쳐 Gemini API로 전송됩니다. Gemini API 키는 Cloudflare Secret에만 저장되며 브라우저에 전달되지 않습니다.

## PPT 출력 규칙

| 항목 | 출력 |
| --- | --- |
| 슬라이드 | 4:3, 검은 배경 |
| 기본 글꼴 | `210 M고딕 070` |
| 본문 | 흰색 24pt |
| 번호 스타일 | 기존 노란색 2자리, 흰색 2자리, 흰색 3자리 |
| 번호 크기 | 기본 28pt, 20~48pt 선택 |
| 내용 범위 | 발문+내용만 또는 발문+내용+ㄱ·ㄴ·ㄷ 보기 |
| 위·아래첨자 | PowerPoint 첨자 서식 |
| 긴 문항 | 24pt를 유지하며 다음 슬라이드로 분할 |

`210 M고딕 070` 글꼴 파일은 포함하지 않습니다. PPT를 여는 PC에 사용 가능한 글꼴을 설치해야 합니다. 그림·그래프와 복잡한 분수·행렬은 자동 재구성하지 않으며 원본 확인 표시를 남깁니다.

## 로컬 확인

Node.js 22.12 이상에서 실행합니다.

```bash
npm ci
npm run dev
```

프런트엔드 개발 화면은 `http://127.0.0.1:5173`에서 열립니다. 실제 공용 비밀번호와 API 중계는 Cloudflare Worker 배포 환경에서 동작합니다. 배포용 검사는 `npm test`로 실행합니다.

## 파일 구성

- `worker/index.js`: 공용 비밀번호 로그인, 세션 쿠키, Gemini API 중계
- `wrangler.jsonc`: Cloudflare Worker와 정적 자산 설정
- `public-site/`: Worker가 실제로 배포하는 사이트 파일
- `src/gemini-client.js`: 같은 출처의 Worker API 호출
- `src/pptx-client.js`: 브라우저에서 PPTX 생성
- `src/main.jsx`: PDF 업로드와 문항 편집 화면
- `shared/scientific-text.js`: 첨자·밑줄 변환
- `shared/layout.js`: 24pt 유지와 슬라이드 분할
- `test/core.test.js`: 문항 수·첨자·PPT 내부 XML 검사

저장소에는 API 키, 공용 비밀번호, 세션 Secret, PDF, 참고 PPT, 글꼴 파일이 포함되지 않습니다.
