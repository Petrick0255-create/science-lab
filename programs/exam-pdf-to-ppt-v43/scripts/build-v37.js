import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v37.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v37.min.js',base),code);
for(const name of ['index-v37.min.js','image-tools-v37.js','pdf-figures-v37.js','images-v37.css','native-tables-v37.js','pdf-format-v37.js','pdf-symbols-v37.js','fraction-style-v37.js','text-style-v37.js','inline-boxes-v37.js','figure-captions-v37.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v37 deployment files updated.');
