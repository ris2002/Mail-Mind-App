import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const DEFAULT_SUMMARY_PROMPT = `In one sentence, what does this email want or say? Be direct and specific. Include names, dates, amounts if present. Subject: {subject}. From: {sender}. Body: {body}`;
const DEFAULT_REPLY_PROMPT = `You are {user_name}, {user_title}.
Write a real email reply. Never use placeholders like [Name] or [Company]. Use actual names from the context.

Replying to: {sender}
About: {subject}
Context: {summary}
Your message to communicate: {intent}

Start with: Hi {sender},
End with: Best regards, {user_name}

Write the reply now:`;

export default function Setup({ onComplete }) {
  const [step, setStep] = useState(0);
  const [ollamaStatus, setOllamaStatus] = useState("idle");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [gmailEmail, setGmailEmail] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [gmailStatus, setGmailStatus] = useState("idle");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [chromaPath, setChromaPath] = useState("");
  const [summaryPrompt, setSummaryPrompt] = useState(DEFAULT_SUMMARY_PROMPT);
  const [replyPrompt, setReplyPrompt] = useState(DEFAULT_REPLY_PROMPT);
  const [userName, setUserName] = useState("");
  const [userTitle, setUserTitle] = useState("");

  const steps = ["AI Model", "Gmail", "Hours", "Storage", "Profile", "Prompts"];

  useEffect(() => {
    detectOllama();
    fetch(`${API}/api/settings/defaults`)
      .then(r => r.json())
      .then(d => { if (d.chroma_path) setChromaPath(d.chroma_path); })
      .catch(() => setChromaPath("~/.mailmind/chroma_db"));
  }, []);

  const detectOllama = async () => {
    setOllamaStatus("checking");
    try {
      const res = await fetch(`${API}/api/ollama/models`);
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setModels(data.models);
        setSelectedModel(data.models[0].name);
        setOllamaStatus("connected");
      } else {
        setOllamaStatus("no_models");
      }
    } catch { setOllamaStatus("error"); }
  };

  const connectGmail = async () => {
    setGmailStatus("checking");
    try {
      const res = await fetch(`${API}/api/auth/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: gmailEmail, app_password: gmailAppPassword }),
      });
      if (res.ok) setGmailStatus("connected");
      else setGmailStatus("error");
    } catch { setGmailStatus("error"); }
  };

  const saveAndFinish = async () => {
    await fetch(`${API}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        work_start: workStart,
        work_end: workEnd,
        check_interval: 30,
        chroma_path: chromaPath,  // backend will resolve this to absolute path
        user_name: userName || "User",
        user_title: userTitle || "Professional",
      }),
    });
    await fetch(`${API}/api/daemon/start`, { method: "POST" });
    onComplete();
  };

  const canProceed = () => {
    if (step === 0) return ollamaStatus === "connected";
    if (step === 1) return gmailStatus === "connected";
    if (step === 2) return workStart && workEnd;
    if (step === 3) return true; // backend resolves and creates path automatically
    if (step === 4) return userName.length > 0;
    return true;
  };

  const ollamaColor = () => ({ connected: "#22c55e", checking: "#f97316", error: "#ef4444", no_models: "#ef4444" }[ollamaStatus] || "#6b7280");
  const ollamaText = () => ({ idle: "Detecting...", checking: "Scanning localhost:11434...", connected: `${models.length} model${models.length !== 1 ? "s" : ""} found`, no_models: "Ollama found but no models installed", error: "Ollama not running — start with: ollama serve" }[ollamaStatus]);

  const inputStyle = { width: "100%", padding: "9px 11px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: "12px", fontFamily: "'DM Mono', monospace", transition: "border-color 0.2s" };
  const labelStyle = { display: "block", fontSize: "10px", color: "#6b7280", marginBottom: "6px", letterSpacing: "0.06em", textTransform: "uppercase" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .model-row:hover { background: rgba(249,115,22,0.05) !important; border-color: rgba(249,115,22,0.3) !important; }
        input:focus, textarea:focus { outline: none; border-color: #f97316 !important; }
        .btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .btn:active { transform: translateY(0) !important; }
        .link-btn { font-size:10px; color:#4b5563; background:transparent; border:none; cursor:pointer; text-decoration:underline; font-family:'DM Sans',sans-serif; }
      `}</style>

      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "9px", marginBottom: "6px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: "#fff" }}>✦</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#f1f5f9", fontWeight: 600 }}>MailMind</span>
          </div>
          <p style={{ color: "#4b5563", fontSize: "11px", letterSpacing: "0.04em" }}>Private · Local · Zero cloud</p>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "22px" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontFamily: "'DM Mono', monospace", background: i < step ? "#f97316" : i === step ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.04)", border: i < step ? "none" : i === step ? "1.5px solid #f97316" : "1.5px solid rgba(255,255,255,0.07)", color: i < step ? "#fff" : i === step ? "#f97316" : "#374151", transition: "all 0.3s" }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: "9px", color: i === step ? "#d1d5db" : "#374151", whiteSpace: "nowrap" }}>{s}</span>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: "1px", margin: "0 3px", marginBottom: "14px", background: i < step ? "#f97316" : "rgba(255,255,255,0.06)", transition: "all 0.4s" }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div key={step} style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "22px", animation: "fadeUp 0.3s ease", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>

          {/* STEP 0 — Ollama */}
          {step === 0 && (
            <div>
              <h2 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: 600, marginBottom: "5px" }}>Choose AI Model</h2>
              <p style={{ color: "#6b7280", fontSize: "12px", lineHeight: "1.6", marginBottom: "16px" }}>MailMind uses Ollama to run AI locally. Your emails never leave your machine.</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", borderRadius: "8px", marginBottom: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0, background: ollamaColor(), animation: ollamaStatus === "checking" ? "pulse 1.5s infinite" : "none" }} />
                <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "'DM Mono', monospace", flex: 1 }}>{ollamaText()}</span>
                {(ollamaStatus === "error" || ollamaStatus === "no_models") && <button className="link-btn" onClick={detectOllama} style={{ color: "#f97316" }}>Retry</button>}
              </div>
              {models.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
                  {models.map(m => (
                    <div key={m.name} className="model-row" onClick={() => setSelectedModel(m.name)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "8px", cursor: "pointer", border: `1.5px solid ${selectedModel === m.name ? "#f97316" : "rgba(255,255,255,0.06)"}`, background: selectedModel === m.name ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)", transition: "all 0.15s" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, background: selectedModel === m.name ? "#f97316" : "rgba(255,255,255,0.12)" }} />
                      <span style={{ flex: 1, fontSize: "12px", color: "#e5e7eb", fontFamily: "'DM Mono', monospace" }}>{m.name}</span>
                      {m.size > 0 && <span style={{ fontSize: "10px", color: "#4b5563", fontFamily: "'DM Mono', monospace" }}>{(m.size / 1e9).toFixed(1)}GB</span>}
                    </div>
                  ))}
                </div>
              )}
              {ollamaStatus === "error" && (
                <div style={{ padding: "11px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p style={{ fontSize: "11px", color: "#fca5a5", marginBottom: "5px" }}>Ollama not found. Install and run:</p>
                  <code style={{ fontSize: "11px", color: "#9ca3af", display: "block", fontFamily: "'DM Mono', monospace" }}>curl -fsSL https://ollama.com/install.sh | sh</code>
                  <code style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginTop: "3px", fontFamily: "'DM Mono', monospace" }}>ollama pull qwen2.5:1.5b && ollama serve</code>
                </div>
              )}
            </div>
          )}

          {/* STEP 1 — Gmail */}
          {step === 1 && (
            <div>
              <h2 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: 600, marginBottom: "5px" }}>Connect Gmail</h2>
              <p style={{ color: "#6b7280", fontSize: "12px", lineHeight: "1.6", marginBottom: "16px" }}>Uses a Gmail App Password — works for everyone, no Google verification needed.</p>
              <div style={{ padding: "11px 13px", borderRadius: "8px", marginBottom: "14px", background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.1)", fontSize: "12px", color: "#9ca3af", lineHeight: "1.7" }}>
                <p style={{ fontWeight: 500, color: "#f1f5f9", marginBottom: "6px" }}>How to get an App Password:</p>
                <p>1. Go to <span style={{ color: "#f97316", fontFamily: "'DM Mono', monospace" }}>myaccount.google.com/apppasswords</span></p>
                <p>2. Name it "MailMind" → Generate</p>
                <p>3. Copy the 16-character password (no spaces)</p>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={labelStyle}>Gmail address</label>
                <input type="email" value={gmailEmail} onChange={e => setGmailEmail(e.target.value)} placeholder="you@gmail.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>App Password</label>
                <input type="password" value={gmailAppPassword} onChange={e => setGmailAppPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" style={inputStyle} />
              </div>
              {gmailStatus === "idle" && (
                <button className="btn" onClick={connectGmail} disabled={!gmailEmail || !gmailAppPassword} style={{ width: "100%", padding: "11px", borderRadius: "9px", border: "none", background: gmailEmail && gmailAppPassword ? "#f97316" : "rgba(255,255,255,0.05)", color: gmailEmail && gmailAppPassword ? "#fff" : "#374151", fontSize: "13px", fontWeight: 600, cursor: gmailEmail && gmailAppPassword ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}>
                  Connect Gmail →
                </button>
              )}
              {gmailStatus === "checking" && <div style={{ padding: "11px", borderRadius: "9px", textAlign: "center", border: "1.5px solid rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.04)", color: "#f97316", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>Testing connection...</div>}
              {gmailStatus === "connected" && <div style={{ padding: "11px", borderRadius: "9px", border: "1.5px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.06)", color: "#22c55e", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>✓ Gmail connected — {gmailEmail}</div>}
              {gmailStatus === "error" && <div style={{ padding: "11px", borderRadius: "9px", border: "1.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#fca5a5", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>✗ Connection failed — check your app password</div>}
            </div>
          )}

          {/* STEP 2 — Working Hours */}
          {step === 2 && (
            <div>
              <h2 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: 600, marginBottom: "5px" }}>Working Hours</h2>
              <p style={{ color: "#6b7280", fontSize: "12px", lineHeight: "1.6", marginBottom: "16px" }}>MailMind only runs during these hours. Outside them — completely idle.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                {[["Start time", workStart, setWorkStart], ["End time", workEnd, setWorkEnd]].map(([label, val, set]) => (
                  <div key={label}>
                    <label style={labelStyle}>{label}</label>
                    <input type="time" value={val} onChange={e => set(e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ padding: "11px 13px", borderRadius: "8px", background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.1)", fontSize: "12px", color: "#9ca3af", lineHeight: "1.6" }}>
                Checks every 30 minutes between {workStart} and {workEnd}.
              </div>
            </div>
          )}

          {/* STEP 3 — Storage */}
          {step === 3 && (
            <div>
              <h2 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: 600, marginBottom: "5px" }}>Storage Location</h2>
              <p style={{ color: "#6b7280", fontSize: "12px", lineHeight: "1.6", marginBottom: "16px" }}>Where should MailMind store your email memory?</p>
              <label style={labelStyle}>ChromaDB path</label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input type="text" value={chromaPath} onChange={e => setChromaPath(e.target.value)} placeholder="/Users/you/.mailmind/chroma_db" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={async () => {
                  try {
                    const dir = await window.showDirectoryPicker();
                    // Can't get full path in browser — fetch resolved default and append folder name
                    const res = await fetch(`${API}/api/settings/defaults`);
                    const d = await res.json();
                    // Use the parent of default chroma path + chosen folder name
                    const parent = d.chroma_path.split("/").slice(0, -1).join("/");
                    setChromaPath(`${parent}/${dir.name}`);
                  } catch {}
                }} style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#9ca3af", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>Browse</button>
              </div>
              <button className="link-btn" onClick={() => { fetch(`${API}/api/settings/defaults`).then(r => r.json()).then(d => { if (d.chroma_path) setChromaPath(d.chroma_path); }).catch(() => {}); }} style={{ marginBottom: "14px", display: "block" }}>Reset to default</button>
              <div style={{ padding: "11px 13px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", color: "#6b7280", lineHeight: "1.7" }}>
                Only flagged email embeddings stored here. Delete folder anytime to wipe memory.
              </div>
            </div>
          )}

          {/* STEP 4 — Profile */}
          {step === 4 && (
            <div>
              <h2 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: 600, marginBottom: "5px" }}>Your Profile</h2>
              <p style={{ color: "#6b7280", fontSize: "12px", lineHeight: "1.6", marginBottom: "16px" }}>
                Used to personalise reply drafts. The AI will sign off as you with your real name.
              </p>
              <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>Your name *</label>
                <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Rishil" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Job title (optional)</label>
                <input type="text" value={userTitle} onChange={e => setUserTitle(e.target.value)} placeholder="MSc Student / AI Engineer" style={inputStyle} />
              </div>
              <div style={{ padding: "11px 13px", borderRadius: "8px", background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.1)", fontSize: "12px", color: "#9ca3af", lineHeight: "1.7" }}>
                Replies will end with: <span style={{ color: "#f97316", fontFamily: "'DM Mono', monospace" }}>Best regards, {userName || "Your Name"}</span>
              </div>
            </div>
          )}

          {/* STEP 5 — Prompts */}
          {step === 5 && (
            <div>
              <h2 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: 600, marginBottom: "5px" }}>AI Prompt Style</h2>
              <p style={{ color: "#6b7280", fontSize: "12px", lineHeight: "1.6", marginBottom: "16px" }}>Customise how the AI summarises and replies. Can also change this later in Settings.</p>
              {[
                { label: "Summary prompt", value: summaryPrompt, set: setSummaryPrompt, def: DEFAULT_SUMMARY_PROMPT },
                { label: "Reply prompt", value: replyPrompt, set: setReplyPrompt, def: DEFAULT_REPLY_PROMPT },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>{f.label}</label>
                    <button className="link-btn" onClick={() => f.set(f.def)}>Reset to default</button>
                  </div>
                  <textarea value={f.value} onChange={e => f.set(e.target.value)} rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: "12px", fontFamily: "'DM Mono', monospace", resize: "none", lineHeight: "1.6", transition: "border-color 0.2s" }} />
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "1.5px solid rgba(255,255,255,0.07)", background: "transparent", color: "#6b7280", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Back</button>
            )}
            {step < steps.length - 1 ? (
              <button className="btn" onClick={() => setStep(s => s + 1)} disabled={!canProceed()} style={{ flex: 2, padding: "10px", borderRadius: "9px", border: "none", background: canProceed() ? "#f97316" : "rgba(255,255,255,0.05)", color: canProceed() ? "#fff" : "#374151", fontSize: "13px", fontWeight: 600, cursor: canProceed() ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}>
                Continue →
              </button>
            ) : (
              <button className="btn" onClick={saveAndFinish} style={{ flex: 2, padding: "10px", borderRadius: "9px", border: "none", background: "#f97316", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}>
                Launch MailMind →
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "14px", fontSize: "11px", color: "#374151" }}>
          🔒 All processing happens locally. Zero data leaves your machine.
        </p>
      </div>
    </div>
  );
}
