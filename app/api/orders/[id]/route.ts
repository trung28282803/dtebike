import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/lib/orders";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse, enumOf, optStr } from "@/lib/api";

export const runtime = "nodejs";

const STATUSES = Object.values(OrderStatus);

// PATCH /api/orders/:id  body: { status?, note?, adminNote? }
//   status: chuyển trạng thái (ghi log kèm note). adminNote: ghi chú nội bộ của cửa hàng.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const b = await req.json();

    if (b.status !== undefined) {
      const to = enumOf(b.status, "trạng thái", STATUSES);
      await changeOrderStatus(id, to, optStr(b.note, "ghi chú", 500));
    }
    if (b.adminNote !== undefined) {
      await prisma.order.update({ where: { id }, data: { adminNote: optStr(b.adminNote, "ghi chú nội bộ", 2000) } });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, logs: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) return NextResponse.json({ error: "Không tìm thấy đơn." }, { status: 404 });
    return NextResponse.json(order);
  } catch (e) {
    return toErrorResponse(e);
  }
}
