import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v41.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v41.min.js',base),code);
for(const name of ['index-v41.min.js','image-tools-v41.js','pdf-figures-v41.js','images-v41.css','native-tables-v41.js','pdf-format-v41.js','pdf-symbols-v41.js','fraction-style-v41.js','text-style-v41.js','inline-boxes-v41.js','figure-captions-v41.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v41 deployment files updated.');
