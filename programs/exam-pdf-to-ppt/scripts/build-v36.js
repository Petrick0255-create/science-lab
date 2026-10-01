import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v36.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v36.min.js',base),code);
for(const name of ['index-v36.min.js','image-tools-v36.js','pdf-figures-v36.js','images-v36.css','native-tables-v36.js','pdf-format-v36.js','pdf-symbols-v36.js','fraction-style-v36.js','text-style-v36.js','inline-boxes-v36.js','figure-captions-v36.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v36 deployment files updated.');
