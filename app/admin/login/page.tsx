import { Suspense } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BikeIcon } from "@/app/_components/Icons";
import LoginForm from "./login-form";

export const metadata = { title: `Đăng nhập — ${BRAND.full}` };

export default function AdminLoginPage() {
  return (
    <div className="wrap">
      <header className="admin-top">
        <div className="brand">
          <div className="mark" aria-hidden="true">
            <BikeIcon size={26} strokeWidth={2.2} />
          </div>
          <div>
            <b>{BRAND.short}</b>
            <span>{BRAND.taglineAdmin}</span>
          </div>
        </div>
        <Link className="ghost" href="/">
          ← Trang bán hàng
        </Link>
      </header>

      <div className="login card">
        <div className="hd">
          <h3>Đăng nhập</h3>
        </div>
        {/* useSearchParams cần Suspense boundary khi build. */}
        <Suspense fallback={<div className="bd muted">Đang tải…</div>}>
          <LoginForm />
        </Suspense>
      </div>

      <footer className="foot">
        © {new Date().getFullYear()} {BRAND.full}
      </footer>
    </div>
  );
}
