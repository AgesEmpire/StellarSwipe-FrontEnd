import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const theme = read("lib/theme.ts");
const layout = read("app/layout.tsx");
const toggle = read("components/ThemeToggle.tsx");
const store = read("store/useThemeStore.ts");

assert(theme.includes("THEME_STORAGE_KEY"), "theme storage key is centralized");
assert(theme.includes("themeInitScript"), "first-paint script is exported");
assert(theme.includes("applyThemeToDocument"), "DOM theme application is shared");
assert(theme.includes("getInitialTheme"), "client store can read first-paint theme");
assert(
  /classList\.remove\("light", "dark"\)/.test(theme),
  "theme script removes stale theme classes"
);
assert(
  /classList\.add\(theme\)/.test(theme),
  "theme script applies the resolved theme class"
);
assert(
  /style\.colorScheme = theme/.test(theme),
  "theme script sets color-scheme before paint"
);
assert(
  /dataset\.theme = theme/.test(theme),
  "theme script exposes data-theme before paint"
);
assert(
  /__STELLAR_THEME__/.test(theme),
  "theme script exposes the resolved theme to hydration"
);
assert(
  /storedTheme === "dark" \|\| storedTheme === "light"/.test(theme),
  "theme script validates persisted theme values"
);
assert(
  /matchMedia\("\(prefers-color-scheme: dark\)"\)/.test(theme),
  "theme script falls back to system preference"
);

assert(
  layout.includes("themeInitScript") &&
    layout.includes('__html: themeInitScript'),
  "layout uses the shared first-paint theme script"
);
assert(
  layout.includes("suppressHydrationWarning"),
  "html element suppresses expected theme-class hydration differences"
);
assert(
  toggle.includes("applyThemeToDocument"),
  "theme toggle reuses shared DOM theme application"
);
assert(
  store.includes("getInitialTheme"),
  "theme store initializes from the first-paint resolved theme"
);

console.log("first-paint theme guard verified");
