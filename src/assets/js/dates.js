// Calendar helpers. Dates are local calendar days; weeks start on Monday.
const LOCALE = "en-GB";

const pad = (n) => String(n).padStart(2, "0");

export const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function fromISO(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export const mondayOf = (date) => addDays(date, -((date.getDay() + 6) % 7));

export const weekDays = (monday) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

const weekdayShort = new Intl.DateTimeFormat(LOCALE, { weekday: "short" });
const weekdayLong = new Intl.DateTimeFormat(LOCALE, { weekday: "long" });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });
const monthShort = new Intl.DateTimeFormat(LOCALE, { month: "short" });

export const formatWeekday = (date) => weekdayShort.format(date);
export const formatWeekdayLong = (date) => weekdayLong.format(date);
/** "Tue 29 Sep" */
export const formatDay = (date) => `${weekdayShort.format(date)} ${dayMonth.format(date)}`;

/** "28 Sep – 4 Oct", or "5 – 11 Oct" within one month */
export function formatRange(monday) {
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.getDate()} ${monthShort.format(sunday)}`;
  }
  return `${dayMonth.format(monday)} – ${dayMonth.format(sunday)}`;
}

/** "This week", "Next week", "Last week", "In 3 weeks", "2 weeks ago" */
export function weekName(monday, currentMonday = mondayOf(today())) {
  const offset = Math.round((monday - currentMonday) / (7 * 24 * 3600 * 1000));
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  if (offset === -1) return "Last week";
  return offset > 0 ? `In ${offset} weeks` : `${-offset} weeks ago`;
}

/** "Mon, Tue and Thu" for a short list of dates */
export function formatDayList(dates) {
  const names = dates.map((date) => formatDay(date));
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
