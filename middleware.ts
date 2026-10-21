import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ADMIN_COOKIE } from "@/lib/auth-token";

// Chặn truy cập trang /admin nếu chưa đăng nhập. API tự kiểm tra riêng.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifyToken(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Bảo vệ mọi trang /admin trừ trang login.
  matcher: ["/admin/((?!login).*)", "/admin"],
};
