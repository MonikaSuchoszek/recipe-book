// Home page: the "This week" card shows tonight's dinner and which days are planned.
import { formatWeekday, mondayOf, toISO, today, weekDays } from "./dates.js";
import { getEntry, getWeek } from "./planner-storage.js";

const card = document.querySelector("[data-week-card]");

if (card) {
  const title = card.querySelector("[data-week-title]");
  const sub = card.querySelector("[data-week-sub]");
  const dots = card.querySelector("[data-week-days]");
  const todayIso = toISO(today());
  const week = getWeek(mondayOf(today()));
  const planned = Object.keys(week).length;
  const tonight = getEntry(todayIso);

  if (tonight) {
    title.textContent = `Tonight: ${tonight.title}`;
    sub.textContent = `${planned} of 7 dinners planned this week`;
  } else if (planned) {
    title.textContent = "This week's dinners";
    sub.textContent = `${planned} of 7 planned · nothing yet for tonight`;
  }
  dots.innerHTML = weekDays(mondayOf(today()))
    .map((date) => {
      const iso = toISO(date);
      const classes = [week[iso] && "is-planned", iso === todayIso && "is-today"].filter(Boolean).join(" ");
      return `<span class="${classes}" title="${formatWeekday(date)}"></span>`;
    })
    .join("");
}
