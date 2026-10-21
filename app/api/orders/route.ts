import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, OrderType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/orders";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/orders — khách gửi yêu cầu đặt hàng / hỏi giá (công khai).
export async function POST(req: NextRequest) {
  try {
    if (!allowRequest(clientIp(req.headers)))
      return NextResponse.json({ error: "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau ít phút." }, { status: 429 });

    const order = await createOrder(await req.json());
    return NextResponse.json(
      { id: order.id, code: order.code, status: order.status, totalPrice: order.totalPrice },
      { status: 201 }
    );
  } catch (e) {
    return toErrorResponse(e);
  }
}

// GET /api/orders?status=..&type=..&q=.. — admin xem danh sách (200 đơn mới nhất).
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const q = searchParams.get("q")?.trim();

    const list = await prisma.order.findMany({
      where: {
        ...(status && status in OrderStatus ? { status: status as OrderStatus } : {}),
        ...(type && type in OrderType ? { type: type as OrderType } : {}),
        ...(q
          ? {
              OR: [
                { code: { contains: q, mode: "insensitive" as const } },
                { phone: { contains: q } },
                { customerName: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { items: true, logs: { orderBy: { createdAt: "asc" } } },
      take: 200,
    });

    return NextResponse.json({ orders: list });
  } catch (e) {
    return toErrorResponse(e);
  }
}
