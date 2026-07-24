import {
  isFirebaseConfigured,
  saveFeedback,
  saveManyFeedback,
  subscribeFeedback
} from "./firebase.js";

const t1 = `OT|13
01강. 과학의 기본량|60
02강. 과학의 기본량 - 실전 문제|13
03강. 측정 표준과 정보|47
04강. 측정 표준과 정보 - 실전 문제|16
05강. 우주의 시작과 원소의 생성 (1)|47
06강. 우주의 시작과 원소의 생성 (2)|29
07강. 우주의 시작과 원소의 생성 (3)|37
08강. 우주의 시작과 원소의 생성 - 실전 문제|29
09강. 지구와 생명체를 구성하는 원소의 생성 (1)|43
10강. 지구와 생명체를 구성하는 원소의 생성 (2)|42
11강. 지구와 생명체를 구성하는 원소의 생성 (3)|51
12강. 지구와 생명체를 구성하는 원소의 생성 - 실전 문제|29
13강. 원소의 규칙성 (1)|30
14강. 원소의 규칙성 (2)|37
15강. 원소의 규칙성 (3)|55
16강. 원소의 규칙성 - 실전 문제|55
17강. 화학 결합과 물질의 성질 (1)|46
18강. 화학 결합과 물질의 성질 (2)|36
19강. 화학 결합과 물질의 성질 (3)|31
20강. 화학 결합과 물질의 성질 - 실전 문제|75
21강. 지각과 생명체 구성 물질의 규칙성 (1)|40
22강. 지각과 생명체 구성 물질의 규칙성 (2)|61
23강. 지각과 생명체 구성 물질의 규칙성 - 실전 문제|52
24강. 물질의 전기적 성질 (1)|44
25강. 물질의 전기적 성질 (2)|56
26강. 물질의 전기적 성질 - 실전 문제|38
27강. 지구 시스템의 구성과 상호작용 (1)|51
28강. 지구 시스템의 구성과 상호작용 (2)|47
29강. 지구 시스템의 구성과 상호작용 (3)|41
30강. 지구 시스템의 구성과 상호작용 - 실전 문제|48
31강. 지권의 변화와 영향 (1)|36
32강. 지권의 변화와 영향 (2)|54
33강. 지권의 변화와 영향 (3)|21
34강. 지권의 변화와 영향 - 실전 문제|47
35강. 중력의 작용 (1)|52
36강. 중력의 작용 (2)|57
37강. 중력의 작용 (3)|72
38강. 중력의 작용 - 실전 문제|63
39강. 운동과 충돌 (1)|50
40강. 운동과 충돌 (2)|50
41강. 운동과 충돌 - 실전 문제|86
42강. 생명 시스템과 세포 (1)|53
43강. 생명 시스템과 세포 (2)|39
44강. 생명 시스템과 세포 - 실전 문제|18
45강. 생명 시스템에서 일어나는 화학 반응|51
46강. 생명 시스템에서 일어나는 화학 반응 - 실전 문제|22
47강. 생명 시스템에서 정보의 흐름 (1)|55
48강. 생명 시스템에서 정보의 흐름 (2)|27
49강. 생명 시스템에서 정보의 흐름 - 실전 문제|34`;

const t2 = `01강. 지질 시대의 환경과 생물 변화 (1)|54
02강. 지질 시대의 환경과 생물 변화 (2)|61
03강. 지질 시대의 환경과 생물 변화 - 실전 문제|38
04강. 진화와 생물다양성 (1)|57
05강. 진화와 생물다양성 (2)|28
06강. 진화와 생물다양성 - 실전 문제|27
07강. 산화와 환원 (1)|65
08강. 산화와 환원 (2)|54
09강. 산화와 환원 (3)|61
10강. 산화와 환원 - 실전 문제|78
11강. 산, 염기와 중화 반응 (1)|49
12강. 산, 염기와 중화 반응 (2)|62
13강. 산, 염기와 중화 반응 (3)|48
14강. 산, 염기와 중화 반응 (4)|50
15강. 산, 염기와 중화 반응 - 실전 문제|99
16강. 물질 변화에서 에너지의 출입|47
17강. 물질 변화에서 에너지의 출입 - 실전 문제|48
18강. 생태계의 구성과 환경|48
19강. 생태계의 구성과 환경 - 실전 문제|16
20강. 생태계 평형|31
21강. 생태계 평형 - 실전 문제|25
22강. 지구 환경 변화와 인간 생활 (1)|40
23강. 지구 환경 변화와 인간 생활 (2)|53
24강. 지구 환경 변화와 인간 생활 (3)|20
25강. 지구 환경 변화와 인간 생활 - 실전 문제|56
26강. 태양 에너지의 생성과 전환|50
27강. 태양 에너지의 생성과 전환 - 실전 문제|30
28강. 전기 에너지의 생산 (1)|54
29강. 전기 에너지의 생산 (2)|35
30강. 전기 에너지의 생산 - 실전 문제|50
31강. 에너지 효율과 신재생 에너지|52
32강. 에너지 효율과 신재생 에너지 - 실전 문제|40
33강. 과학 기술의 활용|60
34강. 과학 기술의 활용 - 실전 문제|20
35강. 과학 기술의 발전과 쟁점|30
36강. 과학 기술의 발전과 쟁점 - 실전 문제|12`;

function makeCourse(text, course) {
  return text.split("\n").map((line, index) => {
    const [title, minutes] = line.split("|");

    return {
      id: `${course === "통과 1" ? "T1" : "T2"}-${index + 1}`,
      course,
      no: index + 1,
      title,
      minutes,
      owner: course === "통과 1" ? "범" : "혬",
      weak: "",
      good: "",
      memory: "",
      improve: "",
      surprise: "",
      status: "empty",
      updatedAt: "",
      updatedBy: ""
    };
  });
}

let lectures = [
  ...makeCourse(t1, "통과 1"),
  ...makeCourse(t2, "통과 2")
];

let selectedId = "T1-2";
let filter = "전체";
let query = "";
let saveTimer;
let editing = false;

const $ = selector => document.querySelector(selector);

const fields = [
  "weak",
  "good",
  "memory",
  "surprise",
  "improve"
];

const statusText = {
  empty: "미작성",
  draft: "부분 저장",
  done: "저장됨"
};

function selected() {
  return lectures.find(item => item.id === selectedId) || lectures[0];
}

function formatTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderList() {
  const visible = lectures.filter(item => {
    const matchesFilter =
      filter === "전체" ||
      item.course === filter;

    const matchesQuery = item.title
      .toLowerCase()
      .includes(query.toLowerCase());

    return matchesFilter && matchesQuery;
  });

  $("#lectureCount").textContent = `${visible.length}개`;

  $("#lectureList").innerHTML = visible.map(item => `
    <button
      class="lecture-row ${item.id === selectedId ? "selected" : ""}"
      data-id="${item.id}"
    >
      <span>
        <b>${escapeHtml(item.title)}</b>
        <em class="${item.status}">
          ● ${statusText[item.status]}
        </em>
      </span>

      <small>
        ${item.course} · ${item.minutes}분
        <time>${formatTime(item.updatedAt)}</time>
      </small>
    </button>
  `).join("") || `
    <p class="no-result">검색 결과가 없습니다.</p>
  `;
}

function renderEditor() {
  const item = selected();

  $("#courseLabel").textContent =
    `${item.course} · ${item.no}번`;

  $("#lectureName").textContent = item.title;
  $("#ownerInput").value = item.owner;
  $("#minutesInput").value = item.minutes;

  const badge = $("#statusBadge");

  badge.className = `badge ${item.status}`;
  badge.textContent = `● ${statusText[item.status]}`;

  fields.forEach(key => {
    $(`#${key}Input`).value = item[key] || "";

    $(`[data-count="${key}"]`).textContent =
      `${(item[key] || "").length} / 1000`;
  });
}

function renderStatus() {
  const done = lectures.filter(
    item => item.status === "done"
  ).length;

  const draft = lectures.filter(
    item => item.status === "draft"
  ).length;

  const empty = lectures.length - done - draft;

  const rate = lectures.length
    ? done / lectures.length * 100
    : 0;

  $("#doneCount").textContent = done;
  $("#totalCount").textContent = `/ ${lectures.length}`;

  $("#doneLegend").textContent = done;
  $("#draftLegend").textContent = draft;
  $("#emptyLegend").textContent = empty;

  $("#rate").textContent = `${rate.toFixed(1)}%`;

  $("#progressRing").style.setProperty(
    "--progress",
    `${rate * 3.6}deg`
  );

  const recent = lectures
    .filter(item => item.updatedAt)
    .sort((a, b) => {
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, 5);

  $("#recentList").innerHTML = recent.map(item => `
    <button
      data-id="${item.id}"
      class="${item.status}"
    >
      <b>${escapeHtml(item.title)}</b>
      <span>${escapeHtml(item.updatedBy || "")}</span>
      <small>${formatTime(item.updatedAt)}</small>
    </button>
  `).join("") || `
    <p class="no-result">
      아직 저장된 피드백이 없습니다.
    </p>
  `;
}

function renderAll() {
  renderList();

  if (!editing) {
    renderEditor();
  }

  renderStatus();
}

function applyInputs(status = "draft") {
  const item = selected();

  item.owner = $("#ownerInput").value;

  item.minutes = $("#minutesInput")
    .value
    .replace(/\D/g, "");

  fields.forEach(key => {
    item[key] = $(`#${key}Input`).value;
  });

  item.status = status;

  return item;
}

async function save(status, quiet = false) {
  clearTimeout(saveTimer);

  const item = applyInputs(status);

  $("#saveMessage").textContent =
    "서버에 저장 중…";

  try {
    await saveFeedback(
      item,
      $("#writerInput").value.trim()
    );

    $("#saveMessage").textContent =
      "모든 사용자에게 공유 저장되었습니다.";
    localStorage.removeItem(
      `lectureDraft:${item.id}`
    );

    editing = false;

    if (!quiet) {
      toast("모든 사용자에게 공유 저장했습니다.");
    }
  } catch (error) {
    $("#saveMessage").textContent =
      "Firebase 설정 또는 연결 상태를 확인하세요.";

    if (!quiet) {
      toast(error.message);
    }
  }

  const badge = $("#statusBadge");

  badge.className = `badge ${item.status}`;
  badge.textContent = `● ${statusText[item.status]}`;
}

function scheduleSave(event) {
  editing = true;

  const item = applyInputs("draft");

  // Firebase가 아니라 브라우저에만 즉시 임시 백업
  localStorage.setItem(
    `lectureDraft:${item.id}`,
    JSON.stringify({
      weak: item.weak,
      good: item.good,
      memory: item.memory,
      surprise: item.surprise,
      improve: item.improve,
      owner: item.owner,
      minutes: item.minutes,
      savedAt: new Date().toISOString()
    })
  );

  // 현재 입력칸의 글자 수만 변경
  if (event?.target?.id) {
    const fieldName =
      event.target.id.replace("Input", "");

    const countElement = document.querySelector(
      `[data-count="${fieldName}"]`
    );

    if (countElement) {
      countElement.textContent =
        `${event.target.value.length.toLocaleString()} / 1,000`;
    }
  }

  const badge = $("#statusBadge");

  badge.className = "badge draft";
  badge.textContent = "● 작성 중";

  $("#saveMessage").textContent =
    "브라우저에 임시 보관 중입니다. 완료되면 피드백 저장을 누르세요.";
}

function csvCell(value) {
  return `"${String(value ?? "")
    .replace(/"/g, '""')
    .replace(/\r\n/g, "\n")}"`;
}

function downloadCsv() {
  const headers = [
    "No",
    "구분",
    "강의명",
    "담당자",
    "러닝타임(분)",
    "아쉬운점",
    "좋은점",
    "암기법",
    "보완할 방안",
    "놀라운 사실",
    "저장상태",
    "수정일시",
    "수정자"
  ];

  const rows = lectures.map(item => [
    item.no,
    item.course,
    item.title,
    item.owner,
    item.minutes,
    item.weak,
    item.good,
    item.memory,
    item.improve,
    item.surprise,
    statusText[item.status],
    item.updatedAt,
    item.updatedBy
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: "text/csv;charset=utf-8"
    }
  );

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);

  link.download =
    `강의_피드백_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  link.click();

  URL.revokeObjectURL(link.href);
}

function parseCsv(text) {
  const rows = [];

  let row = [];
  let cell = "";
  let quoted = false;

  const source = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (quoted) {
      if (
        char === '"' &&
        source[i + 1] === '"'
      ) {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

async function importCsv(file) {
  const rows = parseCsv(await file.text());

  const headers = rows.shift();

  const at = name => headers.indexOf(name);

  rows.forEach(row => {
    const item = lectures.find(lecture => {
      const sameTitle =
        lecture.title === row[at("강의명")];

      const sameCourse =
        !row[at("구분")] ||
        lecture.course === row[at("구분")];

      return sameTitle && sameCourse;
    });

    if (!item) return;

    item.owner =
      row[at("담당자")] || item.owner;

    item.minutes =
      row[at("러닝타임(분)")] || item.minutes;

    item.weak =
      row[at("아쉬운점")] || "";

    item.good =
      row[at("좋은점")] || "";

    item.memory =
      row[at("암기법")] || "";

    item.improve =
      row[at("보완할 방안")] || "";

    item.surprise =
      row[at("놀라운 사실")] || "";

    const importedStatus =
      row[at("저장상태")];

    item.status =
      importedStatus === "저장됨"
        ? "done"
        : importedStatus === "부분 저장"
          ? "draft"
          : "empty";
  });

  await saveManyFeedback(
    lectures,
    $("#writerInput").value.trim()
  );

  toast("CSV 데이터를 서버에 반영했습니다.");
}

function toast(message) {
  const box = $("#toast");

  box.textContent = message;
  box.hidden = false;

  clearTimeout(box.timer);

  box.timer = setTimeout(() => {
    box.hidden = true;
  }, 2500);
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );
}

$("#lectureList").addEventListener(
  "click",
  async event => {
    const button =
      event.target.closest("[data-id]");

    if (!button) return;

    const nextId = button.dataset.id;

    if (nextId === selectedId) return;

    // 이전 강의에 예약된 자동 저장 취소
    clearTimeout(saveTimer);

    // 현재 입력 내용을 현재 강의에 먼저 저장
    if (editing) {
      await save("draft", true);
    }

    selectedId = nextId;
    editing = false;

    renderAll();
  }
);

$("#recentList").addEventListener(
  "click",
  async event => {
    const button =
      event.target.closest("[data-id]");

    if (!button) return;

    const nextId = button.dataset.id;

    if (nextId === selectedId) return;

    clearTimeout(saveTimer);

    if (editing) {
      await save("draft", true);
    }

    selectedId = nextId;
    editing = false;

    renderAll();
  }
);

$("#searchInput").addEventListener(
  "input",
  event => {
    query = event.target.value.trim();
    renderList();
  }
);

document
  .querySelectorAll("[data-filter]")
  .forEach(button => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter;

      document
        .querySelectorAll("[data-filter]")
        .forEach(item => {
          item.classList.toggle(
            "active",
            item === button
          );
        });

      renderList();
    });
  });

[
  "ownerInput",
  "minutesInput",
  ...fields.map(key => `${key}Input`)
].forEach(id => {
  $(`#${id}`).addEventListener(
    "input",
    scheduleSave
  );
});

$("#saveBtn").addEventListener(
  "click",
  () => save("done")
);

$("#draftBtn").addEventListener(
  "click",
  () => save("draft")
);

$("#downloadBtn").addEventListener(
  "click",
  downloadCsv
);

$("#importBtn").addEventListener(
  "click",
  () => $("#fileInput").click()
);

$("#fileInput").addEventListener(
  "change",
  event => {
    const file = event.target.files[0];

    if (!file) return;

    importCsv(file).catch(error => {
      toast(error.message);
    });
  }
);

$("#writerInput").value =
  localStorage.getItem("feedbackWriter") || "";

$("#writerInput").addEventListener(
  "input",
  event => {
    localStorage.setItem(
      "feedbackWriter",
      event.target.value
    );
  }
);

window.addEventListener(
  "keydown",
  event => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "s"
    ) {
      event.preventDefault();
      save("done");
    }
  }
);

renderAll();

if (!isFirebaseConfigured()) {
  $("#connection").className =
    "connection error";

  $("#connection b").textContent =
    "Firebase 설정 필요";

  $("#saveMessage").textContent =
    "firebase.js에 Firebase 설정값을 입력하세요.";
} else {
  subscribeFeedback(
    shared => {
      const sharedMap = new Map(
        shared.map(item => [
          item.id,
          item
        ])
      );

      lectures = lectures.map(item => {
        if (!sharedMap.has(item.id)) {
          return item;
        }

        return {
          ...item,
          ...sharedMap.get(item.id)
        };
      });

      $("#connection").className =
        "connection online";

      $("#connection b").textContent =
        "실시간 공유 연결됨";

      renderList();
      renderStatus();

      // 입력 중이 아닐 때만 서버 내용을 편집창에 표시
      if (!editing) {
        renderEditor();
      }
    },
    error => {
      $("#connection").className =
        "connection error";

      $("#connection b").textContent =
        "서버 연결 실패";

      toast(error.message);
    }
  );
}