import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v42.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v42.min.js',base),code);
for(const name of ['index-v42.min.js','image-tools-v42.js','pdf-figures-v42.js','images-v42.css','native-tables-v42.js','pdf-format-v42.js','pdf-symbols-v42.js','fraction-style-v42.js','text-style-v42.js','inline-boxes-v42.js','figure-captions-v42.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
await fs.copyFile(new URL('index.html',base),new URL('public-site/programs/exam-pdf-to-ppt/index.html',base));
console.log('v42 deployment files updated.');
