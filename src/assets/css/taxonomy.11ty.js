// Generates taxonomy.css: one class per category and tag that sets the colour
// custom properties components use (--accent, --tint, --ink, --solid, --on-solid).
import { taxonomy } from "../../../lib/taxonomy.js";

const pair = (light, dark) => `light-dark(${light}, ${dark})`;

function rule(term) {
  const { light, dark } = term.shades;
  return [
    `.${term.className} {`,
    `  --accent: ${pair(light.accent, dark.accent)};`,
    `  --tint: ${pair(light.tint, dark.tint)};`,
    `  --ink: ${pair(light.ink, dark.ink)};`,
    `  --solid: ${pair(light.solid, dark.solid)};`,
    `  --on-solid: ${pair(light.onSolid, dark.onSolid)};`,
    `}`,
  ].join("\n");
}

export default class {
  data() {
    return { permalink: "/assets/css/taxonomy.css", eleventyExcludeFromCollections: true };
  }

  render() {
    const header = "/* Generated from src/_data/taxonomy.js by src/assets/css/taxonomy.11ty.js. Do not edit. */";
    return [header, ...taxonomy.categories.map(rule), ...taxonomy.tags.map(rule)].join("\n\n") + "\n";
  }
}
