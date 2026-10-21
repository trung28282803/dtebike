"use client";

import { useEffect, useState } from "react";
import type { ProductDTO, SettingsDTO } from "@/lib/catalog";
import { money, STOCK_LABEL } from "@/lib/format";
import Select from "@/components/Select";
import NumberInput from "@/components/NumberInput";

export interface OrderDraft {
  type: "ORDER" | "QUOTE";
  product: ProductDTO;
  variantId: string;
}

export interface Ticket {
  type: "ORDER" | "QUOTE";
  code: string;
  productName: string;
  variantName: string;
  quantity: number;
  total: number | null;
  name: string;
  phone: string;
  smsBody: string;
}

/* Form đặt hàng / hỏi giá. Lưu vào DB qua POST /api/orders rồi mới gợi ý gửi SMS —
   khác bản gốc (chỉ mở app nhắn tin), ở đây cửa hàng luôn có bản ghi trên admin. */
export default function OrderModal({
  draft,
  settings,
  onClose,
  onDone,
}: {
  draft: OrderDraft;
  settings: SettingsDTO;
  onClose: () => void;
  onDone: (t: Ticket) => void;
}) {
  const { product } = draft;
  const cur = settings.currency;

  const [variantId, setVariantId] = useState(draft.variantId);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const variant = product.variants.find((v) => v.id === variantId);
  // Hỏi giá khi: draft là QUOTE, hoặc phiên bản đang chọn chưa có giá.
  const type: "ORDER" | "QUOTE" = draft.type === "QUOTE" || (variant && variant.price == null) ? "QUOTE" : "ORDER";
  const needVariant = product.variants.length > 1;
  const total = variant?.price != null ? variant.price * qty : null;

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const phoneDigits = phone.replace(/[^\d]/g, "");
  const errors = {
    variant: needVariant && !variantId ? "Chọn phiên bản." : "",
    name: !name.trim() ? "Nhập họ tên." : "",
    phone: !phone.trim() ? "Nhập số điện thoại." : phoneDigits.length < 8 ? "Số điện thoại chưa hợp lệ." : "",
    address: type === "ORDER" && !address.trim() ? "Nhập địa chỉ giao hàng." : "",
  };
  const valid = !errors.variant && !errors.name && !errors.phone && !errors.address;

  const submit = async () => {
    setTouched(true);
    setServerError("");
    if (!valid || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          note: note.trim() || null,
          items: [{ productId: product.id, variantId: variantId || null, quantity: qty }],
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setServerError(data.error || "Không gửi được yêu cầu, vui lòng thử lại.");
        return;
      }
      const smsBody =
        `[${settings.name} - ${type === "QUOTE" ? "HỎI GIÁ" : "ĐẶT HÀNG"} ${data.code}]\n` +
        `Sản phẩm: ${product.name}${variant ? ` - ${variant.name}` : ""}${qty > 1 ? ` x${qty}` : ""}\n` +
        (total != null ? `Giá niêm yết: ${money(total, cur)}\n` : "") +
        `Họ tên: ${name.trim()}\nSĐT: ${phone.trim()}\n` +
        (address.trim() ? `Địa chỉ: ${address.trim()}\n` : "") +
        (note.trim() ? `Ghi chú: ${note.trim()}\n` : "") +
        `Vui lòng xác nhận còn hàng, phí giao và bảo hành.`;
      onDone({
        type,
        code: data.code,
        productName: product.name,
        variantName: variant?.name ?? "",
        quantity: qty,
        total,
        name: name.trim(),
        phone: phone.trim(),
        smsBody,
      });
    } catch {
      setServerError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ovl" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="order-title">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="hd">
          <h3 id="order-title">{type === "QUOTE" ? "Yêu cầu báo giá" : "Yêu cầu đặt hàng"}</h3>
          <button className="x" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="bd">
          <div className="selected">
            {product.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt="" />
            )}
            <div className="t">
              <small>{product.brand || (product.kind === "VEHICLE" ? "Xe điện" : "Phụ kiện")}</small>
              <b>{product.name}</b>
              {variant && <small>{variant.name}</small>}
            </div>
            <div className="p">{total == null ? "Hỏi giá" : money(total, cur)}</div>
          </div>

          {needVariant && (
            <div>
              <label htmlFor="o-variant">
                Phiên bản <span className="req">*</span>
              </label>
              <Select
                id="o-variant"
                value={variantId}
                placeholder="Chọn phiên bản…"
                options={product.variants.map((v) => ({
                  value: v.id,
                  label: v.name,
                  hint:
                    money(v.price, cur) + (v.stockStatus !== "IN_STOCK" ? ` · ${STOCK_LABEL[v.stockStatus]}` : ""),
                  disabled: v.stockStatus === "OUT_OF_STOCK",
                }))}
                onChange={setVariantId}
              />
              {touched && errors.variant && <div className="err">{errors.variant}</div>}
            </div>
          )}

          <div className="row c2">
            <div>
              <label htmlFor="o-name">
                Họ và tên <span className="req">*</span>
              </label>
              <input
                id="o-name"
                value={name}
                autoComplete="name"
                maxLength={100}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên người nhận"
              />
              {touched && errors.name && <div className="err">{errors.name}</div>}
            </div>
            <div>
              <label htmlFor="o-phone">
                Số điện thoại <span className="req">*</span>
              </label>
              <input
                id="o-phone"
                value={phone}
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-xxxx-xxxx"
              />
              {touched && errors.phone && <div className="err">{errors.phone}</div>}
            </div>
          </div>

          <div className="row c2">
            <div>
              <label htmlFor="o-qty">Số lượng</label>
              <NumberInput id="o-qty" value={qty} min={1} max={20} onChange={setQty} />
            </div>
            <div>
              <label htmlFor="o-address">
                Địa chỉ giao hàng {type === "ORDER" && <span className="req">*</span>}
              </label>
              <input
                id="o-address"
                value={address}
                autoComplete="street-address"
                maxLength={500}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Địa chỉ nhận hàng"
              />
              {touched && errors.address && <div className="err">{errors.address}</div>}
            </div>
          </div>

          <div>
            <label htmlFor="o-note">Ghi chú</label>
            <textarea
              id="o-note"
              value={note}
              maxLength={500}
              rows={2}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Màu xe, thời gian nhận, câu hỏi…"
            />
          </div>

          {serverError && <div className="err">{serverError}</div>}
          <p className="hint" style={{ margin: 0 }}>
            Yêu cầu được lưu cho cửa hàng. Đơn chỉ được xác nhận sau khi cửa hàng gọi lại; giá, phí giao và bảo
            hành sẽ được chốt khi đó.
          </p>
        </div>

        <div className="ft">
          <button className="ghost" onClick={onClose} disabled={busy}>
            Quay lại
          </button>
          <button className="cta" onClick={submit} disabled={busy}>
            {busy ? "Đang gửi…" : type === "QUOTE" ? "Gửi yêu cầu báo giá" : "Gửi yêu cầu đặt hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}
