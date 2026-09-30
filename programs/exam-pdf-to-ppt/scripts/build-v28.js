import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v28.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v28.min.js',base),code);
for(const name of ['index-v28.min.js','image-tools-v28.js','pdf-figures-v28.js','images-v28.css','native-tables-v28.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v28 deployment files updated.');
