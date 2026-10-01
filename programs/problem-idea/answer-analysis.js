"use strict";

const DB_NAME="jbMockExamAnalyzer";
const DB_VERSION=3;
const STORE="workspace";
const CIRCLED=["","①","②","③","④","⑤"];
const STATEMENTS=["ㄱ","ㄴ","ㄷ","ㄱ ㄴ","ㄱ ㄷ","ㄴ ㄷ","ㄱ ㄴ ㄷ"];
const QUICK_SLOT_COUNT=36;
const state={records:[],selectedExams:[],quickAnswers:Array(QUICK_SLOT_COUNT).fill(null),quickStatements:Array(QUICK_SLOT_COUNT).fill(""),quickTypes:Array(QUICK_SLOT_COUNT).fill("")};
const el={};
let db;
let pendingImage="";

document.addEventListener("DOMContentLoaded",init);

async function init(){
  ["totalStatus","recordForm","editingId","existingExam","newExamTitle","examHint","questionType","questionNumber","questionPoints","questionDifficulty","questionAnswer","questionImage","imageStatus","questionExplanation","cancelEdit","saveRecord","typeSuggestions","recordExamFilter","recordList","compareCount","examChecks","compareEmpty","compareScroll","compareTable","analysisExam","analysisEmpty","analysisContent","summaryCards","answerCounts","pointCounts","difficultyCounts","answerSequence","answerWarning","typeAnalysis","quickReset","quickPageGrid","quickChoiceCounts","quickStatementCounts","quickSequence","quickWarning","quickTypeBoard","quickTypeCounts","detailModal","modalTitle","modalMeta","modalImageWrap","modalImage","modalExplanation","modalClose","toast"].forEach(id=>el[id]=document.getElementById(id));
  db=await openDb();const saved=await readState();
  if(saved){state.records=Array.isArray(saved.records)?saved.records.map(normalizeRecord).filter(validRecord):[];state.selectedExams=Array.isArray(saved.selectedExams)?saved.selectedExams.slice(0,8):[];state.quickAnswers=normalizeAnswers(saved.quickAnswers);state.quickStatements=normalizeStatements(saved.quickStatements);state.quickTypes=normalizeTypes(saved.quickTypes)}
  bindEvents();await loadTypeCatalog();renderAll();
}

function bindEvents(){
  document.querySelectorAll(".tab").forEach(button=>button.addEventListener("click",()=>switchTab(button.dataset.tab)));
  el.existingExam.addEventListener("change",syncExamMode);
  el.recordForm.addEventListener("submit",saveRecord);
  el.cancelEdit.addEventListener("click",resetForm);
  el.questionImage.addEventListener("change",async()=>{const file=el.questionImage.files[0];pendingImage=file?await fileToDataUrl(file):"";el.imageStatus.textContent=file?file.name:"파일 선택 또는 이 입력 칸에서 Ctrl+V"});
  el.questionImage.addEventListener("paste",pasteImage);
  el.recordExamFilter.addEventListener("change",renderRecordList);
  el.analysisExam.addEventListener("change",renderAnalysis);
  el.quickReset.addEventListener("click",resetQuickAnalysis);
  el.modalClose.addEventListener("click",closeModal);
  el.detailModal.addEventListener("click",event=>{if(event.target===el.detailModal)closeModal()});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal()});
}

function switchTab(name){document.querySelectorAll(".tab").forEach(button=>button.classList.toggle("active",button.dataset.tab===name));document.querySelectorAll(".tab-page").forEach(page=>page.classList.toggle("active",page.id===`${name}Tab`));if(name==="compare")renderCompare();if(name==="analysis")renderAnalysis();if(name==="quick")renderQuick()}

function syncExamMode(){const existing=el.existingExam.value;if(existing){el.newExamTitle.value=existing;el.newExamTitle.disabled=true;el.newExamTitle.required=false;el.examHint.textContent="저장된 모의고사에 문항이 추가됩니다."}else{el.newExamTitle.disabled=false;el.newExamTitle.required=true;el.newExamTitle.value="";el.examHint.textContent="처음 입력하는 모의고사 제목을 적어 주세요."}}

async function saveRecord(event){
  event.preventDefault();const examTitle=clean(el.existingExam.value||el.newExamTitle.value);if(!examTitle)return;
  const id=el.editingId.value||makeId(),old=state.records.find(item=>item.id===id);
  const record={id,examTitle,type:clean(el.questionType.value),number:Number(el.questionNumber.value),points:Number(el.questionPoints.value),difficulty:el.questionDifficulty.value,answer:Number(el.questionAnswer.value),explanation:el.questionExplanation.value.trim(),image:pendingImage||old?.image||"",createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
  if(!validRecord(record))return;
  const duplicate=state.records.find(item=>item.id!==id&&item.examTitle===record.examTitle&&item.number===record.number);if(duplicate&&!confirm(`${record.examTitle} ${record.number}번이 이미 있습니다. 그래도 저장할까요?`))return;
  const index=state.records.findIndex(item=>item.id===id);if(index>=0)state.records[index]=record;else state.records.push(record);
  await persist();renderAll();resetForm(record.examTitle);toast(index>=0?"문항을 수정했습니다.":"문항을 저장했습니다.")
}

function validRecord(record){return Boolean(record.examTitle&&record.type&&record.number>=1&&record.points&&["하","중","상","최상"].includes(record.difficulty)&&record.answer>=1&&record.answer<=5&&record.explanation)}
function normalizeRecord(item){return{id:item.id||makeId(),examTitle:clean(item.examTitle),type:clean(item.type||item.topic||item.middle||item.major),number:Number(item.number),points:Number(item.points)||2,difficulty:["하","중","상","최상"].includes(item.difficulty)?item.difficulty:"중",answer:Number(item.answer),explanation:String(item.explanation||""),image:item.image||"",createdAt:Number(item.createdAt)||Date.now(),updatedAt:Number(item.updatedAt)||Number(item.createdAt)||Date.now()}}

function renderAll(){const exams=getExams();state.selectedExams=state.selectedExams.filter(title=>exams.includes(title)).slice(0,8);renderTitleOptions(exams);renderRecordList();renderExamChecks(exams);renderCompare();renderAnalysis();renderQuick();el.totalStatus.textContent=`${exams.length}개 모의고사 · ${state.records.length}문항`;refreshTypeSuggestions()}

function renderTitleOptions(exams){
  const formValue=el.existingExam.value,filterValue=el.recordExamFilter.value,analysisValue=el.analysisExam.value;
  el.existingExam.replaceChildren(option("","새 제목 입력"),...exams.map(title=>option(title,title)));if(exams.includes(formValue))el.existingExam.value=formValue;
  el.recordExamFilter.replaceChildren(option("","전체 모의고사"),...exams.map(title=>option(title,title)));if(exams.includes(filterValue))el.recordExamFilter.value=filterValue;
  el.analysisExam.replaceChildren(option("","모의고사 선택"),...exams.map(title=>option(title,title)));if(exams.includes(analysisValue))el.analysisExam.value=analysisValue;
}

function renderRecordList(){
  const filter=el.recordExamFilter.value,records=[...state.records].filter(item=>!filter||item.examTitle===filter).sort(sortRecords);
  if(!records.length){el.recordList.replaceChildren(node("div","no-records",filter?"이 모의고사에 저장된 문항이 없습니다.":"저장된 문항이 없습니다."));return}
  el.recordList.replaceChildren(...records.map(record=>{
    const row=node("article","record-row");row.append(node("div","exam",record.examTitle),node("div","type",record.type),node("span","pill",`${record.number}번`),node("span","pill points",`${format(record.points)}점`),node("span",`difficulty ${difficultyClass(record.difficulty)}`,record.difficulty),node("span","pill answer",CIRCLED[record.answer]));
    if(record.image){const img=document.createElement("img");img.className="thumb";img.src=record.image;img.alt=`${record.examTitle} ${record.number}번`;img.addEventListener("click",()=>openModal(record));row.append(img)}else row.append(node("span","pill","이미지 없음"));
    const actions=node("div","row-actions"),view=node("button","secondary","보기"),edit=node("button","secondary","수정"),remove=node("button","danger","삭제");view.type=edit.type=remove.type="button";view.addEventListener("click",()=>openModal(record));edit.addEventListener("click",()=>startEdit(record.id));remove.addEventListener("click",()=>deleteRecord(record.id));actions.append(view,edit,remove);row.append(actions);return row;
  }));
}

function startEdit(id){const record=state.records.find(item=>item.id===id);if(!record)return;el.editingId.value=id;el.existingExam.value=record.examTitle;syncExamMode();el.questionType.value=record.type;el.questionNumber.value=record.number;el.questionPoints.value=String(record.points);el.questionDifficulty.value=record.difficulty;el.questionAnswer.value=String(record.answer);el.questionExplanation.value=record.explanation;pendingImage=record.image;el.imageStatus.textContent=record.image?"기존 이미지 유지":"파일 선택 또는 이 입력 칸에서 Ctrl+V";el.saveRecord.textContent="수정 저장";el.cancelEdit.classList.remove("hidden");switchTab("record");el.recordForm.scrollIntoView({behavior:"smooth",block:"center"})}
async function deleteRecord(id){const record=state.records.find(item=>item.id===id);if(!record||!confirm(`${record.examTitle} ${record.number}번을 삭제할까요?`))return;state.records=state.records.filter(item=>item.id!==id);await persist();renderAll();toast("문항을 삭제했습니다.")}
function resetForm(keepExam=""){el.recordForm.reset();el.editingId.value="";pendingImage="";el.imageStatus.textContent="파일 선택 또는 이 입력 칸에서 Ctrl+V";el.questionPoints.value="2";el.questionDifficulty.value="중";el.saveRecord.textContent="저장";el.cancelEdit.classList.add("hidden");if(keepExam&&getExams().includes(keepExam)){el.existingExam.value=keepExam;syncExamMode()}else syncExamMode()}

async function pasteImage(event){const item=[...(event.clipboardData?.items||[])].find(entry=>entry.type.startsWith("image/"));if(!item)return;event.preventDefault();pendingImage=await fileToDataUrl(item.getAsFile());el.imageStatus.textContent="클립보드 이미지 붙여넣음";toast("이미지를 붙여넣었습니다.")}

function renderExamChecks(exams){
  if(!exams.length){el.examChecks.replaceChildren(node("div","no-records","저장된 모의고사가 없습니다."));el.compareCount.textContent="0 / 8";return}
  el.examChecks.replaceChildren(...exams.map(title=>{const label=node("label","exam-check"),input=document.createElement("input");input.type="checkbox";input.checked=state.selectedExams.includes(title);input.addEventListener("change",()=>toggleCompareExam(title,input));label.append(input,document.createTextNode(title));return label}));el.compareCount.textContent=`${state.selectedExams.length} / 8`;
}
async function toggleCompareExam(title,input){if(input.checked&&state.selectedExams.length>=8){input.checked=false;toast("모의고사는 최대 8개까지 비교할 수 있습니다.",true);return}state.selectedExams=input.checked?[...state.selectedExams,title]:state.selectedExams.filter(item=>item!==title);await persist();el.compareCount.textContent=`${state.selectedExams.length} / 8`;renderCompare()}

function renderCompare(){
  const exams=state.selectedExams.filter(title=>getExams().includes(title));if(!exams.length){el.compareEmpty.classList.remove("hidden");el.compareScroll.classList.add("hidden");return}el.compareEmpty.classList.add("hidden");el.compareScroll.classList.remove("hidden");buildTypeTable(el.compareTable,exams,false);
}

function buildTypeTable(table,exams,quick){
  const records=state.records.filter(item=>exams.includes(item.examTitle)),types=[...new Set(records.map(item=>item.type))].sort((a,b)=>a.localeCompare(b,"ko",{numeric:true}));const thead=document.createElement("thead"),head=document.createElement("tr");head.append(node("th","","유형"));exams.forEach(title=>head.append(node("th","",title)));thead.append(head);const tbody=document.createElement("tbody");
  types.forEach(type=>{const rows=records.filter(item=>item.type===type),tr=document.createElement("tr"),typeCell=document.createElement("td");typeCell.innerHTML=`${escapeHtml(type)}<span class="type-total">총 ${rows.length}문항</span>`;tr.append(typeCell);exams.forEach(exam=>{const td=document.createElement("td"),wrap=quick?node("div","quick-cell"):td;rows.filter(item=>item.examTitle===exam).sort(sortRecords).forEach(record=>wrap.append(quick?makeQuickEntry(record):makeCompareEntry(record)));if(quick)td.append(wrap);tr.append(td)});tbody.append(tr)});table.replaceChildren(thead,tbody);
}

function makeCompareEntry(record){const button=node("button",`compare-item ${difficultyClass(record.difficulty)}`);button.type="button";button.innerHTML=`<span><b>${record.number}번</b> · ${format(record.points)}점 · ${CIRCLED[record.answer]}</span><span>${record.difficulty}${record.image?" · ":""}${record.image?'<em>▣</em>':""}</span>`;button.addEventListener("click",()=>openModal(record));return button}
function makeQuickEntry(record){const span=node("button","quick-entry");span.type="button";span.innerHTML=`${record.number}(${format(record.points)}) · ${record.difficulty}${record.image?' <em>▣</em>':""}`;span.addEventListener("click",()=>openModal(record));return span}

function renderAnalysis(){
  const exam=el.analysisExam.value,records=state.records.filter(item=>item.examTitle===exam).sort(sortRecords);if(!exam||!records.length){el.analysisEmpty.classList.remove("hidden");el.analysisContent.classList.add("hidden");return}el.analysisEmpty.classList.add("hidden");el.analysisContent.classList.remove("hidden");
  const totalPoints=records.reduce((sum,item)=>sum+item.points,0),types=new Set(records.map(item=>item.type));el.summaryCards.replaceChildren(summaryCard("문항 수",`${records.length}문항`),summaryCard("총 배점",`${format(totalPoints)}점`),summaryCard("유형 수",`${types.size}개`),summaryCard("이미지 등록",`${records.filter(item=>item.image).length}문항`));
  renderAnswerCounts(el.answerCounts,records.map(item=>item.answer));renderBars(el.pointCounts,[1.5,2,2.5,3].map(value=>({label:`${value}점`,count:records.filter(item=>item.points===value).length})));renderBars(el.difficultyCounts,["하","중","상","최상"].map(value=>({label:value,count:records.filter(item=>item.difficulty===value).length})));
  renderSequence(el.answerSequence,records);const issues=analyzeIssues(records);el.answerWarning.className=`answer-warning${issues.length?" warn":""}`;el.answerWarning.textContent=issues.length?issues.join(" · "):"정답 수와 번호 배치에서 두드러지는 이상이 없습니다.";
  const grouped=groupBy(records,item=>item.type);el.typeAnalysis.replaceChildren(...[...grouped.entries()].sort(([a],[b])=>a.localeCompare(b,"ko")).map(([type,items])=>{const row=node("div","type-row");row.append(node("span","",type),node("span","",items.map(item=>`${item.number}번(${format(item.points)})`).join(", ")));return row}));
}

function renderAnswerCounts(target,answers){const counts=countAnswers(answers),max=Math.max(1,...counts);target.replaceChildren(...counts.map((count,index)=>{const card=node("div","answer-count");card.style.setProperty("--height",`${count/max*100}%`);card.innerHTML=`<span>${CIRCLED[index+1]}</span><b>${count}</b>`;return card}))}
function renderBars(target,data){const max=Math.max(1,...data.map(item=>item.count));target.replaceChildren(...data.map(item=>{const row=node("div","metric-row");row.innerHTML=`<span>${item.label}</span><div class="bar-track"><div class="bar-fill" style="width:${item.count/max*100}%"></div></div><b>${item.count}</b>`;return row}))}
function renderSequence(target,records){target.replaceChildren(...records.map(record=>{const chip=node("span","sequence-chip");chip.innerHTML=`<span>${record.number}</span><b>${CIRCLED[record.answer]}</b>`;return chip}))}
function analyzeIssues(records){const issues=[],counts=countAnswers(records.map(item=>item.answer)),max=Math.max(...counts),min=Math.min(...counts);if(max-min>=3)issues.push(`보기 수 차이가 ${max-min}개입니다`);let longest=1,streak=1;for(let i=1;i<records.length;i++){streak=records[i].number===records[i-1].number+1&&records[i].answer===records[i-1].answer?streak+1:1;longest=Math.max(longest,streak)}if(longest>=3)issues.push(`같은 답이 최대 ${longest}회 연속됩니다`);const duplicates=records.filter((item,index)=>records.findIndex(other=>other.number===item.number)!==index);if(duplicates.length)issues.push("중복 번호가 있습니다");return issues}

function renderQuick(){renderQuickPages();renderQuickResults()}
function renderQuickPages(){
  const pages=[];
  for(let page=1;page<=6;page++){
    const card=node("section","quick-page"),title=node("h3","",`${page}p · 최대 6문항`);card.append(title);
    for(let slot=1;slot<=6;slot++){
      const index=(page-1)*6+(slot-1),row=node("div","quick-slot");row.append(node("span","",String(slot).padStart(2,"0")));
      const answer=document.createElement("select");answer.className="quick-answer-select";answer.append(option("","답"),...CIRCLED.slice(1).map((label,value)=>option(String(value+1),label)));answer.value=state.quickAnswers[index]||"";answer.addEventListener("change",()=>{state.quickAnswers[index]=Number(answer.value)||null;renderQuickResults();persist()});
      const statement=document.createElement("select");statement.className=`quick-statement ${statementClass(state.quickStatements[index])}`;statement.append(option("","ㄱㄴㄷ"),...STATEMENTS.map(value=>option(value,value)));statement.value=state.quickStatements[index];statement.addEventListener("change",()=>{state.quickStatements[index]=statement.value;statement.className=`quick-statement ${statementClass(statement.value)}`;renderQuickResults();persist()});
      const type=document.createElement("input");type.setAttribute("list","typeSuggestions");type.placeholder="유형";type.value=state.quickTypes[index];type.addEventListener("change",()=>{state.quickTypes[index]=clean(type.value);renderQuickResults();persist()});row.append(answer,statement,type);card.append(row);
    }
    pages.push(card);
  }
  el.quickPageGrid.replaceChildren(...pages);
}
function renderQuickResults(){
  renderAnswerCounts(el.quickChoiceCounts,state.quickAnswers.filter(Boolean));
  const counts=STATEMENTS.map(value=>state.quickStatements.filter(item=>item===value).length);el.quickStatementCounts.replaceChildren(...STATEMENTS.map((value,index)=>{const card=node("div","statement-count");card.innerHTML=`<span>${value}</span><b>${counts[index]}</b>`;return card}));
  const entered=Array.from({length:QUICK_SLOT_COUNT},(_,index)=>({page:Math.floor(index/6)+1,slot:index%6+1,answer:state.quickAnswers[index],statement:state.quickStatements[index],type:state.quickTypes[index]})).filter(item=>item.answer||item.statement||item.type);
  el.quickSequence.replaceChildren(...entered.map(item=>{const chip=node("span","sequence-chip");chip.innerHTML=`<span>${item.page}p-${item.slot}</span><b>${item.answer?CIRCLED[item.answer]:"–"}</b>`;return chip}));
  const answerRows=entered.filter(item=>item.answer).map((item,index)=>({number:index+1,answer:item.answer})),issues=analyzeIssues(answerRows);el.quickWarning.className=`answer-warning${issues.length?" warn":""}`;el.quickWarning.textContent=entered.length?`${entered.length}문항 입력됨 · 빈 칸은 집계에서 제외됩니다.${issues.length?` · ${issues.join(" · ")}`:""}`:"입력한 문항만 집계됩니다. 빈 칸은 제외됩니다.";
  renderQuickTypeBoard();
}
function renderQuickTypeBoard(){
  const pages=[];
  for(let page=1;page<=6;page++){const card=node("section","quick-type-page");card.append(node("h3","",`${page}p`));for(let slot=1;slot<=6;slot++){const index=(page-1)*6+(slot-1),type=state.quickTypes[index],row=node("div",`quick-type-item${type?"":" empty"}`);row.append(node("b","",String(slot)),node("span","",type||"—"));card.append(row)}pages.push(card)}el.quickTypeBoard.replaceChildren(...pages);
  const types=state.quickTypes.filter(Boolean),grouped=groupBy(types,value=>value);el.quickTypeCounts.replaceChildren(...([...grouped.entries()].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],"ko")).map(([type,items])=>{const chip=node("span","quick-type-count");chip.innerHTML=`${escapeHtml(type)}<b>${items.length}</b>`;return chip})));if(!types.length)el.quickTypeCounts.append(node("span","quick-type-count","입력된 유형이 없습니다."));
}
async function resetQuickAnalysis(){if((state.quickAnswers.some(Boolean)||state.quickStatements.some(Boolean)||state.quickTypes.some(Boolean))&&!confirm("빠른 분석 입력을 모두 지울까요?"))return;state.quickAnswers=Array(QUICK_SLOT_COUNT).fill(null);state.quickStatements=Array(QUICK_SLOT_COUNT).fill("");state.quickTypes=Array(QUICK_SLOT_COUNT).fill("");await persist();renderQuick()}

function openModal(record){el.modalTitle.textContent=`${record.examTitle} ${record.number}번`;el.modalMeta.textContent=`${record.type} · ${format(record.points)}점 · ${record.difficulty} · 정답 ${CIRCLED[record.answer]}`;el.modalExplanation.textContent=record.explanation;if(record.image){el.modalImage.src=record.image;el.modalImageWrap.classList.remove("hidden")}else{el.modalImage.removeAttribute("src");el.modalImageWrap.classList.add("hidden")}el.detailModal.classList.add("show");el.detailModal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden"}
function closeModal(){el.detailModal.classList.remove("show");el.detailModal.setAttribute("aria-hidden","true");el.modalImage.removeAttribute("src");document.body.style.overflow=""}

async function loadTypeCatalog(){try{const response=await fetch("reference/type-catalog.json");if(!response.ok)return;const catalog=await response.json();[...new Set(Object.values(catalog).flat().filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ko")).forEach(value=>el.typeSuggestions.append(option(value,"")))}catch{}refreshTypeSuggestions()}
function refreshTypeSuggestions(){const existing=new Set([...el.typeSuggestions.options].map(item=>item.value));state.records.map(item=>item.type).filter(value=>!existing.has(value)).forEach(value=>el.typeSuggestions.append(option(value,"")))}
function getExams(){return [...new Set(state.records.map(item=>item.examTitle))].sort((a,b)=>a.localeCompare(b,"ko"))}
function getExamsByRecent(){const map=new Map();state.records.forEach(item=>map.set(item.examTitle,Math.max(map.get(item.examTitle)||0,item.updatedAt)));return [...map].sort((a,b)=>b[1]-a[1]).map(([title])=>title)}
function normalizeAnswers(values){return Array.from({length:QUICK_SLOT_COUNT},(_,index)=>{const value=Number(values?.[index]);return value>=1&&value<=5?value:null})}
function normalizeStatements(values){return Array.from({length:QUICK_SLOT_COUNT},(_,index)=>STATEMENTS.includes(values?.[index])?values[index]:"")}
function normalizeTypes(values){return Array.from({length:QUICK_SLOT_COUNT},(_,index)=>clean(values?.[index]))}
function countAnswers(answers){return [1,2,3,4,5].map(value=>answers.filter(item=>item===value).length)}
function summaryCard(label,value){const card=node("article","summary-card");card.innerHTML=`<small>${label}</small><strong>${value}</strong>`;return card}
function groupBy(items,keyFn){const map=new Map();items.forEach(item=>{const key=keyFn(item);if(!map.has(key))map.set(key,[]);map.get(key).push(item)});return map}
function sortRecords(a,b){return a.number-b.number||a.type.localeCompare(b.type,"ko")}
function difficultyClass(value){return{"하":"low","중":"mid","상":"high","최상":"top"}[value]||"mid"}
function statementClass(value){return{"ㄱ":"statement-g","ㄴ":"statement-n","ㄷ":"statement-d","ㄱ ㄴ":"statement-gn","ㄱ ㄷ":"statement-gd","ㄴ ㄷ":"statement-nd","ㄱ ㄴ ㄷ":"statement-gnd"}[value]||""}
function clean(value){return String(value||"").replace(/\s+/g," ").trim()}
function format(value){return Number.isInteger(value)?String(value):String(Number(value).toFixed(1))}
function makeId(){return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element}
function option(value,text){const element=document.createElement("option");element.value=value;element.textContent=text;return element}
function escapeHtml(value){return String(value??"").replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]))}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file)})}
function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,DB_VERSION);request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(STORE))database.createObjectStore(STORE,{keyPath:"key"})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function readState(){return new Promise(resolve=>{const request=db.transaction(STORE,"readonly").objectStore(STORE).get("main-v3");request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>resolve(null)})}
function persist(){return new Promise(resolve=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put({key:"main-v3",records:state.records,selectedExams:state.selectedExams,quickAnswers:state.quickAnswers,quickStatements:state.quickStatements,quickTypes:state.quickTypes});tx.oncomplete=()=>resolve();tx.onerror=()=>resolve()})}
let toastTimer;function toast(message,error=false){el.toast.textContent=message;el.toast.style.background=error?"#a83249":"";el.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.toast.classList.remove("show"),1800)}
