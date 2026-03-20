import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/api/auth/session/route";
import { triggerA2AConversation } from "@/lib/a2a-engine";

export const maxDuration = 60;

/** POST /api/a2a/trigger — 手动触发一次 A2A 对话 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const result = await triggerA2AConversation(user.id);

    if (!result) {
      return NextResponse.json(
        { message: "当前没有可配对的对象，请先录入今天的梦境" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("A2A trigger error:", error);
    return NextResponse.json({ error: "对话触发失败" }, { status: 500 });
  }
}
