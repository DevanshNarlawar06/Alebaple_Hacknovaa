"""Turn a pasted link into a checkable claim: fetch the page, read its headline, summary and publish date.

Only public http(s) pages are fetched (no local/private addresses). If the page can't be read, the words in the
URL slug are used instead, and that is reported as an uncertainty.
"""
from __future__ import annotations

import html
import ipaddress
import json
import re
import socket
from datetime import timezone
from urllib.parse import quote, unquote, urlparse

import httpx

URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


# titles of pages that are not the article: parked domains, bot walls, aggregator landing pages, error pages
JUNK_TITLE = re.compile(r"parked|domain (name )?(is )?(for sale|registered|expired)|dns system|hostinger|godaddy|"
                        r"namecheap|just a moment|access denied|attention required|enable javascript|forbidden|"
                        r"page not found|not found|sign in|log in|captcha|are you a robot|^google news|"
                        r"^(home|index|welcome)$|under construction|coming soon|account suspended", re.I)


def resolve_google_news(url: str) -> str | None:
    """news.google.com/rss/articles/<id> links are opaque; Google's own page data gives the publisher URL."""
    m = re.search(r"news\.google\.com/(?:rss/)?articles/([^/?#]+)", url)
    if not m:
        return None
    gid = m.group(1)
    try:
        with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=12) as c:
            r = c.get(f"https://news.google.com/articles/{gid}?hl=en-IN&gl=IN&ceid=IN:en")
            sg = re.search(r'data-n-a-sg="([^"]+)"', r.text)
            ts = re.search(r'data-n-a-ts="([^"]+)"', r.text)
            if not (sg and ts):
                return None
            inner = json.dumps(["garturlreq", [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1, None, None,
                                                 None, None, None, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0,
                                                None, 0], gid, int(ts.group(1)), sg.group(1)])
            body = "f.req=" + quote(json.dumps([[["Fbv4je", inner, None, "generic"]]]))
            rr = c.post("https://news.google.com/_/DotsSplashUi/data/batchexecute", content=body,
                        headers={"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
            found = re.search(r'garturlres.{1,12}?(https?://[^"\\]+)', rr.text)
            return found.group(1) if found else None
    except (httpx.HTTPError, ValueError):
        return None


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


YT_RE = re.compile(r"(?:youtube\.com/(?:watch\?(?:[^#\s]*&)?v=|shorts/|live/|embed/)|youtu\.be/)([\w-]{11})", re.I)
CAPTION_LANGS = ["en", "hi", "mr", "ta", "te", "ml", "bn", "gu", "kn", "pa", "or", "ur"]


def _tidy(t: str) -> str:
    """Collapse runs of '|' separators and whitespace that video titles and descriptions are full of."""
    return re.sub(r"\s+", " ", re.sub(r"(\s*\|\s*){2,}", " | ", t)).strip(" |")


def _yt_published(page: str) -> str | None:
    from datetime import datetime
    raw = _meta(page, "uploadDate", "datePublished") or (re.search(r'"publishDate":"([^"]+)"', page) or [None, None])[1]
    try:
        return datetime.fromisoformat(raw).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if raw else None
    except ValueError:
        return None


def _yt_captions(vid: str) -> str | None:
    """Spoken words of the video from its captions (the channel's own, or YouTube's automatic ones)."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        tl = YouTubeTranscriptApi().list(vid)
        try:
            t = tl.find_transcript(CAPTION_LANGS)
        except Exception:
            t = next(iter(tl))
        text = " ".join(x.text.replace("\n", " ") for x in t.fetch())
        return re.sub(r"\[[^\]]{1,20}\]", " ", text).strip()[:1600] or None
    except Exception:
        return None


def youtube_claim(vid: str, url: str) -> dict | None:
    """A YouTube video or Short as a checkable text: title + description + captions, dated by its upload time."""
    info = None
    try:
        r = httpx.get("https://www.youtube.com/oembed", params={"url": f"https://www.youtube.com/watch?v={vid}", "format": "json"},
                      timeout=12, headers={"User-Agent": UA})
        if r.status_code == 200:
            info = r.json()
    except (httpx.HTTPError, ValueError):
        pass
    if not info:
        return None  # private, removed or unreachable video: nothing to read
    page = ""
    try:
        r = httpx.get(f"https://www.youtube.com/watch?v={vid}", headers={"User-Agent": UA, "Accept-Language": "en-IN,en;q=0.9"},
                      timeout=15, follow_redirects=True)
        page = r.text[:900_000] if r.status_code == 200 else ""
    except httpx.HTTPError:
        pass
    title = _tidy(info.get("title") or "")
    desc = URL_RE.sub("", _meta(page, "og:description", "description") or "")
    desc = _tidy(re.sub(r"#\w+", "", desc))
    # channel boilerplate follows the news; keep only what comes before it
    desc = re.split(r"(?i)\b(?:subscribe|join (?:my|this|our) channel|become a member|follow us|download the|click the bell|hit the bell|[\w' ]+ is india's no\.? ?1)", desc)[0].strip(" .|")[:400]
    caps = _yt_captions(vid)
    parts = [title]
    if desc and desc[:50].lower() not in title.lower():
        parts.append(desc)
    if caps:
        parts.append("The video says: " + caps)
    channel = info.get("author_name") or "YouTube"
    return {"url": url, "publisher": f"{channel} (YouTube)", "published_at": _yt_published(page), "method": "youtube",
            "text": ". ".join(x.rstrip(".") for x in parts), "channel": channel, "has_captions": bool(caps), "video_id": vid}


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
    yt = YT_RE.search(url)
    if yt:
        return youtube_claim(yt.group(1), url)
    via = None
    if "news.google.com" in url:
        real = resolve_google_news(url)
        if not real:
            return None  # an unresolvable aggregator link says nothing about the story; do not read Google's page
        via, url = url, real
    host = urlparse(url).hostname or ""
    out = {"url": url, "publisher": host.replace("www.", ""), "published_at": None}
    if via:
        out["via"] = via
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
        if title and JUNK_TITLE.search(title.strip()):
            title = None  # not the article (parked domain, bot wall, error page): fall back to the URL words
        if title:
            out |= {"text": f"{title}. {desc}" if desc and desc[:60] not in title else title,
                    "published_at": pub, "publisher": site or out["publisher"], "method": "article"}
            return out
    s = slug_text(url)
    if len(s.split()) < 2:  # a one-word slug is not a headline
        return None
    out |= {"text": s, "method": "url_slug"}
    return out
