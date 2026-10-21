/* Áp migration qua Neon serverless driver (cổng 443).
 *
 * Vì sao cần script này: mạng công ty chặn outbound TCP 5432, nên `prisma migrate deploy`
 * (dùng TCP) báo P1001. Đi qua driver adapter thì schema engine JS của Prisma 6.19 lại
 * lỗi deserialize kiểu `name` khi đọc bảng bookkeeping. Query engine thì hoàn toàn bình
 * thường — nên script này chạy đúng phần DDL bằng query engine và tự ghi sổ
 * `_prisma_migrations` theo đúng định dạng Prisma, để sau này `prisma migrate status`
 * và `migrate deploy` (từ mạng không bị chặn) vẫn nhận là đã áp.
 *
 * Chạy: npm run db:apply
 *
 * Giới hạn: tách câu lệnh bằng dấu ";" ở cuối dòng, nên migration KHÔNG được chứa
 * function/DO block/trigger có ";" bên trong. Dự án này không dùng chúng (đã chốt:
 * mọi logic ở ORM), nếu sau này cần thì chạy migrate từ mạng mở.
 */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

// Bảng bookkeeping của Prisma — DDL đúng như Prisma tự tạo.
const BOOKKEEPING_DDL = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum"              VARCHAR(64) NOT NULL,
  "finished_at"           TIMESTAMPTZ,
  "migration_name"        VARCHAR(255) NOT NULL,
  "logs"                  TEXT,
  "rolled_back_at"        TIMESTAMPTZ,
  "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
)`;

// Tách file SQL thành từng câu lệnh, bỏ comment dòng.
function splitStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`Không thấy thư mục ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  await prisma.$executeRawUnsafe(BOOKKEEPING_DDL);

  const applied = await prisma.$queryRaw<{ migration_name: string; rolled_back_at: Date | null }[]>`
    SELECT migration_name, rolled_back_at FROM "_prisma_migrations"
  `;
  const appliedNames = new Set(
    applied.filter((r) => r.rolled_back_at === null).map((r) => r.migration_name)
  );

  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(); // tên bắt đầu bằng timestamp → sort chuỗi là đúng thứ tự

  let ran = 0;
  for (const name of folders) {
    const file = path.join(MIGRATIONS_DIR, name, "migration.sql");
    if (!existsSync(file)) {
      console.warn(`  bỏ qua ${name} (không có migration.sql)`);
      continue;
    }
    if (appliedNames.has(name)) {
      console.log(`  ✓ ${name} — đã áp trước đó`);
      continue;
    }

    const sql = readFileSync(file, "utf8");
    const checksum = createHash("sha256").update(readFileSync(file)).digest("hex");
    const statements = splitStatements(sql);

    console.log(`  → ${name} — ${statements.length} câu lệnh`);
    const startedAt = new Date();

    // Chạy toàn bộ DDL trong 1 transaction: lỗi giữa đường thì rollback sạch,
    // không để DB ở trạng thái nửa vời.
    await prisma.$transaction(
      async (tx) => {
        for (const st of statements) await tx.$executeRawUnsafe(st);
      },
      { timeout: 120_000 }
    );

    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations"
        ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count")
      VALUES (${randomUUID()}, ${checksum}, ${name}, ${startedAt}, ${new Date()}, ${statements.length})
    `;
    ran++;
    console.log(`  ✓ ${name} — xong`);
  }

  console.log(ran === 0 ? "Không có migration mới." : `Đã áp ${ran} migration.`);
}

main()
  .catch((e) => {
    console.error("Áp migration thất bại:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
