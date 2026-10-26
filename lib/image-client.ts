/* Thu nhỏ ảnh ngay trên trình duyệt trước khi upload.
   Ảnh chụp điện thoại thường 4000px / 5–8 MB; thẻ sản phẩm chỉ cần ~1200px. Nén về WebP
   chất lượng 0.85 còn vài trăm KB — upload nhanh, trang khách tải nhẹ, và nằm dưới giới hạn
   4 MB của API. Ảnh đã nhỏ hơn ngưỡng thì giữ nguyên file gốc. */

// 1200 px đủ cho thẻ sản phẩm (≈ 380 px) lẫn lightbox trên điện thoại; mỗi lượt tải ảnh
// đều tính vào Blob Data Transfer (10 GB/tháng ở gói Hobby) nên giữ ảnh nhỏ nhất có thể.
const MAX_EDGE = 1200;
const QUALITY = 0.8;
const SKIP_BELOW_BYTES = 250 * 1024;

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // định dạng trình duyệt không đọc được → để server quyết định
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Nền trắng cho PNG trong suốt khi chuyển sang định dạng không có alpha.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
  if (!blob) return file;
  // Safari cũ không xuất được WebP → toBlob trả PNG; vẫn dùng được.
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  return new File([blob], name, { type: blob.type });
}

// Upload qua API admin, trả về URL public.
export async function uploadImage(file: File, folder: "vehicles" | "accessories"): Promise<string> {
  const small = await shrinkImage(file);
  const fd = new FormData();
  fd.append("file", small);
  fd.append("folder", folder);
  const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Lỗi ${r.status}.`);
  return data.url as string;
}
