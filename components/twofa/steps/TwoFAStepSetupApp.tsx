"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { use2FAStore } from "@/store/use2FAStore";
import { cn } from "@/lib/utils";
import { Copy, Check, ChevronRight, RefreshCw } from "lucide-react";

// Mock TOTP secret — in production this comes from the server
const MOCK_SECRET = "JBSWY3DPEHPK3PXP";
const MOCK_ISSUER = "StellarSwipe";
const MOCK_ACCOUNT = "user@stellarswipe.app";

// Fake QR code SVG (in production use a real QR library like qrcode.react)
function MockQRCode({ value }: { value: string }) {
  // Generate a deterministic grid pattern from the value string
  const cells = Array.from({ length: 21 * 21 }, (_, i) => {
    const charCode = value.charCodeAt(i % value.length);
    return (charCode + i * 7) % 3 === 0;
  });

  return (
    <div
      className="inline-block rounded-lg border-4 border-white bg-white p-2"
      role="img"
      aria-label="QR code for authenticator app setup"
    >
      <svg width="168" height="168" viewBox="0 0 21 21" aria-hidden="true">
        {cells.map((filled, i) => {
          const x = i % 21;
          const y = Math.floor(i / 21);
          return filled ? (
            <rect key={i} x={x} y={y} width={1} height={1} fill="#000" />
          ) : null;
        })}
        {/* Finder patterns */}
        {[[0, 0], [14, 0], [0, 14]].map(([px, py]) => (
          <g key={`${px}-${py}`}>
            <rect x={px} y={py} width={7} height={7} fill="#000" />
            <rect x={px + 1} y={py + 1} width={5} height={5} fill="#fff" />
            <rect x={px + 2} y={py + 2} width={3} height={3} fill="#000" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function TwoFAStepSetupApp() {
  const { setStep } = use2FAStore();
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);

  const otpauthUrl = `otpauth://totp/${encodeURIComponent(MOCK_ISSUER)}:${encodeURIComponent(MOCK_ACCOUNT)}?secret=${MOCK_SECRET}&issuer=${encodeURIComponent(MOCK_ISSUER)}`;

  function handleCopy() {
    navigator.clipboard.writeText(MOCK_SECRET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Scan QR Code</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Open your authenticator app and scan the QR code below to add your account.
        </p>
      </div>

      {/* Supported apps */}
      <div className="flex flex-wrap gap-2">
        {["Google Authenticator", "Authy", "Microsoft Authenticator", "1Password"].map((app) => (
          <span
            key={app}
            className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground"
          >
            {app}
          </span>
        ))}
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-3">
        <MockQRCode value={otpauthUrl} />
        <p className="text-xs text-muted-foreground text-center">
          Point your authenticator app's camera at this code
        </p>
      </div>

      {/* Manual entry toggle */}
      <button
        onClick={() => setShowManual((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors self-center"
        aria-expanded={showManual}
        aria-controls="manual-entry"
      >
        <RefreshCw size={12} aria-hidden="true" />
        {showManual ? "Hide" : "Can't scan? Enter code manually"}
      </button>

      {showManual && (
        <div
          id="manual-entry"
          className="rounded-lg border border-border bg-muted/20 p-4"
        >
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Manual entry details
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account</span>
              <span className="font-mono text-foreground">{MOCK_ACCOUNT}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issuer</span>
              <span className="font-mono text-foreground">{MOCK_ISSUER}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Secret Key</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-foreground tracking-widest">
                  {MOCK_SECRET}
                </span>
                <button
                  onClick={handleCopy}
                  aria-label={copied ? "Copied!" : "Copy secret key"}
                  className={cn(
                    "rounded p-1 transition-colors",
                    copied
                      ? "text-green-400"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {copied ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <Copy size={14} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-mono text-foreground">Time-based (TOTP)</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep("choose_method")} className="flex-1">
          Back
        </Button>
        <Button onClick={() => setStep("verify")} className="flex-1 gap-2">
          I've Added It
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
