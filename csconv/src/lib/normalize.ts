/**
 * Normalize Java source by standardizing whitespace and stripping comments.
 * Preserves string literals so comment markers inside strings are not removed.
 */
export function normalize(source: string): string {
  const text = source.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
  const output: string[] = [];
  let i = 0;
  let inString = false;
  let stringQuote = "";

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inString) {
      output.push(ch);
      if (ch === "\\") {
        if (i + 1 < text.length) {
          output.push(text[i + 1]);
          i += 2;
          continue;
        }
      }
      if (ch === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      i += 1;
      continue;
    }

    if (ch === "\"" || ch === "'") {
      inString = true;
      stringQuote = ch;
      output.push(ch);
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      output.push(" ", " ");
      i += 2;
      while (i < text.length && text[i] !== "\n") {
        output.push(" ");
        i += 1;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      output.push(" ", " ");
      i += 2;
      while (i < text.length) {
        if (text[i] === "*" && text[i + 1] === "/") {
          output.push(" ", " ");
          i += 2;
          break;
        }
        output.push(text[i] === "\n" ? "\n" : " ");
        i += 1;
      }
      continue;
    }

    output.push(ch);
    i += 1;
  }

  return output.join("");
}
