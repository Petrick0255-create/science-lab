# v22 번호 표시 수정본

## 변경 사항

- 화면 상단과 브라우저 제목에 v22를 표시합니다.
- 번호와 발문 첫 줄의 기준선을 번호 크기에 따라 연속적으로 맞춥니다. 기존의 36pt 이상 고정 위치 보정을 제거했습니다.

- 노란색 2자리 / 흰색 2자리 / 흰색 3자리 스타일을 유지합니다.
- `번호 뒤에 번 붙이기`를 선택하면 각각 `01번`, `01번`, `001번`으로 표시합니다.
- 기본값은 선택 해제입니다. 번호만 표시됩니다.
- 번호 글자 크기는 20~48pt에서 2pt 단위로 선택합니다. 기본값은 기존 28pt입니다.
- 화면 미리보기와 내려받는 PPT에 함께 적용됩니다. `번`도 번호와 같은 색상·크기를 사용합니다.
- v22 배포 코드의 번호 너비 계산에 `번`을 포함하여 본문 첫 줄 들여쓰기도 함께 조정합니다.

## 기존 사이트 업데이트

### science-lab 저장소의 programs 폴더로 배포하는 경우

1. 압축을 풉니다.
2. 기존 저장소의 `programs/exam-pdf-to-ppt/`에 수정본 폴더의 `index.html`과 `assets/`를 덮어씁니다.
3. 기존에 사용하던 Git 커밋·푸시 또는 배포 절차를 실행합니다.
4. 브라우저에서 Ctrl+F5를 눌러 갱신합니다.

기존 사이트 전체의 Worker 설정과 다른 프로그램은 그대로 두세요. 이 ZIP의 `wrangler.jsonc`는 이 앱만 따로 서비스하는 설정입니다.

### 이 앱 전용 Cloudflare Worker를 이미 사용하는 경우

1. Node.js 22.12 이상을 준비합니다.
2. 압축 해제한 `exam-pdf-to-ppt` 폴더에서 터미널을 엽니다.
3. `wrangler.jsonc`의 `name`이 기존 앱 전용 Worker 이름과 같은지 확인합니다.
4. 아래 명령을 실행합니다.

```powershell
npm ci
npx wrangler login
npx wrangler deploy
```

배포 파일을 이미 포함했으므로 별도 빌드는 필요 없습니다. 실제 Worker 배포 대상은 `public-site/`이며 수정된 파일을 여기에 함께 반영했습니다. 기존 Worker의 Secret은 다시 입력할 필요가 없습니다.

## 처음 배포하는 경우

위 명령을 실행한 뒤 아래 세 값을 설정합니다.

```powershell
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
```

각 명령의 입력 안내에 따라 API 키, 접속 비밀번호, 서명용 무작위 문자열을 입력합니다. 상세 설정은 `DEPLOY_PASSWORD.md`를 참고하세요.

완료 후 표시된 Worker 주소 뒤에 `/programs/exam-pdf-to-ppt/`를 붙여 접속합니다.

## 확인 방법

1. 처음 열었을 때 `번호 뒤에 번 붙이기`가 꺼져 있는지 확인합니다.
2. 세 번호 스타일에서 체크를 켜고 꺼서 번호 표시를 확인합니다.
3. 42pt를 선택하여 PPT를 내려받고 번호가 42pt인지 확인합니다.

## 코드 유지보수

원본 ZIP의 `src/`, `shared/`와 실제 v22 배포 번들에는 기존부터 차이가 있습니다. 이번 변경은 양쪽에 적용했으며, 기존 v22의 본문·표·조건 배치를 보존했습니다. 배포용 v22 코드는 `assets/index-v22.js`입니다. 수정 후 `npm run build:v22`로 압축 코드와 Worker용 사본을 갱신할 수 있습니다. 전체 검사: `npm test`.

공식 문서: https://developers.cloudflare.com/workers/wrangler/commands/workers/
Secret 설정: https://developers.cloudflare.com/workers/configuration/secrets/
