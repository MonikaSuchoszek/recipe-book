// Planner page: one week (Mon to Sun), one dinner per day.
import {
  addDays, formatDay, formatRange, formatWeekday, fromISO, mondayOf, toISO, today, weekDays, weekName,
} from "./dates.js";
import { icon } from "./icons.js";
import { openPicker } from "./planner-dialog.js";
import {
  getEntry, getProblem, getWeek, oldestMonday, removeEntry, restore, setPortions, subscribe,
} from "./planner-storage.js";
import {
  base, closeSheet, enhanceStepper, escapeHtml, openSheet, prefersReducedMotion, stepperMarkup, toast,
} from "./ui.js";

const root = document.querySelector("[data-planner]");
const recipes = JSON.parse(document.getElementById("recipe-index").textContent);
const recipeBySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]));

const els = {
  notice: root.querySelector("[data-storage-notice]"),
  name: root.querySelector("[data-week-name]"),
  range: root.querySelector("[data-week-range]"),
  prev: root.querySelector("[data-week-prev]"),
  next: root.querySelector("[data-week-next]"),
  todayButton: root.querySelector("[data-week-today]"),
  progressText: root.querySelector("[data-progress-text]"),
  progressBar: root.querySelector("[data-progress-bar]"),
  empty: root.querySelector("[data-planner-empty]"),
  days: root.querySelector("[data-days]"),
  weekbar: root.querySelector(".weekbar"),
};
const daySheet = document.getElementById("portions-sheet");

const currentMonday = () => mondayOf(today());
let monday = initialWeek();
let highlight = new Set();

function initialWeek() {
  const requested = new URLSearchParams(location.search).get("week");
  if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)) {
    const week = mondayOf(fromISO(requested));
    if (week >= oldestMonday()) return week;
  }
  return currentMonday();
}

/* ---------- Rendering ---------- */

function recipeUrl(entry) {
  return `${base}recipes/${encodeURIComponent(entry.slug)}/?portions=${entry.portions}`;
}

function portionsText(entry) {
  const servings = recipeBySlug.get(entry.slug)?.servings;
  if (!servings) return `${entry.portions} ${entry.portions === 1 ? "portion" : "portions"}`;
  return `${entry.portions} ${entry.portions === 1 ? servings.unitSingular : servings.unit}`;
}

function entryMarkup(iso, entry, date) {
  const categoryClass = recipeBySlug.get(entry.slug)?.category.className ?? "";
  const url = recipeUrl(entry);
  return `
    <div class="entry ${escapeHtml(categoryClass)}${highlight.has(iso) ? " is-new" : ""}">
      <a class="entry__media" href="${escapeHtml(url)}" tabindex="-1" aria-hidden="true">
        <img class="entry__thumb" src="${escapeHtml(entry.image || `${base}assets/illustrations/plate.svg`)}" alt="" width="72" height="54" loading="lazy">
      </a>
      <div class="entry__body">
        <a class="entry__title" href="${escapeHtml(url)}">${escapeHtml(entry.title)}</a>
        <button type="button" class="entry__portions" data-day-sheet="${iso}"
          aria-label="${escapeHtml(portionsText(entry))} on ${escapeHtml(formatDay(date))}. Change">
          ${icon("users")}<span>${escapeHtml(portionsText(entry))}</span>${icon("chevron-down")}
        </button>
      </div>
      <button type="button" class="icon-button entry__remove" data-remove="${iso}"
        aria-label="Remove ${escapeHtml(entry.title)} from ${escapeHtml(formatDay(date))}">${icon("x")}</button>
    </div>`;
}

function dayLabel(date) {
  const offset = Math.round((date - today()) / 86400000);
  return offset === 0 ? "Today" : "";
}

function dayMarkup(date, week) {
  const iso = toISO(date);
  const entry = week[iso];
  const label = dayLabel(date);
  const classes = ["day", iso === toISO(today()) && "is-today", date < today() && "is-past"].filter(Boolean).join(" ");
  const content = entry
    ? entryMarkup(iso, entry, date)
    : `<button type="button" class="day__add" data-add="${iso}" aria-label="Add dinner for ${escapeHtml(formatDay(date))}">
         ${icon("plus")}<span>Add dinner</span>
       </button>`;
  return `
    <li class="${classes}">
      <div class="day__date" aria-hidden="true">
        <span class="day__weekday">${escapeHtml(formatWeekday(date))}</span>
        <span class="day__num">${date.getDate()}</span>
        ${label ? `<span class="day__label">${label}</span>` : ""}
      </div>
      ${content}
    </li>`;
}

function render({ direction } = {}) {
  const week = getWeek(monday);
  const planned = Object.keys(week).length;
  const isCurrent = +monday === +currentMonday();

  els.name.textContent = weekName(monday);
  els.range.textContent = formatRange(monday);
  els.prev.disabled = monday <= oldestMonday();
  els.todayButton.hidden = isCurrent;
  els.progressText.textContent = planned === 7 ? "All 7 dinners planned" : `${planned} of 7 dinners planned`;
  els.progressBar.style.width = `${(planned / 7) * 100}%`;
  els.empty.hidden = planned > 0;
  els.days.innerHTML = weekDays(monday).map((date) => dayMarkup(date, week)).join("");

  if (direction && !prefersReducedMotion()) {
    els.days.classList.remove("is-sliding-next", "is-sliding-prev");
    void els.days.offsetWidth;
    els.days.classList.add(direction > 0 ? "is-sliding-next" : "is-sliding-prev");
  }
  highlight = new Set();
}

function goToWeek(target) {
  if (target < oldestMonday()) return;
  const direction = Math.sign(target - monday);
  monday = target;
  const url = new URL(location.href);
  if (+monday === +currentMonday()) url.searchParams.delete("week");
  else url.searchParams.set("week", toISO(monday));
  history.replaceState(history.state, "", url);
  render({ direction });
}

/* ---------- Day sheet: portions, change dish, remove ---------- */

function openDaySheet(iso) {
  const entry = getEntry(iso);
  if (!entry) return;
  const date = fromISO(iso);
  const servings = recipeBySlug.get(entry.slug)?.servings ?? { unit: "portions", unitSingular: "portion" };
  daySheet.querySelector(".sheet__title").textContent = `Dinner on ${formatDay(date)}`;
  const body = daySheet.querySelector("[data-portions-body]");
  body.innerHTML = `
    <div class="plan-dish">
      <img src="${escapeHtml(entry.image)}" alt="" width="64" height="48">
      <strong>${escapeHtml(entry.title)}</strong>
    </div>
    <section class="plan-section" aria-labelledby="day-portions-title">
      <div class="plan-section__head"><h3 class="plan-section__title" id="day-portions-title">Portions</h3></div>
      <div class="plan-portions">${stepperMarkup({ value: entry.portions, unit: servings.unit, name: "Portions" })}</div>
    </section>
    <div class="day-actions">
      <button type="button" class="button button--soft" data-change-dish>${icon("swap")}<span>Change dish</span></button>
      <button type="button" class="button button--danger" data-remove-day>${icon("trash")}<span>Remove</span></button>
    </div>`;
  enhanceStepper(body.querySelector(".stepper"), {
    value: entry.portions,
    unitLabel: (count) => (count === 1 ? servings.unitSingular : servings.unit),
    onChange: (portions) => setPortions(iso, portions),
  });
  body.querySelector("[data-change-dish]").addEventListener("click", () => {
    daySheet.close();
    openPicker({ day: iso, recipes, onDone: onAdded });
  });
  body.querySelector("[data-remove-day]").addEventListener("click", () => {
    closeSheet(daySheet);
    remove(iso);
  });
  openSheet(daySheet);
}

function remove(iso) {
  const entry = getEntry(iso);
  const before = removeEntry(iso);
  toast(`Removed ${entry.title} from ${formatDay(fromISO(iso))}`, {
    action: { label: "Undo", onClick: () => restore(before) },
  });
}

function onAdded({ dates }) {
  highlight = new Set(dates);
  const target = mondayOf(fromISO(dates[0]));
  if (+target !== +monday) goToWeek(target);
  else render();
}

/* ---------- Events ---------- */

els.prev.addEventListener("click", () => goToWeek(addDays(monday, -7)));
els.next.addEventListener("click", () => goToWeek(addDays(monday, 7)));
els.todayButton.addEventListener("click", () => goToWeek(currentMonday()));

els.days.addEventListener("click", (event) => {
  const add = event.target.closest("[data-add]");
  if (add) return openPicker({ day: add.dataset.add, recipes, onDone: onAdded });
  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) return remove(removeButton.dataset.remove);
  const sheetButton = event.target.closest("[data-day-sheet]");
  if (sheetButton) return openDaySheet(sheetButton.dataset.daySheet);
});

// Swipe sideways over the days to change week
let touchStart = null;
els.days.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  touchStart = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY, time: Date.now() } : null;
}, { passive: true });
els.days.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const quick = Date.now() - touchStart.time < 600;
  touchStart = null;
  if (quick && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
    goToWeek(addDays(monday, dx < 0 ? 7 : -7));
  }
}, { passive: true });

// Arrow keys change week when focus is not in a text field
document.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, dialog") || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "ArrowLeft" && !els.prev.disabled) goToWeek(addDays(monday, -7));
  if (event.key === "ArrowRight") goToWeek(addDays(monday, 7));
});

// A soft shadow under the week bar once it sticks to the top
new IntersectionObserver(([entry]) => els.weekbar.classList.toggle("is-stuck", entry.intersectionRatio < 1), {
  threshold: [1],
  rootMargin: "-1px 0px 0px 0px",
}).observe(els.weekbar);

function showProblem(message) {
  els.notice.textContent = message;
  els.notice.hidden = !message;
}
document.addEventListener("planner:problem", (event) => showProblem(event.detail));

subscribe(() => render());
render();
showProblem(getProblem());

// Coming back to the tab on a new day moves "today" along
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") render();
});
