import {rpc,PROTOCOLS} from './programs/graph-maker/tool-api.mjs';
import {renderGraph,VERSION} from './programs/graph-maker/graph-core.mjs';
const ROOT='/programs/graph-maker/';
const LIMIT=250000;
async function readBody(request){
 if(Number(request.headers.get('Content-Length'))>LIMIT)throw new Error('Request too large');
 const reader=request.body?.getReader();if(!reader)throw new Error('Empty body');let bytes=0,parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>LIMIT){await reader.cancel();throw new Error('Request too large');}parts.push(value);}
 const all=new Uint8Array(bytes);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
}
export default {async fetch(request,env){
 const url=new URL(request.url),isMcp=url.pathname===ROOT+'mcp';
 if(!isMcp&&!url.pathname.startsWith(ROOT+'api/'))return env.ASSETS.fetch(request);
 const origin=request.headers.get('Origin');const allowed=!origin||[url.origin,'https://claude.ai','https://claude.com'].includes(origin);
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(allowed&&origin?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name','Access-Control-Max-Age':'600'};
 const reply=(body,status=200)=>new Response(body===null?null:JSON.stringify(body),{status,headers});
 if(!allowed)return reply({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return reply(null,204);
 if(url.pathname===ROOT+'api/health'&&request.method==='GET')return reply({ok:true,version:VERSION,tools:3});
 if(request.method!=='POST')return new Response(JSON.stringify({error:'Use POST with a JSON body'}),{status:405,headers:{...headers,Allow:'POST, OPTIONS'}});
 if(!request.headers.get('Content-Type')?.toLowerCase().includes('application/json'))return reply({error:'Content-Type must be application/json'},415);
 let body;try{body=await readBody(request);}catch(e){return reply(isMcp?{jsonrpc:'2.0',id:null,error:{code:-32700,message:e.message}}:{error:e.message},e.message==='Request too large'?413:400);}
 if(isMcp){
   const version=request.headers.get('MCP-Protocol-Version'),metaVersion=body?.params?._meta?.['io.modelcontextprotocol/protocolVersion'];
   if(version&&!PROTOCOLS.includes(version))return reply({jsonrpc:'2.0',id:body?.id??null,error:{code:-32022,message:'Unsupported protocol version',data:{supported:PROTOCOLS,requested:version}}},400);
   if(version==='2026-07-28'||metaVersion==='2026-07-28'){
     let name=request.headers.get('Mcp-Name');try{if(name?.startsWith('=?base64?')&&name.endsWith('?='))name=new TextDecoder().decode(Uint8Array.from(atob(name.slice(9,-2)),c=>c.charCodeAt(0)));}catch{name=null;}
     if(version!==metaVersion||request.headers.get('Mcp-Method')!==body?.method||(body?.method==='tools/call'&&name!==body?.params?.name))return reply({jsonrpc:'2.0',id:body?.id??null,error:{code:-32020,message:'Header mismatch or missing required header'}},400);
   }
   const response=rpc(body,url.origin+ROOT);if(response===null)return reply(null,202);
   return reply(response,response.error?(response.error.code===-32601?404:400):200);
 }
 if(url.pathname===ROOT+'api/render')try{const r=renderGraph(body);return reply(r);}catch(e){return reply({error:e.message},422);}
 return reply({error:'Not found'},404);
}};
