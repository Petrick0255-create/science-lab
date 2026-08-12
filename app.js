const categoryInfo = {
  integrated: {
    title: "통합과학",
    description: "통합과학 문항을 검토하고, 피드백과 모의고사 제작 과정을 관리합니다."
  },
  physics: {
    title: "물리학",
    description: "운동, 힘, 에너지와 충돌 현상을 직접 조절하며 확인합니다."
  },
  chemistry: {
    title: "화학",
    description: "물질의 규칙성과 중화 반응의 변화를 시각적으로 탐구합니다."
  },
  biology: {
    title: "생명과학",
    description: "유전자 발현, 단백질 구조와 유전 자료를 탐구합니다."
  },
  earth: {
    title: "지구과학",
    description: "판의 경계와 지구 시스템의 변화를 시뮬레이션합니다."
  }
};

const sectorItems = [
  { category: "physics", label: "물리학", sub: "운동 · 에너지", start: -131, end: -49, mid: -90 },
  { category: "biology", label: "생명과학", sub: "세포 · 유전", start: -41, end: 41, mid: 0 },
  { category: "earth", label: "지구과학", sub: "지구 시스템", start: 49, end: 131, mid: 90 },
  { category: "chemistry", label: "화학", sub: "물질 · 반응", start: 139, end: 221, mid: 180 }
];

const svgNamespace = "http://www.w3.org/2000/svg";
const centerX = 280;
const centerY = 280;
const innerRadius = 112;
const outerRadius = 218;
const labelRadius = 166;
const sectorLayer = document.querySelector("#sector-layer");
const coreButton = document.querySelector(".core-button");
const menuPanels = document.querySelectorAll("[data-panel]");
const selectedTitle = document.querySelector("#selected-title");
const selectedDescription = document.querySelector("#selected-description");
const scienceMenu = document.querySelector("#science-menu");

function polarPoint(radius, degrees) {
  const radians = degrees * Math.PI / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians)
  };
}

function makeSectorPath(startAngle, endAngle) {
  const outerStart = polarPoint(outerRadius, startAngle);
  const outerEnd = polarPoint(outerRadius, endAngle);
  const innerEnd = polarPoint(innerRadius, endAngle);
  const innerStart = polarPoint(innerRadius, startAngle);

  return [
    "M", outerStart.x, outerStart.y,
    "A", outerRadius, outerRadius, 0, 0, 1, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerRadius, innerRadius, 0, 0, 0, innerStart.x, innerStart.y,
    "Z"
  ].join(" ");
}

function activateCategory(category, shouldScroll = false) {
  const info = categoryInfo[category];
  if (!info) return;

  document.querySelectorAll(".sector").forEach((sector) => {
    const isActive = sector.dataset.category === category;
    sector.classList.toggle("active", isActive);
    sector.setAttribute("aria-pressed", String(isActive));
  });

  const coreIsActive = category === "integrated";
  coreButton.classList.toggle("active", coreIsActive);
  coreButton.setAttribute("aria-pressed", String(coreIsActive));

  menuPanels.forEach((panel) => {
    const isActive = panel.dataset.panel === category;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });

  selectedTitle.textContent = info.title;
  selectedDescription.textContent = info.description;

  if (shouldScroll && window.matchMedia("(max-width: 760px)").matches) {
    scienceMenu.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

sectorItems.forEach((item) => {
  const group = document.createElementNS(svgNamespace, "g");
  const path = document.createElementNS(svgNamespace, "path");
  const title = document.createElementNS(svgNamespace, "text");
  const subtitle = document.createElementNS(svgNamespace, "text");
  const labelPoint = polarPoint(labelRadius, item.mid);
  const pushPoint = polarPoint(9, item.mid);

  group.setAttribute("class", `sector ${item.category}`);
  group.setAttribute("data-category", item.category);
  group.setAttribute("role", "button");
  group.setAttribute("tabindex", "0");
  group.setAttribute("aria-label", `${item.label} 메뉴 선택`);
  group.setAttribute("aria-pressed", "false");
  group.style.setProperty("--push-x", `${pushPoint.x - centerX}px`);
  group.style.setProperty("--push-y", `${pushPoint.y - centerY}px`);

  path.setAttribute("class", "sector-path");
  path.setAttribute("d", makeSectorPath(item.start, item.end));

  title.setAttribute("class", "sector-label");
  title.setAttribute("x", labelPoint.x);
  title.setAttribute("y", labelPoint.y - 4);
  title.setAttribute("text-anchor", "middle");
  title.textContent = item.label;

  subtitle.setAttribute("class", "sector-sub");
  subtitle.setAttribute("x", labelPoint.x);
  subtitle.setAttribute("y", labelPoint.y + 20);
  subtitle.setAttribute("text-anchor", "middle");
  subtitle.textContent = item.sub;

  group.append(path, title, subtitle);
  group.addEventListener("click", () => activateCategory(item.category, true));
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCategory(item.category, true);
    }
  });
  sectorLayer.appendChild(group);
});

coreButton.addEventListener("click", () => activateCategory("integrated", true));
coreButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activateCategory("integrated", true);
  }
});

const programItem = document.querySelector(".program-item");
const programButton = document.querySelector(".program-card");

programButton.addEventListener("click", () => {
  const isOpen = programItem.classList.toggle("open");
  programButton.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (event) => {
  if (!programItem.contains(event.target)) {
    programItem.classList.remove("open");
    programButton.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && programItem.classList.contains("open")) {
    programItem.classList.remove("open");
    programButton.setAttribute("aria-expanded", "false");
    programButton.focus();
  }
});

if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // 서비스 워커를 지원하지 않는 배포 환경에서도 홈페이지 기능은 그대로 유지합니다.
    });
  });
}
