"use client";

import { useEffect, type ReactNode } from "react";
import { ORDER_STATUS_LABEL } from "@/lib/format";

export function Modal({
  title,
  children,
  onClose,
  footer,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
}) {
  // Esc để đóng — thao tác admin nhập liệu nhiều, cần đóng nhanh.
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="ovl" onClick={onClose}>
      <div className={`modal${wide ? " lg" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="hd">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="bd">{children}</div>
        {footer && <div className="ft">{footer}</div>}
      </div>
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = {
  NEW: "b-new",
  CONTACTED: "b-contacted",
  CONFIRMED: "b-ok",
  DELIVERED: "b-done",
  CANCELLED: "b-cancel",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_CLASS[status] ?? "b-off"}`}>{ORDER_STATUS_LABEL[status] || status}</span>;
}

// Gọi API admin, trả về lỗi dạng chuỗi để panel hiển thị.
export async function apiCall(
  url: string,
  method: "POST" | "PATCH" | "DELETE" | "PUT",
  body?: unknown
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  try {
    const r = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: data.error || `Lỗi ${r.status}.` };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Lỗi kết nối." };
  }
}
