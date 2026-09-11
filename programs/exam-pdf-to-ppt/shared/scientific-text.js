import { UserError } from './document.js';

const SUB = Object.fromEntries([... '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ'].map((c, i) => [c, [...'0123456789+-=()aehijklmnoprstuvx'][i]]));
const SUP = Object.fromEntries([...'⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ'].map((c, i) => [c, [...'0123456789+-=()ni'][i]]));

/** Parse only three supported formatting tags. Never evaluate/render raw HTML. */
export function parseScientificText(value) {
  const result = []; const stack = []; let script = 'normal'; let underline = false;
  const append = (char, mode) => {
    const last = result.at(-1);
    if (last && last.script === mode && last.underline === underline) last.text += char;
    else result.push({ text: char, script: mode, underline });
  };
  for (const token of String(value).split(/(<\/?(?:sup|sub|u)>)/g)) {
    if (/^<(sup|sub|u)>$/.test(token)) {
      const tag = token.slice(1, -1);
      if (tag !== 'u' && script !== 'normal') throw new UserError('위첨자와 아래첨자를 서로 겹쳐 지정할 수 없습니다.');
      stack.push({ tag, script, underline });
      if (tag === 'u') underline = true; else script = tag;
    } else if (/^<\/(sup|sub|u)>$/.test(token)) {
      const previous = stack.pop();
      if (!previous || previous.tag !== token.slice(2, -1)) throw new UserError('첨자·밑줄 태그의 시작과 끝을 확인하세요.');
      script = previous.script; underline = previous.underline;
    } else {
      for (const char of token.replace(/\t/g, '    ')) {
        if (SUB[char] !== undefined) append(SUB[char], 'sub');
        else if (SUP[char] !== undefined) append(SUP[char], 'sup');
        else append(char, script);
      }
    }
  }
  if (stack.length) throw new UserError('닫히지 않은 첨자·밑줄 태그가 있습니다.');
  return result;
}

function width(char, script) {
  let w = /\p{Mark}/u.test(char) ? 0 : /\s/u.test(char) ? .5 : /[MW@%]/.test(char) ? 1
    : /[A-Z]/.test(char) ? .78 : /[a-z0-9]/.test(char) ? .66 : /[.,:;!'"()\[\]{}\-]/.test(char) ? .5 : 1.1;
  return w * (script === 'normal' ? 1 : .75);
}
export function wrapScientificText(value, maxWidth = 24) {
  const lines = [[]]; let units = 0;
  for (const run of parseScientificText(value)) {
    for (const char of run.text) {
      if (char === '\n') { lines.push([]); units = 0; continue; }
      const w = width(char, run.script);
      if (units + w > maxWidth && lines.at(-1).length) { lines.push([]); units = 0; }
      const line = lines.at(-1); const last = line.at(-1);
      if (last && last.script === run.script && last.underline === run.underline) last.text += char;
      else line.push({ ...run, text: char });
      units += w;
    }
  }
  return lines;
}
