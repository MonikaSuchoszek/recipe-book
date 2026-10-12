import path from "node:path";
import { contrastWarnings, taxonomy } from "./lib/taxonomy.js";
import { formatInfo, formatProblems, validateRecipes, warn } from "./lib/validate-recipes.js";
import { renderFavicons } from "./lib/images.js";
import { icon } from "./lib/icons.js";
import { PATH_PREFIX, withPrefix } from "./lib/paths.js";
import site from "./src/_data/site.js";

const SOURCE_LINK = /^([^:?#]+\.md)(#.*)?$/;

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

  // Content links to another page's source file (`[sauce](salted-caramel-sauce.md)`) so Eleventy
  // works out the final URL; a link to a file that doesn't exist fails the build instead of 404ing.
  // Done in the Markdown renderer, not as an HTML transform, which would re-serialise every page.
  let urlsByInputPath = {};
  eleventyConfig.on("eleventy.contentMap", ({ inputPathToUrl }) => (urlsByInputPath = inputPathToUrl));
  eleventyConfig.amendLibrary("md", (markdown) => {
    const renderDefault = markdown.renderer.rules.link_open ?? ((tokens, i, options, env, self) => self.renderToken(tokens, i, options));
    markdown.renderer.rules.link_open = (tokens, i, options, env, self) => {
      const [, file, fragment = ""] = tokens[i].attrGet("href").match(SOURCE_LINK) ?? [];
      if (file) {
        const inputPath = "./" + path.posix.join(path.posix.dirname(env.page.inputPath), file);
        const url = urlsByInputPath[inputPath]?.[0];
        if (!url) throw new Error(`Broken link in ${env.page.inputPath}: ${file} does not exist.`);
        tokens[i].attrSet("href", withPrefix(url) + fragment);
      }
      return renderDefault(tokens, i, options, env, self);
    };
  });

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
