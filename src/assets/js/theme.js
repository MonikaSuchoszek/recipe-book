// Footer appearance toggle: System, Light or Dark, remembered on this device.
const KEY = "recipeBook.theme";
const root = document.documentElement;

function save(theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice still applies to this page view
  }
}

for (const control of document.querySelectorAll("[data-appearance]")) {
  const current = root.getAttribute("data-theme") || "system";
  const selected = control.querySelector(`input[value="${current}"]`);
  if (selected) selected.checked = true;
  control.addEventListener("change", (event) => {
    const theme = event.target.value;
    root.setAttribute("data-theme", theme);
    save(theme);
  });
}
