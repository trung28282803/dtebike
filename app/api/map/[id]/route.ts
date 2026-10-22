import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNaverMapEnabled, fetchStaticMap } from "@/lib/naver-map";

export const runtime = "nodejs";

// GET /api/map/:branchId — ảnh Naver Static Map của chi nhánh (công khai).
// Proxy qua server để không lộ client secret; trình duyệt chỉ thấy URL này.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isNaverMapEnabled()) return NextResponse.json({ error: "Chưa cấu hình Naver Map." }, { status: 404 });

  const { id } = await ctx.params;
  const b = await prisma.shopBranch.findFirst({
    where: { id, isActive: true, lat: { not: null }, lng: { not: null } },
    select: { lat: true, lng: true },
  });
  if (!b) return NextResponse.json({ error: "Chi nhánh chưa có toạ độ." }, { status: 404 });

  const up = await fetchStaticMap(b.lat!, b.lng!);
  if (!up.ok) {
    console.error("Naver Static Map", up.status, await up.text().catch(() => ""));
    return NextResponse.json({ error: "Không lấy được bản đồ." }, { status: 502 });
  }
  return new NextResponse(up.body, {
    headers: {
      "Content-Type": up.headers.get("content-type") || "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
