const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { convert } = require(path.resolve(__dirname, "../csconv/ia.cjs"));

/**
 * Parse a simple 2-column CSV line with quoted values.
 * @param {string} line
 * @returns {[string, string]|null}
 */
function parseCsvLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    throw new Error(`Invalid CSV line: ${line}`);
  }
  const body = trimmed.slice(1, -1);
  const parts = body.split('","');
  if (parts.length !== 2) {
    throw new Error(`Expected 2 columns, got ${parts.length}: ${line}`);
  }
  const unescape = (value) => value.replace(/""/g, '"').replace(/\\n/g, "\n");
  return parts.map(unescape);
}

test("sc-05.csv cases", () => {
  const csvPath = path.resolve(__dirname, "../test_csv/sc-05.csv");
  const content = fs.readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("Java Code,")) continue;
    const parsed = parseCsvLine(line);
    if (!parsed) continue;
    const [input, expected] = parsed;
    const result = convert(input, { style: "sc-05" });
    assert.ok(!result.errors, `unexpected errors for ${input}: ${JSON.stringify(result.errors)}`);
    assert.equal(result.pseudocode.trim(), expected.trim(), `mismatch for ${input}`);
  }
});
