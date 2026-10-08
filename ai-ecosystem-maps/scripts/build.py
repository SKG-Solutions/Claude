"""Build dist/index.html (published page) and dist/standalone.html (local copy).

Usage: python3 -I scripts/build.py
"""
import base64
import json
import os
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "src"))
import inventory  # noqa: E402
import models  # noqa: E402
import sources  # noqa: E402

MIME = {"svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "ico": "image/x-icon"}

TYPES = {"M": "Model or model API", "A": "AI product", "C": "Creative application",
         "P": "Business platform", "X": "Automation or agent system"}


def tool(t):
    name, company, typ, logo, domain, note = t
    return {"name": name, "company": company, "type": typ, "logo": logo, "domain": domain, "note": note}


def main():
    manifest = json.load(open(os.path.join(HERE, "logos", "manifest.json")))
    logos = {}
    for key, m in manifest.items():
        if m.get("file"):
            raw = open(os.path.join(HERE, m["file"]), "rb").read()
            mime = MIME[m["file"].rsplit(".", 1)[-1].lower()]
            logos[key] = f"data:{mime};base64," + base64.b64encode(raw).decode()
    sections = []
    names = set()
    entries = 0
    for s in inventory.SECTIONS:
        if "groups" in s:
            groups = [{"label": label, "tools": [tool(t) for t in tools]} for label, tools in s["groups"]]
        else:
            groups = [{"label": None, "tools": [tool(t) for t in s["tools"]]}]
        for g in groups:
            for t in g["tools"]:
                entries += 1
                names.add(t["name"])
        sections.append({
            "n": s["n"], "branch": s["branch"], "sub": s.get("sub"), "title": s["title"],
            "produces": s["produces"], "workflow": s.get("workflow", False), "tasks": s["tasks"],
            "caveat": s.get("caveat"), "groups": groups, "replaced": s.get("replaced", []),
        })
    data = {
        "researchDate": inventory.RESEARCH_DATE,
        "branches": [{"id": i, "label": l, "desc": d} for i, l, d in inventory.BRANCHES],
        "sections": sections,
        "thread": [{"stage": st, "sections": secs} for st, secs in inventory.THREAD],
        "types": TYPES,
        "stats": {"entries": entries, "unique": len(names)},
        "logos": logos,
        "logoMeta": manifest,
        "models": {"intro": models.INTRO, "tiers": models.TIERS, "factors": models.FACTORS,
                   "routes": models.ROUTES, "watch": models.WATCH},
        "sources": [{"topic": a, "supports": b, "title": c, "url": d, "kind": e} for a, b, c, d, e in sources.SOURCES],
    }
    page = open(os.path.join(HERE, "src", "page.html")).read()
    page = page.replace("/*STYLE*/", open(os.path.join(HERE, "src", "style.css")).read())
    page = page.replace("/*DATA*/", json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
    page = page.replace("/*APP*/", open(os.path.join(HERE, "src", "app.js")).read())
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    open(os.path.join(HERE, "dist", "index.html"), "w").write(page)
    standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                  '</head>\n<body>\n' + page + '\n</body>\n</html>\n')
    open(os.path.join(HERE, "dist", "standalone.html"), "w").write(standalone)
    print(f"{entries} entries, {len(names)} distinct tools, {len(logos)} logos, {len(page) // 1024} KB")


if __name__ == "__main__":
    main()
