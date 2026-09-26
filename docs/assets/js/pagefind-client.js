// One search engine for the whole site: the search page and the planner's
// dish picker both use the Pagefind index through this module.
import { base } from "./ui.js";

let loading = null;

/** Loads Pagefind on first use. Rejects when the index hasn't been built. */
export function getPagefind() {
  loading ??= import(`${base}pagefind/pagefind.js`).then(async (pagefind) => {
    await pagefind.options({ baseUrl: base, excerptLength: 16 });
    pagefind.init();
    // Filter counts in search responses stay empty until the filter index is loaded
    await pagefind.filters();
    return pagefind;
  });
  return loading;
}

/**
 * Search recipes. `filters` maps a Pagefind filter name to a list of values
 * (any of them may match). Returns { results: [{ slug, url, excerpt }], filters }.
 */
const toPagefindFilters = (filters) =>
  Object.fromEntries(
    Object.entries(filters)
      .filter(([, values]) => values.length)
      .map(([name, values]) => [name, { any: values }]),
  );

export async function searchRecipes(query, filters = {}, { limit = 60 } = {}) {
  const pagefind = await getPagefind();
  const active = toPagefindFilters(filters);
  const response = await pagefind.debouncedSearch(query || null, { filters: active }, 120);
  if (response === null) return null; // superseded by a newer search
  const data = await Promise.all(response.results.slice(0, limit).map((result) => result.data()));
  return {
    results: data.map((item) => ({
      slug: item.meta.slug,
      url: item.url,
      excerpt: item.excerpt,
    })),
    filters: response.filters,
    total: response.results.length,
  };
}

/**
 * Facet counts: for every filter group, how many recipes each value would give
 * together with the query and the selections in the other groups.
 */
export async function facetCounts(query, filters = {}) {
  const pagefind = await getPagefind();
  const run = async (activeFilters) =>
    (await pagefind.search(query || null, { filters: toPagefindFilters(activeFilters) })).filters;
  const base = await run(filters);
  const counts = { ...base };
  await Promise.all(
    Object.keys(filters)
      .filter((name) => filters[name].length)
      .map(async (name) => {
        const { [name]: _ignored, ...others } = filters;
        counts[name] = (await run(others))[name] ?? {};
      }),
  );
  return counts;
}

/** Counts per filter value over all recipes. */
export async function allFilterCounts() {
  const pagefind = await getPagefind();
  return pagefind.filters();
}
