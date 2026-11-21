import type { CSVColumn } from "@/lib/journalSchema";

/**
 * Local persistence for in-progress CSV import sessions.
 *
 * Only file *metadata* and user choices (mapping, step, validation counts)
 * are persisted — never the parsed CSV rows or cell contents. Restoring a
 * draft still requires the user to re-select the original file so raw
 * transaction data never lives in storage longer than the active session.
 */

const STORAGE_KEY = "csv-import-draft-v1";
const DRAFT_VERSION = 1;

export type CSVImportStep = "mapping" | "preview";

export interface CSVImportDraft {
  version: number;
  savedAt: number;
  fileName: string;
  fileSize: number;
  fileLastModified: number;
  headers: string[];
  mapping: Partial<Record<CSVColumn, string>>;
  step: CSVImportStep;
  rowCount: number;
  validSummary?: { valid: number; invalid: number };
}

export function saveCSVImportDraft(
  draft: Omit<CSVImportDraft, "version" | "savedAt">
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CSVImportDraft = {
      ...draft,
      version: DRAFT_VERSION,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable or full — draft persistence is best-effort.
  }
}

export function loadCSVImportDraft(): CSVImportDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== DRAFT_VERSION ||
      typeof parsed.fileName !== "string" ||
      !Array.isArray(parsed.headers) ||
      typeof parsed.mapping !== "object"
    ) {
      return null;
    }
    return parsed as CSVImportDraft;
  } catch {
    return null;
  }
}

export function clearCSVImportDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

// ── Saved (named) column mappings (#1065) ────────────────────────────────────

const MAPPINGS_STORAGE_KEY = "csv-import-mappings-v1";
const MAPPINGS_VERSION = 1;

export interface SavedCSVColumnMapping {
  id: string;
  name: string;
  mapping: Partial<Record<CSVColumn, string>>;
  createdAt: number;
  updatedAt: number;
}

interface SavedMappingsPayload {
  version: number;
  mappings: SavedCSVColumnMapping[];
}

function readMappings(): SavedCSVColumnMapping[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MAPPINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedMappingsPayload;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== MAPPINGS_VERSION ||
      !Array.isArray(parsed.mappings)
    ) {
      return [];
    }
    return parsed.mappings.filter(
      (m) =>
        m &&
        typeof m.id === "string" &&
        typeof m.name === "string" &&
        m.mapping &&
        typeof m.mapping === "object"
    );
  } catch {
    return [];
  }
}

function writeMappings(mappings: SavedCSVColumnMapping[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedMappingsPayload = {
      version: MAPPINGS_VERSION,
      mappings,
    };
    window.localStorage.setItem(MAPPINGS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable or full — saved mappings are best-effort.
  }
}

/** All saved mappings, newest first. */
export function loadSavedMappings(): SavedCSVColumnMapping[] {
  return readMappings().sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Create or update a named mapping. Matching is case-insensitive on the name,
 * so saving under an existing name overwrites that mapping.
 */
export function saveMapping(
  name: string,
  mapping: Partial<Record<CSVColumn, string>>
): SavedCSVColumnMapping | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const now = Date.now();
  const existing = readMappings();
  const match = existing.find(
    (m) => m.name.toLowerCase() === trimmed.toLowerCase()
  );
  const entry: SavedCSVColumnMapping = match
    ? { ...match, name: trimmed, mapping: { ...mapping }, updatedAt: now }
    : {
        id: `map-${now}-${Math.random().toString(36).slice(2, 9)}`,
        name: trimmed,
        mapping: { ...mapping },
        createdAt: now,
        updatedAt: now,
      };
  writeMappings(
    match
      ? existing.map((m) => (m.id === match.id ? entry : m))
      : [...existing, entry]
  );
  return entry;
}

export function updateSavedMapping(
  id: string,
  patch: {
    name?: string;
    mapping?: Partial<Record<CSVColumn, string>>;
  }
): SavedCSVColumnMapping | null {
  const existing = readMappings();
  const target = existing.find((m) => m.id === id);
  if (!target) return null;
  const nextName = patch.name?.trim() || target.name;
  const updated: SavedCSVColumnMapping = {
    ...target,
    name: nextName,
    mapping: patch.mapping ? { ...patch.mapping } : target.mapping,
    updatedAt: Date.now(),
  };
  writeMappings(existing.map((m) => (m.id === id ? updated : m)));
  return updated;
}

export function deleteSavedMapping(id: string): void {
  writeMappings(readMappings().filter((m) => m.id !== id));
}

/**
 * Check a file's headers against a saved mapping. Returns the target columns
 * whose saved source column is absent from the new file.
 */
export function findMissingColumns(
  saved: SavedCSVColumnMapping,
  headers: string[]
): CSVColumn[] {
  return (Object.entries(saved.mapping) as [CSVColumn, string][])
    .filter(([, source]) => Boolean(source) && !headers.includes(source))
    .map(([target]) => target);
}

/** Whether a re-selected file plausibly matches a saved draft. */
export function fileMatchesDraft(file: File, draft: CSVImportDraft): boolean {
  return (
    file.name === draft.fileName &&
    file.size === draft.fileSize &&
    file.lastModified === draft.fileLastModified
  );
}
