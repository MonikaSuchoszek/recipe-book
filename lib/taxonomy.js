// Turns src/_data/taxonomy.js into lookup tables with slugs and derived colours.
// Used by the recipe validation, the recipe data cascade and taxonomy.css.
import slugify from "@sindresorhus/slugify";
import definition from "../src/_data/taxonomy.js";
import { contrast, deriveShades, isHex, suggestDarker } from "./colors.js";

export const matchKey = (name) => String(name).trim().toLowerCase();

function resolveColor(color, owner) {
  if (definition.palette[color]) return definition.palette[color];
  if (isHex(color)) return color.toUpperCase();
  throw new Error(
    `Taxonomy: "${owner}" uses color "${color}", which is neither a palette name ` +
      `(${Object.keys(definition.palette).join(", ")}) nor a hex value like "#2F9E6E".`,
  );
}

function makeTerm(kind, raw, extra) {
  const color = resolveColor(raw.color ?? extra.fallbackColor, raw.name);
  return {
    kind,
    name: raw.name,
    slug: raw.slug ?? slugify(raw.name),
    description: raw.description ?? "",
    color,
    shades: deriveShades(color),
    className: `${kind === "category" ? "cat" : "tag"}-${raw.slug ?? slugify(raw.name)}`,
    ...extra.fields,
  };
}

function assertUnique(terms, label) {
  const seen = new Map();
  for (const term of terms) {
    for (const [field, value] of [["name", matchKey(term.name)], ["slug", term.slug]]) {
      const key = `${field}:${value}`;
      if (seen.has(key)) {
        throw new Error(`Taxonomy: duplicate ${label} ${field} "${value}" in src/_data/taxonomy.js.`);
      }
      seen.set(key, term);
    }
  }
}

function buildTaxonomy() {
  const categories = definition.categories.map((raw) =>
    makeTerm("category", raw, {
      fields: { illustration: raw.illustration ?? "plate.svg" },
    }),
  );

  const tagGroups = definition.tagGroups.map((group) => {
    const groupColor = resolveColor(group.color, group.name);
    return {
      name: group.name,
      slug: slugify(group.name),
      color: groupColor,
      tags: group.tags.map((raw) =>
        makeTerm("tag", raw, { fallbackColor: group.color, fields: { group: group.name } }),
      ),
    };
  });
  const tags = tagGroups.flatMap((group) => group.tags);

  assertUnique(categories, "category");
  assertUnique(tags, "tag");

  return {
    palette: definition.palette,
    categories,
    tagGroups,
    tags,
    categoryByKey: new Map(categories.map((term) => [matchKey(term.name), term])),
    tagByKey: new Map(tags.map((term) => [matchKey(term.name), term])),
  };
}

export const taxonomy = buildTaxonomy();

export const findCategory = (name) => taxonomy.categoryByKey.get(matchKey(name));
export const findTag = (name) => taxonomy.tagByKey.get(matchKey(name));

/** Terms whose badge text would be hard to read, with a suggested replacement colour. */
export function contrastWarnings() {
  const warnings = [];
  for (const term of [...taxonomy.categories, ...taxonomy.tags]) {
    for (const theme of ["light", "dark"]) {
      const { ink, tint } = term.shades[theme];
      const ratio = contrast(ink, tint);
      if (ratio < 4.5) {
        warnings.push(
          `${term.kind} "${term.name}" (${theme} mode): badge contrast ${ratio.toFixed(2)}:1 is below 4.5:1. ` +
            `Try a darker colour such as "${suggestDarker(term.color)}".`,
        );
      }
    }
  }
  return warnings;
}
