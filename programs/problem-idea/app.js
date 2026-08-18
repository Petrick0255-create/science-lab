"use strict";

const CONFIG={indexUrl:"data/search-index.json",typeCatalogUrl:"reference/type-catalog.json",pageSize:30,localModeKey:"examSearchPreferLocal"};
const state={data:[],catalog:{},results:[],visible:CONFIG.pageSize,ready:false,preferLocal:false};
const el={};

document.addEventListener("DOMContentLoaded",init);

async function init(){
  ["searchForm","searchInput","searchBtn","subjectFilter","typeFilter","gradeFilter","sortSelect","columnSelect","localFileMode","resultCount","dataStatus","copyAllBtn","resetBtn","sourcePanel","sourceList","problemGrid","loadMoreBtn","imageModal","modalTitle","modalImage","modalImageError","modalOriginalBtn","modalProblemBtn","modalSolutionBtn","modalCloseBtn"].forEach(id=>el[id]=document.getElementById(id));
  el.searchForm.addEventListener("submit",event=>{event.preventDefault();search(true)});
  el.subjectFilter.addEventListener("change",()=>{buildTypeOptions();search(true)});
  el.typeFilter.addEventListener("change",()=>search(true));
  el.gradeFilter.addEventListener("change",()=>search(true));
  el.sortSelect.addEventListener("change",()=>search(true));
  el.columnSelect.addEventListener("change",changeColumns);
  state.preferLocal=localStorage.getItem(CONFIG.localModeKey)==="1";el.localFileMode.checked=state.preferLocal;
  el.localFileMode.addEventListener("change",()=>{state.preferLocal=el.localFileMode.checked;localStorage.setItem(CONFIG.localModeKey,state.preferLocal?"1":"0");render()});
  el.resetBtn.addEventListener("click",resetSearch);
  el.copyAllBtn.addEventListener("click",copyVisibleSources);
  el.loadMoreBtn.addEventListener("click",()=>{state.visible+=CONFIG.pageSize;render()});
  el.modalCloseBtn.addEventListener("click",closeModal);
  el.imageModal.addEventListener("click",event=>{if(event.target===el.imageModal)closeModal()});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal()});
  restoreParams();
  try{
    const [indexResponse,catalogResponse]=await Promise.all([fetch(CONFIG.indexUrl,{cache:"no-cache"}),fetch(CONFIG.typeCatalogUrl,{cache:"no-cache"})]);
    if(!indexResponse.ok)throw new Error(`HTTP ${indexResponse.status}`);
    state.data=await indexResponse.json();
    if(catalogResponse.ok)state.catalog=await catalogResponse.json();
    state.ready=true;
    buildSubjectOptions();applyPendingParams();
    el.searchBtn.disabled=false;
    el.dataStatus.textContent=`${state.data.length.toLocaleString("ko-KR")}개 문항 준비됨`;
    if(hasCondition())search(false);
  }catch(error){console.error(error);el.dataStatus.textContent="데이터 로딩 실패";el.problemGrid.replaceChildren(makeEmpty("ZIP을 압축 해제한 뒤 웹 서버에서 실행해 주세요."))}
}

function normalize(value){return String(value||"").replace(/[Ⅰⅰ]/g,"1").normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/(물리학|화학|생명과학|지구과학)\s*(?:1|i)\b/g,"$1").replace(/\s+/g," ").trim()}
function hasCondition(){return Boolean(el.searchInput.value.trim()||el.subjectFilter.value||el.typeFilter.value||el.gradeFilter.value)}
function unique(values){return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ko"))}

function buildSubjectOptions(){
  const current=el.subjectFilter.value;
  el.subjectFilter.replaceChildren(option("","전체 과목"),...unique(state.data.map(item=>item.s)).map(value=>option(value,value)));
  if([...el.subjectFilter.options].some(item=>item.value===current))el.subjectFilter.value=current;
}
function buildTypeOptions(){
  const current=el.typeFilter.value,subject=el.subjectFilter.value;
  const dataTypes=state.data.filter(item=>!subject||item.s===subject).map(item=>item.t||"미분류");
  const types=unique([...(subject?state.catalog[subject]||[]:[]),...dataTypes]);
  el.typeFilter.replaceChildren(option("","전체 유형"),...types.map(value=>option(value,value)));
  if(types.includes(current))el.typeFilter.value=current;
}
function option(value,text){const node=document.createElement("option");node.value=value;node.textContent=text;return node}

function search(updateUrl){
  if(!state.ready)return;
  if(!hasCondition()){
    state.results=[];state.visible=CONFIG.pageSize;render();
    el.resultCount.textContent="총 0문항";
    if(updateUrl)updateParams();
    return;
  }
  const query=normalize(el.searchInput.value),tokens=query.split(" ").filter(Boolean);
  const subject=el.subjectFilter.value,type=el.typeFilter.value,grade=el.gradeFilter.value;
  const exact=normalize(el.searchInput.value).replace(/\s/g,"").toUpperCase();
  const directCode=/^[123][A-Z]\d{6}$/.test(exact);
  const dateMatch=!directCode&&query.match(/(?:^|\s)(\d{2})\s*(0[1-9]|1[0-2]|[1-9])(?:\s|$)/);
  const printedYear=dateMatch?Number(dateMatch[1]):null,printedMonth=dateMatch?Number(dateMatch[2]):null;
  state.results=[];
  for(const item of state.data){
    if(subject&&item.s!==subject||type&&(item.t||"미분류")!==type||grade&&item.g!==grade)continue;
    if(dateMatch&&(item.sy!==printedYear||item.m!==printedMonth))continue;
    if(!tokens.every(token=>item.x.includes(token)))continue;
    let score=0;
    if(item.i===exact)score+=10000;
    if(query&&normalize(item.i).includes(query))score+=1000;
    if(query&&normalize(item.t).includes(query))score+=250;
    if(query&&normalize(item.e).includes(query))score+=100;
    if(dateMatch)score+=500;
    for(const token of tokens){if(normalize(item.t).includes(token))score+=40;if(normalize(item.q).includes(token))score+=10}
    state.results.push({...item,_score:score});
  }
  sortResults();state.visible=CONFIG.pageSize;render();if(updateUrl)updateParams();
}

function sortResults(){
  const mode=el.sortSelect.value;
  state.results.sort((a,b)=>{
    if(mode==="relevance")return b._score-a._score||b.y-a.y||b.m-a.m||a.i.localeCompare(b.i);
    if(mode==="newest")return b.y-a.y||b.m-a.m||b.n-a.n;
    if(mode==="oldest")return a.y-b.y||a.m-b.m||a.n-b.n;
    return a.n-b.n||a.y-b.y||a.m-b.m;
  });
}

function render(){
  const visible=state.results.slice(0,state.visible);
  el.resultCount.textContent=state.results.length>visible.length?`총 ${state.results.length.toLocaleString("ko-KR")}문항 중 ${visible.length.toLocaleString("ko-KR")}문항 표시`:`총 ${state.results.length.toLocaleString("ko-KR")}문항`;
  el.copyAllBtn.disabled=!visible.length;
  el.loadMoreBtn.classList.toggle("hidden",visible.length>=state.results.length);
  el.sourcePanel.classList.toggle("hidden",!visible.length);
  el.sourceList.replaceChildren(...visible.map(makeSourceChip));
  el.problemGrid.replaceChildren(...(visible.length?visible.map(makeCard):[makeEmpty(hasCondition()?"조건에 맞는 관련 문제가 없습니다.":"키워드 또는 필터를 선택해 문항을 검색하세요.")]));
}

function makeSourceChip(item){
  const button=document.createElement("button");button.type="button";button.className="source-chip";button.textContent=`${sourceText(item)} 🔍`;
  button.addEventListener("click",()=>document.getElementById(`card-${item.i}`)?.scrollIntoView({behavior:"smooth",block:"center"}));return button;
}

function makeCard(item){
  const card=document.createElement("article");card.className="problem-card";card.id=`card-${item.i}`;
  const preview=document.createElement("button");preview.type="button";preview.className="problem-preview";preview.setAttribute("aria-label",`${sourceText(item)} 이미지 크게 보기`);
  const image=document.createElement("img");image.alt=`${sourceText(item)} 문제 이미지`;image.loading="lazy";
  const error=document.createElement("span");error.className="image-error-text";error.textContent="로컬 문제 이미지를 찾지 못했습니다. 파일명과 폴더 위치를 확인해 주세요.";
  loadImageWithFallback(image,preview,item);preview.addEventListener("click",()=>openImage(item));preview.append(image,error);

  const main=document.createElement("div");main.className="card-main";
  const titleRow=document.createElement("div");titleRow.className="problem-title-row";
  const title=document.createElement("div");title.className="problem-title";title.textContent=sourceText(item);
  const status=document.createElement("span");status.className=`status-badge ${item.st==="정상"||String(item.st).includes("완료")?"ok":"check"}`;status.textContent=item.st;
  titleRow.append(title,status);
  const meta=document.createElement("div");meta.className="problem-meta";meta.textContent=`${item.i} · ${item.g} · ${item.s} · ${item.n}번`;
  const type=document.createElement("div");type.className="type-chip";type.textContent=item.t||"미분류";
  const prompt=document.createElement("p");prompt.className="prompt-snippet";prompt.textContent=item.q||"발문이 추출되지 않았습니다.";
  main.append(titleRow,meta,type,prompt);

  const links=document.createElement("div");links.className="card-links";
  links.append(link("로컬 이미지",resourceUrl(item,"image"),"image"),link("문제 PDF",resourceUrl(item,"problem"),"problem"),link("해설 PDF",resourceUrl(item,"solution"),"solution"),copyButton(item));
  card.append(preview,main,links);return card;
}

function link(text,url,className){const a=document.createElement("a");a.textContent=text;a.className=className;a.target="_blank";a.rel="noopener noreferrer";if(url)a.href=url;else{a.classList.add("disabled");a.removeAttribute("href")}return a}
function copyButton(item){const button=document.createElement("button");button.type="button";button.className="copy-button";button.title="출처 복사";button.textContent="📋";button.addEventListener("click",async()=>{await copyText(sourceText(item));button.textContent="✓";setTimeout(()=>button.textContent="📋",900)});return button}
function makeEmpty(text){const div=document.createElement("div");div.className="empty";div.textContent=text;return div}
function displayExamName(item){
  const educationOfficeMonths=[4,5,7,10];
  if(item.g==="고3"&&educationOfficeMonths.includes(Number(item.m))){
    const year=Number.isFinite(Number(item.sy))?Number(item.sy):Number(item.y)-1;
    return `${String(year).padStart(2,"0")} ${String(item.m).padStart(2,"0")} ${item.g} ${item.s}`;
  }
  return item.e||`${String(item.y).padStart(2,"0")} ${String(item.m).padStart(2,"0")} ${item.g} ${item.s}`;
}
function sourceText(item){return `${displayExamName(item)} ${item.n}번`}
function previewUrl(url){const id=driveFileId(url);return id?`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`:url||""}
function driveFileId(url){const match=String(url||"").match(/\/file\/d\/([^/]+)/);return match?match[1]:""}
function resourceCandidates(item,kind){
  if(kind==="image")return[item.lim].filter(Boolean);
  const pairs={image:[item.im,item.lim],problem:[item.p,item.lp],solution:[item.sol,item.lsol]};
  const pair=pairs[kind]||[];return (state.preferLocal?[pair[1],pair[0]]:pair).filter(Boolean);
}
function resourceUrl(item,kind){return resourceCandidates(item,kind)[0]||""}
function loadImageWithFallback(image,container,item){
  const candidates=resourceCandidates(item,"image").map(previewUrl);let index=0;container.classList.remove("image-error");
  image.onerror=()=>{index+=1;if(index<candidates.length)image.src=candidates[index];else container.classList.add("image-error")};
  if(candidates.length)image.src=candidates[0];else container.classList.add("image-error");
}

function openImage(item){
  el.modalTitle.textContent=sourceText(item);el.modalImageError.classList.add("hidden");el.modalImage.classList.remove("hidden");
  const candidates=resourceCandidates(item,"image").map(previewUrl);let index=0;
  el.modalImage.onerror=()=>{index+=1;if(index<candidates.length)el.modalImage.src=candidates[index];else{el.modalImage.classList.add("hidden");el.modalImageError.classList.remove("hidden")}};
  if(candidates.length)el.modalImage.src=candidates[0];else{el.modalImage.classList.add("hidden");el.modalImageError.classList.remove("hidden")}
  setModalLink(el.modalOriginalBtn,resourceUrl(item,"image"));setModalLink(el.modalProblemBtn,resourceUrl(item,"problem"));setModalLink(el.modalSolutionBtn,resourceUrl(item,"solution"));
  el.imageModal.classList.add("show");el.imageModal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
}
function setModalLink(node,url){node.classList.toggle("hidden",!url);if(url)node.href=url;else node.removeAttribute("href")}
function closeModal(){el.imageModal.classList.remove("show");el.imageModal.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");el.modalImage.removeAttribute("src")}
function changeColumns(){el.problemGrid.classList.remove("cols-2","cols-3");el.problemGrid.classList.add(`cols-${el.columnSelect.value}`)}

async function copyText(text){try{await navigator.clipboard.writeText(text)}catch{const area=document.createElement("textarea");area.value=text;document.body.append(area);area.select();document.execCommand("copy");area.remove()}}
async function copyVisibleSources(){const text=state.results.slice(0,state.visible).map(sourceText).join("\n");if(!text)return;await copyText(text);const original=el.copyAllBtn.textContent;el.copyAllBtn.textContent="복사 완료";setTimeout(()=>el.copyAllBtn.textContent=original,1000)}

function resetSearch(){el.searchInput.value="";el.subjectFilter.value="";buildTypeOptions();el.typeFilter.value="";el.gradeFilter.value="";el.sortSelect.value="relevance";state.results=[];state.visible=CONFIG.pageSize;render();updateParams();el.searchInput.focus()}
function restoreParams(){const params=new URLSearchParams(location.search);el.searchInput.value=params.get("q")||"";el.subjectFilter.dataset.pending=params.get("subject")||"";el.typeFilter.dataset.pending=params.get("type")||"";el.gradeFilter.value=params.get("grade")||"";el.sortSelect.value=params.get("sort")||"relevance"}
function applyPendingParams(){const subject=el.subjectFilter.dataset.pending,type=el.typeFilter.dataset.pending;if(subject&&[...el.subjectFilter.options].some(x=>x.value===subject))el.subjectFilter.value=subject;buildTypeOptions();if(type&&[...el.typeFilter.options].some(x=>x.value===type))el.typeFilter.value=type}
function updateParams(){const params=new URLSearchParams();if(el.searchInput.value.trim())params.set("q",el.searchInput.value.trim());if(el.subjectFilter.value)params.set("subject",el.subjectFilter.value);if(el.typeFilter.value)params.set("type",el.typeFilter.value);if(el.gradeFilter.value)params.set("grade",el.gradeFilter.value);if(el.sortSelect.value!=="relevance")params.set("sort",el.sortSelect.value);const query=params.toString();history.replaceState(null,"",`${location.pathname}${query?`?${query}`:""}`)}
