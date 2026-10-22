import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";
import { branchInput } from "@/lib/branch-input";
import { bumpCatalog } from "@/lib/catalog-cache";

export const runtime = "nodejs";

// POST /api/admin/branches — thêm chi nhánh.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const b = await req.json();
    const data = branchInput(b, false) as Required<ReturnType<typeof branchInput>>;
    const branch = await prisma.shopBranch.create({ data });
    bumpCatalog();
    return NextResponse.json(branch, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
