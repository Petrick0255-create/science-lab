# 모의고사 문제 관리 웹앱

## 구성
- index.html
- style.css
- app.js
- config.js
- apps-script/Code.gs

## 연결된 구글 리소스
- 스프레드시트 ID: `1c-kFELnnPr9odYEctiOOUPLDSyLSj-2Vf3ZI2xPxNHo`
- 이미지 폴더 ID: `1IQohwxwwiT6-BSvVDe6WEZWu070FdYlU`

## 설치 순서

### 1. Apps Script 만들기
1. 구글 드라이브에서 새 Apps Script 프로젝트를 만듭니다.
2. 기본 `Code.gs` 내용을 지우고 `apps-script/Code.gs` 내용을 붙여넣습니다.
3. 저장합니다.

### 2. 웹 앱 배포
1. Apps Script 우측 상단 `배포` → `새 배포`
2. 유형: `웹 앱`
3. 실행 사용자: `나`
4. 액세스 권한: 사용하는 조직 환경에 맞게 선택
5. 배포 후 `/exec`로 끝나는 URL을 복사합니다.

### 3. config.js 수정
`API_URL`에 위에서 복사한 Apps Script 웹 앱 URL을 입력합니다.

```js
API_URL: "https://script.google.com/macros/s/....../exec"
```

### 4. 웹앱 배포
GitHub Pages, Cloudflare Pages, Firebase Hosting 중 하나에
`index.html`, `style.css`, `app.js`, `config.js`를 업로드합니다.

## 주요 기능
- 이미지 Ctrl+V 붙여넣기, 드래그앤드롭, 파일 선택
- 로컬 임시 저장
- Drive 폴더 자동 분류 저장
- 구글 시트 문항 DB 저장
- 시즌·회차 추가 및 수정
- 문항 수정·삭제
- 시즌·회차·유형·난이도 필터
- 최대 3문항 비교
- 문항 번호별 난이도 히트맵
- 난이도·유형 분포
- 회차별 요약

## 주의
- Apps Script 웹 앱 권한 설정이 잘못되면 브라우저에서 저장이 되지 않습니다.
- 이미지 폴더 접근 권한은 Apps Script 실행 계정이 가지고 있어야 합니다.
- 현재 버전의 해설은 HTML로 저장하며, 위첨자·아래첨자·굵게를 유지합니다.
