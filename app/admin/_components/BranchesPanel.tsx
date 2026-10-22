"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BranchDTO, CatalogDTO } from "@/lib/catalog";
import { Modal, apiCall } from "./ui";
import NumberInput from "@/components/NumberInput";
import { useDialog } from "@/components/Dialog";

type Draft = Omit<BranchDTO, "id" | "phone"> & { id?: string };

// Dán nguyên thẻ <iframe> → chỉ giữ phần src; dán link thì giữ nguyên.
const extractEmbedSrc = (raw: string) => {
  const m = /src=["']([^"']+)["']/i.exec(raw);
  return m ? m[1] : raw;
};

const EMPTY: Draft = {
  name: "",
  phoneDisplay: "",
  address: "",
  addressNote: "",
  mapUrl: "",
  mapEmbedUrl: "",
  openHours: "",
  sortOrder: 0,
  isActive: true,
};

export default function BranchesPanel({ data }: { data: CatalogDTO }) {
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
    const { id, ...body } = draft;
    const ok = id
      ? await run(() => apiCall(`/api/admin/branches/${id}`, "PATCH", body))
      : await run(() => apiCall("/api/admin/branches", "POST", body));
    if (ok) setDraft(null);
  };

  const remove = async (b: BranchDTO) => {
    const ok = await dialog.confirm({
      title: "Xóa chi nhánh?",
      message: (
        <>
          <b>{b.name}</b> sẽ bị xóa. Đơn hàng cũ vẫn giữ tên chi nhánh. Nếu chỉ muốn tạm ngưng, dùng “Ẩn”.
        </>
      ),
      confirmText: "Xóa",
      danger: true,
    });
    if (!ok) return;
    run(() => apiCall(`/api/admin/branches/${b.id}`, "DELETE"));
  };

  const hotline = data.settings?.phoneDisplay || "";

  return (
    <div>
      <div className="toolbar">
        <div className="muted" style={{ fontSize: 13.5, minWidth: 0, flex: "1 1 auto" }}>
          Chi nhánh hiện ở mục “Hệ thống cửa hàng” trên trang khách; khách chọn chi nhánh khi gửi yêu cầu. Chi nhánh
          đứng đầu là chi nhánh chính.
        </div>
        <button className="add" disabled={busy} onClick={() => setDraft({ ...EMPTY, sortOrder: data.branches.length + 1 })}>
          + Chi nhánh
        </button>
      </div>
      {error && (
        <div className="err" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}
      {data.branches.length === 0 ? (
        <div className="empty">Chưa có chi nhánh nào — trang khách sẽ chỉ hiện hotline chung.</div>
      ) : (
        <div className="card">
          <div className="scroll-x">
            <table className="stack">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Chi nhánh</th>
                  <th>Liên hệ</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.branches.map((b, i) => (
                  <tr key={b.id}>
                    <td data-label="Thứ tự" className="tabnum">
                      {b.sortOrder}
                    </td>
                    <td data-label="Chi nhánh">
                      <div>
                        <b>{b.name}</b>
                        {i === 0 && (
                          <span className="badge b-ok" style={{ marginLeft: 8 }}>
                            Chính
                          </span>
                        )}
                        <div className="muted" style={{ fontSize: 13 }}>
                          {b.address || <i>Chưa có địa chỉ</i>}
                        </div>
                        {b.openHours && (
                          <div className="muted" style={{ fontSize: 12.5 }}>
                            {b.openHours}
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="Liên hệ" className="tabnum">
                      {b.phoneDisplay || <span className="muted">{hotline ? `Hotline ${hotline}` : "—"}</span>}
                      {b.mapEmbedUrl && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          Có bản đồ nhúng
                        </div>
                      )}
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`badge ${b.isActive ? "b-ok" : "b-off"}`}>{b.isActive ? "Đang hiện" : "Đã ẩn"}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="mini ed" disabled={busy} onClick={() => setDraft({ ...b })}>
                          Sửa
                        </button>
                        <button className="mini" disabled={busy} onClick={() => run(() => apiCall(`/api/admin/branches/${b.id}`, "PATCH", { isActive: !b.isActive }))}>
                          {b.isActive ? "Ẩn" : "Hiện"}
                        </button>
                        <button className="mini no" disabled={busy} onClick={() => remove(b)}>
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
          title={draft.id ? "Sửa chi nhánh" : "Thêm chi nhánh"}
          onClose={() => setDraft(null)}
          wide
          footer={
            <>
              <button className="ghost" onClick={() => setDraft(null)}>
                Hủy
              </button>
              <button className="add" disabled={busy || !draft.name.trim()} onClick={save}>
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            </>
          }
        >
          <div className="row c2">
            <div>
              <label htmlFor="br-name">Tên chi nhánh</label>
              <input id="br-name" value={draft.name} maxLength={80} placeholder="Suwon" autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="br-order">Thứ tự</label>
              <NumberInput id="br-order" value={draft.sortOrder} min={0} max={9999} onChange={(n) => setDraft({ ...draft, sortOrder: n })} />
            </div>
          </div>
          <div className="row c2">
            <div>
              <label htmlFor="br-phone">Số điện thoại chi nhánh</label>
              <input id="br-phone" value={draft.phoneDisplay} inputMode="tel" maxLength={30} placeholder={hotline || "010-xxxx-xxxx"} onChange={(e) => setDraft({ ...draft, phoneDisplay: e.target.value })} />
              <div className="hint">Để trống thì dùng hotline chung ở tab Cửa hàng.</div>
            </div>
            <div>
              <label htmlFor="br-hours">Giờ mở cửa</label>
              <input id="br-hours" value={draft.openHours} maxLength={120} placeholder="09:00 – 19:00, nghỉ Chủ nhật" onChange={(e) => setDraft({ ...draft, openHours: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="br-address">Địa chỉ</label>
            <input id="br-address" value={draft.address} maxLength={300} placeholder="수원시 매탄동 153-107" onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </div>
          <div className="row c2">
            <div>
              <label htmlFor="br-addrnote">Ghi chú địa chỉ</label>
              <input id="br-addrnote" value={draft.addressNote} maxLength={300} placeholder="Gần ga…, gọi trước khi đến" onChange={(e) => setDraft({ ...draft, addressNote: e.target.value })} />
            </div>
            <div>
              <label htmlFor="br-map">Link bản đồ</label>
              <input id="br-map" value={draft.mapUrl} maxLength={500} placeholder="https://maps…" onChange={(e) => setDraft({ ...draft, mapUrl: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="br-embed">Bản đồ nhúng (Google Maps → Chia sẻ → Nhúng bản đồ → dán nguyên thẻ &lt;iframe&gt;)</label>
            <textarea
              id="br-embed"
              value={draft.mapEmbedUrl}
              rows={3}
              placeholder='<iframe src="https://www.google.com/maps/embed?pb=…" …></iframe>'
              onChange={(e) => setDraft({ ...draft, mapEmbedUrl: extractEmbedSrc(e.target.value) })}
            />
            <div className="hint">Hệ thống tự tách phần src; chỉ nhận bản đồ của Google.</div>
            {draft.mapEmbedUrl && (
              <iframe
                className="mapframe"
                src={draft.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Xem trước bản đồ"
                style={{ height: 200, marginTop: 8 }}
              />
            )}
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
