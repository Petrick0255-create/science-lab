import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const source=await fs.readFile(new URL('assets/index-v23.js',base),'utf8');
const {code}=await transform(source,{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v23.min.js',base),code);
for(const name of ['index-v23.min.js','image-tools.js','images-v23.css','pdfjs']) {
  await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
}
console.log('v23 deployment files updated.');
