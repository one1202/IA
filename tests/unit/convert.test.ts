import assert from "node:assert/strict";
import test from "node:test";
import { convert } from "../../csconv/src/lib/convert";
import { assertError } from "./helpers";

test("valid: converts a small end-to-end program", () => {
  const result = convert("int x = 1; x += 2;");
  assert.equal(result.pseudocode, "x = 1\nx = x + 2");
  assert.equal(result.errors, undefined);
});

test("valid: converts scanner input and output end-to-end", () => {
  const result = convert('int value = scanner.nextInt(); System.out.println("ok");');
  assert.equal(result.pseudocode, 'input value\noutput "ok"');
});

test("invalid: rejects empty input", () => {
  const result = convert("   ");
  assert.ok(result.errors);
  assertError(result.errors?.[0], { stage: "input", message: "Empty input", line: 1, column: 1 });
});

test("invalid: surfaces scope errors", () => {
  const result = convert("interface Demo {}");
  assert.ok(result.errors);
  assertError(result.errors?.[0], {
    stage: "scope",
    message: "Interfaces are out of scope.",
    line: 1,
    column: 1,
  });
});

test("invalid: surfaces tokenization errors", () => {
  const result = convert("int x = @;");
  assert.ok(result.errors);
  assertError(result.errors?.[0], {
    stage: "tokenization",
    message: "Unsupported character '@'",
    line: 1,
    column: 9,
  });
});

test("invalid: surfaces parse errors", () => {
  const result = convert("int x = 1");
  assert.ok(result.errors);
  assertError(result.errors?.[0], {
    stage: "parse",
    message: "Expected ';' after declaration",
    line: 1,
    column: 10,
  });
});

test("extreme: converts a long valid input with nested control flow", () => {
  const body = Array.from({ length: 20 }, (_, index) => `total += ${index};`).join("\n");
  const result = convert(`
int total = 0;
while (total < 100) {
${body}
  if (total > 50) {
    total -= 10;
  }
}
`);
  assert.ok(!result.errors, `unexpected errors: ${JSON.stringify(result.errors)}`);
  assert.match(result.pseudocode || "", /^total = 0\nloop while total < 100/);
  assert.match(result.pseudocode || "", /if total > 50 then/);
});

test("extreme: handles large comment-heavy input end-to-end", () => {
  const lines = Array.from({ length: 60 }, (_, index) => `int value${index} = ${index}; // comment ${index}`).join("\n");
  const result = convert(`${lines}\nSystem.out.println("done");`);
  assert.ok(!result.errors, `unexpected errors: ${JSON.stringify(result.errors)}`);
  assert.match(result.pseudocode || "", /value59 = 59/);
  assert.match(result.pseudocode || "", /output "done"$/);
});
