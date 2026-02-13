/**
 * Java to pseudocode converter (orchestrator).
 * Delegates to single-responsibility modules under ./logic.
 */

const { convert } = require("./logic/convert.cjs");

/** @type {{convert: Function}} */
module.exports = { convert };
