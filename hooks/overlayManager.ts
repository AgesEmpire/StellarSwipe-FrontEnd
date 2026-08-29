// Simple stack-based overlay registry to track which overlay is topmost.
// Overlays should call pushOverlay when they become active and popOverlay when
// they are removed. This allows global handlers (Escape, focus-trap) to act
// only when an overlay is the topmost one.

const stack: HTMLElement[] = [];

export function pushOverlay(el: HTMLElement | null | undefined) {
  if (!el) return;
  const idx = stack.indexOf(el);
  if (idx !== -1) stack.splice(idx, 1);
  stack.push(el);
}

export function popOverlay(el: HTMLElement | null | undefined) {
  if (!el) return;
  const idx = stack.indexOf(el);
  if (idx !== -1) stack.splice(idx, 1);
}

export function topOverlay(): HTMLElement | null {
  return stack.length ? stack[stack.length - 1] : null;
}

export function isTopOverlay(el: HTMLElement | null | undefined): boolean {
  if (!el) return false;
  return topOverlay() === el;
}
