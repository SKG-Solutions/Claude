# AI ecosystem maps

Two maps for a business team deciding what AI can do and what to try first, in the RAISE palette. Research date: 8 October 2026.

1. **AI by output and workflow.** A zoomable mind map: a hub, five branches (Create, Find and understand, Plan and run events, Work and automate, Build) and 21 section circles holding 259 tool entries (241 distinct tools). Each section shows what AI can produce, example tasks and 12 to 15 tools with their company. An event-content thread (insight to reuse) runs along the foot and links to the sections that do the work.
2. **Choosing a model for the task.** Fast, balanced and deep tiers with event examples and current OpenAI, Anthropic and Google models, five factors that move a task along the spectrum, and a routing panel.

A third tab, *Sources and notes*, lists every change to the starting lists, the sources used, where each logo came from and the 118 logos still needed.

## Files

| Path | What it is |
| --- | --- |
| `dist/index.html` | The published page (no doctype; the artifact host adds one) |
| `dist/standalone.html` | The same page as a normal HTML file. Open it in a browser |
| `exports/map-1-ai-by-output-and-workflow.pdf` | Map 1 as a single vector poster page (7852 × 7679 px) |
| `exports/map-2-choosing-a-model.pdf` | Map 2 as a single tall page |
| `exports/*.png` | Raster previews (Map 1 at half size) |
| `src/inventory.py` | Sections, tools, companies, types and notes: the source of truth |
| `src/models.py` | Map 2 content |
| `src/sources.py` | Source list shown on the notes tab |
| `src/page.html`, `src/style.css`, `src/app.js` | Page template, styles and map engine |
| `logos/` | Logo files and `manifest.json`; see `logos/README.md` |
| `scripts/` | Build, logo and export scripts |

## Rebuild

```sh
python3 scripts/build.py          # writes dist/index.html and dist/standalone.html
node scripts/export.js            # writes exports/ (needs Playwright and Chromium)
```

To change the content, edit `src/inventory.py` or `src/models.py` and rebuild. The layout is computed in the browser from the content, so circles resize and re-pack themselves.

## Using the map

Drag to pan, scroll or pinch to zoom, select a section to focus on it and a logo for details (type, company, notes, website, logo source). The search box finds a tool or company and highlights every place it appears. Select a stage on the event thread to light up its sections.

## Caveats

- Business platforms (events, CRM, analytics, logistics) are not AI-native; their AI features vary by plan, region and module. Sections 14, 20 and 21 separate platforms with embedded AI from AI-first tools.
- Company websites were blocked from the build environment. Anthropic models were checked on anthropic.com; OpenAI and Google models against dated coverage and Google developer docs.
- Logos are pending brand review. See `logos/README.md`.
