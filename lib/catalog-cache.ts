import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { getPublicCatalog } from "./catalog";

/* Cache danh mục công khai.

   Vì sao: Neon free tier tự ngủ sau 5 phút không truy vấn; lượt xem đầu tiên sau đó phải
   đánh thức DB (2–10 s). Trang khách lại là trang đọc-nhiều-ghi-ít, nên cache ở tầng
   Next (Data Cache + ISR) rồi chỉ xóa cache khi admin sửa dữ liệu → khách gần như không
   bao giờ chờ DB, kể cả khi DB đang ngủ.

   - revalidate 300 s: trần an toàn nếu có thay đổi ngoài admin (sửa thẳng DB).
   - bumpCatalog(): gọi sau MỌI thao tác ghi ở API admin → khách thấy ngay thay đổi. */

export const CATALOG_TAG = "catalog";

export const getCachedPublicCatalog = unstable_cache(getPublicCatalog, ["public-catalog"], {
  tags: [CATALOG_TAG],
  revalidate: 300,
});

// Xóa cả Data Cache (tag) lẫn HTML đã render của trang chủ.
export function bumpCatalog() {
  revalidateTag(CATALOG_TAG);
  revalidatePath("/");
}
