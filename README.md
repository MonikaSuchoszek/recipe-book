# recipe_book

Static recipe website built with [Eleventy](https://www.11ty.dev/) and hosted on GitHub Pages at
https://monikasuchoszek.github.io/recipe-book/. See `SPEC.html` for the full specification.

## Getting started

### With Docker (dev container)
1. Open this folder in VS Code and choose **Reopen in Container** (requires Docker and the Dev Containers extension).
2. Run `claude` in the terminal and log in the first time.
3. `npm run serve` to preview, `npm run build` to generate `docs/`.

Note: open the dev server at http://127.0.0.1:8080/recipe-book/ (`localhost` may not work from a browser outside the dev container).

### Without Docker (local install)
The dev container is only a convenience; everything runs just as well straight on your machine.

1. **Install Node.js 18 or newer** from https://nodejs.org/ (built and tested with Node 24). Check with
   `node --version`.
2. **Install Python 3** from https://www.python.org/ (tested with 3.13), then its one dependency:
   ```
   pip install -r requirements.txt
   ```
   This is Pillow, used by the photo shrinking step. The build calls it as `python3`, so make sure
   `python3 --version` works, not only `python`.
3. **Install the npm packages** in this folder:
   ```
   npm install
   ```
4. `npm run serve` to preview at http://localhost:8080/recipe-book/, `npm run build` to generate `docs/`.
   (`start_server.bat` is a double-click shortcut for `npm run serve` on Windows.)

Claude Code is optional outside the container; install it separately with `npm install -g @anthropic-ai/claude-code`
if you want it.

#### On Windows: run npm from PowerShell, not Git Bash
Use PowerShell (or the plain Command Prompt) for `npm install`. Installing from Git Bash creates only Unix-style
launchers in `node_modules/.bin/`, without the `.cmd` and `.ps1` files that PowerShell needs, and the build then
fails with `'eleventy' is not recognized as an internal or external command`. If that happens, delete
`node_modules/` and run `npm install` again from PowerShell. A Git Bash install is not needed either way: the
PowerShell install produces launchers that work in both shells.

## Commands
- `npm run build`: shrink new photos (`npm run photos`), clean `docs/`, run Eleventy (validates every recipe first), build the Pagefind search index
- `npm run serve`: build once (so photos are shrunk and search works), then the dev server with live reload
- `npm run photos`: shrink new photos in `src/assets/images/recipes/` and strip their metadata (also runs as part of build and serve)

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
2. **They are shrunk automatically** by `npm run build` and `npm run serve` (or on their own with `npm run photos`).
   This overwrites the files *in place*: longest side capped at 2000 px, rotation fixed, all metadata (including GPS
   location) removed. Keep your own copy if you want the full-res originals.
3. **Link them in the recipe's frontmatter**, by file name only (no folder, no `/`):
   ```yaml
   ---
   title: Sponge Cake (Biszkopt)
   image: sponge-cake.jpg          # main photo: page header, recipe card, planner, social preview
   imagePosition: center 40%       # optional: which part stays visible when the photo is cropped
   imageCaption: Fresh from the oven  # optional: caption of the main photo in the gallery
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
| `npm run photos` (first step of build and serve) | same file, overwritten | Max 2000 px, metadata stripped; this is the version committed to git |
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
