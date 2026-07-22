"use strict";

const DATA_URL = "index.json";
const QUESTION_COUNT = 25;
const MAX_ROUNDS = 10;
const JUNG_COUNT = 13;
const BAEK_COUNT = 12;
const MAX_PATTERN_ITEMS = 7;
const MAX_GENERATION_ATTEMPTS = 500;
const MAX_TYPE_PER_ROUND = 2;

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
    strict: true,
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
};

const elements = {
  dataStatus: document.querySelector("#dataStatus"),
  errorState: document.querySelector("#errorState"),

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
  ideaButton: document.querySelector("#ideaButton"),
  ideaDataStatus: document.querySelector("#ideaDataStatus"),
  ideaResult: document.querySelector("#ideaResult"),
  ideaMessage: document.querySelector("#ideaMessage"),
  ideaSource: document.querySelector("#ideaSource"),
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
};

const state = {
  typeSources: [],
  mockSources: [],
  units: [],
  sourcesByType: new Map(),

  rounds: [],
  currentRoundIndex: -1,

  selectedType: "",
  selectedTypeRows: [],
  lastIdeaIndex: -1,
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  setGlobalStatus("loading", "데이터 확인 중");

  try {
    const response = await fetch(DATA_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `index.json 요청 실패: ${response.status}`,
      );
    }

    const json = await response.json();

    loadData(json);
    initializeFeatures();
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
    handleMakerTableChange,
  );

  elements.typeSelect.addEventListener(
    "change",
    handleTypeChange,
  );

  elements.ideaButton.addEventListener(
    "click",
    showRandomIdea,
  );

  elements.resultClose.addEventListener(
    "click",
    hideIdeaResult,
  );

  elements.sourceSearch.addEventListener(
    "input",
    handleSourceSearch,
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
    .map(normalizeTypeSource)
    .filter(
      (row) =>
        row.type &&
        (row.situation || row.choice),
    );

  state.mockSources =
    prepareMockSources(
      mockSourceRows
        .map(normalizeMockSource)
        .filter(
          (row) =>
            row.type &&
            row.subtype,
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

function normalizeTypeSource(row) {
  return {
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

    type:
      explicitType ||
      resolveContainedType(
        smallUnit,
        makerTypes,
      ),
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
  /*
   * 처음 만들어졌을 때의 배치를
   * 추천 기준으로 사용합니다.
   *
   * 사용자가 다른 유형을 골라도
   * 원래 추천 목록은 유지됩니다.
   */
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
   * 현재 문제 번호에서 선택 가능한
   * 모든 단원 정보를 가져옵니다.
   *
   * 산·염기와 중화 반응처럼 번호가
   * 엄격하게 정해진 유형의 제한만 유지합니다.
   */
  const availableUnits =
    state.units.filter((unit) => {
      const isCurrentUnit =
        unit.id === question.unitId;

      return (
        isCurrentUnit ||
        isUnitPositionAllowed(
          unit,
          question.number,
        )
      );
    });

  /*
   * 추천 유형:
   * 처음 배정된 출제자, 통과, 대단원과
   * 모두 일치하는 유형
   */
  const recommendedUnits =
    availableUnits
      .filter((unit) => {
        return (
          unit.teacher ===
            recommendedTeacher &&
          unit.course ===
            recommendedCourse &&
          majorUnitMatches(
            unit.majorUnit,
            recommendedMajorUnit,
          )
        );
      })
      .sort((a, b) => {
        const scoreDifference =
          scoreUnitPosition(
            a,
            question.number,
          ) -
          scoreUnitPosition(
            b,
            question.number,
          );

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return (
          a.type || a.smallUnit
        ).localeCompare(
          b.type || b.smallUnit,
          "ko",
          {
            numeric: true,
          },
        );
      });

  /*
   * 추천에 포함되지 않은 나머지 유형은
   * 자유 선택 목록으로 보여줍니다.
   */
  const recommendedIds =
    new Set(
      recommendedUnits.map(
        (unit) => unit.id,
      ),
    );

  const freeUnits =
    availableUnits
      .filter(
        (unit) =>
          !recommendedIds.has(
            unit.id,
          ),
      )
      .sort((a, b) => {
        /*
         * 통과1 → 통과2 순서
         */
        const courseCompare =
          String(
            a.course,
          ).localeCompare(
            String(
              b.course,
            ),
            "ko",
            {
              numeric: true,
            },
          );

        if (courseCompare !== 0) {
          return courseCompare;
        }

        /*
         * 정T → 백T 순서
         */
        const teacherCompare =
          String(
            a.teacher,
          ).localeCompare(
            String(
              b.teacher,
            ),
            "ko",
          );

        if (teacherCompare !== 0) {
          return teacherCompare;
        }

        const majorCompare =
          String(
            a.majorUnit,
          ).localeCompare(
            String(
              b.majorUnit,
            ),
            "ko",
            {
              numeric: true,
            },
          );

        if (majorCompare !== 0) {
          return majorCompare;
        }

        return (
          a.type || a.smallUnit
        ).localeCompare(
          b.type || b.smallUnit,
          "ko",
          {
            numeric: true,
          },
        );
      });

  select.replaceChildren();

  /*
   * 중복된 단원 행이 드롭다운에
   * 반복해서 표시되지 않도록 합니다.
   */
  const addedKeys = new Set();

  const makeOption = (
    unit,
    isRecommended,
  ) => {
    const typeName =
      unit.type ||
      unit.smallUnit;

    /*
     * 같은 유형이라도 정T/백T 또는
     * 통과가 다르면 별도 선택지로 유지합니다.
     */
    const optionKey = [
      unit.teacher,
      unit.course,
      unit.majorUnit,
      typeName,
    ]
      .map(normalizeForMatch)
      .join("|");

    if (
      addedKeys.has(optionKey) &&
      unit.id !== question.unitId
    ) {
      return null;
    }

    addedKeys.add(optionKey);

    const option =
      document.createElement(
        "option",
      );

    option.value = unit.id;

    if (isRecommended) {
      option.textContent =
        `★ ${typeName}`;
    } else {
      option.textContent =
        `${typeName} · ${unit.teacher} · ${unit.course} · ${unit.majorUnit}`;
    }

    option.selected =
      unit.id === question.unitId;

    /*
     * 기존 데이터에 unitId가 없는 경우를 위한
     * 보조 선택 조건입니다.
     */
    if (
      !question.unitId &&
      normalizeForMatch(typeName) ===
        normalizeForMatch(
          question.type,
        ) &&
      unit.teacher ===
        question.teacher &&
      unit.course ===
        question.course
    ) {
      option.selected = true;
    }

    option.title = [
      unit.teacher,
      unit.course,
      unit.majorUnit,
      unit.middleUnit,
      typeName,
    ]
      .filter(Boolean)
      .join(" · ");

    return option;
  };

  /*
   * 추천 유형 그룹
   */
  if (recommendedUnits.length > 0) {
    const recommendedGroup =
      document.createElement(
        "optgroup",
      );

    recommendedGroup.label =
      `추천 · ${recommendedTeacher} · ${recommendedCourse} · ${recommendedMajorUnit}`;

    recommendedUnits.forEach(
      (unit) => {
        const option =
          makeOption(
            unit,
            true,
          );

        if (option) {
          recommendedGroup.append(
            option,
          );
        }
      },
    );

    if (
      recommendedGroup.children
        .length > 0
    ) {
      select.append(
        recommendedGroup,
      );
    }
  }

  /*
   * 전체 자유 선택 그룹
   */
  if (freeUnits.length > 0) {
    const freeGroup =
      document.createElement(
        "optgroup",
      );

    freeGroup.label =
      "전체 유형 · 자유 선택";

    freeUnits.forEach(
      (unit) => {
        const option =
          makeOption(
            unit,
            false,
          );

        if (option) {
          freeGroup.append(
            option,
          );
        }
      },
    );

    if (
      freeGroup.children.length >
      0
    ) {
      select.append(freeGroup);
    }
  }

  select.disabled =
    availableUnits.length <= 1;

  select.title =
    `추천 ${recommendedUnits.length}개 · 전체 ${availableUnits.length}개 중 선택`;
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

  elements.sourceSearch.value =
    "";

  state.lastIdeaIndex = -1;

  if (!type) {
    resetIdeaSelection();
    return;
  }

  state.selectedType = type;

  state.selectedTypeRows =
    state.typeSources.filter(
      (row) =>
        row.type === type,
    );

  renderIdeaSelection();
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
    state.selectedTypeRows.length === 0
  ) {
    return;
  }

  const candidates =
    state.selectedTypeRows
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
}

function handleSourceSearch(event) {
  const query = cleanText(
    event.target.value,
  ).toLocaleLowerCase("ko");

  if (!query) {
    renderSourceTable(
      state.selectedTypeRows,
    );

    return;
  }

  const filtered =
    state.selectedTypeRows.filter(
      (row) =>
        [
          row.book,
          row.situation,
          row.choice,
          row.source,
        ]
          .join(" ")
          .toLocaleLowerCase(
            "ko",
          )
          .includes(query),
    );

  renderSourceTable(
    filtered,
    "검색 결과가 없습니다.",
  );
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

    td.colSpan = 4;
    td.textContent =
      emptyMessage;

    tr.append(td);

    elements.sourceTableBody
      .append(tr);

    return;
  }

  const fragment =
    document.createDocumentFragment();

  rows.forEach((row) => {
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
    );

    fragment.append(tr);
  });

  elements.sourceTableBody
    .append(fragment);
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