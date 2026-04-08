import assert from "node:assert/strict";
import test from "node:test";
import { normalize } from "../../csconv/src/lib/normalize";
import { parse } from "../../csconv/src/lib/parser";
import { tokenize } from "../../csconv/src/lib/tokenize";
import { assertError, compactAst, parseSource } from "./helpers";

test("valid: parses declarations and compound assignments", () => {
  const ast = parseSource("int x = 1; x += 2;");
  assert.deepEqual(compactAst(ast), {
    type: "Program",
    children: [
      {
        type: "Declaration",
        name: "x",
        dataType: "int",
        children: [{ type: "Literal", value: "1" }],
      },
      {
        type: "Assignment",
        target: { type: "Identifier", name: "x" },
        op: "+=",
        children: [{ type: "Literal", value: "2" }],
      },
    ],
  });
});

test("valid: preserves operator precedence in expressions", () => {
  const ast = parseSource("x = a + b * c;");
  assert.deepEqual(compactAst(ast), {
    type: "Program",
    children: [
      {
        type: "Assignment",
        target: { type: "Identifier", name: "x" },
        op: "=",
        children: [
          {
            type: "Binary",
            op: "+",
            children: [
              { type: "Identifier", name: "a" },
              {
                type: "Binary",
                op: "*",
                children: [
                  { type: "Identifier", name: "b" },
                  { type: "Identifier", name: "c" },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
});

test("valid: parses control flow, wrappers, and array forms", () => {
  const ast = parseSource(`
public class Demo {
  public static void main(String[] args) {
    int[] arr = new int[]{1, 2};
    for (int i = 0; i < 10; i++) {
      if (i < arr[0]) {
        arr[0] = new int[1][2];
      } else if (i == 0) {
        arr[0]++;
      } else {
        arr[0] = i;
      }
    }
  }
}`);

  assert.deepEqual(compactAst(ast), {
    type: "Program",
    children: [
      {
        type: "Declaration",
        name: "arr",
        dataType: "int",
        children: [
          {
            type: "ArrayLiteral",
            children: [
              { type: "Literal", value: "1" },
              { type: "Literal", value: "2" },
            ],
          },
        ],
      },
      {
        type: "For",
        children: [
          {
            type: "Declaration",
            name: "i",
            dataType: "int",
            children: [{ type: "Literal", value: "0" }],
          },
          {
            type: "Binary",
            op: "<",
            children: [
              { type: "Identifier", name: "i" },
              { type: "Literal", value: "10" },
            ],
          },
          {
            type: "Update",
            target: { type: "Identifier", name: "i" },
            op: "++",
          },
          {
            type: "Block",
            children: [
              {
                type: "If",
                children: [
                  {
                    type: "Binary",
                    op: "<",
                    children: [
                      { type: "Identifier", name: "i" },
                      {
                        type: "ArrayAccess",
                        name: "arr",
                        children: [{ type: "Literal", value: "0" }],
                      },
                    ],
                  },
                  {
                    type: "Block",
                    children: [
                      {
                        type: "Assignment",
                        target: {
                          type: "ArrayAccess",
                          name: "arr",
                          children: [{ type: "Literal", value: "0" }],
                        },
                        op: "=",
                        children: [
                          {
                            type: "NewArray",
                            dataType: "int",
                            children: [
                              { type: "Literal", value: "1" },
                              { type: "Literal", value: "2" },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "If",
                    children: [
                      {
                        type: "Binary",
                        op: "==",
                        children: [
                          { type: "Identifier", name: "i" },
                          { type: "Literal", value: "0" },
                        ],
                      },
                      {
                        type: "Block",
                        children: [
                          {
                            type: "Update",
                            target: {
                              type: "ArrayAccess",
                              name: "arr",
                              children: [{ type: "Literal", value: "0" }],
                            },
                            op: "++",
                          },
                        ],
                      },
                      {
                        type: "Block",
                        children: [
                          {
                            type: "Assignment",
                            target: {
                              type: "ArrayAccess",
                              name: "arr",
                              children: [{ type: "Literal", value: "0" }],
                            },
                            op: "=",
                            children: [{ type: "Identifier", name: "i" }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
});

test("invalid: reports missing semicolons in declarations", () => {
  const tokenResult = tokenize(normalize("int x = 1"));
  assert.ok(tokenResult.tokens);
  const parseResult = parse(tokenResult.tokens || []);
  assertError(parseResult.error, {
    stage: "parse",
    message: "Expected ';' after declaration",
    line: 1,
    column: 10,
  });
});

test("invalid: rejects unsupported keywords", () => {
  const tokenResult = tokenize(normalize("return 1;"));
  assert.ok(tokenResult.tokens);
  const parseResult = parse(tokenResult.tokens || []);
  assertError(parseResult.error, {
    stage: "parse",
    message: "Unsupported keyword 'return'",
    line: 1,
    column: 1,
  });
});

test("invalid: rejects invalid assignment targets", () => {
  const tokenResult = tokenize(normalize("x = (a + b) = 1;"));
  assert.ok(tokenResult.tokens);
  const parseResult = parse(tokenResult.tokens || []);
  assertError(parseResult.error, {
    stage: "parse",
    message: "Invalid assignment target",
    line: 1,
    column: 13,
  });
});

test("extreme: parses deeply chained logical expressions", () => {
  const ast = parseSource("flag = a && b && c && d && e && f;");
  const assignment = (ast as { children: Array<{ children: unknown[] }> }).children[0];
  assert.deepEqual(compactAst(assignment), {
    type: "Assignment",
    target: { type: "Identifier", name: "flag" },
    op: "=",
    children: [
      {
        type: "Binary",
        op: "&&",
        children: [
          {
            type: "Binary",
            op: "&&",
            children: [
              {
                type: "Binary",
                op: "&&",
                children: [
                  {
                    type: "Binary",
                    op: "&&",
                    children: [
                      {
                        type: "Binary",
                        op: "&&",
                        children: [
                          { type: "Identifier", name: "a" },
                          { type: "Identifier", name: "b" },
                        ],
                      },
                      { type: "Identifier", name: "c" },
                    ],
                  },
                  { type: "Identifier", name: "d" },
                ],
              },
              { type: "Identifier", name: "e" },
            ],
          },
          { type: "Identifier", name: "f" },
        ],
      },
    ],
  });
});

test("extreme: parses long property and method chains as call statements", () => {
  const ast = parseSource("System.out.println(obj.inner.more.getValue(1));");
  assert.deepEqual(compactAst(ast), {
    type: "Program",
    children: [
      {
        type: "CallStatement",
        child: {
          type: "MethodCall",
          object: {
            type: "Property",
            object: { type: "Identifier", name: "System" },
            name: "out",
          },
          name: "println",
          children: [
            {
              type: "MethodCall",
              object: {
                type: "Property",
                object: {
                  type: "Property",
                  object: { type: "Identifier", name: "obj" },
                  name: "inner",
                },
                name: "more",
              },
              name: "getValue",
              children: [{ type: "Literal", value: "1" }],
            },
          ],
        },
      },
    ],
  });
});

test("extreme: parses long else-if chains without collapsing branches", () => {
  const ast = parseSource(`
if (a) x = 1;
else if (b) x = 2;
else if (c) x = 3;
else if (d) x = 4;
else x = 5;
`);
  const root = compactAst(ast) as { children: unknown[] };
  assert.equal(root.children.length, 1);
  assert.deepEqual(root.children[0], {
    type: "If",
    children: [
      { type: "Identifier", name: "a" },
      {
        type: "Assignment",
        target: { type: "Identifier", name: "x" },
        op: "=",
        children: [{ type: "Literal", value: "1" }],
      },
      {
        type: "If",
        children: [
          { type: "Identifier", name: "b" },
          {
            type: "Assignment",
            target: { type: "Identifier", name: "x" },
            op: "=",
            children: [{ type: "Literal", value: "2" }],
          },
          {
            type: "If",
            children: [
              { type: "Identifier", name: "c" },
              {
                type: "Assignment",
                target: { type: "Identifier", name: "x" },
                op: "=",
                children: [{ type: "Literal", value: "3" }],
              },
              {
                type: "If",
                children: [
                  { type: "Identifier", name: "d" },
                  {
                    type: "Assignment",
                    target: { type: "Identifier", name: "x" },
                    op: "=",
                    children: [{ type: "Literal", value: "4" }],
                  },
                  {
                    type: "Assignment",
                    target: { type: "Identifier", name: "x" },
                    op: "=",
                    children: [{ type: "Literal", value: "5" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
});
