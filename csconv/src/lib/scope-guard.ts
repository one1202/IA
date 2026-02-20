import { err, ConvertError } from "./errors";

/**
 * Reject out-of-scope Java constructs before parsing.
 */
export function scopeGuard(source: string): ConvertError | null {
  const banned = [
    { re: /\binterface\b/, why: "Interfaces are out of scope." },
    { re: /\bimplements\b/, why: "Interfaces are out of scope." },
    { re: /\bextends\b/, why: "Inheritance is out of scope." },
    { re: /\bthrows\b/, why: "Exceptions are out of scope." },
    { re: /\btry\b/, why: "Exceptions are out of scope." },
    { re: /\bcatch\b/, why: "Exceptions are out of scope." },
    { re: /\bswitch\b/, why: "Switch is out of scope." },
    { re: /\bgeneric\s*</, why: "Generics are out of scope." },
    { re: /\bclass\b.*\bclass\b/, why: "Multiple classes are out of scope." },
  ];
  for (const rule of banned) {
    if (rule.re.test(source)) {
      return err("scope", rule.why);
    }
  }
  return null;
}
