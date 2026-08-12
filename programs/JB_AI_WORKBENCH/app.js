const $ = (s) => document.querySelector(s);
const messages = $("#messages");
const question = $("#question");
const sendBtn = $("#sendBtn");
const modal = $("#modal");
const endpointInput = $("#endpoint");
let conversation = [{ role: "AI", text: "안녕하세요, 준범님. 과학 문항 제작과 교재 검토를 도와드릴 준비가 되었습니다." }];

function updateStatus() {
  const endpoint = localStorage.getItem("jb-ai-endpoint") || "";
  $("#status").classList.toggle("ready", !!endpoint);
  $("#status").innerHTML = `<i></i>${endpoint ? "연결 주소 저장됨" : "맥미니 연결 전"}`;
  $("#modeText").textContent = endpoint ? "맥미니 연결 모드" : "화면 체험 모드";
  endpointInput.value = endpoint;
}

function addMessage(role, text, thinking = false) {
  $("#welcome")?.remove();
  const item = document.createElement("article");
  item.className = `message ${role === "나" ? "user" : "assistant"}`;
  item.innerHTML = `<div class="avatar">${role === "나" ? "나" : "JB"}</div><div><strong>${role === "나" ? "준범님" : "J&B AI"}</strong><p>${thinking ? '<i></i><i></i><i></i>' : ""}</p></div>`;
  if (!thinking) item.querySelector("p").textContent = text;
  else item.querySelector("p").className = "thinking";
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
  return item;
}

async function send() {
  const text = question.value.trim();
  if (!text) return;
  addMessage("나", text); conversation.push({ role: "나", text });
  question.value = ""; sendBtn.disabled = true;
  const thinking = addMessage("AI", "", true);
  const endpoint = localStorage.getItem("jb-ai-endpoint") || "";
  let answer;
  if (!endpoint) {
    await new Promise((r) => setTimeout(r, 650));
    answer = "현재는 화면 체험 모드입니다. 집에서 맥미니 AI를 준비한 뒤 연결 주소를 입력하면 이 자리에 실제 답변이 표시됩니다.";
  } else {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      answer = data.answer || data.message || JSON.stringify(data);
    } catch {
      answer = "맥미니 AI에 연결하지 못했습니다. 맥미니가 켜져 있는지와 연결 주소를 확인해 주세요.";
    }
  }
  thinking.remove(); addMessage("AI", answer); conversation.push({ role: "AI", text: answer });
}

document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => { question.value = button.dataset.prompt; sendBtn.disabled = false; question.focus(); }));
question.addEventListener("input", () => sendBtn.disabled = !question.value.trim());
question.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
$("#composer").addEventListener("submit", (e) => { e.preventDefault(); send(); });
$("#settingsBtn").addEventListener("click", () => modal.classList.remove("hidden"));
$("#closeModal").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
$("#saveEndpoint").addEventListener("click", () => { localStorage.setItem("jb-ai-endpoint", endpointInput.value.trim()); modal.classList.add("hidden"); updateStatus(); });
$("#disconnect").addEventListener("click", () => { localStorage.removeItem("jb-ai-endpoint"); modal.classList.add("hidden"); updateStatus(); });
$("#copyChat").addEventListener("click", () => navigator.clipboard?.writeText(conversation.map((m) => `${m.role}: ${m.text}`).join("\n\n")));
$("#newChat").addEventListener("click", () => location.reload());
updateStatus();
