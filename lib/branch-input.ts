import { str, optStr, optUrl, mapEmbed, int, bool, ValidationError } from "./api";

/* Validate body chi nhánh — dùng chung POST (đủ trường) và PATCH (chỉ các trường gửi lên). */

export function branchInput(b: any, partial: boolean) {
  const has = (k: string) => !partial || b[k] !== undefined;

  // SĐT chi nhánh không bắt buộc (rỗng → trang khách dùng hotline chung).
  // Có thì phone (tel:/sms:) luôn suy từ phoneDisplay để hai bên không lệch nhau.
  let phoneFields: { phoneDisplay: string; phone: string } | undefined;
  if (has("phoneDisplay")) {
    const phoneDisplay = optStr(b.phoneDisplay, "số điện thoại", 30);
    const digits = phoneDisplay.replace(/[^\d]/g, "");
    if (phoneDisplay && (digits.length < 8 || digits.length > 15))
      throw new ValidationError("Số điện thoại chi nhánh chưa hợp lệ.");
    phoneFields = { phoneDisplay, phone: phoneDisplay.replace(/[^\d+]/g, "") };
  }

  return {
    ...(has("name") ? { name: str(b.name, "tên chi nhánh", 80) } : {}),
    ...(phoneFields ?? {}),
    ...(has("address") ? { address: optStr(b.address, "địa chỉ", 300) } : {}),
    ...(has("addressNote") ? { addressNote: optStr(b.addressNote, "ghi chú địa chỉ", 300) } : {}),
    ...(has("mapUrl") ? { mapUrl: optUrl(b.mapUrl, "link bản đồ") } : {}),
    ...(has("mapEmbedUrl") ? { mapEmbedUrl: mapEmbed(b.mapEmbedUrl) } : {}),
    ...(has("openHours") ? { openHours: optStr(b.openHours, "giờ mở cửa", 120) } : {}),
    ...(has("sortOrder") ? { sortOrder: b.sortOrder == null ? 0 : int(b.sortOrder, "thứ tự", 0, 9999) } : {}),
    ...(has("isActive") ? { isActive: bool(b.isActive, true) } : {}),
  };
}
