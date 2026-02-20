import assert from "node:assert/strict";
import test from "node:test";
import { convert } from "../csconv/src/lib/convert";
import { loadCsvCases } from "./csv";

/**
 * Verify sc-01.csv Java → pseudocode conversions.
 */
test("sc-01.csv cases", () => {
  for (const { input, expected } of loadCsvCases("sc-01.csv")) {
    const result = convert(input, { style: "sc-01" });
    assert.ok(!result.errors, `unexpected errors for ${input}: ${JSON.stringify(result.errors)}`);
    assert.equal(result.pseudocode?.trim(), expected.trim(), `mismatch for ${input}`);
  }
});
