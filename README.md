# recipe_book

Static recipe website built with [Eleventy](https://www.11ty.dev/) and hosted on GitHub Pages at
https://beyond-the-known.eu/cookbook/. See `SPEC.html` for the full specification.

## Getting started
1. Open this folder in VS Code and choose **Reopen in Container** (requires Docker and the Dev Containers extension).
2. Run `claude` in the terminal and log in the first time.
3. `npm run serve` to preview, `npm run build` to generate `docs/`.

Note: open the dev server at http://127.0.0.1:8080/cookbook/ (`localhost` may not work from a browser outside the dev container).

## Commands
- `npm run build`: clean `docs/`, run Eleventy (validates every recipe first), build the Pagefind search index
- `npm run serve`: build once (so search works), then the dev server with live reload
- `npm run photos`: shrink new photos in `src/assets/images/recipes/` and strip their metadata

## Adding a recipe
Create `src/recipes/<name>.md` (the file name becomes the URL) with the frontmatter described in `SPEC.html`.
The build stops with a clear message when a field, category or tag is wrong.

## Adding photos
A recipe without photos shows its category illustration, so photos are optional and can be added later.

### Example: photos for `src/recipes/sponge-cake.md`
1. **Put the photos in a folder named after the recipe file** (without `.md`):
   ```
   src/assets/images/recipes/sponge-cake/
   ├── sponge-cake.jpg        main photo
   ├── whisked-whites.jpg     gallery photo
   └── slice.jpg              gallery photo
   ```
   Any size straight from the phone or camera is fine.
2. **Shrink them:** `npm run photos`. This overwrites the files *in place*: longest side capped at 2000 px,
   rotation fixed, all metadata (including GPS location) removed. Keep your own copy if you want the full-res originals.
3. **Link them in the recipe's frontmatter**, by file name only (no folder, no `/`):
   ```yaml
   ---
   title: Sponge Cake (Biszkopt)
   image: sponge-cake.jpg          # main photo: page header, recipe card, planner, social preview
   imagePosition: center 40%       # optional: which part stays visible when the photo is cropped
   gallery:                        # optional: extra photos in a row below the method
     - file: whisked-whites.jpg
       caption: Egg whites whisked to stiff peaks
     - file: slice.jpg             # caption is optional
   ---
   ```
4. **Check and commit:** `npm run serve` to look at the result, then `npm run build` and commit both
   `src/assets/images/recipes/sponge-cake/` and `docs/`.

### What happens to a photo
| Stage | Where | What |
|---|---|---|
| You drop it in | `src/assets/images/recipes/<name>/` | Any size |
| `npm run photos` | same file, overwritten | Max 2000 px, metadata stripped; this is the version committed to git |
| `npm run build` | `docs/assets/images/recipes/<name>/` | WebP copies at 400, 800 and 1600 px wide (capped at the photo's own width), with hashed file names like `eV3jaT9dvg-800.webp`; the browser picks the right one per screen |

You never reference the generated files yourself; the templates do that. Never edit or add photos in `docs/`.

### Tips
- **Size:** at least 1600 px wide gives sharp photos on large screens; smaller sizes are never upscaled.
- **Crops:** the header is cropped to 16:9 and the card to 4:3, so portrait photos work but may lose their top and
  bottom. Use `imagePosition` (`top`, `center 30%`, `left`, ...) to keep the dish in view.
- **File names:** lowercase with hyphens, e.g. `sponge-cake.jpg`. They are case sensitive: `IMG_1234.JPG` in the
  folder does not match `img_1234.jpg` in the frontmatter.
- **Formats:** `.jpg`, `.jpeg`, `.png` and `.webp`. iPhone `.heic` photos are not supported; export them as JPEG
  first (or set the camera to "Most Compatible").
- **Not in the method text:** photos are added only through `image` and `gallery`, not with Markdown `![...](...)`
  in the recipe body.
- **Typo or missing file?** The build stops and names the recipe, the field, the file and the folder it looked in.

## Publishing
In the GitHub repo settings, under **Pages**, set the source to *Deploy from a branch*, branch `main`, folder `/docs`.
Run `npm run build` and commit `docs/` before pushing.
