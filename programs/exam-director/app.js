(() => {
  "use strict";

  const CFG = window.APP_CONFIG || {};
  const TYPES = {
    "통합과학": [
      "과학의 기본량","측정 표준과 정보","우주의 시작과 원소의 생성","지구와 생명체를 구성하는 원소의 생성",
      "원소의 규칙성","화학 결합과 물질의 성질","지각과 생명체 구성 물질의 규칙성","물질의 전기적 성질",
      "지구 시스템의 구성과 상호 작용","지권의 변화와 영향","중력의 작용","운동과 충돌","생명 시스템과 세포",
      "생명 시스템에서 일어나는 화학 반응","생명 시스템에서 정보의 흐름","지질 시대의 환경과 생물 변화",
      "진화와 생물 다양성","산화와 환원","산, 염기와 중화 반응","물질 변화에서 에너지의 출입",
      "생태계 구성과 환경","생태계 평형","지구 환경 변화와 인간 생활","태양에너지의 생성과 전환",
      "전기 에너지의 생산","에너지 효율과 신재생 에너지","과학 기술의 활용","과학 기술의 발전과 쟁점"
    ],
    "생명과학": [
      "생명과학의 이해","물질대사","생태계와 상호작용","신경신호의 전달과 신경계","호르몬과 항상성",
      "방어작용","유전정보와 생식세포","생물의 진화","생물의 다양성","흥분의 전도 속도와 막전위",
      "골격근 수축 과정의 계산","ABO식 혈액형 판정과 계산","핵형 분석 문제","감수 분열 세포의 매칭",
      "세포 매칭의 변형","여러 가지 유전과 확률","복대립 유전","다인자 유전","다인자 유전의 변형",
      "가계도 분석의 기본","연관 가계도의 분석","가계도의 변형","특수 가계도","세포의 매칭과 돌연변이",
      "가계도와 돌연변이"
    ]
  };
  const DIFF_VALUE = { "하":1,"중하":2,"중":3,"중상":4,"상":5,"최상":6 };

  const state = {
    subject: CFG.DEFAULT_SUBJECT || "통합과학",
    seasons: ["시즌 1","시즌 2","시즌 3","시즌 4"],
    rounds: ["1회","2회","3회","4회","5회","6회","7회","8회"],
    records: [],
    imageDataUrl: "",
    imageFileName: "",
    rotation: 0,
    editingId: null,
    compareIds: []
  };

  const $ = (id) => document.getElementById(id);
  const els = {};
  const ids = ["globalSubject","connectionBadge","settingsBtn","recordForm","season","round","questionNo","questionType",
    "difficulty","score","answer","source","explanation","memo","dropZone","questionImage","emptyDropMessage","imageFileInput",
    "chooseImageBtn","rotateLeftBtn","rotateRightBtn","resetImageBtn","imageName","draftStatus","newRecordBtn","deleteRecordBtn",
    "filterSubject","filterSeason","filterRound","filterType","filterDifficulty","archiveSearch","archiveGrid","archiveSummary",
    "compareGrid","clearCompareBtn","refreshArchiveBtn","analysisSubject","analysisSeason","analysisRound","statCards",
    "difficultyHeatmap","difficultyBars","typeBars","analysisTableBody","settingsDialog","settingsSeasons","settingsRounds",
    "saveSettingsBtn","saveRecordBtn","toast"];
  ids.forEach(id => els[id] = $(id));

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }

  function apiReady() { return Boolean(CFG.API_URL && /^https:\/\//.test(CFG.API_URL)); }

  async function api(action, payload = {}) {
    if (!apiReady()) throw new Error("config.js에 Apps Script 웹 앱 주소를 입력하세요.");
    const response = await fetch(CFG.API_URL, {
      method: "POST",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({ action, payload })
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.message || "서버 요청에 실패했습니다.");
    return result.data;
  }

  function saveDraft() {
    const draft = collectForm(false);
    draft.imageDataUrl = state.imageDataUrl;
    draft.imageFileName = state.imageFileName;
    localStorage.setItem("mockExamDraft", JSON.stringify(draft));
    els.draftStatus.textContent = "로컬 임시저장 완료";
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem("mockExamDraft") || "null");
      if (!draft) return;
      fillForm(draft);
      if (draft.imageDataUrl) setImage(draft.imageDataUrl, draft.imageFileName || "붙여넣은 이미지.png");
      els.draftStatus.textContent = "임시저장 복원됨";
    } catch (_) {}
  }

  function setOptions(select, items, placeholder) {
    const current = select.value;
    select.innerHTML = placeholder ? `<option value="">${placeholder}</option>` : "";
    items.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = v;
      select.appendChild(opt);
    });
    if ([...select.options].some(o => o.value === current)) select.value = current;
  }

  function refreshSelectors() {
    setOptions(els.season, state.seasons);
    setOptions(els.round, state.rounds);
    setOptions(els.filterSeason, state.seasons, "전체 시즌");
    setOptions(els.filterRound, state.rounds, "전체 회차");
    setOptions(els.analysisSeason, state.seasons, "전체 시즌");
    setOptions(els.analysisRound, state.rounds, "전체 회차");
    setOptions(els.questionType, TYPES[state.subject] || []);
    setOptions(els.filterType, [...new Set([...TYPES["통합과학"], ...TYPES["생명과학"]])], "전체 유형");
    updateQuestionNumbers();
  }

  function updateQuestionNumbers() {
    const count = state.subject === "생명과학" ? 20 : 25;
    setOptions(els.questionNo, Array.from({length:count}, (_,i)=>String(i+1)));
  }

  function setSubject(subject) {
    state.subject = subject;
    els.globalSubject.value = subject;
    els.analysisSubject.value = subject;
    setOptions(els.questionType, TYPES[subject] || []);
    updateQuestionNumbers();
    saveDraft();
  }

  function collectForm(requireImage = true) {
    if (requireImage && !state.imageDataUrl && !state.editingId) throw new Error("문항 이미지를 붙여넣으세요.");
    return {
      id: state.editingId || "",
      subject: state.subject,
      season: els.season.value,
      round: els.round.value,
      number: Number(els.questionNo.value),
      type: els.questionType.value,
      difficulty: els.difficulty.value,
      score: Number(els.score.value),
      source: els.source.value.trim(),
      answer: els.answer.value.trim(),
      explanationHtml: els.explanation.innerHTML,
      memo: els.memo.value.trim(),
      imageDataUrl: state.imageDataUrl,
      imageFileName: state.imageFileName
    };
  }

  function fillForm(r) {
    if (r.subject) setSubject(r.subject);
    els.season.value = r.season || state.seasons[0];
    els.round.value = r.round || state.rounds[0];
    els.questionNo.value = String(r.number || 1);
    els.questionType.value = r.type || (TYPES[state.subject] || [])[0];
    els.difficulty.value = r.difficulty || "중";
    els.score.value = String(r.score || 2);
    els.source.value = r.source || "";
    els.answer.value = r.answer || "";
    els.explanation.innerHTML = r.explanationHtml || "";
    els.memo.value = r.memo || "";
  }

  function setImage(dataUrl, fileName = "붙여넣은 이미지.png") {
    state.imageDataUrl = dataUrl;
    state.imageFileName = fileName;
    state.rotation = 0;
    els.questionImage.src = dataUrl;
    els.questionImage.hidden = false;
    els.emptyDropMessage.hidden = true;
    els.imageName.textContent = fileName;
    updateRotation();
    saveDraft();
  }

  function updateRotation() {
    els.questionImage.style.transform = `rotate(${state.rotation}deg)`;
  }

  function resetRecord() {
    state.editingId = null;
    state.imageDataUrl = "";
    state.imageFileName = "";
    state.rotation = 0;
    els.recordForm.reset();
    els.explanation.innerHTML = "";
    els.questionImage.hidden = true;
    els.questionImage.src = "";
    els.emptyDropMessage.hidden = false;
    els.imageName.textContent = "선택된 이미지 없음";
    els.deleteRecordBtn.hidden = true;
    setSubject(state.subject);
    els.season.value = state.seasons[0] || "";
    els.round.value = state.rounds[0] || "";
    localStorage.removeItem("mockExamDraft");
  }

  async function handleFiles(files) {
    const file = files && files[0];
    if (!file || !file.type.startsWith("image/")) return showToast("이미지 파일만 사용할 수 있습니다.");
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result, file.name);
    reader.readAsDataURL(file);
  }

  async function loadAll() {
    if (!apiReady()) {
      els.connectionBadge.textContent = "설정 필요";
      els.connectionBadge.className = "badge error";
      state.records = JSON.parse(localStorage.getItem("mockExamRecords") || "[]");
      renderAll();
      return;
    }
    try {
      const [settings, records] = await Promise.all([api("getSettings"), api("listRecords")]);
      state.seasons = settings.seasons?.length ? settings.seasons : state.seasons;
      state.rounds = settings.rounds?.length ? settings.rounds : state.rounds;
      state.records = records || [];
      els.connectionBadge.textContent = "연결됨";
      els.connectionBadge.className = "badge ok";
      refreshSelectors();
      renderAll();
    } catch (err) {
      els.connectionBadge.textContent = "연결 오류";
      els.connectionBadge.className = "badge error";
      showToast(err.message);
    }
  }

  async function saveRecord(event) {
    event.preventDefault();
    try {
      const record = collectForm(true);
      if (!record.season || !record.round || !record.type || !record.answer) throw new Error("필수 항목을 입력하세요.");
      els.saveRecordBtn.disabled = true;
      els.saveRecordBtn.textContent = "저장 중…";
      if (apiReady()) {
        const saved = await api("saveRecord", record);
        const idx = state.records.findIndex(r => r.id === saved.id);
        if (idx >= 0) state.records[idx] = saved; else state.records.unshift(saved);
      } else {
        const now = new Date().toISOString();
        const saved = {...record, id: record.id || crypto.randomUUID(), imageUrl: record.imageDataUrl, createdAt: now, updatedAt: now};
        const idx = state.records.findIndex(r => r.id === saved.id);
        if (idx >= 0) state.records[idx] = saved; else state.records.unshift(saved);
        localStorage.setItem("mockExamRecords", JSON.stringify(state.records));
      }
      showToast("문항을 저장했습니다.");
      resetRecord();
      renderAll();
    } catch (err) {
      showToast(err.message);
    } finally {
      els.saveRecordBtn.disabled = false;
      els.saveRecordBtn.textContent = "저장";
    }
  }

  async function deleteRecord() {
    if (!state.editingId || !confirm("이 문항을 삭제하시겠습니까?")) return;
    try {
      if (apiReady()) await api("deleteRecord", {id:state.editingId});
      state.records = state.records.filter(r => r.id !== state.editingId);
      localStorage.setItem("mockExamRecords", JSON.stringify(state.records));
      resetRecord(); renderAll(); showToast("삭제했습니다.");
    } catch (err) { showToast(err.message); }
  }

  function filteredRecords() {
    const q = els.archiveSearch.value.trim().toLowerCase();
    return state.records.filter(r =>
      (!els.filterSubject.value || r.subject === els.filterSubject.value) &&
      (!els.filterSeason.value || r.season === els.filterSeason.value) &&
      (!els.filterRound.value || r.round === els.filterRound.value) &&
      (!els.filterType.value || r.type === els.filterType.value) &&
      (!els.filterDifficulty.value || r.difficulty === els.filterDifficulty.value) &&
      (!q || [r.source,r.memo,r.answer,r.type].join(" ").toLowerCase().includes(q))
    );
  }

  function escapeHtml(str="") {
    return String(str).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }

  function getRecordImageUrl(record, size = 1200) {
    if (record.imageDataUrl) return record.imageDataUrl;
    if (record.imageFileId) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(record.imageFileId)}&sz=w${size}`;
    }
    return record.imageUrl || "";
  }

  function handleBrokenImage(img) {
    if (img.dataset.fallbackTried === "1") {
      img.closest(".question-thumb, .compare-card")?.classList.add("image-error");
      img.removeAttribute("src");
      img.alt = "이미지를 불러오지 못했습니다.";
      return;
    }
    img.dataset.fallbackTried = "1";
    const fileId = img.dataset.fileId;
    if (fileId) {
      img.src = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
    }
  }

  function renderArchive() {
    const list = filteredRecords();
    els.archiveSummary.textContent = `${list.length}개 문항`;
    if (!list.length) {
      els.archiveGrid.innerHTML = `<div class="empty-state">조건에 맞는 문항이 없습니다.</div>`;
      renderCompare(); return;
    }
    els.archiveGrid.innerHTML = list.map(r => `
      <article class="question-card">
        <div class="question-thumb"><img src="${escapeHtml(getRecordImageUrl(r, 900))}" data-file-id="${escapeHtml(r.imageFileId || "")}" onerror="handleBrokenImage(this)" alt="문항 이미지"></div>
        <div class="question-info">
          <div class="question-meta">
            <span class="pill">${escapeHtml(r.subject)}</span><span class="pill">${escapeHtml(r.season)}</span>
            <span class="pill">${escapeHtml(r.round)}</span><span class="pill">${escapeHtml(r.difficulty)}</span>
          </div>
          <div class="question-title">${escapeHtml(r.number)}번 · ${escapeHtml(r.type)}</div>
          <div class="question-sub">${escapeHtml(r.source || "출처 없음")} · 정답 ${escapeHtml(r.answer)}</div>
          <div class="card-actions">
            <button data-edit="${r.id}">열기</button>
            <button data-compare="${r.id}">비교</button>
          </div>
        </div>
      </article>`).join("");
  }

  function editRecord(id) {
    const r = state.records.find(x => x.id === id);
    if (!r) return;
    state.editingId = id;
    fillForm(r);
    if (r.imageUrl || r.imageDataUrl) setImage(r.imageUrl || r.imageDataUrl, r.imageFileName || "저장된 이미지");
    state.imageDataUrl = ""; // 기존 이미지 유지, 새 이미지 업로드 때만 채움
    els.deleteRecordBtn.hidden = false;
    document.querySelector('[data-tab="recordTab"]').click();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function toggleCompare(id) {
    if (state.compareIds.includes(id)) state.compareIds = state.compareIds.filter(x=>x!==id);
    else {
      if (state.compareIds.length >= 3) return showToast("비교는 최대 3개까지 가능합니다.");
      state.compareIds.push(id);
    }
    renderCompare();
  }

  function renderCompare() {
    const records = state.compareIds.map(id=>state.records.find(r=>r.id===id)).filter(Boolean);
    if (!records.length) {
      els.compareGrid.className = "compare-grid empty";
      els.compareGrid.innerHTML = "<p>문항 카드의 ‘비교’ 버튼을 누르세요.</p>";
      return;
    }
    els.compareGrid.className = "compare-grid";
    els.compareGrid.innerHTML = records.map(r => `
      <article class="compare-card">
        <img src="${escapeHtml(getRecordImageUrl(r, 1400))}" data-file-id="${escapeHtml(r.imageFileId || "")}" onerror="handleBrokenImage(this)" alt="문항 이미지">
        <div class="compare-body">
          <dl>
            <dt>문항</dt><dd>${escapeHtml(r.season)} ${escapeHtml(r.round)} ${escapeHtml(r.number)}번</dd>
            <dt>유형</dt><dd>${escapeHtml(r.type)}</dd>
            <dt>난이도</dt><dd>${escapeHtml(r.difficulty)}</dd>
            <dt>배점</dt><dd>${escapeHtml(r.score)}점</dd>
            <dt>정답</dt><dd>${escapeHtml(r.answer)}</dd>
            <dt>출처</dt><dd>${escapeHtml(r.source || "-")}</dd>
          </dl>
          <div class="card-actions"><button data-remove-compare="${r.id}">비교 제외</button></div>
        </div>
      </article>`).join("");
  }

  function analysisFiltered() {
    return state.records.filter(r =>
      r.subject === els.analysisSubject.value &&
      (!els.analysisSeason.value || r.season === els.analysisSeason.value) &&
      (!els.analysisRound.value || r.round === els.analysisRound.value)
    );
  }

  function renderAnalysis() {
    const list = analysisFiltered();
    const avg = list.length ? (list.reduce((s,r)=>s+(DIFF_VALUE[r.difficulty]||0),0)/list.length).toFixed(1) : "0.0";
    const stats = [
      ["문항 수", list.length],
      ["평균 난이도", avg],
      ["최상 문항", list.filter(r=>r.difficulty==="최상").length],
      ["3점 문항", list.filter(r=>Number(r.score)===3).length],
      ["사용 유형", new Set(list.map(r=>r.type)).size]
    ];
    els.statCards.innerHTML = stats.map(([k,v])=>`<div class="stat-card"><span>${k}</span><strong>${v}</strong></div>`).join("");

    const groups = {};
    list.forEach(r => {
      const key = `${r.season} · ${r.round}`;
      (groups[key] ||= []).push(r);
    });
    els.difficultyHeatmap.innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([key,items]) => {
      const max = items[0]?.subject === "생명과학" ? 20 : 25;
      const byNo = Object.fromEntries(items.map(r=>[Number(r.number),r]));
      return `<div class="heat-row"><div class="heat-label">${escapeHtml(key)}</div>${
        Array.from({length:max},(_,i)=> {
          const r = byNo[i+1];
          return `<div class="heat-cell ${r ? `d-${r.difficulty}`:"heat-empty"}" title="${r ? `${r.type} / ${r.difficulty}`:"미등록"}">${i+1}</div>`;
        }).join("")
      }</div>`;
    }).join("") : `<div class="empty-state">분석할 문항이 없습니다.</div>`;

    renderBars(els.difficultyBars, countBy(list,"difficulty"), ["하","중하","중","중상","상","최상"]);
    renderBars(els.typeBars, countBy(list,"type"), null, 10);

    els.analysisTableBody.innerHTML = Object.entries(groups).map(([key,items]) => {
      const [season, round] = key.split(" · ");
      const average = (items.reduce((s,r)=>s+(DIFF_VALUE[r.difficulty]||0),0)/items.length).toFixed(1);
      return `<tr><td>${escapeHtml(season)}</td><td>${escapeHtml(round)}</td><td>${items.length}</td><td>${average}</td><td>${items.filter(r=>r.difficulty==="최상").length}</td><td>${items.filter(r=>Number(r.score)===3).length}</td></tr>`;
    }).join("") || `<tr><td colspan="6">데이터가 없습니다.</td></tr>`;
  }

  function countBy(list,key) {
    return list.reduce((o,r)=>{ const k=r[key]||"미분류"; o[k]=(o[k]||0)+1; return o; },{});
  }

  function renderBars(target, counts, preferredOrder, limit) {
    let entries = Object.entries(counts);
    if (preferredOrder) entries = preferredOrder.map(k=>[k,counts[k]||0]);
    else entries.sort((a,b)=>b[1]-a[1]);
    if (limit) entries = entries.slice(0,limit);
    const max = Math.max(1,...entries.map(e=>e[1]));
    target.innerHTML = entries.length ? entries.map(([label,value])=>`
      <div class="bar-row"><span>${escapeHtml(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${value/max*100}%"></div></div><strong>${value}</strong></div>`).join("")
      : `<div class="empty-state">데이터가 없습니다.</div>`;
  }

  function renderAll() { renderArchive(); renderCompare(); renderAnalysis(); }

  async function saveSettings() {
    const seasons = els.settingsSeasons.value.split(/\n/).map(v=>v.trim()).filter(Boolean);
    const rounds = els.settingsRounds.value.split(/\n/).map(v=>v.trim()).filter(Boolean);
    if (!seasons.length || !rounds.length) return showToast("시즌과 회차를 한 개 이상 입력하세요.");
    try {
      if (apiReady()) await api("saveSettings",{seasons,rounds});
      state.seasons = seasons; state.rounds = rounds;
      refreshSelectors(); renderAll(); showToast("설정을 저장했습니다.");
    } catch(err) { showToast(err.message); }
  }

  function bindEvents() {
    document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b===btn));
      document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("active",p.id===btn.dataset.tab));
      if (btn.dataset.tab === "archiveTab") renderArchive();
      if (btn.dataset.tab === "analysisTab") renderAnalysis();
    }));
    els.globalSubject.addEventListener("change", e=>setSubject(e.target.value));
    els.recordForm.addEventListener("submit", saveRecord);
    els.newRecordBtn.addEventListener("click", resetRecord);
    els.deleteRecordBtn.addEventListener("click", deleteRecord);
    els.chooseImageBtn.addEventListener("click", ()=>els.imageFileInput.click());
    els.imageFileInput.addEventListener("change", e=>handleFiles(e.target.files));
    els.rotateLeftBtn.addEventListener("click", ()=>{state.rotation-=90;updateRotation();});
    els.rotateRightBtn.addEventListener("click", ()=>{state.rotation+=90;updateRotation();});
    els.resetImageBtn.addEventListener("click", ()=>{state.rotation=0;updateRotation();});
    els.dropZone.addEventListener("click", ()=>els.imageFileInput.click());
    ["dragenter","dragover"].forEach(ev=>els.dropZone.addEventListener(ev,e=>{e.preventDefault();els.dropZone.classList.add("dragging");}));
    ["dragleave","drop"].forEach(ev=>els.dropZone.addEventListener(ev,e=>{e.preventDefault();els.dropZone.classList.remove("dragging");}));
    els.dropZone.addEventListener("drop", e=>handleFiles(e.dataTransfer.files));
    document.addEventListener("paste", e=>{
      const items=[...(e.clipboardData?.items||[])];
      const imageItem=items.find(i=>i.type.startsWith("image/"));
      if (imageItem) { e.preventDefault(); handleFiles([imageItem.getAsFile()]); }
    });
    document.querySelectorAll(".rich-toolbar button").forEach(btn=>btn.addEventListener("click",()=>{
      document.execCommand(btn.dataset.command,false,null); els.explanation.focus();
    }));
    document.querySelectorAll("#recordForm input,#recordForm select,#recordForm textarea").forEach(el=>el.addEventListener("input",saveDraft));
    els.explanation.addEventListener("input",saveDraft);
    ["filterSubject","filterSeason","filterRound","filterType","filterDifficulty","archiveSearch"].forEach(id=>els[id].addEventListener("input",renderArchive));
    els.archiveGrid.addEventListener("click", e=>{
      const edit=e.target.dataset.edit, compare=e.target.dataset.compare;
      if(edit) editRecord(edit); if(compare) toggleCompare(compare);
    });
    els.compareGrid.addEventListener("click", e=>{ if(e.target.dataset.removeCompare) toggleCompare(e.target.dataset.removeCompare); });
    els.clearCompareBtn.addEventListener("click", ()=>{state.compareIds=[];renderCompare();});
    els.refreshArchiveBtn.addEventListener("click", loadAll);
    ["analysisSubject","analysisSeason","analysisRound"].forEach(id=>els[id].addEventListener("change",renderAnalysis));
    els.settingsBtn.addEventListener("click", ()=>{
      els.settingsSeasons.value=state.seasons.join("\n"); els.settingsRounds.value=state.rounds.join("\n");
      els.settingsDialog.showModal();
    });
    els.saveSettingsBtn.addEventListener("click", e=>{e.preventDefault();saveSettings();els.settingsDialog.close();});
  }

  window.handleBrokenImage = handleBrokenImage;

  function init() {
    bindEvents();
    refreshSelectors();
    setSubject(state.subject);
    restoreDraft();
    loadAll();
  }
  document.addEventListener("DOMContentLoaded", init);
})();