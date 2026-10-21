import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse, str, optStr, int } from "@/lib/api";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const b = await req.json();
    const svc = await prisma.shopService.update({
      where: { id },
      data: {
        ...(b.icon !== undefined ? { icon: optStr(b.icon, "biểu tượng", 8) } : {}),
        ...(b.title !== undefined ? { title: str(b.title, "tiêu đề", 80) } : {}),
        ...(b.description !== undefined ? { description: optStr(b.description, "mô tả", 400) } : {}),
        ...(b.sortOrder !== undefined ? { sortOrder: int(b.sortOrder, "thứ tự", 0, 9999) } : {}),
        ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
      },
    });
    return NextResponse.json(svc);
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await prisma.shopService.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
