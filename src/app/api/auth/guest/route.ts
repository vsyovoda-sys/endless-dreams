import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/auth/guest — 体验模式：创建访客用户，跳过 Second Me OAuth */
export async function GET() {
  const guestId = crypto.randomUUID();

  const user = await prisma.user.create({
    data: {
      secondMeUserId: `guest_${guestId}`,
      name: "梦境旅人",
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dream`
  );
  response.cookies.set("session_user_id", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
