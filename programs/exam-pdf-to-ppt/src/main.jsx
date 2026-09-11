import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BLOCK_LABELS, coverage, MAX_PDF_BYTES, validateDocument } from '../shared/document.js';
import { planQuestion } from '../shared/layout.js';
import { analyzePdfInBrowser, DEFAULT_MODEL } from './gemini-client.js';
import { createPptxBlob } from './pptx-client.js';
import './style.css';
import './key.css';

const storage = {
  get(key, fallback = '') { try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; } },
  set(key, value) { try { if (value) window.localStorage.setItem(key, value); else window.localStorage.removeItem(key); } catch {} },
};

function ScientificEditor({ label, value, onChange, rows = 4 }) {
  const ref = useRef();
  const format = tag => {
    const el = ref.current; const start = el.selectionStart; const end = el.selectionEnd;
    const selected = value.slice(start, end);
    onChange(`${value.slice(0, start)}<${tag}>${selected}</${tag}>${value.slice(end)}`);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + tag.length + 2, end + tag.length + 2); });
  };
  return <div className="scientific-editor"><label>{label}<textarea ref={ref} rows={rows} value={value} onChange={e => onChange(e.target.value)} spellCheck={false} /></label>
    <div className="format-tools"><span>선택한 글자</span><button type="button" onClick={() => format('sup')} title="위첨자">x² 위첨자</button><button type="button" onClick={() => format('sub')} title="아래첨자">x₂ 아래첨자</button><button type="button" onClick={() => format('u')}>밑줄</button></div></div>;
}

function SlidePreview({ question, numberStyle }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [question.number]);
  let plans;
  try { plans = planQuestion(question, numberStyle); }
  catch (e) { return <p className="notice error">{e.message}</p>; }
  const current = plans[Math.min(page, plans.length - 1)];
  if (!current) return <p className="muted">본문을 입력하면 미리보기가 표시됩니다.</p>;
  const pos = (x, y, w) => ({ left: `${x * 10}%`, top: `${y / 7.5 * 100}%`, width: `${w * 10}%` });
  return <section className="preview-section"><div className="section-title"><b>슬라이드 미리보기</b><span>{plans.length > 1 ? `${plans.length}장으로 이어짐` : '1장'}</span></div>
    <div className="slide-frame"><div className="slide">
      <div className="slide-number" style={{ ...pos(current.number.x, current.number.y, current.number.w), color: `#${current.number.color}`, fontSize: `${current.number.fontSize / 7.2}cqw` }}>{current.number.text}</div>
      {current.body.lines.map((runs, i) => <div key={i} className="slide-line" style={pos(current.body.x, current.body.y + i * current.body.lineHeight, current.body.w)}>{runs.map((run, j) => <span key={j} className={`script-${run.script}`} style={{ textDecoration: run.underline ? 'underline' : 'none' }}>{run.text}</span>)}</div>)}
    </div></div>
    <div className="preview-controls"><button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>이전 장</button><span>{Math.min(page + 1, plans.length)} / {plans.length}</span><button onClick={() => setPage(p => p + 1)} disabled={page >= plans.length - 1}>다음 장</button></div>
    <p className="help">화면 미리보기는 근사 배치입니다. 최종 모양은 설치된 글꼴과 PowerPoint에서 확인하세요.</p></section>;
}

function App() {
  const input = useRef(); const controller = useRef(null);
  const [apiKey, setApiKey] = useState(() => storage.get('bbh-gemini-api-key'));
  const [model, setModel] = useState(() => storage.get('bbh-gemini-model', DEFAULT_MODEL));
  const [file, setFile] = useState(null); const [sourceUrl, setSourceUrl] = useState('');
  const [data, setData] = useState(null); const [expectedCount, setExpectedCount] = useState(25);
  const [busy, setBusy] = useState(''); const [err, setErr] = useState(''); const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(0); const [style, setStyle] = useState('yellow28'); const [showSource, setShowSource] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { storage.set('bbh-gemini-api-key', apiKey); }, [apiKey]);
  useEffect(() => { storage.set('bbh-gemini-model', model); }, [model]);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setSourceUrl(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => { const prevent = e => { if (data) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent); }, [data]);
  const choose = f => {
    if (!f || busy) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { setErr('PDF 파일을 선택하세요.'); return; }
    if (f.size > MAX_PDF_BYTES) { setErr('PDF는 최대 10MB까지 처리합니다.'); return; }
    if (data && !window.confirm('새 PDF를 선택하면 현재 편집 내용이 사라집니다. 계속할까요?')) return;
    setFile(f); setData(null); setSelected(0); setErr(''); setMessage(''); setShowSource(false);
  };
  useEffect(() => { const paste = e => { const f = [...(e.clipboardData?.files || [])].find(v => v.type === 'application/pdf'); if (f) { e.preventDefault(); choose(f); } }; window.addEventListener('paste', paste); return () => window.removeEventListener('paste', paste); });
  const questions = data?.questions || []; const q = questions[selected];
  const check = useMemo(() => data ? coverage({ ...data, expectedCount }) : null, [data, expectedCount]);
  const patchQ = change => setData(d => ({ ...d, questions: d.questions.map((v, i) => i === selected ? { ...v, ...change } : v) }));
  const patchBlock = (index, change) => patchQ({ blocks: q.blocks.map((b, i) => i === index ? { ...b, ...change } : b) });

  const analyze = async () => {
    if (!file || busy) return;
    if (data && !window.confirm('다시 분석하면 편집 내용을 새 결과로 교체합니다. 계속할까요?')) return;
    setBusy('analyze'); setErr(''); setMessage('문항과 수식을 읽고 있습니다. 잠시 기다려 주세요.');
    const ac = new AbortController(); controller.current = ac;
    const timeout = setTimeout(() => ac.abort(), 195000);
    try {
      const doc = validateDocument(await analyzePdfInBrowser(file, { apiKey, model, expectedCount, signal: ac.signal }));
      setData(doc); setSelected(0); setMessage(`${doc.questions.length}개 문항을 인식했습니다. 원문과 첨자를 확인하세요.`);
    } catch (e) { setErr(e.name === 'AbortError' ? '분석을 취소했거나 응답 시간이 초과되었습니다.' : e.message); setMessage(''); }
    finally { clearTimeout(timeout); controller.current = null; setBusy(''); }
  };
  const download = async () => {
    if (!data || busy) return;
    setBusy('export'); setErr('');
    try {
      const doc = validateDocument({ ...data, expectedCount });
      doc.questions.sort((a, b) => Number(a.number) - Number(b.number));
      const { blob, slideCount } = await createPptxBlob(doc, { numberStyle: style });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `${data.title.replace(/[\\/:*?"<>|]/g, '_') || '모의고사'}_문항별.pptx`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage(`${expectedCount}문항 · ${slideCount}장 PPTX를 만들었습니다.`);
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const addQuestion = () => {
    if (questions.length >= 50) return;
    const number = String(check?.missing[0] || questions.length + 1);
    setData(d => ({ ...d, questions: [...d.questions, { number, sourcePage: 1, blocks: [{ kind: 'text', text: '' }], choices: [], visual_note: '', warnings: [] }] }));
    setSelected(questions.length);
  };
  const removeQuestion = () => {
    if (!window.confirm(`${q.number}번 문항을 편집 목록에서 삭제할까요?`)) return;
    setData(d => ({ ...d, questions: d.questions.filter((_, i) => i !== selected) })); setSelected(Math.max(0, selected - 1));
  };
  return <main><header><div className="brand"><span className="mark">Q</span><div><b>문항 슬라이드 스튜디오</b><small>PDF에서 편집 가능한 PPT로</small></div></div><div className="spec"><span>4:3</span><span>210 M고딕 070</span><span>본문 24pt</span></div></header>
    <div className="workspace"><aside><fieldset disabled={Boolean(busy)}><legend>원본과 출력 설정</legend>
      <h2>01 원본 PDF</h2><button className="drop" onClick={() => input.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}><b>{file ? file.name : 'PDF를 놓거나 선택하세요'}</b><small>{file ? `${(file.size / 1048576).toFixed(1)} MB` : '최대 10MB · PDF 파일 붙여넣기 가능'}</small></button>
      <input ref={input} hidden type="file" accept=".pdf,application/pdf" onChange={e => { choose(e.target.files[0]); e.target.value = ''; }} />
      <label className="field">문항 수<select value={expectedCount} onChange={e => setExpectedCount(Number(e.target.value))}><option value={20}>20문항</option><option value={25}>25문항</option></select></label>
      <label className="field">Gemini API 키<input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} autoComplete="off" placeholder="AIza…" /><small>이 브라우저의 로컬 저장소에 저장됩니다.</small></label>
      <div className="key-actions"><button type="button" onClick={() => setApiKey('')} disabled={!apiKey}>저장된 키 삭제</button></div>
      <label className="field">Gemini 모델<input value={model} onChange={e => setModel(e.target.value)} spellCheck={false} /></label>
      <button className="primary" onClick={analyze} disabled={!file || !apiKey.trim()}>{busy === 'analyze' ? '문항 분석 중…' : 'Gemini로 문항 분석'}</button>
      <p className="help">키와 PDF는 이 페이지에서 Gemini API로 직접 전송됩니다. GitHub나 별도 서버에는 저장되지 않습니다.</p>
      <div className="rule" /><h2>02 번호 스타일</h2>
      <label className={`style-option ${style === 'yellow28' ? 'selected' : ''}`}><input type="radio" name="numberStyle" checked={style === 'yellow28'} onChange={() => setStyle('yellow28')} /><strong className="yellow">01</strong><span>노란색 28pt<small>별도 텍스트 상자</small></span></label>
      <label className={`style-option ${style === 'white40' ? 'selected' : ''}`}><input type="radio" name="numberStyle" checked={style === 'white40'} onChange={() => setStyle('white40')} /><strong>01번</strong><span>흰색 40pt<small>별도 텍스트 상자</small></span></label>
      <p className="help">본문은 24pt를 유지합니다. 긴 문항은 여러 장으로 나뉘며, 첨자만 작게 표시합니다.</p>
      <div className="rule" /><div className="summary"><span>인식 문항</span><b>{questions.length} / {expectedCount}</b></div>
      <button className="export" disabled={!check?.complete} onClick={download}>{busy === 'export' ? 'PPT 생성 중…' : 'PPTX 내려받기'}</button>
      <p className="help">PowerPoint를 여는 PC에 210 M고딕 070이 설치되어 있어야 합니다. 글꼴 파일은 포함하지 않습니다.</p>
    </fieldset>{busy === 'analyze' && <button className="cancel" onClick={() => controller.current?.abort()}>분석 취소</button>}</aside>
      <section className="content" aria-busy={Boolean(busy)}>{err && <p className="notice error" role="alert">{err}</p>}{message && <p className="notice" role="status">{message}</p>}
        {!data ? <div className="empty"><h1>문항을 읽고, 첨자를 확인하고,<br />PPT로 내려받으세요.</h1><p>왼쪽에서 PDF와 문항 수를 선택하면 시작합니다.</p><div className="sample-formula">H<sub>2</sub>O <span>·</span> x<sup>2</sup> <span>·</span> SO<sub>4</sub><sup>2−</sup></div><p className="help">첨자는 PPT에서 수정할 수 있는 서식으로 변환됩니다.</p></div> : <>
          <div className="toolbar"><label className="title-field">PPT 제목<input value={data.title} maxLength={200} onChange={e => setData(d => ({ ...d, title: e.target.value }))} disabled={Boolean(busy)} /></label><button onClick={() => setShowSource(v => !v)}>{showSource ? '원본 닫기' : '원본 PDF 보기'}</button></div>
          {!check.complete && <div className="notice warning" role="status">번호 확인 필요{check.missing.length > 0 && <div>누락: {check.missing.join(', ')}</div>}{check.duplicate.length > 0 && <div>중복: {check.duplicate.join(', ')}</div>}{check.extra.length > 0 && <div>범위 밖: {check.extra.join(', ')}</div>}<small>번호와 누락 내용을 수정하면 내보내기가 활성화됩니다. 번호가 모두 있어도 내용 정확성은 원본과 대조해야 합니다.</small></div>}
          {(data.warnings || []).length > 0 && <div className="notice warning">{data.warnings.map((w, i) => <div key={i}>{w}</div>)}</div>}
          {showSource && sourceUrl && <iframe className="pdf-view" src={`${sourceUrl}#page=${q?.sourcePage || 1}`} title="원본 모의고사 PDF" />}
          <div className="editor"><nav aria-label="문항 목록"><div className="question-grid">{questions.map((item, i) => <button key={i} className={i === selected ? 'active' : ''} aria-current={i === selected ? 'true' : undefined} onClick={() => setSelected(i)}>{item.number}</button>)}</div><button className="add-question" disabled={Boolean(busy)} onClick={addQuestion}>문항 추가</button></nav>
            <div className="question-main">{q && <><article><fieldset disabled={Boolean(busy)}><legend>{q.number}번 문항 편집</legend><div className="question-meta"><label>문항 번호<input value={q.number} maxLength={3} onChange={e => patchQ({ number: e.target.value })} /></label><label>원본 PDF 쪽<input type="number" min={1} value={q.sourcePage} onChange={e => patchQ({ sourcePage: Number(e.target.value) })} /></label><button className="danger" onClick={removeQuestion}>문항 삭제</button></div>
              <p className="help">위·아래첨자가 될 글자를 선택하고 서식 버튼을 누르세요. 태그는 미리보기와 PPT에서 첨자로 바뀝니다.</p>
              {q.blocks.map((block, i) => <div className="block" key={i}><div className="block-head"><select aria-label={`${i + 1}번째 본문 종류`} value={block.kind} onChange={e => patchBlock(i, { kind: e.target.value })}>{Object.entries(BLOCK_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button aria-label={`${i + 1}번째 텍스트 삭제`} onClick={() => patchQ({ blocks: q.blocks.filter((_, n) => n !== i) })}>삭제</button></div><ScientificEditor label={`${i + 1}. ${BLOCK_LABELS[block.kind]}`} value={block.text} onChange={text => patchBlock(i, { text })} /></div>)}
              <button className="add-block" onClick={() => patchQ({ blocks: [...q.blocks, { kind: 'text', text: '' }] })}>본문 상자 추가</button>
              <h3>선택지</h3>{q.choices.map((choice, i) => <div className="choice-edit" key={i}><ScientificEditor label={`선택지 ${i + 1} · 번호 기호 포함`} rows={2} value={choice} onChange={text => patchQ({ choices: q.choices.map((v, n) => n === i ? text : v) })} /><button onClick={() => patchQ({ choices: q.choices.filter((_, n) => n !== i) })} aria-label={`선택지 ${i + 1} 삭제`}>삭제</button></div>)}
              <button className="add-block" disabled={q.choices.length >= 10} onClick={() => patchQ({ choices: [...q.choices, ''] })}>선택지 추가</button>
              <label className="field">그림·수식 보충 메모<textarea rows={2} value={q.visual_note} onChange={e => patchQ({ visual_note: e.target.value })} /></label>
              {q.warnings?.length > 0 && <div className="notice warning">{q.warnings.map((w, i) => <div key={i}>{w}</div>)}</div>}
            </fieldset></article><SlidePreview question={q} numberStyle={style} /></>}</div>
          </div></>}
      </section></div><footer>API 키는 현재 브라우저의 로컬 저장소에 남습니다. 공용 PC에서는 사용 후 저장된 키를 삭제하세요.</footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
