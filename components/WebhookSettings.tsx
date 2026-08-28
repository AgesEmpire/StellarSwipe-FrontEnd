"use client";

import { useState } from "react";
import { useWebhookStore, type WebhookEventType } from "@/store/useWebhookStore";
import { buildSamplePayload, dispatchWebhookEvent } from "@/services/webhookService";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Send, Copy } from "lucide-react";
import { useValidationSummary } from "@/hooks/useValidationSummary";
import { ValidationSummary } from "@/components/forms/ValidationSummary";

const EVENT_OPTIONS: { value: WebhookEventType; label: string }[] = [
  { value: "new_signal", label: "New Signal" },
  { value: "trade_execution", label: "Trade Execution" },
  { value: "portfolio_alert", label: "Portfolio Alert" },
];

export function WebhookSettings() {
  const { webhooks, addWebhook, removeWebhook, updateEvents } = useWebhookStore();
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(["new_signal"]);
  const [testStatus, setTestStatus] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const { errors, validate, clearFieldError } = useValidationSummary();

  const handleAdd = () => {
    const nextErrors = [];
    if (!url.trim() || !url.startsWith("http")) {
      nextErrors.push({ field: "webhook-url", message: "Webhook URL must be a valid http(s) address." });
    }
    if (selectedEvents.length === 0) {
      nextErrors.push({ field: "webhook-events", message: "Select at least one event to send." });
    }
    if (!validate(nextErrors)) return;

    addWebhook(url.trim(), selectedEvents);
    setUrl("");
  };

  const handleTest = async (webhookId: string) => {
    setTestStatus((s) => ({ ...s, [webhookId]: "Sending…" }));
    await dispatchWebhookEvent("new_signal", buildSamplePayload("new_signal").data);
    setTestStatus((s) => ({ ...s, [webhookId]: "Sent ✓" }));
    setTimeout(() => setTestStatus((s) => ({ ...s, [webhookId]: "" })), 3000);
  };

  const copySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleEvent = (current: WebhookEventType[], event: WebhookEventType) =>
    current.includes(event) ? current.filter((e) => e !== event) : [...current, event];

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Webhook Integrations</h2>

      {/* Add webhook */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-medium text-sm">Add Webhook</h3>
        <ValidationSummary errors={errors} />
        <input
          id="webhook-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => clearFieldError("webhook-url")}
          placeholder="https://your-app.com/webhook"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Webhook URL"
        />
        <div
          id="webhook-events"
          tabIndex={-1}
          className="flex flex-wrap gap-2 focus:outline-none"
        >
          {EVENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSelectedEvents((ev) => toggleEvent(ev, opt.value));
                clearFieldError("webhook-events");
              }}
              className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                selectedEvents.includes(opt.value)
                  ? "bg-blue-500 text-white border-blue-500"
                  : "border-muted-foreground text-muted-foreground hover:border-foreground"
              }`}
              aria-pressed={selectedEvents.includes(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={handleAdd} className="gap-1">
          <Plus size={14} /> Add Webhook
        </Button>
      </div>

      {/* Webhook list */}
      {webhooks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No webhooks configured.</p>
      )}

      {webhooks.map((wh) => (
        <div key={wh.id} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-mono truncate max-w-xs">{wh.url}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTest(wh.id)}
                aria-label="Test webhook"
                className="gap-1 text-xs"
              >
                <Send size={12} />
                {testStatus[wh.id] || "Test"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeWebhook(wh.id)}
                aria-label="Delete webhook"
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* Events */}
          <div className="flex flex-wrap gap-2">
            {EVENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateEvents(wh.id, toggleEvent(wh.events, opt.value))}
                className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                  wh.events.includes(opt.value)
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-muted-foreground text-muted-foreground"
                }`}
                aria-pressed={wh.events.includes(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Secret */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Secret:</span>
            <code className="font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[180px]">
              {wh.secret.slice(0, 8)}••••••••
            </code>
            <button
              onClick={() => copySecret(wh.secret, wh.id)}
              aria-label="Copy signing secret"
              className="hover:text-foreground"
            >
              <Copy size={12} />
            </button>
            {copied === wh.id && <span className="text-green-500">Copied!</span>}
          </div>

          {/* Rate limit */}
          <div className="text-xs text-muted-foreground">
            Rate limit: <span className={wh.rateLimit < 10 ? "text-yellow-500 font-medium" : ""}>{wh.rateLimit}/60</span> remaining this minute
          </div>

          {/* Delivery history */}
          {wh.deliveries.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Delivery history ({wh.deliveries.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {wh.deliveries.map((d) => (
                  <div key={d.id} className={`flex justify-between px-2 py-1 rounded ${d.status === "success" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"}`}>
                    <span>{new Date(d.timestamp).toLocaleTimeString()}</span>
                    <span>{d.status === "success" ? `✓ ${d.statusCode}` : `✗ ${d.error}`}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ))}
    </section>
  );
}
