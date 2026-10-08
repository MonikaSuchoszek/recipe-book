---
name: import-recipes
description: Import photos of handwritten recipes (Polish or English) from ./recipe_import into structured English Markdown recipes in ./src/recipes, interviewing the user about anything unclear. Use when the user runs /import-recipes or asks to import, transcribe, digitise or convert handwritten or scanned recipes, recipe photos or recipe cards into the recipe book.
model: claude-opus-5-5
effort: medium
---

# Import handwritten recipes

Turn every image in `./recipe_import/` into a valid recipe file in `./src/recipes/`, written in English. The handwriting is often Polish, sometimes English, sometimes a mix. The goal is a recipe the user would happily cook from, so accuracy beats speed: when something can't be read or decided with confidence, ask instead of guessing.

## 1. Learn the house format first

Recipes must pass the build validation, so read these before writing anything:

- `recipe_format.md` (next to this file): frontmatter fields, ingredient items (`name`, `amount`, `unit`, `note`, `scale`), grouped vs plain ingredient lists, unit rules, how categories and tags work.
- `src/_data/taxonomy.js`: the only allowed categories and tags.
- Two or three existing files in `src/recipes/` as style references (e.g. `broccoli-salad.md`) for tone, level of detail and how the method is written.

Rules that most often break the build or the portion scaler:
- Units are singular (`cup`, not `cups`) and metric where possible.
- A `note` never holds a quantity: "about 2 cups" belongs in `amount` + `unit`.
- No `permalink` in frontmatter; the file name becomes the URL, so pick it carefully (lowercase, hyphenated, English, e.g. `pierogi-ruskie.md`).
- `scale: false` for things like a pinch of salt or a bay leaf.
- Only categories and tags that exist in `taxonomy.js`.

## 2. Read every image

List `./recipe_import/` (jpg, jpeg, png, heic, webp, etc.) and look at each image with the Read tool. One image may hold several recipes, and one recipe may span several images (front/back of a card, page 1/2): group them before transcribing.

For each recipe, transcribe faithfully first (in the original language) in your working notes, then translate. Keeping the two steps separate makes it easier to spot words you actually couldn't read versus words you couldn't translate.

Translation notes for Polish handwritten recipes:
- Old Polish measures: *szklanka* = glass ≈ 250 ml (convert to ml or `cup`), *łyżka* = tbsp, *łyżeczka* = tsp, *dag* (dekagram) = 10 g, *opakowanie / paczka* = packet (ask the size if it matters, e.g. baking powder ≈ 16 g, vanilla sugar ≈ 16 g, gelatine varies), *kostka* masła = 200 g block of butter, *szczypta* = pinch.
- Ingredients without a direct English equivalent: *twaróg* (farmer's cheese / quark), *śmietana 18%/30%* (sour cream vs. cream: the fat percentage tells which), *kasza* (specify the grain: buckwheat, millet, semolina...), *budyń* (custard pudding powder). Prefer the clear English name, and keep the Polish dish name in the description when it's a well-known dish (e.g. title "Polish Cheesecake", description mentions *sernik*).
- Abbreviations like "ł.", "łyż.", "szkl.", "dkg", "g." are common; read in context.

## 3. Draft, then collect open questions

Draft each recipe in your head (or notes) and list everything you are not confident about. Typical questions:
- Illegible or ambiguous words, amounts or units ("is this 1½ or 7?").
- Translations with more than one plausible meaning.
- Missing serving size, or what one portion is (servings, pieces, a 24 cm tin...).
- Missing oven temperature, baking time, tin size, or a step you can't infer.
- Which category fits when two are plausible.
- A category or tag that would fit well but doesn't exist in `taxonomy.js` (ask whether to add it, don't add silently, since it affects the site's navigation).
- Possible duplicates of a recipe that already exists in `src/recipes/`.

What you can decide yourself without asking:
- Sensible categories and tags from the existing list (e.g. `vegetarian` when there's clearly no meat or fish).
- A short, appetising `description`.
- Writing a method when the card only has ingredients: write plain, conventional steps that fit the ingredients and the type of dish, in the same style as the existing recipes. Mention to the user which recipes got a written-from-scratch method so they can check it, and ask only when the dish could reasonably be prepared in quite different ways.
- Converting units to metric.

## 4. Interview the user

Ask all open questions together with AskUserQuestion, grouped per recipe and phrased so they can be answered quickly: show what you read (quote the original Polish), and offer your best guess as the first, recommended option. Batch up to four questions per call; make further calls if there are more. If an answer opens a new question, ask a follow-up rather than guessing.

Don't ask about things you can confidently infer; a long interview about obvious things wastes the user's time.

## 5. Write the files

Write one `.md` file per recipe in `src/recipes/` using the house format, with today's date as `date`. Don't overwrite an existing recipe; if the slug is taken, ask.

Leave the original images in `./recipe_import/` (they're the user's source material and the folder is git-ignored); suggest the user can delete them once happy.

## 6. Verify and report

Run `npm run build`. If validation fails, fix the recipe and build again until it passes. Don't commit; the user decides when.

Finish with a short summary: which files were created from which images, what was assumed (written methods, unit conversions, estimated servings), and anything still worth double-checking. Mention any new category or tag that was added to `taxonomy.js`.
