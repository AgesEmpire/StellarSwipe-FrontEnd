import { z } from "zod";

export enum SubscriptionStatus {
  Active = "active",
  Inactive = "inactive",
  Pending = "pending",
  Cancelled = "cancelled",
  Expired = "expired",
}

const SubscriptionStatusSchema = z.nativeEnum(SubscriptionStatus);

export function parseSubscriptionStatus(
  value: unknown
): SubscriptionStatus | null {
  const result = SubscriptionStatusSchema.safeParse(value);
  return result.success ? result.data : null;
}
