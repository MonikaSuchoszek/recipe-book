// Colour maths for the taxonomy: derived shades and WCAG contrast checks.

const WHITE = "#FFFFFF";
const BLACK = "#000000";

// Surfaces the derived shades are mixed into, matching the tokens in main.css
export const LIGHT_SURFACE = "#FFFFFF";
export const DARK_SURFACE = "#1B231E";
export const DARK_TEXT = "#121814";

function toRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function isHex(value) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/** Mix `base` towards `other`; weight 0 keeps base, 1 gives other. */
export function mix(base, other, weight) {
  const a = toRgb(base);
  const b = toRgb(other);
  return toHex(a.map((c, i) => c + (b[i] - c) * weight));
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Step `color` towards `target` until it reaches AA contrast against `against`. */
function untilReadable(color, target, against, minimum = 4.5) {
  for (let weight = 0; weight <= 1; weight += 0.02) {
    const candidate = mix(color, target, weight);
    if (contrast(candidate, against) >= minimum) return candidate;
  }
  return target;
}

/**
 * The shades every term gets. Components only use these custom properties:
 * accent (the colour itself), tint (badge and tile surfaces), ink (text on tint),
 * and solid / on-solid for filled buttons that need readable text.
 */
export function deriveShades(accent) {
  const light = {
    accent,
    tint: mix(accent, LIGHT_SURFACE, 0.86),
    ink: mix(accent, BLACK, 0.58),
    solid: untilReadable(accent, BLACK, WHITE),
    onSolid: WHITE,
  };
  const dark = {
    accent: mix(accent, WHITE, 0.12),
    tint: mix(DARK_SURFACE, accent, 0.2),
    ink: mix(accent, WHITE, 0.62),
    solid: untilReadable(accent, WHITE, DARK_TEXT),
    onSolid: DARK_TEXT,
  };
  return { light, dark };
}

/** Suggest a darker accent that would make the light ink/tint pair pass. */
export function suggestDarker(accent) {
  for (let weight = 0.05; weight <= 0.6; weight += 0.05) {
    const candidate = mix(accent, BLACK, weight);
    const { light, dark } = deriveShades(candidate);
    if (contrast(light.ink, light.tint) >= 4.5 && contrast(dark.ink, dark.tint) >= 4.5) return candidate;
  }
  return mix(accent, BLACK, 0.6);
}
