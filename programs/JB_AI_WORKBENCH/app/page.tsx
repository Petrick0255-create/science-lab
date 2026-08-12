"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };

const presets = [
  { icon: "✦", title: "문제 아이디어", prompt: "통합과학 문제 아이디어를 만들어 주세요." },
  { icon: "✓", title: "개념 오류 검사", prompt: "다음 과학 내용에 개념 오류가 있는지 검사해 주세요.\n\n" },
  { icon: "≡", title: "해설 작성", prompt: "다음 문항의 해설을 학생이 이해하기 쉽게 작성해 주세요.\n\n" },
  { icon: "↗", title: "보기 다듬기", prompt: "다음 보기의 표현을 짧고 정확하게 다듬어 주세요.\n\n" },
];

const initialMessages: Message[] = [
  {
    role: "assistant",
    text: "안녕하세요, 준범님. 과학 문항 제작과 교재 검토를 도와드릴 준비가 되었습니다. 아래 작업을 고르거나 바로 질문을 입력해 주세요.",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEndpoint(localStorage.getItem("jb-ai-endpoint") ?? "");
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWorking]);

  function saveEndpoint() {
    localStorage.setItem("jb-ai-endpoint", endpoint.trim());
    setShowSettings(false);
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const question = input.trim();
    if (!question || isWorking) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setIsWorking(true);

    const savedEndpoint = localStorage.getItem("jb-ai-endpoint")?.trim();
    if (savedEndpoint) {
      try {
        const response = await fetch(savedEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question }),
        });
        if (!response.ok) throw new Error("connection failed");
        const data = await response.json();
        setMessages((prev) => [...prev, { role: "assistant", text: data.answer ?? data.message ?? String(data) }]);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", text: "맥미니 AI에 연결하지 못했습니다. 맥미니가 켜져 있는지와 연결 주소를 확인해 주세요." }]);
      } finally {
        setIsWorking(false);
      }
      return;
    }

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "현재는 화면 체험 모드입니다. 질문을 보내는 과정은 정상적으로 작동했습니다. 집에서 맥미니 AI를 준비한 뒤 연결 주소를 입력하면, 이 자리에 실제 답변이 표시됩니다.",
        },
      ]);
      setIsWorking(false);
    }, 650);
  }

  function choosePreset(prompt: string) {
    setInput(prompt);
    document.querySelector<HTMLTextAreaElement>("#question")?.focus();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="J&B AI 처음으로">
          <span className="brand-mark">J<span>&</span>B</span>
          <span className="brand-name">AI WORKBENCH</span>
        </a>
        <div className="top-actions">
          <span className={`status ${endpoint ? "ready" : ""}`}><i />{endpoint ? "연결 주소 저장됨" : "맥미니 연결 전"}</span>
          <button className="icon-button" onClick={() => setShowSettings(true)} aria-label="연결 설정">⚙</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <button className="new-chat" onClick={() => { setMessages(initialMessages); setInput(""); }}><span>＋</span> 새 작업</button>
          <nav>
            <p>작업 도구</p>
            {presets.map((item) => (
              <button key={item.title} onClick={() => choosePreset(item.prompt)}>
                <b>{item.icon}</b><span>{item.title}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <strong>내 과학 자료 연결</strong>
            <p>문항과 교재 자료 검색 기능은 맥미니 연결 후 추가합니다.</p>
          </div>
        </aside>

        <div className="chat-area">
          <div className="chat-head">
            <div><span>J&B 과학 교재 AI</span><small>화면 체험 모드</small></div>
            <button onClick={() => navigator.clipboard?.writeText(messages.map((m) => `${m.role === "user" ? "나" : "AI"}: ${m.text}`).join("\n\n"))}>대화 복사</button>
          </div>

          <div className="messages">
            {messages.length === 1 && (
              <div className="welcome">
                <span className="spark">✦</span>
                <h1>무엇을 만들까요?</h1>
                <p>과학 문항 제작부터 개념 검토까지, 필요한 작업을 바로 입력해 주세요.</p>
                <div className="preset-grid">
                  {presets.map((item) => (
                    <button key={item.title} onClick={() => choosePreset(item.prompt)}>
                      <b>{item.icon}</b><span>{item.title}</span><small>→</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <div className="avatar">{message.role === "assistant" ? "JB" : "나"}</div>
                <div><strong>{message.role === "assistant" ? "J&B AI" : "준범님"}</strong><p>{message.text}</p>
                  {message.role === "assistant" && index > 0 && <button className="copy" onClick={() => navigator.clipboard?.writeText(message.text)}>복사</button>}
                </div>
              </article>
            ))}
            {isWorking && <article className="message assistant"><div className="avatar">JB</div><div><strong>J&B AI</strong><p className="thinking"><i /><i /><i /></p></div></article>}
            <div ref={endRef} />
          </div>

          <form className="composer" onSubmit={submit}>
            <textarea id="question" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="AI에게 작업을 요청하세요" rows={1} />
            <button type="submit" disabled={!input.trim() || isWorking} aria-label="보내기">↑</button>
            <small>Enter로 보내기 · Shift + Enter로 줄바꿈</small>
          </form>
        </div>
      </section>

      {showSettings && <div className="modal-backdrop" onMouseDown={() => setShowSettings(false)}>
        <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowSettings(false)}>×</button>
          <span className="modal-icon">⌁</span>
          <h2>맥미니 AI 연결</h2>
          <p>집에서 AI 서버를 만든 뒤 받게 될 주소를 여기에 넣습니다. 지금은 비워 두셔도 됩니다.</p>
          <label htmlFor="endpoint">연결 주소</label>
          <input id="endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="예: https://ai.jblab.kr/chat" />
          <div className="modal-actions"><button onClick={() => { setEndpoint(""); localStorage.removeItem("jb-ai-endpoint"); setShowSettings(false); }}>연결 해제</button><button onClick={saveEndpoint}>저장</button></div>
        </section>
      </div>}
    </main>
  );
}
