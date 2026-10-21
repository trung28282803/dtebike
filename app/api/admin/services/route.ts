import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse, str, optStr, int, bool } from "@/lib/api";

export const runtime = "nodejs";

// POST /api/admin/services — thêm khối dịch vụ hiển thị trên trang khách.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const b = await req.json();
    const svc = await prisma.shopService.create({
      data: {
        icon: optStr(b.icon, "biểu tượng", 8),
        title: str(b.title, "tiêu đề", 80),
        description: optStr(b.description, "mô tả", 400),
        sortOrder: b.sortOrder == null ? 0 : int(b.sortOrder, "thứ tự", 0, 9999),
        isActive: bool(b.isActive, true),
      },
    });
    return NextResponse.json(svc, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
