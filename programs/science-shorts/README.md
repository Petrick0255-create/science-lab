# J&B LAB 과학 쇼츠 작업실

`programs/science-shorts/`에 독립적으로 추가되는 무빌드 정적 웹앱. 기존 홈, 서비스 워커, 다른 프로그램을 수정하지 않습니다.

## 시작

1. 이 폴더를 정적 호스팅하거나, 폴더에서 `python3 -m http.server 8080` 실행 후 `http://localhost:8080`을 엽니다.
2. `setup.html`의 최초 설정을 따라 Google Cloud에서 Sheets API와 웹 OAuth 클라이언트를 준비합니다. 앱 원본을 승인된 JavaScript 원본에 등록합니다.
3. 앱의 연결 설정에 Gemini 키 및 OAuth 클라이언트 ID를 저장합니다. 공개 식별자인 클라이언트 ID는 `config.js`에 고정해도 됩니다. 보안 비밀은 사용하지 않습니다.
4. Google DB 연결 → 주제 추천/직접 입력 → 1분 대본 만들기. 생성 후 자동 DB 저장과 readback을 수행합니다.

DB: https://docs.google.com/spreadsheets/d/1dRbL0fivN0iFhJDRg1KDCdWY7Mwca3b24O0JtUQj_Yg/edit

Drive 폴더: https://drive.google.com/drive/folders/1yavbHbJwtMERV-ZaWtZ7yiGM3mUWgnZF

OAuth 클라이언트 ID는 별도 제공되지 않아 기본값이 비어 있습니다. 최초 설정 전에는 실제 DB/API 통합 실행을 완료할 수 없습니다. Google 로그인 토큰은 메모리에만 있고 만료 시 사용자가 다시 연결합니다. 개인용 단일 작성자 사용을 기준으로 합니다.

## 문체 설계

관찰(여기 ~이 있습니다) → 구체적인 현상/조건부 숫자 → 실제 옛 설명 또는 흔한 직관 → 반전과 이유 → 법칙/원리 이름 → 짧은 삶의 비유와 여운. 문장은 짧은 존댓말로 쓰며, 6단계 구조화 응답을 검증합니다. 알려지지 않은 과학사를 창작하는 대신 직관 설명으로 전환하고, 삶의 비유는 과학적 인과 주장으로 만들지 않습니다. 생성물은 사실 검증을 마친 출판 원고가 아니므로 사용 전 내용을 검토하세요.

초당 5/6/7개의 문자(한글·영문·숫자)와 문장/문단 휴지를 이용해 예상 낭독 시간을 계산합니다. 60초 초과나 구조 오류는 최대 2회 추가 생성합니다. 실제 TTS/음성 측정은 아니며 숫자 읽기·강조·개인 낭독 속도에 따라 차이가 납니다. UI 편집 후 60초 초과면 DB 저장을 차단합니다.

## 모델 매핑 (2026-09-12 공식 문서 확인)

| UI | 실제 API ID | 근거 |
| --- | --- | --- |
| 3.1 · Flash-Lite (기본) | `gemini-3.1-flash-lite` | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite |
| 3.5 · Flash | `gemini-3.5-flash` | https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash |
| 3.8 · Flash | `gemini-3.8-flash` | https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash |

각 키로 `models.list`를 페이지 순회하여 `generateContent` 지원 여부를 검증합니다. 문서에 있는 모델이라도 계정·지역·권한에 따라 실패할 수 있습니다. 다른 모델로 조용히 대체하지 않습니다. 키 확인은 생성 과금/쿼터까지 보장하지 않습니다.

## DB와 오류 처리

`주제DB!A:K`: 기록ID, 주제, 분야, 생성일시(UTC ISO 8601), 대본, 사용모델, 모델선택, 예상초, 상태, 주제키, 수정일시. 최초 사용자 기준 대본은 생성일시를 모르는 상태로 공란을 유지합니다.

- 추천 전에 DB를 새로 읽습니다. 읽기 실패 시 추천을 중지합니다. 동의어 제외 프롬프트 + 정규화된 제목/대표개념 키 비교로 중복을 제거하고 최대 3회 요청으로 5개를 채웁니다. 의미상 동의어 판별은 모델에 의존하므로 완전한 의미 중복 방지를 보장하지 않습니다.
- 사용자가 직접 입력한 기존 주제는 새 버전 생성을 허용합니다.
- 생성 직후 localStorage에 복구 가능한 대본을 보관한 뒤 DB에 저장합니다. API 키는 설정 저장소만 사용하며 DB 요청에 포함하지 않습니다.
- DB는 `RAW`로 append하므로 `=`, `+`, `@`로 시작하는 내용도 수식으로 실행되지 않습니다. 모델 출력은 DOM `textContent` 또는 textarea 값으로 렌더링합니다.
- 같은 ID를 먼저 확인하고 저장 후 재조회합니다. 동일 원본의 여러 탭은 Web Locks로 직렬화합니다. HTTP 응답 유실 후 재시도는 먼저 기존 ID를 확인합니다.
- Sheets API에는 조건부 append 트랜잭션이 없습니다. 서로 다른 기기나 오랫동안 지연된 최초 append와 재시도의 경쟁까지 exactly-once로 보장하지는 않습니다. 공동 작성 규모가 커지면 서버 측 잠금이 있는 백엔드를 추가해야 합니다.
- 수정본은 새 ID로 append합니다. 기존 행을 덮어쓰거나 삭제하지 않습니다.
- 요청 제한, 권한 거부, 인증 만료, 시간 초과, 비정상/차단 응답, localStorage 실패를 사용자에게 표시합니다. Gemini 키나 Google 토큰을 로그에 출력하지 않습니다.
- 상위 Drive 폴더의 링크 편집 공유를 그대로 상속했습니다. 공유 권한을 앱이 변경하지 않습니다.

## 검증

`node --test tests/*.test.mjs` — 중복 필터, 분량/구조, 모델 페이지 조회, API 오류, DB 실패 및 저장 재시도, RAW 저장과 readback을 네트워크 모킹으로 검증합니다. 실제 사용자 키나 OAuth 토큰은 테스트에 사용하지 않습니다.

공식 API 참고: [Sheets append](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append), [브라우저 OAuth](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Gemini models](https://ai.google.dev/api/models).
