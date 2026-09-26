// The only module that reads and writes the planner in localStorage.
// Storage errors (private browsing, storage full) never break the page:
// the planner keeps working in memory and a notice explains the problem.
import { addDays, mondayOf, toISO, today } from "./dates.js";

export const STORAGE_KEY = "recipeBook.planner.v1";
export const HISTORY_WEEKS = 8;
const VERSION = 1;

let state = null;
let problem = null;
const listeners = new Set();

const empty = () => ({ version: VERSION, days: {} });

function report(message) {
  problem = message;
  document.dispatchEvent(new CustomEvent("planner:problem", { detail: message }));
}

function isEntry(value) {
  return value && typeof value.slug === "string" && typeof value.title === "string";
}

function read() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    report("This browser doesn't allow saving (private browsing?), so the planner is only kept until you close this page.");
    return empty();
  }
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION || typeof parsed.days !== "object") return empty();
    const days = {};
    for (const [iso, entry] of Object.entries(parsed.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && isEntry(entry)) days[iso] = entry;
    }
    return { version: VERSION, days };
  } catch {
    report("The saved planner couldn't be read, so it starts empty.");
    return empty();
  }
}

function write() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    problem = null;
  } catch {
    report("The planner couldn't be saved (storage full or blocked). Changes are kept until you close this page.");
  }
}

function notify() {
  for (const listener of listeners) listener(state);
}

/** Monday of the oldest week that is kept (the 8 weeks before the current one). */
export const oldestMonday = () => addDays(mondayOf(today()), -7 * HISTORY_WEEKS);

function prune() {
  const oldest = toISO(oldestMonday());
  let removed = false;
  for (const iso of Object.keys(state.days)) {
    if (iso < oldest) {
      delete state.days[iso];
      removed = true;
    }
  }
  return removed;
}

function load() {
  if (!state) {
    state = read();
    if (prune()) write();
  }
  return state;
}

export const getProblem = () => problem;
export const getEntry = (iso) => load().days[iso] ?? null;

/** Map of ISO date → entry for the 7 days starting at `monday`. */
export function getWeek(monday) {
  const days = load().days;
  const week = {};
  for (let i = 0; i < 7; i++) {
    const iso = toISO(addDays(monday, i));
    if (days[iso]) week[iso] = days[iso];
  }
  return week;
}

/** Snapshot of the given days, for undo. */
const snapshot = (isoDates) => Object.fromEntries(isoDates.map((iso) => [iso, load().days[iso] ?? null]));

function change(isoDates, apply) {
  const before = snapshot(isoDates);
  apply(load().days);
  write();
  notify();
  return before;
}

/** Put the same dish on several days. Returns a snapshot for undo. */
export function setEntries(isoDates, entry) {
  return change(isoDates, (days) => {
    for (const iso of isoDates) days[iso] = { ...entry };
  });
}

export function removeEntry(iso) {
  return change([iso], (days) => {
    delete days[iso];
  });
}

export function setPortions(iso, portions) {
  return change([iso], (days) => {
    if (days[iso]) days[iso] = { ...days[iso], portions };
  });
}

/** Put back a snapshot taken by one of the changes above. */
export function restore(before) {
  change(Object.keys(before), (days) => {
    for (const [iso, entry] of Object.entries(before)) {
      if (entry) days[iso] = entry;
      else delete days[iso];
    }
  });
}

/** Dates (ISO) on which a recipe is planned, from today on. */
export function upcomingDates(slug) {
  const from = toISO(today());
  return Object.entries(load().days)
    .filter(([iso, entry]) => entry.slug === slug && iso >= from)
    .map(([iso]) => iso)
    .sort();
}

/** Most recently planned distinct recipes (by planned date, newest first). */
export function recentSlugs(limit = 4) {
  const seen = new Set();
  for (const [, entry] of Object.entries(load().days).sort(([a], [b]) => (a < b ? 1 : -1))) {
    seen.add(entry.slug);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Another tab changed the planner: reload and redraw
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = null;
  load();
  notify();
});

