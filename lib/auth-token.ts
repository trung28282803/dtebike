// Phần ký/xác thực JWT — edge-safe (chỉ dùng jose, không import node:crypto
// hay next/headers). middleware.ts chạy ở Edge runtime nên chỉ được import file này.
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "dt_admin";

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production")
      throw new Error("AUTH_SECRET phải được đặt và dài ≥ 32 ký tự.");
    return new TextEncoder().encode("dev-secret-change-me-dev-secret-change-me");
  }
  return new TextEncoder().encode(s);
};

export async function signAdminToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
