// Footer appearance toggle: each click cycles System → Light → Dark, remembered on this device.
const KEY = "recipeBook.theme";
const THEMES = ["system", "light", "dark"];
const LABELS = { system: "System", light: "Light", dark: "Dark" };
const root = document.documentElement;

function save(theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice still applies to this page view
  }
}

const nextTheme = (theme) => THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

function describe(button, theme) {
  const next = nextTheme(theme);
  button.setAttribute("aria-label", `Mode: ${LABELS[theme]}`);
  button.title = `Mode: ${LABELS[theme]} (click for ${LABELS[next]})`;
}

for (const button of document.querySelectorAll("[data-appearance]")) {
  describe(button, root.getAttribute("data-theme") || "system");
  button.addEventListener("click", () => {
    const theme = nextTheme(root.getAttribute("data-theme") || "system");
    root.setAttribute("data-theme", theme);
    save(theme);
    describe(button, theme);
  });
}
