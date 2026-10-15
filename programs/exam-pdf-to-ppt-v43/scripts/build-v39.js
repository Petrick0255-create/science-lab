import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v39.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v39.min.js',base),code);
for(const name of ['index-v39.min.js','image-tools-v39.js','pdf-figures-v39.js','images-v39.css','native-tables-v39.js','pdf-format-v39.js','pdf-symbols-v39.js','fraction-style-v39.js','text-style-v39.js','inline-boxes-v39.js','figure-captions-v39.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v39 deployment files updated.');
