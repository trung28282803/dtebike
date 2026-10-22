import { NextResponse } from "next/server";
import { getCachedPublicCatalog } from "@/lib/catalog-cache";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

// Danh mục công khai: cấu hình cửa hàng, chi nhánh, danh mục, sản phẩm, dịch vụ.
// Đọc từ Data Cache (xem lib/catalog-cache.ts); CDN giữ thêm 60 s.
export async function GET() {
  try {
    return NextResponse.json(await getCachedPublicCatalog(), {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
