/** @file Convert orchestration for Java → pseudocode. */
const { err } = require("./errors.cjs");
const { normalize } = require("./normalize.cjs");
const { scopeGuard } = require("./scope-guard.cjs");
const { tokenize } = require("./tokenize.cjs");
const { parse } = require("./parser.cjs");
const { generatePseudocode } = require("./generator.cjs");

/**
 * Convert Java source to pseudocode with optional formatting style.
 * @param {string} javaSource
 * @param {{style?: "sc-01"|"sc-02"|"sc-03"}} [options]
 * @returns {{pseudocode?: string, errors?: Array}}
 */
function convert(javaSource, options = {}) {
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
    const parseResult = parse(tokenResult.tokens);
    ast = parseResult.ast;
  } catch (e) {
    if (e && e.stage) return { errors: [e] };
    return { errors: [err("parse", e.message || "Parse error")] };
  }
  const pseudocode = generatePseudocode(ast, options);
  return { pseudocode };
}

module.exports = { convert };
