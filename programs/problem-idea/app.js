const BASE_DIR = "../exam-search/data/고3 기출/";
const EXAM_SEARCH_URL =
  "https://petrick0255-create.github.io/science-lab/programs/exam-search/index.html";

let DATA = [];
let CURRENT_RESULTS = [];

const subjectSelect = document.getElementById("subjectSelect");
const typeSelect = document.getElementById("typeSelect");
const sortSelect = document.getElementById("sortSelect");
const columnSelect = document.getElementById("columnSelect");
const copyAllBtn = document.getElementById("copyAllBtn");
const sourceList = document.getElementById("sourceList");
const problemGrid = document.getElementById("problemGrid");
const resultCount = document.getElementById("resultCount");

init();

async function init() {
  try {
    const res = await fetch("./index.json");

    if (!res.ok) throw new Error("index.json 로딩 실패");

    DATA = await res.json();

    buildSubjectOptions();
    buildTypeOptions();
    applyFilters();

    subjectSelect.addEventListener("change", () => {
      buildTypeOptions();
      applyFilters();
    });

    typeSelect.addEventListener("change", applyFilters);
    sortSelect.addEventListener("change", applyFilters);
    columnSelect.addEventListener("change", changeColumns);
    copyAllBtn.addEventListener("click", copyAllSources);

  } catch (err) {
    console.error(err);

    sourceList.innerHTML = `
      <div class="empty">
        index.json을 불러오지 못했습니다.
      </div>
    `;

    problemGrid.innerHTML = `
      <div class="empty">
        Live Server 또는 GitHub Pages로 실행하세요.<br>
        파일을 더블클릭해서 열면 JSON을 못 불러올 수 있습니다.
      </div>
    `;
  }
}

function buildSubjectOptions() {
  const subjects = unique(DATA.map(item => item.subject));

  subjectSelect.innerHTML = `<option value="">전체 과목</option>`;

  subjects.forEach(subject => {
    subjectSelect.innerHTML += `
      <option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>
    `;
  });
}

function buildTypeOptions() {
  const selectedSubject = subjectSelect.value;

  let filtered = DATA;

  if (selectedSubject) {
    filtered = filtered.filter(item => item.subject === selectedSubject);
  }

  const types = unique(filtered.map(item => item.type || "미분류"));

  typeSelect.innerHTML = `<option value="">전체 유형</option>`;

  types.forEach(type => {
    typeSelect.innerHTML += `
      <option value="${escapeHtml(type)}">${escapeHtml(type)}</option>
    `;
  });
}

function applyFilters() {
  const selectedSubject = subjectSelect.value;
  const selectedType = typeSelect.value;

  CURRENT_RESULTS = DATA.filter(item => {
    const subjectOK = !selectedSubject || item.subject === selectedSubject;
    const typeOK = !selectedType || (item.type || "미분류") === selectedType;

    return subjectOK && typeOK;
  });

  sortResults();

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
      return by - ay || bm - am || an - bn;
    }

    if (sortMode === "oldest") {
      return ay - by || am - bm || an - bn;
    }

    if (sortMode === "number") {
      return an - bn || ay - by || am - bm;
    }

    return 0;
  });
}

function changeColumns() {
  const value = columnSelect.value;

  problemGrid.classList.remove("cols-2", "cols-3");
  problemGrid.classList.add(`cols-${value}`);
}

function renderSources() {
  resultCount.textContent = `총 ${CURRENT_RESULTS.length}문항`;

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
      <button class="source-chip" onclick="openExamSearch('${escapeForJs(searchUrl)}')">
        ${escapeHtml(text)} 🔍
      </button>
    `;
  }).join("");
}

function renderProblems() {
  if (CURRENT_RESULTS.length === 0) {
    problemGrid.innerHTML = `
      <div class="empty">조건에 맞는 관련 문제가 없습니다.</div>
    `;
    return;
  }

  problemGrid.innerHTML = CURRENT_RESULTS
    .map(item => makeProblemCard(item))
    .join("");
}

function makeProblemCard(item) {
  const sourceText = makeSourceText(item);
  const typeText = item.type || "미분류";

  const problemUrl = makePdfPath(item, item.problem);
  const solutionUrl = makePdfPath(item, item.solution);
  const searchUrl = makeExamSearchUrl(sourceText);

  return `
    <article class="problem-card">

      <div class="card-main">
        <div class="problem-title">${escapeHtml(sourceText)}</div>
        <div class="problem-meta">
          ${escapeHtml(item.grade)} · ${escapeHtml(item.subject)} · ${escapeHtml(item.year)}년 ${escapeHtml(item.month)}월 · ${escapeHtml(item.number)}번
        </div>
        <div class="problem-type">${escapeHtml(typeText)}</div>
      </div>

      <div class="card-links">
        <a href="${searchUrl}" target="_blank" class="search">출처 검색</a>
        <a href="${problemUrl}" target="_blank">문제 PDF</a>
        <a href="${solutionUrl}" target="_blank" class="solution">해설 PDF</a>
        <button onclick="copyOne('${escapeForJs(sourceText)}')">📋</button>
      </div>

    </article>
  `;
}

function makeSourceText(item) {
  const yy = String(item.year).padStart(2, "0");
  const mm = String(item.month).padStart(2, "0");

  return `${yy} ${mm} ${item.grade} ${item.subject} ${item.number}번`;
}

function makeExamSearchUrl(keyword) {
  return `${EXAM_SEARCH_URL}?q=${encodeURIComponent(keyword)}`;
}

function openExamSearch(url) {
  window.open(url, "_blank");
}

function makePdfPath(item, filename) {
  const folder = getFolderName(item.subject);
  return encodeURI(`${BASE_DIR}${folder}/${filename}`);
}

function getFolderName(subject) {
  const map = {
    "통합과학": "통합과학",

    "물리학Ⅰ": "물리학",
    "물리학1": "물리학",
    "물리": "물리학",

    "화학Ⅰ": "화학",
    "화학1": "화학",
    "화학": "화학",

    "생명과학Ⅰ": "생명과학",
    "생명과학1": "생명과학",
    "생명": "생명과학",

    "지구과학Ⅰ": "지구과학",
    "지구과학1": "지구과학",
    "지구": "지구과학",

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
  if (CURRENT_RESULTS.length === 0) return;

  const text = CURRENT_RESULTS
    .map(item => makeSourceText(item))
    .join("\n");

  copyToClipboard(text);

  copyAllBtn.textContent = "복사됨";
  setTimeout(() => {
    copyAllBtn.textContent = "전체 출처 복사";
  }, 1000);
}

function copyOne(text) {
  copyToClipboard(text);
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function shuffle(arr) {
  const copied = [...arr];

  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }

  return copied;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "ko"));
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
    .replaceAll('"', "&quot;");
}