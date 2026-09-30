import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v27.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v27.min.js',base),code);
for(const name of ['index-v27.min.js','image-tools-v27.js','pdf-figures-v27.js','images-v27.css','native-tables-v27.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v27 deployment files updated.');
