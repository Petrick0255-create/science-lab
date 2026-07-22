"use strict";

const DATA_URL = "index.json";
const MAX_PATTERN_ITEMS = 7;

const elements = {
  typeSelect: document.querySelector("#typeSelect"),
  ideaButton: document.querySelector("#ideaButton"),
  dataStatus: document.querySelector("#dataStatus"),
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
  errorState: document.querySelector("#errorState"),
};

const state = {
  rows: [],
  selectedRows: [],
  selectedType: "",
  lastIdeaIndex: -1,
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  setLoadingState();

  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`데이터 요청 실패: ${response.status}`);
    }

    const json = await response.json();
    const rawRows = getRowsFromJson(json);

    state.rows = rawRows
      .map(normalizeRow)
      .filter(isUsableRow);

    if (state.rows.length === 0) {
      throw new Error("사용 가능한 데이터가 없습니다.");
    }

    populateTypeSelect();
    setReadyState();
  } catch (error) {
    console.error(
      "index.json을 불러오는 중 오류가 발생했습니다.",
      error,
    );

    setErrorState();
  }
}

function bindEvents() {
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
}

function getRowsFromJson(json) {
  if (Array.isArray(json)) {
    return json;
  }

  const possibleArrays = [
    json?.data,
    json?.items,
    json?.rows,
    json?.sources,
    json?.records,
  ];

  const found = possibleArrays.find(Array.isArray);

  if (found) {
    return found;
  }

  throw new Error(
    "index.json은 배열 또는 데이터 배열을 포함한 객체여야 합니다.",
  );
}

function normalizeRow(row) {
  return {
    type: cleanText(
      pickValue(row, [
        "type",
        "유형",
        "category",
        "분류",
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
        "자료",
      ]),
    ),

    choice: cleanText(
      pickValue(row, [
        "choice",
        "보기",
        "option",
        "statement",
        "선택지",
      ]),
    ),

    source: cleanText(
      pickValue(row, [
        "source",
        "출처",
        "page",
        "페이지",
        "쪽수",
      ]),
    ),
  };
}

function pickValue(row, keys) {
  if (!row || typeof row !== "object") {
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

function isUsableRow(row) {
  return Boolean(
    row.type &&
    (row.situation || row.choice),
  );
}

function populateTypeSelect() {
  const types = [
    ...new Set(
      state.rows.map((row) => row.type),
    ),
  ].sort((a, b) =>
    a.localeCompare(b, "ko", {
      numeric: true,
    }),
  );

  const fragment =
    document.createDocumentFragment();

  types.forEach((type) => {
    const option =
      document.createElement("option");

    const count = state.rows.filter(
      (row) => row.type === type,
    ).length;

    option.value = type;
    option.textContent = `${type} (${count})`;

    fragment.append(option);
  });

  elements.typeSelect.append(fragment);
}

function handleTypeChange(event) {
  const type = cleanText(
    event.target.value,
  );

  hideIdeaResult();

  elements.sourceSearch.value = "";
  state.lastIdeaIndex = -1;

  if (!type) {
    resetSelection();
    return;
  }

  state.selectedType = type;

  state.selectedRows = state.rows.filter(
    (row) => row.type === type,
  );

  renderSelection();
}

function renderSelection() {
  const situations = countValues(
    state.selectedRows,
    "situation",
  );

  const choices = countValues(
    state.selectedRows,
    "choice",
  );

  elements.selectedTypeName.textContent =
    state.selectedType;

  elements.selectedTypeSummary.textContent =
    makeSummaryText(
      state.selectedRows.length,
      situations.length,
      choices.length,
    );

  elements.totalCount.textContent =
    formatNumber(state.selectedRows.length);

  elements.situationCount.textContent =
    formatNumber(situations.length);

  elements.choiceCount.textContent =
    formatNumber(choices.length);

  elements.situationTotal.textContent =
    `${formatNumber(state.selectedRows.length)}건`;

  elements.choiceTotal.textContent =
    `${formatNumber(state.selectedRows.length)}건`;

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

  renderSourceTable(state.selectedRows);

  elements.ideaButton.disabled = false;
  elements.sourceSearch.disabled = false;
}

function makeSummaryText(
  total,
  situationKinds,
  choiceKinds,
) {
  return (
    `총 ${formatNumber(total)}개의 출처에서 ` +
    `${formatNumber(situationKinds)}가지 상황과 ` +
    `${formatNumber(choiceKinds)}가지 보기를 확인했습니다.`
  );
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
      (counter.get(value) ?? 0) + 1,
    );
  });

  return [...counter.entries()]
    .map(([text, count]) => ({
      text,
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.text.localeCompare(b.text, "ko"),
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
      createEmptyListItem(emptyMessage),
    );

    return;
  }

  const maxCount = items[0].count;
  const fragment =
    document.createDocumentFragment();

  items
    .slice(0, MAX_PATTERN_ITEMS)
    .forEach((item, index) => {
      const listItem =
        document.createElement("li");

      const rank =
        document.createElement("span");

      const copy =
        document.createElement("div");

      const text =
        document.createElement("strong");

      const bar =
        document.createElement("span");

      const barFill =
        document.createElement("span");

      const value =
        document.createElement("span");

      listItem.className =
        "frequency-item";

      rank.className =
        "frequency-rank";

      copy.className =
        "frequency-copy";

      bar.className =
        "frequency-bar";

      value.className =
        "frequency-value";

      rank.textContent = String(index + 1)
        .padStart(2, "0");

      text.textContent = item.text;
      text.title = item.text;

      const rate =
        (item.count / maxCount) * 100;

      barFill.style.width = `${rate}%`;

      value.textContent =
        `${formatNumber(item.count)}회`;

      bar.append(barFill);
      copy.append(text, bar);

      listItem.append(
        rank,
        copy,
        value,
      );

      fragment.append(listItem);
    });

  container.append(fragment);
}

function createEmptyListItem(message) {
  const listItem =
    document.createElement("li");

  const number =
    document.createElement("span");

  const text =
    document.createElement("p");

  listItem.className = "empty-row";
  number.className = "empty-number";

  number.textContent = "01";
  text.textContent = message;

  listItem.append(number, text);

  return listItem;
}

function showRandomIdea() {
  if (
    !state.selectedType ||
    state.selectedRows.length === 0
  ) {
    return;
  }

  const candidates = state.selectedRows
    .map((row, index) => ({
      row,
      index,
    }))
    .filter(
      ({ row }) =>
        row.situation &&
        row.choice,
    );

  if (candidates.length === 0) {
    elements.ideaMessage.textContent =
      `${state.selectedType} 유형에는 ` +
      "상황과 보기가 모두 입력된 행이 없습니다.";

    elements.ideaSource.textContent =
      "출처 정보 없음";

    elements.ideaResult.hidden = false;

    return;
  }

  let selected;

  if (candidates.length === 1) {
    selected = candidates[0];
  } else {
    const available = candidates.filter(
      ({ index }) =>
        index !== state.lastIdeaIndex,
    );

    selected =
      available[
        Math.floor(
          Math.random() * available.length,
        )
      ];
  }

  state.lastIdeaIndex = selected.index;

  const { row } = selected;

  elements.ideaMessage.textContent =
    `${row.type} 유형에서는 ` +
    `${row.situation} 상황을 주고 ` +
    `${row.choice} 보기를 주는 방법이 있습니다.`;

  elements.ideaSource.textContent =
    formatSource(
      row.book,
      row.source,
    );

  elements.ideaResult.hidden = false;

  elements.ideaResult.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}

function formatSource(book, source) {
  const bookText =
    cleanText(book) ||
    "교재 정보 없음";

  const sourceText =
    cleanText(source);

  if (!sourceText) {
    return bookText;
  }

  const normalizedSource =
    /^p\.?\s*/i.test(sourceText)
      ? sourceText.replace(
          /^p\.?\s*/i,
          "p.",
        )
      : `p.${sourceText}`;

  return `${bookText} ${normalizedSource}`;
}

function hideIdeaResult() {
  elements.ideaResult.hidden = true;
  elements.ideaMessage.textContent = "";
  elements.ideaSource.textContent = "";
}

function handleSourceSearch(event) {
  const query = cleanText(
    event.target.value,
  ).toLocaleLowerCase("ko");

  if (!query) {
    renderSourceTable(
      state.selectedRows,
    );

    return;
  }

  const filteredRows =
    state.selectedRows.filter((row) =>
      [
        row.book,
        row.situation,
        row.choice,
        row.source,
      ]
        .join(" ")
        .toLocaleLowerCase("ko")
        .includes(query),
    );

  renderSourceTable(
    filteredRows,
    "검색 결과가 없습니다.",
  );
}

function renderSourceTable(
  rows,
  emptyMessage = "관련 출처가 없습니다.",
) {
  elements.sourceTableBody.replaceChildren();

  if (rows.length === 0) {
    const tr =
      document.createElement("tr");

    const td =
      document.createElement("td");

    tr.className = "table-empty";
    td.colSpan = 4;
    td.textContent = emptyMessage;

    tr.append(td);
    elements.sourceTableBody.append(tr);

    return;
  }

  const fragment =
    document.createDocumentFragment();

  rows.forEach((row) => {
    const tr =
      document.createElement("tr");

    const bookCell = createCell(
      row.book || "-",
    );

    const situationCell = createCell(
      row.situation || "-",
    );

    const choiceCell = createCell(
      row.choice || "-",
    );

    const sourceCell =
      document.createElement("td");

    bookCell.classList.add(
      "source-book",
    );

    if (row.source) {
      const badge =
        document.createElement("span");

      badge.className =
        "source-page";

      badge.textContent =
        formatPageOnly(row.source);

      sourceCell.append(badge);
    } else {
      sourceCell.textContent = "-";
    }

    tr.append(
      bookCell,
      situationCell,
      choiceCell,
      sourceCell,
    );

    fragment.append(tr);
  });

  elements.sourceTableBody.append(
    fragment,
  );
}

function createCell(text) {
  const td =
    document.createElement("td");

  td.textContent = text;

  return td;
}

function formatPageOnly(source) {
  const sourceText =
    cleanText(source);

  return /^p\.?\s*/i.test(sourceText)
    ? sourceText.replace(
        /^p\.?\s*/i,
        "p.",
      )
    : `p.${sourceText}`;
}

function resetSelection() {
  state.selectedType = "";
  state.selectedRows = [];
  state.lastIdeaIndex = -1;

  elements.selectedTypeName.textContent =
    "유형을 선택해 주세요";

  elements.selectedTypeSummary.textContent =
    "선택한 유형의 데이터가 여기에 정리됩니다.";

  elements.totalCount.textContent = "-";
  elements.situationCount.textContent = "-";
  elements.choiceCount.textContent = "-";

  elements.situationTotal.textContent =
    "0건";

  elements.choiceTotal.textContent =
    "0건";

  elements.ideaButton.disabled = true;
  elements.sourceSearch.disabled = true;
  elements.sourceSearch.value = "";

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

function setLoadingState() {
  elements.typeSelect.disabled = true;
  elements.ideaButton.disabled = true;
  elements.sourceSearch.disabled = true;

  elements.dataStatus.className =
    "data-badge";

  setDataStatusText(
    "데이터 확인 중",
  );
}

function setReadyState() {
  elements.typeSelect.disabled = false;

  elements.dataStatus.className =
    "data-badge is-ready";

  setDataStatusText(
    `${formatNumber(state.rows.length)}개 자료 연결됨`,
  );
}

function setErrorState() {
  elements.typeSelect.disabled = true;
  elements.ideaButton.disabled = true;
  elements.sourceSearch.disabled = true;

  elements.dataStatus.className =
    "data-badge is-error";

  setDataStatusText(
    "데이터 연결 실패",
  );

  elements.errorState.hidden = false;
}

function setDataStatusText(text) {
  const textNodes = [
    ...elements.dataStatus.childNodes,
  ].filter(
    (node) =>
      node.nodeType === Node.TEXT_NODE,
  );

  textNodes.forEach((node) => {
    node.remove();
  });

  elements.dataStatus.append(
    document.createTextNode(text),
  );
}

function formatNumber(number) {
  return new Intl.NumberFormat(
    "ko-KR",
  ).format(number);
}