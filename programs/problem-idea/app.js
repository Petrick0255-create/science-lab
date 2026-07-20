const MAX_RENDER_COUNT = 300;
const DEFAULT_SUBJECT = "통합과학";

let TOTAL_MATCH_COUNT = 0;

const DATA_ROOT = "../exam-search/data/";

const EXAM_SEARCH_URL =
  "https://petrick0255-create.github.io/science-lab/programs/exam-search/index.html";

const STORAGE_KEY = "jb-problem-type-edits";

let DATA = [];
let CURRENT_RESULTS = [];
let SAVED_EDITS = {};

const subjectSelect = document.getElementById("subjectSelect");
const typeSelect = document.getElementById("typeSelect");
const sortSelect = document.getElementById("sortSelect");
const columnSelect = document.getElementById("columnSelect");

const copyAllBtn = document.getElementById("copyAllBtn");
const resetChangesBtn = document.getElementById("resetChangesBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");

const sourceList = document.getElementById("sourceList");
const problemGrid = document.getElementById("problemGrid");
const resultCount = document.getElementById("resultCount");
const editedCount = document.getElementById("editedCount");

init();

async function init() {
  try {
    const response = await fetch("./index.json");

    if (!response.ok) {
      throw new Error("index.json 로딩 실패");
    }

    const jsonData = await response.json();

    SAVED_EDITS = loadSavedEdits();

    DATA = jsonData.map(item => {
      const key = makeItemKey(item);
      const originalType = item.type || "미분류";

      return {
        ...item,
        type: SAVED_EDITS[key] || originalType,
        _originalType: originalType,
        _itemKey: key
      };
    });

  buildSubjectOptions();

  if (
    [...subjectSelect.options].some(
      option => option.value === DEFAULT_SUBJECT
    )
  ) {
    subjectSelect.value = DEFAULT_SUBJECT;
  }

  buildTypeOptions();
  applyFilters();
      updateEditedCount();

      subjectSelect.addEventListener("change", () => {
        buildTypeOptions();
        applyFilters();
    });

    typeSelect.addEventListener("change", applyFilters);
    sortSelect.addEventListener("change", applyFilters);
    columnSelect.addEventListener("change", changeColumns);

    copyAllBtn.addEventListener(
      "click",
      copyAllSources
    );

    resetChangesBtn.addEventListener(
      "click",
      resetAllChanges
    );

    downloadJsonBtn.addEventListener(
      "click",
      downloadModifiedJson
    );
  } catch (error) {
    console.error(error);

    sourceList.innerHTML = `
      <div class="empty">
        index.json을 불러오지 못했습니다.
      </div>
    `;

    problemGrid.innerHTML = `
      <div class="empty">
        Live Server 또는 GitHub Pages로 실행하세요.<br>
        파일을 더블클릭해서 열면 JSON을 불러오지 못할 수 있습니다.
      </div>
    `;
  }
}

function makeItemKey(item) {
  return [
    item.grade,
    item.subject,
    item.year,
    item.month,
    item.number,
    item.image
  ].join("|");
}

function loadSavedEdits() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {};
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error("수정 내용 로딩 실패", error);
    return {};
  }
}

function saveEdits() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(SAVED_EDITS)
  );
}

function buildSubjectOptions() {
  const previousValue = subjectSelect.value;

  const subjects = unique(
    DATA.map(item => item.subject)
  );

  subjectSelect.innerHTML = `
    <option value="">전체 과목</option>
  `;

  subjects.forEach(subject => {
    subjectSelect.insertAdjacentHTML(
      "beforeend",
      `
        <option value="${escapeHtml(subject)}">
          ${escapeHtml(subject)}
        </option>
      `
    );
  });

  if (subjects.includes(previousValue)) {
    subjectSelect.value = previousValue;
  }
}

function buildTypeOptions() {
  const selectedSubject = subjectSelect.value;
  const previousType = typeSelect.value;

  let filteredData = DATA;

  if (selectedSubject) {
    filteredData = DATA.filter(
      item => item.subject === selectedSubject
    );
  }

  const types = unique(
    filteredData.map(
      item => item.type || "미분류"
    )
  );

  typeSelect.innerHTML = `
    <option value="">전체 유형</option>
  `;

  types.forEach(type => {
    typeSelect.insertAdjacentHTML(
      "beforeend",
      `
        <option value="${escapeHtml(type)}">
          ${escapeHtml(type)}
        </option>
      `
    );
  });

  if (types.includes(previousType)) {
    typeSelect.value = previousType;
  } else {
    typeSelect.value = "";
  }
}

function getSubjectTypes(subject) {
  return unique(
    DATA
      .filter(item => item.subject === subject)
      .map(item => item.type || "미분류")
  );
}

function applyFilters() {
  const selectedSubject = subjectSelect.value;
  const selectedType = typeSelect.value;

  CURRENT_RESULTS = DATA.filter(item => {
    const subjectOK =
      !selectedSubject || item.subject === selectedSubject;

    const typeOK =
      !selectedType ||
      (item.type || "미분류") === selectedType;

    return subjectOK && typeOK;
  });

  sortResults();

  TOTAL_MATCH_COUNT = CURRENT_RESULTS.length;
  CURRENT_RESULTS = CURRENT_RESULTS.slice(0, MAX_RENDER_COUNT);

  renderSources();
  renderProblems();
}

function sortResults() {
  const sortMode = sortSelect.value;

  if (sortMode === "random") {
    CURRENT_RESULTS = shuffle(CURRENT_RESULTS);
    return;
  }

  CURRENT_RESULTS.sort((a, b) => {
    const ay = Number(a.year) || 0;
    const by = Number(b.year) || 0;

    const am = Number(a.month) || 0;
    const bm = Number(b.month) || 0;

    const an = Number(a.number) || 0;
    const bn = Number(b.number) || 0;

    if (sortMode === "newest") {
      return (
        by - ay ||
        bm - am ||
        an - bn
      );
    }

    if (sortMode === "oldest") {
      return (
        ay - by ||
        am - bm ||
        an - bn
      );
    }

    if (sortMode === "number") {
      return (
        an - bn ||
        ay - by ||
        am - bm
      );
    }

    return 0;
  });
}

function changeColumns() {
  const value = columnSelect.value;

  problemGrid.classList.remove(
    "cols-2",
    "cols-3"
  );

  problemGrid.classList.add(
    `cols-${value}`
  );
}

function renderSources() {
  resultCount.textContent =
    TOTAL_MATCH_COUNT > CURRENT_RESULTS.length
      ? `총 ${TOTAL_MATCH_COUNT}문항 중 ${CURRENT_RESULTS.length}문항 표시`
      : `총 ${TOTAL_MATCH_COUNT}문항`;

  if (CURRENT_RESULTS.length === 0) {
    sourceList.innerHTML = `
      <div class="empty">조건에 맞는 문항이 없습니다.</div>
    `;
    return;
  }

  sourceList.innerHTML = CURRENT_RESULTS.map(item => {
    const text = makeSourceText(item);
    const searchUrl = makeExamSearchUrl(text);

    return `
      <button
        class="source-chip"
        onclick="openExamSearch('${escapeForJs(searchUrl)}')"
      >
        ${escapeHtml(text)} 🔍
      </button>
    `;
  }).join("");
}

function renderProblems() {
  if (CURRENT_RESULTS.length === 0) {
    problemGrid.innerHTML = `
      <div class="empty">
        조건에 맞는 관련 문제가 없습니다.
      </div>
    `;
    return;
  }

  problemGrid.innerHTML = CURRENT_RESULTS
    .map(item => makeProblemCard(item))
    .join("");
}

function makeProblemCard(item) {
  const sourceText = makeSourceText(item);
  const currentType = item.type || "미분류";

  const imageUrl = makeImagePath(item);

  const problemUrl = makeFilePath(
    item,
    item.problem
  );

  const solutionUrl = makeFilePath(
    item,
    item.solution
  );

  const searchUrl =
    makeExamSearchUrl(sourceText);

  const subjectTypes =
    getSubjectTypes(item.subject);

  const isEdited =
    currentType !== item._originalType;

  const typeOptions = subjectTypes
    .map(type => {
      const selected =
        type === currentType
          ? "selected"
          : "";

      return `
        <option
          value="${escapeHtml(type)}"
          ${selected}
        >
          ${escapeHtml(type)}
        </option>
      `;
    })
    .join("");

  return `
    <article
      class="problem-card ${isEdited ? "edited-card" : ""}"
    >

      <button
        type="button"
        class="problem-preview"
        onclick="openImagePreview(
          '${escapeForJs(imageUrl)}',
          '${escapeForJs(sourceText)}'
        )"
        aria-label="${escapeHtml(sourceText)} 이미지 크게 보기"
      >
        <img
          src="${imageUrl}"
          alt="${escapeHtml(sourceText)} 문제 이미지"
          loading="lazy"
          onerror="
            this.closest('.problem-preview')
              .classList.add('image-error')
          "
        />

        <span class="image-error-text">
          이미지를 불러올 수 없습니다.
        </span>
      </button>

      <div class="card-main">

        <div class="problem-title-row">

          <div class="problem-title">
            ${escapeHtml(sourceText)}
          </div>

          ${
            isEdited
              ? `
                <span class="edited-badge">
                  수정됨
                </span>
              `
              : ""
          }

        </div>

        <div class="problem-meta">
          ${escapeHtml(item.grade)}
          ·
          ${escapeHtml(item.subject)}
          ·
          ${escapeHtml(item.year)}년
          ${escapeHtml(item.month)}월
          ·
          ${escapeHtml(item.number)}번
        </div>

        <div class="type-editor">

          <label>
            문항 유형

            <select
              class="card-type-select"
              onchange="changeItemType(
                '${escapeForJs(item._itemKey)}',
                this.value
              )"
            >
              ${typeOptions}
            </select>
          </label>

          ${
            isEdited
              ? `
                <button
                  type="button"
                  class="restore-type-btn"
                  onclick="restoreItemType(
                    '${escapeForJs(item._itemKey)}'
                  )"
                >
                  원래 유형으로
                </button>
              `
              : ""
          }

        </div>

      </div>

      <div class="card-links">

        <a
          href="${searchUrl}"
          target="_blank"
          class="search"
        >
          출처 검색
        </a>

        <a
          href="${problemUrl}"
          target="_blank"
        >
          문제 PDF
        </a>

        <a
          href="${solutionUrl}"
          target="_blank"
          class="solution"
        >
          해설 PDF
        </a>

        <button
          type="button"
          onclick="copyOne(
            '${escapeForJs(sourceText)}'
          )"
          title="출처 복사"
        >
          📋
        </button>

      </div>

    </article>
  `;
}

function changeItemType(itemKey, newType) {
  const item = DATA.find(
    data => data._itemKey === itemKey
  );

  if (!item) {
    return;
  }

  item.type = newType || "미분류";

  if (item.type === item._originalType) {
    delete SAVED_EDITS[itemKey];
  } else {
    SAVED_EDITS[itemKey] = item.type;
  }

  saveEdits();
  updateEditedCount();

  const selectedType = typeSelect.value;

  buildTypeOptions();

  if (
    selectedType &&
    [...typeSelect.options].some(
      option => option.value === selectedType
    )
  ) {
    typeSelect.value = selectedType;
  }

  applyFilters();
}

function restoreItemType(itemKey) {
  const item = DATA.find(
    data => data._itemKey === itemKey
  );

  if (!item) {
    return;
  }

  item.type = item._originalType;

  delete SAVED_EDITS[itemKey];

  saveEdits();
  buildTypeOptions();
  applyFilters();
  updateEditedCount();
}

function updateEditedCount() {
  const count = DATA.filter(
    item => item.type !== item._originalType
  ).length;

  editedCount.textContent =
    `수정 ${count}문항`;

  editedCount.classList.toggle(
    "has-edits",
    count > 0
  );

  downloadJsonBtn.disabled =
    DATA.length === 0;
}

function resetAllChanges() {
  const editedItems = DATA.filter(
    item => item.type !== item._originalType
  );

  if (editedItems.length === 0) {
    alert("수정된 문항이 없습니다.");
    return;
  }

  const confirmed = confirm(
    `수정한 ${editedItems.length}문항을 모두 원래 유형으로 되돌릴까요?`
  );

  if (!confirmed) {
    return;
  }

  DATA.forEach(item => {
    item.type = item._originalType;
  });

  SAVED_EDITS = {};

  localStorage.removeItem(STORAGE_KEY);

  buildTypeOptions();
  applyFilters();
  updateEditedCount();
}

function downloadModifiedJson() {
  const downloadData = DATA.map(item => {
    const {
      _originalType,
      _itemKey,
      ...cleanItem
    } = item;

    return cleanItem;
  });

  const jsonText = JSON.stringify(
    downloadData,
    null,
    2
  );

  const blob = new Blob(
    [jsonText],
    {
      type: "application/json;charset=utf-8"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = "index.json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  const originalText =
    downloadJsonBtn.textContent;

  downloadJsonBtn.textContent =
    "JSON 저장 완료";

  setTimeout(() => {
    downloadJsonBtn.textContent =
      originalText;
  }, 1200);
}

function makeSourceText(item) {
  const year = String(item.year)
    .padStart(2, "0");

  const month = String(item.month)
    .padStart(2, "0");

  return (
    `${year} ${month} ` +
    `${item.grade} ` +
    `${item.subject} ` +
    `${item.number}번`
  );
}

function makeExamSearchUrl(keyword) {
  return (
    `${EXAM_SEARCH_URL}?q=` +
    encodeURIComponent(keyword)
  );
}

function openExamSearch(url) {
  window.open(url, "_blank");
}

function makeFilePath(item, filename) {
  const gradeFolder =
    `${item.grade} 기출`;

  const subjectFolder =
    getFolderName(item.subject);

  return encodeURI(
    `${DATA_ROOT}` +
    `${gradeFolder}/` +
    `${subjectFolder}/` +
    `${filename}`
  );
}

function makeImagePath(item) {
  const gradeFolder =
    `${item.grade} 기출`;

  const subjectFolder =
    getFolderName(item.subject);

  return encodeURI(
    `${DATA_ROOT}` +
    `${gradeFolder}/` +
    `${subjectFolder}/` +
    `문제 이미지 파일/` +
    `${item.image}`
  );
}

function openImagePreview(url, title) {
  const modal =
    document.getElementById("imageModal");

  const image =
    document.getElementById("modalImage");

  const titleElement =
    document.getElementById("modalTitle");

  titleElement.textContent = title;

  image.src = url;
  image.alt = `${title} 문제 이미지`;

  modal.classList.add("show");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );
}

function closeImagePreview() {
  const modal =
    document.getElementById("imageModal");

  const image =
    document.getElementById("modalImage");

  modal.classList.remove("show");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  image.src = "";

  document.body.classList.remove(
    "modal-open"
  );
}

document.addEventListener(
  "keydown",
  event => {
    if (event.key === "Escape") {
      closeImagePreview();
    }
  }
);

function getFolderName(subject) {
  const map = {
    "통합과학": "통합과학",

    "물리학Ⅰ": "물리학",
    "물리학1": "물리학",
    "물리": "물리학",
    "물리학": "물리학",

    "화학Ⅰ": "화학",
    "화학1": "화학",
    "화학": "화학",

    "생명과학Ⅰ": "생명과학",
    "생명과학1": "생명과학",
    "생명": "생명과학",
    "생명과학": "생명과학",

    "지구과학Ⅰ": "지구과학",
    "지구과학1": "지구과학",
    "지구": "지구과학",
    "지구과학": "지구과학",

    "물리학Ⅱ": "물리학Ⅱ",
    "물리학2": "물리학Ⅱ",

    "화학Ⅱ": "화학Ⅱ",
    "화학2": "화학Ⅱ",

    "생명과학Ⅱ": "생명과학Ⅱ",
    "생명과학2": "생명과학Ⅱ",

    "지구과학Ⅱ": "지구과학Ⅱ",
    "지구과학2": "지구과학Ⅱ"
  };

  return map[subject] || subject;
}

function copyAllSources() {
  if (CURRENT_RESULTS.length === 0) {
    return;
  }

  const text = CURRENT_RESULTS
    .map(item => makeSourceText(item))
    .join("\n");

  copyToClipboard(text);

  copyAllBtn.textContent = "복사됨";

  setTimeout(() => {
    copyAllBtn.textContent =
      "전체 출처 복사";
  }, 1000);
}

function copyOne(text) {
  copyToClipboard(text);
}

function copyToClipboard(text) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .catch(() => {
        fallbackCopy(text);
      });

    return;
  }

  fallbackCopy(text);
}

function fallbackCopy(text) {
  const textarea =
    document.createElement("textarea");

  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function shuffle(array) {
  const copied = [...array];

  for (
    let i = copied.length - 1;
    i > 0;
    i--
  ) {
    const randomIndex =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      copied[i],
      copied[randomIndex]
    ] = [
      copied[randomIndex],
      copied[i]
    ];
  }

  return copied;
}

function unique(array) {
  return [
    ...new Set(
      array.filter(Boolean)
    )
  ].sort((a, b) =>
    String(a).localeCompare(
      String(b),
      "ko"
    )
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeForJs(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', "&quot;")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "");
}