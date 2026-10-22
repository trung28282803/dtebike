import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse, str, int, ValidationError } from "@/lib/api";

export const runtime = "nodejs";

// PATCH /api/admin/categories/:id — đổi tên / thứ tự / ẩn-hiện. Không đổi kind (sản phẩm đã gắn theo kind).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const b = await req.json();

    const cat = await prisma.category.update({
      where: { id },
      data: {
        ...(b.name !== undefined ? { name: str(b.name, "tên danh mục", 120) } : {}),
        ...(b.sortOrder !== undefined ? { sortOrder: int(b.sortOrder, "thứ tự", 0, 9999) } : {}),
        ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
      },
    });
    return NextResponse.json(cat);
  } catch (e) {
    return toErrorResponse(e);
  }
}

// DELETE /api/admin/categories/:id — chỉ xóa khi không còn sản phẩm nào thuộc danh mục.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const used = await prisma.productCategory.count({ where: { categoryId: id } });
    if (used > 0) throw new ValidationError(`Danh mục còn ${used} sản phẩm — bỏ danh mục này khỏi các sản phẩm đó trước.`);

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
