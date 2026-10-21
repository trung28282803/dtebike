import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { toErrorResponse, ValidationError } from "@/lib/api";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

/* POST /api/admin/upload  (multipart/form-data: file, folder?)
   Lưu ảnh lên Vercel Blob (public). Cần biến BLOB_READ_WRITE_TOKEN — Vercel tự thêm khi
   tạo Blob store và gắn vào project; chạy local thì copy token đó vào .env.

   Giới hạn 4 MB vì body của Route Handler trên Vercel tối đa 4,5 MB. Client đã tự thu nhỏ
   ảnh (lib/image-client.ts) nên bình thường chỉ vài trăm KB. */

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      throw new ValidationError("Chưa cấu hình kho ảnh (BLOB_READ_WRITE_TOKEN). Xem README mục Ảnh sản phẩm.");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError("Thiếu file ảnh.");

    const ext = ALLOWED[file.type];
    if (!ext) throw new ValidationError("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
    if (file.size > MAX_BYTES) throw new ValidationError("Ảnh quá lớn (tối đa 4 MB).");

    const folder = form.get("folder") === "vehicles" ? "vehicles" : "accessories";
    const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "anh";

    // addRandomSuffix: hai ảnh cùng tên không đè nhau; cache CDN cũng không dính ảnh cũ.
    const blob = await put(`${folder}/${base}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ url: blob.url, size: file.size }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
