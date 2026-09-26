// Recipe page: "Add to planner" button and the "Planned for …" note.
import { openPlanDialog } from "./planner-dialog.js";
import { subscribe, upcomingDates } from "./planner-storage.js";
import { currentPortions } from "./scaler.js";
import { formatDayList, fromISO } from "./dates.js";
import { icon } from "./icons.js";
import { base, escapeHtml } from "./ui.js";

const article = document.querySelector("[data-recipe]");
const recipe = JSON.parse(article.dataset.recipe);
const button = document.querySelector("[data-add-to-planner]");
const note = document.querySelector("[data-planned-note]");

function renderNote() {
  const dates = upcomingDates(recipe.slug).map(fromISO);
  note.hidden = dates.length === 0;
  if (!dates.length) return;
  const shown = dates.slice(0, 3);
  const more = dates.length - shown.length;
  note.innerHTML = `${icon("calendar-check")}<span>Planned for ${escapeHtml(formatDayList(shown))}${more ? ` and ${more} more` : ""} · <a href="${base}planner/">View planner</a></span>`;
}

button.addEventListener("click", () => {
  openPlanDialog({ recipe, portions: currentPortions() ?? recipe.servings.amount });
});

subscribe(renderNote);
renderNote();
