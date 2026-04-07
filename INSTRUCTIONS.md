# MailMind ✦

> **Privacy-first local AI email assistant. No cloud. No subscriptions. Zero data leaves your machine.**

MailMind connects to your Gmail, summarises emails using a locally running LLM, and drafts replies — all on your laptop. Your emails never touch an external server.

---

## Why MailMind?

Gmail's AI summaries send your emails to Google's servers. For anyone handling sensitive data — lawyers, doctors, finance teams, or just people who value privacy — that's not acceptable.

MailMind runs 100% locally using [Ollama](https://ollama.com). Same AI productivity. Zero cloud exposure.

---

## Features

| | |
|---|---|
| ✅ | Gmail connection via IMAP App Password — no Google verification needed |
| ✅ | On-click AI summarisation using local Ollama models |
| ✅ | Reply drafting in your tone, signed with your name |
| ✅ | Date range filter — view emails by date |
| ✅ | One-click sender blocking from the inbox |
| ✅ | Manual block list — block by email, domain, or keyword |
| ✅ | Flagged thread memory using ChromaDB vector store |
| ✅ | Persistent email store — survives page refresh and restarts |
| ✅ | Works fully offline after setup |

---

## Known Limitations

| | |
|---|---|
| ⚠ | Summary quality depends on model size. `qwen2.5:1.5b` is fast but sometimes generic. Recommend `qwen2.5:3b` or larger. |
| ⚠ | Summarisation takes 5–15 seconds per email on CPU — local inference tradeoff, not a bug. |
| ⚠ | Reply drafts may occasionally use placeholder text with smaller models. Works best with 3B+. |
| ⚠ | ChromaDB vector storage for flagged email context is unreliable in v0.1 — known bug, being fixed in v0.2. |
| ⚠ | Gmail only for now — Outlook coming in v0.2. |
| ⚠ | No background daemon yet — manually click Check to fetch new emails. |
| ⚠ | No mobile app — desktop browser only. |

---

## Requirements

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed and running
- Gmail account with:
  - 2-Step Verification enabled (`myaccount.google.com/security`)
  - IMAP enabled (Gmail → Settings → Forwarding and POP/IMAP → Enable IMAP)
  - An App Password generated

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/mailmind.git
cd mailmind
```

### 2. Set up the backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO: Uvicorn running on http://127.0.0.1:8000
```

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Set up Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (recommended)
ollama pull qwen2.5:3b

# Keep Ollama running
ollama serve
```

### 5. Get a Gmail App Password

1. Enable 2-Step Verification at `myaccount.google.com/security`
2. Go to `myaccount.google.com/apppasswords`
3. Name it "MailMind" → Click **Create**
4. Copy the 16-character password (remove spaces)
5. Enter your Gmail address and app password in the MailMind setup screen

---

## Recommended Models

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `qwen2.5:1.5b` | 1GB | ⚡ Fast | Basic | Quick testing |
| `qwen2.5:3b` | 2GB | 🔶 Medium | Good | Daily use ✅ |
| `deepseek-r1:7b` | 4.7GB | 🐢 Slow | Best | Best quality |

Switch models anytime from the dropdown in the top bar.

---

## Project Structure

```
mailmind/
├── backend/
│   ├── main.py              ← FastAPI app — all API endpoints
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx          ← Router: setup ↔ dashboard
│       └── pages/
│           ├── Setup.jsx    ← 5-step onboarding wizard
│           └── Dashboard.jsx ← Main inbox UI
└── README.md
```

---

## Data & Privacy

All data is stored locally on your machine:

| File | Location | Contents |
|------|----------|----------|
| Email store | `~/.mailmind/email_store.json` | Fetched emails + summaries |
| Credentials | `~/.mailmind/email_creds.json` | Gmail app password |
| Settings | `~/.mailmind/settings.json` | Your preferences |
| Block list | `~/.mailmind/blocklist.json` | Blocked senders |
| Embeddings | `~/.mailmind/chroma_db/` | Flagged thread vectors |

To wipe everything:

```bash
rm -rf ~/.mailmind
```

---

## API Reference

All endpoints on `http://localhost:8000`.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/status` | Check if Gmail is connected |
| `POST` | `/api/auth/connect` | Connect with App Password |
| `POST` | `/api/auth/signout` | Disconnect Gmail |

### Emails

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/emails/summaries` | Get emails (supports `date_from`, `date_to`, `flagged_only` query params) |
| `POST` | `/api/emails/fetch` | Fetch new emails from Gmail |
| `POST` | `/api/emails/summarise/{id}` | Summarise a single email on demand |
| `POST` | `/api/emails/flag` | Flag/unflag email (embeds/removes from ChromaDB) |
| `POST` | `/api/emails/dismiss` | Dismiss email |

### Blocklist

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/blocklist` | Get blocked entries |
| `POST` | `/api/blocklist/add` | Add email/domain/keyword |
| `POST` | `/api/blocklist/remove` | Remove entry |
| `POST` | `/api/blocklist/block-sender/{id}` | Block sender of an email directly |

### Reply

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reply/draft` | Generate reply draft |
| `POST` | `/api/reply/send` | Send reply via SMTP |

### Ollama

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ollama/models` | List installed models |
| `POST` | `/api/ollama/set-model` | Switch active model |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | React + Vite |
| AI | Ollama (local LLM) |
| Vector store | ChromaDB |
| Email | IMAP + SMTP |

---

## Roadmap

- [ ] Background daemon (APScheduler — auto-fetch every N minutes)
- [ ] Outlook / Office 365 support
- [ ] Electron desktop app
- [ ] Streaming summarisation
- [ ] Calendar integration
- [ ] Multi-account support

---

## Troubleshooting

**"Ollama not detected"**
Run `ollama serve` in a terminal and keep it open.

**"Connection failed" on Gmail setup**
- Make sure 2-Step Verification is enabled
- Make sure IMAP is enabled in Gmail settings
- Make sure you're using the App Password (not your real Gmail password)

**Frontend can't reach backend**
Make sure `uvicorn main:app --reload --port 8000` is running.
Visit `http://localhost:8000` — you should see `{"app":"MailMind"}`.

**"Could not summarise" in the summary panel**
Make sure Ollama is running (`ollama serve`) and you have a model installed (`ollama list`).

**Summaries are slow**
Switch to `qwen2.5:1.5b` from the model dropdown — it's the fastest option.

---

## Attribution

If you build on MailMind, you must credit **Rishil Boddula** as the original author and include a link to this repository. See [LICENSE](LICENSE) for full terms.

---

## License

[BUSL 1.1](LICENSE) — free for personal use. Commercial use requires a licence. Converts to GPL in 2030.

---

<div align="center">

Built by [Rishil Boddula](https://www.linkedin.com/in/rishil-b-b04b49223/) · MSc Advanced Computer Science

**MailMind — Privacy-first local AI email assistant**

</div>
