const labels = ["가", "나", "다"];
const keys = ["ga", "na", "da"];

/*
  각 용액의 종류별 설정

  amount:
  입력한 단위량을 화학식 단위의 양으로 해석합니다.

  factor:
  화학식 단위 1개가 내놓는 H⁺ 또는 OH⁻의 수입니다.

  spectator:
  중화 반응에 직접 참여하지 않고 남는 이온입니다.

  spectatorFactor:
  화학식 단위 1개당 방출되는 구경꾼 이온의 수입니다.
*/
const SOLUTION_TYPES = {
  A: {
    acid1: {
      name: "1가산",
      formula: "HCl",
      role: "acid",
      factor: 1,
      spectator: "Cl⁻",
      spectatorKey: "Cl",
      spectatorCharge: -1,
      spectatorFactor: 1
    },
    acid2: {
      name: "2가산",
      formula: "H₂SO₄",
      role: "acid",
      factor: 2,
      spectator: "SO₄²⁻",
      spectatorKey: "SO4",
      spectatorCharge: -2,
      spectatorFactor: 1
    },
    base1: {
      name: "1가 염기",
      formula: "LiOH",
      role: "base",
      factor: 1,
      spectator: "Li⁺",
      spectatorKey: "Li",
      spectatorCharge: 1,
      spectatorFactor: 1
    },
    base2: {
      name: "2가 염기",
      formula: "Mg(OH)₂",
      role: "base",
      factor: 2,
      spectator: "Mg²⁺",
      spectatorKey: "Mg",
      spectatorCharge: 2,
      spectatorFactor: 1
    }
  },

  B: {
    acid1: {
      name: "1가산",
      formula: "HNO₃",
      role: "acid",
      factor: 1,
      spectator: "NO₃⁻",
      spectatorKey: "NO3",
      spectatorCharge: -1,
      spectatorFactor: 1
    },
    acid2: {
      name: "2가산",
      formula: "H₂X",
      role: "acid",
      factor: 2,
      spectator: "X²⁻",
      spectatorKey: "X",
      spectatorCharge: -2,
      spectatorFactor: 1
    },
    base1: {
      name: "1가 염기",
      formula: "NaOH",
      role: "base",
      factor: 1,
      spectator: "Na⁺",
      spectatorKey: "Na",
      spectatorCharge: 1,
      spectatorFactor: 1
    },
    base2: {
      name: "2가 염기",
      formula: "Ca(OH)₂",
      role: "base",
      factor: 2,
      spectator: "Ca²⁺",
      spectatorKey: "Ca",
      spectatorCharge: 2,
      spectatorFactor: 1
    }
  },

  C: {
    acid1: {
      name: "1가산",
      formula: "HBr",
      role: "acid",
      factor: 1,
      spectator: "Br⁻",
      spectatorKey: "Br",
      spectatorCharge: -1,
      spectatorFactor: 1
    },
    acid2: {
      name: "2가산",
      formula: "H₂Y",
      role: "acid",
      factor: 2,
      spectator: "Y²⁻",
      spectatorKey: "Y",
      spectatorCharge: -2,
      spectatorFactor: 1
    },
    base1: {
      name: "1가 염기",
      formula: "KOH",
      role: "base",
      factor: 1,
      spectator: "K⁺",
      spectatorKey: "K",
      spectatorCharge: 1,
      spectatorFactor: 1
    },
    base2: {
      name: "2가 염기",
      formula: "Ba(OH)₂",
      role: "base",
      factor: 2,
      spectator: "Ba²⁺",
      spectatorKey: "Ba",
      spectatorCharge: 2,
      spectatorFactor: 1
    }
  }
};

const COLORS = {
  H: "#ef4444",
  OH: "#8b5cf6",

  Cl: "#64748b",
  SO4: "#0f766e",
  Li: "#f97316",
  Mg: "#ea580c",

  NO3: "#475569",
  X: "#7c3aed",
  Na: "#3b82f6",
  Ca: "#0284c7",

  Br: "#92400e",
  Y: "#be123c",
  K: "#22c55e",
  Ba: "#16a34a"
};

let currentResults = [];

function $(id) {
  return document.getElementById(id);
}

function fmt(x) {
  if (Math.abs(x) < 1e-10) return "0";
  return Number(x).toFixed(2).replace(/\.?0+$/, "");
}

function gcd2(a, b) {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));

  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }

  return a || 1;
}

function gcdArray(arr) {
  return arr.reduce((a, b) => gcd2(a, b), 0) || 1;
}

function simplifyRatio(values) {
  if (values.length === 0) return [];

  const scale = 100;
  const ints = values.map(value => Math.round(value * scale));
  const g = gcdArray(ints);

  return ints.map(value => value / g);
}

function getSettings() {
  return {
    aType: $("aType").value,
    bType: $("bType").value,
    cType: $("cType").value,

    aN: Number($("aN").value),
    bN: Number($("bN").value),
    cN: Number($("cN").value),

    unitV: Number($("unitV").value)
  };
}

function getMix(key) {
  return {
    A: Number($(key + "A").value),
    B: Number($(key + "B").value),
    C: Number($(key + "C").value)
  };
}

function getSolutionConfig(solutionKey, typeValue) {
  return SOLUTION_TYPES[solutionKey][typeValue];
}

function unitAmount(volume, n, unitV) {
  return volume / unitV * n;
}

function addIon(ionMap, ion) {
  if (!ion || ion.amount <= 1e-10) return;

  const existing = ionMap[ion.key];

  if (existing) {
    existing.amount += ion.amount;
    return;
  }

  ionMap[ion.key] = {
    key: ion.key,
    name: ion.name,
    charge: ion.charge,
    amount: ion.amount
  };
}

function processSolution(
  solutionKey,
  volume,
  unitN,
  typeValue,
  unitV,
  ionMap
) {
  const config = getSolutionConfig(solutionKey, typeValue);
  const formulaAmount = unitAmount(volume, unitN, unitV);

  let hAmount = 0;
  let ohAmount = 0;

  if (config.role === "acid") {
    hAmount = formulaAmount * config.factor;
  } else {
    ohAmount = formulaAmount * config.factor;
  }

  addIon(ionMap, {
    key: config.spectatorKey,
    name: config.spectator,
    charge: config.spectatorCharge,
    amount: formulaAmount * config.spectatorFactor
  });

  return {
    solutionKey,
    typeValue,
    config,
    volume,
    formulaAmount,
    hAmount,
    ohAmount
  };
}

function calcMix(key, label) {
  const settings = getSettings();
  const volume = getMix(key);

  const ionMap = {};

  const solutionData = [
    processSolution(
      "A",
      volume.A,
      settings.aN,
      settings.aType,
      settings.unitV,
      ionMap
    ),

    processSolution(
      "B",
      volume.B,
      settings.bN,
      settings.bType,
      settings.unitV,
      ionMap
    ),

    processSolution(
      "C",
      volume.C,
      settings.cN,
      settings.cType,
      settings.unitV,
      ionMap
    )
  ];

  const hInput = solutionData.reduce(
    (sum, solution) => sum + solution.hAmount,
    0
  );

  const ohInput = solutionData.reduce(
    (sum, solution) => sum + solution.ohAmount,
    0
  );

  const reacted = Math.min(hInput, ohInput);

  const H = Math.max(0, hInput - ohInput);
  const OH = Math.max(0, ohInput - hInput);

  addIon(ionMap, {
    key: "H",
    name: "H⁺",
    charge: 1,
    amount: H
  });

  addIon(ionMap, {
    key: "OH",
    name: "OH⁻",
    charge: -1,
    amount: OH
  });

  const ions = Object.values(ionMap)
    .filter(ion => ion.amount > 1e-10)
    .sort((a, b) => {
      if (a.key === "H") return -1;
      if (b.key === "H") return 1;

      if (a.charge > 0 && b.charge < 0) return -1;
      if (a.charge < 0 && b.charge > 0) return 1;

      if (a.key === "OH") return 1;
      if (b.key === "OH") return -1;

      return a.name.localeCompare(b.name, "ko");
    });

  const totalIon = ions.reduce((sum, ion) => sum + ion.amount, 0);

  const cationTotal = ions
    .filter(ion => ion.charge > 0)
    .reduce((sum, ion) => sum + ion.amount, 0);

  const anionTotal = ions
    .filter(ion => ion.charge < 0)
    .reduce((sum, ion) => sum + ion.amount, 0);

  const totalVolume = volume.A + volume.B + volume.C;

  let state = "중성";

  if (H > 1e-10) {
    state = "산성";
  } else if (OH > 1e-10) {
    state = "염기성";
  }

  return {
    label,
    key,
    volume,
    totalVolume,

    H,
    OH,
    H2O: reacted,

    hInput,
    ohInput,

    totalIon,
    cationTotal,
    anionTotal,

    state,
    ions,
    ionMap,
    solutionData
  };
}

function calculateAll() {
  currentResults = keys.map((key, index) =>
    calcMix(key, labels[index])
  );

  return currentResults;
}

function validateInputs() {
  const settings = getSettings();

  if (
    settings.aN <= 0 ||
    settings.bN <= 0 ||
    settings.cN <= 0 ||
    settings.unitV <= 0
  ) {
    alert("단위량과 기준 부피는 0보다 커야 합니다.");
    return false;
  }

  for (const key of keys) {
    const mix = getMix(key);

    if (
      !Number.isFinite(mix.A) ||
      !Number.isFinite(mix.B) ||
      !Number.isFinite(mix.C)
    ) {
      alert("모든 부피를 숫자로 입력해야 합니다.");
      return false;
    }

    if (mix.A < 0 || mix.B < 0 || mix.C < 0) {
      alert("부피는 음수가 될 수 없습니다.");
      return false;
    }

    if (mix.A + mix.B + mix.C <= 0) {
      alert("각 혼합 용액의 전체 부피는 0보다 커야 합니다.");
      return false;
    }
  }

  return true;
}

function updateUnitBox() {
  const settings = getSettings();

  const aConfig = getSolutionConfig("A", settings.aType);
  const bConfig = getSolutionConfig("B", settings.bType);
  const cConfig = getSolutionConfig("C", settings.cType);

  const unitBox = document.querySelector(".unit-box");

  if (!unitBox) return;

  unitBox.innerHTML = `
A: ${aConfig.formula}, ${fmt(settings.aN)}N / ${fmt(settings.unitV)}mL<br>
B: ${bConfig.formula}, ${fmt(settings.bN)}N / ${fmt(settings.unitV)}mL<br>
C: ${cConfig.formula}, ${fmt(settings.cN)}N / ${fmt(settings.unitV)}mL
  `;
}

function runAll() {
  if (!validateInputs()) return;

  updateUnitBox();
  calculateAll();

  renderExamTable();
  renderIonRatios();
  renderPieCharts();
  renderChoices();
  renderKillerPoints();
}

function stateHTML(state) {
  if (state === "산성") {
    return `<span class="tag-acid">산성</span>`;
  }

  if (state === "염기성") {
    return `<span class="tag-base">염기성</span>`;
  }

  return `<span class="tag-neutral">중성</span>`;
}

function renderExamTable() {
  const results = currentResults;

  const rows = [
    ["A 용액(mL)", ...results.map(result => fmt(result.volume.A))],
    ["B 용액(mL)", ...results.map(result => fmt(result.volume.B))],
    ["C 용액(mL)", ...results.map(result => fmt(result.volume.C))],
    ["전체 부피(mL)", ...results.map(result => fmt(result.totalVolume))],
    ["혼합 전 H⁺ 수", ...results.map(result => fmt(result.hInput))],
    ["혼합 전 OH⁻ 수", ...results.map(result => fmt(result.ohInput))],
    ["생성된 물", ...results.map(result => fmt(result.H2O))],
    ["총 이온 수", ...results.map(result => fmt(result.totalIon))],
    ["액성", ...results.map(result => stateHTML(result.state))],
    ["온도 기호", "t₁", "t₂", "t₃"]
  ];

  $("examTable").innerHTML = rows
    .map(
      row => `
        <tr>
          <td>${row[0]}</td>
          <td>${row[1]}</td>
          <td>${row[2]}</td>
          <td>${row[3]}</td>
        </tr>
      `
    )
    .join("");

  $("examTableText").textContent =
`[평가원 표]

항목\t(가)\t(나)\t(다)
A(mL)\t${fmt(results[0].volume.A)}\t${fmt(results[1].volume.A)}\t${fmt(results[2].volume.A)}
B(mL)\t${fmt(results[0].volume.B)}\t${fmt(results[1].volume.B)}\t${fmt(results[2].volume.B)}
C(mL)\t${fmt(results[0].volume.C)}\t${fmt(results[1].volume.C)}\t${fmt(results[2].volume.C)}
전체 부피(mL)\t${fmt(results[0].totalVolume)}\t${fmt(results[1].totalVolume)}\t${fmt(results[2].totalVolume)}
혼합 전 H⁺ 수\t${fmt(results[0].hInput)}\t${fmt(results[1].hInput)}\t${fmt(results[2].hInput)}
혼합 전 OH⁻ 수\t${fmt(results[0].ohInput)}\t${fmt(results[1].ohInput)}\t${fmt(results[2].ohInput)}
생성된 물\t${fmt(results[0].H2O)}\t${fmt(results[1].H2O)}\t${fmt(results[2].H2O)}
총 이온 수\t${fmt(results[0].totalIon)}\t${fmt(results[1].totalIon)}\t${fmt(results[2].totalIon)}
액성\t${results[0].state}\t${results[1].state}\t${results[2].state}
온도\tt₁\tt₂\tt₃`;
}

function getPresentIons(result) {
  return result.ions
    .filter(ion => ion.amount > 1e-10)
    .map(ion => [
      ion.name,
      ion.amount,
      ion.key,
      ion.charge
    ]);
}

function renderIonRatios() {
  const cards = [];
  const text = [];

  currentResults.forEach(result => {
    const ions = getPresentIons(result);
    const values = ions.map(ion => ion[1]);
    const ratio = simplifyRatio(values);

    const names = ions.map(ion => ion[0]).join(" : ");
    const ratioText = ratio.join(" : ");

    cards.push(`
      <div class="ratio-card">
        <div class="ratio-title">(${result.label})</div>
        <div class="ratio-line">
${names || "존재하는 이온 없음"}

${ratio.length > 0 ? `= ${ratioText}` : ""}

액성: ${result.state}
총 이온 수: ${fmt(result.totalIon)}
        </div>
      </div>
    `);

    text.push(
`(${result.label})
${names || "존재하는 이온 없음"}
${ratio.length > 0 ? `= ${ratioText}` : ""}
액성: ${result.state}
총 이온 수: ${fmt(result.totalIon)}`
    );
  });

  $("ionRatioCards").innerHTML = cards.join("");
  $("ionRatioText").textContent = text.join("\n\n");
}

function polarToCartesian(cx, cy, radius, angle) {
  const radian = (angle - 90) * Math.PI / 180;

  return {
    x: cx + radius * Math.cos(radian),
    y: cy + radius * Math.sin(radian)
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);

  const largeArcFlag =
    endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z"
  ].join(" ");
}

function getIonColor(colorKey) {
  return COLORS[colorKey] || "#94a3b8";
}

function makePieSVG(result) {
  const ions = getPresentIons(result);
  const total = ions.reduce((sum, ion) => sum + ion[1], 0);

  let angle = 0;
  let paths = "";

  ions.forEach(([name, value, colorKey], index) => {
    const sliceAngle =
      total === 0 ? 0 : value / total * 360;

    const color = getIonColor(colorKey);

    if (sliceAngle >= 359.999) {
      paths += `
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="${color}"
          stroke="white"
          stroke-width="2"
        ></circle>
      `;
    } else if (sliceAngle > 0) {
      const path = describeArc(
        100,
        100,
        80,
        angle,
        angle + sliceAngle
      );

      paths += `
        <path
          d="${path}"
          fill="${color}"
          stroke="white"
          stroke-width="2"
          data-index="${index}"
        ></path>
      `;
    }

    angle += sliceAngle;
  });

  const legend = ions
    .map(([name, value, colorKey]) => `
      <div class="legend-row">
        <span
          class="legend-color"
          style="background:${getIonColor(colorKey)}"
        ></span>
        <span>${name} ${fmt(value)}</span>
      </div>
    `)
    .join("");

  return `
    <div class="pie-card">
      <div class="pie-title">(${result.label})</div>

      <svg
        id="pie-${result.key}"
        width="220"
        height="220"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        ${paths}
      </svg>

      <div class="legend">
        ${legend}
      </div>
    </div>
  `;
}

function renderPieCharts() {
  $("pieCharts").innerHTML =
    currentResults.map(makePieSVG).join("");
}

function renderChoices() {
  const results = currentResults;
  const statements = [];

  statements.push({
    symbol: "ㄱ",
    text: `ㄱ. (${results[0].label})의 액성은 ${results[0].state}이다.`,
    correct: true
  });

  statements.push({
    symbol: "ㄴ",
    text: `ㄴ. 생성된 물의 양은 (${results[1].label})가 (${results[2].label})보다 크다.`,
    correct: results[1].H2O > results[2].H2O
  });

  statements.push({
    symbol: "ㄷ",
    text: `ㄷ. (${results[0].label})와 (${results[2].label})의 총 이온 수는 같다.`,
    correct:
      Math.abs(
        results[0].totalIon - results[2].totalIon
      ) < 1e-10
  });

  statements.push({
    symbol: "ㄹ",
    text: `ㄹ. (${results[1].label})에는 H⁺와 OH⁻가 모두 존재하지 않는다.`,
    correct:
      results[1].H < 1e-10 &&
      results[1].OH < 1e-10
  });

  const answer = statements
    .filter(statement => statement.correct)
    .map(statement => statement.symbol)
    .join(", ");

  $("choiceBox").textContent =
`[자동 선지]

${statements.map(statement => statement.text).join("\n")}

정답: ${answer || "없음"}

해설 요약:
산이 내놓은 H⁺와 염기가 내놓은 OH⁻는 1:1로 반응한다.
2가산은 화학식 단위 1개당 H⁺ 2개를 내놓고, 2가 염기는 화학식 단위 1개당 OH⁻ 2개를 내놓는다.
혼합 전 H⁺ 수와 OH⁻ 수를 비교하면 액성과 생성된 물의 양을 판단할 수 있다.
총 이온 수는 반응 후 남은 H⁺ 또는 OH⁻와 각 용액의 구경꾼 이온 수를 합하여 구한다.`;
}

function renderKillerPoints() {
  const results = currentResults;
  const points = [];

  const neutralResults =
    results.filter(result => result.state === "중성");

  if (neutralResults.length === 1) {
    points.push(
      `★ (${neutralResults[0].label})만 중성입니다. 중화점 추론 선지로 활용할 수 있습니다.`
    );
  }

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      if (
        Math.abs(
          results[i].totalIon - results[j].totalIon
        ) < 1e-10
      ) {
        points.push(
          `★ (${results[i].label})와 (${results[j].label})의 총 이온 수가 같습니다.`
        );
      }

      if (
        Math.abs(
          results[i].H2O - results[j].H2O
        ) < 1e-10
      ) {
        points.push(
          `★ (${results[i].label})와 (${results[j].label})의 생성된 물의 양이 같습니다.`
        );
      }

      if (results[i].state !== results[j].state) {
        points.push(
          `★ (${results[i].label})와 (${results[j].label})의 액성이 다릅니다.`
        );
      }
    }
  }

  const maxWater = [...results]
    .sort((a, b) => b.H2O - a.H2O)[0];

  points.push(
    `★ 같은 조건이라면 생성된 물이 가장 많은 (${maxWater.label})의 온도 상승이 가장 큽니다.`
  );

  points.push(
    "★ 2가산과 2가 염기를 사용하면 용액의 부피비와 H⁺·OH⁻ 수의 비가 일치하지 않는 문항을 만들 수 있습니다."
  );

  points.push(
    "★ 이온비 원그래프를 제시하고 액성, 총 이온 수 또는 혼합 전 용액의 종류를 추론하게 할 수 있습니다."
  );

  $("killerBox").textContent =
`[추천 출제 포인트]

${points.join("\n")}`;
}

function copyText(id) {
  const target = $(id);

  if (!target) {
    alert("복사할 내용을 찾지 못했습니다.");
    return;
  }

  const text = target.textContent;

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("복사했습니다.");
      })
      .catch(() => {
        fallbackCopyText(text);
      });

    return;
  }

  fallbackCopyText(text);
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    alert("복사했습니다.");
  } catch (error) {
    alert("복사하지 못했습니다.");
  }

  textarea.remove();
}

function downloadAllSVG() {
  currentResults.forEach(result => {
    const svg = document.getElementById(
      `pie-${result.key}`
    );

    if (!svg) return;

    const clonedSvg = svg.cloneNode(true);

    if (!clonedSvg.getAttribute("xmlns")) {
      clonedSvg.setAttribute(
        "xmlns",
        "http://www.w3.org/2000/svg"
      );
    }

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clonedSvg);

    const blob = new Blob(
      [source],
      { type: "image/svg+xml;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `neutralization_${result.label}.svg`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  });
}

function makeRandomSet() {
  const typeValues = [
    "acid1",
    "acid2",
    "base1",
    "base2"
  ];

  $("aType").value = randomPick(typeValues);
  $("bType").value = randomPick(typeValues);
  $("cType").value = randomPick(typeValues);

  /*
    산과 염기가 하나도 없는 조합을 방지합니다.
  */
  const selectedConfigs = [
    getSolutionConfig("A", $("aType").value),
    getSolutionConfig("B", $("bType").value),
    getSolutionConfig("C", $("cType").value)
  ];

  const hasAcid = selectedConfigs.some(
    config => config.role === "acid"
  );

  const hasBase = selectedConfigs.some(
    config => config.role === "base"
  );

  if (!hasAcid) {
    $("aType").value = randomPick(["acid1", "acid2"]);
  }

  if (!hasBase) {
    $("cType").value = randomPick(["base1", "base2"]);
  }

  $("aN").value = randomPick([1, 2, 3, 4, 5]);
  $("bN").value = randomPick([1, 2, 3, 4]);
  $("cN").value = randomPick([1, 2, 3, 4]);
  $("unitV").value = 10;

  keys.forEach(key => {
    $(key + "A").value =
      randomPick([5, 10, 15, 20, 25, 30]);

    $(key + "B").value =
      randomPick([5, 10, 15, 20, 25, 30]);

    $(key + "C").value =
      randomPick([5, 10, 15, 20, 25, 30]);
  });

  runAll();
}

function randomPick(array) {
  return array[
    Math.floor(Math.random() * array.length)
  ];
}

function resetDefault() {
  $("aType").value = "acid1";
  $("bType").value = "base1";
  $("cType").value = "base1";

  $("aN").value = 3;
  $("bN").value = 2;
  $("cN").value = 1;
  $("unitV").value = 10;

  $("gaA").value = 10;
  $("gaB").value = 15;
  $("gaC").value = 30;

  $("naA").value = 20;
  $("naB").value = 20;
  $("naC").value = 15;

  $("daA").value = 25;
  $("daB").value = 15;
  $("daC").value = 15;

  runAll();
}

function addAutoRunEvents() {
  const ids = [
    "aType",
    "bType",
    "cType",

    "aN",
    "bN",
    "cN",
    "unitV",

    "gaA",
    "gaB",
    "gaC",

    "naA",
    "naB",
    "naC",

    "daA",
    "daB",
    "daC"
  ];

  ids.forEach(id => {
    const element = $(id);

    if (!element) return;

    element.addEventListener("change", runAll);
  });
}

addAutoRunEvents();
runAll();