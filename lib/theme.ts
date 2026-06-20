export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "stellar-theme";
export const DEFAULT_THEME: Theme = "dark";

declare global {
  interface Window {
    __STELLAR_THEME__?: Theme;
  }
}

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

function getSystemTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const item = window.localStorage.getItem(THEME_STORAGE_KEY);
    const storedTheme = item ? JSON.parse(item).state?.theme : null;
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  if (isTheme(window.__STELLAR_THEME__)) {
    return window.__STELLAR_THEME__;
  }

  return getStoredTheme() ?? getSystemTheme();
}

export function applyThemeToDocument(
  theme: Theme,
  root = document.documentElement
) {
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  root.dataset.theme = theme;

  if (typeof window !== "undefined") {
    window.__STELLAR_THEME__ = theme;
  }
}

export const themeInitScript = `
(function() {
  var theme = "${DEFAULT_THEME}";
  try {
    var item = localStorage.getItem("${THEME_STORAGE_KEY}");
    var parsed = item ? JSON.parse(item) : null;
    var storedTheme = parsed && parsed.state && parsed.state.theme;
    if (storedTheme === "dark" || storedTheme === "light") {
      theme = storedTheme;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    } else {
      theme = "light";
    }
  } catch (error) {
    try {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (systemError) {
      theme = "${DEFAULT_THEME}";
    }
  }

  var root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
  window.__STELLAR_THEME__ = theme;
})();
`;
