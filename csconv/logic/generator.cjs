/** @file Pseudocode generator with formatting styles. */
const RELATIONAL_OPS = new Set(["<", ">", "<=", ">=", "==", "!="]);
const LOGICAL_OPS = new Set(["&&", "||"]);

/**
 * Resolve formatting options based on style.
 * @param {{style?: "sc-01"|"sc-02"|"sc-03"}} options
 * @returns {object}
 */
function resolveStyle(options) {
  const style = options?.style || "sc-02";
  if (style === "sc-01") {
    return {
      keyword: {
        if: "IF",
        then: "THEN",
        else: "ELSE",
        elseIf: "ELSE IF",
        endIf: "END IF",
        while: "WHILE",
        do: "DO",
        endWhile: "END WHILE",
        repeat: "REPEAT",
        until: "UNTIL",
        for: "FOR",
        endFor: "END FOR",
      },
      boolTrue: "TRUE",
      boolFalse: "FALSE",
      and: "AND",
      or: "OR",
      not: "NOT",
      neq: "!=",
      mod: "%",
      indent: "  ",
      wrapRelationalInAssign: true,
      wrapRelationalInLogical: true,
    };
  }
  if (style === "sc-03") {
    return {
      keyword: {
        if: "if",
        then: "then",
        else: "else",
        elseIf: "else if",
        endIf: "end if",
        loop: "loop",
        loopWhile: "loop while",
        endLoop: "end loop",
        until: "until",
      },
      boolTrue: "true",
      boolFalse: "false",
      and: "and",
      or: "or",
      not: "not",
      neq: "<>",
      mod: "mod",
      indent: "    ",
      wrapRelationalInAssign: false,
      wrapRelationalInLogical: true,
    };
  }
  if (style === "sc-04" || style === "sc-05") {
    return {
      keyword: {
        if: "if",
        then: "then",
        else: "else",
        elseIf: "else if",
        endIf: "end if",
        loop: "loop",
        loopWhile: "loop while",
        endLoop: "end loop",
        until: "until",
      },
      boolTrue: "true",
      boolFalse: "false",
      and: "and",
      or: "or",
      not: "not",
      neq: "<>",
      mod: "mod",
      indent: "    ",
      wrapRelationalInAssign: false,
      wrapRelationalInLogical: true,
      wrapMulInAdd: true,
    };
  }
  if (style === "sc-06") {
    return {
      keyword: {
        if: "if",
        then: "then",
        else: "else",
        elseIf: "else if",
        endIf: "end if",
        loop: "loop",
        loopWhile: "loop while",
        endLoop: "end loop",
        until: "until",
      },
      boolTrue: "true",
      boolFalse: "false",
      and: "and",
      or: "or",
      not: "not",
      neq: "<>",
      mod: "mod",
      indent: "    ",
      wrapRelationalInAssign: false,
      wrapRelationalInLogical: true,
      methodAlias: {
        add: "addItem",
      },
      methodTransform: {
        set: (objectNode, args, style) =>
          `${emitExpression(objectNode, style)}[${args[0]}] = ${args[1]}`,
        get: (objectNode, args, style) =>
          `${emitExpression(objectNode, style)}[${args[0]}]`,
        put: (objectNode, args, style) =>
          `${emitExpression(objectNode, style)}[${args[0]}] = ${args[1]}`,
        containsKey: (objectNode, args, style) =>
          `containsKey(${emitExpression(objectNode, style)}, ${args[0]})`,
        remove: (objectNode, args, style) => {
          const objectText = emitExpression(objectNode, style);
          if (objectText === "map") {
            return `remove ${objectText}[${args[0]}]`;
          }
          return `${objectText}.removeItemAt(${args.join(", ")})`;
        },
        size: (objectNode, args, style) =>
          `length(${emitExpression(objectNode, style)})`,
        addAt: (objectNode, args, style) =>
          `${emitExpression(objectNode, style)}.insertItemAt(${args.join(", ")})`,
      },
      specialMethodMap: {
        "add,2": "insertItemAt",
      },
    };
  }
  return {
    keyword: {
      if: "if",
      then: "then",
      else: "else",
      elseIf: "else if",
      endIf: "end if",
      while: "while",
      do: "do",
      endWhile: "end while",
      repeat: "repeat",
      until: "until",
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
    wrapRelationalInAssign: false,
    wrapRelationalInLogical: true,
    wrapMulInAdd: false,
  };
}

/**
 * Map an operator to style representation.
 * @param {string} op
 * @param {object} style
 * @returns {string}
 */
function pseudoOperator(op, style) {
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
 * Operator precedence for wrapping decisions.
 * @param {string} op
 * @returns {number}
 */
function precedence(op) {
  if (op === "||") return 1;
  if (op === "&&") return 2;
  if (op === "==" || op === "!=") return 3;
  if (op === "<" || op === ">" || op === "<=" || op === ">=") return 4;
  if (op === "+" || op === "-") return 5;
  if (op === "*" || op === "/" || op === "%") return 6;
  return 0;
}

/**
 * Check if a node is a relational binary operation.
 * @param {object} node
 * @returns {boolean}
 */
function isRelational(node) {
  return node && node.type === "Binary" && RELATIONAL_OPS.has(node.op);
}

/**
 * Decide when to wrap child expressions in parentheses.
 * @param {object} child
 * @param {string} parentOp
 * @param {object} style
 * @returns {boolean}
 */
function shouldWrapChild(child, parentOp, style) {
  if (!child || child.type !== "Binary") return false;
  if (style.wrapMulInAdd && parentOp === "-" && ["*", "/", "%"].includes(child.op)) {
    return true;
  }
  if ((parentOp === "==" || parentOp === "!=" || RELATIONAL_OPS.has(parentOp)) && child.op === "%") {
    return true;
  }
  if (LOGICAL_OPS.has(parentOp) && RELATIONAL_OPS.has(child.op)) {
    return style.wrapRelationalInLogical;
  }
  return precedence(child.op) < precedence(parentOp);
}

/**
 * Emit expression as string with style rules.
 * @param {object} node
 * @param {object} style
 * @returns {string}
 */
function emitExpression(node, style) {
  switch (node.type) {
    case "Literal":
      if (node.value === "true") return style.boolTrue;
      if (node.value === "false") return style.boolFalse;
      return node.value;
    case "Identifier":
      return node.name;
    case "Call": {
      const args = node.children.map((arg) => emitExpression(arg, style));
      return `${node.name}(${args.join(", ")})`;
    }
    case "MethodCall": {
      const args = node.children.map((arg) => emitExpression(arg, style));
      if (node.name === "remove") {
        if (node.object.type === "Identifier" && node.object.name === "map") {
          return `remove ${emitExpression(node.object, style)}[${args[0]}]`;
        }
        return `${emitExpression(node.object, style)}.removeItemAt(${args.join(", ")})`;
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
      const indexText = node.children.map((child) => emitExpression(child, style)).join("][");
      return `${node.name}[${indexText}]`;
    }
    case "Length":
      return `length(${emitExpression(node.children[0], style)})`;
    case "NewArray": {
      const dims = node.children.map((dim) => emitExpression(dim, style));
      return `new array[${dims.join("][")}]`;
    }
    case "ArrayLiteral": {
      const values = node.children.map((child) => emitExpression(child, style));
      return `[${values.join(", ")}]`;
    }
    case "Unary": {
      const inner = emitExpression(node.children[0], style);
      const needsParens = node.children[0]?.type === "Binary";
      if (node.op === "!") {
        return `${style.not} ${needsParens ? `(${inner})` : inner}`;
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
        const wrapRel = node.op === "&&" || (node.op === "||" && chain.length === 2);
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
 * Format RHS of assignments based on style.
 * @param {object} expr
 * @param {object} style
 * @returns {string}
 */
function formatRhs(expr, style) {
  const text = emitExpression(expr, style);
  if (style.wrapRelationalInAssign && isRelational(expr)) return `(${text})`;
  return text;
}

/**
 * Flatten chained logical expressions.
 * @param {"||"|"&&"} op
 * @param {object} node
 * @returns {object[]}
 */
/**
 * Flatten chained logical expressions.
 * @param {"||"|"&&"} op
 * @param {object} node
 * @returns {object[]}
 */
function flattenLogicalChain(op, node) {
  if (node.type === "Binary" && node.op === op) {
    return [
      ...flattenLogicalChain(op, node.children[0]),
      ...flattenLogicalChain(op, node.children[1]),
    ];
  }
  return [node];
}

/**
 * Invert a boolean condition for loop-until output.
 * @param {object} node
 * @returns {object}
 */
function invertCondition(node) {
  if (node.type === "Unary" && node.op === "!") {
    return node.children[0];
  }
  if (node.type === "Binary") {
    const inverseMap = {
      "<": ">=",
      "<=": ">",
      ">": "<=",
      ">=": "<",
      "==": "!=",
      "!=": "==",
    };
    if (inverseMap[node.op]) {
      return { type: "Binary", op: inverseMap[node.op], children: node.children };
    }
  }
  return { type: "Unary", op: "!", children: [node] };
}

/**
 * Format for-loop into "i from a to b step s" or "downto".
 * @param {object|null} init
 * @param {object|null} test
 * @param {object|null} update
 * @param {object} style
 * @returns {string}
 */
function formatForLoop(init, test, update, style) {
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
 * Flatten if/else-if chain into a list.
 * @param {object} node
 * @returns {{chain:Array, finalElse: object|null}}
 */
function collectIfChain(node) {
  const chain = [];
  let current = node;
  while (current && current.type === "If") {
    const [test, consequent, alternate] = current.children;
    chain.push({ test, consequent });
    if (alternate && alternate.type === "If") {
      current = alternate;
    } else {
      return { chain, finalElse: alternate || null };
    }
  }
  return { chain, finalElse: null };
}

/**
 * Generate pseudocode from AST.
 * @param {object} ast
 * @param {{style?: "sc-01"|"sc-02"|"sc-03"}} [options]
 * @returns {string}
 */
function generatePseudocode(ast, options = {}) {
  const style = resolveStyle(options);
  const lines = [];
  const walk = (node, depth = 0) => {
    const pad = style.indent.repeat(depth);
    switch (node.type) {
      case "Program":
        node.children.forEach((child) => walk(child, depth));
        break;
      case "Block":
        node.children.forEach((child) => walk(child, depth));
        break;
      case "Declaration": {
        if (!node.children[0]) {
          lines.push(`${pad}${node.name}`);
          break;
        }
        const rhs = formatRhs(node.children[0], style);
        lines.push(`${pad}${node.name} = ${rhs}`);
        break;
      }
    case "Assignment": {
        const target = emitExpression(node.target, style);
        const rhs = node.children[0];
        const op = node.op || "=";
        if (op === "=") {
          lines.push(`${pad}${target} = ${formatRhs(rhs, style)}`);
          break;
        }
        const opMap = {
          "+=": "+",
          "-=": "-",
          "*=": "*",
          "/=": "/",
          "%=": "%",
        };
        const binOp = opMap[op];
        const exprText = emitExpression(rhs, style);
        lines.push(`${pad}${target} = ${target} ${pseudoOperator(binOp, style)} ${exprText}`);
        break;
      }
      case "Update": {
        const target = emitExpression(node.target, style);
        const opText = node.op === "++" ? "+" : "-";
        lines.push(`${pad}${target} = ${target} ${opText} 1`);
        break;
      }
      case "AssignmentExpr": {
        const target = emitExpression(node.target, style);
        const rhs = node.children[0];
        const op = node.op || "=";
        if (op === "=") {
          lines.push(`${pad}${target} = ${formatRhs(rhs, style)}`);
          break;
        }
        const opMap = {
          "+=": "+",
          "-=": "-",
          "*=": "*",
          "/=": "/",
          "%=": "%",
        };
        const binOp = opMap[op];
        const exprText = emitExpression(rhs, style);
        lines.push(`${pad}${target} = ${target} ${pseudoOperator(binOp, style)} ${exprText}`);
        break;
      }
      case "CallStatement": {
        lines.push(`${pad}${emitExpression(node.child, style)}`);
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

module.exports = { generatePseudocode };
