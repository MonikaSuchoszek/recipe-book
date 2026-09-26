# recipe_book

Static recipe website built with Eleventy (11ty) and hosted on GitHub Pages.

## Specification
- `SPEC.html` is the living spec; read it before implementing and update it (including the changelog) when features change

## Layout
- `src/` Eleventy input (templates, content, assets)
- `docs/` build output, committed to git and published by GitHub Pages (main branch, /docs folder)
- `eleventy.config.js` Eleventy configuration
- Python is available for helper scripts (dependencies in `requirements.txt`)

## Commands
- `npm run serve` dev server with live reload on http://localhost:8080
- `npm run build` build the site into `docs/`

## Conventions
- Never edit files in `docs/` by hand, they are regenerated on every build
- Run `npm run build` and commit `docs/` before pushing so GitHub Pages is up to date
- Prefer clean, readable code; comments explain why, names explain what
