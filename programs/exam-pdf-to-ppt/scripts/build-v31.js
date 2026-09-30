import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v31.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v31.min.js',base),code);
for(const name of ['index-v31.min.js','image-tools-v31.js','pdf-figures-v31.js','images-v31.css','native-tables-v31.js','pdf-format-v31.js','pdf-symbols-v31.js','fraction-style-v31.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v31 deployment files updated.');
