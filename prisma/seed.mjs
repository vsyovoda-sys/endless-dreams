/**
 * 幽灵梦境种子导入脚本（直接操作 SQLite）
 * 运行: node prisma/seed.mjs
 */
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../dev.db");
const ghostPath = resolve(__dirname, "../../ghost_dreams.json");

const db = new Database(dbPath);
const raw = readFileSync(ghostPath, "utf-8");
const ghosts = JSON.parse(raw);

console.log(`📖 读取到 ${ghosts.length} 条幽灵梦境`);

const upsert = db.prepare(`
  INSERT INTO Dream (id, userId, content, contentShort, mood, isAnonymous, isGhost, safetyLevel, date, createdAt, updatedAt)
  VALUES (?, NULL, ?, ?, ?, 0, 1, ?, datetime('now'), datetime('now'), datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    content = excluded.content,
    contentShort = excluded.contentShort,
    mood = excluded.mood,
    safetyLevel = excluded.safetyLevel,
    updatedAt = datetime('now')
`);

let created = 0;
let skipped = 0;

const insertMany = db.transaction((items) => {
  for (const ghost of items) {
    if (ghost.safety === "needs_review") {
      console.log(`⚠️  跳过 ${ghost.id}（needs_review）`);
      skipped++;
      continue;
    }
    upsert.run(ghost.id, ghost.content, ghost.content_short || "", ghost.mood || "混合", ghost.safety || "safe");
    created++;
  }
});

insertMany(ghosts);
db.close();

console.log(`✅ 导入完成：${created} 条成功，${skipped} 条跳过`);
