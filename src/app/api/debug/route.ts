import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await prisma.dream.count();
    return NextResponse.json({
      ok: true,
      count,
      env: {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? "set" : "missing",
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "set" : "missing",
        DATABASE_URL: process.env.DATABASE_URL ? "set" : "missing",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      error: String(e),
      env: {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? "set" : "missing",
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "set" : "missing",
        DATABASE_URL: process.env.DATABASE_URL ? "set" : "missing",
      },
    });
  }
}
