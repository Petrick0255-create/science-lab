let DB = [];

fetch("data/index.json")
  .then(res => res.json())
  .then(data => {
    DB = data;
    console.log("색인 로드 완료", DB.length);
  })
  .catch(err => {
    console.error(err);
    alert("data/index.json을 불러오지 못했습니다. build-index.js를 먼저 실행하세요.");
  });

const SUBJECT_CODE = {
  "물리학Ⅰ": "P",
  "물리학1": "P",
  "물리1": "P",
  "물리": "P",

  "화학Ⅰ": "C",
  "화학1": "C",
  "화학": "C",

  "생명과학Ⅰ": "B",
  "생명과학1": "B",
  "생명1": "B",
  "생명": "B",

  "지구과학Ⅰ": "G",
  "지구과학1": "G",
  "지구1": "G",
  "지구": "G"
};

function normalizeRoman(text) {
  return text
    .replace(/I/g, "Ⅰ")
    .replace(/ⅰ/g, "Ⅰ")
    .replace(/1/g, "1")
    .trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseQuery(raw) {
  let q = raw.trim().replace(/\s+/g, " ");
  q = normalizeRoman(q);

  let yearMatch = q.match(/(\d{2})/);
  if (!yearMatch) throw new Error("연도를 찾지 못했습니다.");

  let year = Number(yearMatch[1]);
  let month;

  if (q.includes("수능")) {
    month = 11;
  } else {
    const monthMatch = q.match(/(?:^|\s)(\d{1,2})(?:월|\s)/);
    if (!monthMatch) throw new Error("월을 찾지 못했습니다.");
    month = Number(monthMatch[1]);
  }

  let gradeMatch = q.match(/고\s*([123])/);
  let grade = gradeMatch ? Number(gradeMatch[1]) : 3;

  let numMatch = q.match(/(\d{1,2})\s*번/);
  if (!numMatch) throw new Error("문항 번호를 찾지 못했습니다.");
  let number = Number(numMatch[1]);

  let subjectCode = "";
  let subjectName = "";

  for (const key of Object.keys(SUBJECT_CODE)) {
    if (q.includes(key)) {
      subjectName = key;
      subjectCode = SUBJECT_CODE[key];
      break;
    }
  }

  if (!subjectCode) throw new Error("과목을 찾지 못했습니다.");

  // 고3 교육청 학년도 보정
  const localEduMonths = [3, 4, 5, 7, 10];

  let fileYear = year;

  if (grade === 3 && localEduMonths.includes(month)) {
    fileYear = year + 1;
  }

  // 평가원 6, 9, 수능 11은 그대로

  const code =
    String(grade) +
    subjectCode +
    pad2(fileYear) +
    pad2(month) +
    pad2(number);

  const pdfKey = code.slice(0, 6);

  return {
    raw,
    year,
    fileYear,
    month,
    grade,
    subjectName,
    subjectCode,
    number,
    code,
    pdfKey
  };
}

function searchExam() {
  const input = document.getElementById("searchInput").value;
  const parsedEl = document.getElementById("parsed");
  const resultEl = document.getElementById("result");

  resultEl.classList.add("hidden");
  resultEl.innerHTML = "";

  let parsed;

  try {
    parsed = parseQuery(input);
  } catch (e) {
    parsedEl.innerHTML = `❌ ${e.message}`;
    return;
  }

  parsedEl.innerHTML = `
    변환 코드: <b>${parsed.code}</b><br>
    PDF 검색 키: <b>${parsed.pdfKey}</b>
  `;

  const item = DB.find(x => x.code === parsed.code);

  if (!item) {
    resultEl.classList.remove("hidden");
    resultEl.innerHTML = `
      <h2>검색 결과 없음</h2>
      <p><b>${parsed.code}</b> 파일을 찾지 못했습니다.</p>
      <p>이미지 파일명이 <b>${parsed.code}.png</b> 형태인지 확인하세요.</p>
    `;
    return;
  }

  resultEl.classList.remove("hidden");

  resultEl.innerHTML = `
    <h2>${parsed.raw}</h2>
    <p>검색 코드: <b>${item.code}</b></p>

    <img class="preview" src="${item.image}" alt="문제 이미지">

    <div class="links">
      ${
        item.problemPdf
          ? `<a href="${item.problemPdf}" target="_blank">문제 PDF 열기</a>`
          : `<span class="missing">문제 PDF 없음</span>`
      }

      ${
        item.solutionPdf
          ? `<a href="${item.solutionPdf}" target="_blank">해설 PDF 열기</a>`
          : `<span class="missing">해설 PDF 없음</span>`
      }
    </div>
  `;
}

document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") searchExam();
});