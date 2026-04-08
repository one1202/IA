/**
 * Structured error used across conversion stages.
 */
export type ErrorStage = "input" | "scope" | "tokenization" | "parse";

/**
 * Structured error used across conversion stages.
 */
export type ConvertError = {
  stage: ErrorStage;
  message: string;
  line: number;
  column: number;
};

/**
 * Create a structured error for conversion stages.
 */
export function err(
  stage: ErrorStage,
  message: string,
  line: number = 1,
  column: number = 1
): ConvertError {
  return { stage, message, line, column };
}
