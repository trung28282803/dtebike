// Kiểm tra kết nối DB qua Neon serverless driver (cổng 443). Chạy: npx tsx scripts/probe.ts
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  // Lưu ý: current_database() trả kiểu `name` (OID 19) — Prisma không deserialize
  // được, phải cast ::text.
  const r = await prisma.$queryRaw<
    { v: number; db: string }[]
  >`SELECT 1 as v, current_database()::text as db`;
  console.log("QUERY ENGINE OK:", r);

  // booking.ts dùng interactive transaction Serializable → cần WebSocket hoạt động.
  const t = await prisma.$transaction(async (tx) => {
    return tx.$queryRaw<{ n: number }[]>`SELECT 42 as n`;
  });
  console.log("TRANSACTION OK:", t);
}

main()
  .catch((e) => {
    console.error("FAIL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
