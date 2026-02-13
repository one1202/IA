#!/usr/bin/env node
/** @file CLI entry for Java → pseudocode conversion. */
const fs = require("fs");
const path = require("path");
const { convertJavaToPseudo } = require("./csconv/converter.cjs");

/**
 * CLI-facing conversion wrapper.
 * @param {string} source
 * @returns {{pseudocode?: string, errors?: Array}}
 */
const convert = (source) => convertJavaToPseudo(source);

/**
 * Execute CLI when invoked directly.
 */
if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node IA.js <java-file>");
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }
  const src = fs.readFileSync(abs, "utf8");
  const result = convert(src);
  if (result.errors) {
    console.error(JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }
  console.log(result.pseudocode);
}

module.exports = { convert };
