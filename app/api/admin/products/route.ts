import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { uniqueSlug } from "@/lib/slug";
import { parseProductBody, productInclude } from "@/lib/product-input";

export const runtime = "nodejs";

// POST /api/admin/products — thêm sản phẩm kèm phiên bản + thông số.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { variants, specs, ...data } = await parseProductBody(await req.json());

    const product = await prisma.product.create({
      data: {
        ...data,
        slug: await uniqueSlug(data.name, async (s) => !!(await prisma.product.findUnique({ where: { slug: s } }))),
        variants: { create: variants.map(({ id: _id, ...v }) => v) },
        specs: { create: specs },
      },
      include: productInclude,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
