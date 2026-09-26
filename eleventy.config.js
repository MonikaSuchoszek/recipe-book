import { contrastWarnings, taxonomy } from "./lib/taxonomy.js";
import { formatInfo, formatProblems, validateRecipes, warn } from "./lib/validate-recipes.js";
import { renderFavicons } from "./lib/images.js";
import { icon } from "./lib/icons.js";
import { PATH_PREFIX, withPrefix } from "./lib/paths.js";
import site from "./src/_data/site.js";

const FONT_FILES = ["latin", "latin-ext"].flatMap((subset) =>
  [400, 700, 800].map((weight) => `nunito-${subset}-${weight}-normal.woff2`),
);

export default function (eleventyConfig) {
  // GitHub Pages runs Jekyll unless this file is present in the published folder
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });
  eleventyConfig.addPassthroughCopy("src/assets/illustrations");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/css/*.css");
  for (const file of FONT_FILES) {
    eleventyConfig.addPassthroughCopy({ [`node_modules/@fontsource/nunito/files/${file}`]: `assets/fonts/${file}` });
  }

  eleventyConfig.addWatchTarget("lib/");
  eleventyConfig.setServerOptions({ port: 8080 });

  // Validate every recipe before rendering; a broken recipe never reaches the site
  eleventyConfig.on("eleventy.before", async () => {
    const { problems, info } = validateRecipes();
    if (problems.length) {
      console.error(formatProblems(problems));
      const error = new Error(`Recipe validation failed (${problems.length} problem${problems.length === 1 ? "" : "s"}), see above.`);
      error.stack = error.message; // the report above says everything; a stack trace would only add noise
      throw error;
    }
    for (const message of contrastWarnings()) console.warn(warn(`⚠ Taxonomy colour: ${message}`));
    console.log(formatInfo(info));
    await renderFavicons();
  });

  eleventyConfig.addGlobalData("terms", taxonomy);

  eleventyConfig.addCollection("recipes", (api) =>
    api
      .getFilteredByGlob("src/recipes/*.md")
      .sort((a, b) => a.data.title.localeCompare(b.data.title, "en", { sensitivity: "base" })),
  );
  eleventyConfig.addCollection("recentRecipes", (api) =>
    api
      .getFilteredByGlob("src/recipes/*.md")
      .sort((a, b) => b.date - a.date || a.data.title.localeCompare(b.data.title)),
  );

  eleventyConfig.addFilter("inCategory", (recipes, slug) =>
    recipes.filter((recipe) => recipe.data.recipe.categories.some((category) => category.slug === slug)),
  );
  eleventyConfig.addFilter("pluralUnit", (count, singular, plural) => (count === 1 ? singular : plural));
  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString().slice(0, 10));
  // Accepts paths with or without the prefix: page.url has none, image URLs already include it
  eleventyConfig.addFilter("absoluteUrl", (path) =>
    new URL(path.startsWith(PATH_PREFIX) ? path : withPrefix(path), site.url).href,
  );

  eleventyConfig.addShortcode("icon", icon);
}

export const config = {
  dir: {
    input: "src",
    output: "docs", // GitHub Pages can publish straight from /docs on the main branch
  },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
  pathPrefix: PATH_PREFIX,
};
