import assert from "node:assert/strict";
import test from "node:test";
import { generatePseudocode } from "../../csconv/src/lib/generator";
import type { AstNode } from "../../csconv/src/lib/parser";

test("valid: emits translated operators and wraps relational assignments", () => {
  const ast: AstNode = {
    type: "Program",
    children: [
      {
        type: "Assignment",
        target: { type: "Identifier", name: "flag", children: [] },
        op: "=",
        children: [
          {
            type: "Binary",
            op: "&&",
            children: [
              {
                type: "Binary",
                op: "==",
                children: [
                  { type: "Identifier", name: "a", children: [] },
                  { type: "Literal", value: "1", children: [] },
                ],
              },
              {
                type: "Binary",
                op: "!=",
                children: [
                  {
                    type: "Binary",
                    op: "%",
                    children: [
                      { type: "Identifier", name: "b", children: [] },
                      { type: "Literal", value: "2", children: [] },
                    ],
                  },
                  { type: "Literal", value: "0", children: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  assert.equal(generatePseudocode(ast), "flag = a = 1 and b mod 2 <> 0");
});

test("valid: converts System.out and Scanner forms", () => {
  const ast: AstNode = {
    type: "Program",
    children: [
      {
        type: "Declaration",
        name: "value",
        dataType: "int",
        children: [
          {
            type: "MethodCall",
            object: { type: "Identifier", name: "scanner", children: [] },
            name: "nextInt",
            children: [],
          },
        ],
      },
      {
        type: "CallStatement",
        child: {
          type: "MethodCall",
          object: {
            type: "Property",
            object: { type: "Identifier", name: "System", children: [] },
            name: "out",
          },
          name: "println",
          children: [{ type: "Literal", value: '"done"', children: [] }],
        },
      },
    ],
  };

  assert.equal(generatePseudocode(ast), 'input value\noutput "done"');
});

test("valid: translates ADT helpers and map-like removes", () => {
  const ast: AstNode = {
    type: "Program",
    children: [
      {
        type: "ExpressionStatement",
        child: {
          type: "MethodCall",
          object: { type: "Identifier", name: "items", children: [] },
          name: "add",
          children: [{ type: "Literal", value: "1", children: [] }],
        },
      },
      {
        type: "ExpressionStatement",
        child: {
          type: "MethodCall",
          object: { type: "Identifier", name: "myMap", children: [] },
          name: "remove",
          children: [{ type: "Literal", value: '"x"', children: [] }],
        },
      },
      {
        type: "Assignment",
        target: { type: "Identifier", name: "size", children: [] },
        op: "=",
        children: [
          {
            type: "MethodCall",
            object: { type: "Identifier", name: "items", children: [] },
            name: "size",
            children: [],
          },
        ],
      },
    ],
  };

  assert.equal(
    generatePseudocode(ast),
    'items.addItem(1)\nremove myMap["x"]\nsize = length(items)'
  );
});

test("invalid: renders unsupported nodes with a placeholder comment", () => {
  const output = generatePseudocode({
    type: "Program",
    children: [{ type: "MysteryNode" } as unknown as AstNode],
  });
  assert.equal(output, "/* unsupported node MysteryNode */");
});

test("extreme: flattens long string concatenation outputs", () => {
  const ast: AstNode = {
    type: "Program",
    children: [
      {
        type: "CallStatement",
        child: {
          type: "MethodCall",
          object: {
            type: "Property",
            object: { type: "Identifier", name: "System", children: [] },
            name: "out",
          },
          name: "println",
          children: [
            {
              type: "Binary",
              op: "+",
              children: [
                {
                  type: "Binary",
                  op: "+",
                  children: [
                    { type: "Literal", value: '"A"', children: [] },
                    { type: "Identifier", name: "x", children: [] },
                  ],
                },
                { type: "Literal", value: '"B"', children: [] },
              ],
            },
          ],
        },
      },
    ],
  };

  assert.equal(generatePseudocode(ast), 'output "A", x, "B"');
});

test("extreme: emits loop syntax for descending stepped for-loops", () => {
  const ast: AstNode = {
    type: "Program",
    children: [
      {
        type: "For",
        children: [
          {
            type: "Assignment",
            target: { type: "Identifier", name: "i", children: [] },
            op: "=",
            children: [{ type: "Literal", value: "10", children: [] }],
          },
          {
            type: "Binary",
            op: ">",
            children: [
              { type: "Identifier", name: "i", children: [] },
              { type: "Literal", value: "0", children: [] },
            ],
          },
          {
            type: "AssignmentExpr",
            target: { type: "Identifier", name: "i", children: [] },
            op: "-=",
            children: [{ type: "Literal", value: "2", children: [] }],
          },
          { type: "Block", children: [] },
        ],
      },
    ],
  };

  assert.equal(generatePseudocode(ast), "loop i from 10 downto 2 step 2\nend loop");
});

test("extreme: inverts do-while conditions into until clauses", () => {
  const ast: AstNode = {
    type: "Program",
    children: [
      {
        type: "DoWhile",
        children: [
          {
            type: "Block",
            children: [
              {
                type: "Assignment",
                target: { type: "Identifier", name: "x", children: [] },
                op: "=",
                children: [
                  {
                    type: "Binary",
                    op: "+",
                    children: [
                      { type: "Identifier", name: "x", children: [] },
                      { type: "Literal", value: "1", children: [] },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "Binary",
            op: "<",
            children: [
              { type: "Identifier", name: "x", children: [] },
              { type: "Literal", value: "10", children: [] },
            ],
          },
        ],
      },
    ],
  };

  assert.equal(generatePseudocode(ast), "loop\n    x = x + 1\nuntil x >= 10");
});
