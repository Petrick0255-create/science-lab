const state = { query: "", sort: "relevance", visible: 18 };
const SHEET_ID = "1e8sLmymatMqV2WaMZfgJd2q_qiMKzBQ2-WuYvbMtlGM";
const SHEET_NAME = "질문 모음";
let LIVE_DATA = QA_DATA;
let sheetState = "connecting";
const normalize = (value) => (value || "").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
})[char]);

function sheetCell(cells, index) {
  const cell = cells[index];
  return cell ? String(cell.f ?? cell.v ?? "").trim() : "";
}

function sheetDate(cell) {
  if (!cell) return "";
  const formatted = String(cell.f ?? "").trim();
  const match = formatted.match(/^(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const raw = String(cell.v ?? "");
  const date = raw.match(/^Date\((\d+),(\d+),(\d+)\)$/);
  return date ? `${date[1]}-${String(+date[2] + 1).padStart(2, "0")}-${date[3].padStart(2, "0")}` : raw;
}

function parseSheet(response) {
  return (response.table?.rows || []).map((row) => {
    const cells = row.c || [];
    return {
      id: sheetCell(cells, 0),
      type: sheetCell(cells, 1),
      title: sheetCell(cells, 2),
      author: sheetCell(cells, 3),
      date: sheetDate(cells[4]),
      status: sheetCell(cells, 5),
      question: sheetCell(cells, 6),
      answer: sheetCell(cells, 7),
    };
  }).filter((item) => item.question || item.answer);
}

function loadSheet() {
  const script = document.createElement("script");
  const timeout = setTimeout(() => {
    sheetState = "fallback";
    render();
  }, 12000);
  window.__jbQuestionSheetCallback = (response) => {
    clearTimeout(timeout);
    const items = parseSheet(response);
    if (items.length) {
      LIVE_DATA = items;
      sheetState = "connected";
    } else {
      sheetState = "fallback";
    }
    render();
  };
  const query = "select A,B,C,D,E,F,G,H where G is not null or H is not null";
  script.src =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?` +
    `sheet=${encodeURIComponent(SHEET_NAME)}&headers=1&tq=${encodeURIComponent(query)}&` +
    "tqx=responseHandler:__jbQuestionSheetCallback";
  script.onerror = () => {
    clearTimeout(timeout);
    sheetState = "fallback";
    render();
  };
  document.head.appendChild(script);
}

function score(item, query) {
  if (!query) return 0;
  const tokens = query.split(" ").filter(Boolean);
  const title = normalize(item.title);
  const question = normalize(item.question);
  const answer = normalize(item.answer);
  let total = title === query ? 120 : 0;
  total += title.includes(query) ? 70 : 0;
  total += question.includes(query) ? 45 : 0;
  total += answer.includes(query) ? 18 : 0;
  tokens.forEach((token) => {
    total += title.includes(token) ? 24 : 0;
    total += question.includes(token) ? 13 : 0;
    total += answer.includes(token) ? 5 : 0;
  });
  return total;
}

function highlight(text, query) {
  let html = escapeHtml(text);
  const tokens = normalize(query)
    .split(" ")
    .filter((token) => token.length > 1)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (tokens.length) html = html.replace(new RegExp(`(${tokens.join("|")})`, "gi"), "<mark>$1</mark>");
  return html;
}

function getResults() {
  const query = normalize(state.query);
  const rows = LIVE_DATA
    .map((item) => ({ item, rank: score(item, query) }))
    .filter(({ rank }) => !query || rank > 0);
  rows.sort((a, b) => {
    if (state.sort === "newest") return b.item.date.localeCompare(a.item.date) || +b.item.id - +a.item.id;
    if (state.sort === "oldest") return a.item.date.localeCompare(b.item.date) || +a.item.id - +b.item.id;
    return b.rank - a.rank || b.item.date.localeCompare(a.item.date) || +b.item.id - +a.item.id;
  });
  return rows;
}

function render() {
  const rows = getResults();
  const shown = rows.slice(0, state.visible);
  document.querySelector("#app").innerHTML = `
    <main>
      <header class="topbar">
        <a class="brand" href="#top"><span class="brand-mark">J&amp;B</span><span class="brand-rule"></span><span class="brand-name">통합과학 질문 검색</span></a>
        <span class="archive-label"><span></span> Q&amp;A ARCHIVE</span>
      </header>
      <section class="search-stage" id="top">
        <div class="stage-inner">
          <div class="eyebrow">J&amp;B INTEGRATED SCIENCE</div>
          <h1>궁금했던 질문을<br><em>다시 찾아보세요.</em></h1>
          <p>누적된 통합과학 질문과 답변을 키워드로 빠르게 검색합니다.</p>
          <form class="search-shell" id="search-form">
            <span aria-hidden="true">⌕</span>
            <input id="search-input" value="${escapeHtml(state.query)}" placeholder="예: 중화 반응, 빅뱅 직후, 호상 열도" aria-label="질문과 답변 검색">
            <button class="search-button">검색</button>
          </form>
          <div class="quick-terms"><span>추천</span>${["중력","산화 환원","판 구조론","엘니뇨"].map((term) => `<button data-term="${term}">${term}</button>`).join("")}</div>
          <div class="sync-status sync-${sheetState}"><i></i>${sheetState === "connecting" ? "Google Sheets 연결 중" : sheetState === "connected" ? "Google Sheets 실시간 연결됨" : "연결 지연 · 저장된 데이터 표시 중"}</div>
        </div>
        <div class="stage-index">01</div>
      </section>
      <section class="results-section">
        <div class="results-head">
          <div><span class="section-kicker">SEARCH RESULTS</span><h2>${state.query ? `‘${escapeHtml(state.query)}’ 검색 결과` : "최근 질문과 답변"}</h2><p>총 <strong>${rows.length}</strong>개의 질문을 찾았습니다.</p></div>
          <select id="sort" class="sort-trigger" aria-label="정렬 방식">
            <option value="relevance" ${state.sort === "relevance" ? "selected" : ""}>관련도순</option>
            <option value="newest" ${state.sort === "newest" ? "selected" : ""}>최신순</option>
            <option value="oldest" ${state.sort === "oldest" ? "selected" : ""}>오래된순</option>
          </select>
        </div>
        <div class="result-list">
          ${shown.map(({ item }) => `
            <details class="qa-card">
              <summary>
                <div class="card-number">Q.</div>
                <div class="card-main">
                  <div class="meta-row"><span class="type-badge type-${escapeHtml(item.type)}">${escapeHtml(item.type)}</span><span># ${escapeHtml(item.id)}번</span><span>◯ ${escapeHtml(item.author || "비공개")}</span><span>${escapeHtml(item.date)}</span><span class="status-dot"><i></i> 답변완료</span></div>
                  <h3>${highlight(item.title || "제목 없는 질문", state.query)}</h3>
                  <p class="question-preview">${highlight(item.question, state.query)}</p>
                </div>
                <span class="expand-icon">⌄</span>
              </summary>
              <div class="answer-panel"><div class="answer-label">▣ ANSWER</div><div class="answer-text">${highlight((item.answer || "등록된 답변이 없습니다.").replace(/\n{3,}/g, "\n\n"), state.query)}</div></div>
            </details>
          `).join("") || `<div class="empty-state"><h3>일치하는 질문이 없습니다.</h3><p>검색어를 짧게 줄이거나 다른 과학 개념으로 검색해 보세요.</p></div>`}
        </div>
        ${state.visible < rows.length ? `<button class="more-button" id="more">질문 더 보기 <span>${state.visible} / ${rows.length}</span></button>` : ""}
      </section>
      <footer><div class="footer-brand">J&amp;B <span>INTEGRATED SCIENCE LAB</span></div><p>질문 분석 시트 기준 · ${LIVE_DATA.length}건</p></footer>
    </main>`;
  bind();
}

function bind() {
  document.querySelector("#search-form").onsubmit = (event) => {
    event.preventDefault();
    state.query = document.querySelector("#search-input").value;
    state.visible = 18;
    render();
  };
  document.querySelector("#sort").onchange = (event) => {
    state.sort = event.target.value;
    state.visible = 18;
    render();
  };
  document.querySelectorAll("[data-term]").forEach((button) => {
    button.onclick = () => {
      state.query = button.dataset.term;
      state.visible = 18;
      render();
    };
  });
  const more = document.querySelector("#more");
  if (more) more.onclick = () => { state.visible += 18; render(); };
}

render();
loadSheet();
