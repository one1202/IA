/**
 * Create a structured error for conversion stages.
 * @param {string} stage
 * @param {string} message
 * @param {number} [line]
 * @param {number} [column]
 * @returns {{stage:string,message:string,line:number,column:number}}
 */
/**
 * Create a structured error for conversion stages.
 * @param {string} stage
 * @param {string} message
 * @param {number} [line]
 * @param {number} [column]
 * @returns {{stage:string,message:string,line:number,column:number}}
 */
function err(stage, message, line = 1, column = 1) {
  return { stage, message, line, column };
}

module.exports = { err };
