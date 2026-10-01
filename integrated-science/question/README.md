# J&B 질문 검색

GitHub Pages용 정적 사이트입니다. 이 폴더의 파일을 저장소 루트에 올리면 별도 서버 없이 작동합니다.
페이지를 열 때마다 Google Sheets의 질문 모음 탭을 불러오므로, 시트에 질문과 답변이 추가되면 사이트에도 자동 반영됩니다.

## 배포 방법

1. index.html, styles.css, app.js, qa-data.js를 GitHub 저장소에 업로드합니다.
2. 저장소의 Settings → Pages에서 Deploy from a branch를 선택합니다.
3. main 브랜치와 / (root)를 선택하고 저장합니다.

qa-data.js는 Google Sheets 연결이 일시적으로 실패할 때 사용하는 예비 데이터입니다.
