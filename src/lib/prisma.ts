import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    const adapter = new PrismaLibSql({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    _prisma = new PrismaClient({ adapter });
  }
  return _prisma;
}

// Keep named export for backward compat but lazy
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    return (getPrisma() as unknown as Record<string, unknown>)[prop];
  },
});
