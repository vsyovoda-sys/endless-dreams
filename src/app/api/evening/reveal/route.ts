import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/api/auth/session/route";

/** GET /api/evening/reveal?segmentId=xxx — 揭示片段来源 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const segmentId = request.nextUrl.searchParams.get("segmentId");
  if (!segmentId) {
    return NextResponse.json({ error: "缺少 segmentId" }, { status: 400 });
  }

  const segment = await prisma.segment.findUnique({
    where: { id: segmentId },
    include: {
      eveningDream: { select: { userId: true } },
    },
  });

  if (!segment) {
    return NextResponse.json({ error: "片段不存在" }, { status: 404 });
  }

  // 只能揭示自己的晚间梦境中的片段
  if (segment.eveningDream.userId !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  if (segment.isAnonymous && !segment.originUserId) {
    // 幽灵梦境 → 标注为索拉里斯
    return NextResponse.json({
      origin: {
        type: "ghost",
        name: "索拉里斯",
        message: "这段梦来自索拉里斯——一段无人认领的梦的记忆",
      },
    });
  }

  if (segment.isAnonymous) {
    return NextResponse.json({
      origin: {
        type: "anonymous",
        message: "这段梦来自一位不愿留名的梦境旅人",
      },
    });
  }

  if (!segment.originUserId) {
    return NextResponse.json({
      origin: {
        type: "ghost",
        name: "索拉里斯",
        message: "这段梦来自索拉里斯——一段无人认领的梦的记忆",
      },
    });
  }

  // 获取来源用户信息
  const originUser = await prisma.user.findUnique({
    where: { id: segment.originUserId },
    select: { name: true, avatar: true, secondMeUserId: true },
  });

  if (!originUser) {
    return NextResponse.json({
      origin: {
        type: "anonymous",
        message: "这段梦的来源已无法追溯",
      },
    });
  }

  return NextResponse.json({
    origin: {
      type: "user",
      name: originUser.name,
      avatar: originUser.avatar,
      profileUrl: `https://second.me/${originUser.secondMeUserId}`,
      message: `这段梦的种子来自 @${originUser.name}`,
    },
  });
}
