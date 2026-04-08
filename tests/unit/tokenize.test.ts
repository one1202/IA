import assert from "node:assert/strict";
import test from "node:test";
import { tokenize } from "../../csconv/src/lib/tokenize";
import { assertError, stripEof, tokenValues } from "./helpers";

test("valid: tokenizes keywords, identifiers, punctuation, and arrays", () => {
  const result = tokenize("int count = arr[2];");
  assert.ok(result.tokens);
  assert.deepEqual(tokenValues(result.tokens || []), [
    { type: "keyword", value: "int" },
    { type: "identifier", value: "count" },
    { type: "operator", value: "=" },
    { type: "identifier", value: "arr" },
    { type: "bracket", value: "[" },
    { type: "number", value: "2" },
    { type: "bracket", value: "]" },
    { type: "semicolon", value: ";" },
  ]);
});

test("valid: tokenizes all supported multi-character operators", () => {
  const result = tokenize("a == b != c <= d >= e && f || g ++ h -- i += j -= k *= l /= m;");
  assert.ok(result.tokens);
  const operators = stripEof(result.tokens || [])
    .filter((token) => token.type === "operator")
    .map((token) => token.value);
  assert.deepEqual(operators, ["==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/="]);
});

test("valid: tracks line and column positions across newlines", () => {
  const result = tokenize("int a;\nfoo++;");
  assert.ok(result.tokens);
  const tokens = stripEof(result.tokens || []);
  const foo = tokens.find((token) => token.value === "foo");
  const increment = tokens.find((token) => token.value === "++");
  assert.deepEqual(foo, { type: "identifier", value: "foo", line: 2, col: 1 });
  assert.deepEqual(increment, { type: "operator", value: "++", line: 2, col: 4 });
});

test("invalid: returns an error for unterminated strings", () => {
  const result = tokenize('String s = "abc');
  assertError(result.error, {
    stage: "tokenization",
    message: "Unterminated string literal",
    line: 1,
    column: 16,
  });
});

test("invalid: returns an error for multiline strings", () => {
  const result = tokenize('"abc\ndef"');
  assertError(result.error, {
    stage: "tokenization",
    message: "Unterminated string literal",
    line: 1,
    column: 5,
  });
});

test("invalid: returns an error for unsupported characters", () => {
  const result = tokenize("int x = @;");
  assertError(result.error, {
    stage: "tokenization",
    message: "Unsupported character '@'",
    line: 1,
    column: 9,
  });
});

test("extreme: tokenizes very long identifiers and strings", () => {
  const identifier = `value_${"x".repeat(120)}`;
  const literal = "a".repeat(200);
  const result = tokenize(`String ${identifier} = "${literal}";`);
  assert.ok(result.tokens);
  const tokens = stripEof(result.tokens || []);
  assert.equal(tokens[1]?.value, identifier);
  assert.equal(tokens[3]?.value, literal);
});

test("extreme: reports accurate line numbers late in large inputs", () => {
  const source = `${"int x = 0;\n".repeat(150)}int y = @;`;
  const result = tokenize(source);
  assertError(result.error, {
    stage: "tokenization",
    message: "Unsupported character '@'",
    line: 151,
    column: 9,
  });
});

test("extreme: preserves current ambiguous decimal tokenization behavior", () => {
  const result = tokenize("value = 123.456.789;");
  assert.ok(result.tokens);
  assert.deepEqual(tokenValues(result.tokens || []), [
    { type: "identifier", value: "value" },
    { type: "operator", value: "=" },
    { type: "number", value: "123.456" },
    { type: "dot", value: "." },
    { type: "number", value: "789" },
    { type: "semicolon", value: ";" },
  ]);
});
