// The site is published at https://beyond-the-known.eu/cookbook/, so every URL needs this prefix
export const PATH_PREFIX = "/cookbook/";

/** Same result as Eleventy's url filter, for code that runs outside templates. */
export const withPrefix = (path) => PATH_PREFIX + path.replace(/^\//, "");
