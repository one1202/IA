import assert from "node:assert/strict";
import test from "node:test";
import { convert } from "../csconv/src/lib/convert";
import { loadCsvCases } from "./csv";

/**
 * Verify CSV Java → pseudocode conversions.
 */
test("CSV cases", () => {
  for (const { input, expected } of loadCsvCases("sc-05.csv")) {
    const result = convert(input);
    assert.ok(!result.errors, `unexpected errors for ${input}: ${JSON.stringify(result.errors)}`);
    assert.equal(result.pseudocode?.trim(), expected.trim(), `mismatch for ${input}`);
  }
});
