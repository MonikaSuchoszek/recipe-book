// Scaling and formatting of ingredient amounts.
// Shared by the build (original amounts) and the browser (scaled amounts),
// so both always render numbers the same way. Rules: SPEC.html, "Portion scaling".

const METRIC = {
  g: { base: "g", factor: 1, large: "kg" },
  kg: { base: "g", factor: 1000, large: "kg" },
  ml: { base: "ml", factor: 1, large: "l" },
  l: { base: "ml", factor: 1000, large: "l" },
};

// Units that are abbreviations never get a plural form
const ABBREVIATIONS = new Set(["g", "kg", "ml", "l", "tsp", "tbsp", "cm", "mm"]);
const IRREGULAR_PLURALS = { leaf: "leaves", loaf: "loaves", knife: "knives" };

const FRACTIONS = { 0: "", 0.25: "¼", 0.5: "½", 0.75: "¾" };

function trimDecimals(value, decimals) {
  return String(Number(value.toFixed(decimals)));
}

export function pluralize(word) {
  if (IRREGULAR_PLURALS[word]) return IRREGULAR_PLURALS[word];
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** Unit label for a displayed amount: "clove" at 1 or less, "cloves" above. */
export function unitLabel(unit, amount) {
  if (!unit) return "";
  if (ABBREVIATIONS.has(unit.toLowerCase()) || amount <= 1) return unit;
  return pluralize(unit);
}

function formatMetric(amount, metric) {
  let base = amount * metric.factor;
  base = base >= 100 ? Math.round(base / 5) * 5 : Math.round(base);
  if (base === 0) base = 1;
  if (base >= 1000) return { value: base / 1000, text: trimDecimals(base / 1000, 2), unit: metric.large };
  return { value: base, text: String(base), unit: metric.base };
}

function formatQuarters(amount) {
  let quarters = Math.round(amount * 4);
  if (quarters === 0) quarters = 1;
  const whole = Math.floor(quarters / 4);
  const fraction = FRACTIONS[(quarters % 4) / 4];
  return { value: quarters / 4, text: whole ? `${whole}${fraction}` : fraction };
}

/**
 * Format an amount in its unit, e.g. (1250, "g") → { text: "1.25", unit: "kg" }.
 * Returns an empty text when there is no amount ("to taste" items).
 */
export function formatAmount(amount, unit) {
  if (amount === undefined || amount === null || amount === "") return { text: "", unit: unit ?? "" };
  const metric = unit ? METRIC[unit.toLowerCase()] : undefined;
  if (metric) {
    const { text, unit: shown } = formatMetric(amount, metric);
    return { text, unit: shown };
  }
  const { value, text } = formatQuarters(amount);
  return { text, unit: unitLabel(unit ?? "", value) };
}

export function scaleAmount(amount, fromServings, toServings) {
  return (amount * toServings) / fromServings;
}
