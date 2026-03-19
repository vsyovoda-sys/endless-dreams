import { NextRequest, NextResponse } from "next/server";
import { getOAuthURL } from "@/lib/secondme";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  const url = getOAuthURL(redirectUri, state);

  const response = NextResponse.redirect(url);
  // 将 state 存入 cookie 以便回调时验证
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 分钟
    path: "/",
  });

  return response;
}
