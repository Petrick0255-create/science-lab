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

const categoryButtons = document.querySelectorAll("[data-category]");
const menuPanels = document.querySelectorAll("[data-panel]");
const selectedTitle = document.querySelector("#selected-title");
const selectedDescription = document.querySelector("#selected-description");
const scienceMenu = document.querySelector("#science-menu");

function selectCategory(category, shouldScroll = false) {
  const info = categoryInfo[category];
  if (!info) return;

  categoryButtons.forEach((button) => {
    const isSelected = button.dataset.category === category;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-expanded", String(isSelected));
  });

  menuPanels.forEach((panel) => {
    const isSelected = panel.dataset.panel === category;
    panel.hidden = !isSelected;
    panel.classList.toggle("active", isSelected);
  });

  selectedTitle.textContent = info.title;
  selectedDescription.textContent = info.description;

  if (shouldScroll && window.matchMedia("(max-width: 780px)").matches) {
    scienceMenu.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => selectCategory(button.dataset.category, true));
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
  if (event.key === "Escape") {
    programItem.classList.remove("open");
    programButton.setAttribute("aria-expanded", "false");
    programButton.focus();
  }
});
