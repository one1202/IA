import { err, ConvertError } from "./errors";

/**
 * Token representation used by the parser.
 */
export type Token = {
  type: string;
  value: string;
  line: number;
  col: number;
};

const KEYWORDS = new Set([
  "if",
  "else",
  "while",
  "for",
  "do",
  "int",
  "double",
  "float",
  "boolean",
  "char",
  "String",
  "void",
  "public",
  "static",
  "class",
  "return",
  "true",
  "false",
  "new",
]);

/**
 * Tokenize normalized source into a token stream.
 */
export function tokenize(
  source: string
): { tokens?: Token[]; error?: ConvertError } {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const push = (type: string, value: string) =>
    tokens.push({ type, value, line, col });

  while (i < source.length) {
    const ch = source[i];
    if (ch === " " || ch === "\r" || ch === "\f") {
      i += 1;
      col += 1;
      continue;
    }
    if (ch === "\n") {
      i += 1;
      line += 1;
      col = 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i += 1;
      const value = source.slice(start, i);
      const type = KEYWORDS.has(value) ? "keyword" : "identifier";
      push(type, value);
      col += i - start;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const start = i;
      while (i < source.length && /[0-9]/.test(source[i])) i += 1;
      if (source[i] === ".") {
        i += 1;
        while (i < source.length && /[0-9]/.test(source[i])) i += 1;
      }
      const value = source.slice(start, i);
      push("number", value);
      col += i - start;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i += 1;
      col += 1;
      let strVal = "";
      let closed = false;
      while (i < source.length) {
        const c = source[i];
        if (c === "\\") {
          strVal += c + source[i + 1];
          i += 2;
          col += 2;
          continue;
        }
        if (c === quote) {
          closed = true;
          i += 1;
          col += 1;
          break;
        }
        if (c === "\n") {
          return {
            error: err("tokenization", "Unterminated string literal", line, col),
          };
        }
        strVal += c;
        i += 1;
        col += 1;
      }
      if (!closed) {
        return {
          error: err("tokenization", "Unterminated string literal", line, col),
        };
      }
      push("string", strVal);
      continue;
    }

    const twoChar = source.slice(i, i + 2);
    const twoOps = [
      "==",
      "!=",
      "<=",
      ">=",
      "&&",
      "||",
      "++",
      "--",
      "+=",
      "-=",
      "*=",
      "/=",
    ];
    if (twoOps.includes(twoChar)) {
      push("operator", twoChar);
      i += 2;
      col += 2;
      continue;
    }

    const singleMap: Record<string, string> = {
      "+": "operator",
      "-": "operator",
      "*": "operator",
      "/": "operator",
      "%": "operator",
      "<": "operator",
      ">": "operator",
      "=": "operator",
      "!": "operator",
      "(": "paren",
      ")": "paren",
      "{": "brace",
      "}": "brace",
      "[": "bracket",
      "]": "bracket",
      ".": "dot",
      ";": "semicolon",
      ",": "comma",
    };
    if (singleMap[ch]) {
      push(singleMap[ch], ch);
      i += 1;
      col += 1;
      continue;
    }

    return {
      error: err("tokenization", `Unsupported character '${ch}'`, line, col),
    };
  }

  tokens.push({ type: "eof", value: "", line, col });
  return { tokens };
}
