import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v38.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v38.min.js',base),code);
for(const name of ['index-v38.min.js','image-tools-v38.js','pdf-figures-v38.js','images-v38.css','native-tables-v38.js','pdf-format-v38.js','pdf-symbols-v38.js','fraction-style-v38.js','text-style-v38.js','inline-boxes-v38.js','figure-captions-v38.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v38 deployment files updated.');
