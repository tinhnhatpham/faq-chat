import { useEffect, useRef, useState } from "react";
import "./ChatWidget.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAX_LENGTH = 500; // same cap as the backend
const inIframe = window.parent !== window;

export default function ChatWidget({ businessId }) {
  const [business, setBusiness] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [messages, setMessages] = useState([]); // [{role: "user"|"assistant", content}]
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [queued, setQueued] = useState(""); // question sent in by the host page
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Load the display info (name, color). The FAQ itself never reaches the browser.
  useEffect(() => {
    fetch(`${API_URL}/api/business/${encodeURIComponent(businessId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setBusiness)
      .catch(() => setLoadError("This chat is unavailable right now."));
  }, [businessId]);

  // Tell widget.js the current brand color so the chat button matches the database
  useEffect(() => {
    if (business && inIframe) window.parent.postMessage({ type: "faq-chat:ready", color: business.color }, "*");
  }, [business]);

  // widget.js says the chat was opened: put the cursor in the input. The host page can pass a
  // question: with send it's asked right away (the visitor clicked a "question" button on the
  // page), otherwise it's only typed in for the visitor to send.
  useEffect(() => {
    function onMessage(e) {
      if (e.source !== window.parent || e.data?.type !== "faq-chat:open") return;
      const question = typeof e.data.question === "string" ? e.data.question.trim().slice(0, MAX_LENGTH) : "";
      if (question && e.data.send) setQueued(question);
      else if (question) setInput(question);
      inputRef.current?.focus();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Ask a queued question once the business has loaded and no reply is pending
  useEffect(() => {
    if (!queued || !business || sending) return;
    setQueued("");
    sendText(queued);
  }, [queued, business, sending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest message in view
  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages, sending]);

  function send(e) {
    e.preventDefault();
    sendText(input.trim());
  }

  async function sendText(text) {
    if (!text || sending) return;

    const history = messages;
    setMessages([...history, { role: "user", content: text }]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, message: text, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setMessages([...history, { role: "user", content: text }, { role: "assistant", content: data.reply }]);
    } catch (err) {
      // Undo the failed message so history never has an unanswered question in it,
      // and put the text back so the visitor can retry.
      setMessages(history);
      setInput(text);
      setError(err instanceof TypeError ? "Can't reach the assistant. Check your connection." : err.message);
    } finally {
      setSending(false);
    }
  }

  function close() {
    window.parent.postMessage({ type: "faq-chat:close" }, "*");
  }

  if (loadError) return <div className="fc-panel fc-center">{loadError}</div>;
  if (!business) return <div className="fc-panel fc-center">Loading…</div>;

  return (
    <div className="fc-panel" style={{ "--brand": business.color }}>
      <header className="fc-header">
        <span>{business.name}</span>
        {inIframe && (
          <button className="fc-close" onClick={close} aria-label="Close chat">
            ×
          </button>
        )}
      </header>

      <div className="fc-messages" ref={listRef}>
        <div className="fc-msg fc-assistant">Hi! Ask me anything about {business.name}.</div>
        {messages.map((m, i) => (
          <div key={i} className={`fc-msg fc-${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="fc-msg fc-assistant fc-typing">Typing…</div>}
      </div>

      {error && <div className="fc-error">{error}</div>}

      <form className="fc-form" onSubmit={send}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          maxLength={MAX_LENGTH}
          aria-label="Your question"
          autoFocus={!inIframe}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
