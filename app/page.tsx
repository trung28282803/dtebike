import { getPublicCatalog } from "@/lib/catalog";
import { BRAND } from "@/lib/brand";
import Storefront from "./_components/Storefront";

// Server Component: đọc danh mục trực tiếp qua Prisma (không tự gọi API của chính mình).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getPublicCatalog();

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
