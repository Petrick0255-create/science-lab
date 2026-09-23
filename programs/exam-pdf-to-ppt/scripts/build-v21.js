import fs from 'node:fs/promises';
import { transform } from 'esbuild';

const source = await fs.readFile(new URL('../assets/index-v21.js', import.meta.url), 'utf8');
const { code } = await transform(source, { minify: true, loader: 'js', target: 'es2020' });
for (const target of ['../assets/index-v21-number-suffix.min.js', '../public-site/programs/exam-pdf-to-ppt/assets/index-v21-number-suffix.min.js']) {
  await fs.writeFile(new URL(target, import.meta.url), code);
}
console.log('v21 deployment files updated.');
