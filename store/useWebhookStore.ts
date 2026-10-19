import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUDIT_ACTIONS, recordAuditEntry } from '@/services/auditTrail';

export type WebhookEventType = 'new_signal' | 'trade_execution' | 'portfolio_alert';

export interface WebhookDelivery {
  id: string;
  timestamp: string;
  status: 'success' | 'failed';
  statusCode?: number;
  error?: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  createdAt: string;
  deliveries: WebhookDelivery[];
  rateLimit: number; // remaining calls this minute
}

interface WebhookStore {
  webhooks: Webhook[];
  addWebhook: (url: string, events: WebhookEventType[]) => Webhook;
  removeWebhook: (id: string) => void;
  updateEvents: (id: string, events: WebhookEventType[]) => void;
  recordDelivery: (webhookId: string, delivery: WebhookDelivery) => void;
  decrementRateLimit: (id: string) => void;
  resetRateLimits: () => void;
}

function generateSecret(): string {
  const arr = new Uint8Array(20);
  if (typeof crypto !== 'undefined') crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const useWebhookStore = create<WebhookStore>()(
  persist(
    (set) => ({
      webhooks: [],

      addWebhook: (url, events) => {
        const webhook: Webhook = {
          id: `wh_${Date.now()}`,
          url,
          events,
          secret: generateSecret(),
          createdAt: new Date().toISOString(),
          deliveries: [],
          rateLimit: 60,
        };
        // Sensitive change — audit the registration. The generated secret is
        // deliberately excluded.
        recordAuditEntry({
          actor: 'system',
          action: AUDIT_ACTIONS.WEBHOOK_CREATED,
          target: webhook.id,
          metadata: { url, events },
        });
        set((s) => ({ webhooks: [...s.webhooks, webhook] }));
        return webhook;
      },

      removeWebhook: (id) => {
        // Sensitive change — audit the removal (webhook id, not the secret).
        recordAuditEntry({
          actor: 'system',
          action: AUDIT_ACTIONS.WEBHOOK_DELETED,
          target: id,
        });
        set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) }));
      },

      updateEvents: (id, events) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) => (w.id === id ? { ...w, events } : w)),
        })),

      recordDelivery: (webhookId, delivery) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === webhookId
              ? { ...w, deliveries: [delivery, ...w.deliveries].slice(0, 50) }
              : w
          ),
        })),

      decrementRateLimit: (id) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === id ? { ...w, rateLimit: Math.max(0, w.rateLimit - 1) } : w
          ),
        })),

      resetRateLimits: () =>
        set((s) => ({ webhooks: s.webhooks.map((w) => ({ ...w, rateLimit: 60 })) })),
    }),
    { name: 'stellarswipe:webhooks' }
  )
);
