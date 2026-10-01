import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v30.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v30.min.js',base),code);
for(const name of ['index-v30.min.js','image-tools-v30.js','pdf-figures-v30.js','images-v30.css','native-tables-v30.js','pdf-format-v30.js','pdf-symbols-v30.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v30 deployment files updated.');
