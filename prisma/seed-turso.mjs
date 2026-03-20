/**
 * 幽灵梦境种子导入脚本（Turso / libSQL 版本）
 * 运行: node prisma/seed-turso.mjs
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ghostPath = resolve(__dirname, "../../ghost_dreams.json");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const raw = readFileSync(ghostPath, "utf-8");
const ghosts = JSON.parse(raw);

console.log(`📖 读取到 ${ghosts.length} 条幽灵梦境`);

let created = 0;
let skipped = 0;

for (const ghost of ghosts) {
  if (ghost.safety === "needs_review") {
    console.log(`⚠️  跳过 ${ghost.id}（needs_review）`);
    skipped++;
    continue;
  }
  try {
    await client.execute({
      sql: `INSERT INTO Dream (id, userId, content, contentShort, mood, isAnonymous, isGhost, safetyLevel, date, createdAt, updatedAt)
            VALUES (?, NULL, ?, ?, ?, 0, 1, ?, datetime('now'), datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              content = excluded.content,
              contentShort = excluded.contentShort,
              mood = excluded.mood,
              safetyLevel = excluded.safetyLevel,
              updatedAt = datetime('now')`,
      args: [
        ghost.id,
        ghost.content,
        ghost.content_short || "",
        ghost.mood || "混合",
        ghost.safety || "safe",
      ],
    });
    created++;
  } catch (e) {
    console.error(`❌ 插入 ${ghost.id} 失败:`, e.message);
  }
}

console.log(`✅ 导入完成：${created} 条成功，${skipped} 条跳过`);
process.exit(0);
