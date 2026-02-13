/**
 * Normalize Java source by standardizing whitespace and stripping comments.
 * @param {string} source
 * @returns {string}
 */
/**
 * Normalize Java source by standardizing whitespace and stripping comments.
 * @param {string} source
 * @returns {string}
 */
function normalize(source) {
  let text = source.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
  // Remove block comments while preserving line breaks
  text = text.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    return match.replace(/[^\n]/g, " ");
  });
  // Remove line comments
  text = text.replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
  return text;
}

module.exports = { normalize };
