"""Geocoding with Nominatim + shared cache. Never invents coordinates.

Rejects results that are businesses/amenities for region-level text (the handover's 'USA Nails' bug),
returns a precision level, and reports unresolved/ambiguous places instead of guessing.
"""
from __future__ import annotations

import json
import threading
from urllib.parse import urlencode

from ..config import GEOCODE_CACHE
from ..db import now
from .base import FetchError, fetch

_lock = threading.Lock()
OK_CLASSES = {"place", "boundary", "natural", "waterway", "highway", "landuse", "man_made", "leisure", "amenity_landmark"}
PRECISION = {"country": "country", "state": "region", "region": "region", "state_district": "region",
             "county": "region", "province": "region", "city": "city", "town": "city", "municipality": "city",
             "village": "city", "suburb": "neighbourhood", "neighbourhood": "neighbourhood", "quarter": "neighbourhood",
             "road": "street", "hamlet": "neighbourhood", "city_district": "neighbourhood", "district": "region"}


STREET_WORDS = ("road", " rd", "street", " st", "marg", "highway", "lane", "avenue", "bridge", "flyover", "chowk", "nagar",
                "colony", "park", "ghat", "dam", "station", "airport")
REGION_WORDS = {"ncr", "area", "areas", "region", "district", "city", "metropolitan", "suburbs", "outskirts", "vicinity"}


def _trim(text: str) -> list[str]:
    return [w for w in text.strip().split() if w.lower().strip(",.") not in REGION_WORDS]


def _load():
    try:
        return json.loads(GEOCODE_CACHE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def geocode(text: str, country_codes: str | None = None) -> dict:
    """Return {lat, lon, precision, display, confidence} or {unresolved: True, reason}."""
    if not text or not text.strip():
        return {"unresolved": True, "reason": "no place mentioned"}
    if "/" in text:
        return {"unresolved": True, "reason": f"composite place '{text}' (several regions)"}
    key = f"v2|{text.strip().lower()}|{country_codes or ''}"
    with _lock:
        cache = _load()
    if key in cache and not (cache[key].get("unresolved") and (_trim(text) != text.strip().split() or text.count(",") >= 2)):
        return cache[key]
    q = {"q": text, "format": "jsonv2", "limit": 3, "addressdetails": 0}
    if country_codes:
        q["countrycodes"] = country_codes
    try:
        res = json.loads(fetch("https://nominatim.openstreetmap.org/search?" + urlencode(q), max_age_s=None))
    except FetchError as e:
        return {"unresolved": True, "reason": f"geocoder unavailable ({e})"}
    good = [r for r in res if r.get("category", r.get("class")) in OK_CLASSES]
    # a bare place name ("Delhi") must not resolve to a street or building that happens to carry that name
    if not any(w in text.lower() for w in STREET_WORDS):
        good = [r for r in good if r.get("category", r.get("class")) not in ("highway", "man_made", "leisure", "landuse")]
    if not good:
        out = {"unresolved": True, "reason": f"no place-level match for '{text}'"}
    else:
        r = good[0]
        prec = PRECISION.get(r.get("addresstype") or r.get("type"), "approximate")
        ambiguous = len(good) > 1 and good[1].get("importance", 0) > 0.8 * r.get("importance", 1) and \
            abs(float(good[1]["lat"]) - float(r["lat"])) + abs(float(good[1]["lon"]) - float(r["lon"])) > 1
        out = {"lat": float(r["lat"]), "lon": float(r["lon"]), "precision": prec, "display": r.get("display_name"),
               "confidence": 0.5 if ambiguous else 0.85, "ambiguous": ambiguous, "queried_at": now()}
    if out.get("unresolved") and text.count(",") >= 2:
        # a village Nominatim does not know: fall back to the next larger place ("Karuvarakundu, Malappuram, Kerala")
        coarser = geocode(", ".join(p.strip() for p in text.split(",")[1:]), country_codes)
        if not coarser.get("unresolved"):
            out = coarser | {"queried_as": ", ".join(p.strip() for p in text.split(",")[1:]), "coarsened": True}
    if out.get("unresolved") and not out.get("_retried"):
        words = text.strip().split()
        trimmed = _trim(text)
        if trimmed and len(trimmed) < len(words):
            retry = geocode(" ".join(trimmed), country_codes)
            if not retry.get("unresolved") and retry.get("precision") in ("country", "region", "city", "neighbourhood"):
                out = retry | {"queried_as": " ".join(trimmed)}
    with _lock:
        cache = _load()
        cache[key] = out
        GEOCODE_CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
    return out
