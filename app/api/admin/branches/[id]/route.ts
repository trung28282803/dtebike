import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { branchInput } from "@/lib/branch-input";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const b = await req.json();
    const branch = await prisma.shopBranch.update({ where: { id }, data: branchInput(b, true) });
    return NextResponse.json(branch);
  } catch (e) {
    return toErrorResponse(e);
  }
}

// Xóa chi nhánh: đơn cũ giữ snapshot branchName, branchId → null (ON DELETE SET NULL).
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await prisma.shopBranch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
