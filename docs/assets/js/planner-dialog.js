// The "Add to planner" sheet, shared by the recipe page and the planner page.
// Two views in one dialog:
//   picker: find a dish (recent picks, all recipes, live Pagefind search)
//   plan:   choose portions and one or more days, then save
import {
  addDays, formatDay, formatRange, fromISO, mondayOf, toISO, today, weekDays, weekName,
} from "./dates.js";
import { icon } from "./icons.js";
import { searchRecipes } from "./pagefind-client.js";
import { getWeek, oldestMonday, recentSlugs, restore, setEntries } from "./planner-storage.js";
import {
  closeSheet, enhanceStepper, escapeHtml, hasFinePointer, openSheet, servingsLabel, stepperMarkup, toast,
} from "./ui.js";

const dialog = document.getElementById("plan-dialog");
const titleEl = dialog.querySelector(".sheet__title");
const backButton = dialog.querySelector("[data-sheet-back]");
const body = dialog.querySelector("[data-sheet-body]");
const footer = dialog.querySelector("[data-sheet-footer]");

let picker = null; // { day, recipes, query, onDone }
let plan = null; // { recipe, portions, selected, monday, confirming, onDone }

titleEl.tabIndex = -1;

dialog.addEventListener("close", () => {
  picker = null;
  plan = null;
  body.replaceChildren();
});

backButton.addEventListener("click", () => {
  if (picker) showPicker();
});

function showView(name, title) {
  dialog.dataset.view = name;
  dialog.classList.toggle("sheet--tall", name === "picker");
  titleEl.textContent = title;
  backButton.hidden = !(name === "plan" && picker);
  footer.hidden = name !== "plan";
  body.scrollTop = 0;
}

/* ---------- Dish picker ---------- */

const normalise = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function servingsText(recipe) {
  return `${recipe.servings.amount} ${servingsLabel(recipe.servings, recipe.servings.amount)}`;
}

function pickerItem(recipe, meta) {
  return `
    <li>
      <button type="button" class="picker__item ${escapeHtml(recipe.category.className)}" data-slug="${escapeHtml(recipe.slug)}">
        <img class="picker__thumb" src="${escapeHtml(recipe.image)}" alt="" loading="lazy" width="56" height="42">
        <span class="picker__text">
          <span class="picker__title">${escapeHtml(recipe.title)}</span>
          <span class="picker__meta">${meta ?? `${escapeHtml(recipe.category.name)} · ${escapeHtml(servingsText(recipe))}`}</span>
        </span>
        ${icon("chevron-right")}
      </button>
    </li>`;
}

function renderBrowse(results) {
  const bySlug = new Map(picker.recipes.map((recipe) => [recipe.slug, recipe]));
  const recent = recentSlugs(4).map((slug) => bySlug.get(slug)).filter(Boolean);
  results.innerHTML = `
    ${recent.length ? `
      <h3 class="picker__heading">Recently planned</h3>
      <ul class="picker__list">${recent.map((recipe) => pickerItem(recipe)).join("")}</ul>` : ""}
    <h3 class="picker__heading">All recipes</h3>
    <ul class="picker__list">${picker.recipes.map((recipe) => pickerItem(recipe)).join("")}</ul>`;
}

function renderMatches(results, matches) {
  if (!matches.length) {
    results.innerHTML = `
      <div class="picker__empty">
        <img src="${document.documentElement.dataset.base}assets/illustrations/no-results.svg" alt="" width="400" height="300">
        <strong>No recipes found</strong>
        <span>Try fewer or different words.</span>
      </div>`;
    return;
  }
  results.innerHTML = `
    <h3 class="picker__heading">${matches.length} ${matches.length === 1 ? "match" : "matches"}</h3>
    <ul class="picker__list">${matches.map(({ recipe, excerpt }) => pickerItem(recipe, excerpt)).join("")}</ul>`;
}

/** Title match without the search index (used when Pagefind isn't available). */
function localMatches(query) {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  return picker.recipes
    .filter((recipe) => {
      const text = normalise(`${recipe.title} ${recipe.description} ${recipe.category.name}`);
      return words.every((word) => text.includes(word));
    })
    .map((recipe) => ({ recipe }));
}

async function runSearch(results) {
  const query = picker.query.trim();
  if (!query) return renderBrowse(results);
  const bySlug = new Map(picker.recipes.map((recipe) => [recipe.slug, recipe]));
  try {
    const response = await searchRecipes(query);
    if (response === null || picker?.query.trim() !== query) return;
    renderMatches(
      results,
      response.results
        .filter((hit) => bySlug.has(hit.slug))
        .map((hit) => ({ recipe: bySlug.get(hit.slug), excerpt: hit.excerpt })),
    );
  } catch {
    renderMatches(results, localMatches(query));
  }
}

function showPicker() {
  const day = fromISO(picker.day);
  showView("picker", `Dinner for ${formatDay(day)}`);
  body.innerHTML = `
    <div class="picker__search">
      <div class="searchbar" role="search">
        ${icon("search", "searchbar__icon")}
        <input class="searchbar__input" type="search" placeholder="Search dishes or ingredients" aria-label="Search dishes or ingredients"
          autocomplete="off" enterkeyhint="search" value="${escapeHtml(picker.query)}">
        <button type="button" class="icon-button searchbar__clear" aria-label="Clear search" ${picker.query ? "" : "hidden"}>${icon("x")}</button>
      </div>
    </div>
    <div data-picker-results></div>`;
  const input = body.querySelector("input");
  const clear = body.querySelector(".searchbar__clear");
  const results = body.querySelector("[data-picker-results]");

  input.addEventListener("input", () => {
    picker.query = input.value;
    clear.hidden = !input.value;
    runSearch(results);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    results.querySelector("[data-slug]")?.click();
  });
  clear.addEventListener("click", () => {
    input.value = "";
    picker.query = "";
    clear.hidden = true;
    renderBrowse(results);
    input.focus();
  });
  results.addEventListener("click", (event) => {
    const item = event.target.closest("[data-slug]");
    if (!item) return;
    const recipe = picker.recipes.find((candidate) => candidate.slug === item.dataset.slug);
    showPlan({
      recipe,
      portions: recipe.servings.amount,
      preselect: [picker.day],
      onDone: picker.onDone,
    });
  });

  runSearch(results);
  // On phones the keyboard would cover half the list, so only desktop focuses the field
  if (hasFinePointer()) input.focus();
  else titleEl.focus({ preventScroll: true });
}

/**
 * Open the dish picker for one day of the planner.
 * `recipes` is the recipe index embedded in the page.
 */
export function openPicker({ day, recipes, onDone }) {
  picker = { day, recipes, query: "", onDone };
  plan = null;
  openSheet(dialog);
  showPicker();
}

/* ---------- Portions and days ---------- */

function dayRow(date, week) {
  const iso = toISO(date);
  const existing = week[iso];
  const selected = plan.selected.has(iso);
  const sameDish = existing?.slug === plan.recipe.slug;
  const replacing = selected && existing && !sameDish;
  const isToday = iso === toISO(today());
  const past = date < today();
  let status = `<span class="daypick__current is-free">Free</span>`;
  if (existing) {
    const label = sameDish ? (selected ? "Already planned · portions will be updated" : "Already planned") : replacing ? `Replaces ${existing.title}` : existing.title;
    status = `<span class="daypick__current">${escapeHtml(label)}</span>`;
  }
  const row = `
    <li>
      <button type="button" class="daypick__option${past ? " is-past" : ""}${replacing ? " is-replacing" : ""}"
        data-day="${iso}" aria-pressed="${selected}">
        <span class="daypick__check">${icon("check")}</span>
        <span class="daypick__day">
          <span class="daypick__date">${escapeHtml(formatDay(date))}</span>
          ${status}
        </span>
        ${isToday ? `<span class="daypick__today">Today</span>` : ""}
      </button>
    </li>`;
  if (plan.confirming !== iso) return row;
  return row + `
    <li class="daypick__confirm" role="group" aria-label="Replace ${escapeHtml(existing.title)}?">
      <p>Replace ${escapeHtml(existing.title)} on ${escapeHtml(formatDay(date))}?</p>
      <div>
        <button type="button" class="button button--ghost" data-confirm="keep">Keep it</button>
        <button type="button" class="button button--primary" data-confirm="replace">Replace</button>
      </div>
    </li>`;
}

function renderDays() {
  const week = getWeek(plan.monday);
  const list = body.querySelector("[data-daypick]");
  list.innerHTML = weekDays(plan.monday).map((date) => dayRow(date, week)).join("");
  body.querySelector("[data-week-label]").innerHTML =
    `<strong>${escapeHtml(weekName(plan.monday))}</strong><small>${escapeHtml(formatRange(plan.monday))}</small>`;
  body.querySelector("[data-week-prev]").disabled = plan.monday <= oldestMonday();
  renderSaveButton();
}

function renderSaveButton() {
  const save = footer.querySelector("[data-save]");
  const count = plan.selected.size;
  save.disabled = count === 0;
  save.innerHTML = count === 0
    ? `<span>Pick one or more days</span>`
    : `${icon("check")}<span>${count === 1 ? `Add to ${escapeHtml(formatDay(fromISO([...plan.selected][0])))}` : `Add to ${count} days`}</span>`;
}

function toggleDay(iso) {
  const existing = getWeek(plan.monday)[iso];
  if (plan.selected.has(iso)) {
    plan.selected.delete(iso);
    plan.confirming = null;
  } else if (existing && existing.slug !== plan.recipe.slug) {
    // A day that already has another dish asks before replacing it
    plan.confirming = plan.confirming === iso ? null : iso;
  } else {
    plan.selected.add(iso);
    plan.confirming = null;
  }
  renderDays();
  const focusTarget = plan.confirming
    ? body.querySelector('[data-confirm="replace"]')
    : body.querySelector(`[data-day="${iso}"]`);
  focusTarget?.focus({ preventScroll: false });
}

function showPlan({ recipe, portions, preselect = [], onDone }) {
  const firstDay = preselect[0] ? fromISO(preselect[0]) : today();
  plan = {
    recipe,
    portions,
    selected: new Set(preselect),
    monday: mondayOf(firstDay),
    confirming: null,
    onDone,
  };
  showView("plan", "Add to planner");
  body.innerHTML = `
    <div class="plan-dish">
      <img src="${escapeHtml(recipe.image)}" alt="" width="64" height="48">
      <strong>${escapeHtml(recipe.title)}</strong>
    </div>
    <section class="plan-section" aria-labelledby="plan-portions-title">
      <div class="plan-section__head"><h3 class="plan-section__title" id="plan-portions-title">Portions</h3></div>
      <div class="plan-portions">${stepperMarkup({ value: portions, unit: recipe.servings.unit, name: "Portions" })}</div>
    </section>
    <section class="plan-section" aria-labelledby="plan-days-title">
      <div class="plan-section__head">
        <h3 class="plan-section__title" id="plan-days-title">Days</h3>
        <div class="weekpick">
          <button type="button" class="icon-button" data-week-prev aria-label="Previous week">${icon("chevron-left")}</button>
          <span class="weekpick__label" data-week-label aria-live="polite"></span>
          <button type="button" class="icon-button" data-week-next aria-label="Next week">${icon("chevron-right")}</button>
        </div>
      </div>
      <ul class="daypick" data-daypick aria-labelledby="plan-days-title"></ul>
    </section>`;
  footer.innerHTML = `<button type="button" class="button button--primary button--block" data-save></button>`;

  enhanceStepper(body.querySelector(".stepper"), {
    value: portions,
    unitLabel: (count) => servingsLabel(recipe.servings, count),
    onChange: (value) => (plan.portions = value),
  });
  body.querySelector("[data-week-prev]").addEventListener("click", () => {
    plan.monday = addDays(plan.monday, -7);
    plan.confirming = null;
    renderDays();
  });
  body.querySelector("[data-week-next]").addEventListener("click", () => {
    plan.monday = addDays(plan.monday, 7);
    plan.confirming = null;
    renderDays();
  });
  body.querySelector("[data-daypick]").addEventListener("click", (event) => {
    const confirm = event.target.closest("[data-confirm]");
    if (confirm) {
      const iso = plan.confirming;
      plan.confirming = null;
      if (confirm.dataset.confirm === "replace") plan.selected.add(iso);
      renderDays();
      body.querySelector(`[data-day="${iso}"]`)?.focus();
      return;
    }
    const option = event.target.closest("[data-day]");
    if (option) toggleDay(option.dataset.day);
  });
  footer.querySelector("[data-save]").addEventListener("click", save);

  renderDays();
  titleEl.focus({ preventScroll: true });
}

function save() {
  const dates = [...plan.selected].sort();
  const entry = {
    slug: plan.recipe.slug,
    title: plan.recipe.title,
    image: plan.recipe.image,
    portions: plan.portions,
  };
  const before = setEntries(dates, entry);
  const onDone = plan.onDone;
  closeSheet(dialog);
  const where = dates.length === 1 ? formatDay(fromISO(dates[0])) : `${dates.length} days`;
  toast(`Added to ${where}`, { action: { label: "Undo", onClick: () => restore(before) } });
  onDone?.({ dates, entry });
}

/** Open the portions-and-days view directly, for a known recipe. */
export function openPlanDialog({ recipe, portions, preselect, onDone }) {
  picker = null;
  openSheet(dialog);
  showPlan({ recipe, portions, preselect, onDone });
}
