"""Assemble logo files for the maps and record where each one came from.

Usage: python3 -I scripts/build_logos.py <vendor dir> <drive dir>

<vendor dir> holds the unpacked npm packages (see logos/README.md for the
exact versions); <drive dir> holds official files supplied by sponsors to RAISE.
Files in logos/official/ (from fetch_official_logos.py) win over everything else.
Writes logos/<key>.svg and logos/manifest.json. Brands with no entry in
CHOICES get no file: the map shows a labelled wordmark placeholder for them.
"""
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "src"))
from inventory import SECTIONS, all_tools  # noqa: E402

# key -> (source, icon id). Sources:
#   drive  official file supplied to RAISE by the company (sponsor asset)
#   logos  SVG Logos collection (@iconify-json/logos), full colour
#   lobe   LobeHub AI brand icons (@lobehub/icons-static-svg)
#   si     Simple Icons (simple-icons), single colour, upstream source recorded
# Company logos stand in for a product where the product has no separate mark
# in any reachable source (for example Adobe for Acrobat AI Assistant).
CHOICES = {
    "gamma": ("drive", "Gamma_Wordmark_DeepOcean.svg"),
    "glean": ("drive", "GLN_logo-wordmark-Primary.svg"),
    "acrobat": ("logos", "adobe-icon"),
    "adobeexpress": ("logos", "adobe-icon"),
    "marketo": ("logos", "adobe-icon"),
    "photoshop": ("logos", "adobe-photoshop"),
    "premiere": ("logos", "adobe-premiere"),
    "firefly": ("lobe", "adobefirefly-color"),
    "airtable": ("logos", "airtable"),
    "asana": ("logos", "asana-icon"),
    "assemblyai": ("lobe", "assemblyai-color"),
    "aws": ("logos", "aws"),
    "azure": ("logos", "azure-icon"),
    "bfl": ("lobe", "bfl"),
    "bolt": ("si", "stackblitz"),
    "bubble": ("logos", "bubble-icon"),
    "bytedance": ("lobe", "bytedance-color"),
    "capcut": ("lobe", "capcut"),
    "cartesia": ("logos", "cartesia-icon"),
    "claude": ("logos", "claude-icon"),
    "clickup": ("logos", "clickup-icon"),
    "clipdrop": ("lobe", "clipdrop"),
    "copilotstudio": ("lobe", "copilot-color"),
    "m365copilot": ("lobe", "copilot-color"),
    "excel": ("lobe", "copilot-color"),
    "powerpoint": ("lobe", "copilot-color"),
    "davinci": ("si", "davinciresolve"),
    "deepgram": ("logos", "deepgram-icon"),
    "deepl": ("lobe", "deepl-color"),
    "deepmind": ("lobe", "deepmind-color"),
    "descript": ("logos", "descript-icon"),
    "edrawmind": ("si", "wondershare"),
    "elevenlabs": ("logos", "elevenlabs-icon"),
    "eraser": ("logos", "eraser-icon"),
    "eventbrite": ("logos", "eventbrite-icon"),
    "figma": ("logos", "figma"),
    "framer": ("logos", "framer"),
    "freepik": ("si", "freepik"),
    "gemini": ("logos", "google-gemini-icon"),
    "notebooklm": ("logos", "google-icon"),
    "glide": ("si", "glide"),
    "googlecloud": ("logos", "google-cloud"),
    "googlemeet": ("logos", "google-meet"),
    "googlesheets": ("si", "googlesheets"),
    "googleslides": ("si", "googleslides"),
    "grammarly": ("logos", "grammarly-icon"),
    "hubspot": ("logos", "hubspot"),
    "ideogram": ("lobe", "ideogram"),
    "kling": ("lobe", "kling-color"),
    "krea": ("lobe", "krea"),
    "llamaindex": ("lobe", "llamaindex-color"),
    "lovable": ("logos", "lovable-icon"),
    "lucid": ("si", "lucid"),
    "luma": ("lobe", "luma-color"),
    "make": ("lobe", "make-color"),
    "mermaid": ("logos", "mermaid"),
    "midjourney": ("logos", "midjourney"),
    "minimax": ("lobe", "hailuo-color"),
    "miro": ("logos", "miro-icon"),
    "mistral": ("logos", "mistral-ai-icon"),
    "msdesigner": ("logos", "microsoft-icon"),
    "mural": ("si", "mural"),
    "n8n": ("logos", "n8n-icon"),
    "nanonets": ("logos", "nanonets"),
    "notion": ("logos", "notion-icon"),
    "openai": ("logos", "openai-icon"),
    "oracle": ("logos", "oracle"),
    "perplexity": ("logos", "perplexity-icon"),
    "pika": ("lobe", "pika"),
    "pixverse": ("lobe", "pixverse-color"),
    "powerbi": ("logos", "microsoft-power-bi"),
    "prezi": ("si", "prezi"),
    "recraft": ("lobe", "recraft"),
    "removebg": ("si", "removedotbg"),
    "replit": ("logos", "replit-icon"),
    "runway": ("lobe", "runway"),
    "salesforce": ("logos", "salesforce"),
    "sap": ("logos", "sap"),
    "semanticscholar": ("si", "semanticscholar"),
    "slido": ("si", "cisco"),
    "stability": ("logos", "stability-ai-icon"),
    "suno": ("lobe", "suno"),
    "tableau": ("logos", "tableau-icon"),
    "teams": ("logos", "microsoft-teams"),
    "udio": ("lobe", "udio-color"),
    "uipath": ("si", "uipath"),
    "unstructured": ("lobe", "unstructured-color"),
    "v0": ("logos", "v0"),
    "veed": ("si", "veed"),
    "vfairs": ("si", "vfairs"),
    "vidu": ("lobe", "vidu-color"),
    "webex": ("si", "webex"),
    "webflow": ("logos", "webflow"),
    "wix": ("logos", "wix"),
    "zapier": ("logos", "zapier-icon"),
    "zoho": ("logos", "zoho"),
    "zoom": ("logos", "zoom-icon"),
}

SOURCE_LABELS = {
    "drive": "Official file supplied to RAISE by the company",
    "logos": "SVG Logos collection (@iconify-json/logos)",
    "lobe": "LobeHub AI brand icons (@lobehub/icons-static-svg)",
    "si": "Simple Icons (simple-icons)",
}


def luminance(hex_colour):
    r, g, b = (int(hex_colour[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def main(vendor, drive):
    out = os.path.join(HERE, "logos")
    os.makedirs(out, exist_ok=True)
    logos_set = json.load(open(f"{vendor}/_iconify-json_logos/package/icons.json"))
    logos_ver = json.load(open(f"{vendor}/_iconify-json_logos/package/package.json"))["version"]
    lobe_dir = f"{vendor}/_lobehub_icons-static-svg/package/icons"
    lobe_ver = json.load(open(f"{vendor}/_lobehub_icons-static-svg/package/package.json"))["version"]
    si_data = {x.get("slug") or re.sub(r"[^a-z0-9]", "", x["title"].lower()): x
               for x in json.load(open(f"{vendor}/si/package/data/simple-icons.json"))}
    si_ver = json.load(open(f"{vendor}/si/package/package.json"))["version"]

    used = {}
    for s in SECTIONS:
        for _, t in all_tools(s):
            used.setdefault(t[3], {"company": t[1], "tools": set()})["tools"].add(t[0])

    official_dir = os.path.join(out, "official")
    manifest = {}
    for key in sorted(used):
        entry = {"company": used[key]["company"], "tools": sorted(used[key]["tools"])}
        site = [f for f in os.listdir(official_dir) if f.rsplit(".", 1)[0] == key] if os.path.isdir(official_dir) else []
        if site:
            entry.update(status="official", file=f"logos/official/{site[0]}",
                         source="Icon served by the company's own website", icon=site[0], version=None)
            manifest[key] = entry
            continue
        if key not in CHOICES:
            entry.update(status="missing", file=None)
            manifest[key] = entry
            continue
        src, icon = CHOICES[key]
        dest = os.path.join(out, f"{key}.svg")
        if src == "drive":
            shutil.copyfile(os.path.join(drive, icon), dest)
            entry["version"] = None
        elif src == "logos":
            ic = logos_set["icons"][icon]
            w = ic.get("width", logos_set.get("width", 256))
            h = ic.get("height", logos_set.get("height", 256))
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{ic.get("left", 0)} '
                   f'{ic.get("top", 0)} {w} {h}">{ic["body"]}</svg>')
            open(dest, "w").write(svg)
            entry["version"] = logos_ver
        elif src == "lobe":
            svg = open(os.path.join(lobe_dir, f"{icon}.svg")).read()
            # Mono LobeHub icons paint with currentColor; logos sit on a white plate.
            svg = svg.replace("currentColor", "#000000")
            # Drop the fixed 1em size so the icon scales to its plate.
            svg = re.sub(r'(<svg[^>]*?)\s(?:width|height)="1em"', r"\1", svg)
            svg = re.sub(r'(<svg[^>]*?)\s(?:width|height)="1em"', r"\1", svg)
            open(dest, "w").write(svg)
            entry["version"] = lobe_ver
        elif src == "si":
            x = si_data[icon]
            path = open(f"{vendor}/si/package/icons/{icon}.svg").read()
            d = re.search(r' d="([^"]+)"', path).group(1)
            fill = "#" + x["hex"] if luminance(x["hex"]) < 0.62 else "#000000"
            open(dest, "w").write(
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
                f'<path fill="{fill}" d="{d}"/></svg>')
            entry["version"] = si_ver
            entry["upstream"] = x.get("source")
        entry.update(status="library" if src != "drive" else "official",
                     file=f"logos/{key}.svg", source=SOURCE_LABELS[src], icon=icon)
        manifest[key] = entry
    json.dump(manifest, open(os.path.join(out, "manifest.json"), "w"), indent=1, sort_keys=True)
    counts = {}
    for e in manifest.values():
        counts[e["status"]] = counts.get(e["status"], 0) + 1
    print(counts)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
