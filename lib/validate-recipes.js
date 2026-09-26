// Validates every recipe's frontmatter before Eleventy renders anything.
// All problems are collected and printed per file, so one build shows every mistake.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { findCategory, findTag, matchKey, taxonomy } from "./taxonomy.js";
import {
  INGREDIENT_FIELDS,
  PHOTOS_DIR,
  RECIPES_DIR,
  hasMethod,
  isGrouped,
  photoPath,
} from "./recipes.js";

const useColor = process.stderr.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
const red = paint("31;1");
const yellow = paint("33");
const cyan = paint("36");
const dim = paint("2");

const PALETTE_NAMES = Object.keys(taxonomy.palette);
const RECIPE_FIELDS = [
  "title", "description", "date", "categories", "tags", "servings", "ingredients",
  "image", "imagePosition", "gallery",
];

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function closestMatch(value, names) {
  const key = matchKey(value);
  let best = null;
  for (const name of names) {
    const candidate = matchKey(name);
    const distance = levenshtein(key, candidate);
    const close = distance <= 2 || candidate.includes(key) || key.includes(candidate);
    if (close && (!best || distance < best.distance)) best = { name, distance };
  }
  return best?.name;
}

function wrapList(names, indent, width = 72) {
  const lines = [];
  let line = "";
  for (const [index, name] of names.entries()) {
    const piece = name + (index < names.length - 1 ? "," : "");
    if (line && (indent + line + " " + piece).length > width) {
      lines.push(line);
      line = piece;
    } else {
      line = line ? `${line} ${piece}` : piece;
    }
  }
  if (line) lines.push(line);
  return lines.map((text) => " ".repeat(indent) + text).join("\n");
}

function unknownCategoryMessage(file, value) {
  const names = taxonomy.categories.map((c) => c.name);
  const suggestion = closestMatch(value, names);
  return [
    red(`✖ Unknown category in ${file}`),
    "",
    `  Field:   categories`,
    `  Value:   "${value}"`,
    suggestion ? `  Did you mean ${cyan(`"${suggestion}"`)}?` : null,
    "",
    `  Supported categories (${names.length}):`,
    wrapList(names, 4),
    "",
    `  Is "${value}" truly a new category? Add it to src/_data/taxonomy.js`,
    `  under "categories", for example:`,
    "",
    dim(`    { name: "${value}", color: "leaf", illustration: "plate.svg" },`),
    "",
    `  color:        one of ${PALETTE_NAMES.slice(0, 7).join(", ")},`,
    `                ${PALETTE_NAMES.slice(7).join(", ")}, or a hex value like "#2F9E6E"`,
    `  illustration: an SVG in src/assets/illustrations/ (plate.svg is the`,
    `                generic placeholder)`,
    "",
    `  Then rebuild. A new category also gets its own page at`,
    `  /categories/${taxonomySlug(value)}/. See SPEC.html, "Categories and tags".`,
  ].filter((line) => line !== null).join("\n");
}

function taxonomySlug(value) {
  return matchKey(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function unknownTagMessage(file, value) {
  const names = taxonomy.tags.map((t) => t.name);
  const suggestion = closestMatch(value, names);
  const width = Math.max(...taxonomy.tagGroups.map((g) => g.name.length)) + 2;
  const groupForExample =
    taxonomy.tags.find((t) => t.name === suggestion)?.group ?? taxonomy.tagGroups[0].name;
  const exampleGroup = taxonomy.tagGroups.find((g) => g.name === groupForExample);
  const exampleColor = Object.entries(taxonomy.palette).find(([, hex]) => hex === exampleGroup.color)?.[0] ?? exampleGroup.color;
  return [
    red(`✖ Unknown tag in ${file}`),
    "",
    `  Field:   tags`,
    `  Value:   "${value}"`,
    suggestion ? `  Did you mean ${cyan(`"${suggestion}"`)}?` : null,
    "",
    `  Supported tags (${names.length}), by group:`,
    ...taxonomy.tagGroups.map(
      (g) => `    ${g.name.padEnd(width)} ${g.tags.map((t) => t.name).join(", ")}`,
    ),
    "",
    `  Is "${value}" truly a new tag? Add it to src/_data/taxonomy.js inside the`,
    `  "tags" list of the group it belongs to, for example:`,
    "",
    dim(`    { name: "${exampleGroup.name}", color: "${exampleColor}", tags: [`),
    dim(`      ...`),
    dim(`      { name: "${value}" },`),
    dim(`    ]},`),
    "",
    `  The tag uses its group's colour unless you add color: "...".`,
    `  For a new group, add { name: "...", color: "...", tags: [...] } to`,
    `  "tagGroups"; it will appear as a new filter on the search page.`,
    `  Then rebuild. See SPEC.html, "Categories and tags".`,
  ].filter((line) => line !== null).join("\n");
}

function problem(title, file, details) {
  return [red(`✖ ${title} in ${file}`), "", ...details.map((line) => `  ${line}`)].join("\n");
}

const describeType = (value) => (Array.isArray(value) ? "a list" : value === null ? "empty" : typeof value);

function validateTerms(file, data, field, find, unknownMessage) {
  const problems = [];
  const values = data[field];
  if (values === undefined) return problems;
  if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
    return [problem(`Wrong type for "${field}"`, file, [
      `Field:    ${field}`,
      `Expected: a list of names, e.g. ${field}: [${field === "categories" ? "Breakfast, Baking" : "vegetarian, quick"}]`,
      `Found:    ${describeType(values)}`,
    ])];
  }
  const seen = new Set();
  for (const value of values) {
    if (seen.has(matchKey(value))) {
      problems.push(problem(`Duplicate ${field === "categories" ? "category" : "tag"}`, file, [
        `Field:   ${field}`,
        `Value:   "${value}" is listed more than once.`,
      ]));
    }
    seen.add(matchKey(value));
    if (!find(value)) problems.push(unknownMessage(file, value));
  }
  return problems;
}

function validateIngredient(file, item, where) {
  const problems = [];
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return [problem("Invalid ingredient", file, [
      `Where:    ${where}`,
      `Expected: an item with at least a name, e.g.`,
      `            - name: red lentils`,
      `              amount: 200`,
      `              unit: g`,
    ])];
  }
  const label = item.name ? `"${item.name}"` : where;
  const unknown = Object.keys(item).filter((key) => !INGREDIENT_FIELDS.includes(key));
  for (const key of unknown) {
    problems.push(problem("Unknown ingredient field", file, [
      `Ingredient: ${label}`,
      `Field:      ${key}`,
      `Allowed:    ${INGREDIENT_FIELDS.join(", ")}`,
    ]));
  }
  if (typeof item.name !== "string" || !item.name.trim()) {
    problems.push(problem("Missing ingredient name", file, [`Where: ${where}`, `Every ingredient needs a name.`]));
  }
  const expect = (key, ok, expected) => {
    if (item[key] !== undefined && !ok(item[key])) {
      problems.push(problem(`Wrong type for ingredient "${key}"`, file, [
        `Ingredient: ${label}`,
        `Expected:   ${expected}`,
        `Found:      ${JSON.stringify(item[key])}`,
      ]));
    }
  };
  expect("amount", (v) => typeof v === "number" && v > 0, "a positive number, e.g. 200 or 0.5");
  expect("unit", (v) => typeof v === "string", "text, e.g. g, ml, tsp, clove");
  expect("note", (v) => typeof v === "string", "text, e.g. finely chopped");
  expect("scale", (v) => typeof v === "boolean", "true or false");
  return problems;
}

function validateIngredients(file, ingredients) {
  const missing = problem("Missing field", file, [
    `Field:    ingredients`,
    `Expected: a list of ingredients (or groups of them) with at least one item.`,
  ]);
  if (ingredients === undefined || ingredients === null) return [missing];
  if (Array.isArray(ingredients)) {
    if (ingredients.length === 0) return [missing];
    if (ingredients.some((item) => item && typeof item === "object" && !("name" in item) && Object.values(item).every(Array.isArray))) {
      return [problem("Mixed ingredient shapes", file, [
        `A plain list and groups can't be mixed. Either list all items directly,`,
        `or put every item under a group name (e.g. Batter:, To serve:).`,
      ])];
    }
    return ingredients.flatMap((item, i) => validateIngredient(file, item, `ingredient #${i + 1}`));
  }
  if (isGrouped(ingredients)) {
    const problems = [];
    let count = 0;
    for (const [group, items] of Object.entries(ingredients)) {
      if (!Array.isArray(items)) {
        problems.push(problem("Mixed ingredient shapes", file, [
          `Group:    ${group}`,
          `Expected: a list of items under each group name. A plain list and groups`,
          `          can't be mixed in one recipe.`,
        ]));
        continue;
      }
      count += items.length;
      items.forEach((item, i) => problems.push(...validateIngredient(file, item, `${group}, item #${i + 1}`)));
    }
    return count === 0 && problems.length === 0 ? [missing] : problems;
  }
  return [problem('Wrong type for "ingredients"', file, [
    `Expected: a list of ingredients or groups of them.`,
    `Found:    ${describeType(ingredients)}`,
  ])];
}

function validateServings(file, servings) {
  if (servings === undefined) {
    return [problem("Missing field", file, [
      `Field:    servings`,
      `Expected: for example`,
      `            servings:`,
      `              amount: 4`,
      `              unit: servings`,
    ])];
  }
  if (servings === null || typeof servings !== "object" || Array.isArray(servings)) {
    return [problem('Wrong type for "servings"', file, [`Expected: amount and unit on their own lines.`])];
  }
  const problems = [];
  if (!Number.isInteger(servings.amount) || servings.amount < 1) {
    problems.push(problem(servings.amount === undefined ? "Missing field" : "Wrong type for field", file, [
      `Field:    servings.amount`,
      `Expected: a positive whole number, e.g. 4`,
      ...(servings.amount === undefined ? [] : [`Found:    ${JSON.stringify(servings.amount)}`]),
    ]));
  }
  if (typeof servings.unit !== "string" || !servings.unit.trim()) {
    problems.push(problem("Missing field", file, [
      `Field:    servings.unit`,
      `Expected: what one portion is, in plural form: servings, waffles, glasses`,
    ]));
  }
  for (const key of ["unitSingular", "note"]) {
    if (servings[key] !== undefined && typeof servings[key] !== "string") {
      problems.push(problem("Wrong type for field", file, [`Field:    servings.${key}`, `Expected: text`]));
    }
  }
  return problems;
}

function validatePhotos(file, slug, data) {
  const problems = [];
  const folder = path.join(PHOTOS_DIR, slug) + "/";
  const check = (field, name) => {
    if (typeof name !== "string" || !name.trim()) {
      problems.push(problem(`Wrong type for "${field}"`, file, [`Field:    ${field}`, `Expected: a file name, e.g. ${slug}.jpg`]));
    } else if (!existsSync(photoPath(slug, name))) {
      problems.push(problem("Missing photo", file, [
        `Field:     ${field}`,
        `File:      ${name}`,
        `Looked in: ${folder}`,
      ]));
    }
  };
  if (data.image !== undefined) check("image", data.image);
  if (data.gallery !== undefined) {
    if (!Array.isArray(data.gallery)) {
      problems.push(problem('Wrong type for "gallery"', file, [`Expected: a list of items with file (and optional caption).`]));
    } else {
      data.gallery.forEach((item, i) => {
        if (!item || typeof item !== "object") {
          problems.push(problem('Wrong type for "gallery"', file, [`Item #${i + 1} needs at least a file: field.`]));
          return;
        }
        check(`gallery #${i + 1} file`, item.file);
        if (item.caption !== undefined && typeof item.caption !== "string") {
          problems.push(problem("Wrong type for field", file, [`Field:    gallery #${i + 1} caption`, `Expected: text`]));
        }
      });
    }
  }
  return problems;
}

function validateRecipe(file, slug, data) {
  const problems = [];
  if ("permalink" in data) {
    problems.push(problem("Permalink not allowed", file, [
      `Recipe URLs come only from the file name (${`/recipes/${slug}/`}),`,
      `so bookmarks and planner entries keep working. Remove the permalink line;`,
      `rename the file only if the URL really has to change.`,
    ]));
  }
  if (typeof data.title !== "string" || !data.title.trim()) {
    problems.push(problem("Missing field", file, [`Field:    title`, `Expected: the name of the dish`]));
  }
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    problems.push(problem(data.categories === undefined ? "Missing field" : 'Wrong type for "categories"', file, [
      `Field:    categories`,
      `Expected: at least one category, e.g. categories: [Breakfast]`,
    ]));
  } else {
    problems.push(...validateTerms(file, data, "categories", findCategory, unknownCategoryMessage));
  }
  problems.push(...validateTerms(file, data, "tags", findTag, unknownTagMessage));
  problems.push(...validateServings(file, data.servings));
  problems.push(...validateIngredients(file, data.ingredients));
  for (const key of ["description", "imagePosition"]) {
    if (data[key] !== undefined && typeof data[key] !== "string") {
      problems.push(problem("Wrong type for field", file, [`Field:    ${key}`, `Expected: text`]));
    }
  }
  if (data.date !== undefined && !(data.date instanceof Date) && isNaN(Date.parse(data.date))) {
    problems.push(problem("Wrong type for field", file, [`Field:    date`, `Expected: a date like 2026-09-26`]));
  }
  problems.push(...validatePhotos(file, slug, data));
  const unknown = Object.keys(data).filter((key) => !RECIPE_FIELDS.includes(key) && key !== "permalink");
  for (const key of unknown) {
    problems.push(problem("Unknown field", file, [
      `Field:    ${key}`,
      `Allowed:  ${RECIPE_FIELDS.join(", ")}`,
    ]));
  }
  return problems;
}

/**
 * Validate all recipes. Returns { problems, info } where problems are formatted
 * error blocks and info lists recipes that still need a photo or a method.
 */
export function validateRecipes(dir = RECIPES_DIR) {
  const problems = [];
  const withoutPhoto = [];
  const withoutMethod = [];
  const files = readdirSync(dir).filter((name) => name.endsWith(".md")).sort();
  for (const name of files) {
    const file = path.posix.join(dir, name);
    const slug = name.replace(/\.md$/, "");
    let parsed;
    try {
      parsed = matter(readFileSync(file, "utf8"));
    } catch (error) {
      // js-yaml's message includes the line, column and a snippet of the broken spot
      problems.push(problem("Unreadable frontmatter", file, String(error.message).split("\n")));
      continue;
    }
    problems.push(...validateRecipe(file, slug, parsed.data));
    if (!parsed.data.image) withoutPhoto.push(slug);
    if (!hasMethod(parsed.content)) withoutMethod.push(slug);
  }
  return { problems, info: { count: files.length, withoutPhoto, withoutMethod } };
}

export function formatInfo({ count, withoutPhoto, withoutMethod }) {
  const lines = [cyan(`ℹ Recipe Book: ${count} recipes`)];
  if (withoutPhoto.length) lines.push(`  Still need a photo (${withoutPhoto.length}): ${withoutPhoto.join(", ")}`);
  if (withoutMethod.length) lines.push(`  Still need a method (${withoutMethod.length}): ${withoutMethod.join(", ")}`);
  return lines.join("\n");
}

export function formatProblems(problems) {
  const header = red(`\nRecipe validation failed with ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n`);
  return header + "\n" + problems.join("\n\n" + dim("─".repeat(60)) + "\n\n") + "\n";
}

export const warn = yellow;
