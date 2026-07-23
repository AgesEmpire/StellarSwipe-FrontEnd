/**
 * Simple i18n system with JSON-based locale files
 */
import * as Sentry from "@sentry/nextjs";

export type Locale = "en" | "ng" | "es" | "fr" | "de" | "zh" | "ar";

const LOCALE_KEY = "stellarswipe:locale";
const DEFAULT_LOCALE: Locale = "en";
const SUPPORTED_LOCALES: Locale[] = ["en", "ng", "es", "fr", "de", "zh", "ar"];

/** RTL locales — consumers should apply dir="rtl" when active */
export const RTL_LOCALES: Locale[] = ["ar"];

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

/** BCP-47 tags for Intl APIs */
export const LOCALE_BCP47: Record<Locale, string> = {
  en: "en-US",
  ng: "yo-NG",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN",
  ar: "ar-SA",
};

/** Format a number according to the current locale */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(LOCALE_BCP47[currentLocale], options).format(
    value
  );
}

/** Format a date according to the current locale */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(LOCALE_BCP47[currentLocale], options).format(
    new Date(date)
  );
}

/** Format currency according to the current locale */
export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat(LOCALE_BCP47[currentLocale], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

let currentLocale: Locale = DEFAULT_LOCALE;
let translations: Record<string, any> = {};
let fallbackTranslations: Record<string, any> = {};

/**
 * Get nested value from object using dot notation
 * e.g., "signals.buy_signal" -> translations.signals.buy_signal
 */
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current?.[key] === undefined) return undefined;
    current = current[key];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Load locale JSON file
 */
async function loadLocale(locale: Locale): Promise<Record<string, any>> {
  try {
    const response = await fetch(`/locales/${locale}.json`);
    if (!response.ok) throw new Error(`Failed to load ${locale} locale`);
    return await response.json();
  } catch (err) {
    Sentry.captureException(err);
    return {};
  }
}

/**
 * Initialize i18n system
 */
export async function initI18n() {
  if (typeof window === "undefined") return;

  // Load stored locale or use default
  const stored = localStorage.getItem(LOCALE_KEY);
  currentLocale =
    stored && SUPPORTED_LOCALES.includes(stored as Locale)
      ? (stored as Locale)
      : DEFAULT_LOCALE;

  // Load fallback (English) first
  fallbackTranslations = await loadLocale(DEFAULT_LOCALE);

  // Load current locale if not English
  if (currentLocale !== DEFAULT_LOCALE) {
    translations = await loadLocale(currentLocale);
  } else {
    translations = fallbackTranslations;
  }
}

/**
 * Set current locale
 */
export async function setLocale(locale: Locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn(`Unsupported locale: ${locale}`);
    }
    return;
  }

  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCALE_KEY, locale);
  }

  // Load translations
  if (locale === DEFAULT_LOCALE) {
    translations = fallbackTranslations;
  } else {
    translations = await loadLocale(locale);
  }
}

/**
 * Translate a key with fallback to English.
 * In development, logs a clear warning with the active locale when a key is missing.
 */
export function t(key: string): string {
  // Try current locale first
  let value = getNestedValue(translations, key);
  if (value) return value;

  // Fall back to English
  value = getNestedValue(fallbackTranslations, key);
  if (value) {
    if (
      process.env.NODE_ENV === "development" &&
      currentLocale !== DEFAULT_LOCALE
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[i18n] Missing translation key "${key}" for locale "${currentLocale}". Falling back to "${DEFAULT_LOCALE}".`
      );
    }
    return value;
  }

  // Key missing from all locales
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.warn(
      `[i18n] Missing translation key "${key}" in locale "${currentLocale}" (no fallback found).`
    );
  }
  return key;
}

/**
 * Get current locale
 */
export function getCurrentLocale(): Locale {
  return currentLocale;
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): Locale[] {
  return SUPPORTED_LOCALES;
}
