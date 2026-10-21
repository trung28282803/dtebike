"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "Sai mật khẩu.");
        return;
      }
      // replace() để nút Back không quay lại trang login.
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Lỗi kết nối.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bd">
      <div>
        <label>Mật khẩu quản trị</label>
        <input
          type="password"
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••••••"
        />
      </div>
      {error && <div className="err">{error}</div>}
      <button className="cta" style={{ width: "100%", marginTop: 18 }} disabled={busy} onClick={submit}>
        {busy ? "Đang kiểm tra…" : "Vào quản trị"}
      </button>
      {/* Không ghi chú kỹ thuật ở trang đăng nhập: đây là trang công khai,
          nói tên biến môi trường là chỉ điểm cho người dò mật khẩu. */}
    </div>
  );
}
