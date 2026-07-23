"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, DownloadCloud, FileClock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type ExportStatus = "pending" | "processing" | "ready";

interface ExportRequest {
  id: string;
  requestedAt: string;
  status: ExportStatus;
}

const EXPORT_STORAGE_KEY = "account-data-export-requests";

const INCLUDED_CATEGORIES = [
  "Profile and account details",
  "Security and login history",
  "App settings and preferences",
  "Journal notes and annotations",
  "Referral and reward records",
  "Audit history and support interactions",
];

function readRequests(): ExportRequest[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(EXPORT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExportRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRequests(requests: ExportRequest[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(requests));
}

export default function DataExportRequestPage() {
  const [requests, setRequests] = useState<ExportRequest[]>([]);

  useEffect(() => {
    setRequests(readRequests());
  }, []);

  const latestRequest = useMemo(
    () =>
      requests
        .slice()
        .sort(
          (a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt)
        )[0] ?? null,
    [requests]
  );

  const requestExport = () => {
    const nextRequest: ExportRequest = {
      id: `export-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      status: "pending",
    };

    const next = [nextRequest, ...requests].slice(0, 10);
    setRequests(next);
    writeRequests(next);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold">Account Data Export</h1>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">What is included</h2>
            <p className="text-xs text-foreground-muted">
              This export is prepared asynchronously and can take time depending
              on account activity.
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground-muted">
              {INCLUDED_CATEGORIES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Request export</h2>
            <p className="text-xs text-foreground-muted">
              You will receive a notification when your archive is ready. This
              is not an instant download.
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <Button onClick={requestExport} className="gap-2">
              <DownloadCloud className="h-4 w-4" aria-hidden="true" />
              Request full account export
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Export status</h2>
            <p className="text-xs text-foreground-muted">
              Track current and recent data export requests.
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {requests.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground-muted">
                No export requests yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {requests.map((request) => (
                  <li
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <span>
                      {new Date(request.requestedAt).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                      <FileClock className="h-3.5 w-3.5" />
                      {request.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {latestRequest?.status === "pending" && (
              <p className="mt-3 text-xs text-foreground-muted">
                Your latest request is pending and will be processed
                asynchronously.
              </p>
            )}
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="gap-2">
          <Link href="/security">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to security settings
          </Link>
        </Button>
      </div>
    </main>
  );
}
