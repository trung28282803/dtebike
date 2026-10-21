"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogDTO, ServiceDTO } from "@/lib/catalog";
import { Modal, apiCall } from "./ui";
import NumberInput from "@/components/NumberInput";
import { useDialog } from "@/components/Dialog";

type Draft = { id?: string; icon: string; title: string; description: string; sortOrder: number; isActive: boolean };

export default function ServicesPanel({ data }: { data: CatalogDTO }) {
  const router = useRouter();
  const dialog = useDialog();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError("");
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Có lỗi xảy ra.");
      return false;
    }
    router.refresh();
    return true;
  };

  const save = async () => {
    if (!draft) return;
    const body = { icon: draft.icon.trim(), title: draft.title.trim(), description: draft.description.trim(), sortOrder: draft.sortOrder, isActive: draft.isActive };
    const ok = draft.id
      ? await run(() => apiCall(`/api/admin/services/${draft.id}`, "PATCH", body))
      : await run(() => apiCall("/api/admin/services", "POST", body));
    if (ok) setDraft(null);
  };

  const remove = async (s: ServiceDTO) => {
    const ok = await dialog.confirm({ title: "Xóa dịch vụ?", message: <b>{s.title}</b>, confirmText: "Xóa", danger: true });
    if (!ok) return;
    run(() => apiCall(`/api/admin/services/${s.id}`, "DELETE"));
  };

  return (
    <div>
      <div className="toolbar">
        <div className="muted" style={{ fontSize: 13.5, minWidth: 0, flex: "1 1 auto" }}>
          Các ô “Dịch vụ” hiển thị dưới phần phụ kiện trên trang khách (tư vấn pin, sửa chữa, giao hàng…).
        </div>
        <button className="add" disabled={busy} onClick={() => setDraft({ icon: "🛠️", title: "", description: "", sortOrder: data.services.length + 1, isActive: true })}>
          + Dịch vụ
        </button>
      </div>
      {error && (
        <div className="err" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}
      {data.services.length === 0 ? (
        <div className="empty">Chưa có dịch vụ nào.</div>
      ) : (
        <div className="card">
          <div className="scroll-x">
            <table className="stack">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Dịch vụ</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Thứ tự" className="tabnum">
                      {s.sortOrder}
                    </td>
                    <td data-label="Dịch vụ">
                      <div>
                        <span style={{ fontSize: 18, marginRight: 8 }}>{s.icon}</span>
                        <b>{s.title}</b>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {s.description}
                        </div>
                      </div>
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`badge ${s.isActive ? "b-ok" : "b-off"}`}>{s.isActive ? "Đang hiện" : "Đã ẩn"}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="mini ed" disabled={busy} onClick={() => setDraft({ ...s })}>
                          Sửa
                        </button>
                        <button className="mini" disabled={busy} onClick={() => run(() => apiCall(`/api/admin/services/${s.id}`, "PATCH", { isActive: !s.isActive }))}>
                          {s.isActive ? "Ẩn" : "Hiện"}
                        </button>
                        <button className="mini no" disabled={busy} onClick={() => remove(s)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? "Sửa dịch vụ" : "Thêm dịch vụ"}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="ghost" onClick={() => setDraft(null)}>
                Hủy
              </button>
              <button className="add" disabled={busy || !draft.title.trim()} onClick={save}>
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            </>
          }
        >
          <div className="row c2">
            <div>
              <label htmlFor="sv-icon">Biểu tượng (emoji)</label>
              <input id="sv-icon" value={draft.icon} maxLength={8} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
            </div>
            <div>
              <label htmlFor="sv-order">Thứ tự</label>
              <NumberInput id="sv-order" value={draft.sortOrder} min={0} max={9999} onChange={(n) => setDraft({ ...draft, sortOrder: n })} />
            </div>
          </div>
          <div>
            <label htmlFor="sv-title">Tiêu đề</label>
            <input id="sv-title" value={draft.title} maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <label htmlFor="sv-desc">Mô tả</label>
            <textarea id="sv-desc" value={draft.description} maxLength={400} rows={3} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <label className="check">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            <span>Hiện trên trang khách</span>
          </label>
        </Modal>
      )}
    </div>
  );
}
