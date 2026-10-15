import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v32.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v32.min.js',base),code);
for(const name of ['index-v32.min.js','image-tools-v32.js','pdf-figures-v32.js','images-v32.css','native-tables-v32.js','pdf-format-v32.js','pdf-symbols-v32.js','fraction-style-v32.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v32 deployment files updated.');
