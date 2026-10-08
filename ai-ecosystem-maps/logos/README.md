# Logos

`manifest.json` records, for every brand key used in Map 1, which file is shown and where it came from.

| Status | Count | Meaning |
| --- | --- | --- |
| `official` | 2 | File supplied to RAISE by the company (Gamma and Glean sponsor folders on the RAISE Drive) |
| `library` | 95 | Copied from an open logo library that mirrors company artwork |
| `missing` | 118 | No logo yet; the map shows initials on a dashed plate. See `MISSING.md` |

Library sources, unchanged apart from size attributes:

- SVG Logos collection, `@iconify-json/logos` 1.2.15 (full colour)
- LobeHub AI brand icons, `@lobehub/icons-static-svg` 1.95.1
- Simple Icons, `simple-icons` 16.34.0 (single colour in the brand's hex; `upstream` in the manifest is the official page Simple Icons took the artwork from)

Where a product has no separate mark in any reachable source, the company logo stands in (for example Adobe for Acrobat AI Assistant, Microsoft Copilot for Excel and PowerPoint Copilot, Google for Gemini Notebook).

Company websites and media kits were blocked from the environment these maps were built in, so none of the library logos have been checked against a brand portal. Check them before using the maps outside RAISE.

## Replacing logos with official files

1. On a normal connection, run `python3 scripts/fetch_official_logos.py`. It saves each brand's own website icon to `logos/official/` and writes `logos/official/report.json`.
2. Or drop media-kit files into `logos/official/` named `<key>.svg` or `<key>.png`.
3. Rebuild: `python3 scripts/build_logos.py <vendor dir> <drive dir>` then `python3 scripts/build.py`.

Files in `logos/official/` always win over library files.
