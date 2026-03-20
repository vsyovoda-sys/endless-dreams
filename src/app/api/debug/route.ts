import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL ?? "";
  try {
    const count = await prisma.dream.count();
    return NextResponse.json({
      ok: true,
      count,
      urlPrefix: url.slice(0, 30),
      urlLength: url.length,
    });
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      error: String(e),
      urlPrefix: url.slice(0, 30),
      urlLength: url.length,
      hasNewline: url.includes("\n"),
    });
  }
}
