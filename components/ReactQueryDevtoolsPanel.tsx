"use client";

import dynamic from "next/dynamic";

const Devtools =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then(
            (mod) => mod.ReactQueryDevtools
          ),
        { ssr: false }
      )
    : null;

export function ReactQueryDevtoolsPanel() {
  if (!Devtools) return null;

  return <Devtools initialIsOpen={false} buttonPosition="bottom" />;
}
