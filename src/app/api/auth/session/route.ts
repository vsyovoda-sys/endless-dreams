import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { refreshAccessToken } from "@/lib/secondme";

/** 从 cookie 获取当前登录用户，自动刷新过期 token */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  // Token 即将过期（5分钟内），自动刷新
  if (user.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const newToken = await refreshAccessToken(user.refreshToken);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accessToken: newToken.accessToken,
          refreshToken: newToken.refreshToken,
          tokenExpiresAt: new Date(Date.now() + newToken.expiresIn * 1000),
        },
      });
      return { ...user, accessToken: newToken.accessToken };
    } catch {
      return null; // refresh 失败则视为未登录
    }
  }

  return user;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
    },
  });
}
