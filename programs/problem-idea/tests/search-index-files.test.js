"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),vm=require("node:vm"),{spawnSync}=require("node:child_process");
const {readSearchIndex,writeSearchIndex}=require("../search-index-files.js");
const appDir=path.resolve(__dirname,"..");
function temporary(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"jb-search-index-test-"));
  t.after(()=>{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith("jb-search-index-test-"));fs.rmSync(root,{recursive:true,force:true})});
  return root;
}
function browser(fetch){
  const context=vm.createContext({URL,fetch,console,document:{addEventListener(){}},window:{location:{href:"https://example.test/programs/problem-idea/"},addEventListener(){}}});
  vm.runInContext(fs.readFileSync(path.join(appDir,"app.js"),"utf8"),context);
  return ()=>vm.runInContext("loadSearchIndex()",context);
}
test("UTF-8 byte limits, order, legacy files, and obsolete part cleanup",t=>{
  const root=temporary(t),indexPath=path.join(root,"search-index.json");
  const rows=Array.from({length:30},(_,i)=>({i:`3MⅡ2609${i}`,x:"수소 결합·불확정성 ".repeat(8)}));
  fs.writeFileSync(indexPath,JSON.stringify(rows));assert.deepEqual(readSearchIndex(indexPath),rows);
  const first=writeSearchIndex(root,rows,1100);assert.ok(first.parts.length>1);
  for(const part of first.parts)assert.ok(fs.statSync(path.join(root,part.file)).size<=1100);
  assert.deepEqual(readSearchIndex(indexPath),rows);
  const second=writeSearchIndex(root,rows.slice(0,7),1100),remaining=new Set(second.parts.map(p=>p.file));
  for(const p of first.parts)assert.equal(fs.existsSync(path.join(root,p.file)),remaining.has(p.file));
  const before=fs.readFileSync(indexPath,"utf8");
  assert.throws(()=>writeSearchIndex(root,[{i:"oversize",x:"가".repeat(1000)}],1100));
  assert.equal(fs.readFileSync(indexPath,"utf8"),before);
});
test("browser loads all parts in manifest order and supports a legacy array",async t=>{
  const root=temporary(t),rows=[{i:"3M260901"},{i:"3MⅡ260901"},{i:"3HⅡ260901"}];
  writeSearchIndex(root,rows,45);
  const calls=[];
  const load=browser(async url=>{
    const resolved=new URL(url,"https://example.test/programs/problem-idea/");calls.push(resolved.pathname);
    return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,resolved.pathname.replace("/programs/problem-idea/data/","")),"utf8"))};
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await load())),rows);assert.ok(calls.length>2);
  assert.deepEqual(JSON.parse(JSON.stringify(await browser(async()=>({ok:true,json:async()=>rows}))())),rows);
});
test("browser rejects missing or incomplete parts instead of showing partial results",async()=>{
  const manifest={format:"jb-search-index-v1",count:2,parts:[{file:"search-index/a.json",count:2}]};
  await assert.rejects(browser(async url=>String(url).endsWith("search-index.json")?{ok:true,json:async()=>manifest}:{ok:false,status:404})(),/404/);
  await assert.rejects(browser(async url=>({ok:true,json:async()=>String(url).endsWith("search-index.json")?manifest:[{i:"one"}]}))(),/문항 수/);
});
test("append build preserves existing records and detail files; duplicates fail before writing",t=>{
  const root=temporary(t),data=path.join(root,"data"),details=path.join(data,"details"),input=path.join(root,"input");
  fs.mkdirSync(details,{recursive:true});fs.mkdirSync(input);
  for(const f of ["build-index.js","search-index-files.js"])fs.copyFileSync(path.join(appDir,f),path.join(root,f));
  const original={i:"3M260901",x:"기존 검색 본문",d:"chunk_000",r:0};writeSearchIndex(data,[original]);
  fs.writeFileSync(path.join(details,"chunk_000.json"),'[{"original":true}]');
  fs.writeFileSync(path.join(input,"chunk_1000.ndjson"),JSON.stringify({id:"3MⅡ260901",grade:"고3",subject:"물리학Ⅱ",year:26,month:9,number:1,prompt:"불확정성 원리",answer:"2",explanation:"위치와 운동량",imageName:"3MⅡ260901.png"}));
  const run=()=>spawnSync(process.execPath,[path.join(root,"build-index.js"),input,"--append"],{encoding:"utf8"});
  let result=run();assert.equal(result.status,0,result.stderr);
  const rows=readSearchIndex(path.join(data,"search-index.json"));assert.equal(rows.length,2);assert.deepEqual(rows[0],original);assert.ok(rows[1].lp.endsWith("3MⅡ2609.pdf"));
  assert.equal(fs.readFileSync(path.join(details,"chunk_000.json"),"utf8"),'[{"original":true}]');
  const manifestBefore=fs.readFileSync(path.join(data,"search-index.json"),"utf8");
  result=run();assert.notEqual(result.status,0);assert.equal(fs.readFileSync(path.join(data,"search-index.json"),"utf8"),manifestBefore);
});
