# 문항 슬라이드 스튜디오 v43

## 수정 사항

PPTX의 텍스트 상자에 요청한 PowerPoint 설정을 적용합니다.

- 자동 맞춤: 도형을 텍스트 크기에 맞춤
- 왼쪽·오른쪽 여백: 각 0.25cm
- 위쪽·아래쪽 여백: 각 0.13cm
- 도형의 텍스트 배치: 켬

문항 번호는 추가된 좌우 여백만큼 상자의 너비를 늘려 `06번`처럼 번호와 접미사가 한 줄에 유지되도록 합니다. 표 셀은 별도의 셀 서식을 유지합니다.

v42의 한글 단어 잘림 허용, 편집 가능한 분수의 일반 텍스트 형식, `210 M고딕 070` 24pt 설정도 유지합니다. 자동 맞춤을 켰으므로 PowerPoint에서 내용을 편집하면 텍스트 상자의 크기가 내용에 맞춰 바뀝니다.

## 기존 Cloudflare 앱 업데이트

압축에는 빌드된 v43 파일이 포함되어 있습니다. 압축을 푼 폴더에서 아래 명령을 순서대로 실행합니다.

```powershell
npm.cmd ci
npm.cmd run build:v43
npx.cmd wrangler login
npx.cmd wrangler deploy
```

기존 앱을 배포한 Cloudflare 계정으로 로그인합니다. Worker 이름은 `exam-pdf-to-ppt-secure`이며 기존 Secret은 다시 등록하지 않아도 됩니다. 배포 완료 후 사이트를 Ctrl+F5로 새로고침하여 화면 상단의 v43을 확인합니다.

활성 소스는 `assets/index-v43.js`와 여기서 가져오는 v43 파일입니다. Cloudflare 배포 파일은 `public-site/programs/exam-pdf-to-ppt/`에 있습니다. 자동 검사는 `npm test`로 실행합니다.
