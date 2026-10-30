"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),vm=require("node:vm"),{spawnSync}=require("node:child_process");
const appDir=path.resolve(__dirname,".."),{readSearchIndex}=require("../search-index-files.js");
const data=readSearchIndex(path.join(appDir,"data/search-index.json"));
const catalog=JSON.parse(fs.readFileSync(path.join(appDir,"reference/type-catalog.json"),"utf8"));
function browser(){
  const context=vm.createContext({console,URL,data,catalog,document:{addEventListener(){},createElement(){return {}}},window:{addEventListener(){}}});
  vm.runInContext(fs.readFileSync(path.join(appDir,"app.js"),"utf8"),context);
  vm.runInContext(`
    state.data=data;state.catalog=catalog;state.ready=true;
    el.searchInput={value:""};el.subjectFilter={value:""};el.typeFilter={value:"",replaceChildren(...nodes){this.options=nodes;this.value=""}};
    el.gradeFilter={value:""};el.evaluationOnly={checked:false};el.sortSelect={value:"relevance"};el.resultCount={};
    render=()=>{};
  `,context);
  return {
    run(expression){return JSON.parse(JSON.stringify(vm.runInContext(expression,context)))},
    query(text,subject="",type=""){
      context.queryText=text;context.selectedSubject=subject;context.selectedType=type;
      return this.run('el.searchInput.value=queryText;el.subjectFilter.value=selectedSubject;el.typeFilter.value=selectedType;search(false);state.results.map(row=>row.i)');
    }
  };
}

test("all 6,160 II questions are reachable through the 86 confirmed type filters",()=>{
  const b=browser(),expected={"물리학Ⅱ":24,"화학Ⅱ":20,"생명과학Ⅱ":17,"지구과학Ⅱ":25};
  let total=0;
  for(const [subject,count] of Object.entries(expected)){
    assert.equal(catalog[subject].length,count);
    const rows=data.filter(r=>r.s===subject);assert.equal(rows.length,1540);
    assert.ok(rows.every(r=>catalog[subject].includes(r.t)));
    b.query("",subject);
    const options=b.run('buildTypeOptions();el.typeFilter.options.map(option=>option.value)');
    assert.deepEqual(options,["",...catalog[subject]]);
    for(const type of catalog[subject]){
      const results=b.query("",subject,type).sort();
      assert.deepEqual(results,rows.filter(r=>r.t===type).map(r=>r.i).sort());
      assert.ok(results.length>0);total+=results.length;
    }
  }
  assert.equal(total,6160);
});

test("II keyword searches, legacy topics, and Roman-numeral question IDs resolve against the real index",()=>{
  const b=browser();
  for(const [query,subject] of [["물리2 트랜지스터","물리학Ⅱ"],["화학Ⅱ 총괄성","화학Ⅱ"],["생명 II DNA 복제","생명과학Ⅱ"],["지구2 조석","지구과학Ⅱ"],["물리2 구교육과정","물리학Ⅱ"]]){
    const ids=b.query(query);assert.ok(ids.length>0,query);const allowed=new Set(data.filter(r=>r.s===subject).map(r=>r.i));assert.ok(ids.every(id=>allowed.has(id)));
  }
  assert.deepEqual(b.query("3MⅡ260901"),["3MⅡ260901"]);
  assert.deepEqual(b.query("3MII260901"),["3MⅡ260901"]);
  assert.deepEqual(b.query("3M260901"),["3M260901"]);
  const old=b.query("물리1");assert.ok(old.length>0);assert.ok(old.every(id=>!id.includes("Ⅱ")));
  assert.deepEqual(b.run('typeOptions("물리학",["추가 유형"])'),[...new Set([...catalog["물리학"],"추가 유형"])].sort((a,b)=>a.localeCompare(b,"ko")));
});

test("rebuild uses the confirmed II map for unclassified inputs while preserving explicit and existing I classifications",t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"jb-type-build-test-"));
  t.after(()=>{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith("jb-type-build-test-"));fs.rmSync(root,{recursive:true,force:true})});
  for(const file of ["build-index.js","search-index-files.js"])fs.copyFileSync(path.join(appDir,file),path.join(root,file));
  fs.mkdirSync(path.join(root,"reference"));fs.mkdirSync(path.join(root,"input"));
  const rows=[
    {id:"3MⅡ260901",subject:"물리학Ⅱ",type:"미분류"},
    {id:"3MⅡ260902",subject:"물리학Ⅱ",type:""},
    {id:"3MⅡ260903",subject:"물리학Ⅱ",type:"  "},
    {id:"3MⅡ260904",subject:"물리학Ⅱ",type:"사용자가 지정한 유형"},
    {id:"3MⅡ260905",subject:"물리학Ⅱ",type:"미분류"},
    {id:"3M260901",subject:"물리학",type:"미분류"},
    {id:"3M260902",subject:"물리학",type:""}
  ].map((r,i)=>({...r,grade:"고3",year:26,month:9,number:i+1,prompt:"문제 본문",answer:"2",explanation:"원본 해설"}));
  const map=Object.fromEntries(rows.filter(r=>r.id!=="3MⅡ260905").map(r=>[r.id,"트랜지스터"]));
  fs.writeFileSync(path.join(root,"reference/type-map.json"),JSON.stringify(map));
  fs.writeFileSync(path.join(root,"input/chunk_1000.ndjson"),rows.map(JSON.stringify).join("\n"));
  const result=spawnSync(process.execPath,[path.join(root,"build-index.js"),path.join(root,"input")],{encoding:"utf8"});assert.equal(result.status,0,result.stderr);
  const output=readSearchIndex(path.join(root,"data/search-index.json"));
  assert.deepEqual(output.map(r=>r.t),["트랜지스터","트랜지스터","트랜지스터","사용자가 지정한 유형","미분류","미분류","트랜지스터"]);
  assert.ok(output.slice(0,3).every(r=>r.x.includes("트랜지스터")));
  const details=JSON.parse(fs.readFileSync(path.join(root,"data/details/chunk_1000.json"),"utf8"));
  assert.ok(details.every(r=>r.answer==="2"&&r.explanation==="원본 해설"));
});
