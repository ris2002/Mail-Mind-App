import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const api = {
  getStatus:       () => fetch(`${API}/api/daemon/status`).then(r => r.json()),
  getEmails:       () => fetch(`${API}/api/emails/summaries`).then(r => r.json()),
  triggerFetch:    () => fetch(`${API}/api/emails/fetch`, { method: "POST" }).then(r => r.json()),
  summarise:       (id) => fetch(`${API}/api/emails/summarise/${id}`, { method: "POST" }).then(r => r.json()),
  flagEmail:       (id) => fetch(`${API}/api/emails/flag`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email_id: id }) }).then(r => r.json()),
  dismissEmail:    (id) => fetch(`${API}/api/emails/dismiss`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email_id: id }) }).then(r => r.json()),
  blockSender:     (id) => fetch(`${API}/api/blocklist/block-sender/${id}`, { method: "POST" }).then(r => r.json()),
  draftReply:      (id, intent) => fetch(`${API}/api/reply/draft`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email_id: id, user_intent: intent }) }).then(r => r.json()),
  sendReply:       (id, draft) => fetch(`${API}/api/reply/send`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email_id: id, draft }) }).then(r => r.json()),
  getOllamaModels: () => fetch(`${API}/api/ollama/models`).then(r => r.json()),
  setModel:        (model) => fetch(`${API}/api/ollama/set-model`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ model }) }).then(r => r.json()),
  getSettings:     () => fetch(`${API}/api/settings`).then(r => r.json()),
  saveSettings:    (s) => fetch(`${API}/api/settings`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(s) }).then(r => r.json()),
  getBlocklist:    () => fetch(`${API}/api/blocklist`).then(r => r.json()),
  getEmailsFiltered: (from, to, flaggedOnly) => {
    const params = new URLSearchParams();
    if (from) params.append("date_from", from);
    if (to) params.append("date_to", to);
    if (flaggedOnly) params.append("flagged_only", "true");
    return fetch(`${API}/api/emails/summaries?${params}`).then(r => r.json());
  },
  addBlock:        (entry) => fetch(`${API}/api/blocklist/add`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ entry }) }).then(r => r.json()),
  removeBlock:     (entry) => fetch(`${API}/api/blocklist/remove`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ entry }) }).then(r => r.json()),
  signOut:         () => fetch(`${API}/api/auth/signout`, { method: "POST" }).then(r => r.json()),
};

const Ic = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IC = {
  mail: "M3 8l9 6 9-6M5 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z",
  reply: "M9 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l4 4v5M13 22l3-3-3-3M22 19h-6",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  x: "M18 6L6 18M6 6l12 12",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  shield: "M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z",
  cpu: "M9 3H5a2 2 0 0 0-2 2v4m6-6h6m-6 0v18m6-18h4a2 2 0 0 1 2 2v4m-6-6v18m0 0H9m6 0h4a2 2 0 0 0 2-2v-4M3 9v6m18-6v6M3 15h18M3 9h18",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1",
  chevron: "M6 9l6 6 6-6",
  check: "M5 12l4.5 4.5L19 7",
  block: "M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  calendar: "M8 2v3M16 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  plus: "M12 5v14M5 12h14",
};

// ── Skeleton shimmer component ────────────────────────────
const Skeleton = ({ width = "100%", height = "12px", style = {} }) => (
  <div style={{
    width, height,
    borderRadius: "6px",
    background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
    backgroundSize: "200% 100%",
    animation: "skeleton-shimmer 1.4s infinite",
    ...style
  }} />
);

export default function Dashboard({ onSignOut }) {
  const [emails, setEmails] = useState([]);
  const [status, setStatus] = useState({ paused: false, last_check: "—", next_check: "—", model: "qwen2.5:1.5b" });
  const [models, setModels] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [summarising, setSummarising] = useState(false);
  const [replyPanel, setReplyPanel] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [activeModel, setActiveModel] = useState("qwen2.5:1.5b");
  const [fetching, setFetching] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [activeNav, setActiveNav] = useState("email");
  const [settings, setSettings] = useState({ work_start: "09:00", work_end: "18:00", user_name: "Rishil", user_title: "AI Engineer" });
  const [blocklist, setBlocklist] = useState([]);
  const [blockInput, setBlockInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const modelMenuRef = useRef(null);

  useEffect(() => {
    Promise.all([api.getStatus(), api.getEmails(), api.getOllamaModels(), api.getSettings(), api.getBlocklist()])
      .then(([s, e, m, cfg, bl]) => {
        setStatus(s);
        setEmails(Array.isArray(e) ? e : []);
        setModels(m.models || []);
        setActiveModel(s.model || "qwen2.5:1.5b");
        setSettings(cfg);
        setBlocklist(bl.blocklist || []);
      }).catch(() => {});
    const interval = setInterval(() => api.getStatus().then(setStatus).catch(() => {}), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) setShowModelMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fix 3: Show body preview instantly, summarise in background ──
  const handleSelectEmail = async (email) => {
    setReplyPanel(null);

    // Show email instantly with body preview as placeholder
    const preview = email.body ? email.body.slice(0, 200).replace(/\s+/g, ' ') + "..." : "";
    setSelectedEmail({ ...email, _preview: preview });

    if (email.summarised) return;

    setSummarising(true);
    try {
      const res = await api.summarise(email.id);
      const updated = { ...email, summary: res.summary, summarised: true, _preview: undefined };
      setSelectedEmail(updated);
      setEmails(prev => prev.map(e => e.id === email.id ? updated : e));
    } catch {
      setSelectedEmail(prev => ({ ...prev, summary: "Could not summarise.", summarised: true }));
    }
    setSummarising(false);
  };

  const handleFetch = async () => {
    setFetching(true);
    try {
      const fetched = await api.triggerFetch();
      if (Array.isArray(fetched)) {
        // Merge: preserve current flagged state from UI
        // Backend is the source of truth but local flag state takes priority
        setEmails(prev => {
          const prevMap = {};
          prev.forEach(e => { prevMap[e.id] = e; });
          return fetched.map(e => ({
            ...e,
            flagged: prevMap[e.id]?.flagged ?? e.flagged,
          }));
        });
      }
    } catch (e) { console.error(e); }
    setFetching(false);
  };

  const handleFlag = async (email) => {
    try {
      const res = await api.flagEmail(email.id);
      const newFlagged = res.flagged;
      const updated = { ...email, flagged: newFlagged };
      setEmails(prev => prev.map(e => e.id === email.id ? updated : e));
      if (selectedEmail?.id === email.id) setSelectedEmail(updated);
    } catch (e) {
      console.error("Flag failed", e);
    }
  };

  const handleDismiss = (emailId) => {
    api.dismissEmail(emailId).catch(() => {});
    setEmails(prev => prev.filter(e => e.id !== emailId));
    if (selectedEmail?.id === emailId) setSelectedEmail(null);
  };

  const handleBlockSender = async (emailId) => {
    await api.blockSender(emailId).catch(() => {});
    setEmails(prev => prev.filter(e => e.id !== emailId));
    if (selectedEmail?.id === emailId) setSelectedEmail(null);
    const bl = await api.getBlocklist().catch(() => ({ blocklist: [] }));
    setBlocklist(bl.blocklist || []);
  };

  const handleDraftReply = async () => {
    setDraftLoading(true);
    try {
      const res = await api.draftReply(replyPanel.emailId, replyPanel.intent);
      setReplyPanel(p => ({ ...p, draft: res.draft, stage: "review" }));
    } catch {
      setReplyPanel(p => ({
        ...p,
        draft: `Hi ${selectedEmail?.sender_first || "there"},\n\nThank you for your message. ${p.intent}\n\nBest regards, ${settings.user_name || ""}`,
        stage: "review",
      }));
    }
    setDraftLoading(false);
  };

  const handleSend = async () => {
    try { await api.sendReply(replyPanel.emailId, replyPanel.draft); } catch (e) { console.error(e); }
    const emailId = replyPanel.emailId;
    setReplyPanel(null);
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, read: true } : e));
  };

  const handleModelSwitch = (modelName) => {
    setActiveModel(modelName);
    setShowModelMenu(false);
    api.setModel(modelName).catch(() => {});
  };

  const handleAddBlock = async () => {
    if (!blockInput.trim()) return;
    const res = await api.addBlock(blockInput.trim()).catch(() => null);
    if (res) setBlocklist(res.blocklist);
    setBlockInput("");
  };

  const handleRemoveBlock = async (entry) => {
    const res = await api.removeBlock(entry).catch(() => null);
    if (res) setBlocklist(res.blocklist);
  };

  const handleFilter = async () => {
    setFiltering(true);
    try {
      const filtered = await api.getEmailsFiltered(dateFrom, dateTo, flaggedOnly);
      setEmails(Array.isArray(filtered) ? filtered : []);
    } catch (e) { console.error(e); }
    setFiltering(false);
  };

  const handleClearFilter = async () => {
    setDateFrom("");
    setDateTo("");
    setFlaggedOnly(false);
    const all = await api.getEmails().catch(() => []);
    setEmails(Array.isArray(all) ? all : []);
  };

  const unread = emails.filter(e => !e.read).length;
  const flaggedEmails = emails.filter(e => e.flagged);

  // What to show in the summary box
  const summaryDisplay = selectedEmail?.summarised
    ? selectedEmail.summary
    : selectedEmail?._preview || "";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#09090e", fontFamily: "'IBM Plex Sans', sans-serif", color: "#e2e8f0", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Fraunces:wght@600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; scrollbar-width: thin; scrollbar-color: #1e2030 transparent; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1e2030; border-radius: 4px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .email-row:hover { background: rgba(255,255,255,0.025) !important; }
        .nav-item:hover { background: rgba(255,255,255,0.03) !important; }
        .icon-btn:hover { color: #f1f5f9 !important; }
        .model-opt:hover { background: rgba(249,115,22,0.08) !important; }
        .action-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .action-btn:active { transform: translateY(0) !important; }
        textarea:focus, input:focus { outline: none; border-color: #f97316 !important; }
        .settings-tab { cursor:pointer; padding:6px 12px; border-radius:6px; font-size:12px; border:none; background:transparent; transition:all 0.15s; }
        .settings-tab:hover { background: rgba(255,255,255,0.05); }
        .link-btn { font-size:10px; color:#4b5563; background:transparent; border:none; cursor:pointer; text-decoration:underline; }
        .block-row:hover .rm-btn { opacity:1 !important; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ height: "44px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 14px", gap: "12px", background: "#09090e", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#fff" }}>✦</div>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: "14px", color: "#f1f5f9", fontWeight: 600 }}>MailMind</span>
        </div>
        <div style={{ flex: 1 }} />

        <div ref={modelMenuRef} style={{ position: "relative" }}>
          <button onClick={() => setShowModelMenu(m => !m)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)", color: "#9ca3af", fontSize: "11px", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
            <Ic d={IC.cpu} size={12} /><span>{activeModel}</span>
            <div style={{ transform: showModelMenu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><Ic d={IC.chevron} size={10} /></div>
          </button>
          {showModelMenu && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#161620", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "10px", padding: "6px", minWidth: "230px", zIndex: 100, boxShadow: "0 12px 40px rgba(0,0,0,0.6)", animation: "fadeIn 0.15s ease" }}>
              <p style={{ fontSize: "10px", color: "#4b5563", padding: "4px 8px 6px", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>Ollama models</p>
              {models.length === 0 && <p style={{ fontSize: "11px", color: "#374151", padding: "6px 8px" }}>No models — is Ollama running?</p>}
              {models.map(m => (
                <div key={m.name} className="model-opt" onClick={() => handleModelSwitch(m.name)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "7px", cursor: "pointer", transition: "background 0.15s" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, background: activeModel === m.name ? "#f97316" : "rgba(255,255,255,0.12)" }} />
                  <span style={{ flex: 1, fontSize: "12px", color: activeModel === m.name ? "#f97316" : "#9ca3af", fontFamily: "'IBM Plex Mono', monospace" }}>{m.name}</span>
                  {m.size > 0 && <span style={{ fontSize: "10px", color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{(m.size / 1e9).toFixed(1)}GB</span>}
                  {activeModel === m.name && <Ic d={IC.check} size={11} />}
                </div>
              ))}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "6px 0" }} />
              <p style={{ fontSize: "10px", color: "#374151", padding: "2px 8px", fontFamily: "'IBM Plex Mono', monospace" }}>Add: <span style={{ color: "#4b5563" }}>ollama pull &lt;model&gt;</span></p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#22c55e" }}>
          <Ic d={IC.shield} size={12} /><span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace" }}>local</span>
        </div>

        {[
          { icon: IC.settings, title: "Settings", action: () => setShowSettings(true) },
          { icon: IC.logout, title: "Sign out", action: onSignOut },
        ].map((b, i) => (
          <button key={i} className="icon-btn" title={b.title} onClick={b.action} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#4b5563", padding: "5px", borderRadius: "6px", display: "flex", transition: "color 0.15s" }}>
            <Ic d={b.icon} size={14} />
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: "160px", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "12px 8px", display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
          {[
            { id: "email", label: "Email", icon: IC.mail, badge: unread },
            { id: "calendar", label: "Calendar", icon: IC.calendar, locked: true },
          ].map(item => (
            <div key={item.id} className="nav-item" onClick={() => !item.locked && setActiveNav(item.id)} style={{ display: "flex", alignItems: "center", gap: "9px", padding: "7px 9px", borderRadius: "8px", cursor: item.locked ? "default" : "pointer", background: activeNav === item.id ? "rgba(249,115,22,0.08)" : "transparent", border: activeNav === item.id ? "1px solid rgba(249,115,22,0.18)" : "1px solid transparent", opacity: item.locked ? 0.3 : 1, transition: "all 0.15s" }}>
              <div style={{ color: activeNav === item.id ? "#f97316" : "#6b7280" }}><Ic d={item.icon} size={13} /></div>
              <span style={{ fontSize: "12px", color: activeNav === item.id ? "#f1f5f9" : "#9ca3af", flex: 1 }}>{item.label}</span>
              {item.locked && <Ic d={IC.lock} size={10} />}
              {item.badge > 0 && !item.locked && (
                <div style={{ minWidth: "16px", height: "16px", borderRadius: "8px", background: "#f97316", color: "#fff", fontSize: "9px", fontWeight: 600, padding: "0 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>{item.badge}</div>
              )}
            </div>
          ))}
          {flaggedEmails.length > 0 && (
            <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: "10px", color: "#374151", marginBottom: "5px", padding: "0 9px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Flagged</p>
              {flaggedEmails.map(e => (
                <div key={e.id} onClick={() => {
                  // Find latest version from emails array (has current state)
                  const latest = emails.find(em => em.id === e.id) || e;
                  handleSelectEmail(latest);
                }} style={{ padding: "5px 9px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: "#f97316", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  ⭐ {e.sender_first || e.sender.split(" ")[0]}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── EMAIL LIST ── */}
        <div style={{ width: "290px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: "12px", fontWeight: 500, color: "#f1f5f9" }}>Inbox</h2>
              <p style={{ fontSize: "10px", color: "#4b5563", fontFamily: "'IBM Plex Mono', monospace", marginTop: "2px" }}>{emails.length} emails · {status.last_check}</p>
            </div>
            <button className="action-btn" onClick={handleFetch} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 9px", borderRadius: "7px", border: "1px solid rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.08)", color: "#f97316", fontSize: "11px", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.2s" }}>
              <div style={{ animation: fetching ? "spin 1s linear infinite" : "none" }}><Ic d={IC.refresh} size={11} /></div>
              {fetching ? "..." : "Check"}
            </button>
          </div>
          {/* ── DATE FILTER BAR ── */}
          <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                style={{ flex: 1, padding: "5px 7px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace", colorScheme: "dark" }}
              />
              <span style={{ fontSize: "10px", color: "#374151" }}>→</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{ flex: 1, padding: "5px 7px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace", colorScheme: "dark" }}
              />
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "10px", color: "#6b7280" }}>
                <input
                  type="checkbox"
                  checked={flaggedOnly}
                  onChange={e => setFlaggedOnly(e.target.checked)}
                  style={{ accentColor: "#f97316" }}
                />
                Flagged only
              </label>
              <div style={{ flex: 1 }} />
              {(dateFrom || dateTo || flaggedOnly) && (
                <button onClick={handleClearFilter} style={{ fontSize: "10px", color: "#4b5563", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear</button>
              )}
              <button
                onClick={handleFilter}
                style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: (dateFrom || dateTo || flaggedOnly) ? "#f97316" : "rgba(255,255,255,0.06)", color: (dateFrom || dateTo || flaggedOnly) ? "#fff" : "#374151", fontSize: "10px", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.2s" }}
              >
                {filtering ? "..." : "Filter"}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {emails.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <p style={{ color: "#374151", fontSize: "12px" }}>No emails yet</p>
                <p style={{ color: "#374151", fontSize: "11px", marginTop: "6px" }}>Click Check to fetch your inbox</p>
              </div>
            ) : emails.map((email, i) => (
              <div key={email.id} className="email-row" onClick={() => handleSelectEmail(email)}
                style={{ padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.12s", background: selectedEmail?.id === email.id ? "rgba(249,115,22,0.04)" : "transparent", animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    {!email.read && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />}
                    {email.flagged && <span style={{ fontSize: "10px" }}>⭐</span>}
                    <span style={{ fontSize: "12px", fontWeight: email.read ? 400 : 500, color: email.read ? "#6b7280" : "#f1f5f9" }}>{email.sender}</span>
                  </div>
                  {/* Fix 1: Clean timestamp */}
                  <span style={{ fontSize: "10px", color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{email.time}</span>
                </div>
                <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email.subject}</p>
                {/* Fix 3: Skeleton loader instead of "Click to summarise →" */}
                {email.summarised ? (
                  <p style={{ fontSize: "11px", color: "#4b5563", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{email.summary}</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", paddingTop: "2px" }}>
                    <Skeleton width="90%" height="10px" />
                    <Skeleton width="65%" height="10px" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── DETAIL / REPLY ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedEmail && !replyPanel ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", animation: "fadeIn 0.2s ease" }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "18px", color: "#f1f5f9", fontWeight: 600, lineHeight: 1.3, marginBottom: "8px" }}>{selectedEmail.subject}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>{selectedEmail.sender}</span>
                <span style={{ fontSize: "11px", color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{selectedEmail.sender_email}</span>
                <span style={{ fontSize: "11px", color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{selectedEmail.time}</span>
              </div>

              {/* Summary box */}
              <div style={{ padding: "14px 16px", borderRadius: "10px", marginBottom: "20px", background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", color: "#f97316", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                    {summarising ? "Summarising" : "AI Summary"}
                  </span>
                  {summarising && (
                    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                      {[0, 0.2, 0.4].map((d, i) => (
                        <div key={i} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#f97316", animation: `pulse 1s ${d}s infinite` }} />
                      ))}
                    </div>
                  )}
                  <div style={{ flex: 1, height: "1px", background: "rgba(249,115,22,0.12)" }} />
                  <span style={{ fontSize: "10px", color: "#374151", fontFamily: "'IBM Plex Mono', monospace" }}>{activeModel} · local</span>
                </div>

                {/* Fix 3: Skeleton in detail panel while summarising */}
                {summarising && !summaryDisplay ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Skeleton width="100%" height="13px" />
                    <Skeleton width="85%" height="13px" />
                    <Skeleton width="70%" height="13px" />
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: summarising ? "#6b7280" : "#cbd5e1", lineHeight: "1.7", transition: "color 0.3s" }}>
                    {summaryDisplay || "Summary loading..."}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className="action-btn" onClick={() => setReplyPanel({ emailId: selectedEmail.id, intent: "", draft: "", stage: "intent" })} style={{ flex: 2, minWidth: "110px", padding: "10px", borderRadius: "8px", border: "none", background: "#f97316", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
                  <Ic d={IC.reply} size={13} /> Draft Reply
                </button>
                <button className="action-btn" onClick={() => handleFlag(selectedEmail)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `1px solid ${selectedEmail.flagged ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.08)"}`, background: selectedEmail.flagged ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.04)", color: selectedEmail.flagged ? "#f97316" : "#6b7280", fontSize: "12px", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.2s" }}>
                  {selectedEmail.flagged ? "⭐ Flagged" : "☆ Flag"}
                </button>
                <button className="action-btn" onClick={() => handleDismiss(selectedEmail.id)} style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#6b7280", fontSize: "12px", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.2s" }}>
                  Dismiss
                </button>
                <button className="action-btn" onClick={() => handleBlockSender(selectedEmail.id)} style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#fca5a5", fontSize: "12px", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.2s" }}>
                  <Ic d={IC.block} size={12} /> Block
                </button>
              </div>
            </div>

          ) : replyPanel ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", animation: "fadeIn 0.2s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <button onClick={() => setReplyPanel(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}><Ic d={IC.x} size={13} /></button>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#f1f5f9" }}>Reply to {selectedEmail?.sender_first || selectedEmail?.sender?.split(" ")[0]}</span>
              </div>
              {replyPanel.stage === "intent" ? (
                <div>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px", lineHeight: "1.6" }}>What's your key point? Keep it rough — the AI writes the full reply.</p>
                  <textarea value={replyPanel.intent} onChange={e => setReplyPanel(p => ({ ...p, intent: e.target.value }))} placeholder="e.g. Thursday 3pm works, will bring the metrics" rows={4} style={{ width: "100%", padding: "11px 13px", borderRadius: "9px", background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: "13px", fontFamily: "'IBM Plex Sans', sans-serif", resize: "none", lineHeight: "1.6", marginBottom: "12px", transition: "border-color 0.2s" }} />
                  <button className="action-btn" onClick={handleDraftReply} disabled={!replyPanel.intent || draftLoading} style={{ width: "100%", padding: "11px", borderRadius: "9px", border: "none", background: replyPanel.intent ? "#f97316" : "rgba(255,255,255,0.05)", color: replyPanel.intent ? "#fff" : "#374151", fontSize: "13px", fontWeight: 600, cursor: replyPanel.intent ? "pointer" : "not-allowed", fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.2s" }}>
                    {draftLoading ? "Drafting..." : "Generate Draft →"}
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px", fontFamily: "'IBM Plex Mono', monospace" }}>Review and edit before sending</p>
                  <textarea value={replyPanel.draft} onChange={e => setReplyPanel(p => ({ ...p, draft: e.target.value }))} rows={10} style={{ width: "100%", padding: "12px 13px", borderRadius: "9px", background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: "13px", fontFamily: "'IBM Plex Sans', sans-serif", resize: "none", lineHeight: "1.7", marginBottom: "12px", transition: "border-color 0.2s" }} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="action-btn" onClick={handleSend} style={{ flex: 2, padding: "11px", borderRadius: "9px", border: "none", background: "#f97316", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
                      <Ic d={IC.send} size={12} /> Send Reply
                    </button>
                    <button className="action-btn" onClick={() => setReplyPanel(p => ({ ...p, stage: "intent" }))} style={{ flex: 1, padding: "11px", borderRadius: "9px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#9ca3af", fontSize: "13px", cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.2s" }}>
                      Redraft
                    </button>
                  </div>
                </div>
              )}
            </div>

          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "28px", opacity: 0.2, marginBottom: "10px" }}>✦</div>
                <p style={{ color: "#374151", fontSize: "12px" }}>Select an email to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SETTINGS ── */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, animation: "fadeIn 0.2s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px", width: "420px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>Settings</h2>
              <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}><Ic d={IC.x} size={13} /></button>
            </div>
            <div style={{ display: "flex", gap: "4px", marginBottom: "18px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
              {[["general", "General"], ["storage", "Storage"], ["blocklist", "Block List"]].map(([id, label]) => (
                <button key={id} className="settings-tab" onClick={() => setSettingsTab(id)} style={{ color: settingsTab === id ? "#f97316" : "#6b7280", background: settingsTab === id ? "rgba(249,115,22,0.08)" : "transparent", border: settingsTab === id ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {settingsTab === "general" && (
                <div>
                  {[
                    { label: "Your name", key: "user_name", type: "text", placeholder: "Rishil" },
                    { label: "Job title", key: "user_title", type: "text", placeholder: "AI Engineer" },
                    { label: "Work start", key: "work_start", type: "time" },
                    { label: "Work end", key: "work_end", type: "time" },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "10px", color: "#6b7280", marginBottom: "5px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{f.label}</label>
                      <input type={f.type} value={settings[f.key] || ""} placeholder={f.placeholder} onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))} style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace", transition: "border-color 0.2s" }} />
                    </div>
                  ))}
                </div>
              )}


              {settingsTab === "storage" && (
                <div>
                  <label style={{ display: "block", fontSize: "10px", color: "#6b7280", marginBottom: "6px", letterSpacing: "0.06em", textTransform: "uppercase" }}>ChromaDB Path</label>
                  <p style={{ fontSize: "11px", color: "#4b5563", marginBottom: "10px", lineHeight: "1.6" }}>
                    Where flagged email embeddings are stored. Delete this folder to wipe memory.
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      value={settings.chroma_path || "~/.mailmind/chroma_db"}
                      onChange={e => setSettings(s => ({ ...s, chroma_path: e.target.value }))}
                      placeholder="~/.mailmind/chroma_db"
                      style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace", transition: "border-color 0.2s" }}
                    />
                    <button
                      onClick={async () => {
                        try {
                          const dir = await window.showDirectoryPicker();
                          setSettings(s => ({ ...s, chroma_path: "~/" + dir.name }));
                        } catch {}
                      }}
                      style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#9ca3af", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      Browse
                    </button>
                  </div>
                  <button
                    className="link-btn"
                    onClick={() => setSettings(s => ({ ...s, chroma_path: "~/.mailmind/chroma_db" }))}
                    style={{ marginBottom: "12px", display: "block" }}
                  >
                    Reset to default
                  </button>
                  <p style={{ fontSize: "11px", color: "#4b5563", lineHeight: "1.6", marginBottom: "16px" }}>
                    ⚠ Browser picker shows folder name only — type the full path manually if needed.
                  </p>
                  <button
                    className="action-btn"
                    onClick={() => { api.saveSettings(settings).catch(() => {}); setShowSettings(false); }}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#f97316", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.2s" }}
                  >
                    Save
                  </button>
                </div>
              )}

              {settingsTab === "blocklist" && (
                <div>
                  <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.6", marginBottom: "14px" }}>Block senders, domains, or keywords. Blocked emails never appear in your inbox.</p>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                    <input type="text" value={blockInput} onChange={e => setBlockInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddBlock()} placeholder="uber.com · jobs@apply4u.co.uk · linkedin" style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: "12px", fontFamily: "'IBM Plex Mono', monospace", transition: "border-color 0.2s" }} />
                    <button onClick={handleAddBlock} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#f97316", color: "#fff", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Ic d={IC.plus} size={12} /> Add
                    </button>
                  </div>
                  {blocklist.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#374151", textAlign: "center", padding: "20px 0" }}>No blocked senders yet</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {blocklist.map(entry => (
                        <div key={entry} className="block-row" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <Ic d={IC.block} size={11} />
                          <span style={{ flex: 1, fontSize: "12px", color: "#9ca3af", fontFamily: "'IBM Plex Mono', monospace" }}>{entry}</span>
                          <button className="rm-btn" onClick={() => handleRemoveBlock(entry)} style={{ opacity: 0, background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", display: "flex", padding: "2px", transition: "opacity 0.15s" }}>
                            <Ic d={IC.x} size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: "11px", color: "#374151", marginTop: "12px", lineHeight: "1.6" }}>
                    Tip: Click <span style={{ color: "#fca5a5" }}>Block</span> on any email to instantly block that sender.
                  </p>
                </div>
              )}
            </div>

            {settingsTab === "general" && (
              <button className="action-btn" onClick={() => { api.saveSettings(settings).catch(() => {}); setShowSettings(false); }} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#f97316", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif", transition: "all 0.2s", marginTop: "16px" }}>
                Save
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
