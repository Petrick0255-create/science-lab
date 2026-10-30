"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const FORMAT="jb-search-index-v1",MAX_PART_BYTES=4*1024*1024;
const PART_FILE=/^search-index\/part-\d+-[a-f0-9]{12}\.json$/;

function readSearchIndex(indexPath){
  if(!fs.existsSync(indexPath))return [];
  const index=JSON.parse(fs.readFileSync(indexPath,"utf8"));
  if(Array.isArray(index))return index;
  if(index.format!==FORMAT||!Array.isArray(index.parts))throw new Error("지원하지 않는 검색 색인 형식입니다.");
  const rows=index.parts.flatMap(part=>{
    if(!PART_FILE.test(part.file))throw new Error(`잘못된 검색 묶음 경로: ${part.file}`);
    const data=JSON.parse(fs.readFileSync(path.join(path.dirname(indexPath),part.file),"utf8"));
    if(!Array.isArray(data)||data.length!==part.count)throw new Error(`검색 묶음 문항 수 불일치: ${part.file}`);
    return data;
  });
  if(rows.length!==index.count)throw new Error("전체 검색 문항 수가 일치하지 않습니다.");
  return rows;
}

function writeSearchIndex(outputDir,rows,maxPartBytes=MAX_PART_BYTES){
  const indexPath=path.join(outputDir,"search-index.json");
  const previous=fs.existsSync(indexPath)?JSON.parse(fs.readFileSync(indexPath,"utf8")):null;
  const chunks=[];let entries=[],bytes=2;
  for(const row of rows){
    const text=JSON.stringify(row),size=Buffer.byteLength(text,"utf8");
    if(size+2>maxPartBytes)throw new Error(`문항 하나가 검색 묶음 크기를 초과합니다: ${row.i}`);
    if(entries.length&&bytes+size+1>maxPartBytes){chunks.push(entries);entries=[];bytes=2;}
    bytes+=size+(entries.length?1:0);entries.push(text);
  }
  if(entries.length)chunks.push(entries);
  fs.mkdirSync(path.join(outputDir,"search-index"),{recursive:true});
  const parts=chunks.map((chunk,i)=>{
    const data=`[${chunk.join(",")}]`,hash=crypto.createHash("sha256").update(data).digest("hex").slice(0,12);
    const file=`search-index/part-${String(i).padStart(3,"0")}-${hash}.json`;
    fs.writeFileSync(path.join(outputDir,file),data);
    return {file,count:chunk.length,bytes:Buffer.byteLength(data,"utf8")};
  });
  const manifest={format:FORMAT,count:rows.length,parts};
  fs.writeFileSync(indexPath,JSON.stringify(manifest,null,2)+"\n");
  const current=new Set(parts.map(part=>part.file));
  for(const part of previous?.parts||[]){
    if(PART_FILE.test(part.file)&&!current.has(part.file))fs.rmSync(path.join(outputDir,part.file),{force:true});
  }
  return manifest;
}

module.exports={FORMAT,MAX_PART_BYTES,readSearchIndex,writeSearchIndex};
