import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v34.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v34.min.js',base),code);
for(const name of ['index-v34.min.js','image-tools-v34.js','pdf-figures-v34.js','images-v34.css','native-tables-v34.js','pdf-format-v34.js','pdf-symbols-v34.js','fraction-style-v34.js','text-style-v34.js','inline-boxes-v34.js','figure-captions-v34.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v34 deployment files updated.');
