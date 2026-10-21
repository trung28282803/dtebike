// Phần auth chạy trên Node runtime (Route Handler / Server Component):
// đọc-ghi cookie, so mật khẩu. Middleware KHÔNG import file này — xem lib/auth-token.ts.
import { cookies } from "next/headers";
import crypto from "crypto";
import { ADMIN_COOKIE, signAdminToken, verifyToken } from "./auth-token";

export { ADMIN_COOKIE, verifyToken };

// So sánh mật khẩu chống timing attack. Hash trước để hai vế luôn cùng độ dài
// (timingSafeEqual ném lỗi nếu lệch độ dài, và độ dài cũng là thông tin rò rỉ).
export function passwordOK(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const h = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest();
  return crypto.timingSafeEqual(h(input), h(expected));
}

export async function createSession() {
  const token = await signAdminToken();
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyToken(token);
}

// Dùng đầu mỗi Route Handler của admin.
export async function requireAdmin() {
  if (!(await isAdmin())) throw new UnauthorizedError();
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Chưa đăng nhập.");
  }
}
