import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse, ValidationError } from "@/lib/api";
import { parseProductBody, productInclude } from "@/lib/product-input";

export const runtime = "nodejs";

// PATCH /api/admin/products/:id
//   body đầy đủ (như POST) → thay toàn bộ, kể cả phiên bản/thông số.
//   body chỉ { isActive } hoặc { isFeatured } → đổi nhanh cờ, không đụng phần còn lại.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const b = await req.json();

    const quickKeys = ["isActive", "isFeatured", "sortOrder"];
    if (Object.keys(b).every((k) => quickKeys.includes(k))) {
      const p = await prisma.product.update({
        where: { id },
        data: {
          ...(b.isActive !== undefined ? { isActive: !!b.isActive } : {}),
          ...(b.isFeatured !== undefined ? { isFeatured: !!b.isFeatured } : {}),
          ...(b.sortOrder !== undefined ? { sortOrder: Number(b.sortOrder) || 0 } : {}),
        },
        include: productInclude,
      });
      return NextResponse.json(p);
    }

    const { variants, specs, categoryIds, ...data } = await parseProductBody(b);

    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id }, select: { kind: true } });
      if (!existing) throw new ValidationError("Sản phẩm không tồn tại.");
      if (existing.kind !== data.kind) throw new ValidationError("Không đổi được loại sản phẩm (xe ↔ phụ kiện).");

      // Danh mục (N-N): thay toàn bộ danh sách.
      await tx.productCategory.deleteMany({ where: { productId: id } });
      if (categoryIds.length)
        await tx.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId: id, categoryId })) });

      // Phiên bản: giữ id cũ (đơn hàng đang tham chiếu) → update; id mới → create; thiếu → delete.
      const keepIds = variants.filter((v) => v.id).map((v) => v.id!);
      await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: keepIds } } });
      for (const { id: vid, ...v } of variants) {
        if (vid) await tx.productVariant.update({ where: { id: vid, productId: id }, data: v });
        else await tx.productVariant.create({ data: { ...v, productId: id } });
      }

      // Thông số: không ai tham chiếu → xóa tạo lại cho gọn.
      await tx.productSpec.deleteMany({ where: { productId: id } });
      if (specs.length) await tx.productSpec.createMany({ data: specs.map((s) => ({ ...s, productId: id })) });

      return tx.product.update({ where: { id }, data, include: productInclude });
    });

    return NextResponse.json(product);
  } catch (e) {
    return toErrorResponse(e);
  }
}

// DELETE /api/admin/products/:id — đã có trong đơn hàng thì chỉ nên ẩn (đơn giữ snapshot, FK SetNull).
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const force = new URL(req.url).searchParams.get("force") === "1";

    const used = await prisma.orderItem.count({ where: { productId: id } });
    if (used > 0 && !force)
      throw new ValidationError(
        `Sản phẩm đã xuất hiện trong ${used} đơn hàng — hãy dùng nút Ẩn, hoặc xóa với tùy chọn "vẫn xóa" (đơn cũ giữ tên/giá đã lưu).`
      );

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
