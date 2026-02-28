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
export function convert(javaSource: string): ConvertResult {
  if (!javaSource || !javaSource.trim()) {
    return { errors: [err("input", "Empty input")] };
  }
  const normalized = normalize(javaSource);
  const scopeError = scopeGuard(normalized);
  if (scopeError) return { errors: [scopeError] };
  const tokenResult = tokenize(normalized);
  if (tokenResult.error) return { errors: [tokenResult.error] };

  const parseResult = parse(tokenResult.tokens || []);
  if (parseResult.error) return { errors: [parseResult.error] };
  const pseudocode = generatePseudocode(parseResult.ast as NonNullable<typeof parseResult.ast>);
  return { pseudocode };
}
