import { NextResponse } from "next/server";

export function apiError(message: string, status = 500): NextResponse {
  console.error(`[API Error] ${message}`);
  return NextResponse.json({ error: message }, { status });
}

export function dbError(err: { message: string }, context: string): NextResponse {
  console.error(`[DB Error] ${context}:`, err.message);
  return NextResponse.json({ error: "Database error" }, { status: 500 });
}
