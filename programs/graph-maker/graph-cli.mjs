#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {rpc} from './tool-api.mjs';
import {renderGraph} from './graph-core.mjs';
const args=process.argv.slice(2);
if(args[0]==='--stdio'){
 const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
 for await(const line of lines){if(!line.trim())continue;let response;try{if(Buffer.byteLength(line)>250000)throw new Error('Request too large');response=rpc(JSON.parse(line));}catch(e){response={jsonrpc:'2.0',id:null,error:{code:-32700,message:e.message}};}if(response)process.stdout.write(JSON.stringify(response)+'\n');}
}else if(args.length===2){
 try{const input=await readFile(args[0],'utf8');if(Buffer.byteLength(input)>250000)throw new Error('작업 파일은 250 KB 이내여야 합니다.');const r=renderGraph(JSON.parse(input));await writeFile(args[1],r.svg,{encoding:'utf8',flag:'wx'});process.stderr.write(JSON.stringify({output:args[1],warnings:r.warnings,regressions:r.regressions})+'\n');}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}else{process.stderr.write('Usage: node graph-cli.mjs input.json output.svg\n       node graph-cli.mjs --stdio\n기존 출력 파일은 덮어쓰지 않습니다.\n');process.exitCode=1;}
