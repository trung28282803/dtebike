import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

/* Kết nối Neon qua driver serverless (HTTP/WebSocket trên cổng 443) thay vì TCP 5432.
   Hai lý do:
   1. Nhiều mạng doanh nghiệp chặn outbound 5432 — 443 thì luôn mở.
   2. Trên Vercel serverless, driver này không giữ TCP pool nên không cạn connection.

   Node.js không có WebSocket global (trước v22) → phải nạp `ws`. Trên Edge/Vercel
   runtime đã có WebSocket sẵn nên bỏ qua. */
if (typeof WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Thiếu biến môi trường DATABASE_URL.");
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log: ["warn", "error"],
  });
}

/* Khởi tạo LAZY (chỉ tạo client ở lần truy cập đầu tiên).
   Bắt buộc phải lazy: `next build` import mọi Route Handler ở bước "Collecting page
   data". Nếu tạo client ngay lúc import thì build sẽ fail khi máy build chưa có
   DATABASE_URL — và build không cần kết nối DB. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = (globalForPrisma.prisma ??= createClient());
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
  has(_target, prop) {
    return prop in (globalForPrisma.prisma ??= createClient());
  },
});
