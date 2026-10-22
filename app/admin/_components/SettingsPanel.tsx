"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SettingsDTO } from "@/lib/catalog";
import { BRAND } from "@/lib/brand";
import { apiCall } from "./ui";
import NumberInput from "@/components/NumberInput";
import Select from "@/components/Select";

const EMPTY: SettingsDTO = {
  name: BRAND.full,
  slogan: "",
  phone: "",
  phoneDisplay: "",
  zaloUrl: "",
  kakaoUrl: "",
  facebookUrl: "",
  messengerUrl: "",
  email: "",
  heroEyebrow: "",
  heroTitle: "",
  heroSubtitle: "",
  heroHighlights: [],
  warrantyFrameMonths: 12,
  warrantyBatteryMonths: 6,
  warrantyAccessoryMonths: 3,
  shippingNote: "",
  fineprint: "",
  currency: "KRW",
};

export default function SettingsPanel({ settings }: { settings: SettingsDTO | null }) {
  const router = useRouter();
  const [f, setF] = useState<SettingsDTO>(settings ?? EMPTY);
  // Điểm nổi bật nhập dạng nhiều dòng — mỗi dòng một ý.
  const [highlights, setHighlights] = useState((settings ?? EMPTY).heroHighlights.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof SettingsDTO>(k: K, v: SettingsDTO[K]) => {
    setF({ ...f, [k]: v });
    setSaved(false);
    setError("");
  };

  const commit = async () => {
    setBusy(true);
    setError("");
    const res = await apiCall("/api/admin/settings", "PUT", {
      ...f,
      heroHighlights: highlights.split("\n").map((s) => s.trim()).filter(Boolean),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="formcard">
      <div className="card">
        <div className="hd">
          <h3>Thông tin cửa hàng</h3>
        </div>
        <div className="bd" style={{ display: "grid", gap: 16 }}>
          <div className="row c2">
            <div>
              <label htmlFor="st-name">Tên cửa hàng</label>
              <input id="st-name" value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label htmlFor="st-slogan">Slogan (dưới tên)</label>
              <input id="st-slogan" value={f.slogan} maxLength={160} onChange={(e) => set("slogan", e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="st-phone">Hotline chung</label>
            <input id="st-phone" value={f.phoneDisplay} inputMode="tel" placeholder="010-6723-2868" onChange={(e) => set("phoneDisplay", e.target.value)} />
            <div className="hint">
              Nút gọi/nhắn tin trên trang khách tự lấy chữ số từ ô này. Địa chỉ, giờ mở cửa và bản đồ của từng cửa hàng
              sửa ở tab <b>Chi nhánh</b>.
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="hd">
          <h3>Kênh liên hệ</h3>
        </div>
        <div className="bd" style={{ display: "grid", gap: 16 }}>
          <div className="row c2">
            <div>
              <label htmlFor="st-fb">Facebook</label>
              <input id="st-fb" value={f.facebookUrl} maxLength={300} placeholder="https://facebook.com/…" onChange={(e) => set("facebookUrl", e.target.value)} />
            </div>
            <div>
              <label htmlFor="st-msg">Messenger</label>
              <input id="st-msg" value={f.messengerUrl} maxLength={300} placeholder="https://m.me/…" onChange={(e) => set("messengerUrl", e.target.value)} />
            </div>
          </div>
          <div className="row c2">
            <div>
              <label htmlFor="st-email">Email</label>
              <input id="st-email" type="email" value={f.email} maxLength={120} placeholder="shop@gmail.com" onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label htmlFor="st-zalo">Zalo</label>
              <input id="st-zalo" value={f.zaloUrl} maxLength={300} placeholder="https://zalo.me/…" onChange={(e) => set("zaloUrl", e.target.value)} />
            </div>
          </div>
          <div className="row c2">
            <div>
              <label htmlFor="st-kakao">KakaoTalk</label>
              <input id="st-kakao" value={f.kakaoUrl} maxLength={300} placeholder="https://open.kakao.com/…" onChange={(e) => set("kakaoUrl", e.target.value)} />
            </div>
          </div>
          <div className="hint" style={{ margin: 0 }}>
            Để trống kênh nào thì trang khách không hiện kênh đó.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="hd">
          <h3>Khối đầu trang (hero)</h3>
        </div>
        <div className="bd" style={{ display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="st-eyebrow">Dòng nhỏ phía trên</label>
            <input id="st-eyebrow" value={f.heroEyebrow} maxLength={80} placeholder="XE ĐIỆN VICTORY · HÀN QUỐC" onChange={(e) => set("heroEyebrow", e.target.value)} />
          </div>
          <div>
            <label htmlFor="st-title">Tiêu đề lớn</label>
            <input id="st-title" value={f.heroTitle} maxLength={160} onChange={(e) => set("heroTitle", e.target.value)} />
          </div>
          <div>
            <label htmlFor="st-sub">Mô tả</label>
            <textarea id="st-sub" value={f.heroSubtitle} maxLength={300} rows={2} onChange={(e) => set("heroSubtitle", e.target.value)} />
          </div>
          <div>
            <label htmlFor="st-hl">Điểm nổi bật (mỗi dòng một ý, tối đa 6)</label>
            <textarea
              id="st-hl"
              value={highlights}
              rows={4}
              onChange={(e) => {
                setHighlights(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="hd">
          <h3>Bảo hành, giao hàng &amp; tiền tệ</h3>
        </div>
        <div className="bd" style={{ display: "grid", gap: 16 }}>
          <div className="row c3">
            <div>
              <label htmlFor="st-w1">Bảo hành khung</label>
              <NumberInput id="st-w1" value={f.warrantyFrameMonths} min={0} max={120} suffix="tháng" onChange={(n) => set("warrantyFrameMonths", n)} />
            </div>
            <div>
              <label htmlFor="st-w2">Bảo hành pin</label>
              <NumberInput id="st-w2" value={f.warrantyBatteryMonths} min={0} max={120} suffix="tháng" onChange={(n) => set("warrantyBatteryMonths", n)} />
            </div>
            <div>
              <label htmlFor="st-w3">Bảo hành phụ kiện</label>
              <NumberInput id="st-w3" value={f.warrantyAccessoryMonths} min={0} max={120} suffix="tháng" onChange={(n) => set("warrantyAccessoryMonths", n)} />
            </div>
          </div>
          <div className="row c2">
            <div>
              <label htmlFor="st-ship">Ghi chú giao hàng</label>
              <input id="st-ship" value={f.shippingNote} maxLength={300} onChange={(e) => set("shippingNote", e.target.value)} />
            </div>
            <div>
              <label htmlFor="st-cur">Đơn vị tiền của bảng giá</label>
              <Select
                id="st-cur"
                value={f.currency}
                options={[
                  { value: "KRW", label: "Won Hàn Quốc (₩)" },
                  { value: "VND", label: "Việt Nam đồng (đ)" },
                ]}
                onChange={(v) => set("currency", v)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="st-fine">Dòng cuối trang</label>
            <textarea id="st-fine" value={f.fineprint} maxLength={500} rows={2} onChange={(e) => set("fineprint", e.target.value)} />
          </div>
        </div>
      </div>

      {error && (
        <div className="err" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}
      <div className="formactions">
        {saved && <span className="okmsg">Đã lưu ✓</span>}
        <button className="add" disabled={busy} onClick={commit}>
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
