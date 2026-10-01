import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v29.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v29.min.js',base),code);
for(const name of ['index-v29.min.js','image-tools-v29.js','pdf-figures-v29.js','images-v29.css','native-tables-v29.js','pdf-format-v29.js','pdf-symbols-v29.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v29 deployment files updated.');
