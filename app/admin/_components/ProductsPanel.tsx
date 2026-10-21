"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductKind, StockStatus } from "@prisma/client";
import type { CatalogDTO, ProductDTO } from "@/lib/catalog";
import { money, STOCK_LABEL } from "@/lib/format";
import { Modal, apiCall } from "./ui";
import NumberInput from "@/components/NumberInput";
import Select from "@/components/Select";
import { useDialog } from "@/components/Dialog";

type VariantDraft = {
  id?: string;
  key: string;
  name: string;
  sku: string;
  voltageV: string;
  capacityAh: string;
  price: string;
  compareAtPrice: string;
  stockStatus: StockStatus;
  isActive: boolean;
};
type SpecDraft = { key: string; label: string; value: string };
type Draft = {
  id?: string;
  categoryId: string;
  brand: string;
  name: string;
  summary: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  variants: VariantDraft[];
  specs: SpecDraft[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const STOCKS: StockStatus[] = ["IN_STOCK", "PRE_ORDER", "OUT_OF_STOCK"];

const blankVariant = (name = ""): VariantDraft => ({
  key: uid(),
  name,
  sku: "",
  voltageV: "",
  capacityAh: "",
  price: "",
  compareAtPrice: "",
  stockStatus: "IN_STOCK",
  isActive: true,
});

export default function ProductsPanel({ kind, data }: { kind: ProductKind; data: CatalogDTO }) {
  const router = useRouter();
  const dialog = useDialog();
  const cur = data.settings?.currency ?? "KRW";
  const isVehicle = kind === "VEHICLE";

  const categories = data.categories.filter((c) => c.kind === kind);
  const products = data.products.filter((p) => p.kind === kind);

  const [filterCat, setFilterCat] = useState("");
  const [q, setQ] = useState("");
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
    router.refresh(); // Server Component nạp lại danh mục
    return true;
  };

  const openNew = () =>
    setDraft({
      categoryId: categories[0]?.id || "",
      brand: isVehicle ? "Victory" : "",
      name: "",
      summary: "",
      description: "",
      imageUrl: "",
      imageAlt: "",
      sortOrder: products.length + 1,
      isFeatured: false,
      isActive: true,
      variants: [blankVariant(isVehicle ? "48V 12Ah" : "Tiêu chuẩn")],
      specs: [],
    });

  const openEdit = (p: ProductDTO) =>
    setDraft({
      id: p.id,
      categoryId: p.categoryId || "",
      brand: p.brand,
      name: p.name,
      summary: p.summary,
      description: p.description,
      imageUrl: p.imageUrl,
      imageAlt: p.imageAlt,
      sortOrder: p.sortOrder,
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      variants: p.variants.map((v) => ({
        id: v.id,
        key: v.id,
        name: v.name,
        sku: v.sku ?? "",
        voltageV: v.voltageV == null ? "" : String(v.voltageV),
        capacityAh: v.capacityAh == null ? "" : String(v.capacityAh),
        price: v.price == null ? "" : String(v.price),
        compareAtPrice: v.compareAtPrice == null ? "" : String(v.compareAtPrice),
        stockStatus: v.stockStatus,
        isActive: v.isActive,
      })),
      specs: p.specs.map((s) => ({ key: s.id, label: s.label, value: s.value })),
    });

  const save = async () => {
    if (!draft) return;
    const body = {
      kind,
      categoryId: draft.categoryId || null,
      brand: draft.brand.trim(),
      name: draft.name.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      imageUrl: draft.imageUrl.trim(),
      imageAlt: draft.imageAlt.trim(),
      sortOrder: draft.sortOrder,
      isFeatured: draft.isFeatured,
      isActive: draft.isActive,
      variants: draft.variants.map((v, i) => ({
        id: v.id,
        name: v.name.trim(),
        sku: v.sku.trim() || null,
        voltageV: v.voltageV === "" ? null : Number(v.voltageV),
        capacityAh: v.capacityAh === "" ? null : Number(v.capacityAh),
        price: v.price === "" ? null : Number(v.price),
        compareAtPrice: v.compareAtPrice === "" ? null : Number(v.compareAtPrice),
        stockStatus: v.stockStatus,
        sortOrder: i,
        isActive: v.isActive,
      })),
      specs: draft.specs.map((s, i) => ({ label: s.label.trim(), value: s.value.trim(), sortOrder: i })),
    };
    const ok = draft.id
      ? await run(() => apiCall(`/api/admin/products/${draft.id}`, "PATCH", body))
      : await run(() => apiCall("/api/admin/products", "POST", body));
    if (ok) setDraft(null);
  };

  const toggle = (p: ProductDTO, field: "isActive" | "isFeatured") =>
    run(() => apiCall(`/api/admin/products/${p.id}`, "PATCH", { [field]: !p[field] }));

  const remove = async (p: ProductDTO) => {
    const ok = await dialog.confirm({
      title: "Xóa sản phẩm?",
      message: (
        <>
          <b>{p.name}</b> sẽ bị xóa cùng toàn bộ phiên bản và thông số. Nếu đã có trong đơn hàng, hệ thống sẽ chặn — khi
          đó hãy dùng nút <b>Ẩn</b>.
        </>
      ),
      confirmText: "Xóa",
      danger: true,
    });
    if (!ok) return;
    run(() => apiCall(`/api/admin/products/${p.id}`, "DELETE"));
  };

  const setV = (key: string, patch: Partial<VariantDraft>) =>
    setDraft((d) => d && { ...d, variants: d.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) });
  const setS = (key: string, patch: Partial<SpecDraft>) =>
    setDraft((d) => d && { ...d, specs: d.specs.map((s) => (s.key === key ? { ...s, ...patch } : s)) });

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const priceRange = (p: ProductDTO) => {
    const prices = p.variants.map((v) => v.price).filter((x): x is number => x != null);
    if (!prices.length) return "Hỏi giá";
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    return lo === hi ? money(lo, cur) : `${money(lo, cur)} – ${money(hi, cur)}`;
  };

  const shown = products.filter((p) => {
    if (filterCat && p.categoryId !== filterCat) return false;
    const k = q.trim().toLowerCase();
    return !k || p.name.toLowerCase().includes(k) || p.brand.toLowerCase().includes(k);
  });

  const draftValid =
    !!draft &&
    !!draft.name.trim() &&
    draft.variants.length > 0 &&
    draft.variants.every((v) => v.name.trim()) &&
    draft.specs.every((s) => s.label.trim() && s.value.trim());

  return (
    <div>
      <div className="toolbar">
        <div>
          <label htmlFor="p-cat">Danh mục</label>
          <Select
            id="p-cat"
            value={filterCat}
            emptyLabel="Tất cả danh mục"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={setFilterCat}
          />
        </div>
        <div style={{ minWidth: 220 }}>
          <label htmlFor="p-q">Tìm tên</label>
          <input id="p-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên sản phẩm…" />
        </div>
        <span className="spacer" />
        <button className="add" disabled={busy} onClick={openNew}>
          + {isVehicle ? "Mẫu xe" : "Phụ kiện"}
        </button>
      </div>

      {error && (
        <div className="err" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty">Chưa có sản phẩm nào.</div>
      ) : (
        <div className="card">
          <div className="scroll-x">
            <table className="stack">
              <thead>
                <tr>
                  <th></th>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Phiên bản</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Ảnh">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={p.imageUrl} alt="" />
                      ) : (
                        <div className="thumb" />
                      )}
                    </td>
                    <td data-label="Sản phẩm">
                      <div>
                        <b>{p.name}</b>
                        {p.brand && <span className="muted"> · {p.brand}</span>}
                        {p.summary && (
                          <div className="muted" style={{ fontSize: 12.5 }}>
                            {p.summary}
                          </div>
                        )}
                        <div className="muted" style={{ fontSize: 11.5 }}>
                          thứ tự {p.sortOrder} · /{p.slug}
                        </div>
                      </div>
                    </td>
                    <td data-label="Danh mục">{catName(p.categoryId) || <span className="muted">—</span>}</td>
                    <td data-label="Phiên bản">
                      <div className="chips">
                        {p.variants.map((v) => (
                          <span
                            className="chip"
                            key={v.id}
                            style={{ opacity: v.isActive ? 1 : 0.5, textDecoration: v.isActive ? "none" : "line-through" }}
                            title={STOCK_LABEL[v.stockStatus]}
                          >
                            {v.name}
                            {v.stockStatus !== "IN_STOCK" ? ` (${STOCK_LABEL[v.stockStatus]})` : ""}
                          </span>
                        ))}
                        {p.variants.length === 0 && <span className="muted">—</span>}
                      </div>
                    </td>
                    <td data-label="Giá" className="nowrap tabnum">
                      {priceRange(p)}
                    </td>
                    <td data-label="Trạng thái">
                      <div className="chips">
                        <span className={`badge ${p.isActive ? "b-ok" : "b-off"}`}>{p.isActive ? "Đang bán" : "Đã ẩn"}</span>
                        {p.isFeatured && <span className="badge b-contacted">Nổi bật</span>}
                      </div>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="mini ed" disabled={busy} onClick={() => openEdit(p)}>
                          Sửa
                        </button>
                        <button className="mini" disabled={busy} onClick={() => toggle(p, "isActive")}>
                          {p.isActive ? "Ẩn" : "Hiện"}
                        </button>
                        {isVehicle && (
                          <button className="mini" disabled={busy} onClick={() => toggle(p, "isFeatured")}>
                            {p.isFeatured ? "Bỏ nổi bật" : "Nổi bật"}
                          </button>
                        )}
                        <button className="mini no" disabled={busy} onClick={() => remove(p)}>
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
          wide
          title={draft.id ? `Sửa ${isVehicle ? "mẫu xe" : "phụ kiện"}` : `Thêm ${isVehicle ? "mẫu xe" : "phụ kiện"}`}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="ghost" onClick={() => setDraft(null)}>
                Hủy
              </button>
              <button className="add" disabled={!draftValid || busy} onClick={save}>
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            </>
          }
        >
          <div className="row c2">
            <div>
              <label htmlFor="pd-name">Tên sản phẩm</label>
              <input id="pd-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="pd-brand">Thương hiệu</label>
              <input id="pd-brand" value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
            </div>
          </div>

          <div className="row c2">
            <div>
              <label htmlFor="pd-cat">Danh mục</label>
              <Select
                id="pd-cat"
                value={draft.categoryId}
                emptyLabel="— Không có —"
                options={categories.map((c) => ({ value: c.id, label: c.name, hint: c.isActive ? undefined : "đã ẩn" }))}
                onChange={(v) => setDraft({ ...draft, categoryId: v })}
              />
            </div>
            <div>
              <label htmlFor="pd-order">Thứ tự hiển thị</label>
              <NumberInput id="pd-order" value={draft.sortOrder} min={0} max={9999} onChange={(n) => setDraft({ ...draft, sortOrder: n })} />
            </div>
          </div>

          <div>
            <label htmlFor="pd-summary">Mô tả ngắn (hiện dưới tên)</label>
            <input
              id="pd-summary"
              value={draft.summary}
              maxLength={160}
              placeholder={isVehicle ? "Chọn dung lượng pin phù hợp" : "Phụ tùng phanh"}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            />
          </div>

          <div className="row c2">
            <div>
              <label htmlFor="pd-img">Đường dẫn ảnh</label>
              <input
                id="pd-img"
                value={draft.imageUrl}
                placeholder={isVehicle ? "/images/vehicles/ten-xe.jpeg" : "/images/accessories/ten.jpeg"}
                onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
              />
              <div className="hint">Ảnh đặt trong thư mục public/images/… của dự án, hoặc dán link https.</div>
              {draft.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="imgprev" src={draft.imageUrl} alt="" />
              )}
            </div>
            <div>
              <label htmlFor="pd-alt">Mô tả ảnh (alt)</label>
              <input id="pd-alt" value={draft.imageAlt} onChange={(e) => setDraft({ ...draft, imageAlt: e.target.value })} />
            </div>
          </div>

          <div>
            <label htmlFor="pd-desc">Mô tả chi tiết (không bắt buộc)</label>
            <textarea id="pd-desc" value={draft.description} rows={3} maxLength={4000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>

          {/* ---------- Phiên bản ---------- */}
          <div>
            <label>{isVehicle ? "Phiên bản pin & giá" : "Phiên bản & giá"}</label>
            <div className="subrows">
              {draft.variants.map((v) => (
                <div className="subrow" key={v.key}>
                  <input value={v.name} placeholder={isVehicle ? "48V 12Ah" : "Tiêu chuẩn"} onChange={(e) => setV(v.key, { name: e.target.value })} aria-label="Tên phiên bản" />
                  <input value={v.voltageV} inputMode="numeric" placeholder="V" onChange={(e) => setV(v.key, { voltageV: e.target.value.replace(/[^\d]/g, "") })} aria-label="Điện áp" />
                  <input value={v.capacityAh} inputMode="decimal" placeholder="Ah" onChange={(e) => setV(v.key, { capacityAh: e.target.value.replace(/[^\d.]/g, "") })} aria-label="Dung lượng" />
                  <input value={v.price} inputMode="numeric" placeholder="Giá (trống = hỏi giá)" onChange={(e) => setV(v.key, { price: e.target.value.replace(/[^\d]/g, "") })} aria-label="Giá" />
                  <Select
                    value={v.stockStatus}
                    options={STOCKS.map((s) => ({ value: s, label: STOCK_LABEL[s] }))}
                    onChange={(s) => setV(v.key, { stockStatus: s as StockStatus })}
                  />
                  <button
                    type="button"
                    className="rm"
                    aria-label="Xóa phiên bản"
                    disabled={draft.variants.length === 1}
                    onClick={() => setDraft({ ...draft, variants: draft.variants.filter((x) => x.key !== v.key) })}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" className="link" onClick={() => setDraft({ ...draft, variants: [...draft.variants, blankVariant()] })}>
                + Thêm phiên bản
              </button>
              <span className="hint" style={{ margin: 0 }}>
                Cột: tên · điện áp (V) · dung lượng (Ah) · giá ({cur}) · tình trạng. Để trống giá = “Hỏi giá”.
              </span>
            </div>
          </div>

          {/* ---------- Thông số ---------- */}
          <div>
            <label>Thông số kỹ thuật (hiện 4 dòng đầu trên thẻ)</label>
            {draft.specs.length > 0 && (
              <div className="subrows">
                {draft.specs.map((s) => (
                  <div className="subrow spec" key={s.key}>
                    <input value={s.label} placeholder="Động cơ" onChange={(e) => setS(s.key, { label: e.target.value })} aria-label="Nhãn" />
                    <input value={s.value} placeholder="500W" onChange={(e) => setS(s.key, { value: e.target.value })} aria-label="Giá trị" />
                    <button type="button" className="rm" aria-label="Xóa thông số" onClick={() => setDraft({ ...draft, specs: draft.specs.filter((x) => x.key !== s.key) })}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="link" style={{ marginTop: 8 }} onClick={() => setDraft({ ...draft, specs: [...draft.specs, { key: uid(), label: "", value: "" }] })}>
              + Thêm thông số
            </button>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <label className="check">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
              <span>Đang bán (hiện trên trang khách)</span>
            </label>
            {isVehicle && (
              <label className="check">
                <input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} />
                <span>Nổi bật</span>
              </label>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
