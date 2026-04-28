"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function useScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    const scrollPositions = new Map<string, number>();

    const saveScrollPosition = () => {
      scrollPositions.set(pathname, window.scrollY);
    };

    const restoreScrollPosition = () => {
      const savedPosition = scrollPositions.get(pathname);
      if (savedPosition !== undefined) {
        window.scrollTo(0, savedPosition);
      } else {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("beforeunload", saveScrollPosition);
    restoreScrollPosition();

    return () => {
      window.removeEventListener("beforeunload", saveScrollPosition);
      saveScrollPosition();
    };
  }, [pathname]);
}
