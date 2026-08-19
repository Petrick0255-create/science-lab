import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type LayoutMode = "normal" | "columns";
type Side = "left" | "right";
type SearchHit = { page: number; column: number; label: string; term: string };
type PaneHandle = { getScroller: () => HTMLDivElement | null };
type PageRange = { start: number; end: number };

function UploadMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg>;
}

function DocumentPane({ side, mode, zoom, linked, peerRef, syncingRef, paneHandleRef, pageRange, onDocumentLoaded }: {
  side: Side;
  mode: LayoutMode;
  zoom: number;
  linked: boolean;
  peerRef: React.MutableRefObject<PaneHandle | null>;
  syncingRef: React.MutableRefObject<boolean>;
  paneHandleRef: React.MutableRefObject<PaneHandle | null>;
  pageRange: PageRange;
  onDocumentLoaded: (side: Side, pages: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const renderVersion = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [hitIndex, setHitIndex] = useState(-1);

  useEffect(() => {
    paneHandleRef.current = { getScroller: () => viewportRef.current };
    return () => { paneHandleRef.current = null; };
  }, [paneHandleRef]);

  const renderDocument = useCallback(async () => {
    const pdf = documentRef.current;
    const host = canvasHostRef.current;
    const scroller = viewportRef.current;
    if (!pdf || !host || !scroller) return;
    const version = ++renderVersion.current;
    host.replaceChildren();
    setLoading(true);
    const availableWidth = Math.max(320, scroller.clientWidth - 36);
    try {
      const firstPage = Math.max(1, Math.min(pageRange.start, pdf.numPages));
      const lastPage = Math.max(firstPage, Math.min(pageRange.end, pdf.numPages));
      for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
        if (version !== renderVersion.current) return;
        const page = await pdf.getPage(pageNumber);
        const natural = page.getViewport({ scale: 1 });
        const columnFactor = mode === "columns" ? 2 : 1;
        const cssFullWidth = availableWidth * columnFactor * zoom;
        const renderScale = Math.max(1.3, (cssFullWidth / natural.width) * Math.min(2, window.devicePixelRatio || 1));
        const rendered = page.getViewport({ scale: renderScale });
        const source = document.createElement("canvas");
        source.width = Math.floor(rendered.width);
        source.height = Math.floor(rendered.height);
        const sourceContext = source.getContext("2d", { alpha: false });
        if (!sourceContext) continue;
        await page.render({ canvasContext: sourceContext, viewport: rendered, canvas: source }).promise;

        const columns = mode === "columns" ? 2 : 1;
        for (let column = 0; column < columns; column += 1) {
          const card = document.createElement("section");
          card.className = "page-card";
          card.id = `${side}-page-${pageNumber}-column-${column}`;
          const tag = document.createElement("div");
          tag.className = "page-tag";
          tag.textContent = mode === "columns" ? `${pageNumber}쪽 · ${column === 0 ? "왼쪽 단" : "오른쪽 단"}` : `${pageNumber}쪽`;
          card.appendChild(tag);
          const canvas = document.createElement("canvas");
          const cropWidth = Math.floor(source.width / columns);
          canvas.width = cropWidth;
          canvas.height = source.height;
          canvas.style.width = `${availableWidth * zoom}px`;
          canvas.style.height = "auto";
          const context = canvas.getContext("2d", { alpha: false });
          context?.drawImage(source, column * cropWidth, 0, cropWidth, source.height, 0, 0, cropWidth, source.height);
          card.appendChild(canvas);
          host.appendChild(card);
        }
      }
    } catch (cause) {
      console.error(cause);
      setError("문서를 그리는 중 오류가 발생했습니다. PDF 파일을 다시 확인해 주세요.");
    } finally {
      if (version === renderVersion.current) setLoading(false);
    }
  }, [mode, pageRange.end, pageRange.start, side, zoom]);

  useEffect(() => {
    if (!documentRef.current) return;
    const scroller = viewportRef.current;
    const ratio = scroller && scroller.scrollHeight > scroller.clientHeight ? scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight) : 0;
    const timer = window.setTimeout(async () => {
      await renderDocument();
      const next = viewportRef.current;
      if (next) next.scrollTop = ratio * Math.max(0, next.scrollHeight - next.clientHeight);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [mode, zoom, pageRange.start, pageRange.end, renderDocument]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && viewportRef.current?.matches(":hover")) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const loadFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setHits([]);
    setHitIndex(-1);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "pdf") {
      setFileName(file.name);
      setPageCount(0);
      setLoaded(false);
      documentRef.current = null;
      canvasHostRef.current?.replaceChildren();
      setError("HWP/HWPX는 브라우저만으로 정확히 PDF로 변환할 수 없습니다. 한글에서 ‘PDF로 저장’한 뒤 불러와 주세요.");
      return;
    }
    setLoading(true);
    try {
      const bytes = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      documentRef.current = pdf;
      setLoaded(true);
      setFileName(file.name);
      setPageCount(pdf.numPages);
      onDocumentLoaded(side, pdf.numPages);
      await renderDocument();
    } catch (cause) {
      console.error(cause);
      setError("PDF를 열 수 없습니다. 암호가 걸렸거나 손상된 파일인지 확인해 주세요.");
      setLoading(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    loadFile(event.dataTransfer.files?.[0]);
  };

  const runSearch = async (direction = 1) => {
    const pdf = documentRef.current;
    const term = query.trim().toLocaleLowerCase("ko-KR");
    if (!pdf || !term) { setHits([]); setHitIndex(-1); return; }
    let found = hits;
    if (!hits.length || hits[0]?.term !== term) {
      found = [];
      const firstPage = Math.max(1, Math.min(pageRange.start, pdf.numPages));
      const lastPage = Math.max(firstPage, Math.min(pageRange.end, pdf.numPages));
      for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageWidth = page.view[2] - page.view[0];
        for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
          if (!item.str?.toLocaleLowerCase("ko-KR").includes(term)) continue;
          found.push({ page: pageNumber, column: mode === "columns" && (item.transform?.[4] ?? 0) > pageWidth / 2 ? 1 : 0, label: item.str.trim() || term, term });
        }
      }
      setHits(found);
    }
    if (!found.length) { setHitIndex(-1); return; }
    const nextIndex = hits === found && hitIndex >= 0 ? (hitIndex + direction + found.length) % found.length : direction < 0 ? found.length - 1 : 0;
    setHitIndex(nextIndex);
    const target = found[nextIndex];
    document.querySelectorAll(`#${side}-viewer .page-card.search-active`).forEach((node) => node.classList.remove("search-active"));
    const card = document.getElementById(`${side}-page-${target.page}-column-${target.column}`);
    card?.classList.add("search-active");
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const syncScroll = () => {
    if (!linked || syncingRef.current) return;
    const source = viewportRef.current;
    const target = peerRef.current?.getScroller();
    if (!source || !target) return;
    const sourceMax = source.scrollHeight - source.clientHeight;
    const targetMax = target.scrollHeight - target.clientHeight;
    syncingRef.current = true;
    target.scrollTop = sourceMax > 0 ? (source.scrollTop / sourceMax) * targetMax : 0;
    requestAnimationFrame(() => { syncingRef.current = false; });
  };

  return (
    <section className="document-pane" id={`${side}-viewer`}>
      <div className="pane-toolbar">
        <div className="file-meta"><span className={`side-dot ${side}`} /><div><strong>{fileName || (side === "left" ? "기준 문서" : "비교 문서")}</strong><small>{pageCount ? `${pageCount}쪽` : "PDF를 불러와 주세요"}</small></div></div>
        <button className="replace-button" onClick={() => inputRef.current?.click()}>{fileName ? "교체" : "열기"}</button>
      </div>
      <div className="search-row">
        <span aria-hidden="true">⌕</span>
        <input ref={searchInputRef} value={query} onChange={(event) => { setQuery(event.target.value); setHits([]); setHitIndex(-1); }} onKeyDown={(event) => event.key === "Enter" && runSearch(event.shiftKey ? -1 : 1)} placeholder="이 문서에서 글씨 검색" aria-label={`${side === "left" ? "기준" : "비교"} 문서 검색`} />
        <span className="hit-count">{query && hits.length ? `${hitIndex + 1}/${hits.length}` : ""}</span>
        <button onClick={() => runSearch(-1)} aria-label="이전 검색 결과">↑</button><button onClick={() => runSearch(1)} aria-label="다음 검색 결과">↓</button>
      </div>
      <div ref={viewportRef} className={`pdf-viewport ${dragging ? "is-dragging" : ""}`} onScroll={syncScroll} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        {!loaded && <button className="drop-zone" onClick={() => inputRef.current?.click()}><span className="upload-mark"><UploadMark /></span><strong>{side === "left" ? "기준 PDF 열기" : "비교할 PDF 열기"}</strong><span>파일을 놓거나 눌러서 선택하세요</span><small>PDF · HWP/HWPX는 변환 안내 제공</small></button>}
        <div ref={canvasHostRef} className={`canvas-host ${mode}`} />
        {loading && <div className="loading"><i /><span>문서를 선명하게 불러오는 중</span></div>}
        {error && <div className="file-error"><strong>이 파일은 바로 열 수 없습니다</strong><p>{error}</p></div>}
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.hwp,.hwpx,application/pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => loadFile(event.target.files?.[0])} hidden />
    </section>
  );
}

export default function Home() {
  const [mode, setMode] = useState<LayoutMode>("columns");
  const [zoom, setZoom] = useState(1);
  const [linked, setLinked] = useState(true);
  const leftPane = useRef<PaneHandle | null>(null);
  const rightPane = useRef<PaneHandle | null>(null);
  const syncing = useRef(false);
  const promptedMismatchRef = useRef("");
  const [counts, setCounts] = useState({ left: 0, right: 0 });
  const [ranges, setRanges] = useState<{ left: PageRange; right: PageRange }>({ left: { start: 1, end: 1 }, right: { start: 1, end: 1 } });
  const [draftRanges, setDraftRanges] = useState(ranges);
  const [rangeDialog, setRangeDialog] = useState(false);

  const onDocumentLoaded = useCallback((side: Side, pages: number) => {
    setCounts((current) => ({ ...current, [side]: pages }));
    setRanges((current) => ({ ...current, [side]: { start: 1, end: pages } }));
  }, []);

  useEffect(() => {
    if (!counts.left || !counts.right || counts.left === counts.right) return;
    const key = `${counts.left}:${counts.right}`;
    if (promptedMismatchRef.current === key) return;
    promptedMismatchRef.current = key;
    const next = { left: { start: 1, end: counts.left }, right: { start: 1, end: counts.right } };
    setDraftRanges(next);
    setRangeDialog(true);
  }, [counts]);

  const openRangeDialog = () => { setDraftRanges(ranges); setRangeDialog(true); };
  const updateDraft = (side: Side, key: keyof PageRange, value: number) => {
    const max = counts[side] || 1;
    setDraftRanges((current) => {
      const nextValue = Math.max(1, Math.min(max, Number.isFinite(value) ? value : 1));
      return { ...current, [side]: { ...current[side], [key]: nextValue } };
    });
  };
  const applyRanges = () => {
    setRanges({
      left: { start: Math.min(draftRanges.left.start, draftRanges.left.end), end: Math.max(draftRanges.left.start, draftRanges.left.end) },
      right: { start: Math.min(draftRanges.right.start, draftRanges.right.end), end: Math.max(draftRanges.right.start, draftRanges.right.end) },
    });
    setRangeDialog(false);
  };
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><b>A</b><b>B</b></span><div><h1>PDF 나란히 비교</h1><p>문서는 이 기기에서만 열립니다</p></div></div>
        <div className="main-controls">
          <div className="segmented" aria-label="문서 형식"><button className={mode === "normal" ? "active" : ""} onClick={() => setMode("normal")}>일반 문서</button><button className={mode === "columns" ? "active" : ""} onClick={() => setMode("columns")}>2단 문제지</button></div>
          <button className="range-button" onClick={openRangeDialog} disabled={!counts.left || !counts.right}>비교 구간</button>
          <label className="zoom-control"><button onClick={() => setZoom((value) => Math.max(.6, +(value - .1).toFixed(1)))} aria-label="축소">−</button><input type="range" min="0.6" max="2.5" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><output>{Math.round(zoom * 100)}%</output><button onClick={() => setZoom((value) => Math.min(2.5, +(value + .1).toFixed(1)))} aria-label="확대">＋</button></label>
          <label className="sync-toggle"><input type="checkbox" checked={linked} onChange={(event) => setLinked(event.target.checked)} /><span className="toggle-track"><i /></span><span>스크롤 같이 움직이기</span></label>
        </div>
      </header>
      <div className="mode-note"><span>{mode === "columns" ? "2단 이동" : "일반 이동"}</span>{mode === "columns" ? "각 쪽의 왼쪽 단을 끝까지 본 뒤 오른쪽 단으로, 그다음 쪽으로 이어집니다." : "현재 쪽의 아래에 도달하면 다음 쪽으로 자연스럽게 이어집니다."}</div>
      <div className="compare-grid">
        <DocumentPane side="left" mode={mode} zoom={zoom} linked={linked} peerRef={rightPane} syncingRef={syncing} paneHandleRef={leftPane} pageRange={ranges.left} onDocumentLoaded={onDocumentLoaded} />
        <div className="divider"><span>VS</span></div>
        <DocumentPane side="right" mode={mode} zoom={zoom} linked={linked} peerRef={leftPane} syncingRef={syncing} paneHandleRef={rightPane} pageRange={ranges.right} onDocumentLoaded={onDocumentLoaded} />
      </div>
      {rangeDialog && <div className="dialog-backdrop" role="presentation">
        <section className="range-dialog" role="dialog" aria-modal="true" aria-labelledby="range-title">
          <div className="dialog-kicker">{counts.left !== counts.right ? "페이지 수가 다릅니다" : "비교 구간 설정"}</div>
          <h2 id="range-title">어느 구간끼리 비교할까요?</h2>
          <p>선택한 두 구간의 시작과 끝을 기준으로 스크롤 위치를 맞춥니다.</p>
          <div className="range-fields">
            {(["left", "right"] as Side[]).map((side) => <div className="range-row" key={side}>
              <span className={`side-dot ${side}`} /><strong>{side === "left" ? "기준 PDF" : "비교 PDF"}</strong>
              <label><input type="number" min="1" max={counts[side]} value={draftRanges[side].start} onChange={(event) => updateDraft(side, "start", Number(event.target.value))} /> 쪽</label>
              <span>부터</span>
              <label><input type="number" min="1" max={counts[side]} value={draftRanges[side].end} onChange={(event) => updateDraft(side, "end", Number(event.target.value))} /> 쪽</label>
              <small>전체 {counts[side]}쪽</small>
            </div>)}
          </div>
          <div className="dialog-actions"><button onClick={() => setRangeDialog(false)}>취소</button><button className="primary" onClick={applyRanges}>이 구간으로 비교</button></div>
        </section>
      </div>}
    </main>
  );
}
