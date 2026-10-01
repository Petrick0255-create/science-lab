const ids = [
  "diffChild",
  "hetero",
  "sexRatio",
  "geneAmount",
  "xDisease",
  "recessiveFemale",
  "motherSonDiff",
  "fatherDaughterDiff",
  "fatherSonDiff",
  "sameGeneAmountDiffPhenotype",
  "parentsOneAllele",
  "fatherNoRecessive"
];

ids.forEach(id => {
  document.getElementById(id).addEventListener("change", render);
});

const checked = id => document.getElementById(id).checked;

function resetChecks(){
  ids.forEach(id => document.getElementById(id).checked = false);
  render();
}

function example(title, text){
  return `
    <div class="example-card">
      <b>${title}</b><br>
      ${text}
    </div>
  `;
}

function renderExamples(){
  let html = "";

  if(checked("diffChild")){
    html += example(
      "부모와 다른 표현형 자손",
      "Ⅰ-1과 Ⅰ-2의 표현형은 같고, Ⅱ-2의 표현형은 부모와 다르다."
    );
  }

  if(checked("hetero")){
    html += example(
      "이형접합 제시",
      "Ⅱ-3은 대립유전자 A와 a를 모두 가진다."
    );
  }

  if(checked("sexRatio")){
    html += example(
      "남녀 표현형 빈도 차이",
      "이 형질은 남자에게서 여자보다 높은 빈도로 나타난다."
    );
  }

  if(checked("geneAmount")){
    html += example(
      "유전자량 제시",
      "남녀가 가지고 있는 A 유전자의 수는 서로 다르다."
    );
  }

  if(checked("xDisease")){
    html += example(
      "X 염색체 소재",
      "이 형질은 적록색맹과 같은 방식으로 유전된다."
    );
  }

  if(checked("recessiveFemale")){
    html += example(
      "열성 여자 존재",
      "Ⅱ-3은 여자이며 열성 표현형을 나타낸다."
    );
  }

  if(checked("motherSonDiff")){
    html += example(
      "어머니-아들 비교",
      "Ⅰ-2와 Ⅱ-1의 표현형은 서로 다르다."
    );
  }

  if(checked("fatherDaughterDiff")){
    html += example(
      "아버지-딸 비교",
      "Ⅰ-1과 Ⅱ-3의 표현형은 서로 다르다."
    );
  }

  if(checked("fatherSonDiff")){
    html += example(
      "아버지-아들 비교",
      "Ⅰ-1과 Ⅱ-1의 표현형은 서로 다르다."
    );
  }

  if(checked("sameGeneAmountDiffPhenotype")){
    html += example(
      "남녀 유전자량 동일 + 표현형 다름",
      "남녀가 특정 유전자의 양을 동일하게 보유하지만, 남녀의 표현형은 서로 다르다."
    );
  }

  if(checked("parentsOneAllele")){
    html += example(
      "부모 각각 한 종류 대립유전자",
      "Ⅰ-1과 Ⅰ-2는 각각 대립유전자를 한 종류만 가진다."
    );
  }

  if(checked("fatherNoRecessive")){
    html += example(
      "아버지 열성 유전자 없음",
      "Ⅰ-1은 열성 대립유전자를 갖지 않는다."
    );
  }

  if(!html){
    html = `<div class="example-card">조건을 선택하면 문제 제시 예문이 여기에 자동으로 뜹니다.</div>`;
  }

  document.getElementById("examples").innerHTML = html;
}

function line(x1,y1,x2,y2){
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111827" stroke-width="3" stroke-linecap="round"/>`;
}

function text(x,y,t,size=15,color="#334155",weight="700"){
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${t}</text>`;
}

function person(x,y,sex,filled,label){
  const fill = filled ? "#111827" : "#fff";

  const shape = sex === "male"
    ? `<rect x="${x-23}" y="${y-23}" width="46" height="46" fill="${fill}" stroke="#111827" stroke-width="3"/>`
    : `<circle cx="${x}" cy="${y}" r="25" fill="${fill}" stroke="#111827" stroke-width="3"/>`;

  return `
    ${shape}
    <text x="${x}" y="${y+48}" text-anchor="middle" font-size="15" fill="#111827" font-weight="800">${label}</text>
  `;
}

function drawPedigree(){
  let gpDad = false;
  let gpMom = false;
  let uncle = false;
  let dad = false;
  let mom = false;
  let son = false;
  let daughter = false;
  let son2 = false;

  if(checked("diffChild")){
    dad = false;
    mom = false;
    son = true;
  }

  if(checked("sexRatio")){
    son = true;
    son2 = true;
    daughter = false;
  }

  if(checked("recessiveFemale")){
    daughter = true;
  }

  if(checked("motherSonDiff")){
    mom = true;
    son = false;
  }

  if(checked("fatherDaughterDiff")){
    dad = true;
    daughter = false;
  }

  if(checked("fatherSonDiff")){
    dad = true;
    son = false;
  }

  if(checked("parentsOneAllele")){
    dad = true;
    mom = false;
  }

  if(checked("sameGeneAmountDiffPhenotype")){
    son = true;
    daughter = false;
  }

  if(checked("diffChild")){
    gpDad = false;
    gpMom = false;
    dad = true;
  }

  let svg = "";

  svg += text(34,36,"대표 가계도",18,"#1f3b57","900");

  svg += line(250,80,400,80);

  svg += line(325,80,325,135);
  svg += line(180,135,500,135);
  svg += line(210,135,210,180);
  svg += line(325,135,325,180);
  svg += line(455,135,455,180);

  svg += line(325,205,455,205);

  svg += line(390,205,390,265);
  svg += line(250,265,530,265);
  svg += line(280,265,280,310);
  svg += line(390,265,390,310);
  svg += line(500,265,500,310);

  svg += person(250,80,"male",gpDad,"Ⅰ-1");
  svg += person(400,80,"female",gpMom,"Ⅰ-2");

  svg += person(210,205,"male",uncle,"Ⅱ-1");
  svg += person(325,205,"male",dad,"Ⅱ-2");
  svg += person(455,205,"female",mom,"Ⅱ-3");

  svg += person(280,335,"male",son,"Ⅲ-1");
  svg += person(390,335,"female",daughter,"Ⅲ-2");
  svg += person(500,335,"male",son2,"Ⅲ-3");

  if(checked("hetero")){
    svg += text(545,82,"Ⅱ-3 = Aa",15,"#7c3aed","900");
    svg += text(545,108,"이형접합 → 우성 표현형",13,"#334155","700");
  }

  if(checked("geneAmount")){
    svg += text(545,148,"유전자량 제시",15,"#075985","900");
    svg += text(545,174,"성염색체 검사 필요",13,"#334155","700");
  }

  if(checked("sexRatio")){
    svg += text(545,216,"남자 발현 多",15,"#991b1b","900");
    svg += `
      <rect x="545" y="230" width="24" height="18" fill="#111827"/>
      <rect x="575" y="230" width="24" height="18" fill="#111827"/>
      <rect x="605" y="230" width="24" height="18" fill="#111827"/>
      <circle cx="558" cy="275" r="11" fill="#fff" stroke="#111827" stroke-width="3"/>
    `;
  }

  document.getElementById("pedigree").innerHTML = svg;

  document.getElementById("pedigreeNote").textContent =
    "대표 가계도는 Ⅰ-Ⅱ-Ⅲ세대까지 표시됩니다. 검은색은 형질 발현, 흰색은 정상 또는 반대 표현형입니다.";
}

function ref(id){
  return `<span class="person-ref">${id}</span>`;
}

function evidence(text){
  return `<div class="evidence"><b>어디를 봐야 하나?</b><br>${text}</div>`;
}

function card(type,title,body){
  return `
    <div class="logic-card ${type}">
      <b>${title}</b><br>
      ${body}
    </div>
  `;
}

function ref(id){
  return `<span class="person-ref">${id}</span>`;
}

function evidence(text){
  return `
    <div class="evidence">
      <b>어디를 봐야 하나?</b><br>
      ${text}
    </div>
  `;
}

function renderLogic(){
  let html = "";

  if(checked("diffChild")){
    html += card(
      "good",
      "우열 검사",
      `
      ${ref("Ⅱ-2")}와 ${ref("Ⅱ-3")}의 표현형은 같고,
      자녀 ${ref("Ⅲ-1")}의 표현형은 부모와 다릅니다.<br><br>

      자녀 ${ref("Ⅲ-1")}의 표현형이 우성이라면,
      유전자형은 <b>AA 또는 Aa</b>입니다.<br>
      그러려면 부모 ${ref("Ⅱ-2")} 또는 ${ref("Ⅱ-3")} 중 적어도 한 명은
      우성 대립유전자 <b>A</b>를 가져야 합니다.<br><br>

      그런데 부모와 자녀의 표현형이 서로 다르므로,
      자녀의 표현형을 우성으로 두면 부모 쪽 표현형과 모순이 생깁니다.<br><br>

      따라서 ${ref("Ⅲ-1")}의 표현형은
      <span class="tag possible">열성</span>이고,
      유전자형은 <b>aa</b>입니다.

      ${evidence(`
        가계도에서 부모 ${ref("Ⅱ-2")}, ${ref("Ⅱ-3")}와
        자녀 ${ref("Ⅲ-1")}의 표현형이 다른지 봅니다.<br>
        이 조건은 <b>우열 판단</b>에 씁니다.
      `)}
      `
    );
  }

  if(checked("hetero")){
    html += card(
      "good",
      "이형접합 제시",
      `
      문제에서 ${ref("Ⅱ-3")}이 대립유전자 <b>A</b>와 <b>a</b>를
      모두 가진다고 제시됩니다.<br><br>

      즉, ${ref("Ⅱ-3")}의 유전자형은 <b>Aa</b>입니다.<br>
      이형접합에서 실제로 나타나는 표현형이 우성입니다.<br><br>

      따라서 ${ref("Ⅱ-3")}의 표현형은
      <span class="tag possible">우성 표현형</span>입니다.

      ${evidence(`
        문제 조건에서 ${ref("Ⅱ-3")}이 <b>Aa</b>인지 확인합니다.<br>
        이 조건은 “그 사람의 표현형이 우성”임을 알려 줍니다.
      `)}
      `
    );
  }

  if(checked("sexRatio")){
    html += card(
      "warn",
      "성상 검사",
      `
      남자인 ${ref("Ⅲ-1")}, ${ref("Ⅲ-3")}에서 형질이 더 많이 나타나고,
      여자 ${ref("Ⅲ-2")}에서는 덜 나타나는 형태입니다.<br><br>

      상염색체 유전이라면 남녀 모두 <b>AA, Aa, aa</b>를
      같은 방식으로 가질 수 있습니다.<br><br>

      하지만 X 염색체 유전에서는 남자가
      <b>XᴬY</b> 또는 <b>XᵃY</b>처럼 X 염색체를 하나만 가지므로,
      열성 대립유전자도 바로 표현형으로 나타날 수 있습니다.<br><br>

      따라서 남녀 빈도 차이가 크면
      <span class="tag mid">반성유전 검사</span>가 필요합니다.

      ${evidence(`
        가계도에서 남자 개체 ${ref("Ⅲ-1")}, ${ref("Ⅲ-3")}와
        여자 개체 ${ref("Ⅲ-2")}의 발현 빈도를 비교합니다.<br>
        남녀 차이가 크면 성염색체 유전 가능성을 먼저 봅니다.
      `)}
      `
    );
  }

  if(checked("geneAmount")){
    html += card(
      "warn",
      "유전자량 제시",
      `
      문제에서 남녀가 가진 특정 유전자의 양이 제시됩니다.<br><br>

      상염색체 유전자라면 남녀 모두 보통 같은 수의 유전자를 가집니다.<br>
      반면 X 염색체 유전자라면 남자는 <b>X?Y</b>,
      여자는 <b>X?X?</b> 구조가 되어 유전자량 해석이 달라질 수 있습니다.<br><br>

      따라서 유전자량이 제시되면
      <span class="tag mid">성염색체에 유전자가 있는지</span> 검사해야 합니다.

      ${evidence(`
        문제 조건에서 “남녀가 가진 유전자 수” 또는
        “특정 유전자의 양”이 제시되는지 봅니다.<br>
        이 조건은 상염색체인지 성염색체인지 가르는 단서입니다.
      `)}
      `
    );
  }

  if(checked("xDisease")){
    html += card(
      "info",
      "X 염색체 소재",
      `
      적록색맹, 혈우병, 피부 얼룩증은 X 염색체 유전 소재로 자주 쓰입니다.<br><br>

      특히 X 염색체 열성에서는 남자가 <b>XᵃY</b>만 되어도 형질이 나타나지만,
      여자는 <b>XᵃXᵃ</b>이어야 형질이 나타납니다.<br><br>

      그래서 남자에게 더 자주 나타나는 가계도를 만들기 좋습니다.

      ${evidence(`
        문제에서 적록색맹, 혈우병, 피부 얼룩증 같은 소재가 나오면
        X 염색체 유전 가능성을 우선 검토합니다.
      `)}
      `
    );
  }

  if(checked("recessiveFemale")){
    html += card(
      "warn",
      "열성 여자 존재",
      `
      ${ref("Ⅲ-2")}가 여자이고 열성 표현형입니다.<br><br>

      X 염색체 열성이라고 가정하면 ${ref("Ⅲ-2")}의 유전자형은
      <b>XᵃXᵃ</b>입니다.<br>
      딸은 아버지에게서 반드시 X 염색체를 받으므로,
      아버지 ${ref("Ⅱ-2")}는 반드시 <b>XᵃY</b>여야 합니다.<br><br>

      따라서 ${ref("Ⅲ-2")}가 열성인데
      아버지 ${ref("Ⅱ-2")}가 열성이 아니라면
      <span class="tag impossible">X 염색체 열성 유전은 불가능</span>합니다.

      ${evidence(`
        먼저 열성 여자인 ${ref("Ⅲ-2")}를 찾습니다.<br>
        그다음 아버지 ${ref("Ⅱ-2")}의 표현형을 확인합니다.<br>
        <b>딸이 열성인데 아버지가 열성이 아니면 X열성 탈락</b>입니다.
      `)}
      `
    );
  }

  if(checked("motherSonDiff")){
    html += card(
      "bad",
      "어머니-아들 표현형 비교",
      `
      어머니 ${ref("Ⅱ-3")}와 아들 ${ref("Ⅲ-1")}의 표현형이 서로 다릅니다.<br><br>

      X 염색체 열성에서 어머니 ${ref("Ⅱ-3")}가 열성이라면,
      어머니의 유전자형은 <b>XᵃXᵃ</b>입니다.<br>
      아들 ${ref("Ⅲ-1")}은 어머니에게서 X 염색체를 받으므로
      반드시 <b>XᵃY</b>가 됩니다.<br><br>

      즉, 어머니가 열성이면 아들도 반드시 열성입니다.<br>
      그런데 둘의 표현형이 다르면
      <span class="tag impossible">X 염색체 열성 유전은 불가능</span>합니다.

      ${evidence(`
        가계도에서 어머니 ${ref("Ⅱ-3")}와
        아들 ${ref("Ⅲ-1")}을 비교합니다.<br>
        X열성에서는 <b>어머니 열성 → 아들 열성</b>이어야 합니다.
      `)}
      `
    );
  }

  if(checked("fatherDaughterDiff")){
    html += card(
      "bad",
      "아버지-딸 표현형 비교",
      `
      아버지 ${ref("Ⅱ-2")}와 딸 ${ref("Ⅲ-2")}의 표현형이 서로 다릅니다.<br><br>

      X 염색체 열성에서 딸 ${ref("Ⅲ-2")}이 열성이라면,
      딸의 유전자형은 <b>XᵃXᵃ</b>입니다.<br>
      딸은 아버지 ${ref("Ⅱ-2")}에게서 반드시 X 염색체를 받으므로,
      아버지도 반드시 <b>XᵃY</b>여야 합니다.<br><br>

      따라서 딸이 열성인데 아버지가 열성이 아니라면
      <span class="tag impossible">X 염색체 열성 유전은 불가능</span>합니다.

      ${evidence(`
        딸 ${ref("Ⅲ-2")}이 열성인지 먼저 봅니다.<br>
        그다음 아버지 ${ref("Ⅱ-2")}가 열성인지 확인합니다.<br>
        X열성에서는 <b>딸 열성 → 아버지 열성</b>이어야 합니다.
      `)}
      `
    );
  }

  if(checked("fatherSonDiff")){
    html += card(
      "info",
      "아버지-아들 표현형 비교",
      `
      아버지 ${ref("Ⅱ-2")}와 아들 ${ref("Ⅲ-1")}의 표현형이 서로 다릅니다.<br><br>

      아버지는 아들에게 X 염색체를 주지 않고 <b>Y</b>를 줍니다.<br>
      아들은 어머니에게서 X 염색체를 받습니다.<br><br>

      따라서 아버지와 아들의 표현형이 다르다는 사실은
      X 염색체 유전과 모순이 아닙니다.<br><br>

      이 조건은 오히려
      <span class="tag mid">아버지→아들 X 전달이 없다는 점</span>을 이용하는 단서입니다.

      ${evidence(`
        가계도에서 아버지 ${ref("Ⅱ-2")}와
        아들 ${ref("Ⅲ-1")}을 비교합니다.<br>
        단, 아버지는 아들에게 X를 주지 않으므로
        이 차이만으로 X연관을 부정하면 안 됩니다.
      `)}
      `
    );
  }

  if(checked("sameGeneAmountDiffPhenotype")){
    html += card(
      "good",
      "남녀 유전자량 동일 + 표현형 다름",
      `
      남녀가 특정 유전자의 양을 동일하게 보유하지만,
      표현형은 서로 다릅니다.<br><br>

      단순 상염색체 유전이라면 같은 유전자량 조건에서
      남녀 표현형이 다르게 갈릴 이유가 약합니다.<br><br>

      따라서 성별에 따라 유전자 발현 방식이 달라지는
      <span class="tag possible">반성유전</span>을 의심할 수 있습니다.

      ${evidence(`
        문제 조건에서 “남녀의 유전자량은 같다”와
        “남녀 표현형은 다르다”가 같이 제시되는지 봅니다.<br>
        이 조합은 반성유전 확정 조건으로 쓰기 좋습니다.
      `)}
      `
    );
  }

  if(checked("parentsOneAllele")){
    html += card(
      "good",
      "부모가 각각 대립유전자 한 종류",
      `
      부모 ${ref("Ⅰ-1")}과 ${ref("Ⅰ-2")}가 각각 대립유전자 한 종류만 가진다고 제시됩니다.<br><br>

      상염색체 유전이라면 예를 들어 <b>AA × aa</b>에서
      자녀는 모두 <b>Aa</b>가 됩니다.<br>
      그러면 아들과 딸의 표현형이 달라지기 어렵습니다.<br><br>

      그런데 자녀의 성별에 따라 표현형이 다르면,
      상염색체보다 <span class="tag possible">반성유전</span>을 의심해야 합니다.

      ${evidence(`
        부모 ${ref("Ⅰ-1")}, ${ref("Ⅰ-2")}의 대립유전자 조건을 봅니다.<br>
        “각각 한 종류만 가진다”는 말이 있으면
        <b>AA × aa</b> 또는 성염색체 조합을 비교합니다.
      `)}
      `
    );
  }

  if(checked("fatherNoRecessive")){
    html += card(
      "info",
      "아버지 열성 유전자 없음",
      `
      아버지 ${ref("Ⅱ-2")}가 열성 대립유전자를 갖지 않는다고 제시됩니다.<br><br>

      상염색체 유전이라면 아버지는 열성 대립유전자 <b>a</b>가 없으므로
      <b>AA</b>입니다.<br>
      따라서 자녀에게 반드시 <b>A</b>를 전달합니다.<br><br>

      이 조건은 아버지-아들 표현형 차이와 결합할 때
      반성유전 판단에 유용합니다.

      ${evidence(`
        문제 조건에서 아버지 ${ref("Ⅱ-2")}가
        열성 대립유전자를 갖지 않는지 확인합니다.<br>
        상염색체라면 ${ref("Ⅱ-2")}는 <b>AA</b>로 볼 수 있습니다.
      `)}
      `
    );
  }

  if(!html){
    html = `
      <div class="logic-card info">
        조건을 선택하면 AA, Aa, aa 또는 XᴬY, XᵃY를 이용한 판별 과정이 여기에 뜹니다.<br><br>
        또한 ${ref("Ⅰ-1")}, ${ref("Ⅱ-2")}, ${ref("Ⅲ-1")}처럼
        어느 사람을 보고 판단해야 하는지도 함께 표시됩니다.
      </div>
    `;
  }

  document.getElementById("logicCards").innerHTML = html;
}

function renderSummary(){
  let dominance = "미정";
  let sex = "미정";
  let caution = "모순 없음";

  if(checked("diffChild")) dominance = "자손 표현형 = 열성, 자손 = aa";
  if(checked("hetero")) dominance = dominance === "미정" ? "Aa → 우성 표현형" : dominance + " / Aa → 우성";

  if(checked("sexRatio") || checked("geneAmount") || checked("xDisease")) sex = "반성유전 검사 필요";
  if(checked("sameGeneAmountDiffPhenotype") || checked("parentsOneAllele")) sex = "반성유전 가능성 큼";

  if(checked("motherSonDiff") || checked("fatherDaughterDiff")) caution = "X 열성 부정 조건 존재";

  document.getElementById("summary").innerHTML = `
    <div class="result-line"><b>우열</b><span>${dominance}</span></div>
    <div class="result-line"><b>성상</b><span>${sex}</span></div>
    <div class="result-line"><b>주의</b><span>${caution}</span></div>
  `;
}

function renderCandidates(){
  const list = [
    {n:"상염색체 열성",s:2,bad:false},
    {n:"상염색체 우성",s:1,bad:false},
    {n:"X 염색체 열성",s:1,bad:false},
    {n:"X 염색체 우성",s:1,bad:false},
    {n:"Y 염색체 유전",s:0,bad:false}
  ];

  if(checked("diffChild")){
    list[0].s += 3;
    list[2].s += 2;
    list[1].s -= 1;
  }

  if(checked("sexRatio") || checked("geneAmount") || checked("xDisease")){
    list[2].s += 3;
    list[3].s += 2;
    list[4].s += 1;
  }

  if(checked("motherSonDiff") || checked("fatherDaughterDiff")){
    list[2].bad = true;
  }

  if(checked("recessiveFemale")){
    list[4].bad = true;
  }

  if(checked("sameGeneAmountDiffPhenotype") || checked("parentsOneAllele")){
    list[2].s += 2;
    list[3].s += 2;
  }

  list.sort((a,b) => {
    if(a.bad !== b.bad) return a.bad ? 1 : -1;
    return b.s - a.s;
  });

  document.getElementById("candidates").innerHTML = list.map(x => {
    const score = Math.max(0, Math.min(5, x.s));
    const stars = "★".repeat(score) + "☆".repeat(5-score);

    return `
      <div class="result-line">
        <b>${x.n}</b>
        <span class="tag ${x.bad ? "impossible" : "possible"}">
          ${x.bad ? "불가능" : stars}
        </span>
      </div>
    `;
  }).join("");
}

function renderPrompts(){
  const p = [];

  if(checked("diffChild")) p.push("우성과 열성을 판단하시오.");
  if(checked("hetero")) p.push("이형접합인 사람의 표현형을 판단하시오.");
  if(checked("sexRatio") || checked("geneAmount")) p.push("이 형질이 반성유전인지 판단하시오.");
  if(checked("recessiveFemale")) p.push("X 염색체 열성 유전이 가능한지 판단하시오.");
  if(checked("motherSonDiff") || checked("fatherDaughterDiff")) p.push("반성유전을 부정하는 근거를 찾으시오.");
  if(checked("parentsOneAllele")) p.push("부모의 대립유전자 조건으로 자녀 표현형을 해석하시오.");

  if(!p.length) p.push("조건을 선택하면 추천 발문이 자동 표시됩니다.");

  document.getElementById("prompts").innerHTML = p.map(x => `<li>${x}</li>`).join("");
}

function render(){
  renderExamples();
  drawPedigree();
  renderLogic();
  renderSummary();
  renderCandidates();
  renderPrompts();
}

function downloadSVG(){
  const svg = document.getElementById("pedigree");
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], {type:"image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "genetic-pedigree.svg";
  a.click();

  URL.revokeObjectURL(url);
}

render();