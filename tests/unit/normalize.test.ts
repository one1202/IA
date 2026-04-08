import assert from "node:assert/strict";
import test from "node:test";
import { normalize } from "../../csconv/src/lib/normalize";

test("valid: normalizes CRLF and tabs", () => {
  assert.equal(normalize("int a;\r\n\tint b;\r"), "int a;\n  int b;\n");
});

test("valid: strips comments but preserves comment markers inside strings", () => {
  const source = 'String s = "/* keep */ // keep"; // remove this\nint x = 1; /* remove */';
  const normalized = normalize(source);
  assert.match(normalized, /"\/\* keep \*\/ \/\/ keep"/);
  assert.doesNotMatch(normalized, /remove this/);
  assert.doesNotMatch(normalized, /remove \*\//);
  assert.equal(normalized.split("\n").length, 2);
});

test("invalid: leaves unmatched block comments as sanitized trailing text without throwing", () => {
  const normalized = normalize("int x = 1; /* unterminated");
  assert.match(normalized, /^int x = 1;  /);
  assert.doesNotMatch(normalized, /unterminated/);
});

test("invalid: tolerates dangling escape inside strings", () => {
  const normalized = normalize('String s = "abc\\');
  assert.equal(normalized, 'String s = "abc\\');
});

test("extreme: handles long repeated comment and string patterns", () => {
  const repeated = Array.from({ length: 100 }, (_, index) =>
    `String s${index} = "// ${index}"; /* block ${index} */ // line ${index}`
  ).join("\n");
  const normalized = normalize(repeated);
  assert.equal(normalized.split("\n").length, 100);
  assert.match(normalized, /"\/\/ 99"/);
  assert.doesNotMatch(normalized, /block 42/);
  assert.doesNotMatch(normalized, /line 42/);
});

test("extreme: preserves multiline layout when removing block comments", () => {
  const source = "int a = 1;/*x\ny\nz*/\nint b = 2;";
  const normalized = normalize(source);
  assert.equal(normalized.split("\n").length, 4);
  assert.match(normalized, /^int a = 1;   \n \n   \nint b = 2;$/);
});
