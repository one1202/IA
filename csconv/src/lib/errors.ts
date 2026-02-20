/**
 * Structured error used across conversion stages.
 */
export type ConvertError = {
  stage: string;
  message: string;
  line: number;
  column: number;
};

/**
 * Create a structured error for conversion stages.
 */
export function err(
  stage: string,
  message: string,
  line: number = 1,
  column: number = 1
): ConvertError {
  return { stage, message, line, column };
}
