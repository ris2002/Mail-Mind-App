MailMind ✦

Privacy-first local AI email assistant. No cloud. No subscriptions. Zero data leaves your machine.

MailMind connects to your Gmail, summarises emails using a locally running LLM, and drafts replies — all on your laptop. Your emails never touch an external server.

Why MailMind?
Gmail's AI summaries send your emails to Google's servers. For anyone handling sensitive data — lawyers, doctors, finance teams, or just people who value privacy — that's not acceptable.
MailMind runs 100% locally using Ollama. Same AI productivity. Zero cloud exposure.

Features

✅ Gmail connection via IMAP App Password — no Google verification needed
✅ On-click AI summarisation using local Ollama models
✅ Reply drafting in your tone, signed with your name
✅ Date range filter — view emails by date
✅ One-click sender blocking from the inbox
✅ Manual block list — block by email, domain, or keyword
✅ Flagged thread memory using ChromaDB vector store
✅ Persistent email store — survives page refresh and restarts
✅ Works fully offline after setup


Known Limitations

⚠ Summary quality depends on model size. qwen2.5:1.5b is fast but sometimes generic. Recommend qwen2.5:3b or larger.
⚠ Summarisation takes 5–15 seconds per email on CPU — local inference tradeoff, not a bug.
⚠ Reply drafts may occasionally use placeholder text with smaller models. Works best with 3B+.
⚠ Gmail only for now — Outlook coming in v0.2.
⚠ No background daemon yet — manually click Check to fetch new emails.
⚠ No mobile app — desktop browser only.


Requirements

Python 3.10+
Node.js 18+
Ollama installed and running
Gmail account with:

2-Step Verification enabled (myaccount.google.com/security)
IMAP enabled (Gmail → Settings → Forwarding and POP/IMAP → Enable IMAP)
An App Password generated




Quick Start
1. Clone the repo
bashgit clone https://github.com/yourusername/mailmind.git
cd mailmind
2. Set up the backend
bashcd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend
uvicorn main:app --reload --port 8000
You should see:
INFO: Uvicorn running on http://127.0.0.1:8000
3. Set up the frontend
bashcd frontend
npm install
npm run dev
Open http://localhost:5173 in your browser.
4. Set up Ollama
bash# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (recommended)
ollama pull qwen2.5:3b

# Keep Ollama running
ollama serve
5. Get a Gmail App Password

Enable 2-Step Verification at myaccount.google.com/security
Go to myaccount.google.com/apppasswords
Name it "MailMind" → Click Create
Copy the 16-character password (remove spaces)
Enter your Gmail address and app password in the MailMind setup screen


Recommended Models
ModelSizeSpeedQualityBest Forqwen2.5:1.5b1GB⚡ FastBasicQuick testingqwen2.5:3b2GB🔶 MediumGoodDaily use ✅deepseek-r1:7b4.7GB🐢 SlowBestBest quality
Switch models anytime from the dropdown in the top bar.

Project Structure
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

Data & Privacy
All data is stored locally:
FileLocationContentsEmail store~/.mailmind/email_store.jsonFetched emails + summariesCredentials~/.mailmind/email_creds.jsonGmail app passwordSettings~/.mailmind/settings.jsonYour preferencesBlock list~/.mailmind/blocklist.jsonBlocked sendersEmbeddings~/.mailmind/chroma_db/Flagged thread vectors
To wipe everything:
bashrm -rf ~/.mailmind

API Reference
All endpoints on http://localhost:8000.
Auth
MethodEndpointDescriptionGET/api/auth/statusCheck if Gmail is connectedPOST/api/auth/connectConnect with App PasswordPOST/api/auth/signoutDisconnect Gmail
Emails
MethodEndpointDescriptionGET/api/emails/summariesGet emails (supports date_from, date_to, flagged_only query params)POST/api/emails/fetchFetch new emails from GmailPOST/api/emails/summarise/{id}Summarise a single email on demandPOST/api/emails/flagFlag/unflag email (embeds/removes from ChromaDB)POST/api/emails/dismissDismiss email
Blocklist
MethodEndpointDescriptionGET/api/blocklistGet blocked entriesPOST/api/blocklist/addAdd email/domain/keywordPOST/api/blocklist/removeRemove entryPOST/api/blocklist/block-sender/{id}Block sender of an email directly
Reply
MethodEndpointDescriptionPOST/api/reply/draftGenerate reply draftPOST/api/reply/sendSend reply via SMTP
Ollama
MethodEndpointDescriptionGET/api/ollama/modelsList installed modelsPOST/api/ollama/set-modelSwitch active model

Tech Stack
LayerTechnologyBackendFastAPI (Python)FrontendReact + ViteAIOllama (local LLM)Vector storeChromaDBEmailIMAP + SMTP

Roadmap

 Background daemon (APScheduler — auto-fetch every N minutes)
 Outlook / Office 365 support
 Electron desktop app
 Streaming summarisation
 Calendar integration
 Multi-account support


Troubleshooting
"Ollama not detected"
Run ollama serve in a terminal and keep it open.
"Connection failed" on Gmail setup

Make sure 2-Step Verification is enabled
Make sure IMAP is enabled in Gmail settings
Make sure you're using the App Password (not your real Gmail password)

Frontend can't reach backend
Make sure uvicorn main:app --reload --port 8000 is running.
Visit http://localhost:8000 — you should see {"app":"MailMind"}.
"Could not summarise" in the summary panel
Make sure Ollama is running (ollama serve) and you have a model installed (ollama list).
Summaries are slow
Switch to qwen2.5:1.5b from the model dropdown — it's the fastest option.

License
[BUSL 1.1](LICENSE) — free for personal use. Commercial use requires a licence. Converts to GPL in 2030.

Built by [Rishil Boddula](https://www.linkedin.com/in/rishil-b-b04b49223/) · MSc Advanced Computer Science