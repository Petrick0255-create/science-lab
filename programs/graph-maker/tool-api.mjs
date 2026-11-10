import {renderGraph,encodeSpec,VERSION} from './graph-core.mjs';
import {PRESETS,getPreset} from './presets.mjs';
import schema from './graph-schema.json' with {type:'json'};
export const PROTOCOLS=['2026-07-28','2025-11-25','2025-06-18','2025-03-26'];
export const SERVER={name:'jnb-science-graph',version:VERSION};
export const INSTRUCTIONS='과학 문항용 흑백 그래프 도구입니다. 먼저 get_graph_guide로 규격과 예시를 확인하세요. 사용자 자료와 합성 예시를 구분하고 좌표를 임의로 관측값이라 부르지 마세요. render_graph가 SVG와 편집 링크를 반환합니다. validate_graph는 단위의 과학적 적합성까지 보증하지 않습니다. 그래프를 수정할 때 전체 spec을 다시 보내세요. 사용자가 연결한 도구를 우선 사용하고, 불가능하면 JSON 작업 파일을 제공합니다.';
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
export const TOOLS=[
 {name:'get_graph_guide',title:'그래프 규격과 예시',description:'과학 문항 그래프의 JSON 규격, 제작 규칙, 예시 목록과 선택한 예시를 가져옵니다. 첫 제작 전에 사용하세요.',annotations,inputSchema:{type:'object',properties:{preset:{type:'string',enum:PRESETS.map(p=>p.id)}},additionalProperties:false}},
 {name:'render_graph',title:'문항 그래프 생성',description:'지정한 좌표와 축 설정을 검증해 흑백 SVG와 편집 링크를 만듭니다. 다중 축, 시계열, 산점도, 실제 최소제곱 추세선, 음영과 기호 눈금을 지원합니다. 수치와 단위는 요청자가 결정합니다. 기존 그래프를 수정할 때도 전체 설정을 보내세요.',annotations,inputSchema:{type:'object',properties:{spec:schema,includeSvg:{type:'boolean',default:true}},required:['spec'],additionalProperties:false}},
 {name:'validate_graph',title:'그래프 설정 검사',description:'축 범위·좌표·추세선 계산 가능성을 검사하고 잘림·겹침 가능성을 알립니다. 과학적 인과관계나 문항 정답을 검증하는 도구는 아닙니다.',annotations,inputSchema:{type:'object',properties:{spec:schema},required:['spec'],additionalProperties:false}}
];
export function callTool(name,args={},base='https://science-lab1.parkjunbum0255.workers.dev/programs/graph-maker/'){
 if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('도구 인수는 객체여야 합니다.');
 if(name==='get_graph_guide')return {instructions:INSTRUCTIONS,rules:['수치 데이터는 points의 [x,y] 배열로 전달합니다.','각 series.axis는 0부터 시작하는 y축 번호입니다. 서로 다른 단위를 같은 축으로 혼합하지 마세요.','명조·흑백·얇은 선·선택적 눈금을 기본으로 사용합니다. 색 대신 선 종류와 점 모양을 구분합니다.','산점도에 trend:true를 지정하면 입력 좌표로 최소제곱 직선을 계산합니다. 추세선은 자료 x 범위 안에만 그립니다. 여러 자료를 합친 추세선은 합친 좌표로 marker:\'hidden\', trend:true인 자료를 하나 더 만듭니다. trendLine으로 추세선 모양을 바꿉니다.','힘-시간(충격량) 그래프처럼 0에서 올라갔다 내려오는 봉우리는 points 대신 peak:{from,to,max}로 만듭니다. 정규분포 모양이며 결과의 areas에 그래프 아래 넓이(충격량, 변위 등)가 나옵니다. 같은 모양이면 넓이는 max×(to−from)에 비례합니다.','한글 등 문서에 넣을 크기가 정해져 있으면 print:{widthMm, textPt, subPt}를 지정합니다. fontSize가 자동 계산되고 결과의 print에 실제 pt가 표시됩니다.','범례·단위 글자는 기본적으로 fontSize의 0.85~0.9배입니다. 본문과 같게 하려면 subFontSize(또는 print.subPt)를 지정합니다.','hline의 label 위치는 labelPos(right-above, right-below, left-above, left-below)로 정합니다. 글자·범례가 선이나 점과 겹치면 경고가 나오니 위치를 옮기세요.','break:true는 원점과 양의 축 최솟값 사이를 생략하는 표시입니다. 내부의 임의 구간 생략이나 비선형 축을 의미하지 않습니다.','알려지지 않은 수치를 그래프 이미지에서 정확하게 읽었다고 주장하지 마세요. 예시 데이터는 합성값입니다.','편집 링크가 너무 길어지면 SVG와 JSON 파일을 사용자에게 제공합니다.','단위·자료 의미·추론 적절성은 출제자가 별도로 확인합니다.'],presets:PRESETS.map(({id,name,note})=>({id,name,note})),schema,...(args.preset?{example:getPreset(args.preset)}:{example:getPreset('mechanics')})};
 if(!['render_graph','validate_graph'].includes(name))throw new Error('알 수 없는 도구입니다.');
 const r=renderGraph(args.spec);const token=encodeSpec(r.spec);
 if(name==='validate_graph')return {valid:true,warnings:r.warnings,regressions:r.regressions,areas:r.areas,...(r.print?{print:r.print}:{})};
 return {title:r.spec.title,previewUrl:token.length<=20000?base+'#spec='+token:null,...(args.includeSvg===false?{}:{svg:r.svg}),warnings:[...r.warnings,...(token.length>20000?['설정이 커서 편집 링크를 만들지 않았습니다. JSON 작업 파일을 제공하세요.']:[])],regressions:r.regressions,areas:r.areas,...(r.print?{print:r.print}:{})};
}
export function rpc(message,base){
 const id=message?.id??null,error=(code,message,data)=>({jsonrpc:'2.0',id,error:{code,message,...(data?{data}:{})}});
 if(!message||Array.isArray(message)||message.jsonrpc!=='2.0'||typeof message.method!=='string'||(message.id!==undefined&&!['string','number'].includes(typeof message.id)))return error(-32600,'Invalid Request');
 const requested=message.params?._meta?.['io.modelcontextprotocol/protocolVersion'];
 if(requested&&!PROTOCOLS.includes(requested))return error(-32022,'Unsupported protocol version',{supported:PROTOCOLS,requested});
 if(message.id===undefined)return null;
 const modern=requested==='2026-07-28';let result;
 if(message.method==='initialize'){
   const v=message.params?.protocolVersion;
   result={protocolVersion:PROTOCOLS.includes(v)&&v!=='2026-07-28'?v:'2025-11-25',capabilities:{tools:{}},serverInfo:SERVER,instructions:INSTRUCTIONS};
 }else if(message.method==='server/discover') result={resultType:'complete',supportedVersions:PROTOCOLS,capabilities:{tools:{}},_meta:{'io.modelcontextprotocol/serverInfo':SERVER},instructions:INSTRUCTIONS};
 else if(message.method==='ping')result={};
 else if(message.method==='tools/list')result={tools:TOOLS};
 else if(message.method==='tools/call'){
   const name=message.params?.name;if(!TOOLS.some(t=>t.name===name))return error(-32602,'Unknown tool');
   try{const output=callTool(name,message.params?.arguments,base);result={content:[{type:'text',text:JSON.stringify(output)}],isError:false};}
   catch(e){result={content:[{type:'text',text:e.message}],isError:true};}
 }else return error(-32601,'Method not found');
 if(modern)result.resultType='complete';
 return {jsonrpc:'2.0',id,result};
}
