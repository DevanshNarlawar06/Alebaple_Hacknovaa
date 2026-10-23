"""Turn a pasted link into a checkable claim: fetch the page, read its headline, summary and publish date.

Only public http(s) pages are fetched (no local/private addresses). If the page can't be read, the words in the
URL slug are used instead, and that is reported as an uncertainty.
"""
from __future__ import annotations

import html
import ipaddress
import re
import socket
from urllib.parse import unquote, urlparse

import httpx

URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def _meta(page: str, *names: str) -> str | None:
    for n in names:
        m = re.search(rf'<meta[^>]+(?:property|name|itemprop)=["\']{re.escape(n)}["\'][^>]*content=["\']([^"\']+)', page, re.I) \
            or re.search(rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name|itemprop)=["\']{re.escape(n)}["\']', page, re.I)
        if m:
            return html.unescape(m.group(1)).strip()
    return None


def _public(host: str) -> bool:
    try:
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
        return True
    except (socket.gaierror, ValueError):
        return False


def slug_text(url: str) -> str:
    path = unquote(urlparse(url).path)
    parts = [p for p in path.split("/") if p and not re.fullmatch(r"[\w]*\d{5,}[\w.]*|article\w*|amp|index\.\w+", p)]
    best = max(parts, key=len) if parts else ""
    return re.sub(r"\.(ece|cms|html?|php)$", "", best).replace("-", " ").replace("_", " ").strip()


def expand(text: str) -> dict | None:
    """If the input is (mostly) a link, return {text, url, published_at, publisher, method}; else None."""
    urls = URL_RE.findall(text or "")
    if not urls:
        return None
    rest = URL_RE.sub("", text).strip()
    if len(rest) > 40:  # the user wrote their own claim; keep it, the link is just a reference
        return None
    url = urls[0].rstrip(").,")
    host = urlparse(url).hostname or ""
    out = {"url": url, "publisher": host.replace("www.", ""), "published_at": None}
    page = None
    if _public(host):
        try:
            r = httpx.get(url, headers={"User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9"}, timeout=12,
                          follow_redirects=True)
            if r.status_code == 200 and "html" in r.headers.get("content-type", ""):
                page = r.text[:600_000]
        except httpx.HTTPError:
            page = None
    if page:
        title = _meta(page, "og:title", "twitter:title")
        if not title:
            m = re.search(r"<title[^>]*>(.*?)</title>", page, re.I | re.S)
            title = html.unescape(m.group(1)).strip() if m else None
        desc = _meta(page, "og:description", "description", "twitter:description")
        pub = _meta(page, "article:published_time", "datePublished", "pubdate", "publish-date", "og:updated_time")
        if not pub:
            m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', page)
            pub = m.group(1) if m else None
        site = _meta(page, "og:site_name")
        if title:
            out |= {"text": f"{title}. {desc}" if desc and desc[:60] not in title else title,
                    "published_at": pub, "publisher": site or out["publisher"], "method": "article"}
            return out
    s = slug_text(url)
    if not s:
        return None
    out |= {"text": s, "method": "url_slug"}
    return out
