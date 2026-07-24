export interface BreadcrumbSegment {
  label: string;
  href: string;
}

/**
 * Route metadata for breadcrumb navigation in nested settings pages.
 * Key: pathname, Value: ordered list of segments (root → current).
 */
export const BREADCRUMB_ROUTES: Record<string, BreadcrumbSegment[]> = {
  "/security": [
    { label: "Settings", href: "/settings" },
    { label: "Security", href: "/security" },
  ],
  "/security/active-sessions": [
    { label: "Settings", href: "/settings" },
    { label: "Security", href: "/security" },
    { label: "Active Sessions", href: "/security/active-sessions" },
  ],
  "/settings/notifications": [
    { label: "Settings", href: "/settings" },
    { label: "Notifications", href: "/settings/notifications" },
  ],
  "/settings/webhooks": [
    { label: "Settings", href: "/settings" },
    { label: "Webhooks", href: "/settings/webhooks" },
  ],
  "/settings/profile": [
    { label: "Settings", href: "/settings" },
    { label: "Profile", href: "/settings/profile" },
  ],
  "/settings/billing": [
    { label: "Settings", href: "/settings" },
    { label: "Billing", href: "/settings/billing" },
  ],
};
