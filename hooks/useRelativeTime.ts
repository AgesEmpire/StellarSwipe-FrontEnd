import { useState, useEffect } from "react";

function getRelativeTime(date: Date, locale: string = "en"): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) {
    // Very recent — fall back to absolute timestamp
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;

  if (seconds < 60) {
    value = -seconds;
    unit = "second";
  } else {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      value = -minutes;
      unit = "minute";
    } else {
      const hours = Math.floor(minutes / 60);
      if (hours < 24) {
        value = -hours;
        unit = "hour";
      } else {
        const days = Math.floor(hours / 24);
        if (days < 30) {
          value = -days;
          unit = "day";
        } else {
          const months = Math.floor(days / 30);
          if (months < 12) {
            value = -months;
            unit = "month";
          } else {
            value = -Math.floor(months / 12);
            unit = "year";
          }
        }
      }
    }
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    return rtf.format(value, unit);
  } catch {
    // Fallback to absolute timestamp if localization fails
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }
}

function getUserLocale(): string {
  if (typeof navigator === "undefined") return "en";
  return navigator.language || "en";
}

export function useRelativeTime(date: Date): string {
  const locale = getUserLocale();
  const [label, setLabel] = useState(() => getRelativeTime(date, locale));

  useEffect(() => {
    setLabel(getRelativeTime(date, locale));
    const id = setInterval(
      () => setLabel(getRelativeTime(date, locale)),
      60_000
    );
    return () => clearInterval(id);
  }, [date, locale]);

  return label;
}
