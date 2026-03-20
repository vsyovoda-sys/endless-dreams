import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getUserInfo } from "@/lib/secondme";
import { prisma } from "@/lib/prisma";

/**
 * GET /callback — 短路径 OAuth 回调
 *
 * Second Me 要求的 redirect_uri，完整处理 code→token→upsert→session
 * login 路由也需同步使用 /callback 作为 redirectUri
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const savedState = request.cookies.get("oauth_state")?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=invalid_state`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=no_code`
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/callback`;
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    const userInfo = await getUserInfo(tokenData.accessToken);

    const user = await prisma.user.upsert({
      where: { secondMeUserId: userInfo.userId },
      update: {
        name: userInfo.name,
        avatar: userInfo.avatar,
        bio: userInfo.bio,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
      },
      create: {
        secondMeUserId: userInfo.userId,
        name: userInfo.name,
        avatar: userInfo.avatar,
        bio: userInfo.bio,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
      },
    });

    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dream`);
    response.cookies.set("session_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=auth_failed`
    );
  }
}
