import { NextResponse } from "next/server";
import { getPublicCatalog } from "@/lib/catalog";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Danh mục công khai: cấu hình cửa hàng, danh mục, sản phẩm (kèm phiên bản/thông số), dịch vụ.
export async function GET() {
  try {
    return NextResponse.json(await getPublicCatalog());
  } catch (e) {
    return toErrorResponse(e);
  }
}
