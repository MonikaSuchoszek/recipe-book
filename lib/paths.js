// The site is published at https://monikasuchoszek.github.io/recipe-book/, so every URL needs this prefix
export const PATH_PREFIX = "/recipe-book/";

/** Same result as Eleventy's url filter, for code that runs outside templates. */
export const withPrefix = (path) => PATH_PREFIX + path.replace(/^\//, "");
