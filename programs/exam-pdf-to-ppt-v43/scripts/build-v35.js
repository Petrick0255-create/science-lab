import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v35.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v35.min.js',base),code);
for(const name of ['index-v35.min.js','image-tools-v35.js','pdf-figures-v35.js','images-v35.css','native-tables-v35.js','pdf-format-v35.js','pdf-symbols-v35.js','fraction-style-v35.js','text-style-v35.js','inline-boxes-v35.js','figure-captions-v35.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v35 deployment files updated.');
