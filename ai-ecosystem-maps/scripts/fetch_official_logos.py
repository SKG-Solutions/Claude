"""Download each brand's own icon from its official website.

The research environment for these maps could not reach company websites, so
most logos come from open logo libraries. Run this on a normal internet
connection to replace them with files served by each company's own domain:

    python3 scripts/fetch_official_logos.py
    python3 scripts/build_logos.py <vendor dir> <drive dir>
    python3 scripts/build.py

It reads the homepage of each brand's domain, picks the largest declared icon
(SVG first, then apple-touch-icon, then other icons) and saves it as
logos/official/<key>.<ext>. build_logos.py prefers these files over library
logos. Check each result by eye: a site icon is usually the brand mark, but
not always the full logo a media kit would supply.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "src"))
from inventory import SECTIONS, all_tools  # noqa: E402

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
EXT = {"image/svg+xml": "svg", "image/png": "png", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico",
       "image/jpeg": "jpg", "image/webp": "webp"}


def get(url, limit=3_000_000):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read(limit), r.headers.get_content_type(), r.geturl()


def candidates(html, base):
    found = []
    for tag in re.findall(r"<link\b[^>]*>", html, re.I):
        rel = (re.search(r'rel=["\']([^"\']+)', tag, re.I) or [None, ""])[1].lower()
        href = (re.search(r'href=["\']([^"\']+)', tag, re.I) or [None, ""])[1]
        if not href or "icon" not in rel:
            continue
        sizes = (re.search(r'sizes=["\']([^"\']+)', tag, re.I) or [None, ""])[1]
        px = max([int(n) for n in re.findall(r"(\d+)x\d+", sizes)] or [0])
        score = (3000 if href.lower().endswith(".svg") or "svg" in tag.lower() else 0) + \
                (1000 if "apple-touch-icon" in rel else 0) + px
        found.append((score, urllib.parse.urljoin(base, href)))
    found.append((1, urllib.parse.urljoin(base, "/favicon.ico")))
    return [u for _, u in sorted(found, reverse=True)]


def main():
    out = os.path.join(HERE, "logos", "official")
    os.makedirs(out, exist_ok=True)
    domains = {}
    for s in SECTIONS:
        for _, t in all_tools(s):
            if t[4] and t[3] not in domains:
                domains[t[3]] = t[4]
    report = {}
    for key, domain in sorted(domains.items()):
        try:
            html, _, final = get("https://" + domain)
            for url in candidates(html.decode("utf-8", "ignore"), final):
                try:
                    data, ctype, _ = get(url)
                except Exception:
                    continue
                if ctype in EXT and len(data) > 200:
                    path = os.path.join(out, f"{key}.{EXT[ctype]}")
                    open(path, "wb").write(data)
                    report[key] = {"domain": domain, "url": url, "file": os.path.relpath(path, HERE)}
                    break
            else:
                report[key] = {"domain": domain, "error": "no usable icon"}
        except Exception as e:  # network errors, blocked hosts
            report[key] = {"domain": domain, "error": str(e)[:120]}
        print(key, report[key].get("file") or report[key]["error"])
    json.dump(report, open(os.path.join(out, "report.json"), "w"), indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
