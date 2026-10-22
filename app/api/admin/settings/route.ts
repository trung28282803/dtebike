import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse, str, optStr, optUrl, optEmail, int, enumOf, strList, phoneStr } from "@/lib/api";

export const runtime = "nodejs";

const CURRENCIES = ["KRW", "VND"] as const;

// PUT /api/admin/settings — thay toàn bộ cấu hình chung của chuỗi (bản ghi đơn id="default").
// Địa chỉ / giờ mở cửa / bản đồ từng chi nhánh: /api/admin/branches.
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const b = await req.json();

    const phoneDisplay = phoneStr(b.phoneDisplay, "số điện thoại");
    const data = {
      name: str(b.name, "tên cửa hàng", 120),
      slogan: optStr(b.slogan, "slogan", 160),
      phoneDisplay,
      // Số dùng cho tel:/sms: — luôn suy từ số hiển thị để hai bên không lệch nhau.
      phone: phoneDisplay.replace(/[^\d+]/g, ""),
      zaloUrl: optUrl(b.zaloUrl, "link Zalo"),
      kakaoUrl: optUrl(b.kakaoUrl, "link KakaoTalk"),
      facebookUrl: optUrl(b.facebookUrl, "link Facebook"),
      messengerUrl: optUrl(b.messengerUrl, "link Messenger"),
      email: optEmail(b.email),
      heroEyebrow: optStr(b.heroEyebrow, "dòng nhỏ hero", 80),
      heroTitle: optStr(b.heroTitle, "tiêu đề hero", 160),
      heroSubtitle: optStr(b.heroSubtitle, "mô tả hero", 300),
      heroHighlights: strList(b.heroHighlights, "điểm nổi bật", 6, 120),
      warrantyFrameMonths: int(b.warrantyFrameMonths, "bảo hành khung", 0, 120),
      warrantyBatteryMonths: int(b.warrantyBatteryMonths, "bảo hành pin", 0, 120),
      warrantyAccessoryMonths: int(b.warrantyAccessoryMonths, "bảo hành phụ kiện", 0, 120),
      shippingNote: optStr(b.shippingNote, "ghi chú giao hàng", 300),
      fineprint: optStr(b.fineprint, "dòng cuối trang", 500),
      currency: enumOf(b.currency, "đơn vị tiền", CURRENCIES),
    };

    const settings = await prisma.shopSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    return NextResponse.json(settings);
  } catch (e) {
    return toErrorResponse(e);
  }
}
