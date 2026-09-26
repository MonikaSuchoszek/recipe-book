// Search page: Pagefind search with category and tag-group filters.
// State lives in the URL (?q=lentils&diet=vegan&category=soup) so searches can be shared.
import { icon } from "./icons.js";
import { allFilterCounts, facetCounts, searchRecipes } from "./pagefind-client.js";
import { escapeHtml, openSheet, setupSheet } from "./ui.js";

const root = document.querySelector("[data-search]");
const recipes = JSON.parse(document.getElementById("recipe-index").textContent);
const filterDefs = JSON.parse(document.getElementById("filter-index").textContent);
const recipeBySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]));

const els = {
  form: root.querySelector("[data-search-form]"),
  input: root.querySelector("[data-search-input]"),
  clear: root.querySelector("[data-search-clear]"),
  summary: root.querySelector("[data-search-summary]"),
  filterButton: root.querySelector("[data-open-filters]"),
  filterCount: root.querySelector("[data-filter-count]"),
  active: root.querySelector("[data-active-filters]"),
  sheet: document.getElementById("filters-sheet"),
  filters: root.querySelector("[data-filters]"),
  showResults: root.querySelector("[data-show-results]"),
  results: root.querySelector("[data-results]"),
  noResults: root.querySelector("[data-no-results]"),
  error: root.querySelector("[data-search-error]"),
};

const state = { query: "", selected: new Map(filterDefs.map((def) => [def.param, new Set()])) };

/* ---------- URL ---------- */

function readUrl() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") ?? "";
  for (const def of filterDefs) {
    const known = new Set(def.terms.map((term) => term.slug));
    const values = params.getAll(def.param).flatMap((value) => value.split(","));
    state.selected.set(def.param, new Set(values.filter((value) => known.has(value))));
  }
}

function writeUrl() {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  for (const [param, values] of state.selected) for (const value of values) params.append(param, value);
  const query = params.toString();
  history.replaceState(history.state, "", `${location.pathname}${query ? `?${query}` : ""}`);
}

/* ---------- Filters ---------- */

const activeCount = () => [...state.selected.values()].reduce((sum, values) => sum + values.size, 0);

function renderFilterPanel() {
  els.filters.innerHTML = filterDefs.map((def) => `
    <fieldset>
      <legend>${escapeHtml(def.label)}</legend>
      <ul class="chips">
        ${def.terms.map((term) => `
          <li class="filter-chip ${escapeHtml(term.className)}">
            <label>
              <input type="checkbox" data-param="${escapeHtml(def.param)}" value="${escapeHtml(term.slug)}"
                ${state.selected.get(def.param).has(term.slug) ? "checked" : ""}>
              <span>${escapeHtml(term.name)} <small data-count></small></span>
            </label>
          </li>`).join("")}
      </ul>
    </fieldset>`).join("");
}

function syncFilterInputs() {
  for (const input of els.filters.querySelectorAll("input[data-param]")) {
    input.checked = state.selected.get(input.dataset.param).has(input.value);
  }
}

/** Show how many recipes each filter value would give; values with none are disabled. */
function renderCounts(counts) {
  for (const def of filterDefs) {
    const values = counts?.[def.filter] ?? {};
    for (const term of def.terms) {
      const input = els.filters.querySelector(`input[data-param="${def.param}"][value="${term.slug}"]`);
      const count = values[term.name] ?? 0;
      input.nextElementSibling.querySelector("[data-count]").textContent = counts ? count : "";
      // Values that would give no results are hidden, so every visible chip leads somewhere
      input.closest(".filter-chip").hidden = Boolean(counts) && count === 0 && !input.checked;
    }
  }
  // Hide groups that have no recipes at all (yet)
  for (const fieldset of els.filters.querySelectorAll("fieldset")) {
    fieldset.hidden = [...fieldset.querySelectorAll(".filter-chip")].every((chip) => chip.hidden);
  }
}

function renderActiveFilters() {
  const chips = [];
  for (const def of filterDefs) {
    for (const slug of state.selected.get(def.param)) {
      const term = def.terms.find((candidate) => candidate.slug === slug);
      chips.push(`
        <li><button type="button" class="chip ${escapeHtml(term.className)}" data-remove-filter="${escapeHtml(def.param)}" data-value="${escapeHtml(slug)}"
          aria-label="Remove filter ${escapeHtml(term.name)}">${escapeHtml(term.name)}${icon("x")}</button></li>`);
    }
  }
  els.active.innerHTML = chips.join("");
  const count = activeCount();
  els.filterCount.hidden = count === 0;
  els.filterCount.textContent = count;
}

/* ---------- Results ---------- */

function card(recipe, excerpt) {
  const tags = recipe.tags.slice(0, 2)
    .map((tag) => `<li class="chip ${escapeHtml(tag.className)}">${escapeHtml(tag.name)}</li>`).join("");
  const style = recipe.imagePosition && recipe.imagePosition !== "center" ? ` style="object-position:${escapeHtml(recipe.imagePosition)}"` : "";
  return `
    <article class="card ${escapeHtml(recipe.category.className)}">
      <a class="card__link" href="${escapeHtml(recipe.url)}">
        <div class="card__media"><img src="${escapeHtml(recipe.image)}" alt="" width="400" height="300" loading="lazy"${style}></div>
        <div class="card__body">
          <p class="card__category">${escapeHtml(recipe.category.name)}</p>
          <h2 class="card__title">${escapeHtml(recipe.title)}</h2>
          ${excerpt ? `<p class="card__excerpt">${excerpt}</p>` : recipe.description ? `<p class="card__excerpt">${escapeHtml(recipe.description)}</p>` : ""}
          ${tags ? `<ul class="chips chips--small">${tags}</ul>` : ""}
        </div>
      </a>
    </article>`;
}

function renderResults(items) {
  els.results.innerHTML = items.map(({ recipe, excerpt }) => card(recipe, excerpt)).join("");
  els.noResults.hidden = items.length > 0;
  const count = items.length;
  const noun = count === 1 ? "recipe" : "recipes";
  const query = state.query.trim();
  els.summary.textContent = query ? `${count} ${noun} for “${query}”` : `${count} ${noun}`;
  els.showResults.textContent = count ? `Show ${count} ${noun}` : "No recipes match";
}

/** Filter selections in the shape Pagefind expects: filter name → list of values. */
function pagefindFilters() {
  const filters = {};
  for (const def of filterDefs) {
    const names = [...state.selected.get(def.param)].map((slug) => def.terms.find((t) => t.slug === slug).name);
    if (names.length) filters[def.filter] = names;
  }
  return filters;
}

/** Used when the Pagefind index isn't available (e.g. dev server before the first build). */
function localSearch() {
  const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  return recipes
    .filter((recipe) => {
      const text = `${recipe.title} ${recipe.description}`.toLowerCase();
      if (!words.every((word) => text.includes(word))) return false;
      return filterDefs.every((def) => {
        const selected = state.selected.get(def.param);
        if (!selected.size) return true;
        const classes = def.param === "category" ? [recipe.category.className] : recipe.tags.map((tag) => tag.className);
        return def.terms.some((term) => selected.has(term.slug) && classes.includes(term.className));
      });
    })
    .map((recipe) => ({ recipe }));
}

let baseCounts = null;
let latest = 0;

async function update() {
  const request = ++latest;
  const isStale = () => request !== latest;
  writeUrl();
  renderActiveFilters();
  els.clear.hidden = !state.query;
  const browsing = !state.query.trim() && activeCount() === 0;
  els.results.setAttribute("aria-busy", "true");
  try {
    if (browsing) {
      renderResults(recipes.map((recipe) => ({ recipe })));
      baseCounts ??= await allFilterCounts();
      if (isStale()) return;
      renderCounts(baseCounts);
    } else {
      const response = await searchRecipes(state.query.trim(), pagefindFilters());
      if (response === null || isStale()) return; // a newer search is on its way
      renderResults(
        response.results
          .filter((hit) => recipeBySlug.has(hit.slug))
          .map((hit) => ({ recipe: recipeBySlug.get(hit.slug), excerpt: state.query.trim() ? hit.excerpt : "" })),
      );
      const counts = await facetCounts(state.query.trim(), pagefindFilters());
      if (isStale()) return;
      renderCounts(counts);
    }
    els.error.hidden = true;
  } catch {
    if (isStale()) return;
    renderResults(browsing ? recipes.map((recipe) => ({ recipe })) : localSearch());
    renderCounts(null);
    els.error.textContent = "Full-text search is unavailable right now, so only titles and descriptions are searched.";
    els.error.hidden = false;
  } finally {
    els.results.setAttribute("aria-busy", "false");
  }
}

/* ---------- Events ---------- */

els.input.addEventListener("input", () => {
  state.query = els.input.value;
  update();
});
els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  els.input.blur(); // closes the phone keyboard so the results are visible
});
els.clear.addEventListener("click", () => {
  els.input.value = "";
  state.query = "";
  update();
  els.input.focus();
});
els.filters.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-param]");
  if (!input) return;
  const values = state.selected.get(input.dataset.param);
  if (input.checked) values.add(input.value);
  else values.delete(input.value);
  update();
});
els.active.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-remove-filter]");
  if (!chip) return;
  state.selected.get(chip.dataset.removeFilter).delete(chip.dataset.value);
  syncFilterInputs();
  update();
});
const clearFilters = () => {
  for (const values of state.selected.values()) values.clear();
  syncFilterInputs();
};
root.querySelector("[data-clear-filters]").addEventListener("click", () => {
  clearFilters();
  update();
});
root.querySelector("[data-clear-all]").addEventListener("click", () => {
  clearFilters();
  els.input.value = "";
  state.query = "";
  update();
});
setupSheet(els.sheet);
els.filterButton.addEventListener("click", () => openSheet(els.sheet));

readUrl();
els.input.value = state.query;
renderFilterPanel();
update();
