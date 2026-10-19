import { Toaster } from "sonner";

/**
 * ToastViewport — mounts the global sonner toast renderer.
 *
 * Components fire toasts via `import { toast } from "sonner"`, but sonner
 * only renders them when a <Toaster /> is mounted somewhere in the tree.
 * This component is that single mount point (rendered once in the root
 * layout).
 *
 * Positioning keeps queued messages below the fixed navbar and above the
 * mobile nav / primary form actions so they never cover navigation or
 * submit buttons.
 */
export function ToastViewport() {
  return (
    <Toaster
      position="bottom-right"
      offset={{ top: 72, bottom: 96, right: 16 }}
      gap={8}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-border bg-popover text-foreground",
        },
      }}
    />
  );
}
