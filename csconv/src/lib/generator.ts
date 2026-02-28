import type { AstNode } from "./parser";

/**
 * Keyword shape used by each pseudocode style.
 */
type StyleKeywords = {
  if: string;
  then: string;
  else: string;
  elseIf: string;
  endIf: string;
  input: string;
  output: string;
  while?: string;
  do?: string;
  endWhile?: string;
  repeat?: string;
  until: string;
  for?: string;
  endFor?: string;
  loop?: string;
  loopWhile?: string;
  endLoop?: string;
};

/**
 * Style configuration for pseudocode formatting.
 */
type StyleConfig = {
  keyword: StyleKeywords;
  boolTrue: string;
  boolFalse: string;
  and: string;
  or: string;
  not: string;
  neq: string;
  mod: string;
  indent: string;
  wrapRelationalInAssign: boolean;
  wrapRelationalInLogical: boolean;
  wrapMulInAdd?: boolean;
  methodAlias?: Record<string, string>;
  methodTransform?: Record<
    string,
    (objectNode: AstNode, args: string[], style: StyleConfig) => string
  >;
  specialMethodMap?: Record<string, string>;
};

const RELATIONAL_OPS = new Set(["<", ">", "<=", ">=", "==", "!="]);
const LOGICAL_OPS = new Set(["&&", "||"]);

/**
 * Unified style configuration shared across SC outputs.
 */
const UNIFIED_STYLE: StyleConfig = {
  keyword: {
    if: "if",
    then: "then",
    else: "else",
    elseIf: "else if",
    endIf: "end if",
    input: "input",
    output: "output",
    loop: "loop",
    loopWhile: "loop while",
    endLoop: "end loop",
    until: "until",
    while: "while",
    do: "do",
    endWhile: "end while",
    repeat: "repeat",
    for: "for",
    endFor: "end for",
  },
  boolTrue: "true",
  boolFalse: "false",
  and: "and",
  or: "or",
  not: "not",
  neq: "<>",
  mod: "mod",
  indent: "    ",
  wrapRelationalInAssign: true,
  wrapRelationalInLogical: false,
  wrapMulInAdd: true,
  methodAlias: {
    add: "addItem",
  },
  methodTransform: {
    set: (objectNode, args, styleConfig) =>
      `${emitExpression(objectNode, styleConfig)}[${args[0]}] = ${args[1]}`,
    get: (objectNode, args, styleConfig) =>
      `${emitExpression(objectNode, styleConfig)}[${args[0]}]`,
    put: (objectNode, args, styleConfig) =>
      `${emitExpression(objectNode, styleConfig)}[${args[0]}] = ${args[1]}`,
    containsKey: (objectNode, args, styleConfig) =>
      `containsKey(${emitExpression(objectNode, styleConfig)}, ${args[0]})`,
    remove: (objectNode, args, styleConfig) => {
      const objectText = emitExpression(objectNode, styleConfig);
      if (objectNode.type === "Identifier" && isMapLikeName(objectNode.name)) {
        return `remove ${objectText}[${args[0]}]`;
      }
      return `${objectText}.removeItemAt(${args.join(", ")})`;
    },
    size: (objectNode, args, styleConfig) =>
      `length(${emitExpression(objectNode, styleConfig)})`,
    addAt: (objectNode, args, styleConfig) =>
      `${emitExpression(objectNode, styleConfig)}.insertItemAt(${args.join(", ")})`,
  },
  specialMethodMap: {
    "add,2": "insertItemAt",
  },
};

/**
 * Resolve the unified style used across all tests.
 */
function resolveStyle(): StyleConfig {
  return UNIFIED_STYLE;
}

/**
 * Translate operator token into styled output.
 */
function pseudoOperator(op: string, style: StyleConfig): string {
  switch (op) {
    case "&&":
      return style.and;
    case "||":
      return style.or;
    case "==":
      return "=";
    case "!=":
      return style.neq;
    case "%":
      return style.mod;
    default:
      return op;
  }
}

/**
 * Map operator to precedence weight for wrapping checks.
 */
function precedence(op: string): number {
  if (op === "||") return 1;
  if (op === "&&") return 2;
  if (op === "==" || op === "!=") return 3;
  if (op === "<" || op === ">" || op === "<=" || op === ">=") return 4;
  if (op === "+" || op === "-") return 5;
  if (op === "*" || op === "/" || op === "%") return 6;
  return 0;
}

/**
 * Determine if a node is a relational binary operation.
 */
function isRelational(node: AstNode): boolean {
  return Boolean(node && node.type === "Binary" && RELATIONAL_OPS.has(node.op));
}

/**
 * Build a property access chain (e.g. System.out) from an AST node.
 */
function getPropertyChain(node: AstNode): string[] {
  if (!node) return [];
  if (node.type === "Identifier") return [node.name];
  if (node.type === "Property") {
    return [...getPropertyChain(node.object), node.name];
  }
  return [];
}

/**
 * Check if a node references System.out.
 */
function isSystemOut(node: AstNode): boolean {
  const chain = getPropertyChain(node);
  return chain.join(".") === "System.out";
}

/**
 * Check whether a node represents Scanner input calls.
 */
function isScannerInputCall(node: AstNode): boolean {
  if (!node || node.type !== "MethodCall") return false;
  const scannerMethods = new Set([
    "nextLine",
    "nextInt",
    "nextDouble",
    "nextBoolean",
    "next",
  ]);
  if (scannerMethods.has(node.name) && node.object?.type === "Identifier") {
    return true;
  }
  if (node.name === "charAt" && node.object?.type === "MethodCall") {
    return isScannerInputCall(node.object);
  }
  return false;
}

/**
 * Heuristically detect map-like identifiers for remove output.
 */
function isMapLikeName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("map") || lower.includes("dict");
}

/**
 * Decide if child expression requires parentheses.
 */
function shouldWrapChild(child: AstNode, parentOp: string, style: StyleConfig): boolean {
  if (!child || child.type !== "Binary") return false;
  if (style.wrapMulInAdd && parentOp === "-" && ["*", "/", "%"].includes(child.op)) {
    return true;
  }
  if (LOGICAL_OPS.has(parentOp) && RELATIONAL_OPS.has(child.op)) {
    return style.wrapRelationalInLogical;
  }
  return precedence(child.op) < precedence(parentOp);
}

/**
 * Emit expression text for a node.
 */
function emitExpression(node: AstNode, style: StyleConfig): string {
  switch (node.type) {
    case "Literal":
      if (node.value === "true") return style.boolTrue;
      if (node.value === "false") return style.boolFalse;
      return node.value;
    case "Identifier":
      return node.name;
    case "Property":
      return `${emitExpression(node.object, style)}.${node.name}`;
    case "Call": {
      const args = node.children.map((arg: AstNode) => emitExpression(arg, style));
      return `${node.name}(${args.join(", ")})`;
    }
    case "MethodCall": {
      const args = node.children.map((arg: AstNode) => emitExpression(arg, style));
      if (node.name === "remove") {
        const objectText = emitExpression(node.object, style);
        if (node.object.type === "Identifier" && isMapLikeName(node.object.name)) {
          return `remove ${objectText}[${args[0]}]`;
        }
        return `${objectText}.removeItemAt(${args.join(", ")})`;
      }
      const argKey = `${node.name},${args.length}`;
      if (style.specialMethodMap && style.specialMethodMap[argKey]) {
        const mapped = style.specialMethodMap[argKey];
        return `${emitExpression(node.object, style)}.${mapped}(${args.join(", ")})`;
      }
      if (style.methodAlias && style.methodAlias[node.name]) {
        const alias = style.methodAlias[node.name];
        return `${emitExpression(node.object, style)}.${alias}(${args.join(", ")})`;
      }
      if (style.methodTransform && style.methodTransform[node.name]) {
        return style.methodTransform[node.name](node.object, args, style);
      }
      return `${emitExpression(node.object, style)}.${node.name}(${args.join(", ")})`;
    }
    case "ArrayAccess": {
      const indexText = node.children.map((child: AstNode) => emitExpression(child, style)).join("][");
      return `${node.name}[${indexText}]`;
    }
    case "Length":
      return `length(${emitExpression(node.children[0], style)})`;
    case "NewArray": {
      const dims = node.children.map((dim: AstNode) => emitExpression(dim, style));
      return `new array[${dims.join("][")}]`;
    }
    case "ArrayLiteral": {
      const values = node.children.map((child: AstNode) => emitExpression(child, style));
      return `[${values.join(", ")}]`;
    }
    case "Unary": {
      const inner = emitExpression(node.children[0], style);
      const needsParens = node.children[0]?.type === "Binary";
      if (node.op === "!") {
        return `${style.not} ${inner}`;
      }
      return `${node.op}${needsParens ? `(${inner})` : inner}`;
    }
    case "UnaryPostfix": {
      if (node.op === "++") {
        return `${emitExpression(node.children[0], style)} + 1`;
      }
      if (node.op === "--") {
        return `${emitExpression(node.children[0], style)} - 1`;
      }
      return `${emitExpression(node.children[0], style)} ${pseudoOperator(node.op, style)}`;
    }
    case "Update": {
      const target = emitExpression(node.target, style);
      const opText = node.op === "++" ? "+" : "-";
      return `${target} = ${target} ${opText} 1`;
    }
    case "Binary": {
      if (node.op === "||" || node.op === "&&") {
        const chain = flattenLogicalChain(node.op, node);
        const wrapRel = style.wrapRelationalInLogical;
        const rendered = chain.map((child) => {
          const text = emitExpression(child, style);
          if (wrapRel && isRelational(child)) return `(${text})`;
          return text;
        });
        return rendered.join(` ${pseudoOperator(node.op, style)} `);
      }
      const leftNode = node.children[0];
      const rightNode = node.children[1];
      let left = emitExpression(leftNode, style);
      let right = emitExpression(rightNode, style);
      if (shouldWrapChild(leftNode, node.op, style)) left = `(${left})`;
      if (shouldWrapChild(rightNode, node.op, style)) right = `(${right})`;
      return `${left} ${pseudoOperator(node.op, style)} ${right}`;
    }
    default:
      return "<?>";
  }
}

/**
 * Apply style rules when formatting assignment RHS.
 */
function formatRhs(expr: AstNode, style: StyleConfig): string {
  const text = emitExpression(expr, style);
  if (style.wrapRelationalInAssign && isRelational(expr)) return `(${text})`;
  return text;
}

/**
 * Format an assignment-like node into a single line.
 */
function formatAssignmentLine(node: AstNode, style: StyleConfig): string {
  if (node.type !== "Assignment" && node.type !== "AssignmentExpr") {
    return "<?>"; 
  }
  const target = emitExpression(node.target, style);
  const rhs = node.children[0];
  const op = node.op || "=";
  if (op === "=") {
    return `${target} = ${formatRhs(rhs, style)}`;
  }
  const opMap: Record<string, string> = {
    "+=": "+",
    "-=": "-",
    "*=": "*",
    "/=": "/",
    "%=": "%",
  };
  const binOp = opMap[op];
  const exprText = emitExpression(rhs, style);
  return `${target} = ${target} ${pseudoOperator(binOp, style)} ${exprText}`;
}

/**
 * Flatten chained string concatenations into a list of nodes.
 */
function flattenConcat(node: AstNode): AstNode[] {
  if (node.type === "Binary" && node.op === "+" && nodeContainsStringLiteral(node)) {
    const left = node.children[0];
    const right = node.children[1];
    const leftParts =
      left.type === "Binary" && left.op === "+" && nodeContainsStringLiteral(left)
        ? flattenConcat(left)
        : [left];
    const rightParts =
      right.type === "Binary" && right.op === "+" && nodeContainsStringLiteral(right)
        ? flattenConcat(right)
        : [right];
    return [...leftParts, ...rightParts];
  }
  return [node];
}

/**
 * Check if a node is a string literal.
 */
function isStringLiteral(node: AstNode): boolean {
  return node.type === "Literal" && typeof node.value === "string" && node.value.startsWith("\"");
}

/**
 * Check if a node subtree contains any string literal.
 */
function nodeContainsStringLiteral(node: AstNode): boolean {
  if (isStringLiteral(node)) return true;
  const children = "children" in node ? (node.children || []) : [];
  if (node.type === "Property" && node.object) {
    return nodeContainsStringLiteral(node.object);
  }
  if (node.type === "ArrayAccess" || node.type === "NewArray" || node.type === "ArrayLiteral") {
    return children.some((child: AstNode) => nodeContainsStringLiteral(child));
  }
  if (node.type === "Call" || node.type === "MethodCall" || node.type === "Binary" || node.type === "Unary") {
    return children.some((child: AstNode) => nodeContainsStringLiteral(child));
  }
  return false;
}

/**
 * Check if any node in a list is a string literal.
 */
function containsStringLiteral(nodes: AstNode[]): boolean {
  return nodes.some((node) => isStringLiteral(node));
}

/**
 * Format an expression for output statements.
 */
function formatOutputExpression(node: AstNode, style: StyleConfig, wrapBinary = false): string {
  const text = emitExpression(node, style);
  if (node.type === "Binary") return wrapBinary ? `(${text})` : text;
  return text;
}

/**
 * Format the arguments to output from a single expression.
 */
function formatOutputArgsFromExpression(expr: AstNode, style: StyleConfig): string[] {
  const parts = flattenConcat(expr);
  if (parts.length > 1 && containsStringLiteral(parts)) {
    return parts.map((part) =>
      isStringLiteral(part) ? part.value : formatOutputExpression(part, style, true)
    );
  }
  return [formatOutputExpression(expr, style, false)];
}

/**
 * Format output arguments from a System.out call.
 */
function formatOutputArgsFromCall(call: AstNode, style: StyleConfig): string[] {
  if (!call.children || call.children.length === 0) return [];
  if (call.children.length === 1) {
    return formatOutputArgsFromExpression(call.children[0], style);
  }
  return call.children.map((arg: AstNode) => formatOutputExpression(arg, style, false));
}

/**
 * Format System.out print/println calls as output statements.
 */
function formatSystemOutCall(call: AstNode, style: StyleConfig): string | null {
  if (call.type !== "MethodCall") return null;
  if (call.name !== "print" && call.name !== "println") return null;
  if (!isSystemOut(call.object)) return null;
  const args = formatOutputArgsFromCall(call, style);
  if (args.length === 0) return style.keyword.output;
  return `${style.keyword.output} ${args.join(", ")}`;
}

/**
 * Format a statement expression, handling System.out output when applicable.
 */
function formatStatementExpression(node: AstNode, style: StyleConfig): string {
  const outputLine = formatSystemOutCall(node, style);
  return outputLine || emitExpression(node, style);
}

/**
 * Flatten chained logical expressions into a list.
 */
function flattenLogicalChain(op: "||" | "&&", node: AstNode): AstNode[] {
  if (node.type === "Binary" && node.op === op) {
    return [
      ...flattenLogicalChain(op, node.children[0]),
      ...flattenLogicalChain(op, node.children[1]),
    ];
  }
  return [node];
}

/**
 * Invert condition for loop-until output.
 */
function invertCondition(node: AstNode): AstNode {
  if (node.type === "Unary" && node.op === "!") {
    return node.children[0];
  }
  if (node.type === "Binary") {
    const inverseMap: Record<string, string> = {
      "<": ">=",
      "<=": ">",
      ">": "<=",
      ">=": "<",
      "==": "!=",
      "!=": "==",
    };
    if (inverseMap[node.op]) {
      return { type: "Binary", op: inverseMap[node.op], children: node.children } as AstNode;
    }
  }
  return { type: "Unary", op: "!", children: [node] } as AstNode;
}

/**
 * Format Java for-loop into IB-style loop syntax.
 */
function formatForLoop(
  init: AstNode | null,
  test: AstNode | null,
  update: AstNode | null,
  style: StyleConfig
): string {
  const name =
    init && init.type === "Assignment"
      ? emitExpression(init.target, style)
      : init && init.type === "Declaration"
      ? init.name
      : "";
  const start =
    init && init.type === "Assignment"
      ? emitExpression(init.children[0], style)
      : init && init.type === "Declaration"
      ? init.children[0]
        ? emitExpression(init.children[0], style)
        : "0"
      : "0";

  let step = "1";
  let direction = "to";
  if (update && update.type === "Update") {
    if (update.op === "--") {
      direction = "downto";
      step = "1";
    }
  } else if (update && (update.type === "Assignment" || update.type === "AssignmentExpr")) {
    const op = update.op;
    const rhs = emitExpression(update.children[0], style);
    if (op === "+=") {
      step = rhs;
      direction = "to";
    } else if (op === "-=") {
      step = rhs;
      direction = "downto";
    }
  }

  let endText = "";
  if (test && test.type === "Binary") {
    const op = test.op;
    const rhsNode = test.children[1];
    const rhsText = emitExpression(rhsNode, style);
    if (op === "<") {
      if (rhsNode.type === "Literal") {
        const rhsNum = Number(rhsText);
        const stepNum = Number(step);
        if (!Number.isNaN(rhsNum) && !Number.isNaN(stepNum) && stepNum > 0) {
          endText = `${rhsNum - stepNum}`;
        } else {
          endText = `${rhsNum - 1}`;
        }
      } else {
        endText = `${rhsText} - ${step}`;
      }
    } else if (op === "<=") {
      endText = rhsText;
    } else if (op === ">") {
      if (rhsNode.type === "Literal") {
        const rhsNum = Number(rhsText);
        const stepNum = Number(step);
        if (!Number.isNaN(rhsNum) && !Number.isNaN(stepNum) && stepNum > 0) {
          endText = `${rhsNum + stepNum}`;
        } else {
          endText = `${rhsNum + 1}`;
        }
      } else {
        endText = `${rhsText} + ${step}`;
      }
      direction = "downto";
    } else if (op === ">=") {
      endText = rhsText;
      direction = "downto";
    }
  }

  const stepText = step === "1" ? "" : ` step ${step}`;
  return `${name} from ${start} ${direction} ${endText}${stepText}`.trim();
}

/**
 * Collect an if/else-if/else chain into a list.
 */
function collectIfChain(node: AstNode): { chain: Array<{ test: AstNode; consequent: AstNode }>; finalElse: AstNode | null } {
  const chain: Array<{ test: AstNode; consequent: AstNode }> = [];
  let current: AstNode | null = node;
  while (current && current.type === "If") {
    const [test, consequent, alternate] = current.children;
    chain.push({ test, consequent });
    if (alternate && alternate.type === "If") {
      current = alternate;
    } else {
      return { chain, finalElse: (alternate as AstNode) || null };
    }
  }
  return { chain, finalElse: null };
}

/**
 * Generate pseudocode lines from the parsed AST.
 */
export function generatePseudocode(ast: AstNode): string {
  const style = resolveStyle();
  const lines: string[] = [];
  const walk = (node: AstNode, depth = 0) => {
    const pad = style.indent.repeat(depth);
    switch (node.type) {
      case "Program":
        node.children.forEach((child: AstNode) => walk(child, depth));
        break;
      case "Block":
        node.children.forEach((child: AstNode) => walk(child, depth));
        break;
      case "Declaration": {
        if (!node.children[0]) {
          lines.push(`${pad}${node.name}`);
          break;
        }
        if (isScannerInputCall(node.children[0])) {
          lines.push(`${pad}${style.keyword.input} ${node.name}`);
          break;
        }
        const rhs = formatRhs(node.children[0], style);
        lines.push(`${pad}${node.name} = ${rhs}`);
        break;
      }
      case "Assignment": {
        const rhs = node.children[0];
        if (isScannerInputCall(rhs)) {
          lines.push(`${pad}${style.keyword.input} ${emitExpression(node.target, style)}`);
          break;
        }
        lines.push(`${pad}${formatAssignmentLine(node, style)}`);
        break;
      }
      case "Update": {
        const target = emitExpression(node.target, style);
        const opText = node.op === "++" ? "+" : "-";
        lines.push(`${pad}${target} = ${target} ${opText} 1`);
        break;
      }
      case "AssignmentExpr": {
        const rhs = node.children[0];
        if (isScannerInputCall(rhs)) {
          lines.push(`${pad}${style.keyword.input} ${emitExpression(node.target, style)}`);
          break;
        }
        lines.push(`${pad}${formatAssignmentLine(node, style)}`);
        break;
      }
      case "CallStatement": {
        lines.push(`${pad}${formatStatementExpression(node.child, style)}`);
        break;
      }
      case "ExpressionStatement": {
        lines.push(`${pad}${formatStatementExpression(node.child, style)}`);
        break;
      }
      case "If": {
        const { chain, finalElse } = collectIfChain(node);
        chain.forEach((item, index) => {
          const head = index === 0 ? style.keyword.if : style.keyword.elseIf;
          lines.push(`${pad}${head} ${emitExpression(item.test, style)} ${style.keyword.then}`);
          walk(item.consequent, depth + 1);
        });
        if (finalElse) {
          lines.push(`${pad}${style.keyword.else}`);
          walk(finalElse, depth + 1);
        }
        lines.push(`${pad}${style.keyword.endIf}`);
        break;
      }
      case "While": {
        const [test, body] = node.children;
        if (style.keyword.loopWhile) {
          lines.push(`${pad}${style.keyword.loopWhile} ${emitExpression(test, style)}`);
          walk(body, depth + 1);
          lines.push(`${pad}${style.keyword.endLoop}`);
        } else {
          lines.push(`${pad}${style.keyword.while} ${emitExpression(test, style)} ${style.keyword.do}`);
          walk(body, depth + 1);
          lines.push(`${pad}${style.keyword.endWhile}`);
        }
        break;
      }
      case "DoWhile": {
        const [body, test] = node.children;
        if (style.keyword.loop) {
          lines.push(`${pad}${style.keyword.loop}`);
          walk(body, depth + 1);
          lines.push(`${pad}${style.keyword.until} ${emitExpression(invertCondition(test), style)}`);
        } else {
          lines.push(`${pad}${style.keyword.repeat}`);
          walk(body, depth + 1);
          lines.push(`${pad}${style.keyword.until} ${emitExpression(test, style)}`);
        }
        break;
      }
      case "For": {
        const [init, test, update, body] = node.children;
        if (style.keyword.loop) {
          const loop = formatForLoop(init, test, update, style);
          lines.push(`${pad}${style.keyword.loop} ${loop}`);
          if (body) walk(body, depth + 1);
          lines.push(`${pad}${style.keyword.endLoop}`);
        } else {
          const initText =
            init && init.type === "Declaration"
              ? `${init.name} = ${init.children[0] ? emitExpression(init.children[0], style) : "0"}`
              : init && init.type === "Assignment"
              ? `${emitExpression(init.target, style)} = ${emitExpression(init.children[0], style)}`
              : "";
          const condText = test ? emitExpression(test, style) : "";
          const updateText =
            update && update.type === "Binary"
              ? `${emitExpression(update.children[0], style)} ${pseudoOperator(update.op, style)} ${emitExpression(
                  update.children[1],
                  style
                )}`
              : update
              ? emitExpression(update, style)
              : "";
          lines.push(`${pad}${style.keyword.for} ${initText} ; ${condText} ; ${updateText}`);
          if (body) walk(body, depth + 1);
          lines.push(`${pad}${style.keyword.endFor}`);
        }
        break;
      }
      default:
        lines.push(`${pad}/* unsupported node ${node.type} */`);
    }
  };
  walk(ast, 0);
  return lines.join("\n");
}
