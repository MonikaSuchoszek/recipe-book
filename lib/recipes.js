// Shapes raw recipe frontmatter into the structure the templates use.
// Assumes the data passed validation (lib/validate-recipes.js).
import { existsSync } from "node:fs";
import path from "node:path";
import { findCategory, findTag, taxonomy } from "./taxonomy.js";
import { formatAmount } from "../src/assets/js/quantity.js";
import { withPrefix } from "./paths.js";

export const RECIPES_DIR = "src/recipes";
export const PHOTOS_DIR = "src/assets/images/recipes";
export const ILLUSTRATIONS_DIR = "src/assets/illustrations";

export const INGREDIENT_FIELDS = ["name", "amount", "unit", "note", "scale"];

export const isGrouped = (ingredients) =>
  ingredients !== null && typeof ingredients === "object" && !Array.isArray(ingredients);

/** Plain and grouped ingredient lists become one list; each item knows its group. */
export function normalizeIngredients(ingredients) {
  const groups = isGrouped(ingredients) ? Object.entries(ingredients) : [["", ingredients]];
  return groups.flatMap(([group, items]) =>
    items.map((item) => {
      const scales = item.scale !== false && typeof item.amount === "number";
      const shown = formatAmount(item.amount, item.unit);
      return {
        group,
        name: String(item.name),
        amount: item.amount ?? null,
        unit: item.unit ?? "",
        note: item.note ?? "",
        scale: scales,
        display: { amount: shown.text, unit: shown.unit },
      };
    }),
  );
}

/** Group the normalised list again for rendering, keeping the written order. */
export function groupIngredients(items) {
  const groups = [];
  for (const item of items) {
    let group = groups.at(-1);
    if (!group || group.name !== item.group) {
      group = { name: item.group, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export function normalizeServings(servings) {
  return {
    amount: servings.amount,
    unit: servings.unit,
    unitSingular: servings.unitSingular ?? servings.unit,
    note: servings.note ?? "",
  };
}

/** A recipe without a photo shows its first category's illustration (or plate.svg). */
export function placeholderFor(categories) {
  const file = categories[0]?.illustration;
  if (file && existsSync(path.join(ILLUSTRATIONS_DIR, file))) return file;
  return "plate.svg";
}

export function hasMethod(body) {
  return /^\s*(\d+\.|[-*])\s+\S/m.test(body ?? "");
}

export function resolveTerms(data) {
  const categories = (data.categories ?? []).map(findCategory).filter(Boolean);
  const tags = (data.tags ?? []).map(findTag).filter(Boolean);
  // Tags are shown in the order of the definition file, grouped the same way as the filters
  const order = new Map(taxonomy.tags.map((tag, index) => [tag.slug, index]));
  tags.sort((a, b) => order.get(a.slug) - order.get(b.slug));
  return { categories, tags };
}

export const photoPath = (slug, file) => path.join(PHOTOS_DIR, slug, file);

/** Main photo, or the placeholder illustration when the recipe has no photo yet. */
export function recipeImageInfo(data, slug, categories) {
  if (data.image) {
    return { placeholder: false, slug, file: data.image, position: data.imagePosition ?? "center" };
  }
  const illustration = placeholderFor(categories);
  return {
    placeholder: true,
    illustration,
    src: withPrefix(`/assets/illustrations/${illustration}`),
    position: "center",
  };
}
