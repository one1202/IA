import { err } from "./errors";
import type { Token } from "./tokenize";

export type AstNode = {
  type: string;
  [key: string]: any;
};

/**
 * Recursive-descent parser for the Java subset.
 */
class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /** @returns current token */
  current(): Token {
    return this.tokens[this.pos];
  }

  /** Consume token if it matches type/value. */
  match(type: string, value?: string): Token | false {
    const tok = this.current();
    if (!tok) return false;
    if (tok.type !== type) return false;
    if (value !== undefined && tok.value !== value) return false;
    this.pos += 1;
    return tok;
  }

  /** Expect token and throw structured parse error when missing. */
  expect(type: string, value?: string, message?: string): Token {
    const tok = this.match(type, value);
    if (!tok) {
      const cur = this.current() || { line: 0, col: 0 };
      throw err("parse", message || `Expected ${value || type}`, cur.line, cur.col);
    }
    return tok;
  }

  /** Parse top-level program, skipping class/main wrappers when present. */
  parseProgram(): AstNode {
    while (
      this.current().type === "keyword" &&
      (this.current().value === "public" || this.current().value === "static")
    ) {
      if (this.tokens[this.pos + 1]?.value === "class") {
        this.pos += 1;
        continue;
      }
      this.pos += 1;
    }

    if (this.match("keyword", "class")) {
      while (!this.match("brace", "{")) {
        if (this.current().type === "eof") {
          throw err(
            "parse",
            "Expected '{' after class declaration",
            this.current().line,
            this.current().col
          );
        }
        this.pos += 1;
      }
    }

    if (this.current().type === "keyword") {
      const v = this.current().value;
      if (v === "public" || v === "static" || v === "void") {
        while (this.current().type !== "brace" && this.current().type !== "eof") {
          this.pos += 1;
        }
        if (this.current().type === "brace" && this.current().value === "{") {
          const mainBlock = this.parseBlock();
          while (this.current().type === "brace") this.pos += 1;
          return { type: "Program", children: mainBlock.children };
        }
      }
    }

    const statements: AstNode[] = [];
    while (this.current().type !== "eof" && this.current().type !== "brace") {
      statements.push(this.parseStatement());
    }
    return { type: "Program", children: statements };
  }

  /** Parse a statement node. */
  parseStatement(): AstNode {
    const tok = this.current();
    if (tok.type === "keyword") {
      switch (tok.value) {
        case "if":
          return this.parseIf();
        case "while":
          return this.parseWhile();
        case "for":
          return this.parseFor();
        case "do":
          return this.parseDoWhile();
        case "int":
        case "double":
        case "float":
        case "boolean":
        case "char":
        case "String":
          return this.parseDeclaration();
        default:
          throw err("parse", `Unsupported keyword '${tok.value}'`, tok.line, tok.col);
      }
    }
    if (tok.type === "brace" && tok.value === "{") {
      return this.parseBlock();
    }
    if (tok.type === "identifier") {
      if (this.isUpdateStatementAhead()) {
        return this.parseUpdateStatement();
      }
      if (this.isCallStatementAhead()) {
        return this.parseCallStatement();
      }
      if (this.isAssignmentAhead()) {
        return this.parseAssignment();
      }
      return this.parseExpressionStatement();
    }
    throw err("parse", `Unexpected token '${tok.value || tok.type}'`, tok.line, tok.col);
  }

  isAssignmentAhead(): boolean {
    const next = this.tokens[this.pos + 1];
    if (!next) return false;
    if (next.type === "operator") return true;
    if (next.type !== "bracket" || next.value !== "[") return false;
    let depth = 0;
    let lastCloseIndex = -1;
    for (let i = this.pos + 1; i < this.tokens.length; i += 1) {
      const tok = this.tokens[i];
      if (tok.type === "bracket" && tok.value === "[") depth += 1;
      if (tok.type === "bracket" && tok.value === "]") {
        depth -= 1;
        if (depth === 0) lastCloseIndex = i;
      }
      if (depth === 0 && lastCloseIndex !== -1 && i > lastCloseIndex) {
        const after = this.tokens[lastCloseIndex + 1];
        return !!(after && after.type === "operator");
      }
    }
    return false;
  }

  isCallStatementAhead(): boolean {
    const next = this.tokens[this.pos + 1];
    return !!(next && next.type === "dot");
  }

  isUpdateStatementAhead(): boolean {
    const next = this.tokens[this.pos + 1];
    if (!next) return false;
    if (next.type === "operator" && (next.value === "++" || next.value === "--")) {
      return true;
    }
    if (next.type !== "bracket" || next.value !== "[") return false;
    let depth = 0;
    let lastCloseIndex = -1;
    for (let i = this.pos + 1; i < this.tokens.length; i += 1) {
      const tok = this.tokens[i];
      if (tok.type === "bracket" && tok.value === "[") depth += 1;
      if (tok.type === "bracket" && tok.value === "]") {
        depth -= 1;
        if (depth === 0) lastCloseIndex = i;
      }
      if (depth === 0 && lastCloseIndex !== -1 && i > lastCloseIndex) {
        const after = this.tokens[lastCloseIndex + 1];
        return !!(
          after &&
          after.type === "operator" &&
          (after.value === "++" || after.value === "--")
        );
      }
    }
    return false;
  }

  parseExpressionStatement(): AstNode {
    const expr = this.parseExpression();
    this.expect("semicolon", ";", "Expected ';' after expression");
    return { type: "ExpressionStatement", child: expr };
  }

  parseBlock(): AstNode {
    this.expect("brace", "{", "Expected '{' to start block");
    const statements: AstNode[] = [];
    while (this.current().type !== "brace" && this.current().type !== "eof") {
      statements.push(this.parseStatement());
    }
    this.expect("brace", "}", "Expected '}' to close block");
    return { type: "Block", children: statements };
  }

  parseDeclaration(): AstNode {
    const typeTok = this.current();
    this.pos += 1;
    const nameTok = this.expect("identifier", undefined, "Expected identifier in declaration");
    // Consume one or more array brackets (e.g. int[][]).
    while (this.match("bracket", "[")) {
      this.expect("bracket", "]", "Expected ']' after '[' in array declaration");
    }
    let init: AstNode | null = null;
    if (this.match("operator", "=")) {
      init = this.parseExpression();
    }
    this.expect("semicolon", ";", "Expected ';' after declaration");
    return {
      type: "Declaration",
      name: nameTok.value,
      dataType: typeTok.value,
      children: init ? [init] : [],
    };
  }

  parseAssignment(): AstNode {
    const nameTok = this.expect("identifier", undefined, "Expected identifier");
    let target: AstNode = { type: "Identifier", name: nameTok.value, children: [] };
    if (this.match("bracket", "[")) {
      const indexExpr = this.parseExpression();
      this.expect("bracket", "]", "Expected ']' in array access");
      let indices = [indexExpr];
      while (this.match("bracket", "[")) {
        const nextIndex = this.parseExpression();
        this.expect("bracket", "]", "Expected ']' in array access");
        indices = indices.concat(nextIndex);
      }
      target = { type: "ArrayAccess", name: nameTok.value, children: indices };
    }
    const opTok = this.expect("operator", undefined, "Expected assignment operator");
    const allowed = new Set(["=", "+=", "-=", "*=", "/=", "%="]);
    if (!allowed.has(opTok.value)) {
      throw err("parse", `Unsupported assignment operator '${opTok.value}'`, opTok.line, opTok.col);
    }
    const expr = this.parseAssignmentExpression();
    this.expect("semicolon", ";", "Expected ';' after assignment");
    return { type: "Assignment", target, op: opTok.value, children: [expr] };
  }

  parseUpdateExpression(): AstNode {
    const nameTok = this.expect("identifier", undefined, "Expected identifier");
    let target: AstNode = { type: "Identifier", name: nameTok.value, children: [] };
    if (this.match("bracket", "[")) {
      const indexExpr = this.parseExpression();
      this.expect("bracket", "]", "Expected ']' in array access");
      let indices = [indexExpr];
      while (this.match("bracket", "[")) {
        const nextIndex = this.parseExpression();
        this.expect("bracket", "]", "Expected ']' in array access");
        indices = indices.concat(nextIndex);
      }
      target = { type: "ArrayAccess", name: nameTok.value, children: indices };
    }
    const opTok = this.expect("operator", undefined, "Expected ++ or --");
    if (opTok.value !== "++" && opTok.value !== "--") {
      throw err("parse", `Unsupported update operator '${opTok.value}'`, opTok.line, opTok.col);
    }
    return { type: "Update", target, op: opTok.value, children: [] };
  }

  parseUpdateStatement(): AstNode {
    const nameTok = this.expect("identifier", undefined, "Expected identifier");
    let target: AstNode = { type: "Identifier", name: nameTok.value, children: [] };
    if (this.match("bracket", "[")) {
      const indexExpr = this.parseExpression();
      this.expect("bracket", "]", "Expected ']' in array access");
      let indices = [indexExpr];
      while (this.match("bracket", "[")) {
        const nextIndex = this.parseExpression();
        this.expect("bracket", "]", "Expected ']' in array access");
        indices = indices.concat(nextIndex);
      }
      target = { type: "ArrayAccess", name: nameTok.value, children: indices };
    }
    const opTok = this.expect("operator", undefined, "Expected ++ or --");
    if (opTok.value !== "++" && opTok.value !== "--") {
      throw err("parse", `Unsupported update operator '${opTok.value}'`, opTok.line, opTok.col);
    }
    this.expect("semicolon", ";", "Expected ';' after update");
    return { type: "Update", target, op: opTok.value, children: [] };
  }

  parseIf(): AstNode {
    this.expect("keyword", "if");
    this.expect("paren", "(", "Expected '(' after if");
    const test = this.parseExpression();
    this.expect("paren", ")", "Expected ')' after condition");
    const consequent = this.parseStatement();
    let alternate: AstNode | null = null;
    if (this.match("keyword", "else")) {
      alternate = this.parseStatement();
    }
    return { type: "If", children: [test, consequent, ...(alternate ? [alternate] : [])] };
  }

  parseWhile(): AstNode {
    this.expect("keyword", "while");
    this.expect("paren", "(", "Expected '(' after while");
    const test = this.parseExpression();
    this.expect("paren", ")", "Expected ')' after condition");
    const body = this.parseStatement();
    return { type: "While", children: [test, body] };
  }

  parseDoWhile(): AstNode {
    this.expect("keyword", "do");
    const body = this.parseStatement();
    this.expect("keyword", "while", "Expected 'while' after do-body");
    this.expect("paren", "(", "Expected '(' after while");
    const test = this.parseExpression();
    this.expect("paren", ")", "Expected ')' after condition");
    this.expect("semicolon", ";", "Expected ';' after do-while");
    return { type: "DoWhile", children: [body, test] };
  }

  parseFor(): AstNode {
    this.expect("keyword", "for");
    this.expect("paren", "(", "Expected '(' after for");
    let init: AstNode | null = null;
    if (!this.match("semicolon", ";")) {
      if (this.current().type === "keyword") {
        init = this.parseDeclaration();
      } else {
        init = this.parseAssignment();
      }
    }
    let test: AstNode | null = null;
    if (!this.match("semicolon", ";")) {
      test = this.parseExpression();
      this.expect("semicolon", ";", "Expected ';' after for-condition");
    }
    let update: AstNode | null = null;
    if (!this.match("paren", ")")) {
      if (this.current().type === "identifier") {
        const next = this.tokens[this.pos + 1];
        if (next && next.type === "operator" && (next.value === "++" || next.value === "--")) {
          update = this.parseUpdateExpression();
        } else if (next && next.type === "operator") {
          update = this.parseExpression();
        } else {
          update = this.parseExpression();
        }
      } else {
        update = this.parseExpression();
      }
      this.expect("paren", ")", "Expected ')' after for-update");
    }
    const body = this.parseStatement();
    return { type: "For", children: [init, test, update, body].filter(Boolean) };
  }

  parseExpression(): AstNode {
    return this.parseAssignmentExpression();
  }

  parseAssignmentExpression(): AstNode {
    const left = this.parseOr();
    if (this.current().type === "operator") {
      const opTok = this.current();
      const allowed = new Set(["=", "+=", "-=", "*=", "/=", "%="]);
      if (allowed.has(opTok.value)) {
        this.pos += 1;
        const right = this.parseAssignmentExpression();
        if (left.type !== "Identifier" && left.type !== "ArrayAccess") {
          throw err("parse", "Invalid assignment target", opTok.line, opTok.col);
        }
        return { type: "AssignmentExpr", target: left, op: opTok.value, children: [right] };
      }
    }
    return left;
  }

  parseOr(): AstNode {
    let expr = this.parseAnd();
    while (this.match("operator", "||")) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseAnd();
      expr = { type: "Binary", op, children: [expr, right] };
    }
    return expr;
  }

  parseAnd(): AstNode {
    let expr = this.parseEquality();
    while (this.match("operator", "&&")) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseEquality();
      expr = { type: "Binary", op, children: [expr, right] };
    }
    return expr;
  }

  parseEquality(): AstNode {
    let expr = this.parseRelational();
    while (this.match("operator", "==") || this.match("operator", "!=")) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseRelational();
      expr = { type: "Binary", op, children: [expr, right] };
    }
    return expr;
  }

  parseRelational(): AstNode {
    let expr = this.parseAdditive();
    while (
      this.match("operator", "<") ||
      this.match("operator", ">") ||
      this.match("operator", "<=") ||
      this.match("operator", ">=")
    ) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseAdditive();
      expr = { type: "Binary", op, children: [expr, right] };
    }
    return expr;
  }

  parseAdditive(): AstNode {
    let expr = this.parseMultiplicative();
    while (this.match("operator", "+") || this.match("operator", "-")) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseMultiplicative();
      expr = { type: "Binary", op, children: [expr, right] };
    }
    return expr;
  }

  parseMultiplicative(): AstNode {
    let expr = this.parseUnary();
    while (this.match("operator", "*") || this.match("operator", "/") || this.match("operator", "%")) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseUnary();
      expr = { type: "Binary", op, children: [expr, right] };
    }
    return expr;
  }

  parseUnary(): AstNode {
    if (this.match("operator", "!") || this.match("operator", "-")) {
      const op = this.tokens[this.pos - 1].value;
      const right = this.parseUnary();
      return { type: "Unary", op, children: [right] };
    }
    return this.parsePrimary();
  }

  parsePrimary(): AstNode {
    const tok = this.current();
    if (this.match("keyword", "new")) {
      return this.parseArrayCreation();
    }
    if (this.match("number")) {
      return { type: "Literal", value: tok.value, children: [] };
    }
    if (this.match("string")) {
      return { type: "Literal", value: JSON.stringify(tok.value), children: [] };
    }
    if (this.match("keyword", "true") || this.match("keyword", "false")) {
      return { type: "Literal", value: tok.value, children: [] };
    }
    if (this.match("identifier")) {
      return this.parsePostfix({ type: "Identifier", name: tok.value, children: [] });
    }
    if (this.match("paren", "(")) {
      const expr = this.parseExpression();
      this.expect("paren", ")", "Expected ')' after expression");
      return expr;
    }
    throw err("parse", `Unexpected token '${tok.value || tok.type}'`, tok.line, tok.col);
  }

  parsePostfix(base: AstNode): AstNode {
    let node = base;
    while (true) {
      if (this.match("paren", "(")) {
        const args: AstNode[] = [];
        if (!this.match("paren", ")")) {
          args.push(this.parseExpression());
          while (this.match("comma", ",")) {
            args.push(this.parseExpression());
          }
          this.expect("paren", ")", "Expected ')' after arguments");
        }
        if (node.type !== "Identifier") {
          throw err("parse", "Unsupported call target", this.current().line, this.current().col);
        }
        node = { type: "Call", name: node.name, children: args };
        continue;
      }
      if (this.match("dot", ".")) {
        const propTok = this.expect("identifier", undefined, "Expected property name");
        if (this.match("paren", "(")) {
          const args: AstNode[] = [];
          if (!this.match("paren", ")")) {
            args.push(this.parseExpression());
            while (this.match("comma", ",")) {
              args.push(this.parseExpression());
            }
            this.expect("paren", ")", "Expected ')' after arguments");
          }
          node = { type: "MethodCall", object: node, name: propTok.value, children: args };
          continue;
        }
        if (propTok.value === "length") {
          node = { type: "Length", children: [node] };
          continue;
        }
        node = { type: "Property", object: node, name: propTok.value };
        continue;
      }
      if (this.match("bracket", "[")) {
        const indexExpr = this.parseExpression();
        this.expect("bracket", "]", "Expected ']' in array access");
        let indices = [indexExpr];
        while (this.match("bracket", "[")) {
          const nextIndex = this.parseExpression();
          this.expect("bracket", "]", "Expected ']' in array access");
          indices = indices.concat(nextIndex);
        }
        node = { type: "ArrayAccess", name: emitBaseName(node), children: indices };
        continue;
      }
      if (this.match("operator", "++") || this.match("operator", "--")) {
        const op = this.tokens[this.pos - 1].value;
        node = { type: "UnaryPostfix", op, children: [node] };
        break;
      }
      break;
    }
    return node;
  }

  parseCallStatement(): AstNode {
    const base = this.expect("identifier", undefined, "Expected identifier");
    const node = this.parsePostfix({ type: "Identifier", name: base.value, children: [] });
    this.expect("semicolon", ";", "Expected ';' after call");
    return { type: "CallStatement", child: node };
  }

  parseArrayCreation(): AstNode {
    const typeTok = this.expect("keyword", undefined, "Expected type after new");
    const dimensions: Array<AstNode | null> = [];
    while (this.match("bracket", "[")) {
      if (!this.match("bracket", "]")) {
        dimensions.push(this.parseExpression());
        this.expect("bracket", "]", "Expected ']' after array size");
      } else {
        dimensions.push(null);
      }
    }
    if (dimensions.length === 0) {
      throw err("parse", "Expected '[' after array type", typeTok.line, typeTok.col);
    }
    const hasInitializer =
      dimensions[dimensions.length - 1] === null && this.match("brace", "{");
    if (hasInitializer) {
      const elements: AstNode[] = [];
      if (!this.match("brace", "}")) {
        elements.push(this.parseExpression());
        while (this.match("comma", ",")) {
          elements.push(this.parseExpression());
        }
        this.expect("brace", "}", "Expected '}' after array literal");
      }
      return { type: "ArrayLiteral", children: elements };
    }
    if (dimensions.some((d) => d === null)) {
      throw err("parse", "Expected array initializer", typeTok.line, typeTok.col);
    }
    return { type: "NewArray", dataType: typeTok.value, children: dimensions };
  }
}

/**
 * Extract a base name for array access formatting.
 */
function emitBaseName(node: AstNode): string {
  if (node.type === "Identifier") return node.name;
  if (node.type === "ArrayAccess") return node.name;
  if (node.type === "MethodCall") return emitBaseName(node.object);
  if (node.type === "Property") return `${emitBaseName(node.object)}.${node.name}`;
  return "?";
}

export function parse(tokens: Token[]): { ast: AstNode } {
  const parser = new Parser(tokens);
  const ast = parser.parseProgram();
  return { ast };
}
