"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { richText } from "@/lib/format";
import type { ChatMsg } from "@/lib/types";
import { BackButton, Icon } from "@/components/ui";

function Message({ m }: { m: ChatMsg }) {
  if (m.who === "u") return <div className="m u">{m.text}</div>;
  const lines = richText(m.text);
  return (
    <div className="m a">
      {lines.map((l, i) => {
        const body = l.parts.map((p, j) => (p.b ? <b key={j}>{p.t}</b> : <span key={j}>{p.t}</span>));
        return l.type === "li" ? <ul key={i}><li>{body}</li></ul> : <div key={i} style={{ marginTop: i ? 6 : 0 }}>{body}</div>;
      })}
      {!!m.sources?.length && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {m.sources.includes("model") && <span className="src model"><Icon name="check" size={12} />From your estimate</span>}
          {m.sources.includes("general") && <span className="src general"><Icon name="info" size={12} />General guidance, not from the model</span>}
        </div>
      )}
    </div>
  );
}

function Chat() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const { t, lang, hydrated, getPrediction, generalChat, appendChat, toast } = useStore();
  const p = getPrediction(id);
  const thread = p ? p.chat : generalChat;
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [rec, setRec] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const greeted = useRef(false);

  useEffect(() => {
    if (!hydrated || greeted.current || thread.length) return;
    greeted.current = true;
    const b = p?.response.bags;
    appendChat(p?.id ?? null, p
      ? { who: "a", text: `Moni! You may harvest about **${b!.expected} bags**, ${p.response.gap_bags >= 0 ? "which meets your goal" : `about **${-p.response.gap_bags} bags** short of your goal`}. What would you like to know?`, sources: ["model"] }
      : { who: "a", text: "Moni! Ask me anything about growing maize." });
  }, [hydrated, thread.length, p, appendChat]);

  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [thread.length, typing]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || typing) return;
    setInput("");
    appendChat(p?.id ?? null, { who: "u", text: q });
    setTyping(true);
    try {
      const r = await api.advise(p?.request ?? null, q, lang);
      appendChat(p?.id ?? null, { who: "a", text: r.text, sources: r.sources });
    } catch {
      appendChat(p?.id ?? null, { who: "a", text: "Sorry, I couldn't reach the server. Please try again." });
    } finally {
      setTyping(false);
    }
  }

  type SR = { lang: string; interimResults: boolean; start: () => void; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onerror: (e: { error: string }) => void; onend: () => void };
  function voice() {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { toast("Voice input isn't supported in this browser yet. Please type your question."); return; }
    const r = new Ctor();
    r.lang = lang === "ny" ? "ny-MW" : "en-US";
    r.interimResults = false;
    setRec(true);
    r.onresult = (e) => send(e.results[0][0].transcript);
    r.onerror = (e) => toast(e.error === "not-allowed" ? "Microphone permission is off. Allow it in browser settings." : e.error === "language-not-supported" ? "Voice isn't available in this language yet." : "Didn't catch that. Please try again.");
    r.onend = () => setRec(false);
    try { r.start(); } catch { setRec(false); }
  }

  const qs = p ? ["How can I reach my goal?", "What if the rains are poor?", "Is there a cheaper option than fertilizer?", "When should I plant?"]
    : ["When should I plant maize?", "How do I store maize safely?"];
  const srSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  return (
    <section className="view active" aria-label="Farming advisor">
      <div className="chathead">
        <BackButton />
        <div className="bot"><Icon name="leaf" /></div>
        <div><b>{t("advisor")}</b><small>{t("advisorSub")}</small></div>
      </div>
      <div className="ctx">
        {p ? (
          <><b><Icon name="info" size={16} />Talking about your estimate · {new Date(p.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</b>
            {p.request.features.name} · about {p.response.bags.expected} bags · goal {p.response.bags.goal} bags</>
        ) : (
          <><b><Icon name="info" size={16} />No estimate yet</b>I can answer general questions. For advice about your own field, make an estimate first.
            <button className="btn btn-primary" onClick={() => router.push("/estimate/location")}>Estimate my harvest</button></>
        )}
      </div>
      <div className="msgs" ref={box} aria-live="polite">
        {thread.map((m, i) => <Message key={i} m={m} />)}
        {typing && <div className="m a"><span className="typing"><span /><span /><span /></span></div>}
      </div>
      <div className="chips">{qs.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>
      <div className="composer">
        <label className="sr" htmlFor="inp">Message</label>
        <input id="inp" autoComplete="off" placeholder={t("ask")} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className={`icb mic ${srSupported ? "" : "off"} ${rec ? "rec" : ""}`} onClick={voice} aria-label="Voice input"><Icon name="mic" /></button>
        <button className="icb send" onClick={() => send()} aria-label="Send"><Icon name="send" size={20} /></button>
      </div>
    </section>
  );
}

export default function ChatPage() {
  return <Suspense fallback={null}><Chat /></Suspense>;
}
