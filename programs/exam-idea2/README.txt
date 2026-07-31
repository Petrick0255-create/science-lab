문제 아이디어 페이지 설치
==========================

1. Apps Script 연결
-------------------
1) 아래 스프레드시트에서 [확장 프로그램] → [Apps Script]를 엽니다.
   https://docs.google.com/spreadsheets/d/1x-41yDs1h2rg9SDVbr4Z2WXFGywoMiqatV6TbcwZzew/edit

2) 기본 Code.gs의 내용을 ZIP 안 Code.gs로 전부 교체하고 저장합니다.

3) 함수 선택에서 setupSheet를 고르고 [실행]합니다.
   - '유형별 출처' F열에 '사용됨' 체크박스를 만듭니다.
   - C열 상황명은 수정하지 않습니다.
   - 최초 JSON 백업도 생성합니다.

4) 우측 상단 [배포] → [새 배포] → 유형 [웹 앱]
   - 다음 사용자로 실행: 나
   - 액세스 권한: 웹페이지를 사용할 계정 범위에 맞게 선택

5) 배포 후 나온 /exec 주소를 복사합니다.

6) 홈페이지를 연 뒤 우측 상단 [시트 연동 설정]에 /exec 주소를 입력합니다.
   또는 config.js의 appsScriptUrl에 주소를 직접 입력해도 됩니다.

2. 사용
-------
- 유형을 선택하지 않으면 전체 자료에서 단어를 검색합니다.
- 유형을 선택하면 해당 유형 안에서 검색합니다.
- 사용한 보기에 체크해도 즉시 시트에 쓰지 않습니다.
- [시트와 동기화]를 누르면 변경된 체크만 F열에 반영됩니다.
- 동기화가 성공할 때마다 아래 폴더에 JSON 백업이 생성됩니다.
  https://drive.google.com/drive/folders/1VOO_xq7neegUolm3VZrp42N26iaN_Pi6

3. 파일
-------
- index.html / style.css / app.js / config.js: 홈페이지
- index.json: 시트 연결 전 또는 연결 실패 시 사용하는 예비 데이터
- Code.gs / appsscript.json: Google Apps Script
