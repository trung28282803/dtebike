import { getCachedPublicCatalog } from "@/lib/catalog-cache";
import { BRAND } from "@/lib/brand";
import Storefront from "./_components/Storefront";

/* Server Component. Trang được render tĩnh và cache (ISR) 5 phút; admin ghi dữ liệu thì
   bumpCatalog() xóa cache ngay. Nhờ vậy khách không phải chờ Neon thức dậy. */
export const revalidate = 300;

export default async function HomePage() {
  const catalog = await getCachedPublicCatalog();

  if (!catalog.settings) {
    return (
      <div className="wrap" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div className="empty" style={{ maxWidth: 480 }}>
          <b>{BRAND.full}</b>
          <br />
          Cửa hàng chưa cấu hình xong. Vui lòng quay lại sau.
        </div>
      </div>
    );
  }

  return <Storefront catalog={catalog} />;
}
