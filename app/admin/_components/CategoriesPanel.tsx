"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductKind } from "@prisma/client";
import type { CatalogDTO, CategoryDTO } from "@/lib/catalog";
import { KIND_LABEL } from "@/lib/format";
import { apiCall } from "./ui";
import { useDialog } from "@/components/Dialog";

const KINDS: ProductKind[] = ["VEHICLE", "ACCESSORY"];

export default function CategoriesPanel({ data }: { data: CatalogDTO }) {
  const router = useRouter();
  const dialog = useDialog();
  const [newName, setNewName] = useState<Record<string, string>>({ VEHICLE: "", ACCESSORY: "" });
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

  const add = async (kind: ProductKind) => {
    const name = newName[kind].trim();
    if (!name) return;
    const n = data.categories.filter((c) => c.kind === kind).length;
    const ok = await run(() => apiCall("/api/admin/categories", "POST", { kind, name, sortOrder: n + 1 }));
    if (ok) setNewName({ ...newName, [kind]: "" });
  };

  const rename = async (c: CategoryDTO) => {
    const name = await dialog.prompt({ title: "Đổi tên danh mục", label: "Tên", defaultValue: c.name, maxLength: 120, confirmText: "Lưu" });
    if (!name || name === c.name) return;
    run(() => apiCall(`/api/admin/categories/${c.id}`, "PATCH", { name }));
  };

  const reorder = async (c: CategoryDTO) => {
    const v = await dialog.prompt({ title: "Thứ tự hiển thị", label: "Số thứ tự (nhỏ hiện trước)", defaultValue: String(c.sortOrder), confirmText: "Lưu", maxLength: 4 });
    if (v === null) return;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return;
    run(() => apiCall(`/api/admin/categories/${c.id}`, "PATCH", { sortOrder: n }));
  };

  const remove = async (c: CategoryDTO) => {
    const n = data.products.filter((p) => p.categoryId === c.id).length;
    const ok = await dialog.confirm({
      title: "Xóa danh mục?",
      message: (
        <>
          Danh mục <b>{c.name}</b> sẽ bị xóa. {n > 0 ? `Hiện có ${n} sản phẩm thuộc danh mục này — cần chuyển đi trước.` : ""}
        </>
      ),
      confirmText: "Xóa",
      danger: true,
    });
    if (!ok) return;
    run(() => apiCall(`/api/admin/categories/${c.id}`, "DELETE"));
  };

  return (
    <div>
      {error && (
        <div className="err" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}
      <div className="row c2" style={{ alignItems: "start" }}>
        {KINDS.map((kind) => {
          const rows = data.categories.filter((c) => c.kind === kind);
          return (
            <div className="card" key={kind}>
              <div className="hd">
                <h3>Danh mục {KIND_LABEL[kind].toLowerCase()}</h3>
              </div>
              <div className="bd">
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input
                    value={newName[kind]}
                    placeholder="Tên danh mục mới"
                    onChange={(e) => setNewName({ ...newName, [kind]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && add(kind)}
                  />
                  <button className="add" disabled={busy || !newName[kind].trim()} onClick={() => add(kind)}>
                    + Thêm
                  </button>
                </div>
                {rows.length === 0 ? (
                  <div className="empty">Chưa có danh mục.</div>
                ) : (
                  <table>
                    <tbody>
                      {rows.map((c) => {
                        const n = data.products.filter((p) => p.categoryId === c.id).length;
                        return (
                          <tr key={c.id}>
                            <td style={{ padding: "10px 6px" }}>
                              <span className="muted tabnum" style={{ fontSize: 12, marginRight: 8 }}>
                                {c.sortOrder}
                              </span>
                              {c.name}
                              {!c.isActive && (
                                <span className="badge b-off" style={{ marginLeft: 8 }}>
                                  Đã ẩn
                                </span>
                              )}
                              <div className="muted" style={{ fontSize: 12 }}>
                                {n} sản phẩm · /{c.slug}
                              </div>
                            </td>
                            <td style={{ padding: "10px 6px" }}>
                              <div className="actions" style={{ justifyContent: "flex-end" }}>
                                <button className="mini ed" disabled={busy} onClick={() => rename(c)}>
                                  Đổi tên
                                </button>
                                <button className="mini" disabled={busy} onClick={() => reorder(c)}>
                                  Thứ tự
                                </button>
                                <button className="mini" disabled={busy} onClick={() => run(() => apiCall(`/api/admin/categories/${c.id}`, "PATCH", { isActive: !c.isActive }))}>
                                  {c.isActive ? "Ẩn" : "Hiện"}
                                </button>
                                <button className="mini no" disabled={busy || n > 0} onClick={() => remove(c)} title={n > 0 ? "Còn sản phẩm" : ""}>
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="note">
        <b>Ẩn danh mục</b> chỉ bỏ bộ lọc/nhóm trên trang khách; sản phẩm trong đó vẫn hiện (ở nhóm “Khác” với phụ kiện).
      </div>
    </div>
  );
}
