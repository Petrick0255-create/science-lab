# 문항 슬라이드 스튜디오

20문항 또는 25문항 모의고사 PDF를 Gemini로 전사하고, 편집 가능한 PowerPoint 파일로 내려받는 정적 웹앱입니다. `main` 브랜치에 커밋하면 GitHub Actions가 검사·빌드한 뒤 GitHub Pages에 자동 배포합니다.

## 최초 배포

1. GitHub에서 새 저장소를 만듭니다.
2. 이 ZIP의 내용물 전체를 저장소 루트에 올립니다. `package.json`과 `.github` 폴더가 저장소 최상단에 있어야 합니다.
3. 기본 브랜치 이름을 `main`으로 사용해 커밋합니다.
4. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
5. **Actions** 탭의 `Deploy to GitHub Pages` 실행이 끝나면, 해당 실행의 `deploy` 단계에 표시된 주소로 접속합니다.

이후 `main` 브랜치에 커밋할 때마다 자동으로 다시 배포됩니다. 저장소 이름이 무엇이든 동작하도록 상대 경로로 빌드합니다.

명령줄로 처음 올리는 경우:

```bash
git init -b main
git add .
git commit -m "feat: add exam PDF to PPT converter"
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

## 페이지 사용법

1. 배포된 페이지에서 Gemini API 키를 입력합니다.
2. 사용할 모델 이름을 확인합니다. 기본값은 `gemini-3.8-flash`이며, 계정에서 지원하는 모델 이름으로 바꿀 수 있습니다.
3. PDF를 선택하고 20문항 또는 25문항을 지정한 뒤 분석합니다.
4. 원본 PDF와 인식 결과를 대조하고, 위첨자·아래첨자·밑줄을 수정합니다.
5. 누락·중복 번호가 없으면 번호 스타일을 선택해 PPTX를 내려받습니다.

API 키는 `localStorage`의 `bbh-gemini-api-key` 항목에 저장됩니다. 해당 브라우저와 사이트 주소에서 다시 불러옵니다. GitHub 저장소, GitHub Actions, 별도 서버에는 저장하지 않습니다. 페이지는 입력된 키로 브라우저에서 Gemini API를 직접 호출합니다. 공용 PC에서는 사용 후 `저장된 키 삭제`를 누르세요.

PDF와 키는 브라우저에서 Google Gemini API로 직접 전송됩니다. 무료·유료 API의 데이터 처리 조건은 사용 중인 Google 계정과 프로젝트 정책을 따릅니다.

## PPT 출력 규칙

| 항목 | 출력 |
| --- | --- |
| 슬라이드 | 4:3, 검은 배경 |
| 기본 글꼴 | `210 M고딕 070` |
| 본문 | 흰색 24pt |
| 번호 스타일 1 | 노란색 28pt, 별도 텍스트 상자 |
| 번호 스타일 2 | 흰색 40pt, 별도 텍스트 상자 |
| 위·아래첨자 | PowerPoint 첨자 서식 |
| 긴 문항 | 24pt를 유지하며 다음 슬라이드로 분할 |

`210 M고딕 070` 글꼴 파일은 포함하지 않습니다. PPT를 여는 PC에 사용 가능한 글꼴을 설치해야 합니다. 그림·그래프와 복잡한 분수·행렬은 자동 재구성하지 않으며 원본 확인 표시를 남깁니다.

## 로컬 확인

Node.js 22.12 이상에서 실행합니다.

```bash
npm ci
npm run dev
```

브라우저에서 `http://127.0.0.1:5173`을 엽니다. 배포용 검사는 `npm run check`로 실행합니다.

## 파일 구성

- `.github/workflows/deploy-pages.yml`: `main` 커밋 시 GitHub Pages 자동 배포
- `src/gemini-client.js`: 브라우저에서 Gemini API 호출
- `src/pptx-client.js`: 브라우저에서 PPTX 생성
- `src/main.jsx`: PDF 업로드, 키 저장, 문항 편집 화면
- `shared/scientific-text.js`: 첨자·밑줄 변환
- `shared/layout.js`: 24pt 유지와 슬라이드 분할
- `test/core.test.js`: 문항 수·첨자·PPT 내부 XML 검사

저장소에는 API 키, PDF, 참고 PPT, 글꼴 파일이 포함되지 않습니다.
