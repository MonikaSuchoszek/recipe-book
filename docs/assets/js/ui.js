// Small shared UI pieces: bottom sheets, the portion stepper and toasts.
import { icon } from "./icons.js";

export const base = document.documentElement.dataset.base || "/";
export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const hasFinePointer = () => matchMedia("(pointer: fine)").matches;

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------- Sheets ---------- */

const isSheetLayout = () => !matchMedia("(min-width: 640px)").matches;

/** Close with the slide-out animation, then really close the dialog. */
export function closeSheet(dialog) {
  if (!dialog.open || dialog.classList.contains("is-closing")) return;
  if (prefersReducedMotion()) {
    dialog.close();
    return;
  }
  dialog.classList.add("is-closing");
  const panel = dialog.querySelector("[data-sheet-panel]");
  const finish = () => {
    dialog.classList.remove("is-closing");
    panel.style.transform = "";
    dialog.close();
  };
  panel.addEventListener("animationend", finish, { once: true });
  setTimeout(finish, 300); // in case the animation never runs
}

/** Drag the grip or header down to dismiss, like a native bottom sheet. */
function enableSwipeToClose(dialog) {
  const panel = dialog.querySelector("[data-sheet-panel]");
  const handles = dialog.querySelectorAll(".sheet__grip, .sheet__header");
  let start = null;
  const onMove = (event) => {
    if (!start) return;
    const dy = Math.max(0, event.clientY - start.y);
    panel.style.transform = `translateY(${dy}px)`;
  };
  const onEnd = (event) => {
    if (!start) return;
    const dy = event.clientY - start.y;
    const speed = dy / (performance.now() - start.time);
    start = null;
    panel.style.transition = "transform .2s ease";
    if (dy > 110 || (dy > 30 && speed > 0.6)) {
      panel.style.transform = `translateY(100%)`;
      setTimeout(() => {
        panel.style.transition = "";
        panel.style.transform = "";
        dialog.close();
      }, 200);
    } else {
      panel.style.transform = "";
      setTimeout(() => (panel.style.transition = ""), 200);
    }
  };
  for (const handle of handles) {
    handle.addEventListener("pointerdown", (event) => {
      if (!isSheetLayout() || event.target.closest("button, input, a")) return;
      start = { y: event.clientY, time: performance.now() };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
    handle.style.touchAction = "none";
  }
}

/** Wire up close buttons, Escape, backdrop taps and swipe-down once per dialog. */
export function setupSheet(dialog) {
  if (dialog.dataset.ready) return dialog;
  dialog.dataset.ready = "true";
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSheet(dialog);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-sheet-close]")) closeSheet(dialog);
  });
  enableSwipeToClose(dialog);
  return dialog;
}

export function openSheet(dialog) {
  setupSheet(dialog);
  if (!dialog.open) dialog.showModal();
  return dialog;
}

/* ---------- Stepper ---------- */

/**
 * Enhance stepper markup (see partials/portion-counter.njk): − and + buttons,
 * typed input, press and hold to repeat. Calls onChange(value) on every change.
 */
export function enhanceStepper(root, { value, min = 1, max = 99, unitLabel, onChange }) {
  const input = root.querySelector("input");
  const label = root.querySelector("[data-unit-label]");
  const [minus, plus] = root.querySelectorAll("[data-step]");
  let current = value;

  const render = () => {
    input.value = current;
    minus.disabled = current <= min;
    plus.disabled = current >= max;
    if (label && unitLabel) label.textContent = unitLabel(current);
  };
  const set = (next, { silent = false } = {}) => {
    const clamped = Math.min(max, Math.max(min, Math.round(next)));
    if (Number.isNaN(clamped)) return render();
    const changed = clamped !== current;
    current = clamped;
    render();
    if (changed && !silent) onChange?.(current);
  };

  // A tap steps once (via click, which also covers the keyboard); holding repeats faster and faster
  for (const button of [minus, plus]) {
    const step = Number(button.dataset.step);
    let timer = null;
    let held = false;
    const stop = () => clearTimeout(timer);
    const repeat = (delay) => {
      timer = setTimeout(() => {
        held = true;
        set(current + step);
        if (current > min && current < max) repeat(Math.max(60, delay * 0.8));
      }, delay);
    };
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      held = false;
      repeat(450);
    });
    for (const type of ["pointerup", "pointerleave", "pointercancel"]) button.addEventListener(type, stop);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      if (held) held = false;
      else set(current + step);
    });
  }

  input.addEventListener("input", () => {
    const typed = parseInt(input.value, 10);
    if (typed >= min && typed <= max && typed !== current) {
      current = typed;
      minus.disabled = current <= min;
      plus.disabled = current >= max;
      if (label && unitLabel) label.textContent = unitLabel(current);
      onChange?.(current);
    }
  });
  input.addEventListener("change", () => set(parseInt(input.value, 10) || current));
  input.addEventListener("focus", () => input.select());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") input.blur();
  });

  render();
  return { get value() { return current; }, set };
}

export function stepperMarkup({ value, unit, name }) {
  return `
    <div class="stepper" role="group" aria-label="${escapeHtml(name)}">
      <button type="button" class="stepper__btn" data-step="-1" aria-label="Fewer ${escapeHtml(unit)}">${icon("minus")}</button>
      <label class="stepper__value">
        <input class="stepper__input" type="number" inputmode="numeric" pattern="[0-9]*" min="1" max="99" value="${value}" aria-label="${escapeHtml(name)}">
        <span class="stepper__unit" data-unit-label></span>
      </label>
      <button type="button" class="stepper__btn" data-step="1" aria-label="More ${escapeHtml(unit)}">${icon("plus")}</button>
    </div>`;
}

export const servingsLabel = (servings, count) => (count === 1 ? servings.unitSingular : servings.unit);

/* ---------- Toasts ---------- */

let toastTimer;

/**
 * Show a short message at the bottom. `action` is either
 * { label, onClick } (e.g. Undo) or { label, href } (a link).
 */
export function toast(message, { action, duration = 5000 } = {}) {
  const region = document.getElementById("toaster");
  if (!region) return;
  clearTimeout(toastTimer);
  region.replaceChildren();
  const element = document.createElement("div");
  element.className = "toast";
  element.innerHTML = `<p class="toast__text">${escapeHtml(message)}</p>`;
  if (action?.href) {
    element.insertAdjacentHTML("beforeend", `<a class="toast__action" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`);
  } else if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast__action";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      action.onClick();
      dismiss();
    });
    element.append(button);
  }
  const dismiss = () => {
    element.classList.add("is-leaving");
    setTimeout(() => element.remove(), 200);
  };
  region.append(element);
  // Pause while the pointer or focus is on the toast, so there is time to press Undo
  let remaining = duration;
  let started = Date.now();
  const schedule = () => {
    started = Date.now();
    toastTimer = setTimeout(dismiss, remaining);
  };
  element.addEventListener("pointerenter", () => {
    clearTimeout(toastTimer);
    remaining -= Date.now() - started;
  });
  element.addEventListener("pointerleave", schedule);
  schedule();
}
