"use strict";

const DATA_URL = "index.json";
const API_STORAGE_KEY = "jnb-idea-apps-script-url-v1";
const MAX_VISIBLE_SOURCES = 300;
const QUESTION_COUNT = 25;
const MAX_ROUNDS = 10;
const JUNG_COUNT = 13;
const BAEK_COUNT = 12;
const MAX_PATTERN_ITEMS = 7;
const MAX_GENERATION_ATTEMPTS = 500;
const MAX_TYPE_PER_ROUND = 2;
const MAKER_STORAGE_KEY =
  "jnb-lab-maker-history-v1";

/*
 * 통합과학 문항검수 DB의 EVIDENCE에 연결된 교과 개념을 기준으로
 * 다시 정리한 메이킹용 세부 유형입니다. 한 유형당 최대 10개입니다.
 */
const EVIDENCE_DETAIL_TYPES = {
  "과학의 기본량": [
    "기본량과 유도량", "길이", "질량", "시간", "전류",
    "온도", "물질량", "광도", "국제단위계", "자연 세계의 규모",
  ],
  "측정 표준과 정보": [
    "측정 표준", "길이 측정", "시간 측정", "측정과 어림", "센서와 신호",
    "아날로그 신호", "디지털 신호", "신호의 변환", "디지털 정보", "측정 표준의 유용성",
  ],
  "우주의 시작과 원소의 생성": [
    "스펙트럼", "빅뱅 우주론", "우주 초기의 진화", "기본 입자의 생성", "수소·헬륨 원자핵 생성",
    "원자의 생성", "우주 배경 복사", "우주 초기 원소", "우주의 구성 원소", "스펙트럼을 통한 원소 확인",
  ],
  "지구와 생명체를 구성하는 원소의 생성": [
    "별의 진화", "별의 질량과 진화 경로", "별 내부의 핵융합", "별 내부 구조", "무거운 원소의 생성",
    "초신성 폭발", "성운의 형성", "태양계 형성", "지구 형성", "원소의 순환",
  ],
  "원소의 규칙성": [
    "금속과 비금속", "알칼리 금속", "주기율표", "할로젠", "원소의 주기성",
    "원자가 전자", "족에 따른 성질", "원자 구조", "이온 형성", "원소 분류",
  ],
  "화학 결합과 물질의 성질": [
    "공유 결합", "이온 결합", "공유 결합 물질", "이온 결합 물질", "화학 결합의 형성 원리",
    "화학식", "공유 전자쌍", "18족 원소의 안정성", "결합 물질의 전기 전도성", "이온 결합과 공유 결합 비교",
  ],
  "지각과 생명체 구성 물질의 규칙성": [
    "생명체 구성 물질", "단백질", "규산염 광물", "탄소 화합물", "규산염 사면체",
    "단위체", "핵산", "구성 원소 비교", "아미노산", "펩타이드 결합",
  ],
  "물질의 전기적 성질": [
    "도체", "반도체", "자유 전자", "태양 전지", "순수 반도체",
    "부도체", "전기 저항", "트랜지스터", "다이오드", "전류와 전자",
  ],
  "지구 시스템의 구성과 상호 작용": [
    "지구 시스템의 상호 작용", "지구 시스템의 구성", "물의 순환", "탄소 순환", "기권과 수권의 상호 작용",
    "수권의 분포", "지구 내부의 층상 구조", "수권의 층상 구조", "해류", "지구 시스템의 에너지원",
  ],
  "지권의 변화와 영향": [
    "화산 활동", "발산형 경계", "보존형 경계", "수렴형 경계", "화산 분출물",
    "해령", "지각 변동", "판 구조론", "판의 경계", "지진과 화산의 분포",
  ],
  "중력의 작용": [
    "자유 낙하", "수평 방향으로 던진 물체", "자유 낙하와 수평 투사 비교", "중력의 크기", "중력이 작용하는 자연 현상",
    "인공위성", "질량과 무게", "질량과 자유 낙하", "속력-시간 그래프", "낙하 높이와 속력",
  ],
  "운동과 충돌": [
    "평균 힘", "운동량 변화", "운동량과 충격량", "힘-시간 그래프", "충돌 시간과 충격력",
    "자동차 범퍼", "에어백", "충격 흡수 장치", "방향을 고려한 충격량", "충돌 실험 분석",
  ],
  "생명 시스템과 세포": [
    "세포의 구조와 기능", "세포 소기관", "동물 세포와 식물 세포", "세포막의 구조", "인지질 2중층",
    "세포막의 기능", "확산", "삼투", "촉진 확산", "세포막의 선택적 투과성",
  ],
  "생명 시스템에서 일어나는 화학 반응": [
    "물질대사", "동화 작용과 이화 작용", "효소의 작용", "기질 특이성", "효소-기질 복합체",
    "카탈레이스 실험", "효소와 반응 속도", "세포 호흡과 연소", "반응의 에너지 출입", "생활 속 효소 활용",
  ],
  "생명 시스템에서 정보의 흐름": [
    "세포 내 유전 정보의 흐름", "DNA 구조", "핵산의 구조와 기능", "전사", "번역",
    "코돈", "상보적 염기", "단백질 합성", "염기 삽입·결실", "유전자 이상과 형질",
  ],
  "지질 시대의 환경과 생물 변화": [
    "지질 시대와 화석", "지질 시대의 구분", "스트로마톨라이트", "선캄브리아시대의 생물", "고생대의 환경과 생물",
    "중생대의 환경과 생물", "신생대의 환경과 생물", "생물의 육상 진출", "생물의 출현 순서", "대멸종과 생물다양성",
  ],
  "진화와 생물다양성": [
    "유전적 다양성", "생태계 다양성", "자연선택", "종 다양성", "변이와 진화",
    "생존 경쟁", "항생제 내성", "살충제 저항성", "서식지 단편화", "생물다양성 보전",
  ],
  "산화와 환원": [
    "철의 제련", "광합성과 세포 호흡", "금속과 금속 이온의 반응", "산화 구리의 환원", "산화·환원의 정의",
    "금속의 산화", "산소가 없는 산화·환원", "생활 속 산화·환원", "연료 전지", "전자 이동과 산화·환원",
  ],
  "산, 염기와 중화 반응": [
    "최고 온도", "중화열", "전체 이온 수", "혼합 용액의 액성", "수소 이온과 수산화 이온",
    "산과 염기의 공통 성질", "지시약 반응", "생성되는 물의 양", "중화점", "생활 속 중화",
  ],
  "물질 변화에서 에너지의 출입": [
    "발열 반응", "흡열 반응", "화학 반응의 열에너지 출입", "상태 변화의 에너지 출입", "냉찜질 팩",
    "손난로와 발열 도시락", "연소", "중화 반응", "광합성과 세포 호흡", "생활 속 에너지 출입",
  ],
  "생태계 구성과 환경": [
    "생태계의 구성", "소비자", "생산자", "분해자", "비생물 요소",
    "생물 요소", "개체", "개체군", "군집", "환경과 생물의 상호 관계",
  ],
  "생태계 평형": [
    "생태계 평형", "먹이 사슬", "먹이그물", "영양 단계", "개체수 변화",
    "생산자 변화", "1차 소비자 변화", "2차 소비자 변화", "외래 생물 유입", "환경 변화와 생태계",
  ],
  "지구 환경 변화와 인간 생활": [
    "온실 기체", "지구 온난화", "온실 효과", "복사 평형과 지구 열수지", "엘니뇨",
    "기후 변화", "기상이변", "사막화", "기후 변화 대응", "기후 변화 적응",
  ],
  "태양 에너지의 생성과 전환": [
    "수소 핵융합", "질량 결손", "태양 에너지 생성", "지구 시스템의 에너지원", "태양 에너지의 전환",
    "물의 증발과 강수", "대기와 해수의 순환", "광합성", "태양광 발전", "수력·풍력 발전",
  ],
  "전기 에너지의 생산": [
    "유도 전류의 세기", "유도 전류의 방향", "전자기 유도 발생 조건", "발전기의 원리", "발전기의 에너지 전환",
    "발전기 회전 속력", "화력 발전", "핵발전", "수력 발전", "태양광·풍력 발전",
  ],
  "에너지 효율과 신재생 에너지": [
    "에너지 전환", "에너지 보존", "에너지 효율", "버려지는 에너지", "열기관",
    "연료 전지", "태양광 발전", "풍력 발전", "바이오 에너지", "지속가능한 에너지",
  ],
  "과학 기술의 활용": [
    "신소재", "신소재의 활용", "빅데이터", "인공지능", "감염병 진단",
    "유전자 증폭 검사", "진단 키트", "센서", "로봇", "과학기술을 활용한 문제 해결",
  ],
  "과학 기술의 발전과 쟁점": [
    "과학 관련 사회적 쟁점", "자율주행 자동차", "감염병과 빅데이터", "과학 기술의 양면성", "과학 윤리",
    "데이터 편향", "디지털 격차", "인공지능의 한계", "유전자 편집", "동물 실험",
  ],
};
/*
 * 한 배열이 실제 모의고사 한 회차의 1~25번 배치입니다.
 *
 * "13-12": 통과1 13문항, 통과2 12문항
 *           → 25 고3 예시문항 열의 번호별 배치
 *
 * "12-13": 통과1 12문항, 통과2 13문항
 *           → 26 고2 3월 열의 번호별 배치
 */
const ROUND_POSITION_TEMPLATES = {
  "13-12": [
    ["통과2", "환경과 에너지"],       // 1
    ["통과1", "과학의 기초"],         // 2
    ["통과1", "과학의 기초"],         // 3
    ["통과1", "물질과 규칙성"],       // 4
    ["통과2", "환경과 에너지"],       // 5
    ["통과2", "과학과 미래사회"],     // 6
    ["통과2", "변화와 다양성"],       // 7
    ["통과2", "변화와 다양성"],       // 8
    ["통과2", "과학과 미래사회"],     // 9
    ["통과2", "환경과 에너지"],       // 10
    ["통과1", "물질과 규칙성"],       // 11
    ["통과2", "변화와 다양성"],       // 12
    ["통과1", "물질과 규칙성"],       // 13
    ["통과1", "물질과 규칙성"],       // 14
    ["통과1", "시스템과 상호작용"],   // 15
    ["통과2", "환경과 에너지"],       // 16
    ["통과2", "변화와 다양성"],       // 17
    ["통과1", "시스템과 상호작용"],   // 18
    ["통과1", "시스템과 상호작용"],   // 19
    ["통과1", "시스템과 상호작용"],   // 20
    ["통과1", "물질과 규칙성"],       // 21
    ["통과1", "시스템과 상호작용"],   // 22
    ["통과1", "시스템과 상호작용"],   // 23
    ["통과2", "변화와 다양성"],       // 24
    ["통과2", "환경과 에너지"],       // 25
  ],

  "12-13": [
    ["통과2", "환경과 에너지"],       // 1
    ["통과1", "물질과 규칙성"],       // 2
    ["통과1", "과학의 기초"],         // 3
    ["통과2", "변화와 다양성"],       // 4
    ["통과1", "물질과 규칙성"],       // 5
    ["통과1", "시스템과 상호작용"],   // 6
    ["통과2", "변화와 다양성"],       // 7
    ["통과2", "변화와 다양성"],       // 8
    ["통과2", "환경과 에너지"],       // 9
    ["통과2", "환경과 에너지"],       // 10
    ["통과2", "과학과 미래사회"],     // 11
    ["통과1", "물질과 규칙성"],       // 12
    ["통과1", "시스템과 상호작용"],   // 13
    ["통과2", "변화와 다양성"],       // 14
    ["통과2", "환경과 에너지"],       // 15
    ["통과2", "변화와 다양성"],       // 16
    ["통과1", "시스템과 상호작용"],   // 17
    ["통과1", "시스템과 상호작용"],   // 18
    ["통과2", "과학과 미래사회"],     // 19
    ["통과1", "물질과 규칙성"],       // 20
    ["통과1", "물질과 규칙성"],       // 21
    ["통과2", "환경과 에너지"],       // 22
    ["통과1", "시스템과 상호작용"],   // 23
    ["통과1", "시스템과 상호작용"],   // 24
    ["통과2", "변화와 다양성"],       // 25
  ],
};

/*
 * 제공된 모의고사 4회에서
 * 각 소단원이 실제로 출제된 문항 번호입니다.
 *
 * strict: true
 * → 적힌 번호에서만 출제
 *
 * strict가 없을 때
 * → 적힌 번호를 우선하지만 다른 번호도 허용
 */
const UNIT_POSITION_RULES = [
  {
    name: "과학의 기본량",
    positions: [3, 6, 7],
  },
  {
    name: "측정 표준과 정보",
    positions: [2, 3, 4],
  },
  {
    name: "우주의 시작과 원소의 생성",
    positions: [13, 17, 20],
  },
  {
    name: "지구와 생명체를 구성하는 원소의 생성",
    positions: [2, 11, 13],
  },
  {
    name: "원소의 규칙성",
    positions: [8, 12, 14, 19, 21],
  },
  {
    name: "화학 결합과 물질의 성질",
    positions: [6, 20],
  },
  {
    name: "지각과 생명체 구성 물질의 규칙성",
    positions: [1, 4, 5, 7, 12, 20],
  },
  {
    name: "물질의 전기적 성질",
    positions: [21],
  },
  {
    name: "지구 시스템의 구성과 상호 작용",
    positions: [5, 13, 15, 17],
  },
  {
    name: "지권의 변화와 영향",
    positions: [3, 22, 24],
  },
  {
    name: "중력의 작용",
    positions: [11, 13, 14, 20],
  },
  {
    name: "운동과 충돌",
    positions: [18, 22, 23],
  },
  {
    name: "생명 시스템과 세포",
    positions: [6, 15],
  },
  {
    name: "생명 시스템에서 일어나는 화학 반응",
    positions: [10, 18],
  },
  {
    name: "생명 시스템에서 정보의 흐름",
    positions: [18, 19, 23, 24],
  },
  {
    name: "지질 시대의 환경과 생물 변화",
    positions: [8, 14, 17],
  },
  {
    name: "진화와 생물 다양성",
    positions: [2, 8, 15],
  },
  {
    name: "산화와 환원",
    positions: [4, 12, 16],
  },
  {
    name: "산 염기와 중화 반응",
    positions: [7, 9, 23, 24, 25],
  },
  {
    name: "물리 변화에서 에너지의 출입",
    positions: [2, 7, 16],
  },
  {
    name: "생태계 구성과 환경",
    positions: [1, 5, 21],
  },
  {
    name: "생태계 평형",
    positions: [1, 5],
  },
  {
    name: "지구 환경 변화와 인간 생활",
    positions: [19, 21, 22, 25],
  },
  {
    name: "태양에너지의 생성과 전환",
    positions: [10],
  },
  {
    name: "전기 에너지의 생산",
    positions: [9, 16, 18, 24],
  },
  {
    name: "에너지 효율과 신재생 에너지",
    positions: [10, 11, 14, 15],
  },
  {
    name: "과학 기술의 활용",
    positions: [4, 6, 9, 19],
  },
  {
    name: "과학 기술의 발전과 쟁점",
    positions: [11],
  },
];

const BOOK_DRIVE_LINKS = {
  "통과1 오투":
    "https://drive.google.com/file/d/1d818o2nnF8P0tM36hHeJzb99fUQUtAW4/view?usp=drive_link",

  "통과1 완자":
    "https://drive.google.com/file/d/1Jes6H7zoQ31bt_nHJX-b2X1XLKy9_7Eq/view?usp=drive_link",

  "통과1 하이탑 시험대비":
    "https://drive.google.com/file/d/1ktsTD4z69fc6ighY9Aa6I-eqboFYqfCP/view?usp=drive_link",

  "통과1 하이탑 진도":
    "https://drive.google.com/file/d/1-tRoBfMzsKSxMX0yuhySOmtxJi5NnYzo/view?usp=drive_link",

  "통과1 완자 기출pick":
    "https://drive.google.com/file/d/1AJVY9UGEHJzpI-q9CJPhBzVuBi8vZAHq/view?usp=drive_link",

  "통과1 개념완성":
    "https://drive.google.com/file/d/1Cy_0MbJnG6xPy2dltlH6zu8L7Fa-sfa2/view?usp=drive_link",

  "통과2 오투":
    "https://drive.google.com/file/d/1bbyn9SKfVPGuWpG8Fst3hyh5gX1BJBGL/view?usp=drive_link",

  "통과2 완자":
    "https://drive.google.com/file/d/1mX-MJNgxWtIXQSUy7TnCZmG2r5MBqZ2A/view?usp=drive_link",

  "통과2 하이탑 시험대비":
    "https://drive.google.com/file/d/1AsoI7RK82GTh2GOR-xMPH-T9QDZtXhU5/view?usp=drive_link",

  "통과2 하이탑 진도":
    "https://drive.google.com/file/d/1NK5k9a-ng_1qtES6fij8SPGonrMdTiYY/view?usp=drive_link",

  "통과2 완자 기출pick":
    "https://drive.google.com/file/d/1nD_dUYKtnwtgJopt5At2s-wN0B1qUJGh/view?usp=drive_link",

  "통과2 개념완성":
    "https://drive.google.com/file/d/1SmtxJ1NOIM8gTuMehdVUym-Gh8owsBUj/view?usp=drive_link",
};

const elements = {
  dataStatus: document.querySelector("#dataStatus"),
  errorState: document.querySelector("#errorState"),
  apiSettingButton: document.querySelector("#apiSettingButton"),

  makerButton: document.querySelector("#makerButton"),
  nextMakerButton: document.querySelector("#nextMakerButton"),
  resetMakerButton: document.querySelector("#resetMakerButton"),
  makerRound: document.querySelector("#makerRound"),
  makerDashboard: document.querySelector("#makerDashboard"),
  makerEmptyState: document.querySelector("#makerEmptyState"),
  makerHistory: document.querySelector("#makerHistory"),
  makerTableBody: document.querySelector("#makerTableBody"),
  makerRowTemplate: document.querySelector("#makerRowTemplate"),
  tableRoundNumber: document.querySelector("#tableRoundNumber"),
  makerTotalCount: document.querySelector("#makerTotalCount"),
  jungCount: document.querySelector("#jungCount"),
  baekCount: document.querySelector("#baekCount"),
  course1Count: document.querySelector("#course1Count"),
  course2Count: document.querySelector("#course2Count"),
  course1Progress: document.querySelector("#course1Progress"),
  course2Progress: document.querySelector("#course2Progress"),
  majorUnitCount: document.querySelector("#majorUnitCount"),
  middleUnitCount: document.querySelector("#middleUnitCount"),
  unitBalanceProgress: document.querySelector("#unitBalanceProgress"),

  typeSelect: document.querySelector("#typeSelect"),
  bookSelect: document.querySelector("#bookSelect"),
  ideaButton: document.querySelector("#ideaButton"),
  ideaDataStatus: document.querySelector("#ideaDataStatus"),
  ideaResult: document.querySelector("#ideaResult"),
  ideaMessage: document.querySelector("#ideaMessage"),
  ideaSource: document.querySelector("#ideaSource"),
  ideaUsedCheckbox: document.querySelector("#ideaUsedCheckbox"),
  resultClose: document.querySelector("#resultClose"),
  selectedTypeName: document.querySelector("#selectedTypeName"),
  selectedTypeSummary: document.querySelector("#selectedTypeSummary"),
  totalCount: document.querySelector("#totalCount"),
  situationCount: document.querySelector("#situationCount"),
  choiceCount: document.querySelector("#choiceCount"),
  situationTotal: document.querySelector("#situationTotal"),
  choiceTotal: document.querySelector("#choiceTotal"),
  situationList: document.querySelector("#situationList"),
  choiceList: document.querySelector("#choiceList"),
  sourceSearch: document.querySelector("#sourceSearch"),
  sourceTableBody: document.querySelector("#sourceTableBody"),
  showUnusedButton: document.querySelector("#showUnusedButton"),
  syncButton: document.querySelector("#syncButton"),
  syncSummary: document.querySelector("#syncSummary"),
};

const state = {
  typeSources: [],
  mockSources: [],
  units: [],
  sourcesByType: new Map(),

  rounds: [],
  currentRoundIndex: -1,

  selectedType: "",
  selectedBook: "",
  selectedTypeRows: [],
  lastIdeaIndex: -1,
  pendingUsed: new Map(),
  showUnusedOnly: false,
  apiUrl: "",
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  setGlobalStatus("loading", "데이터 확인 중");

  try {
    state.apiUrl = getConfiguredApiUrl();
    const json = await fetchArchiveData();

    loadData(json);
    initializeFeatures();
    restoreMakerState();
  } catch (error) {
    console.error(error);

    setGlobalStatus(
      "error",
      "데이터 연결 실패",
    );

    showSystemError(
      error.message ||
        "index.json을 불러오지 못했습니다.",
    );
  }
}

function getConfiguredApiUrl() {
  return cleanText(
    localStorage.getItem(API_STORAGE_KEY) ||
    window.JNB_CONFIG?.appsScriptUrl ||
    "",
  ).replace(/\/+$/, "");
}

async function fetchArchiveData() {
  if (state.apiUrl) {
    try {
      const response = await fetch(
        `${state.apiUrl}?action=data&t=${Date.now()}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(`시트 요청 실패: ${response.status}`);
      }

      const result = await response.json();

      if (result.ok === false) {
        throw new Error(result.message || "시트 데이터를 불러오지 못했습니다.");
      }

      return result.data || result;
    } catch (error) {
      console.warn("시트 연결 실패, index.json으로 대체합니다.", error);
    }
  }

  const response = await fetch(DATA_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`index.json 요청 실패: ${response.status}`);
  }

  return response.json();
}

function configureApiUrl() {
  const next = window.prompt(
    "Apps Script 웹 앱의 /exec 주소를 입력해 주세요.\n비워 두면 index.json을 사용합니다.",
    state.apiUrl,
  );

  if (next === null) {
    return;
  }

  const normalized = cleanText(next).replace(/\/+$/, "");

  if (normalized && !/^https:\/\/script\.google\.com\/macros\/s\//.test(normalized)) {
    window.alert("Apps Script 배포 후 받은 /exec 주소를 입력해 주세요.");
    return;
  }

  if (normalized) {
    localStorage.setItem(API_STORAGE_KEY, normalized);
  } else {
    localStorage.removeItem(API_STORAGE_KEY);
  }

  window.location.reload();
}

function bindEvents() {
  elements.makerButton.addEventListener(
    "click",
    makeFirstRound,
  );

  elements.nextMakerButton.addEventListener(
    "click",
    makeNextRound,
  );

  elements.resetMakerButton.addEventListener(
    "click",
    resetMaker,
  );

  elements.makerHistory.addEventListener(
    "click",
    handleHistoryClick,
  );

  elements.makerTableBody.addEventListener(
    "change",
    (event) => {
      handleMakerTableChange(event);
      saveMakerState();
    },
  );

  elements.typeSelect.addEventListener(
    "change",
    handleTypeChange,
  );

  elements.bookSelect.addEventListener(
    "change",
    handleBookChange,
  );

  elements.ideaButton.addEventListener(
    "click",
    showRandomIdea,
  );

  elements.resultClose.addEventListener(
    "click",
    hideIdeaResult,
  );

  elements.ideaUsedCheckbox.addEventListener(
    "change",
    handleUsedChange,
  );

  elements.sourceSearch.addEventListener(
    "input",
    handleSourceSearch,
  );

  elements.sourceTableBody.addEventListener(
    "change",
    handleUsedChange,
  );

  elements.showUnusedButton.addEventListener(
    "click",
    toggleUnusedOnly,
  );

  elements.syncButton.addEventListener(
    "click",
    syncUsedIdeas,
  );

  elements.apiSettingButton.addEventListener(
    "click",
    configureApiUrl,
  );

  document
    .querySelectorAll(".nav-link")
    .forEach((link) => {
      link.addEventListener("click", () => {
        document
          .querySelectorAll(".nav-link")
          .forEach((item) => {
            item.classList.toggle(
              "is-active",
              item === link,
            );
          });
      });
    });
}

function loadData(json) {
  const typeSourceRows = getArray(json, [
    "typeSources",
    "type_sources",
    "유형별 출처",
    "유형별출처",
    "sources",
  ]);

  const mockSourceRows = getArray(json, [
    "mockSources",
    "mock_sources",
    "모의고사 소스",
    "모의고사소스",
    "mockData",
  ]);

  const unitRows = getArray(json, [
    "unitClassifications",
    "unit_classifications",
    "단원 분류",
    "단원분류",
    "units",
  ]);

  state.typeSources = typeSourceRows
    .map((row, index) =>
      normalizeTypeSource(row, index),
    )
    .filter(
      (row) =>
        row.type &&
        row.type !== "유형" &&
        !(
          row.book === "교재" &&
          row.situation === "상황"
        ) &&
        (row.situation || row.choice),
    );

  const normalizedMockSources =
    mockSourceRows
      .map(normalizeMockSource)
      .filter(
        (row) =>
          row.type &&
          row.subtype,
      );

  state.mockSources =
    prepareMockSources(
      buildEvidenceMockSources(
        normalizedMockSources,
      ),
    );

  const makerTypes = [
    ...new Set(
      state.mockSources.map(
        (row) => row.type,
      ),
    ),
  ];

  state.units = unitRows
    .map((row, index) =>
      normalizeUnit(
        row,
        index,
        makerTypes,
      ),
    )
    .filter(
      (row) =>
        row.teacher &&
        row.course &&
        row.majorUnit &&
        row.middleUnit &&
        row.type,
    );

  state.sourcesByType = groupBy(
    state.mockSources,
    "type",
  );
}

function getArray(json, keys) {
  if (Array.isArray(json)) {
    const typeSourceKeys = [
      "typeSources",
      "type_sources",
      "유형별 출처",
      "유형별출처",
      "sources",
    ];

    return keys.some((key) =>
      typeSourceKeys.includes(key),
    )
      ? json
      : [];
  }

  for (const key of keys) {
    if (Array.isArray(json?.[key])) {
      return json[key];
    }
  }

  return [];
}

function normalizeTypeSource(row, index = 0) {
  return {
    rowNumber: Number(
      pickValue(row, [
        "rowNumber",
        "row",
        "행",
      ]),
    ) || index + 1,

    type: cleanText(
      pickValue(row, [
        "type",
        "유형",
        "category",
      ]),
    ),

    book: cleanText(
      pickValue(row, [
        "book",
        "교재",
        "textbook",
        "교재명",
      ]),
    ),

    situation: cleanText(
      pickValue(row, [
        "situation",
        "상황",
        "context",
        "제시상황",
      ]),
    ),

    choice: cleanText(
      pickValue(row, [
        "choice",
        "보기",
        "option",
        "대표보기",
      ]),
    ),

    source: cleanText(
      pickValue(row, [
        "source",
        "출처",
        "page",
        "페이지",
      ]),
    ),

    used: normalizeBoolean(
      pickValue(row, [
        "used",
        "사용됨",
        "checked",
      ]),
    ),
  };
}

function normalizeMockSource(row, index) {
  return {
    id: `mock-${index}`,

    type: cleanText(
      pickValue(row, [
        "type",
        "유형",
        "category",
      ]),
    ),

    subtype: cleanText(
      pickValue(row, [
        "subtype",
        "subType",
        "세부 유형",
        "세부유형",
        "detailType",
      ]),
    ),

    situation: cleanText(
      pickValue(row, [
        "situation",
        "상황",
        "context",
      ]),
    ),

    representativeChoice: cleanText(
      pickValue(row, [
        "representativeChoice",
        "대표 보기",
        "대표보기",
        "choice",
        "보기",
      ]),
    ),

    frequency: parseFrequency(
      pickValue(row, [
        "frequency",
        "빈도",
        "count",
        "횟수",
      ]),
    ),
  };
}

function prepareMockSources(rows) {
  const merged = new Map();

  rows.forEach((row) => {
    const key = makeSourceKey(
      row.type,
      row.subtype,
    );

    const existing =
      merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...row,
        key,
      });

      return;
    }

    existing.frequency +=
      row.frequency;

    if (
      !existing.situation &&
      row.situation
    ) {
      existing.situation =
        row.situation;
    }

    if (
      !existing.representativeChoice &&
      row.representativeChoice
    ) {
      existing.representativeChoice =
        row.representativeChoice;
    }
  });

  return [...merged.values()];
}

function buildEvidenceMockSources(
  originalRows,
) {
  const originalByType =
    groupBy(originalRows, "type");

  return Object.entries(
    EVIDENCE_DETAIL_TYPES,
  ).flatMap(([type, subtypes]) => {
    const candidates =
      originalByType.get(type) || [];

    return subtypes
      .slice(0, 10)
      .map((subtype, index) => {
        const normalizedSubtype =
          normalizeForMatch(subtype);

        const matches =
          candidates.filter((row) =>
            normalizeForMatch(
              [
                row.subtype,
                row.situation,
                row.representativeChoice,
              ].join(" "),
            ).includes(
              normalizedSubtype,
            ),
          );

        const reference =
          matches[0] || null;

        return {
          id: `evidence-${type}-${index}`,
          type,
          subtype,
          situation:
            reference?.situation || "",
          representativeChoice:
            reference?.representativeChoice || "",
          /* 배열 앞쪽일수록 기출 우선순위가 높습니다. */
          frequency:
            Math.max(
              10 - index,
              matches.length,
            ),
        };
      });
  });
}

function normalizeUnit(
  row,
  index,
  makerTypes,
) {
  const smallUnit = cleanText(
    pickValue(row, [
      "smallUnit",
      "소단원",
      "small",
      "세부단원",
    ]),
  );

  const explicitType = cleanText(
    pickValue(row, [
      "type",
      "유형",
    ]),
  );

  /*
   * 모의고사 소스의 유형명과
   * 소단원 문자열을 비교합니다.
   */
  const matchedType =
    resolveContainedType(
      smallUnit,
      makerTypes,
    );

  /*
   * 모의고사 소스에서 일치하는 유형을
   * 찾지 못해도 소단원 이름 자체를
   * 유형으로 사용할 수 있게 합니다.
   *
   * 예:
   * "★ 01 과학의 기본량"
   * → "과학의 기본량"
   */
  const fallbackType =
    smallUnit
      .replace(
        /^[\s★☆◆◇■□●○◎※✓✔·•*]+/g,
        "",
      )
      .replace(
        /^\s*\d+\s*[.)\-_:]?\s*/,
        "",
      )
      .trim();

  return {
    id: `unit-${index}`,

    teacher: normalizeTeacher(
      pickValue(row, [
        "teacher",
        "출제자",
        "담당",
        "강사",
      ]),
    ),

    majorUnit: cleanText(
      pickValue(row, [
        "majorUnit",
        "대단원",
        "major",
      ]),
    ),

    middleUnit: cleanText(
      pickValue(row, [
        "middleUnit",
        "중단원",
        "middle",
      ]),
    ),

    smallUnit,

    course: normalizeCourse(
      pickValue(row, [
        "course",
        "과목",
        "통과",
        "구분",
      ]),
    ),

    /*
     * 우선순위:
     * 1. JSON에 명시된 유형
     * 2. 모의고사 소스와 연결된 유형
     * 3. 숫자·특수기호를 제거한 소단원명
     */
    type:
      explicitType ||
      matchedType ||
      fallbackType,
  };
}

function initializeFeatures() {
  const makerReady =
    state.mockSources.length > 0 &&
    state.units.length > 0;

  const ideaReady =
    state.typeSources.length > 0;

  if (makerReady) {
    elements.makerButton.disabled =
      false;
  }

  if (ideaReady) {
    populateTypeSelect();

    elements.typeSelect.disabled =
      false;

    elements.bookSelect.disabled =
      false;

    state.selectedTypeRows = [
      ...state.typeSources,
    ];

    populateBookSelect(
      state.selectedTypeRows,
    );

    elements.sourceSearch.disabled =
      false;

    elements.showUnusedButton.disabled =
      false;

    renderAllIdeas();

    setIdeaStatus(
      "ready",
      `${formatNumber(
        state.typeSources.length,
      )}개 자료 연결됨`,
    );
  } else {
    setIdeaStatus(
      "error",
      "유형별 출처 없음",
    );
  }

  if (!makerReady && !ideaReady) {
    throw new Error(
      "사용 가능한 시트 데이터가 없습니다.",
    );
  }

  const messages = [];

  if (makerReady) {
    messages.push(
      `메이킹 ${formatNumber(
        state.units.length,
      )}개 유형`,
    );
  }

  if (ideaReady) {
    messages.push(
      `아이디어 ${formatNumber(
        state.typeSources.length,
      )}개 자료`,
    );
  }

  setGlobalStatus(
    "ready",
    messages.join(" · "),
  );

  if (!makerReady) {
    showSystemError(
      "모의고사 소스 또는 단원 분류 데이터가 부족해 메이킹 기능은 비활성화되었습니다.",
    );
  }
}

function makeFirstRound() {
  if (state.rounds.length > 0) {
    return;
  }

  createAndStoreRound();
}

function makeNextRound() {
  if (
    state.rounds.length >=
    MAX_ROUNDS
  ) {
    return;
  }

  createAndStoreRound();
}

function createAndStoreRound() {
  try {
    const round = generateRound(
      state.rounds.length + 1,
    );

    state.rounds.push(round);

    state.currentRoundIndex =
      state.rounds.length - 1;

    saveMakerState();
    renderCurrentRound();
    renderCurrentRound();
  } catch (error) {
    console.error(error);
    window.alert(error.message);
  }
}

function generateRound(roundNumber) {
  const {
    course1,
    course2,
  } = getSelectedCourseRatio();

  let lastError = null;

  /*
   * 정T·백T 비율까지 정확히 맞는 결과가 나올 때까지
   * 최대 500번 새로 구성합니다.
   */
  for (
    let attempt = 0;
    attempt < MAX_GENERATION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return generateRoundAttempt(
        roundNumber,
        course1,
        course2,
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    "기존 모의고사와 유사한 대단원 분포로 25문항을 구성하지 못했습니다. " +
      "단원 분류의 대단원명과 정T·백T 배치를 확인해 주세요. " +
      `${lastError?.message || ""}`,
  );
}

function generateRoundAttempt(
  roundNumber,
  course1,
  course2,
) {
  const usedKeys =
    getUsedSourceKeys();

  /*
   * 선택한 통과1·통과2 비율에 맞는
   * 실제 기출 번호별 대단원 배치를 가져옵니다.
   */
  const slots =
    createHistoricalMajorSlots(
      course1,
      course2,
    );

  const selectedUnits =
    selectUnitsForSlots(
      slots,
      usedKeys,
    );

  if (
    selectedUnits.length !==
    QUESTION_COUNT
  ) {
    throw new Error(
      `25문항을 구성하지 못했습니다. 현재 구성: ${selectedUnits.length}문항`,
    );
  }

  /*
   * 후보를 뽑을 때 순서가 섞였으므로
   * 원래 1~25번 순서로 되돌립니다.
   */
  const arrangedUnits = [
    ...selectedUnits,
  ].sort(
    (a, b) =>
      a.assignedNumber -
      b.assignedNumber,
  );

  const newRoundKeys =
    new Set();

  const questions =
    arrangedUnits.map(
      (unit, index) => {
        const source =
          chooseDetailSource(
            unit.type,
            usedKeys,
            newRoundKeys,
          );

        if (source) {
          newRoundKeys.add(
            source.key,
          );
        }

        return {
          number:
            unit.assignedNumber ||
            index + 1,
          teacher: unit.teacher,
          course: unit.course,
          majorUnit:
            unit.majorUnit,
          middleUnit:
            unit.middleUnit,
          smallUnit:
            unit.smallUnit,
          type: unit.type,
          source,
        };
      },
    );

  return {
    number: roundNumber,
    course1Target: course1,
    course2Target: course2,
    questions,
  };
}

/*
 * 선택한 통과1·통과2 비율에 맞는
 * 번호별 대단원 배치를 반환합니다.
 */
function createHistoricalMajorSlots(
  course1Count,
  course2Count,
) {
  const key =
    `${course1Count}-${course2Count}`;

  const template =
    ROUND_POSITION_TEMPLATES[key];

  if (
    !template ||
    template.length !==
      QUESTION_COUNT
  ) {
    throw new Error(
      `통과1·2 ${key} 비율의 25문항 배치 템플릿이 없습니다.`,
    );
  }

  return template.map(
    (
      [
        course,
        majorUnit,
      ],
      index,
    ) => ({
      number: index + 1,
      course,
      majorUnit,
    }),
  );
}

/*
 * 각 번호에 정해진 통과·대단원 조건에 맞는
 * 실제 단원 분류 행을 하나씩 선택합니다.
 */

function selectUnitsForSlots(
  slots,
  usedSourceKeys,
) {
  const selected = [];

  /*
   * 같은 유형이 몇 번 선택됐는지 저장합니다.
   */
  const unitSelectionCounts =
    new Map();

  const teacherCounts = {
    정T: 0,
    백T: 0,
  };

  /*
   * 후보가 적은 대단원부터 먼저 처리합니다.
   */
  const orderedSlots = [
    ...slots,
  ].sort(
    (a, b) =>
      countSlotCandidates(a) -
      countSlotCandidates(b),
  );

  orderedSlots.forEach(
    (slot) => {
      const candidates =
        state.units.filter(
          (unit) => {
            /*
             * 단원 행 id가 아니라
             * 실제 유형 문자열을 기준으로 셉니다.
             */
            const unitKey =
              normalizeForMatch(
                unit.type ||
                unit.smallUnit ||
                unit.id,
              );

            const selectedCount =
              unitSelectionCounts.get(
                unitKey,
              ) || 0;

            /*
             * 같은 유형은 한 회차에
             * 최대 2문항까지만 선택합니다.
             */
            if (
              selectedCount >=
              MAX_TYPE_PER_ROUND
            ) {
              return false;
            }

            /*
             * 같은 유형을 두 번 사용할 때는
             * 서로 다른 세부 유형이 있어야 합니다.
             */
            if (
              selectedCount > 0
            ) {
              const sourceCount =
                getSourcesForType(
                  unit.type,
                ).length;

              if (
                sourceCount <=
                selectedCount
              ) {
                return false;
              }
            }

            /*
             * 해당 번호에 지정된
             * 통과1·통과2가 일치해야 합니다.
             */
            if (
              unit.course !==
              slot.course
            ) {
              return false;
            }

            /*
             * 해당 번호에 지정된
             * 대단원이 일치해야 합니다.
             */
            if (
              !majorUnitMatches(
                unit.majorUnit,
                slot.majorUnit,
              )
            ) {
              return false;
            }

            /*
             * 산·염기와 중화 반응처럼
             * 번호가 제한된 유형인지 확인합니다.
             */
            if (
              !isUnitPositionAllowed(
                unit,
                slot.number,
              )
            ) {
              return false;
            }

            /*
             * 정T는 최대 13문항입니다.
             */
            if (
              unit.teacher ===
                "정T" &&
              teacherCounts.정T >=
                JUNG_COUNT
            ) {
              return false;
            }

            /*
             * 백T는 최대 12문항입니다.
             */
            if (
              unit.teacher ===
                "백T" &&
              teacherCounts.백T >=
                BAEK_COUNT
            ) {
              return false;
            }

            return true;
          },
        );

      if (
        candidates.length === 0
      ) {
        throw new Error(
          `${slot.number}번에 배치할 ${slot.course}·${slot.majorUnit} 유형이 부족합니다.`,
        );
      }

      /*
       * 단원 중복, 번호 적합도,
       * 정T·백T 비율을 함께 계산합니다.
       */
      const scored =
        candidates.map(
          (unit) => ({
            unit,

            score:
              scoreUnitCandidate(
                unit,
                selected,
                usedSourceKeys,
              ) +
              scoreUnitPosition(
                unit,
                slot.number,
              ) +
              scorePreviousRoundPosition(
                unit,
                slot.number,
              ) +
              scoreTeacherBalance(
                unit.teacher,
                teacherCounts,
                selected.length + 1,
              ),
          }),
        );

      scored.sort(
        (a, b) =>
          a.score - b.score,
      );

      const bestScore =
        scored[0].score;

      /*
       * 점수가 비슷한 후보 중에서
       * 무작위로 하나를 선택합니다.
       */
      const nearBest =
        scored.filter(
          (item) =>
            item.score <=
            bestScore + 2.5,
        );

      const chosen =
        randomItem(
          nearBest,
        ).unit;

      selected.push({
        ...chosen,
        assignedNumber:
          slot.number,
      });

      /*
       * 선택된 유형의 사용 횟수를 올립니다.
       */
      const chosenKey =
        normalizeForMatch(
          chosen.type ||
            chosen.smallUnit ||
            chosen.id,
        );

      unitSelectionCounts.set(
        chosenKey,
        (unitSelectionCounts.get(
          chosenKey,
        ) || 0) + 1,
      );

      teacherCounts[
        chosen.teacher
      ] += 1;
    },
  );

  /*
   * 최종적으로 정T 13문항,
   * 백T 12문항인지 검사합니다.
   */
  if (
    teacherCounts.정T !==
      JUNG_COUNT ||
    teacherCounts.백T !==
      BAEK_COUNT
  ) {
    throw new Error(
      `출제자 비율이 정T ${teacherCounts.정T}문항·백T ${teacherCounts.백T}문항으로 선택되었습니다.`,
    );
  }

  return selected;
}

function countSlotCandidates(
  slot,
) {
  return state.units
    .filter((unit) => {
      return (
        unit.course ===
          slot.course &&
        majorUnitMatches(
          unit.majorUnit,
          slot.majorUnit,
        )
      );
    })
    .reduce(
      (
        capacity,
        unit,
      ) => {
        const sourceCount =
          Math.max(
            1,
            getSourcesForType(
              unit.type,
            ).length,
          );

        return (
          capacity +
          Math.min(
            MAX_TYPE_PER_ROUND,
            sourceCount,
          )
        );
      },
      0,
    );
}

/*
 * 특수기호와 숫자 차이를 제거하고
 * 대단원 문자열을 비교합니다.
 */
function majorUnitMatches(
  actualMajorUnit,
  targetMajorUnit,
) {
  const actual =
    normalizeForMatch(
      actualMajorUnit,
    );

  const target =
    normalizeForMatch(
      targetMajorUnit,
    );

  return (
    actual.includes(target) ||
    target.includes(actual)
  );
}

/*
 * 25문항 전체에서 정T 13, 백T 12가
 * 자연스럽게 배치되도록 점수를 부여합니다.
 */

/*
 * 유형 또는 소단원 문자열에 맞는
 * 번호 규칙을 찾습니다.
 */
function getUnitPositionRule(
  unit,
) {
  const target =
    normalizeForMatch(
      `${unit.type} ${unit.smallUnit}`,
    );

  return UNIT_POSITION_RULES.find(
    (rule) => {
      const name =
        normalizeForMatch(
          rule.name,
        );

      return (
        name &&
        (
          target.includes(name) ||
          name.includes(target)
        )
      );
    },
  );
}

/*
 * strict 유형은 지정된 번호에서만
 * 선택할 수 있습니다.
 */
function isUnitPositionAllowed(
  unit,
  questionNumber,
) {
  const rule =
    getUnitPositionRule(unit);

  if (!rule?.strict) {
    return true;
  }

  return rule.positions.includes(
    questionNumber,
  );
}

function scorePreviousRoundPosition(
  unit,
  questionNumber,
) {
  const unitType =
    normalizeForMatch(
      unit.type ||
      unit.smallUnit,
    );

  let penalty = 0;

  state.rounds.forEach(
    (round, roundIndex) => {
      const previousQuestion =
        round.questions.find(
          (question) =>
            Number(
              question.number,
            ) ===
            Number(
              questionNumber,
            ),
        );

      if (!previousQuestion) {
        return;
      }

      const previousType =
        normalizeForMatch(
          previousQuestion.type ||
          previousQuestion.smallUnit,
        );

      if (
        unitType !== previousType
      ) {
        return;
      }

      /*
       * 바로 이전 회차와 같은 번호·같은 유형이면
       * 가장 큰 감점을 줍니다.
       */
      const isLatestRound =
        roundIndex ===
        state.rounds.length - 1;

      penalty +=
        isLatestRound
          ? 120
          : 45;
    },
  );

  return penalty;
}

/*
 * 실제 출제 번호에 가까울수록
 * 낮은 점수를 주어 우선 선택합니다.
 */
function scoreUnitPosition(
  unit,
  questionNumber,
) {
  const rule =
    getUnitPositionRule(unit);

  if (
    !rule ||
    rule.positions.length === 0
  ) {
    return 0;
  }

  const distance =
    Math.min(
      ...rule.positions.map(
        (position) =>
          Math.abs(
            position -
            questionNumber,
          ),
      ),
    );

  /*
   * 기존 출제 번호와 정확히 같으면
   * 강하게 우선합니다.
   */
  if (distance === 0) {
    return -18;
  }

  if (distance === 1) {
    return -7;
  }

  if (distance === 2) {
    return 3;
  }

  return 12 + distance * 5;
}


function scoreTeacherBalance(
  teacher,
  teacherCounts,
  selectedCountAfterPick,
) {
  const target =
    teacher === "정T"
      ? JUNG_COUNT
      : BAEK_COUNT;

  const expected =
    (selectedCountAfterPick *
      target) /
    QUESTION_COUNT;

  const nextCount =
    teacherCounts[teacher] +
    1;

  return (
    Math.max(
      0,
      nextCount - expected,
    ) * 7
  );
}

function getSelectedCourseRatio() {
  const checked =
    document.querySelector(
      'input[name="courseRatio"]:checked',
    );

  const [
    course1,
    course2,
  ] = (
    checked?.value || "12-13"
  )
    .split("-")
    .map(Number);

  return {
    course1,
    course2,
  };
}

function scoreUnitCandidate(
  unit,
  selected,
  usedSourceKeys,
) {
  const majorCount =
    selected.filter(
      (item) =>
        item.majorUnit ===
        unit.majorUnit,
    ).length;

  const middleCount =
    selected.filter(
      (item) =>
        item.middleUnit ===
        unit.middleUnit,
    ).length;

  const typeCount =
    selected.filter(
      (item) =>
        item.type ===
        unit.type,
    ).length;

  const sources =
    getSourcesForType(
      unit.type,
    );

  const unusedSourceCount =
    sources.filter(
      (source) =>
        !usedSourceKeys.has(
          source.key,
        ),
    ).length;

  let score =
    majorCount * 9 +
    middleCount * 17 +
    typeCount * 24;

  if (
    unusedSourceCount === 0
  ) {
    score += 32;
  }

  score -=
    Math.min(
      unusedSourceCount,
      6,
    ) * 1.4;

  score += Math.random() * 2;

  return score;
}

function arrangeQuestions(units) {
  const remaining =
    shuffle([...units]);

  const arranged = [];

  while (
    remaining.length > 0
  ) {
    const previous =
      arranged[
        arranged.length - 1
      ];

    const previousTwo =
      arranged[
        arranged.length - 2
      ];

    const scored =
      remaining.map((unit) => {
        let score =
          Math.random() * 3;

        if (previous) {
          if (
            unit.majorUnit ===
            previous.majorUnit
          ) {
            score += 18;
          }

          if (
            unit.middleUnit ===
            previous.middleUnit
          ) {
            score += 30;
          }

          if (
            unit.teacher ===
            previous.teacher
          ) {
            score += 5;
          }

          if (
            unit.course ===
            previous.course
          ) {
            score += 3;
          }
        }

        if (
          previousTwo &&
          previous &&
          unit.teacher ===
            previous.teacher &&
          unit.teacher ===
            previousTwo.teacher
        ) {
          score += 14;
        }

        return {
          unit,
          score,
        };
      });

    scored.sort(
      (a, b) =>
        a.score - b.score,
    );

    const selected =
      scored[0].unit;

    arranged.push(selected);

    remaining.splice(
      remaining.findIndex(
        (unit) =>
          unit.id ===
          selected.id,
      ),
      1,
    );
  }

  return arranged;
}

function chooseDetailSource(
  type,
  usedKeys,
  newRoundKeys,
) {
  const sources =
    getSourcesForType(type);

  if (sources.length === 0) {
    return null;
  }

  const unused =
    sources.filter(
      (source) =>
        !usedKeys.has(
          source.key,
        ) &&
        !newRoundKeys.has(
          source.key,
        ),
    );

  if (unused.length > 0) {
    return weightedRandom(
      unused,
    );
  }

  const notInCurrentRound =
    sources.filter(
      (source) =>
        !newRoundKeys.has(
          source.key,
        ),
    );

  if (
    notInCurrentRound.length >
    0
  ) {
    const usage =
      getSourceUsageCounts();

    const minimum = Math.min(
      ...notInCurrentRound.map(
        (source) =>
          usage.get(
            source.key,
          ) || 0,
      ),
    );

    return weightedRandom(
      notInCurrentRound.filter(
        (source) =>
          (usage.get(
            source.key,
          ) || 0) ===
          minimum,
      ),
    );
  }

  return weightedRandom(
    sources,
  );
}

function getSourcesForType(type) {
  if (
    state.sourcesByType.has(type)
  ) {
    return state.sourcesByType.get(
      type,
    );
  }

  const normalized =
    normalizeForMatch(type);

  for (
    const [
      sourceType,
      sources,
    ] of state.sourcesByType
  ) {
    const sourceNormalized =
      normalizeForMatch(
        sourceType,
      );

    if (
      normalized.includes(
        sourceNormalized,
      ) ||
      sourceNormalized.includes(
        normalized,
      )
    ) {
      return sources;
    }
  }

  return [];
}

function getUsedSourceKeys(
  excludedRoundIndex = -1,
  excludedQuestionIndex = -1,
) {
  const used = new Set();

  state.rounds.forEach(
    (round, roundIndex) => {
      round.questions.forEach(
        (
          question,
          questionIndex,
        ) => {
          if (
            roundIndex ===
              excludedRoundIndex &&
            questionIndex ===
              excludedQuestionIndex
          ) {
            return;
          }

          if (
            question.source?.key
          ) {
            used.add(
              question.source.key,
            );
          }
        },
      );
    },
  );

  return used;
}

function getSourceUsageCounts() {
  const counts = new Map();

  state.rounds.forEach(
    (round) => {
      round.questions.forEach(
        (question) => {
          if (
            !question.source
              ?.key
          ) {
            return;
          }

          counts.set(
            question.source.key,
            (counts.get(
              question.source.key,
            ) || 0) + 1,
          );
        },
      );
    },
  );

  return counts;
}

function renderCurrentRound() {
  const round =
    state.rounds[
      state.currentRoundIndex
    ];

  if (!round) {
    return;
  }

  elements.makerDashboard.hidden =
    false;

  elements.makerEmptyState.hidden =
    true;

  elements.makerRound.textContent =
    round.number;

  elements.tableRoundNumber.textContent =
    round.number;

  elements.makerButton.disabled =
    true;

  elements.nextMakerButton.disabled =
    state.rounds.length >=
    MAX_ROUNDS;

  elements.resetMakerButton.disabled =
    false;

  renderMakerSummary(round);
  renderMakerHistory();
  renderMakerTable(round);
}

function renderMakerSummary(round) {
  const questions =
    round.questions;

  const jung =
    questions.filter(
      (item) =>
        item.teacher === "정T",
    ).length;

  const baek =
    questions.filter(
      (item) =>
        item.teacher === "백T",
    ).length;

  const course1 =
    questions.filter(
      (item) =>
        item.course === "통과1",
    ).length;

  const course2 =
    questions.filter(
      (item) =>
        item.course === "통과2",
    ).length;

  const majorCount =
    new Set(
      questions.map(
        (item) =>
          item.majorUnit,
      ),
    ).size;

  const middleCount =
    new Set(
      questions.map(
        (item) =>
          item.middleUnit,
      ),
    ).size;

  elements.makerTotalCount.textContent =
    questions.length;

  elements.jungCount.textContent =
    jung;

  elements.baekCount.textContent =
    baek;

  elements.course1Count.textContent =
    course1;

  elements.course2Count.textContent =
    course2;

  elements.course1Progress.style.width =
    `${(course1 / QUESTION_COUNT) * 100}%`;

  elements.course2Progress.style.width =
    `${(course2 / QUESTION_COUNT) * 100}%`;

  elements.majorUnitCount.textContent =
    majorCount;

  elements.middleUnitCount.textContent =
    middleCount;

  elements.unitBalanceProgress.style.width =
    `${Math.min(
      100,
      middleCount * 8,
    )}%`;
}

function renderMakerHistory() {
  elements.makerHistory.replaceChildren();

  state.rounds.forEach(
    (round, index) => {
      const button =
        document.createElement(
          "button",
        );

      button.type = "button";

      button.className =
        `history-chip${
          index ===
          state.currentRoundIndex
            ? " is-active"
            : ""
        }`;

      button.dataset.roundIndex =
        index;

      button.textContent =
        `${round.number}회`;

      button.setAttribute(
        "role",
        "listitem",
      );

      elements.makerHistory.append(
        button,
      );
    },
  );
}

function renderMakerTable(
  round,
) {
  elements.makerTableBody
    .replaceChildren();

  const fragment =
    document.createDocumentFragment();

  round.questions.forEach(
    (
      question,
      questionIndex,
    ) => {
      const row =
        elements.makerRowTemplate
          .content
          .firstElementChild
          .cloneNode(true);

      row.dataset.questionIndex =
        questionIndex;

      row.querySelector(
        ".question-number",
      ).textContent =
        question.number;

      const teacherBadge =
        row.querySelector(
          ".teacher-badge",
        );

      teacherBadge.textContent =
        question.teacher;

      teacherBadge.classList.add(
        question.teacher === "정T"
          ? "is-jung"
          : "is-baek",
      );

      const courseBadge =
        row.querySelector(
          ".course-badge",
        );

      courseBadge.textContent =
        question.course;

      courseBadge.classList.add(
        question.course === "통과1"
          ? "is-course1"
          : "is-course2",
      );

      row.querySelector(
        ".major-unit",
      ).textContent =
        question.majorUnit;

      row.querySelector(
        ".middle-unit",
      ).textContent =
        question.middleUnit;

      /*
       * 유형 선택 상자
       */
      const typeSelect =
        row.querySelector(
          ".question-type-select",
        );

      typeSelect.dataset
        .questionIndex =
        questionIndex;

      renderTypeOptions(
        typeSelect,
        question,
        questionIndex,
        round,
      );

      /*
       * 세부 유형 선택 상자
       */
      const detailSelect =
        row.querySelector(
          ".detail-type-select",
        );

      detailSelect.dataset
        .questionIndex =
        questionIndex;

      renderDetailOptions(
        detailSelect,
        question,
        questionIndex,
      );

      fragment.append(row);
    },
  );

  elements.makerTableBody.append(
    fragment,
  );
}

/*
 * 현재 문항에서 선택할 수 있는
 * 유형 목록을 만듭니다.
 */
function renderTypeOptions(
  select,
  question,
  questionIndex,
  round,
) {
  const recommendedTeacher =
    question.recommendedTeacher ||
    question.teacher;

  const recommendedCourse =
    question.recommendedCourse ||
    question.course;

  const recommendedMajorUnit =
    question.recommendedMajorUnit ||
    question.majorUnit;

  /*
   * 모든 단원 데이터를 가져옵니다.
   * 번호 제한은 선택한 뒤
   * handleQuestionTypeChange에서 검사합니다.
   */
  const allUnits = [
    ...state.units,
  ];

  /*
   * 같은 유형·출제자·통과·대단원이
   * 중복된 경우 한 번만 표시합니다.
   */
  const uniqueUnits = [];
  const unitKeys = new Set();

  allUnits.forEach((unit) => {
    const typeName =
      unit.type ||
      unit.smallUnit;

    const key = [
      typeName,
      unit.teacher,
      unit.course,
      unit.majorUnit,
    ]
      .map(normalizeForMatch)
      .join("|");

    if (
      unitKeys.has(key) &&
      unit.id !== question.unitId
    ) {
      return;
    }

    unitKeys.add(key);
    uniqueUnits.push(unit);
  });

  /*
   * 추천 유형:
   * 처음 배정된 출제자·통과·대단원과
   * 일치하는 유형입니다.
   */
  const recommendedUnits =
    uniqueUnits
      .filter((unit) => {
        return (
          unit.teacher ===
            recommendedTeacher &&
          unit.course ===
            recommendedCourse &&
          majorUnitMatches(
            unit.majorUnit,
            recommendedMajorUnit,
          ) &&
          isUnitPositionAllowed(
            unit,
            question.number,
          )
        );
      })
      .sort(compareUnitsByTypeName);

  /*
   * 전체 유형은 추천 포함 전부 표시하고
   * 유형명 가나다순으로 정렬합니다.
   */
  const sortedAllUnits =
    uniqueUnits.sort(
      compareUnitsByTypeName,
    );

  select.replaceChildren();

  /*
   * 유형명 기준 가나다순 정렬 함수
   */
  function compareUnitsByTypeName(
    a,
    b,
  ) {
    const aName =
      a.type ||
      a.smallUnit ||
      "";

    const bName =
      b.type ||
      b.smallUnit ||
      "";

    const typeCompare =
      aName.localeCompare(
        bName,
        "ko",
        {
          numeric: true,
          sensitivity: "base",
        },
      );

    if (typeCompare !== 0) {
      return typeCompare;
    }

    const teacherCompare =
      String(
        a.teacher || "",
      ).localeCompare(
        String(
          b.teacher || "",
        ),
        "ko",
      );

    if (teacherCompare !== 0) {
      return teacherCompare;
    }

    const courseCompare =
      String(
        a.course || "",
      ).localeCompare(
        String(
          b.course || "",
        ),
        "ko",
        {
          numeric: true,
        },
      );

    if (courseCompare !== 0) {
      return courseCompare;
    }

    return String(
      a.majorUnit || "",
    ).localeCompare(
      String(
        b.majorUnit || "",
      ),
      "ko",
      {
        numeric: true,
      },
    );
  }

  /*
   * 추천 유형
   */
  if (recommendedUnits.length > 0) {
    const recommendedGroup =
      document.createElement(
        "optgroup",
      );

    recommendedGroup.label =
      `추천 · ${recommendedTeacher} · ${recommendedCourse}`;

    recommendedUnits.forEach(
      (unit) => {
        const typeName =
          unit.type ||
          unit.smallUnit;

        const option =
          document.createElement(
            "option",
          );

        option.value = unit.id;
        option.textContent =
          `★ ${typeName}`;

        option.selected =
          unit.id ===
          question.unitId;

        option.title = [
          unit.teacher,
          unit.course,
          unit.majorUnit,
          unit.middleUnit,
          typeName,
        ]
          .filter(Boolean)
          .join(" · ");

        recommendedGroup.append(
          option,
        );
      },
    );

    select.append(
      recommendedGroup,
    );
  }

  /*
   * 전체 유형
   * 추천에 표시된 유형도 여기에서 다시 보여줍니다.
   */
  const allGroup =
    document.createElement(
      "optgroup",
    );

  allGroup.label =
    `전체 유형 · 가나다순 · ${sortedAllUnits.length}개`;

  const recommendedIds =
    new Set(
      recommendedUnits.map(
        (unit) => unit.id,
      ),
    );

  sortedAllUnits.forEach(
    (unit) => {
      const typeName =
        unit.type ||
        unit.smallUnit;

      const option =
        document.createElement(
          "option",
        );

      option.value = unit.id;

      option.textContent = [
        typeName,
        unit.teacher,
        unit.course,
        unit.majorUnit,
      ]
        .filter(Boolean)
        .join(" · ");

      /*
       * 추천 그룹에 동일 항목이 있으면
       * 추천 쪽 옵션만 선택 상태로 만듭니다.
       */
      option.selected =
        unit.id ===
          question.unitId &&
        !recommendedIds.has(
          unit.id,
        );

      option.title = [
        unit.teacher,
        unit.course,
        unit.majorUnit,
        unit.middleUnit,
        typeName,
      ]
        .filter(Boolean)
        .join(" · ");

      allGroup.append(option);
    },
  );

  select.append(allGroup);

  /*
   * 현재 문항을 제외하고 이미 사용된 유형은
   * 회색으로 표시하되 선택은 허용합니다.
   */
  const usedTypes =
    new Set(
      round.questions
        .filter(
          (_, index) =>
            index !== questionIndex,
        )
        .map(
          (item) =>
            normalizeForMatch(
              item.type,
            ),
        ),
    );

  [...select.options].forEach(
    (option) => {
      const unit =
        state.units.find(
          (item) =>
            item.id ===
            option.value,
        );

      if (!unit) return;

      const typeName =
        unit.type ||
        unit.smallUnit;
  
      const alreadyUsed =
        usedTypes.has(
          normalizeForMatch(
            typeName,
          ),
        );

      if (alreadyUsed) {
        option.style.color =
          "#9ca3af";

        option.title =
          `${option.title} · 이미 배정됨, 선택 가능`;

        /*
         * 회색이어도 선택할 수 있습니다.
         */
        option.disabled = false;
      }
    },
  );

  select.disabled =
    sortedAllUnits.length === 0;

  select.title =
    `추천 ${recommendedUnits.length}개 · 전체 ${sortedAllUnits.length}개`;
}

function renderDetailOptions(
  select,
  question,
  questionIndex,
) {
  const sources =
    getSourcesForType(
      question.type,
    );

  const usedElsewhere =
    getUsedSourceKeys(
      state.currentRoundIndex,
      questionIndex,
    );

  select.replaceChildren();

  if (sources.length === 0) {
    const option =
      document.createElement(
        "option",
      );

    option.value = "";

    option.textContent =
      "연결된 세부 유형 없음";

    select.append(option);
    select.disabled = true;

    return;
  }

  sources.forEach((source) => {
    const option =
      document.createElement(
        "option",
      );

    option.value = source.key;
    option.textContent =
      source.subtype;

    option.title =
      makeSourceDescription(
        source,
      );

    option.selected =
      source.key ===
      question.source?.key;

    option.disabled =
      usedElsewhere.has(
        source.key,
      ) &&
      !option.selected;

    select.append(option);
  });

  select.title =
    question.source
      ? makeSourceDescription(
          question.source,
        )
      : "세부 유형 변경";
}

function makeSourceDescription(
  source,
) {
  return [
    source.subtype,
    source.situation,
    source.representativeChoice,
  ]
    .filter(Boolean)
    .join(" · ");
}

/*
 * 유형과 세부 유형의 변경을 구분합니다.
 */
function handleMakerTableChange(
  event,
) {
  if (
    event.target.matches(
      ".question-type-select",
    )
  ) {
    handleQuestionTypeChange(
      event,
    );

    return;
  }

  if (
    event.target.matches(
      ".detail-type-select",
    )
  ) {
    handleDetailTypeChange(
      event,
    );
  }
}

/*
 * 유형 변경
 */
function handleQuestionTypeChange(
  event,
) {
  const select =
    event.target.closest(
      ".question-type-select",
    );

  if (!select) {
    return;
  }

  const questionIndex =
    Number(
      select.dataset
        .questionIndex,
    );

  const round =
    state.rounds[
      state.currentRoundIndex
    ];

  const question =
    round?.questions[
      questionIndex
    ];

  const unit =
    state.units.find(
      (item) =>
        item.id === select.value,
    );

  if (
    !question ||
    !unit
  ) {
    return;
  }

  /*
   * 처음 자동 배정된 값은
   * 추천 기준으로 따로 보존합니다.
   */
  if (
    !question.recommendedTeacher
  ) {
    question.recommendedTeacher =
      question.teacher;
  }

  if (
    !question.recommendedCourse
  ) {
    question.recommendedCourse =
      question.course;
  }

  if (
    !question.recommendedMajorUnit
  ) {
    question.recommendedMajorUnit =
      question.majorUnit;
  }

  /*
   * 출제자와 통과 비율은 자유롭게 바꿀 수 있지만,
   * 산·염기처럼 엄격한 번호 제한은 유지합니다.
   */
  const valid =
    isUnitPositionAllowed(
      unit,
      question.number,
    );

  if (!valid) {
    alert(
      `${question.number}번에는 해당 유형을 배치할 수 없습니다.`,
    );

    renderMakerTable(round);
    return;
  }

  /*
   * 선택한 유형의 모든 분류 정보를 반영합니다.
   * 이에 따라 정T/백T 및 통과 비율도 달라집니다.
   */
  question.unitId =
    unit.id;

  question.teacher =
    unit.teacher;

  question.course =
    unit.course;

  question.majorUnit =
    unit.majorUnit;

  question.middleUnit =
    unit.middleUnit;

  question.smallUnit =
    unit.smallUnit;

  question.type =
    unit.type ||
    unit.smallUnit;

  /*
   * 변경된 유형에 맞는 세부 유형을
   * 자동으로 다시 선택합니다.
   */
  const usedElsewhere =
    getUsedSourceKeys(
      state.currentRoundIndex,
      questionIndex,
    );

  question.source =
    chooseDetailSource(
      question.type,
      usedElsewhere,
      new Set(),
    );

  /*
   * 상단 요약의 정T/백T 및
   * 통과1/통과2 개수를 다시 계산합니다.
   */
  renderMakerSummary(round);
  renderMakerTable(round);
}

/*
 * 세부 유형 변경
 */
function handleDetailTypeChange(
  event,
) {
  const select =
    event.target.closest(
      ".detail-type-select",
    );

  if (!select) {
    return;
  }

  const questionIndex =
    Number(
      select.dataset
        .questionIndex,
    );

  const round =
    state.rounds[
      state.currentRoundIndex
    ];

  const question =
    round?.questions[
      questionIndex
    ];

  if (!question) {
    return;
  }

  const source =
    getSourcesForType(
      question.type,
    ).find(
      (item) =>
        item.key ===
        select.value,
    );

  if (!source) {
    return;
  }

  question.source =
    source;

  renderMakerTable(
    round,
  );
}

function handleHistoryClick(event) {
  const button =
    event.target.closest(
      "[data-round-index]",
    );

  if (!button) {
    return;
  }

  state.currentRoundIndex =
    Number(
      button.dataset
        .roundIndex,
    );

  renderCurrentRound();
}

function resetMaker() {
  if (
    state.rounds.length === 0
  ) {
    return;
  }

  const confirmed =
    window.confirm(
      "제작한 1~10회차 편성표를 모두 초기화할까요?",
    );

  if (!confirmed) {
    return;
  }

  state.rounds = [];
  state.currentRoundIndex = -1;

  elements.makerRound.textContent =
    "0";

  elements.makerDashboard.hidden =
    true;

  elements.makerEmptyState.hidden =
    false;

  elements.makerButton.disabled =
    false;

  elements.nextMakerButton.disabled =
    true;

  elements.resetMakerButton.disabled =
    true;

  clearSavedMakerState();
}

function populateTypeSelect() {
  const types = [
    ...new Set(
      state.typeSources.map(
        (row) => row.type,
      ),
    ),
  ].sort((a, b) =>
    a.localeCompare(
      b,
      "ko",
      {
        numeric: true,
      },
    ),
  );

  const fragment =
    document.createDocumentFragment();

  types.forEach((type) => {
    const option =
      document.createElement(
        "option",
      );

    const count =
      state.typeSources.filter(
        (row) =>
          row.type === type,
      ).length;

    option.value = type;
    option.textContent =
      `${type} (${count})`;

    fragment.append(option);
  });

  elements.typeSelect.append(
    fragment,
  );
}

function handleTypeChange(event) {
  const type = cleanText(
    event.target.value,
  );

  hideIdeaResult();

  state.lastIdeaIndex = -1;

  if (!type) {
    state.selectedType = "";
    state.selectedBook = "";
    state.selectedTypeRows = [
      ...state.typeSources,
    ];
    populateBookSelect(
      state.selectedTypeRows,
    );
    renderAllIdeas();
    applySourceFilters();
    return;
  }

  state.selectedType = type;

  state.selectedTypeRows =
    state.typeSources.filter(
      (row) =>
        row.type === type,
    );

  state.selectedBook = "";
  populateBookSelect(
    state.selectedTypeRows,
  );

  renderIdeaSelection();
  applySourceFilters();
}

function populateBookSelect(rows) {
  const books = [
    ...new Set(
      rows
        .map((row) => row.book)
        .filter(Boolean),
    ),
  ].sort((a, b) =>
    a.localeCompare(
      b,
      "ko",
      { numeric: true },
    ),
  );

  elements.bookSelect.replaceChildren();

  const allOption =
    document.createElement("option");

  allOption.value = "";
  allOption.textContent =
    "전체 교재";

  elements.bookSelect.append(
    allOption,
  );

  books.forEach((book) => {
    const option =
      document.createElement("option");

    option.value = book;
    option.textContent = book;
    elements.bookSelect.append(option);
  });

  elements.bookSelect.value = "";
}

function handleBookChange(event) {
  state.selectedBook = cleanText(
    event.target.value,
  );

  state.lastIdeaIndex = -1;
  hideIdeaResult();

  elements.ideaButton.disabled =
    !state.selectedType ||
    getRandomIdeaRows().length === 0;
}

function getRandomIdeaRows() {
  if (!state.selectedBook) {
    return state.selectedTypeRows;
  }

  return state.selectedTypeRows.filter(
    (row) =>
      row.book ===
      state.selectedBook,
  );
}

function renderAllIdeas() {
  const situations = countValues(
    state.typeSources,
    "situation",
  );
  const choices = countValues(
    state.typeSources,
    "choice",
  );

  elements.selectedTypeName.textContent =
    "전체 유형";
  elements.selectedTypeSummary.textContent =
    `전체 ${formatNumber(state.typeSources.length)}개 자료에서 단어를 검색할 수 있습니다.`;
  elements.totalCount.textContent =
    formatNumber(state.typeSources.length);
  elements.situationCount.textContent =
    formatNumber(situations.length);
  elements.choiceCount.textContent =
    formatNumber(choices.length);
  elements.situationTotal.textContent =
    `${formatNumber(state.typeSources.length)}건`;
  elements.choiceTotal.textContent =
    `${formatNumber(state.typeSources.length)}건`;
  renderFrequencyList(
    elements.situationList,
    situations,
    "상황 데이터가 없습니다.",
  );
  renderFrequencyList(
    elements.choiceList,
    choices,
    "보기 데이터가 없습니다.",
  );
  elements.ideaButton.disabled = true;
  applySourceFilters();
}

function renderIdeaSelection() {
  const situations =
    countValues(
      state.selectedTypeRows,
      "situation",
    );

  const choices =
    countValues(
      state.selectedTypeRows,
      "choice",
    );

  elements.selectedTypeName.textContent =
    state.selectedType;

  elements.selectedTypeSummary.textContent =
    `총 ${formatNumber(
      state.selectedTypeRows.length,
    )}개의 출처에서 ` +
    `${formatNumber(
      situations.length,
    )}가지 상황과 ` +
    `${formatNumber(
      choices.length,
    )}가지 보기를 확인했습니다.`;

  elements.totalCount.textContent =
    formatNumber(
      state.selectedTypeRows.length,
    );

  elements.situationCount.textContent =
    formatNumber(
      situations.length,
    );

  elements.choiceCount.textContent =
    formatNumber(
      choices.length,
    );

  elements.situationTotal.textContent =
    `${formatNumber(
      state.selectedTypeRows.length,
    )}건`;

  elements.choiceTotal.textContent =
    `${formatNumber(
      state.selectedTypeRows.length,
    )}건`;

  renderFrequencyList(
    elements.situationList,
    situations,
    "상황 데이터가 없습니다.",
  );

  renderFrequencyList(
    elements.choiceList,
    choices,
    "보기 데이터가 없습니다.",
  );

  renderSourceTable(
    state.selectedTypeRows,
  );

  elements.ideaButton.disabled =
    false;

  elements.sourceSearch.disabled =
    false;
}

function countValues(rows, key) {
  const counter = new Map();

  rows.forEach((row) => {
    const value = row[key];

    if (!value) {
      return;
    }

    counter.set(
      value,
      (counter.get(value) || 0) +
        1,
    );
  });

  return [
    ...counter.entries(),
  ]
    .map(
      ([text, count]) => ({
        text,
        count,
      }),
    )
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.text.localeCompare(
          b.text,
          "ko",
        ),
    );
}

function renderFrequencyList(
  container,
  items,
  emptyMessage,
) {
  container.replaceChildren();

  if (items.length === 0) {
    container.append(
      createEmptyListItem(
        emptyMessage,
      ),
    );

    return;
  }

  const maxCount =
    items[0].count;

  const fragment =
    document.createDocumentFragment();

  items
    .slice(
      0,
      MAX_PATTERN_ITEMS,
    )
    .forEach((item, index) => {
      const listItem =
        document.createElement(
          "li",
        );

      listItem.className =
        "frequency-item";

      const rank =
        document.createElement(
          "span",
        );

      rank.className =
        "frequency-rank";

      rank.textContent =
        String(index + 1)
          .padStart(2, "0");

      const copy =
        document.createElement(
          "div",
        );

      copy.className =
        "frequency-copy";

      const text =
        document.createElement(
          "strong",
        );

      text.textContent =
        item.text;

      text.title =
        item.text;

      const bar =
        document.createElement(
          "span",
        );

      bar.className =
        "frequency-bar";

      const barFill =
        document.createElement(
          "span",
        );

      barFill.style.width =
        `${(
          item.count /
          maxCount
        ) * 100}%`;

      const value =
        document.createElement(
          "span",
        );

      value.className =
        "frequency-value";

      value.textContent =
        `${formatNumber(
          item.count,
        )}회`;

      bar.append(barFill);
      copy.append(text, bar);

      listItem.append(
        rank,
        copy,
        value,
      );

      fragment.append(
        listItem,
      );
    });

  container.append(fragment);
}

function createEmptyListItem(
  message,
) {
  const listItem =
    document.createElement("li");

  listItem.className =
    "empty-row";

  const number =
    document.createElement(
      "span",
    );

  number.className =
    "empty-number";

  number.textContent = "01";

  const text =
    document.createElement("p");

  text.textContent = message;

  listItem.append(
    number,
    text,
  );

  return listItem;
}

function showRandomIdea() {
  if (
    !state.selectedType ||
    getRandomIdeaRows().length === 0
  ) {
    return;
  }

  const candidates =
    getRandomIdeaRows()
      .map(
        (row, index) => ({
          row,
          index,
        }),
      )
      .filter(
        ({ row }) =>
          row.situation &&
          row.choice,
      );

  if (
    candidates.length === 0
  ) {
    elements.ideaMessage.textContent =
      `${state.selectedType} 유형에는 ` +
      "상황과 보기가 모두 입력된 행이 없습니다.";

    elements.ideaSource.textContent =
      "출처 정보 없음";

    elements.ideaResult.hidden =
      false;

    return;
  }

  const available =
    candidates.length > 1
      ? candidates.filter(
          ({ index }) =>
            index !==
            state.lastIdeaIndex,
        )
      : candidates;

  const selected =
    randomItem(
      available,
    );

  state.lastIdeaIndex =
    selected.index;

  renderIdeaMessage(
    selected.row,
  );

  /*
   * 교재 링크와 페이지를 표시합니다.
   */
  renderLinkedSource(
    elements.ideaSource,
    selected.row.book,
    selected.row.source,
    selected.row.type,
  );

  elements.ideaResult.hidden =
    false;

  elements.ideaResult
    .scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
}

function renderIdeaMessage(row) {
  elements.ideaMessage.replaceChildren(
    createIdeaDataSpan(
      row.type,
    ),

    document.createTextNode(
      " 유형에서는 ",
    ),

    createIdeaDataSpan(
      row.situation,
    ),

    document.createTextNode(
      " 상황을 주고 ",
    ),

    createIdeaDataSpan(
      row.choice,
    ),

    document.createTextNode(
      " 보기를 주는 방법이 있습니다.",
    ),
  );

  elements.ideaUsedCheckbox.dataset.rowNumber =
    String(row.rowNumber);

  elements.ideaUsedCheckbox.checked =
    getCurrentUsed(row);

  elements.ideaUsedCheckbox.disabled =
    false;
}

function createIdeaDataSpan(text) {
  const span =
    document.createElement(
      "span",
    );

  span.className = "idea-data";
  span.textContent = text;

  return span;
}

function hideIdeaResult() {
  elements.ideaResult.hidden =
    true;

  elements.ideaMessage.replaceChildren();

  elements.ideaSource.textContent =
    "";

  elements.ideaUsedCheckbox.disabled =
    true;
}

function handleSourceSearch() {
  applySourceFilters();
}

function applySourceFilters() {
  const query = cleanText(
    elements.sourceSearch.value,
  ).toLocaleLowerCase("ko");

  const filtered =
    state.selectedTypeRows.filter(
      (row) => {
        const matchesQuery =
          !query ||
          [
            row.type,
            row.book,
            row.situation,
            row.choice,
            row.source,
          ]
            .join(" ")
            .toLocaleLowerCase("ko")
            .includes(query);

        const matchesUsed =
          !state.showUnusedOnly ||
          !getCurrentUsed(row);

        return matchesQuery && matchesUsed;
      },
    );

  renderSourceTable(
    filtered,
    "검색 결과가 없습니다.",
  );
}

function getCurrentUsed(row) {
  return state.pendingUsed.has(row.rowNumber)
    ? state.pendingUsed.get(row.rowNumber)
    : row.used;
}

function handleUsedChange(event) {
  const checkbox = event.target.closest(
    ".used-checkbox",
  );

  if (!checkbox) {
    return;
  }

  const rowNumber = Number(
    checkbox.dataset.rowNumber,
  );
  const row = state.typeSources.find(
    (item) => item.rowNumber === rowNumber,
  );

  if (!row) {
    return;
  }

  if (checkbox.checked === row.used) {
    state.pendingUsed.delete(rowNumber);
  } else {
    state.pendingUsed.set(
      rowNumber,
      checkbox.checked,
    );
  }

  updateSyncSummary();

  if (state.showUnusedOnly && checkbox.checked) {
    applySourceFilters();
  }
}

function toggleUnusedOnly() {
  state.showUnusedOnly =
    !state.showUnusedOnly;

  elements.showUnusedButton.classList.toggle(
    "is-active",
    state.showUnusedOnly,
  );

  elements.showUnusedButton.textContent =
    state.showUnusedOnly
      ? "전체 보기"
      : "미사용만 보기";

  applySourceFilters();
}

async function syncUsedIdeas() {
  if (!state.apiUrl) {
    window.alert(
      "먼저 우측 상단 ‘시트 연동 설정’에서 Apps Script /exec 주소를 입력해 주세요.",
    );
    return;
  }

  const changes = [
    ...state.pendingUsed.entries(),
  ].map(([rowNumber, used]) => ({
    rowNumber,
    used,
  }));

  if (changes.length === 0) {
    window.alert("변경된 체크 항목이 없습니다.");
    return;
  }

  elements.syncButton.disabled = true;
  elements.syncButton.textContent = "동기화 중…";

  try {
    const response = await fetch(
      state.apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "syncUsed",
          changes,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`동기화 요청 실패: ${response.status}`);
    }

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.message || "시트 반영에 실패했습니다.");
    }

    changes.forEach(({ rowNumber, used }) => {
      const row = state.typeSources.find(
        (item) => item.rowNumber === rowNumber,
      );

      if (row) {
        row.used = used;
      }
    });

    state.pendingUsed.clear();
    updateSyncSummary(
      `${formatNumber(changes.length)}개 항목 반영 · JSON 백업 완료`,
    );
    applySourceFilters();
  } catch (error) {
    console.error(error);
    window.alert(error.message);
    updateSyncSummary("동기화 실패 · 체크 상태는 페이지에 남아 있습니다.");
  } finally {
    elements.syncButton.textContent = "시트와 동기화";
    elements.syncButton.disabled = false;
  }
}

function updateSyncSummary(message = "") {
  const pending = state.pendingUsed.size;

  elements.syncButton.disabled =
    pending === 0;

  elements.syncSummary.textContent =
    message ||
    (pending > 0
      ? `${formatNumber(pending)}개 변경 대기 중 · 동기화 버튼을 누르면 F열에 반영됩니다.`
      : "체크한 뒤 ‘시트와 동기화’를 누르면 F열에 반영됩니다.");
}

function renderSourceTable(
  rows,
  emptyMessage =
    "관련 출처가 없습니다.",
) {
  elements.sourceTableBody
    .replaceChildren();

  if (rows.length === 0) {
    const tr =
      document.createElement(
        "tr",
      );

    tr.className =
      "table-empty";

    const td =
      document.createElement(
        "td",
      );

    td.colSpan = 5;
    td.textContent =
      emptyMessage;

    tr.append(td);

    elements.sourceTableBody
      .append(tr);

    return;
  }

  const fragment =
    document.createDocumentFragment();

  rows
    .slice(0, MAX_VISIBLE_SOURCES)
    .forEach((row) => {
    const tr =
      document.createElement(
        "tr",
      );

    /*
     * 교재명과 유형을 함께 전달합니다.
     */
    const bookCell =
      createBookCell(
        row.book,
        row.type,
      );

    bookCell.classList.add(
      "source-book",
    );

    const situationCell =
      createCell(
        row.situation ||
        "-",
      );

    const choiceCell =
      createCell(
        row.choice ||
        "-",
      );

    const sourceCell =
      document.createElement(
        "td",
      );

    const usedCell =
      document.createElement(
        "td",
      );

    usedCell.className =
      "source-used";

    const usedLabel =
      document.createElement(
        "label",
      );

    usedLabel.className =
      "used-check";

    const usedInput =
      document.createElement(
        "input",
      );

    usedInput.type = "checkbox";
    usedInput.className =
      "used-checkbox";
    usedInput.dataset.rowNumber =
      String(row.rowNumber);
    usedInput.checked =
      getCurrentUsed(row);

    const usedText =
      document.createElement(
        "span",
      );

    usedText.textContent =
      "사용";

    usedLabel.append(
      usedInput,
      usedText,
    );

    usedCell.append(
      usedLabel,
    );

    if (row.source) {
      const badge =
        document.createElement(
          "span",
        );

      badge.className =
        "source-page";

      badge.textContent =
        formatPageOnly(
          row.source,
        );

      sourceCell.append(
        badge,
      );
    } else {
      sourceCell.textContent =
        "-";
    }

    tr.append(
      bookCell,
      situationCell,
      choiceCell,
      sourceCell,
      usedCell,
    );

    fragment.append(tr);
  });

  elements.sourceTableBody
    .append(fragment);

  if (rows.length > MAX_VISIBLE_SOURCES) {
    const tr = document.createElement("tr");
    tr.className = "table-empty source-limit-row";
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent =
      `검색 속도를 위해 ${formatNumber(MAX_VISIBLE_SOURCES)}개까지만 표시합니다. 단어를 더 입력해 좁혀 주세요.`;
    tr.append(td);
    elements.sourceTableBody.append(tr);
  }
}

function createBookCell(
  book,
  type,
) {
  const cell =
    document.createElement(
      "td",
    );

  const bookText =
    cleanText(book);

  if (!bookText) {
    cell.textContent = "-";
    return cell;
  }

  const url =
    getBookDriveUrl(
      bookText,
      type,
    );

  if (!url) {
    cell.textContent =
      bookText;

    return cell;
  }

  cell.append(
    createBookDriveLink(
      bookText,
      url,
    ),
  );

  return cell;
}

function renderLinkedSource(
  container,
  book,
  source,
  type,
) {
  container.replaceChildren();

  const bookText =
    cleanText(book) ||
    "교재 정보 없음";

  const pageText =
    cleanText(source)
      ? formatPageOnly(
          source,
        )
      : "";

  const url =
    getBookDriveUrl(
      bookText,
      type,
    );

  if (url) {
    container.append(
      createBookDriveLink(
        bookText,
        url,
      ),
    );
  } else {
    container.append(
      document.createTextNode(
        bookText,
      ),
    );
  }

  if (pageText) {
    container.append(
      document.createTextNode(
        ` ${pageText}`,
      ),
    );
  }
}

function createBookDriveLink(
  book,
  url,
) {
  const link =
    document.createElement(
      "a",
    );

  link.className =
    "book-drive-link";

  link.href = url;
  link.target = "_blank";

  link.rel =
    "noopener noreferrer";

  link.textContent =
    book;

  link.title =
    `${book} 교재를 Google Drive에서 열기`;

  link.setAttribute(
    "aria-label",
    `${book} 교재 새 탭에서 열기`,
  );

  return link;
}

/*
 * 단원 분류 데이터에서
 * 해당 유형의 통과1·2를 찾습니다.
 */
function resolveCourseFromType(
  type,
) {
  const target =
    normalizeForMatch(
      type,
    );

  if (!target) {
    return "";
  }

  const matchedUnit =
    state.units.find(
      (unit) => {
        const unitType =
          normalizeForMatch(
            unit.type ||
            unit.smallUnit,
          );

        return (
          unitType &&
          (
            target.includes(
              unitType,
            ) ||
            unitType.includes(
              target,
            )
          )
        );
      },
    );

  return (
    matchedUnit?.course ||
    ""
  );
}

function getBookDriveUrl(
  book,
  type,
) {
  const target =
    normalizeForMatch(
      book,
    );

  if (!target) {
    return "";
  }

  /*
   * 교재명에 통과1·2가 있으면 그것을 사용하고,
   * 없으면 유형의 단원 분류에서 찾습니다.
   */
  const course =
    normalizeCourse(book) ||
    resolveCourseFromType(
      type,
    );

  if (!course) {
    return "";
  }

  let product = "";

  /*
   * 완자 기출PICK을 일반 완자보다
   * 먼저 판별합니다.
   */
  if (
    target.includes(
      "완자",
    ) &&
    (
      target.includes(
        "기출pick",
      ) ||
      target.includes(
        "기출픽",
      )
    )
  ) {
    product =
      "완자 기출pick";
  } else if (
    target.includes(
      "하이탑",
    ) &&
    target.includes(
      "시험대비",
    )
  ) {
    product =
      "하이탑 시험대비";
  } else if (
    target.includes(
      "하이탑",
    ) &&
    target.includes(
      "진도",
    )
  ) {
    product =
      "하이탑 진도";
  } else if (
    target.includes(
      "오투",
    )
  ) {
    product = "오투";
  } else if (
    target.includes(
      "완자",
    )
  ) {
    product = "완자";
  } else if (
    target.includes(
      "개념완성",
    )
  ) {
    product = "개념완성";
  }

  if (!product) {
    return "";
  }

  return (
    BOOK_DRIVE_LINKS[
      `${course} ${product}`
    ] || ""
  );
}

function createBookCell(
  book,
  type,
) {
  const cell =
    document.createElement(
      "td",
    );

  const bookText =
    cleanText(book);

  if (!bookText) {
    cell.textContent = "-";
    return cell;
  }

  const url =
    getBookDriveUrl(
      bookText,
      type,
    );

  /*
   * 링크를 찾지 못해도 기존 교재명은
   * 반드시 표시합니다.
   */
  if (!url) {
    cell.textContent =
      bookText;

    return cell;
  }

  cell.append(
    createBookDriveLink(
      bookText,
      url,
    ),
  );

  return cell;
}

function renderLinkedSource(
  container,
  book,
  source,
  type,
) {
  container.replaceChildren();

  const bookText =
    cleanText(book) ||
    "교재 정보 없음";

  const pageText =
    cleanText(source)
      ? formatPageOnly(
          source,
        )
      : "";

  const url =
    getBookDriveUrl(
      bookText,
      type,
    );

  if (url) {
    container.append(
      createBookDriveLink(
        bookText,
        url,
      ),
    );
  } else {
    /*
     * 링크가 없더라도 기존 출처는 표시합니다.
     */
    container.append(
      document.createTextNode(
        bookText,
      ),
    );
  }

  if (pageText) {
    container.append(
      document.createTextNode(
        ` ${pageText}`,
      ),
    );
  }
}

function createBookDriveLink(
  book,
  url,
) {
  const link =
    document.createElement(
      "a",
    );

  link.className =
    "book-drive-link";

  link.href = url;
  link.target = "_blank";

  link.rel =
    "noopener noreferrer";

  link.textContent =
    book;

  link.title =
    `${book} 교재를 Google Drive에서 열기`;

  link.setAttribute(
    "aria-label",
    `${book} 교재 새 탭에서 열기`,
  );

  return link;
}

function resolveCourseFromType(
  type,
) {
  const target =
    normalizeForMatch(
      type,
    );

  if (!target) {
    return "";
  }

  /*
   * 단원 분류에서 현재 유형을 찾아
   * 통과1·통과2를 확인합니다.
   */
  const matchedUnit =
    state.units.find(
      (unit) => {
        const unitType =
          normalizeForMatch(
            unit.type ||
            unit.smallUnit,
          );

        return (
          unitType &&
          (
            target.includes(
              unitType,
            ) ||
            unitType.includes(
              target,
            )
          )
        );
      },
    );

  return (
    matchedUnit?.course ||
    ""
  );
}

function getBookDriveUrl(
  book,
  type,
) {
  const target =
    normalizeForMatch(
      book,
    );

  if (!target) {
    return "";
  }

  /*
   * 교재명에 통과1·2가 없으면
   * 현재 유형의 단원 분류에서 찾습니다.
   */
  const course =
    normalizeCourse(book) ||
    resolveCourseFromType(
      type,
    );

  if (!course) {
    return "";
  }

  let product = "";

  /*
   * 완자 기출PICK은 일반 완자보다
   * 먼저 판별해야 합니다.
   */
  if (
    target.includes(
      "완자",
    ) &&
    (
      target.includes(
        "기출pick",
      ) ||
      target.includes(
        "기출픽",
      )
    )
  ) {
    product =
      "완자 기출pick";
  } else if (
    target.includes(
      "하이탑",
    ) &&
    target.includes(
      "시험대비",
    )
  ) {
    product =
      "하이탑 시험대비";
  } else if (
    target.includes(
      "하이탑",
    ) &&
    target.includes(
      "진도",
    )
  ) {
    product =
      "하이탑 진도";
  } else if (
    target.includes(
      "오투",
    )
  ) {
    product = "오투";
  } else if (
    target.includes(
      "완자",
    )
  ) {
    product = "완자";
  } else if (
    target.includes(
      "개념완성",
    )
  ) {
    product = "개념완성";
  }

  if (!product) {
    return "";
  }

  return (
    BOOK_DRIVE_LINKS[
      `${course} ${product}`
    ] || ""
  );
}

function resetIdeaSelection() {
  state.selectedType = "";
  state.selectedTypeRows = [];
  state.lastIdeaIndex = -1;

  elements.selectedTypeName.textContent =
    "유형을 선택해 주세요";

  elements.selectedTypeSummary.textContent =
    "선택한 유형의 데이터가 여기에 정리됩니다.";

  elements.totalCount.textContent =
    "-";

  elements.situationCount.textContent =
    "-";

  elements.choiceCount.textContent =
    "-";

  elements.situationTotal.textContent =
    "0건";

  elements.choiceTotal.textContent =
    "0건";

  elements.ideaButton.disabled =
    true;

  elements.sourceSearch.disabled =
    true;

  elements.sourceSearch.value =
    "";

  renderFrequencyList(
    elements.situationList,
    [],
    "유형을 선택하면 출제 상황이 표시됩니다.",
  );

  renderFrequencyList(
    elements.choiceList,
    [],
    "유형을 선택하면 보기 내용이 표시됩니다.",
  );

  renderSourceTable(
    [],
    "유형을 선택하면 관련 출처를 확인할 수 있습니다.",
  );
}

function setGlobalStatus(
  status,
  message,
) {
  elements.dataStatus.className =
    `header-status${
      status === "ready"
        ? " is-ready"
        : ""
    }${
      status === "error"
        ? " is-error"
        : ""
    }`;

  const text =
    elements.dataStatus.querySelector(
      "span:last-child",
    );

  if (text) {
    text.textContent = message;
  }
}

function setIdeaStatus(
  status,
  message,
) {
  elements.ideaDataStatus.className =
    `generator-status${
      status === "ready"
        ? " is-ready"
        : ""
    }${
      status === "error"
        ? " is-error"
        : ""
    }`;

  const textNodes = [
    ...elements
      .ideaDataStatus
      .childNodes,
  ].filter(
    (node) =>
      node.nodeType ===
      Node.TEXT_NODE,
  );

  textNodes.forEach(
    (node) => node.remove(),
  );

  elements.ideaDataStatus.append(
    document.createTextNode(
      message,
    ),
  );
}

function showSystemError(message) {
  elements.errorState.hidden =
    false;

  const paragraph =
    elements.errorState.querySelector(
      "p",
    );

  if (paragraph) {
    paragraph.textContent =
      message;
  }
}

function pickValue(row, keys) {
  if (
    !row ||
    typeof row !== "object"
  ) {
    return "";
  }

  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== null
    ) {
      return row[key];
    }
  }

  return "";
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBoolean(value) {
  if (value === true) {
    return true;
  }

  const text = cleanText(value)
    .toLocaleLowerCase("ko");

  return [
    "true",
    "1",
    "yes",
    "y",
    "사용",
    "사용됨",
    "완료",
    "체크",
  ].includes(text);
}

function normalizeTeacher(value) {
  const text = cleanText(value);

  if (text.includes("정")) {
    return "정T";
  }

  if (text.includes("백")) {
    return "백T";
  }

  return "";
}

function normalizeCourse(value) {
  const text = cleanText(
    value,
  ).replace(/\s/g, "");

  if (
    /통과?1|통합과학1/.test(
      text,
    )
  ) {
    return "통과1";
  }

  if (
    /통과?2|통합과학2/.test(
      text,
    )
  ) {
    return "통과2";
  }

  return "";
}

function resolveContainedType(
  smallUnit,
  types,
) {
  const target =
    normalizeForMatch(
      smallUnit,
    );

  if (!target) {
    return "";
  }

  return (
    [...types]
      .sort(
        (a, b) =>
          normalizeForMatch(b)
            .length -
          normalizeForMatch(a)
            .length,
      )
      .find((type) => {
        const normalizedType =
          normalizeForMatch(type);

        return (
          normalizedType &&
          (
            target.includes(
              normalizedType,
            ) ||
            normalizedType.includes(
              target,
            )
          )
        );
      }) || ""
  );
}

function normalizeForMatch(value) {
  return cleanText(value)
    .normalize("NFKC")
    .toLocaleLowerCase("ko")
    .replace(
      /[^\p{L}\p{N}]/gu,
      "",
    );
}

function parseFrequency(value) {
  const number = Number(
    String(value ?? "").replace(
      /[^0-9.]/g,
      "",
    ),
  );

  return (
    Number.isFinite(number) &&
    number > 0
  )
    ? number
    : 1;
}

function makeSourceKey(
  type,
  subtype,
) {
  return (
    `${normalizeForMatch(type)}` +
    `::${normalizeForMatch(subtype)}`
  );
}

function groupBy(rows, key) {
  const map = new Map();

  rows.forEach((row) => {
    if (!map.has(row[key])) {
      map.set(row[key], []);
    }

    map.get(row[key]).push(row);
  });

  return map;
}

function weightedRandom(items) {
  if (items.length === 0) {
    return null;
  }

  const total = items.reduce(
    (sum, item) =>
      sum +
      Math.max(
        1,
        item.frequency || 1,
      ),
    0,
  );

  let point =
    Math.random() * total;

  for (const item of items) {
    point -= Math.max(
      1,
      item.frequency || 1,
    );

    if (point <= 0) {
      return item;
    }
  }

  return items[
    items.length - 1
  ];
}

function randomItem(items) {
  return items[
    Math.floor(
      Math.random() *
        items.length,
    )
  ];
}

function shuffle(items) {
  for (
    let index =
      items.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (index + 1),
      );

    [
      items[index],
      items[randomIndex],
    ] = [
      items[randomIndex],
      items[index],
    ];
  }

  return items;
}

function createCell(text) {
  const td =
    document.createElement("td");

  td.textContent = text;

  return td;
}

function formatSource(
  book,
  source,
) {
  const bookText =
    cleanText(book) ||
    "교재 정보 없음";

  const sourceText =
    cleanText(source);

  if (!sourceText) {
    return bookText;
  }

  return (
    `${bookText} ` +
    formatPageOnly(
      sourceText,
    )
  );
}

function formatPageOnly(source) {
  const text =
    cleanText(source);

  return /^p\.?\s*/i.test(text)
    ? text.replace(
        /^p\.?\s*/i,
        "p.",
      )
    : `p.${text}`;
}

function formatNumber(number) {
  return new Intl.NumberFormat(
    "ko-KR",
  ).format(number);
}

function downloadText() {
  const round =
    state.rounds[
      state.currentRoundIndex
    ];

  if (!round) {
    alert("먼저 메이킹을 해주세요.");
    return;
  }

  const text =
    round.questions
      .map(
        (question) =>
          `${question.number}번-${question.type}-${question.teacher}`,
      )
      .join("\r\n");

  const blob =
    new Blob(
      ["\uFEFF" + text],
      {
        type:
          "text/plain;charset=utf-8",
      },
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    `${round.number}회차-유형.txt`;

  link.click();

  URL.revokeObjectURL(url);
}

function downloadCsv() {
  const round =
    state.rounds[
      state.currentRoundIndex
    ];

  if (!round) {
    alert("먼저 메이킹을 해주세요.");
    return;
  }

  const headers = [
    "번호",
    "출제자",
    "과목",
    "대단원",
    "중단원",
    "유형",
    "세부 유형",
  ];

  /*
   * 쉼표, 큰따옴표, 줄바꿈이 있는 값도
   * CSV에서 깨지지 않게 처리합니다.
   */
  const escapeCsv = (value) => {
    const text =
      String(value ?? "");

    return (
      `"${text.replace(
        /"/g,
        '""',
      )}"`
    );
  };

  const rows =
    round.questions
      .slice()
      .sort(
        (a, b) =>
          Number(a.number) -
          Number(b.number),
      )
      .map((question) => {
        return [
          question.number,
          question.teacher,
          question.course,
          question.majorUnit,
          question.middleUnit,
          question.type ||
            question.smallUnit,
          question.source?.subtype ||
            "",
        ]
          .map(escapeCsv)
          .join(",");
      });

  const csvText = [
    headers
      .map(escapeCsv)
      .join(","),
    ...rows,
  ].join("\r\n");

  /*
   * BOM을 추가해 엑셀에서
   * 한글이 깨지지 않도록 합니다.
   */
  const blob =
    new Blob(
      [
        "\uFEFF",
        csvText,
      ],
      {
        type:
          "text/csv;charset=utf-8",
      },
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `${round.number}회차-모의고사-구성표.csv`;

  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(
    () => {
      URL.revokeObjectURL(url);
    },
    1000,
  );
}

function saveMakerState() {
  try {
    const checkedRatio =
      document.querySelector(
        'input[name="courseRatio"]:checked',
      );

    const savedData = {
      rounds: state.rounds,
      currentRoundIndex:
        state.currentRoundIndex,
      courseRatio:
        checkedRatio?.value ||
        "12-13",
    };

    localStorage.setItem(
      MAKER_STORAGE_KEY,
      JSON.stringify(savedData),
    );
  } catch (error) {
    console.error(
      "메이킹 기록 저장 실패",
      error,
    );
  }
}

function restoreMakerState() {
  try {
    const savedText =
      localStorage.getItem(
        MAKER_STORAGE_KEY,
      );

    if (!savedText) {
      return;
    }

    const savedData =
      JSON.parse(savedText);

    if (
      !Array.isArray(
        savedData.rounds,
      ) ||
      savedData.rounds.length === 0
    ) {
      return;
    }

    state.rounds =
      savedData.rounds.slice(
        0,
        MAX_ROUNDS,
      );

    const savedIndex =
      Number(
        savedData.currentRoundIndex,
      );

    state.currentRoundIndex =
      Number.isInteger(savedIndex) &&
      savedIndex >= 0 &&
      savedIndex <
        state.rounds.length
        ? savedIndex
        : state.rounds.length - 1;

    const ratioInput =
      document.querySelector(
        `input[name="courseRatio"][value="${savedData.courseRatio}"]`,
      );

    if (ratioInput) {
      ratioInput.checked = true;
    }

    renderCurrentRound();
  } catch (error) {
    console.error(
      "메이킹 기록 복원 실패",
      error,
    );

    localStorage.removeItem(
      MAKER_STORAGE_KEY,
    );
  }
}

function clearSavedMakerState() {
  localStorage.removeItem(
    MAKER_STORAGE_KEY,
  );
}
