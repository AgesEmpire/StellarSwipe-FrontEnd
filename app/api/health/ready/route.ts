import { NextResponse } from "next/server";

type DependencyKind = "required" | "optional";

type DependencyCheck = {
  name: string;
  kind: DependencyKind;
  check: () => Promise<void>;
};

const DEFAULT_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function checkDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
}

async function checkCache(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }
}

async function checkAnalytics(): Promise<void> {
  const url = process.env.ANALYTICS_URL;
  if (!url) {
    throw new Error("ANALYTICS_URL is not configured");
  }
}

const dependencies: DependencyCheck[] = [
  { name: "database", kind: "required", check: checkDatabase },
  { name: "cache", kind: "required", check: checkCache },
  { name: "analytics", kind: "optional", check: checkAnalytics },
];

type DependencyResult = {
  name: string;
  kind: DependencyKind;
  status: "ok" | "error";
  error?: string;
};

export async function GET(): Promise<NextResponse> {
  const timeoutMs = Number(process.env.READINESS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  const results: DependencyResult[] = await Promise.all(
    dependencies.map(async (dependency) => {
      try {
        await withTimeout(dependency.check(), timeoutMs);
        return { name: dependency.name, kind: dependency.kind, status: "ok" };
      } catch (error) {
        return {
          name: dependency.name,
          kind: dependency.kind,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  const requiredUnavailable = results.some(
    (result) => result.kind === "required" && result.status === "error",
  );

  const body = {
    status: requiredUnavailable ? "unavailable" : "ready",
    dependencies: results,
  };

  return NextResponse.json(body, { status: requiredUnavailable ? 503 : 200 });
}
