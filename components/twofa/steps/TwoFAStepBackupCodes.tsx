"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { use2FAStore } from "@/store/use2FAStore";
import { downloadFile } from "@/lib/taxReport";
import { Download, Copy, Check, AlertTriangle } from "lucide-react";

export function TwoFAStepBackupCodes() {
  const { backupCodes, acknowledgeBackupCodes } = use2FAStore();
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleDownload() {
    const content = [
      "StellarSwipe — 2FA Backup Codes",
      "================================",
      "Keep these codes in a safe place.",
      "Each code can only be used once.",
      "",
      ...backupCodes,
      "",
      `Generated: ${new Date().toLocaleString()}`,
    ].join("\n");
    downloadFile(content, "stellarswipe-backup-codes.txt", "text/plain");
    setDownloaded(true);
  }

  function handleContinue() {
    acknowledgeBackupCodes();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Save Your Backup Codes</h3>
        <p className="text-sm text-muted-foreground mt-1">
          These codes let you access your account if you lose your authenticator.
          Each code can only be used once.
        </p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
        <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-yellow-300 leading-relaxed">
          Store these codes somewhere safe — a password manager, printed paper, or
          encrypted file. You won't be able to see them again after closing this dialog.
        </p>
      </div>

      {/* Backup codes grid */}
      <div
        className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/20 p-4"
        aria-label="Backup codes"
      >
        {backupCodes.map((code, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md bg-card border border-border px-3 py-2"
          >
            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
            <span className="font-mono text-sm font-semibold text-foreground tracking-wider">
              {code}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex-1 gap-2"
          aria-label={copied ? "Codes copied" : "Copy all backup codes"}
        >
          {copied ? (
            <Check size={14} className="text-green-400" aria-hidden="true" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
          {copied ? "Copied!" : "Copy All"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-1 gap-2"
          aria-label="Download backup codes as text file"
        >
          <Download size={14} aria-hidden="true" />
          {downloaded ? "Downloaded" : "Download"}
        </Button>
      </div>

      {/* Acknowledgement checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-blue-500"
          aria-label="I have saved my backup codes"
        />
        <span className="text-sm text-foreground">
          I have saved my backup codes in a secure location.
        </span>
      </label>

      <Button
        onClick={handleContinue}
        disabled={!acknowledged}
        className="w-full"
      >
        I've Saved My Codes — Finish Setup
      </Button>
    </div>
  );
}
