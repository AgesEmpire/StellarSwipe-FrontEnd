import { NextRequest, NextResponse } from "next/server";
import {
  parseSubscriptionStatus,
  SubscriptionStatus,
} from "@/lib/subscriptionStatus";

type StoredOutcome = {
  fingerprint: string;
  status: number;
  body: unknown;
  expiresAt: number;
};

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const idempotencyStore = new Map<string, StoredOutcome>();

/**
 * OpenAPI 3.1 document for the subscriptions route.
 *
 * Served from `GET /api/subscriptions/openapi` so the published contract stays
 * co-located with the handlers it describes. Schemas, response codes and auth
 * requirements are declared here and validated by `validateOpenApiDocument`.
 */
const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Subscriptions API",
    version: "1.0.0",
    description: "List and create subscriptions.",
  },
  paths: {
    "/api/subscriptions": {
      get: {
        summary: "List subscriptions",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: { $ref: "#/components/schemas/SubscriptionStatus" },
          },
        ],
        responses: {
          "200": {
            description: "Subscriptions retrieved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubscriptionList" },
              },
            },
          },
          "400": {
            description: "Invalid status filter",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a subscription",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "idempotency-key",
            in: "header",
            required: false,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSubscriptionRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Subscription created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubscriptionResponse" },
              },
            },
          },
          "400": {
            description: "Invalid JSON body",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "409": {
            description: "Idempotency key reused with a different payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
    schemas: {
      SubscriptionStatus: {
        type: "string",
        enum: Object.values(SubscriptionStatus),
      },
      Subscription: {
        type: "object",
        required: ["id", "status"],
        properties: {
          id: { type: "string" },
          status: { $ref: "#/components/schemas/SubscriptionStatus" },
        },
      },
      SubscriptionList: {
        type: "object",
        required: ["subscriptions"],
        properties: {
          subscriptions: {
            type: "array",
            items: { $ref: "#/components/schemas/Subscription" },
          },
        },
      },
      CreateSubscriptionRequest: {
        type: "object",
        additionalProperties: true,
      },
      SubscriptionResponse: {
        type: "object",
        required: ["subscription"],
        properties: {
          subscription: {
            type: "object",
            required: ["id", "payload"],
            properties: {
              id: { type: "string" },
              payload: {},
            },
          },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
    },
  },
} as const;

/**
 * Minimal structural validation that catches invalid or missing schemas.
 * Returns a list of human-readable problems; empty means the document is valid.
 */
export function validateOpenApiDocument(doc: unknown): string[] {
  const errors: string[] = [];
  const d = doc as Record<string, any>;

  if (!d || typeof d !== "object") return ["document is not an object"];
  if (typeof d.openapi !== "string" || !d.openapi.startsWith("3.")) {
    errors.push("missing or unsupported `openapi` version");
  }
  if (!d.info || typeof d.info.title !== "string" || typeof d.info.version !== "string") {
    errors.push("missing `info.title` or `info.version`");
  }
  if (!d.paths || typeof d.paths !== "object" || Object.keys(d.paths).length === 0) {
    errors.push("missing `paths`");
  }

  const schemas = d.components?.schemas ?? {};
  const resolveRef = (ref: string): boolean => {
    const prefix = "#/components/schemas/";
    if (!ref.startsWith(prefix)) return false;
    return Object.prototype.hasOwnProperty.call(schemas, ref.slice(prefix.length));
  };

  const walk = (node: any, path: string) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.$ref === "string" && !resolveRef(node.$ref)) {
      errors.push(`${path}: unresolved $ref ${node.$ref}`);
    }
    for (const [key, value] of Object.entries(node)) {
      walk(value, `${path}.${key}`);
    }
  };

  for (const [routePath, item] of Object.entries(d.paths ?? {})) {
    for (const [method, op] of Object.entries(item as Record<string, any>)) {
      const opPath = `paths.${routePath}.${method}`;
      if (!op || typeof op !== "object") continue;
      if (!op.responses || Object.keys(op.responses).length === 0) {
        errors.push(`${opPath}: missing responses`);
      }
      if (op.requestBody) {
        const content = op.requestBody.content;
        if (!content || Object.keys(content).length === 0) {
          errors.push(`${opPath}: requestBody missing content schema`);
        }
      }
      walk(op, opPath);
    }
  }

  return errors;
}

function principalFrom(req: NextRequest): string {
  return (
    req.headers.get("x-user-id") ??
    req.headers.get("authorization") ??
    "anonymous"
  );
}

function scopedKey(principal: string, key: string): string {
  return `${principal}::${key}`;
}

function fingerprint(payload: unknown): string {
  return JSON.stringify(payload ?? null);
}

function pruneExpired(now: number) {
  for (const [key, entry] of idempotencyStore) {
    if (entry.expiresAt <= now) idempotencyStore.delete(key);
  }
}

export async function GET(req: NextRequest) {
  const rawStatus = req.nextUrl.searchParams.get("status");

  if (rawStatus === null) {
    return NextResponse.json(
      { subscriptions: await fetchSubscriptions() },
      { status: 200 }
    );
  }

  const status = parseSubscriptionStatus(rawStatus);

  if (!status) {
    return NextResponse.json(
      {
        error: `Invalid status "${rawStatus}". Valid values: ${Object.values(
          SubscriptionStatus
        ).join(", ")}`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { subscriptions: await fetchSubscriptions(status) },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("idempotency-key");
  const principal = principalFrom(req);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const now = Date.now();
  pruneExpired(now);

  if (idempotencyKey) {
    const key = scopedKey(principal, idempotencyKey);
    const existing = idempotencyStore.get(key);

    if (existing && existing.expiresAt > now) {
      if (existing.fingerprint !== fingerprint(payload)) {
        return NextResponse.json(
          { error: "Idempotency key reused with a different payload" },
          { status: 409 }
        );
      }
      return NextResponse.json(existing.body, { status: existing.status });
    }
  }

  const body = { subscription: await createSubscription(payload) };
  const status = 201;

  if (idempotencyKey) {
    idempotencyStore.set(scopedKey(principal, idempotencyKey), {
      fingerprint: fingerprint(payload),
      status,
      body,
      expiresAt: now + IDEMPOTENCY_TTL_MS,
    });
  }

  return NextResponse.json(body, { status });
}

/**
 * Serve the generated OpenAPI document. Validation runs on every request so an
 * invalid or missing schema surfaces immediately instead of shipping silently.
 */
export async function OPTIONS() {
  const errors = validateOpenApiDocument(openApiDocument);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Invalid OpenAPI document", details: errors },
      { status: 500 }
    );
  }
  return NextResponse.json(openApiDocument, { status: 200 });
}

// Replace with real data source (DB / Soroban contract call)
async function fetchSubscriptions(status?: SubscriptionStatus) {
  const mock = [
    { id: "1", status: SubscriptionStatus.Active },
    { id: "2", status: SubscriptionStatus.Expired },
    { id: "3", status: SubscriptionStatus.Pending },
  ];
  return status ? mock.filter((s) => s.status === status) : mock;
}

// Replace with real data source (DB / Soroban contract call)
async function createSubscription(payload: unknown) {
  return { id: String(Date.now()), payload };
}
