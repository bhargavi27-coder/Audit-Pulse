# 🛡️ AuditPulse — Autonomous Multi-Agent Compliance Drift Detection & CI/CD Gatekeeper

> **AuditPulse** bridges the divide between corporate privacy commitments and actual source code behavior. Using static AST analysis, NLP extraction, and autonomous multi-agent reasoning, AuditPulse continuously detects policy-code drift, maps third-party vendor blast radius, enforces pull request gates, and provides verifiable line-level audit trails.

⚠️ *AuditPulse provides AI-assisted compliance analysis and verifiable audit evidence; it is intended to augment legal and security teams.*

---

## ✨ Enterprise Capability Comparison (12/12 Completed)

| # | Improvement | Capabilities in AuditPulse |
|---|---|---|
| **1** | **Policy Analysis** | Multi-version extraction, NLP semantic clause diffing, and risk-impact comparisons (`POST /api/policies/compare-versions`). |
| **2** | **Code Analysis** | Static AST analysis identifying affected components & end-to-end data flows (`Source ➔ Transform ➔ Sink`). |
| **3** | **Drift Detection** | Continuous compliance monitoring sweeps (`POST /api/compliance/continuous-check`) with historical run tracking. |
| **4** | **Risk Scoring** | Granular Compliance Risk Score (0–100), AI confidence rating, and codebase health indices. |
| **5** | **Line-Level Evidence** | Verbatim line-level evidence pairing (`policy_quote` ⟷ `code_snippet`) for defensible audit documentation. |
| **6** | **AI Suggested Fixes** | Unified codebase patch diffs and policy adjustment recommendations with copy-ready diffs. |
| **7** | **GitHub Integration** | Automated Pull Request Gatekeeper, PR Simulator (`POST /api/github/simulate-pr`), and formatted Markdown bot comments. |
| **8** | **Vendor Surveillance** | Headless Playwright monitoring of 3rd-party Terms of Service correlated with connected codebase components. |
| **9** | **Compliance History** | Complete finding lifecycle audit timeline (`DETECTED ➔ REVIEWED ➔ ASSIGNED ➔ RESOLVED`). |
| **10** | **Human Review** | Multi-role governance workflows (`APPROVE`, `REJECT`, `DISMISS`, `ACKNOWLEDGE`) with audit attribution. |
| **11** | **AI Feedback Loop** | False-positive memory feedback loop (`/api/feedback`) that trains future scans and suppresses active false alarms. |
| **12** | **Executive Reporting** | Board-ready audit report with regulatory matrix (GDPR, CCPA, SOC 2, ISO 27001) + Certified HTML/PDF export (`/api/reports/export/html`). |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+

### Option A: 1-Click Startup (Windows)
Double-click `start-dev.bat` in the root repository folder, or run:
```cmd
start-dev.bat
```

### Option B: Manual Setup

#### 1. Backend (FastAPI + Async SQLAlchemy)
```bash
cd auditpulse/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser binaries (for vendor monitoring)
playwright install chromium

# Copy and edit environment config
cp ../.env.example ../.env
# Edit .env — AI_PROVIDER=mock (works out of the box with zero setup) or set Groq/OpenAI/Claude key

# Run the backend
uvicorn app.main:app --reload --port 8000
```

Backend is now running at **http://localhost:8000**  
Interactive API docs at **http://localhost:8000/docs**

#### 2. Frontend (React + Vite + Design System)
```bash
cd auditpulse/frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```

Frontend is now running at **http://localhost:5173**

---

## 🐳 Docker Setup (Full Stack)

```bash
cd auditpulse

# Copy env file
cp .env.example .env

# Start full stack (backend + frontend + PostgreSQL)
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend Web UI | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

---

## 🤖 AI Provider Configuration

AuditPulse supports multiple AI providers with deterministic fallback:

| Provider | Value in `.env` | Required Key | Capabilities |
|----------|-----------------|--------------|--------------|
| Local Mock (Deterministic) | `mock` | *None* | Instant testing, pre-computed AST & NLP fixtures |
| Groq (Ultra-Fast Llama-3) | `groq` | `GROQ_API_KEY` | Sub-second multi-agent comparisons |
| OpenAI (GPT-4o) | `openai` | `OPENAI_API_KEY` | Deep legal reasoning & fix patch generation |
| Anthropic (Claude 3.5 Sonnet) | `anthropic` | `ANTHROPIC_API_KEY` | Complex code AST semantic trace analysis |
| Google Gemini (Gemini 1.5 Pro) | `google` | `GOOGLE_API_KEY` | Long-context regulatory cross-examination |

---

## 🔬 Running the Test Suite

```bash
# Run the complete test suite (10/10 tests)
python -m pytest -o pythonpath=auditpulse/backend auditpulse/tests -v
```

**Test Coverage:**
- `test_no_violation_console_log`: Compliant local logging verification
- `test_violation_analytics_email`: High risk policy divergence detection
- `test_consent_check_compliant`: Consent gate AST verification
- `test_unrelated_data_no_email`: Non-PII data transfer evaluation
- `test_vendor_drift_detection`: Playwright terms of service drift detection
- `test_legal_agent_extracts_rules`: NLP privacy policy rule extraction
- `test_ast_analyzer_detects_sensitive_data`: Codebase AST source/sink detection
- `test_policy_version_comparison`: Multi-version semantic diffing
- `test_code_analysis_data_flows_and_components`: End-to-end data flow and affected components extraction
- `test_ai_feedback_loop_suppression`: False-positive suppression memory loop

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | API & LLM service health diagnostics |
| `POST` | `/api/policies/analyze` | Parse policy text into structured rules |
| `POST` | `/api/policies/compare-versions` | Compare two versions of a policy with impact analysis |
| `POST` | `/api/code/analyze` | Run AST parsing for data flows & affected components |
| `POST` | `/api/compliance/compare` | Multi-agent policy vs code drift cross-examination |
| `POST` | `/api/compliance/continuous-check` | Execute continuous compliance monitoring sweep |
| `GET` | `/api/compliance/history` | Retrieve historical drift scan runs and trends |
| `POST` | `/api/findings/{id}/review` | Governance review action (`APPROVE`/`REJECT`/`DISMISS`) |
| `GET` | `/api/findings/{id}/timeline` | Retrieve finding lifecycle audit stepper |
| `GET` | `/api/feedback` | Retrieve active AI false-positive suppression rules |
| `POST` | `/api/feedback` | Submit new false-positive AI learning rule |
| `POST` | `/api/github/simulate-pr` | Simulate GitHub PR gating & generate bot Markdown comments |
| `GET` | `/api/reports/audit-report` | Generate CISO executive audit report with regulatory matrix |
| `GET` | `/api/reports/export/html` | Export certified standalone HTML audit report |

---

*Built with FastAPI · React · Tree-sitter AST · Playwright · Multi-agent AI*
