/** @file Adapter layer for calling the converter from other modules. */
const { convert } = require("./ia.cjs");

/**
 * Public wrapper to keep a stable API for conversion.
 * Defaults to sc-03 styling unless a style override is supplied.
 * @param {string} source
 * @param {{style?: "sc-01"|"sc-02"|"sc-03"}} [options]
 * @returns {{pseudocode?: string, errors?: Array}}
 */
function convertJavaToPseudo(source, options = {}) {
  const resolvedOptions = options.style ? options : { ...options, style: "sc-03" };
  return convert(source, resolvedOptions);
}

module.exports = { convertJavaToPseudo };
