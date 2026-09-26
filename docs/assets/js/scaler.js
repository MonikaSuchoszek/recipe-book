// Portion scaling on the recipe page. The page is rendered with the original
// amounts; this script rescales them and keeps ?portions= in the URL.
import { formatAmount, scaleAmount } from "./quantity.js";
import { enhanceStepper } from "./ui.js";

const root = document.querySelector("[data-portions]");

if (root) {
  const baseServings = Number(root.dataset.base);
  const unit = root.dataset.unit;
  const unitSingular = root.dataset.unitSingular || unit;
  const reset = root.querySelector("[data-reset]");
  const ingredients = [...document.querySelectorAll(".ingredient[data-amount]")].map((element) => ({
    element,
    amount: Number(element.dataset.amount),
    unit: element.dataset.unit,
    qty: element.querySelector(".ingredient__qty"),
  }));

  const requested = parseInt(new URLSearchParams(location.search).get("portions"), 10);
  const initial = requested >= 1 && requested <= 99 ? requested : baseServings;

  function render(portions, { animate = true } = {}) {
    for (const item of ingredients) {
      const { text, unit: shownUnit } = formatAmount(scaleAmount(item.amount, baseServings, portions), item.unit);
      const html = `<span class="ingredient__amount">${text}</span>${shownUnit ? ` <span class="ingredient__unit">${shownUnit}</span>` : ""}`;
      if (item.qty.innerHTML !== html) {
        item.qty.innerHTML = html;
        if (animate) {
          item.element.classList.remove("is-changed");
          void item.element.offsetWidth; // restart the highlight animation
          item.element.classList.add("is-changed");
        }
      }
    }
    reset.hidden = portions === baseServings;

    const url = new URL(location.href);
    if (portions === baseServings) url.searchParams.delete("portions");
    else url.searchParams.set("portions", portions);
    history.replaceState(history.state, "", url);
    document.dispatchEvent(new CustomEvent("portions:change", { detail: portions }));
  }

  const stepper = enhanceStepper(root.querySelector(".stepper"), {
    value: initial,
    unitLabel: (count) => (count === 1 ? unitSingular : unit),
    onChange: (portions) => render(portions),
  });

  reset.addEventListener("click", () => {
    stepper.set(baseServings, { silent: true });
    render(baseServings);
  });

  render(initial, { animate: false });
}

/** Portions currently chosen on the page (the planner dialog starts from this). */
export function currentPortions() {
  const input = document.querySelector("[data-portions] input");
  return input ? parseInt(input.value, 10) : undefined;
}
