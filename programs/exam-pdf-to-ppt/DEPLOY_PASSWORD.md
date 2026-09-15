# 공용 비밀번호 버전 배포 안내

이 프로젝트는 Cloudflare Worker 하나가 정적 사이트, 공용 비밀번호 로그인, Gemini API 중계를 함께 처리합니다. 브라우저에는 Gemini API 키가 전달되지 않습니다.

## 1. 준비

1. Node.js 22 이상을 설치합니다.
2. 이 ZIP을 압축 해제하고 폴더 안에서 터미널을 엽니다.
3. `npm install`을 실행합니다.
4. `npx wrangler login`을 실행하고 Cloudflare 계정 로그인을 완료합니다.

## 2. Worker를 한 번 생성

```bash
npx wrangler deploy
```

명령이 끝나면 `exam-pdf-to-ppt-secure` Worker와 `workers.dev` 주소가 만들어집니다. 이 최초 배포 직후에는 아직 Secret이 없으므로 로그인할 수 없는 것이 정상입니다.

## 3. Cloudflare Secret 설정

아래 명령을 각각 실행합니다. 명령 실행 후 표시되는 입력란에 실제 값을 붙여넣습니다. 값은 코드나 `wrangler.jsonc`에 적지 않습니다.

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
```

- `GEMINI_API_KEY`: Google AI Studio에서 발급한 Gemini API 키
- `APP_PASSWORD`: 사용자들과 공유할 접속 비밀번호. 12자 이상의 긴 비밀번호 권장
- `SESSION_SECRET`: 쿠키 서명용 무작위 문자열. 공용 비밀번호와 다른 32자 이상의 값을 사용

Windows PowerShell에서 `SESSION_SECRET`용 무작위 값을 만들려면 다음 명령을 실행합니다. Windows PowerShell 5.1에서도 동작합니다.

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Secret 이름은 대소문자를 포함하여 정확히 입력해야 합니다.

CLI 대신 Cloudflare 대시보드에서 입력해도 됩니다.

1. Cloudflare 대시보드에서 **Workers & Pages**를 엽니다.
2. `exam-pdf-to-ppt-secure` Worker를 선택합니다.
3. **Settings → Variables and Secrets**로 이동합니다.
4. 위 세 이름을 각각 추가하고, 유형은 반드시 **Secret**으로 선택합니다.

Secret을 설정하면 새 Worker 버전이 적용됩니다.

## 4. 접속 확인

배포가 끝나면 출력된 `https://...workers.dev` 주소 뒤에 다음 경로를 붙여 접속합니다.

```text
/programs/exam-pdf-to-ppt/
```

예: `https://exam-pdf-to-ppt-secure.계정명.workers.dev/programs/exam-pdf-to-ppt/`

처음 접속하면 공용 비밀번호 화면이 나타납니다. 로그인 성공 후 8시간 동안 유지됩니다.

## 5. 기존 science-lab1 Worker 이름으로 배포하는 경우

`wrangler.jsonc`의 `name`을 기존 Worker 이름인 `science-lab1`으로 바꾼 뒤 배포할 수 있습니다. 단, 기존 Worker가 다른 프로그램도 함께 서비스하고 있다면 이 ZIP을 그대로 배포하면 기존 프로그램이 사라질 수 있으므로 사용하지 마십시오. 이 경우에는 기존 `science-lab1` 전체 소스에 이 프로젝트의 `worker/index.js` 인증·API 경로와 `public-site/programs/exam-pdf-to-ppt/` 폴더를 병합해야 합니다.

현재 앱 경로를 바꾸려면 `wrangler.jsonc`의 `APP_BASE`와 `public-site` 아래 폴더 경로를 똑같이 변경해야 합니다.

## 6. 비밀번호 또는 API 키 변경

코드를 수정하지 않고 해당 Secret만 다시 입력합니다.

```bash
npx wrangler secret put APP_PASSWORD
npx wrangler secret put GEMINI_API_KEY
```

Secret 변경 명령은 새 Worker 버전을 배포합니다. 기존 로그인 쿠키까지 모두 무효화하려면 `SESSION_SECRET`도 새 값으로 바꿉니다.

## 7. 로그아웃

앱 주소 뒤의 `api/logout`으로 접속합니다.

```text
https://배포주소/programs/exam-pdf-to-ppt/api/logout
```

## 8. 사용 제한

- 로그인 실패: 접속 위치당 1분에 5회
- PDF 분석: 로그인 세션당 1분에 6회
- 로그인 유지: 8시간
- PDF 최대 크기: 앱 기준 10MB

제한을 바꾸려면 `wrangler.jsonc`의 `ratelimits` 값을 수정합니다. `period`는 Cloudflare Worker Rate Limiting 규격에 따라 10초 또는 60초를 사용합니다.

## 9. 오류 확인

실시간 로그:

```bash
npx wrangler tail
```

- `로그인 Secret이 설정되지 않았습니다.`: `APP_PASSWORD` 또는 `SESSION_SECRET`을 설정합니다.
- `Gemini API Secret이 설정되지 않았습니다.`: `GEMINI_API_KEY`를 설정합니다.
- HTTP 401: 로그인 쿠키가 없거나 만료된 상태입니다.
- HTTP 429: 로그인 또는 분석 요청 제한에 도달했습니다.
- Gemini 400/403: API 키의 Gemini API 사용 권한과 모델 이름을 확인합니다.

## 보안 주의

- 실제 비밀번호나 Gemini API 키를 GitHub, ZIP, 소스 코드, `wrangler.jsonc`에 넣지 않습니다.
- 공용 비밀번호를 바꾸면 `APP_PASSWORD` Secret만 다시 설정합니다.
- 공용 비밀번호를 아는 사람은 계정의 Gemini 사용량을 소비할 수 있으므로 Google Cloud 결제 알림과 Gemini 사용량을 확인합니다.
