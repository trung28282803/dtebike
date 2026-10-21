import { NextRequest, NextResponse } from "next/server";
import { ProductKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse, str, int, bool, enumOf } from "@/lib/api";
import { uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

// POST /api/admin/categories  body: { kind, name, sortOrder?, isActive? }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const b = await req.json();
    const name = str(b.name, "tên danh mục", 120);

    const cat = await prisma.category.create({
      data: {
        kind: enumOf(b.kind, "loại", Object.values(ProductKind)),
        name,
        slug: await uniqueSlug(name, async (s) => !!(await prisma.category.findUnique({ where: { slug: s } }))),
        sortOrder: b.sortOrder == null ? 0 : int(b.sortOrder, "thứ tự", 0, 9999),
        isActive: bool(b.isActive, true),
      },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
