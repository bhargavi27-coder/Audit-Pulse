"""
Vendor Monitoring Service — Checks vendor policy pages for changes
Uses Playwright for JavaScript-heavy pages, BeautifulSoup as fallback
"""
import asyncio
import hashlib
import json
import re
from datetime import datetime
from typing import Dict, Any, Optional
from app.services.llm_service import llm_service

PLAYWRIGHT_AVAILABLE = False
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    pass

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


class VendorMonitorService:
    """
    Fetches vendor policy pages and detects content changes.
    Uses Playwright when available; falls back to httpx + BeautifulSoup.
    """

    async def fetch_page_content(self, url: str) -> str:
        """Fetch text content from a URL."""
        if PLAYWRIGHT_AVAILABLE:
            return await self._fetch_with_playwright(url)
        elif HTTPX_AVAILABLE:
            return await self._fetch_with_httpx(url)
        else:
            raise RuntimeError("No HTTP client available. Install playwright or httpx.")

    async def _fetch_with_playwright(self, url: str) -> str:
        """Use Playwright for JavaScript-rendered pages."""
        return await asyncio.to_thread(self._fetch_with_playwright_sync, url)

    def _fetch_with_playwright_sync(self, url: str) -> str:
        """Run synchronous Playwright outside the server's asyncio event loop."""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.goto(url, wait_until="networkidle", timeout=30000)
                content = page.inner_text("body")
                return content
            finally:
                browser.close()

    async def _fetch_with_httpx(self, url: str) -> str:
        """Use httpx + BeautifulSoup for static pages."""
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                "User-Agent": "AuditPulse/1.0 Compliance Monitor"
            })
            response.raise_for_status()
            if BS4_AVAILABLE:
                soup = BeautifulSoup(response.text, "lxml" if "lxml" in dir() else "html.parser")
                # Remove scripts and styles
                for tag in soup(["script", "style", "nav", "header", "footer"]):
                    tag.decompose()
                return soup.get_text(separator="\n", strip=True)
            return response.text

    def compute_hash(self, content: str) -> str:
        """Compute SHA-256 hash of content for change detection."""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    async def detect_drift(self, old_content: str, new_content: str) -> Dict[str, Any]:
        """
        Compare old and new vendor policy content.
        Uses LLM to identify meaningful changes.
        """
        if self.compute_hash(old_content) == self.compute_hash(new_content):
            return {
                "drift_detected": False,
                "changes": [],
                "summary": "No changes detected since last check."
            }

        # Content changed — ask LLM to analyze the diff
        system_prompt = """You are a vendor policy change analyst.
Compare two versions of a vendor's policy document and identify meaningful changes.
Focus on: data retention periods, data sharing practices, third-party transfers, user rights, security measures.

Return JSON:
{
  "drift_detected": true,
  "changes": [
    {
      "type": "<change_type>",
      "section": "<section name>",
      "old_value": "<what it said before>",
      "new_value": "<what it says now>",
      "severity": "HIGH|MEDIUM|LOW",
      "impact": "<potential compliance impact>"
    }
  ],
  "summary": "<brief summary of all changes>"
}

Only report changes, not similarities. If only formatting changed, report drift_detected: false."""

        user_prompt = f"""Compare these two versions of a vendor policy.

=== OLD VERSION ===
{old_content[:3000]}

=== NEW VERSION ===
{new_content[:3000]}

Identify all meaningful policy changes."""

        raw = await llm_service.complete(system_prompt, user_prompt)

        try:
            data = json.loads(raw)
            return data
        except json.JSONDecodeError:
            obj_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if obj_match:
                try:
                    return json.loads(obj_match.group())
                except:
                    pass

        # Hash changed but couldn't analyze — report generic change
        return {
            "drift_detected": True,
            "changes": [{
                "type": "content_change",
                "section": "Unknown",
                "old_value": old_content[:200],
                "new_value": new_content[:200],
                "severity": "MEDIUM",
                "impact": "Policy content has changed. Manual review recommended."
            }],
            "summary": "Policy content changed. Automated analysis was unable to detail specific changes."
        }


vendor_monitor = VendorMonitorService()
