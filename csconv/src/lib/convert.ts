import { err, type ConvertError } from "./errors";
import { normalize } from "./normalize";
import { scopeGuard } from "./scope-guard";
import { tokenize } from "./tokenize";
import { parse } from "./parser";
import { generatePseudocode } from "./generator";

/**
 * Conversion result with optional errors.
 */
export type ConvertResult = {
  pseudocode?: string;
  errors?: ConvertError[];
};

/**
 * Convert Java source to pseudocode using the unified ruleset.
 */
export function convert(
  javaSource: string,
  _options: Record<string, never> = {}
): ConvertResult {
  if (!javaSource || !javaSource.trim()) {
    return { errors: [err("input", "Empty input")] };
  }
  const normalized = normalize(javaSource);
  const scopeError = scopeGuard(normalized);
  if (scopeError) return { errors: [scopeError] };
  const tokenResult = tokenize(normalized);
  if (tokenResult.error) return { errors: [tokenResult.error] };

  let ast;
  try {
    const parseResult = parse(tokenResult.tokens || []);
    ast = parseResult.ast;
  } catch (e) {
    if (e && typeof e === "object" && "stage" in e) {
      return { errors: [e as ConvertError] };
    }
    const message = e instanceof Error ? e.message : "Parse error";
    return { errors: [err("parse", message)] };
  }

  const pseudocode = generatePseudocode(ast);
  return { pseudocode };
}
