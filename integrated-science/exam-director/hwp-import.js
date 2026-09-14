(function(){
  "use strict";
  // 본 제품은 한컴의 HWP 문서 파일(.hwp) 공개 문서를 참고하여 개발하였습니다.

  const FREE=0xffffffff,END=0xfffffffe,CIRCLED="①②③④⑤";
  const readName=(bytes,offset,length)=>new TextDecoder("utf-16le").decode(bytes.subarray(offset,offset+Math.max(0,length-2)));
  const joinBytes=(parts,size=Infinity)=>{const length=Math.min(size,parts.reduce((sum,part)=>sum+part.length,0)),out=new Uint8Array(length);let offset=0;for(const part of parts){if(offset>=length)break;const take=Math.min(part.length,length-offset);out.set(part.subarray(0,take),offset);offset+=take;}return out;};

  class CompoundFile{
    constructor(buffer){
      this.bytes=new Uint8Array(buffer);this.view=new DataView(buffer);
      if(Array.from(this.bytes.subarray(0,8)).map(value=>value.toString(16).padStart(2,"0")).join("")!=="d0cf11e0a1b11ae1")throw new Error("HWP 5.0 파일이 아닙니다.");
      this.sectorSize=1<<this.u16(30);this.miniSectorSize=1<<this.u16(32);this.cutoff=this.u32(56);
      const difat=[];for(let i=0;i<109;i++){const sector=this.u32(76+i*4);if(sector!==FREE)difat.push(sector);}
      let next=this.u32(68);for(let count=this.u32(72);count>0&&next!==END;count--){const offset=this.sectorOffset(next),last=this.sectorSize/4-1;for(let i=0;i<last;i++){const sector=this.u32(offset+i*4);if(sector!==FREE)difat.push(sector);}next=this.u32(offset+last*4);}
      this.fat=[];for(const sector of difat){const offset=this.sectorOffset(sector);for(let i=0;i<this.sectorSize/4;i++)this.fat.push(this.u32(offset+i*4));}
      const directory=this.readRegular(this.u32(48));this.entries=[];
      for(let offset=0;offset+128<=directory.length;offset+=128){const view=new DataView(directory.buffer,directory.byteOffset+offset,128),nameLength=view.getUint16(64,true);this.entries.push({id:offset/128,name:nameLength>=2?readName(directory,offset,nameLength):"",type:directory[offset+66],left:view.getUint32(68,true),right:view.getUint32(72,true),child:view.getUint32(76,true),start:view.getUint32(116,true),size:Number(view.getBigUint64(120,true)),path:""});}
      this.visit(this.entries[0]?.child??FREE,"");
      const root=this.entries.find(entry=>entry.type===5);if(!root)throw new Error("HWP 저장소를 읽지 못했습니다.");
      this.miniStream=this.readRegular(root.start,root.size);const miniFat=this.readRegular(this.u32(60),this.u32(64)*this.sectorSize);this.miniTable=[];const miniView=new DataView(miniFat.buffer,miniFat.byteOffset,miniFat.byteLength);for(let offset=0;offset+4<=miniFat.length;offset+=4)this.miniTable.push(miniView.getUint32(offset,true));
    }
    u16(offset){return this.view.getUint16(offset,true)}
    u32(offset){return this.view.getUint32(offset,true)}
    sectorOffset(sector){return(sector+1)*this.sectorSize}
    chain(start,table=this.fat){const result=[];let sector=start;while(sector!==END&&sector!==FREE&&sector<table.length&&result.length<100000){result.push(sector);sector=table[sector];}return result;}
    readRegular(start,size=Infinity){return joinBytes(this.chain(start).map(sector=>this.bytes.subarray(this.sectorOffset(sector),this.sectorOffset(sector)+this.sectorSize)),size)}
    visit(id,parent){if(id===FREE||id>=this.entries.length)return;const entry=this.entries[id];this.visit(entry.left,parent);entry.path=entry.type===5?"":`${parent}/${entry.name}`;if(entry.child!==FREE)this.visit(entry.child,entry.path);this.visit(entry.right,parent);}
    stream(entry){if(entry.size<this.cutoff){const parts=this.chain(entry.start,this.miniTable).map(sector=>this.miniStream.subarray(sector*this.miniSectorSize,(sector+1)*this.miniSectorSize));return joinBytes(parts,entry.size);}return this.readRegular(entry.start,entry.size);}
  }

  async function inflateRaw(bytes){
    if(typeof DecompressionStream!=="function")throw new Error("이 브라우저는 HWP 압축 해제를 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용하세요.");
    for(let trim=0;trim<=Math.min(128,bytes.length-1);trim++){try{const source=trim?bytes.subarray(0,bytes.length-trim):bytes,stream=new Blob([source]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return new Uint8Array(await new Response(stream).arrayBuffer());}catch(error){if(trim===Math.min(128,bytes.length-1))throw new Error("HWP 본문 압축을 풀지 못했습니다.");}}
  }

  function paragraphText(bytes){const units=[];for(let offset=0;offset+1<bytes.length;){const code=bytes[offset]|bytes[offset+1]<<8;offset+=2;if(code<32){if([1,2,3,4,5,6,7,8,11,12,14,15,16,17,18,19,20,21,22,23].includes(code))offset+=14;else if(code===9||code===10||code===13)units.push(10);continue;}units.push(code);}return String.fromCharCode(...units);}

  async function extractText(buffer){
    const cfb=new CompoundFile(buffer),header=cfb.entries.find(entry=>entry.name==="FileHeader");if(!header)throw new Error("HWP 파일 헤더가 없습니다.");
    const headerBytes=cfb.stream(header),headerView=new DataView(headerBytes.buffer,headerBytes.byteOffset,headerBytes.byteLength),compressed=Boolean(headerView.getUint32(36,true)&1);
    const sections=cfb.entries.filter(entry=>/^Section\d+$/.test(entry.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));if(!sections.length)throw new Error("HWP 본문을 찾지 못했습니다.");
    const paragraphs=[];
    for(const section of sections){let bytes=cfb.stream(section);if(compressed)bytes=await inflateRaw(bytes);const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let offset=0;offset+4<=bytes.length;){const record=view.getUint32(offset,true);offset+=4;const tag=record&0x3ff;let size=record>>>20;if(size===0xfff){if(offset+4>bytes.length)break;size=view.getUint32(offset,true);offset+=4;}if(offset+size>bytes.length)break;if(tag===67)paragraphs.push(paragraphText(bytes.subarray(offset,offset+size)));offset+=size;}}
    return paragraphs.join("\n");
  }

  function parseQuestions(text){
    const start=text.search(/(?:^|\n)\s*01번/);if(start<0)throw new Error("01번 문항 머리말을 찾지 못했습니다.");
    const header=/^\s*(\d{2})번[^①-⑤\r\n]*([①-⑤])\s*[-–—]\s*([^()\r\n]+?)\s*\(\s*(\d+(?:\.\d+)?)\s*(?:점)?\s*\)/gm,questions=[];
    for(const match of text.slice(start).matchAll(header))questions.push({number:Number(match[1]),answer:CIRCLED.indexOf(match[2])+1,answerSymbol:match[2],type:match[3].trim(),score:Number(match[4])});
    return questions.sort((a,b)=>a.number-b.number);
  }

  const recordList=bytes=>{const result=[],view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let offset=0;offset+4<=bytes.length;){const record=view.getUint32(offset,true);offset+=4;const tag=record&0x3ff,level=record>>>10&0x3ff;let size=record>>>20;if(size===0xfff){if(offset+4>bytes.length)break;size=view.getUint32(offset,true);offset+=4;}if(offset+size>bytes.length)break;result.push({tag,level,data:bytes.subarray(offset,offset+size)});offset+=size;}return result;};
  const isMemoControl=data=>data.length>=4&&data[0]===0x6b&&data[1]===0x6e&&data[2]===0x75&&data[3]===0x25;
  const cellText=cell=>cell.texts.join("\n").trim();

  async function parseLayout(file){
    if(!file||!/\.hwp$/i.test(file.name))throw new Error(".hwp 파일을 선택하세요.");
    const cfb=new CompoundFile(await file.arrayBuffer()),header=cfb.entries.find(entry=>entry.name==="FileHeader");
    if(!header)throw new Error("HWP 파일 헤더가 없습니다.");
    const headerBytes=cfb.stream(header),headerView=new DataView(headerBytes.buffer,headerBytes.byteOffset,headerBytes.byteLength),compressed=Boolean(headerView.getUint32(36,true)&1);
    const sections=cfb.entries.filter(entry=>/^Section\d+$/.test(entry.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
    const tables=[],memoBlocks=[],memoAnchors=[];let currentTable=null,currentCell=null,currentMemo=null;
    for(const section of sections){
      let bytes=cfb.stream(section);if(compressed)bytes=await inflateRaw(bytes);
      for(const record of recordList(bytes)){
        const {tag,level,data}=record;
        if(tag===77&&level===2&&data.length>=8){
          const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
          currentTable={index:tables.length,rowCount:view.getUint16(4,true),colCount:view.getUint16(6,true),cells:[]};tables.push(currentTable);currentCell=null;currentMemo=null;
        }else if(tag===72&&level===2&&data.length>=30&&currentTable){
          const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
          currentCell={id:`T${currentTable.index}-R${view.getUint16(10,true)}-C${view.getUint16(8,true)}`,table:currentTable.index,col:view.getUint16(8,true),row:view.getUint16(10,true),colSpan:Math.max(1,view.getUint16(12,true)),rowSpan:Math.max(1,view.getUint16(14,true)),texts:[],images:[],memos:[]};
          currentTable.cells.push(currentCell);currentMemo=null;
        }else if(tag===72&&level===1&&data.length===16&&tables.length){
          currentCell=null;currentMemo={texts:[]};memoBlocks.push(currentMemo);
        }else if(tag===67){
          const text=paragraphText(data).replace(/[ \t]+/g," ").trim();
          if(text&&currentCell)currentCell.texts.push(text);else if(text&&currentMemo)currentMemo.texts.push(text);
        }else if(tag===85&&currentCell&&data.length>=73){
          const id=new DataView(data.buffer,data.byteOffset,data.byteLength).getUint16(71,true);if(id&&!currentCell.images.includes(id))currentCell.images.push(id);
        }else if(tag===71&&currentCell&&isMemoControl(data))memoAnchors.push(currentCell);
      }
    }
    if(!tables.length||!tables.some(table=>table.colCount>1))throw new Error("회차 비교 표를 찾지 못했습니다.");
    memoAnchors.forEach((cell,index)=>{const text=memoBlocks[index]?.texts.join("\n").trim();if(text)cell.memos.push(text);});
    const first=tables[0],headerCells=first.cells.filter(cell=>cell.row===0),columnCount=Math.max(1,first.colCount-1),columns=Array.from({length:columnCount},(_,index)=>cellText(headerCells.find(cell=>cell.col===index+1)||{texts:[]})||`${index+1}회`);
    const rows=[];
    tables.forEach((table,tableIndex)=>{for(let row=tableIndex===0?1:0;row<table.rowCount;row++){const cells=table.cells.filter(cell=>cell.row===row).sort((a,b)=>a.col-b.col);if(cells.length)rows.push({id:`T${tableIndex}-R${row}`,table:tableIndex,row,cells});}});
    const allCells=tables.flatMap(table=>table.cells),imageCount=allCells.reduce((sum,cell)=>sum+cell.images.length,0),memoCount=allCells.reduce((sum,cell)=>sum+cell.memos.length,0),urls=new Map(),blobs=new Map(),copyUrls=new Map(),binEntries=new Map();
    cfb.entries.filter(entry=>/^BIN[0-9A-F]{4}\./i.test(entry.name)).forEach(entry=>binEntries.set(entry.name.slice(0,7).toUpperCase(),entry));
    async function getImageBlob(id){
      if(blobs.has(id))return blobs.get(id);
      const key=`BIN${Number(id).toString(16).padStart(4,"0").toUpperCase()}`,entry=binEntries.get(key);if(!entry)throw new Error(`${key} 이미지를 찾지 못했습니다.`);
      let bytes=cfb.stream(entry),mime=/\.png$/i.test(entry.name)?"image/png":/\.jpe?g$/i.test(entry.name)?"image/jpeg":/\.gif$/i.test(entry.name)?"image/gif":"image/bmp";
      const known=bytes[0]===0x89&&bytes[1]===0x50||bytes[0]===0xff&&bytes[1]===0xd8||bytes[0]===0x42&&bytes[1]===0x4d||bytes[0]===0x47&&bytes[1]===0x49;
      if(!known)bytes=await inflateRaw(bytes);
      if(bytes[0]===0x42&&bytes[1]===0x4d)mime="image/bmp";
      const blob=new Blob([bytes],{type:mime});blobs.set(id,blob);return blob;
    }
    async function getImageUrl(id){if(urls.has(id))return urls.get(id);const url=URL.createObjectURL(await getImageBlob(id));urls.set(id,url);return url;}
    const blobToDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
    async function getImageCopyUrl(id){
      if(copyUrls.has(id))return copyUrls.get(id);
      const blob=await getImageBlob(id);let dataUrl;
      try{
        const bitmap=await createImageBitmap(blob),scale=Math.min(1,600/bitmap.width),canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        canvas.getContext("2d",{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
        const png=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("이미지 변환 실패")),"image/png"));dataUrl=await blobToDataUrl(png);
      }catch{dataUrl=await blobToDataUrl(blob);}
      copyUrls.set(id,dataUrl);return dataUrl;
    }
    return{name:file.name.replace(/\.hwp$/i,""),columns,rows,tables,cells:allCells,imageCount,memoCount,getImageUrl,getImageCopyUrl,dispose(){urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();blobs.clear();copyUrls.clear();}};
  }

  async function parse(file){if(!file||!/\.hwp$/i.test(file.name))throw new Error(".hwp 파일을 선택하세요.");return parseQuestions(await extractText(await file.arrayBuffer()));}
  window.HwpQuickImport={parse,parseLayout};
})();
