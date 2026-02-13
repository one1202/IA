/**
 * API route to convert Java to pseudocode (server-side).
 */
import { createRequire } from "node:module";
import { NextResponse } from "next/server";

/** Force Node runtime so CJS converter can be required. */
export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const { convertJavaToPseudo } = require("../../../../converter.cjs");

/**
 * POST /api/convert
 * Body: { source: string }
 */
export async function POST(request: Request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { errors: [{ stage: "input", message: "Invalid JSON", line: 1, column: 1 }] },
      { status: 400 }
    );
  }

  const source = payload?.source;
  if (typeof source !== "string") {
    return NextResponse.json(
      { errors: [{ stage: "input", message: "Expected 'source' string", line: 1, column: 1 }] },
      { status: 400 }
    );
  }

  const result = convertJavaToPseudo(source);
  return NextResponse.json(result, { status: result.errors ? 400 : 200 });
}
