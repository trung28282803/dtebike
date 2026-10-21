// Cấu hình Prisma CLI (thay cho `package.json#prisma`, sẽ bị bỏ ở Prisma 7).
//
// Khi có file này, Prisma CLI KHÔNG tự nạp .env nữa → phải import dotenv ở đây,
// nếu không `prisma migrate` / `prisma studio` sẽ báo "Environment variable not found".
//
// Lưu ý về migrate trên mạng chặn cổng 5432:
//   Prisma CLI luôn đi TCP 5432 (driver adapter cho schema engine chưa dùng được:
//   PrismaNeon@6.19 không implement connectToShadowDb và executeScript chỉ là stub).
//   → Ở mạng bị chặn, dùng `npm run db:apply` (áp migration qua query engine/cổng 443).
//   → Ở mạng không bị chặn, `prisma migrate dev` / `migrate deploy` chạy bình thường.
import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
