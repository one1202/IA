import assert from "node:assert/strict";
import test from "node:test";
import { scopeGuard } from "../../csconv/src/lib/scope-guard";
import { assertError } from "./helpers";

test("valid: allows in-scope procedural Java subset", () => {
  const source = `
int total = 0;
for (int i = 0; i < 10; i++) {
  if (i % 2 == 0) {
    total += i;
  }
}
`;
  assert.equal(scopeGuard(source), null);
});

test("invalid: rejects banned constructs with scope errors", () => {
  const cases = [
    { source: "interface A {}", message: "Interfaces are out of scope." },
    { source: "class A implements B {}", message: "Interfaces are out of scope." },
    { source: "class A extends B {}", message: "Inheritance is out of scope." },
    { source: "void run() throws Exception {}", message: "Exceptions are out of scope." },
    { source: "try { x = 1; } catch (Exception e) {}", message: "Exceptions are out of scope." },
    { source: "switch (x) { case 1: break; }", message: "Switch is out of scope." },
    { source: "List < String > names;", message: "Generics are out of scope." },
    { source: "class A {} class B {}", message: "Multiple classes are out of scope." },
  ];

  for (const { source, message } of cases) {
    assertError(scopeGuard(source) || undefined, { stage: "scope", message, line: 1, column: 1 });
  }
});

test("invalid: rejects whitespace-heavy generics near the end of long files", () => {
  const prefix = "int x = 0;\n".repeat(200);
  const error = scopeGuard(`${prefix}Map   < String , Integer > counts;`);
  assertError(error || undefined, { stage: "scope", message: "Generics are out of scope." });
});

test("extreme: finds banned constructs after many valid statements", () => {
  const source = `${"int x = 0;\n".repeat(300)}switch (x) { case 1: break; }`;
  const error = scopeGuard(source);
  assertError(error || undefined, { stage: "scope", message: "Switch is out of scope." });
});

test("extreme: does not false-positive on similar identifiers", () => {
  const source = `
int interfaceName = 1;
int switchValue = 2;
int implementationCount = 3;
`;
  assert.equal(scopeGuard(source), null);
});
