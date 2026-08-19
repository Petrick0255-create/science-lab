# PDF 나란히 비교

두 PDF를 같은 배율과 위치로 나란히 비교하는 정적 웹앱입니다. PDF는 사용자의 브라우저 안에서만 처리되며 서버에 업로드되지 않습니다.

## Windows에서 실행

Node.js 22 이상을 설치한 뒤 프로젝트 폴더에서 실행합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 `http://localhost:5173` 주소를 브라우저에서 엽니다.

## GitHub Pages 배포

1. 이 폴더의 파일 전체를 GitHub 저장소의 `main` 브랜치에 올립니다.
2. 저장소의 **Settings → Pages → Build and deployment**에서 Source를 **GitHub Actions**로 선택합니다.
3. `main` 브랜치에 푸시하면 포함된 작업 파일이 자동으로 빌드하고 배포합니다.

## 지원 형식

- PDF: 열기, 확대, 검색, 2단 이동 및 동기 스크롤 지원
- HWP/HWPX: 브라우저만으로 정확히 변환할 수 없어 PDF로 저장한 뒤 사용해야 합니다.
