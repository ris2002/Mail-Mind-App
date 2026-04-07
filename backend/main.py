"""
MailMind Backend — FastAPI
Run: uvicorn main:app --reload --port 8000
"""

import json
import imaplib
import email
import smtplib
import requests
import re
from pathlib import Path
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from email.utils import parsedate_to_datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="MailMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "app://.", "file://"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path.home() / ".mailmind"
CREDS_FILE = DATA_DIR / "email_creds.json"
SETTINGS_FILE = DATA_DIR / "settings.json"
EMAIL_STORE_FILE = DATA_DIR / "email_store.json"
BLOCKLIST_FILE = DATA_DIR / "blocklist.json"
DATA_DIR.mkdir(exist_ok=True)

OLLAMA_URL = "http://localhost:11434"

PROMO_KEYWORDS = [
    "noreply", "no-reply", "newsletter", "marketing", "unsubscribe",
    "donotreply", "do-not-reply", "mailer", "mailchimp", "sendgrid",
    "amazonses", "jobmails", "digest@", "jobs@", "recruitment",
    "threadloom", "jobboard",
]

def format_email_time(date_str: str) -> str:
    try:
        dt = parsedate_to_datetime(date_str)
        now = datetime.now(dt.tzinfo)
        if dt.date() == now.date():
            return dt.strftime("%H:%M")
        elif dt.year == now.year:
            return dt.strftime("%d %b · %H:%M")
        else:
            return dt.strftime("%d %b %Y")
    except:
        parts = date_str.split(",")[-1].strip().split()
        return " ".join(parts[:3]) if len(parts) >= 3 else date_str[:16]

def parse_date(date_str: str) -> Optional[datetime]:
    """Parse email date string to datetime object."""
    try:
        return parsedate_to_datetime(date_str)
    except:
        return None

def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        return json.loads(SETTINGS_FILE.read_text())
    return {
        "model": "qwen2.5:1.5b",
        "work_start": "09:00",
        "work_end": "18:00",
        "check_interval": 30,
        "user_name": "Rishil",
        "user_title": "AI Engineer",
    }

def save_settings(data: dict):
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))

def load_creds() -> Optional[dict]:
    if CREDS_FILE.exists():
        return json.loads(CREDS_FILE.read_text())
    return None

def save_creds(email_addr: str, app_password: str):
    CREDS_FILE.write_text(json.dumps({"email": email_addr, "app_password": app_password}))

def load_email_store() -> dict:
    if EMAIL_STORE_FILE.exists():
        try:
            return json.loads(EMAIL_STORE_FILE.read_text())
        except:
            return {}
    return {}

def save_email_store(store: dict):
    EMAIL_STORE_FILE.write_text(json.dumps(store, indent=2))

def load_blocklist() -> list:
    if BLOCKLIST_FILE.exists():
        try:
            return json.loads(BLOCKLIST_FILE.read_text())
        except:
            return []
    return []

def save_blocklist(bl: list):
    BLOCKLIST_FILE.write_text(json.dumps(bl, indent=2))

def is_blocked(sender_email: str, sender_name: str) -> bool:
    blocklist = load_blocklist()
    combined = (sender_email + " " + sender_name).lower()
    return any(entry.lower().strip() in combined for entry in blocklist)

def is_promo(sender: str, subject: str) -> bool:
    combined = (sender + " " + subject).lower()
    return any(k in combined for k in PROMO_KEYWORDS)

# ── ChromaDB ─────────────────────────────────────────────────
def get_chroma_collection():
    """Get or create ChromaDB collection. Returns None if ChromaDB not installed."""
    try:
        import chromadb
        settings = load_settings()
        # Always resolve path fully — expanduser handles ~ 
        raw_path = settings.get("chroma_path", str(DATA_DIR / "chroma_db"))
        chroma_path = str(Path(raw_path).expanduser().resolve())
        Path(chroma_path).mkdir(parents=True, exist_ok=True)
        print(f"[chromadb] Using path: {chroma_path}")
        client = chromadb.PersistentClient(path=chroma_path)
        collection = client.get_or_create_collection(
            name="email_threads",
            metadata={"hnsw:space": "cosine"},
        )
        return collection
    except ImportError:
        print("[chromadb] Not installed — run: pip install chromadb")
        return None
    except Exception as e:
        print(f"[chromadb] Error: {e}")
        return None

def embed_email(email_data: dict):
    """Embed email into ChromaDB for future context retrieval."""
    collection = get_chroma_collection()
    if not collection:
        return False
    try:
        doc = f"From: {email_data['sender']}\nSubject: {email_data['subject']}\nSummary: {email_data.get('summary', '')}\nBody: {email_data.get('body', '')[:500]}"
        collection.upsert(
            ids=[email_data["id"]],
            documents=[doc],
            metadatas=[{
                "sender": email_data["sender"],
                "sender_email": email_data.get("sender_email", ""),
                "subject": email_data["subject"],
                "flagged_at": datetime.now().isoformat(),
            }],
        )
        print(f"[chromadb] Embedded: {email_data['subject'][:50]}")
        return True
    except Exception as e:
        print(f"[chromadb] Embed failed: {e}")
        return False

def delete_embedding(email_id: str):
    """Delete email embedding from ChromaDB."""
    collection = get_chroma_collection()
    if not collection:
        return
    try:
        collection.delete(ids=[email_id])
        print(f"[chromadb] Deleted embedding: {email_id}")
    except Exception as e:
        print(f"[chromadb] Delete failed: {e}")

def query_similar(sender: str, subject: str, n: int = 3) -> str:
    """Query ChromaDB for similar past emails for reply context."""
    collection = get_chroma_collection()
    if not collection:
        return ""
    try:
        results = collection.query(
            query_texts=[f"{sender} {subject}"],
            n_results=n,
        )
        if results["documents"] and results["documents"][0]:
            return "\n\nPast context from similar emails:\n" + "\n---\n".join(results["documents"][0])
    except Exception as e:
        print(f"[chromadb] Query failed: {e}")
    return ""

_email_store: dict = load_email_store()

def get_imap():
    creds = load_creds()
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(creds["email"], creds["app_password"])
        return mail
    except imaplib.IMAP4.error:
        raise HTTPException(status_code=401, detail="Invalid email or app password")

def decode_mime_header(header: str) -> str:
    if not header:
        return ""
    try:
        decoded_parts = decode_header(header)
        result = ""
        for part, enc in decoded_parts:
            if isinstance(part, bytes):
                result += part.decode(enc or "utf-8", errors="ignore")
            else:
                result += str(part)
        return result.strip()
    except:
        return str(header)

def clean_html(html: str) -> str:
    html = re.sub(r'<style[^>]*>.*?</style>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<head[^>]*>.*?</head>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<(br|p|div|tr|li|h[1-6])[^>]*>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'<[^>]+>', ' ', html)
    html = html.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
    html = re.sub(r'\n{3,}', '\n\n', html)
    html = re.sub(r' {2,}', ' ', html)
    return html.strip()

def extract_body(msg) -> str:
    body = ""
    try:
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition", "")):
                    payload = part.get_payload(decode=True)
                    if payload:
                        body = payload.decode("utf-8", errors="ignore")
                        break
            if not body:
                for part in msg.walk():
                    if part.get_content_type() == "text/html" and "attachment" not in str(part.get("Content-Disposition", "")):
                        payload = part.get_payload(decode=True)
                        if payload:
                            body = clean_html(payload.decode("utf-8", errors="ignore"))
                            break
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                raw = payload.decode("utf-8", errors="ignore")
                body = clean_html(raw) if ("<html" in raw.lower() or "<!doctype" in raw.lower()) else raw
    except:
        pass
    return body.strip()

def extract_sender_name(sender_full: str) -> str:
    name = sender_full.split("<")[0].strip().strip('"').strip("'")
    if not name:
        name = sender_full.split("@")[0].replace("<", "").strip()
    return name or sender_full

def extract_real_name(sender_full: str) -> tuple[str, str]:
    display_name = extract_sender_name(sender_full)
    words = display_name.split()
    TITLES = {"dr", "mr", "mrs", "ms", "prof", "sir"}
    if len(words) == 0:
        domain = sender_full.split("@")[-1].split(".")[0] if "@" in sender_full else sender_full
        name = domain.capitalize()
        return name, name
    elif len(words) <= 2:
        return display_name, words[0].capitalize()
    elif len(words) == 3:
        if words[0].lower() in TITLES:
            return display_name, words[1].capitalize()
        return " ".join(words[:2]), words[0].capitalize()
    else:
        domain = sender_full.split("@")[-1].split(".")[0] if "@" in sender_full else words[0]
        name = domain.capitalize()
        return name, name

def clean_llm_output(text: str) -> str:
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = re.sub(r'</?think>', '', text)
    return text.strip()

def ollama_generate(prompt: str) -> str:
    settings = load_settings()
    model = settings.get("model", "qwen2.5:1.5b")
    try:
        res = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=120,
        )
        raw = res.json().get("response", "").strip()
        return clean_llm_output(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")

# ── Pydantic models ──────────────────────────────────────────
class EmailAuthIn(BaseModel):
    email: str
    app_password: str

class SettingsIn(BaseModel):
    model: str = "qwen2.5:1.5b"
    work_start: str = "09:00"
    work_end: str = "18:00"
    check_interval: int = 30
    user_name: str = "Rishil"
    user_title: str = "AI Engineer"
    chroma_path: str = str(DATA_DIR / "chroma_db")

class FlagIn(BaseModel):
    email_id: str

class DismissIn(BaseModel):
    email_id: str
    delete_embeddings: bool = False

class ReplyDraftIn(BaseModel):
    email_id: str
    user_intent: str

class ReplySendIn(BaseModel):
    email_id: str
    draft: str

class ModelIn(BaseModel):
    model: str

class BlocklistAddIn(BaseModel):
    entry: str

class BlocklistRemoveIn(BaseModel):
    entry: str

# ════════════════════════════════════════════════════════════
# AUTH
# ════════════════════════════════════════════════════════════

@app.get("/api/auth/status")
def auth_status():
    return {"authenticated": load_creds() is not None}

@app.post("/api/auth/connect")
def connect_email(body: EmailAuthIn):
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(body.email, body.app_password)
        mail.logout()
    except imaplib.IMAP4.error:
        raise HTTPException(status_code=401, detail="Connection failed.")
    save_creds(body.email, body.app_password)
    return {"connected": True, "email": body.email}

@app.post("/api/auth/signout")
def signout():
    if CREDS_FILE.exists():
        CREDS_FILE.unlink()
    return {"success": True}

# ════════════════════════════════════════════════════════════
# OLLAMA
# ════════════════════════════════════════════════════════════

@app.get("/api/ollama/models")
def get_ollama_models():
    try:
        res = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        data = res.json()
        models = [{"name": m["name"], "size": m.get("size", 0)} for m in data.get("models", [])]
        return {"models": models, "ollama_running": True}
    except:
        return {"models": [], "ollama_running": False}

@app.post("/api/ollama/set-model")
def set_model(body: ModelIn):
    settings = load_settings()
    settings["model"] = body.model
    save_settings(settings)
    return {"model": body.model}

# ════════════════════════════════════════════════════════════
# SETTINGS
# ════════════════════════════════════════════════════════════

@app.get("/api/settings/defaults")
def get_defaults():
    # Always return fully resolved absolute path
    default_path = str((DATA_DIR / "chroma_db").resolve())
    return {"chroma_path": default_path}

@app.get("/api/settings")
def get_settings():
    return load_settings()

@app.post("/api/settings")
def update_settings(body: SettingsIn):
    data = body.dict()
    # Always resolve to absolute path — handles ~, relative paths, etc.
    chroma_path = Path(data["chroma_path"]).expanduser().resolve()
    chroma_path.mkdir(parents=True, exist_ok=True)
    data["chroma_path"] = str(chroma_path)
    save_settings(data)
    return data

# ════════════════════════════════════════════════════════════
# BLOCKLIST
# ════════════════════════════════════════════════════════════

@app.get("/api/blocklist")
def get_blocklist():
    return {"blocklist": load_blocklist()}

@app.post("/api/blocklist/add")
def add_to_blocklist(body: BlocklistAddIn):
    bl = load_blocklist()
    entry = body.entry.strip().lower()
    if entry and entry not in bl:
        bl.append(entry)
        save_blocklist(bl)
    return {"blocklist": bl}

@app.post("/api/blocklist/remove")
def remove_from_blocklist(body: BlocklistRemoveIn):
    bl = load_blocklist()
    bl = [e for e in bl if e != body.entry.strip().lower()]
    save_blocklist(bl)
    return {"blocklist": bl}

@app.post("/api/blocklist/block-sender/{email_id}")
def block_sender_from_email(email_id: str):
    email_data = _email_store.get(email_id)
    if not email_data:
        raise HTTPException(status_code=404, detail="Email not found")
    sender_email = email_data.get("sender_email", "")
    bl = load_blocklist()
    if sender_email and sender_email.lower() not in bl:
        bl.append(sender_email.lower())
        save_blocklist(bl)
    if email_id in _email_store:
        del _email_store[email_id]
    save_email_store(_email_store)
    return {"blocked": sender_email, "blocklist": bl}

# ════════════════════════════════════════════════════════════
# EMAILS
# ════════════════════════════════════════════════════════════

def fetch_emails() -> list[dict]:
    mail = get_imap()
    mail.select("INBOX")
    _, data = mail.search(None, "UNSEEN")
    email_ids = data[0].split()[-10:]

    for eid in reversed(email_ids):
        eid_str = eid.decode()
        if eid_str in _email_store:
            continue  # already cached, skip
        try:
            _, msg_data = mail.fetch(eid, "(RFC822)")
            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)

            subject = decode_mime_header(msg.get("Subject", "(no subject)"))
            sender_full = decode_mime_header(msg.get("From", "Unknown"))
            date_raw = msg.get("Date", "")
            time_clean = format_email_time(date_raw)

            sender_email_addr = sender_full.split("<")[-1].replace(">", "").strip() if "<" in sender_full else sender_full

            if is_promo(sender_full, subject):
                continue
            if is_blocked(sender_email_addr, sender_full):
                continue

            body = extract_body(msg)
            sender_name, sender_first = extract_real_name(sender_full)

            email_data = {
                "id": eid_str,
                "sender": sender_name,
                "sender_first": sender_first,
                "sender_email": sender_email_addr,
                "subject": subject,
                "summary": "",
                "body": body[:3000],
                "time": time_clean,
                "time_raw": date_raw,
                "read": False,
                "flagged": False,  # new emails start unflagged
                "summarised": False,
            }

            _email_store[eid_str] = email_data
            print(f"[fetch] New email: {sender_name} — {subject[:40]}")

        except Exception as e:
            print(f"[fetch] Failed {eid_str}: {e}")
            continue

    mail.logout()
    save_email_store(_email_store)

    # IMPORTANT: always return the full store sorted by date
    # This preserves flagged state across refreshes
    all_emails = list(_email_store.values())
    def sort_key(e):
        dt = parse_date(e.get("time_raw", ""))
        return dt.timestamp() if dt else 0
    all_emails.sort(key=sort_key, reverse=True)
    return all_emails

@app.get("/api/emails/summaries")
def get_email_summaries(
    date_from: Optional[str] = Query(None, description="Filter from date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Filter to date YYYY-MM-DD"),
    flagged_only: bool = Query(False, description="Show only flagged emails"),
):
    """
    Get emails with optional date filtering.
    date_from / date_to: YYYY-MM-DD format
    flagged_only: true/false
    """
    emails = list(_email_store.values())

    # Filter by flagged
    if flagged_only:
        emails = [e for e in emails if e.get("flagged")]

    # Filter by date range
    if date_from:
        try:
            from_dt = datetime.strptime(date_from, "%Y-%m-%d")
            filtered = []
            for e in emails:
                dt = parse_date(e.get("time_raw", ""))
                if dt and dt.date() >= from_dt.date():
                    filtered.append(e)
                elif not dt:
                    filtered.append(e)  # include if can't parse
            emails = filtered
        except:
            pass

    if date_to:
        try:
            to_dt = datetime.strptime(date_to, "%Y-%m-%d")
            filtered = []
            for e in emails:
                dt = parse_date(e.get("time_raw", ""))
                if dt and dt.date() <= to_dt.date():
                    filtered.append(e)
                elif not dt:
                    filtered.append(e)
            emails = filtered
        except:
            pass

    # Sort by date descending (newest first)
    def sort_key(e):
        dt = parse_date(e.get("time_raw", ""))
        return dt.timestamp() if dt else 0

    emails.sort(key=sort_key, reverse=True)
    return emails

@app.post("/api/emails/fetch")
def trigger_fetch():
    return fetch_emails()

@app.post("/api/emails/summarise/{email_id}")
def summarise_single(email_id: str):
    print(f"[summarise] {email_id}")
    email_data = _email_store.get(email_id)
    if not email_data:
        raise HTTPException(status_code=404, detail="Email not found")
    if email_data.get("summarised"):
        return {"summary": email_data["summary"]}

    body = email_data.get("body", "")
    subject = email_data.get("subject", "")
    sender = email_data.get("sender", "")

    prompt = f"""You are reading an email sent to Rishil. Extract the key facts.

From: {sender}
Subject: {subject}
Body: {body[:800]}

Write a 2-3 sentence summary that includes:
- The sender name and what they want
- Any specific times, dates, amounts, or options (list them exactly as written)
- What action Rishil needs to take and by when

Summary:"""

    summary = ollama_generate(prompt)
    _email_store[email_id]["summary"] = summary
    _email_store[email_id]["summarised"] = True
    save_email_store(_email_store)
    return {"summary": summary}

@app.post("/api/emails/flag")
def flag_email(body: FlagIn):
    """Toggle flag on email. If flagging ON — embed into ChromaDB."""
    if body.email_id not in _email_store:
        raise HTTPException(status_code=404, detail="Email not found")

    email_data = _email_store[body.email_id]
    current_flagged = email_data.get("flagged", False)
    new_flagged = not current_flagged

    _email_store[body.email_id]["flagged"] = new_flagged
    save_email_store(_email_store)

    if new_flagged:
        # Flagging ON — embed into ChromaDB
        success = embed_email(email_data)
        print(f"[flag] Flagged email '{email_data['subject'][:40]}' — ChromaDB embed: {'✓' if success else '✗'}")
    else:
        # Flagging OFF — remove from ChromaDB
        delete_embedding(body.email_id)
        print(f"[flag] Unflagged email '{email_data['subject'][:40]}' — removed from ChromaDB")

    return {"flagged": new_flagged}

@app.post("/api/emails/dismiss")
def dismiss_email(body: DismissIn):
    email_data = _email_store.get(body.email_id)
    if email_data and email_data.get("flagged") and body.delete_embeddings:
        delete_embedding(body.email_id)
    if body.email_id in _email_store:
        del _email_store[body.email_id]
    save_email_store(_email_store)
    return {"dismissed": True}

# ════════════════════════════════════════════════════════════
# REPLY
# ════════════════════════════════════════════════════════════

@app.post("/api/reply/draft")
def draft_reply(body: ReplyDraftIn):
    email_data = _email_store.get(body.email_id)
    if not email_data:
        raise HTTPException(status_code=404, detail="Email not found")

    settings = load_settings()
    user_name = settings.get("user_name", "Rishil")
    user_title = settings.get("user_title", "AI Engineer")
    sender_first = email_data.get("sender_first", "there")
    context = email_data.get("summary") or email_data.get("body", "")[:400]

    # Pull ChromaDB context if email is flagged
    thread_context = ""
    if email_data.get("flagged"):
        thread_context = query_similar(email_data["sender"], email_data["subject"])
        if thread_context:
            print(f"[reply] Using ChromaDB context for: {email_data['subject'][:40]}")

    prompt = f"""You are {user_name}, {user_title}.
Write a real email reply. Use actual names. Never use placeholders like [Name] or [Company].

Replying to: {sender_first}
Subject: {email_data['subject']}
What they said: {context}
Your key point: {body.user_intent}{thread_context}

Start with: Hi {sender_first},
End with: Best regards, {user_name}

Reply:"""

    draft = ollama_generate(prompt)
    return {"draft": draft}

@app.post("/api/reply/send")
def send_reply(body: ReplySendIn):
    email_data = _email_store.get(body.email_id)
    if not email_data:
        raise HTTPException(status_code=404, detail="Email not found")
    creds = load_creds()
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    msg = MIMEMultipart()
    msg["From"] = creds["email"]
    msg["To"] = email_data["sender_email"]
    msg["Subject"] = f"Re: {email_data['subject']}"
    msg.attach(MIMEText(body.draft, "plain"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(creds["email"], creds["app_password"])
            server.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Send failed: {str(e)}")
    if body.email_id in _email_store:
        _email_store[body.email_id]["read"] = True
        save_email_store(_email_store)
    return {"sent": True}

# ════════════════════════════════════════════════════════════
# DAEMON
# ════════════════════════════════════════════════════════════

_daemon_state = {"running": False, "paused": False, "last_check": "—", "next_check": "—"}

@app.post("/api/daemon/start")
def start_daemon():
    _daemon_state["running"] = True
    return {"started": True}

@app.post("/api/daemon/pause")
def pause_daemon():
    _daemon_state["paused"] = True
    return {"paused": True}

@app.post("/api/daemon/resume")
def resume_daemon():
    _daemon_state["paused"] = False
    return {"resumed": True}

@app.get("/api/daemon/status")
def daemon_status():
    settings = load_settings()
    return {**_daemon_state, "model": settings.get("model", "qwen2.5:1.5b")}

@app.get("/")
def root():
    return {"app": "MailMind", "version": "0.1.0", "status": "running"}
