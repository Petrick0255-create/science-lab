# 통합 모의고사 문항 검색

물리학, 화학, 생명과학, 지구과학, 통합과학 문항 8,852개를 발문·보기·선지·유형·해설의 키워드로 검색하는 정적 웹앱입니다.

## 실행

브라우저의 보안 정책 때문에 `index.html`을 파일로 직접 열지 말고 웹 서버로 실행해야 합니다.

```bash
python3 -m http.server 8000
```

그다음 `http://localhost:8000`을 엽니다. 일반 정적 호스팅에도 폴더 전체를 그대로 올릴 수 있습니다.

## 검색 데이터 갱신

현재 웹용 스냅샷은 Google Sheets의 `통합 모의고사 문항 DB`를 기준으로 생성되어 있습니다. DB를 갱신한 뒤 같은 스키마의 NDJSON 묶음을 준비하고 아래 명령을 실행합니다.

```bash
node build-index.js /path/to/ndjson-folder
```

입력 파일명은 `chunk_000.ndjson` 형식이어야 합니다. 빌드 스크립트는 검색용 `data/search-index.json`과 문항 상세 데이터 묶음 `data/details/`를 함께 생성합니다.

문항 유형은 `기출분석.xlsx`에서 추출한 `reference/type-map.json`을 문항ID별로 적용하고, 과목별 필터 순서는 `reference/type-catalog.json`을 따릅니다.

## 주요 기능

- 여러 검색어의 AND 검색
- 과목별 유형 필터 및 키워드·유형 조합 검색
- 문항ID 직접 검색 (`3S250301` 등)
- 과목·유형·학년 필터와 관련도·연도·번호 정렬
- Drive 문항 이미지 미리보기 및 원본 열기
- 문제 PDF와 해설 PDF 바로가기
- URL 검색 조건 공유 (`?q=초전도체&subject=통합과학`)
