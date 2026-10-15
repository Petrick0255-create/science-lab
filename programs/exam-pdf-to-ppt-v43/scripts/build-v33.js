import fs from 'node:fs/promises';
import { transform } from 'esbuild';
const base=new URL('../',import.meta.url);
const {code}=await transform(await fs.readFile(new URL('assets/index-v33.js',base),'utf8'),{minify:true,loader:'js',target:'es2022'});
await fs.writeFile(new URL('assets/index-v33.min.js',base),code);
for(const name of ['index-v33.min.js','image-tools-v33.js','pdf-figures-v33.js','images-v33.css','native-tables-v33.js','pdf-format-v33.js','pdf-symbols-v33.js','fraction-style-v33.js','text-style-v33.js','pdfjs'])await fs.cp(new URL('assets/'+name,base),new URL('public-site/programs/exam-pdf-to-ppt/assets/'+name,base),{recursive:true});
console.log('v33 deployment files updated.');
