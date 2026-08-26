(function(){
  "use strict";

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

  async function parse(file){if(!file||!/\.hwp$/i.test(file.name))throw new Error(".hwp 파일을 선택하세요.");return parseQuestions(await extractText(await file.arrayBuffer()));}
  window.HwpQuickImport={parse};
})();
