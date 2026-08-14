#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path");
const inputDir=path.resolve(process.argv[2]||path.join(__dirname,"..","..","data"));
const outputDir=path.join(__dirname,"data"),detailDir=path.join(outputDir,"details");
const typeMapPath=path.join(__dirname,"reference","type-map.json");
const typeMap=fs.existsSync(typeMapPath)?JSON.parse(fs.readFileSync(typeMapPath,"utf8")):{};
const TYPE_ALIASES={"물리학|반도체":"에너지띠와 반도체","생명과학|방어 작용":"방어 작용 (면역)","생명과학|사람의 유전":"사람의 유전 (단일 인자/다인자)","생명과학|항상성 유지":"항상성 유지 (호르몬과 삼투압)"};
function canonicalType(subject,type){const value=String(type||"미분류").trim()||"미분류";return TYPE_ALIASES[`${subject}|${value}`]||value}
function normalize(value){return String(value||"").replace(/[Ⅰⅰ]/g,"1").normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/(물리학|화학|생명과학|지구과학)\s*(?:1|i)\b/g,"$1").replace(/\s+/g," ").trim()}
function clean(value){return typeof value==="string"?value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,""):value}
function sourceYear(row){const year=Number(row.year)||0,month=Number(row.month)||0;return row.grade==="고3"&&![6,9,11].includes(month)?year-1:year}
function localUrls(row){
  const pdfKey=String(row.id||"").slice(0,6),base=`../exam-search/data/${row.grade} 기출/${row.subject}`;
  return{image:`${base}/문제 이미지 파일/${row.imageName||`${row.id}.png`}`,problem:`${base}/${pdfKey}.pdf`,solution:`${base}/${pdfKey} 해설.pdf`};
}
const sourceFiles=fs.readdirSync(inputDir).filter(name=>/^chunk_\d+\.ndjson$/.test(name)).sort();
if(!sourceFiles.length){console.error(`NDJSON 파일을 찾지 못했습니다: ${inputDir}`);console.error("사용법: node build-index.js /문항DB/chunk_파일_폴더");process.exit(1)}
fs.mkdirSync(detailDir,{recursive:true});
for(const oldFile of fs.readdirSync(detailDir))if(oldFile.endsWith(".json"))fs.unlinkSync(path.join(detailDir,oldFile));
const searchIndex=[];let total=0;
for(const sourceFile of sourceFiles){
  const shardName=path.basename(sourceFile,".ndjson");
  const lines=fs.readFileSync(path.join(inputDir,sourceFile),"utf8").split(/\r?\n/).filter(line=>line.trim());
  const details=lines.map(line=>{
    const row=Object.fromEntries(Object.entries(JSON.parse(line)).map(([key,value])=>[key,clean(value)]));
    const local=localUrls(row);
    return{id:row.id,grade:row.grade,subject:row.subject,year:row.year,month:row.month,sourceYear:sourceYear(row),exam:row.exam,number:row.number,type:canonicalType(row.subject,typeMap[row.id]||row.type),prompt:row.prompt,view:row.view,choices:[row.c1,row.c2,row.c3,row.c4,row.c5],answer:row.answer,explanation:row.explanation,imageName:row.imageName,imageUrl:row.imageUrl,problemUrl:row.problemUrl,solutionUrl:row.solutionUrl,localImageUrl:local.image,localProblemUrl:local.problem,localSolutionUrl:local.solution,status:row.status};
  });
  details.forEach((row,rowIndex)=>{
    const storedLabel=`${String(row.year).padStart(2,"0")} ${String(row.month).padStart(2,"0")} ${row.grade} ${row.subject}`;
    const sourceLabel=`${String(row.sourceYear).padStart(2,"0")} ${String(row.month).padStart(2,"0")} ${row.grade} ${row.subject}`;
    searchIndex.push({i:row.id,g:row.grade,s:row.subject,y:Number(row.year)||0,sy:Number(row.sourceYear)||0,m:Number(row.month)||0,e:row.exam,n:row.number,t:row.type||"",q:String(row.prompt||"").replace(/\s+/g," ").trim().slice(0,260),st:row.status,im:row.imageUrl||"",lim:row.localImageUrl,p:row.problemUrl||"",lp:row.localProblemUrl,sol:row.solutionUrl||"",lsol:row.localSolutionUrl,d:shardName,r:rowIndex,x:normalize([row.id,row.grade,row.subject,row.exam,storedLabel,sourceLabel,`${String(row.year).padStart(2,"0")}${String(row.month).padStart(2,"0")}`,`${String(row.sourceYear).padStart(2,"0")}${String(row.month).padStart(2,"0")}`,row.number,`${row.number}번`,`${String(row.number).padStart(2,"0")}번`,row.type,row.prompt,row.view,...row.choices,row.answer,row.explanation].filter(Boolean).join(" "))});
  });
  fs.writeFileSync(path.join(detailDir,`${shardName}.json`),JSON.stringify(details));total+=details.length;
}
fs.writeFileSync(path.join(outputDir,"search-index.json"),JSON.stringify(searchIndex));
console.log(`검색 데이터 생성 완료: ${total.toLocaleString("ko-KR")}문항 / ${sourceFiles.length}개 상세 묶음`);
