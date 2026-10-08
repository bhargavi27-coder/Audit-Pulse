# 🛡️ AuditPulse — AI-Powered Compliance Drift Detection

> **AuditPulse** detects mismatches between company privacy policies and actual source code behavior using a multi-agent AI pipeline.

⚠️ *AuditPulse provides AI-assisted compliance analysis and does not replace professional legal advice.*

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 📄 **Policy Parser** | Upload or paste policy text (PDF, TXT, MD) — Legal Agent extracts structured compliance rules |
| 🔬 **Code Analyzer** | AST + AI analysis of JS/TS/Python/Java/Go source code for data behavior |
| ⚡ **Drift Detection** | Multi-agent AI cross-references policy rules against code behavior |
| 🌐 **Vendor Monitor** | Playwright + BeautifulSoup scrapes 3rd-party policy pages for changes |
| 📊 **Reports** | Export findings as JSON or CSV, filter by risk/status |
| 🔗 **GitHub Actions** | Auto-checks PRs for compliance violations via `/api/github/analyze` |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Backend

```bash
cd auditpulse/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers (for vendor monitoring)
playwright install chromium

# Copy and edit environment config
cp ../.env.example ../.env
# Edit .env — set AI_PROVIDER=mock (no key needed) or add your API key

# Run the backend
uvicorn app.main:app --reload --port 8000
```

Backend is now running at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd auditpulse/frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```

Frontend is now running at **http://localhost:5173**

---

## 🐳 Docker (Full Stack)

```bash
cd auditpulse

# Copy env file
cp .env.example .env

# Start everything (backend + frontend + PostgreSQL)
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🤖 AI Provider Configuration

Set `AI_PROVIDER` in your `.env` file:

| Provider | Value | Required Key |
|----------|-------|-------------|
| No API (demo mode) | `mock` | None |
| OpenAI GPT-4o | `openai` | `OPENAI_API_KEY` |
| Anthropic Claude | `anthropic` | `ANTHROPIC_API_KEY` |
| Google Gemini | `google` | `GOOGLE_API_KEY` |

---

## 🔬 Running Tests

```bash
cd auditpulse

# Run the test suite (uses mock AI provider)
python -m pytest -o pythonpath=backend tests/test_compliance.py -v
```

**Tests cover:**
- No-violation detection (local console.log)
- HIGH risk violation (email → analytics without consent)
- Consent check compliance
- Unrelated data (no PII → COMPLIANT)
- Vendor policy drift detection
- Legal Agent rule extraction
- AST analyzer sensitive data detection

---

## 🔗 GitHub Actions Integration

Add these secrets to your repo (`Settings → Secrets → Actions`):

| Secret | Description |
|--------|-------------|
| `AUDITPULSE_API_URL` | Your deployed AuditPulse URL (e.g. `https://your-app.com`) |
| `AUDITPULSE_API_KEY` | Optional API key for auth |

The workflow in `.github/workflows/auditpulse.yml` will:
1. Detect changed `.js/.ts/.py` files on every PR
2. POST them to your AuditPulse instance for compliance analysis
3. Comment results directly on the PR

---

## 🗂️ Project Structure

```
auditpulse/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── agents/             # Multi-agent AI pipeline
│   │   │   ├── legal_agent.py      # Policy rule extraction
│   │   │   ├── code_agent.py       # Code behavior analysis
│   │   │   ├── compliance_agent.py # Policy ↔ code comparison
│   │   │   └── evidence_agent.py   # Evidence documentation
│   │   ├── analyzers/          # AST code analysis
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── routes/             # FastAPI route handlers
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # LLM service + vendor monitor
│   │   ├── config.py           # Settings from .env
│   │   ├── database.py         # Async SQLAlchemy setup
│   │   └── main.py             # FastAPI app entry point
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   ├── hooks/              # useAsync, useToast
│   │   ├── pages/              # Dashboard, Policy, Code, Drift, Vendors, Reports, Settings
│   │   ├── services/api.js     # Axios API client
│   │   └── utils/helpers.js    # Formatting utilities
│   ├── nginx.conf              # Production nginx config
│   └── Dockerfile
├── tests/                      # Pytest test suite
├── demo/                       # Sample policy/code files
├── .github/workflows/          # GitHub Actions CI
├── .env.example                # Environment variable template
└── docker-compose.yml          # Full stack Docker setup
```

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/policies/analyze` | Analyze policy text |
| `POST` | `/api/policies/upload` | Upload policy file |
| `GET` | `/api/policies` | List all policies |
| `POST` | `/api/code/analyze` | Analyze source code |
| `POST` | `/api/code/upload` | Upload code file |
| `POST` | `/api/compliance/compare` | Run drift detection |
| `GET` | `/api/findings` | List findings (filterable) |
| `PATCH` | `/api/findings/{id}` | Update finding status |
| `POST` | `/api/vendors` | Add vendor to monitor |
| `POST` | `/api/vendors/{id}/check` | Check vendor for drift |
| `GET` | `/api/dashboard/summary` | Dashboard stats |
| `POST` | `/api/github/analyze` | GitHub PR analysis |

Full interactive docs at **/docs** (Swagger UI)

---

## 📋 Demo Files

Sample files are in `demo/` for testing the system end-to-end:

| File | Description |
|------|-------------|
| `privacy_policy.txt` | Sample privacy policy with GDPR rules |
| `violating_code.js` | Code that violates the policy (email → analytics) |
| `compliant_code.js` | Code that is compliant (consent checked) |
| `consent_code.js` | Code with proper consent gates |
| `vendor_policy_old.txt` | Vendor policy v1 (30-day retention) |
| `vendor_policy_new.txt` | Vendor policy v2 (180-day retention — drift!) |

---

*Built with FastAPI · React · SQLAlchemy · Playwright · Multi-agent AI*
