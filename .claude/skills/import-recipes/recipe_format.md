# Recipe file format

One Markdown file per recipe in `src/recipes/`. The YAML frontmatter holds all structured data; the Markdown body holds the method. The build validates every recipe and fails with a clear message (file + field) on any mistake listed below.

## File name = URL

- `src/recipes/oat-banana-waffles.md` becomes `/recipe-book/recipes/oat-banana-waffles/`.
- Lowercase, words separated by hyphens, English. Renaming the file is the only thing that changes the URL, so choose carefully.
- Never put a `permalink` in a recipe's frontmatter; it fails the build.

## Frontmatter fields

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | yes | Name of the dish. |
| `description` | string | no | One-sentence teaser for cards and search results. |
| `date` | date (YYYY-MM-DD) | no | Date added, used for "Recently added". Set it explicitly. |
| `categories` | list of strings | yes (min 1) | What kind of dish it is. Use one or two. Only terms from `src/_data/taxonomy.js`. |
| `tags` | list of strings | no | Properties of the dish (diet, effort, main ingredient, season, audience). Only terms from `src/_data/taxonomy.js`. |
| `servings.amount` | positive integer | yes | Number of portions the ingredient amounts are written for. |
| `servings.unit` | string (plural) | yes | What one portion is, plural: servings, waffles, glasses, pancakes, muffins. |
| `servings.unitSingular` | string | no | Singular form, shown when the counter is at 1. Defaults to `unit`. |
| `servings.note` | string | no | Byline under the counter, e.g. "Might vary depending on the size of your waffle iron." |
| `ingredients` | list of items, or groups of them | yes (min 1 item) | See below. |
| `image` | file name | no | Main photo in `src/assets/images/recipes/<slug>/`. Falls back to the category artwork. |
| `imagePosition` | string | no | CSS `object-position` for cropping, e.g. `center 30%`. |
| `imageCaption` | string | no | Caption of the main photo in the gallery viewer. |
| `gallery` | list of `{file, caption?}` | no | Extra photos in the same folder. |

## Ingredients

Block-style YAML (one field per line, no curly braces). Two shapes, which cannot be mixed within one recipe.

Plain list, for simple recipes:

```yaml
ingredients:
  - name: red lentils
    amount: 200
    unit: g
  - name: onion
    amount: 1
```

Grouped, when the recipe has sections (each key is a heading such as Batter, Dressing, To serve; shown in the order written):

```yaml
ingredients:
  Batter:
    - name: rolled oats
      amount: 150
      unit: g
  To serve:
    - name: Greek yoghurt
      amount: 150
      unit: g
```

### Ingredient item

Write `name` first by convention. Quote a value only when it starts with a special YAML character or looks like a number/boolean that should stay text.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Ingredient name, e.g. "rolled oats". |
| `amount` | number | no | Quantity for `servings.amount` portions. Decimals allowed (0.5). Omit for "to taste" items. |
| `unit` | string | no | Metric: g, kg, ml, l, tsp, tbsp, pinch, clove, handful, piece, can, ... plus `cup` for loose ingredients easier to measure by volume. Always **singular** (`cup`, never `cups`); the site pluralises on display. Omit for countable items ("2 eggs"). |
| `note` | string | no | Preparation or remark: "finely chopped", "to serve", "optional". **Never a quantity**: notes don't scale, so "about 2 cups" goes in `amount` + `unit`. A note with a number followed by g, kg, ml, l, tsp, tbsp or cup fails the build. |
| `scale` | boolean | no (default true) | `false` for amounts that shouldn't change with portions (a pinch of salt, 1 bay leaf). |

Any other field in an item (e.g. a typo like `ammount`) fails the build.

## Categories and tags

`src/_data/taxonomy.js` is the single source of truth; read it for the current lists.

- **Categories** say what kind of dish it is (one or two per recipe). Each has its own page, home tile, colour and placeholder illustration.
- **Tags** describe properties; a recipe can have several. They are organised in groups, each group being a search filter.
- Matching is case-insensitive and ignores surrounding spaces; otherwise it must match exactly (no plurals or synonyms). Listing the same term twice in a recipe is an error.
- Adding a new term: a category needs `{ name, color, illustration }` in `categories` (color from the `palette` or a hex value, illustration an SVG in `src/assets/illustrations/`, `plate.svg` being the generic placeholder). A tag goes as `{ name }` in the `tags` list of its group, inheriting the group colour. New terms change the site's navigation, so only add them with the user's agreement.

## Body (method)

- Free Markdown. Convention: a numbered list of steps, optionally followed by a `## Tips` section.
- No ingredient heading or list in the body; ingredients render from the frontmatter.
- A recipe whose method isn't written yet may say so in one line; it still builds.

## Example

```markdown
---
title: Broccoli Salad
description: Crunchy broccoli salad with bacon, toasted seeds, walnuts and a sweet-and-sour dressing.
date: 2026-09-26
categories: [Salad]
tags: [quick]
servings:
  amount: 6
  unit: servings
  unitSingular: serving
ingredients:
  Salad:
    - name: broccoli
      amount: 500
      unit: g
    - name: bacon
      amount: 200
      unit: g
      note: diced
    - name: red onion
      amount: 1
  Dressing:
    - name: wine vinegar
      amount: 5
      unit: tbsp
    - name: sugar
      amount: 2
      unit: tbsp
---

1. Cut the broccoli into florets, cook for 5 minutes, then let cool.
2. Fry the diced bacon in a dry pan (no fat).
3. In a small pot, heat the vinegar with the sugar and let it cool.
4. Toss everything together with the dressing.
```
