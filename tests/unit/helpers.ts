import assert from "node:assert/strict";
import { normalize } from "../../csconv/src/lib/normalize";
import { parse, type AstNode } from "../../csconv/src/lib/parser";
import { tokenize, type Token } from "../../csconv/src/lib/tokenize";
import type { ConvertError } from "../../csconv/src/lib/errors";

export function stripEof(tokens: Token[]): Token[] {
  return tokens.filter((token) => token.type !== "eof");
}

export function tokenValues(tokens: Token[]): Array<{ type: string; value: string }> {
  return stripEof(tokens).map(({ type, value }) => ({ type, value }));
}

export function parseSource(source: string): AstNode {
  const normalized = normalize(source);
  const tokenResult = tokenize(normalized);
  assert.ok(!tokenResult.error, `unexpected tokenization error: ${JSON.stringify(tokenResult.error)}`);
  const parseResult = parse(tokenResult.tokens || []);
  assert.ok(!parseResult.error, `unexpected parse error: ${JSON.stringify(parseResult.error)}`);
  return parseResult.ast as AstNode;
}

export function assertError(
  actual: ConvertError | undefined,
  expected: { stage: string; message: string; line?: number; column?: number }
): void {
  assert.ok(actual, "expected an error");
  assert.equal(actual.stage, expected.stage);
  assert.equal(actual.message, expected.message);
  if (expected.line !== undefined) {
    assert.equal(actual.line, expected.line);
  }
  if (expected.column !== undefined) {
    assert.equal(actual.column, expected.column);
  }
}

export function compactAst(node: AstNode | null | undefined): unknown {
  if (!node) return node;
  switch (node.type) {
    case "Program":
    case "Block":
    case "ArrayLiteral":
      return { type: node.type, children: node.children.map((child) => compactAst(child)) };
    case "Declaration":
      return {
        type: node.type,
        name: node.name,
        dataType: node.dataType,
        children: node.children.map((child) => compactAst(child)),
      };
    case "Assignment":
    case "AssignmentExpr":
      return {
        type: node.type,
        target: compactAst(node.target),
        op: node.op,
        children: node.children.map((child) => compactAst(child)),
      };
    case "Update":
      return {
        type: node.type,
        target: compactAst(node.target),
        op: node.op,
      };
    case "CallStatement":
    case "ExpressionStatement":
      return { type: node.type, child: compactAst(node.child) };
    case "If":
    case "While":
    case "DoWhile":
    case "For":
    case "Binary":
    case "Unary":
    case "UnaryPostfix":
    case "Length":
    case "NewArray":
    case "Call":
    case "MethodCall":
      return Object.fromEntries(
        Object.entries(node).map(([key, value]) => {
          if (key === "children" && Array.isArray(value)) {
            return [key, value.map((child) => compactAst(child as AstNode | null | undefined))];
          }
          if (key === "target" || key === "object") {
            return [key, compactAst(value as AstNode)];
          }
          return [key, value];
        })
      );
    case "Literal":
      return { type: node.type, value: node.value };
    case "Identifier":
      return { type: node.type, name: node.name };
    case "ArrayAccess":
      return {
        type: node.type,
        name: node.name,
        children: node.children.map((child) => compactAst(child)),
      };
    case "Property":
      return { type: node.type, object: compactAst(node.object), name: node.name };
    default:
      return node;
  }
}
