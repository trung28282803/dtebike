// Định dạng dùng chung cho cả trang khách và trang quản trị.

export const VN_TZ = "Asia/Ho_Chi_Minh";

const SYMBOL: Record<string, string> = { KRW: "₩", VND: "đ", USD: "$" };

/* Giá niêm yết: nhóm nghìn bằng dấu chấm theo thói quen người Việt → 1.059.000₩.
   null = chưa có giá. */
export const money = (n: number | null | undefined, currency = "KRW") => {
  if (n == null) return "Hỏi giá";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + (SYMBOL[currency] ?? currency);
};

// Số thường (đếm, thống kê).
export const num = (n?: number | null) => new Intl.NumberFormat("vi-VN").format(n || 0);

// Nhóm nghìn cho phần nguyên của một chuỗi số (dùng trong NumberInput khi đang gõ).
export const groupDigits = (intPart: string) => intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Mốc thời gian (createdAt…) → hh:mm dd/mm/yyyy theo giờ Việt Nam.
// Luôn ghim timeZone để server và client render ra cùng một chuỗi (tránh hydration mismatch).
export function fmtDateTime(value?: string | Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d))
    p[part.type] = part.value;
  return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  CONFIRMED: "Đã xác nhận",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};

export const ORDER_TYPE_LABEL: Record<string, string> = {
  ORDER: "Đặt mua",
  QUOTE: "Hỏi giá",
};

export const STOCK_LABEL: Record<string, string> = {
  IN_STOCK: "Có sẵn",
  PRE_ORDER: "Đặt trước",
  OUT_OF_STOCK: "Hết hàng",
};

export const KIND_LABEL: Record<string, string> = {
  VEHICLE: "Xe điện",
  ACCESSORY: "Phụ kiện",
};

// Hiển thị SĐT dạng tel: — bỏ mọi ký tự không phải số (giữ dấu + đầu).
export const telHref = (phone: string) => "tel:" + phone.replace(/[^\d+]/g, "");
export const smsHref = (phone: string, body: string) =>
  "sms:" + phone.replace(/[^\d+]/g, "") + "?body=" + encodeURIComponent(body);
