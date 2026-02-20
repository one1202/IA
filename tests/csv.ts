import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * A single CSV test case with Java input and expected pseudocode output.
 */
export type CsvCase = {
  input: string;
  expected: string;
};

/**
 * Resolve the CSV path whether tests run from repo root or from csconv.
 */
export function resolveCsvPath(fileName: string): string {
  const direct = resolve(process.cwd(), "test_csv", fileName);
  if (existsSync(direct)) return direct;
  return resolve(process.cwd(), "..", "test_csv", fileName);
}

/**
 * Parse a two-column CSV line containing quoted fields.
 */
export function parseCsvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    throw new Error(`Invalid CSV line: ${line}`);
  }
  const body = trimmed.slice(1, -1);
  const parts = body.split('\",\"');
  if (parts.length !== 2) {
    throw new Error(`Expected 2 columns, got ${parts.length}: ${line}`);
  }
  const unescape = (value: string) => value.replace(/""/g, '"').replace(/\\n/g, "\n");
  return parts.map(unescape) as [string, string];
}

/**
 * Load CSV cases and skip header rows when present.
 */
export function loadCsvCases(fileName: string): CsvCase[] {
  const csvPath = resolveCsvPath(fileName);
  const content = readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  const cases: CsvCase[] = [];
  for (const line of lines) {
    if (line.startsWith("Java Code,")) continue;
    const parsed = parseCsvLine(line);
    if (!parsed) continue;
    const [input, expected] = parsed;
    cases.push({ input, expected });
  }
  return cases;
}
