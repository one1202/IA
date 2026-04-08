/**
 * Normalize Java source by standardizing whitespace and stripping comments.
 * Preserves string literals so comment markers inside strings are not removed.
 */
function isStringQuote(ch: string): boolean {
  return ch === "\"" || ch === "'";
}

/**
 * Copy a string literal verbatim, including escaped characters.
 */
function consumeStringLiteral(text: string, output: string[], start: number): number {
  const quote = text[start];
  output.push(quote);

  let i = start + 1;
  while (i < text.length) {
    const ch = text[i];
    output.push(ch);

    if (ch === "\\") {
      if (i + 1 < text.length) {
        output.push(text[i + 1]);
        i += 2;
        continue;
      }
      return i + 1;
    }

    if (ch === quote) {
      return i + 1;
    }

    i += 1;
  }

  return i;
}

/**
 * Replace a line comment with spaces while preserving the trailing newline.
 */
function consumeLineComment(text: string, output: string[], start: number): number {
  output.push(" ", " ");

  let i = start + 2;
  while (i < text.length && text[i] !== "\n") {
    output.push(" ");
    i += 1;
  }

  return i;
}

/**
 * Replace a block comment with spaces while preserving line structure.
 */
function consumeBlockComment(text: string, output: string[], start: number): number {
  output.push(" ", " ");

  let i = start + 2;
  while (i < text.length) {
    if (text[i] === "*" && text[i + 1] === "/") {
      output.push(" ", " ");
      return i + 2;
    }

    output.push(text[i] === "\n" ? "\n" : " ");
    i += 1;
  }

  return i;
}

export function normalize(source: string): string {
  const text = source.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
  const output: string[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (isStringQuote(ch)) {
      i = consumeStringLiteral(text, output, i);
      continue;
    }

    if (ch === "/" && next === "/") {
      i = consumeLineComment(text, output, i);
      continue;
    }

    if (ch === "/" && next === "*") {
      i = consumeBlockComment(text, output, i);
      continue;
    }

    output.push(ch);
    i += 1;
  }

  return output.join("");
}
