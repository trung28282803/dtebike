-- Chuỗi nhiều chi nhánh: tách địa chỉ / giờ mở cửa / bản đồ khỏi shop_settings thành bảng
-- shop_branches; đơn hàng gắn chi nhánh (SetNull + snapshot tên).
-- Dữ liệu cũ: địa chỉ đang có trong shop_settings được chuyển thành chi nhánh đầu tiên (id = "main").

-- CreateTable
CREATE TABLE "shop_branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "phoneDisplay" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "addressNote" TEXT NOT NULL DEFAULT '',
    "mapUrl" TEXT NOT NULL DEFAULT '',
    "mapEmbedUrl" TEXT NOT NULL DEFAULT '',
    "openHours" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_branches_isActive_sortOrder_idx" ON "shop_branches"("isActive", "sortOrder");

-- Chuyển địa chỉ hiện có thành chi nhánh chính (SĐT để trống → dùng hotline chung).
INSERT INTO "shop_branches" ("id", "name", "address", "addressNote", "mapUrl", "mapEmbedUrl", "openHours", "sortOrder", "updatedAt")
SELECT 'main', 'Cửa hàng chính', "address", "addressNote", "mapUrl", "mapEmbedUrl", "openHours", 0, CURRENT_TIMESTAMP
FROM "shop_settings"
WHERE "id" = 'default';

-- AlterTable: các cột đã chuyển sang shop_branches
ALTER TABLE "shop_settings" DROP COLUMN "address";
ALTER TABLE "shop_settings" DROP COLUMN "addressNote";
ALTER TABLE "shop_settings" DROP COLUMN "mapUrl";
ALTER TABLE "shop_settings" DROP COLUMN "mapEmbedUrl";
ALTER TABLE "shop_settings" DROP COLUMN "openHours";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "branchId" TEXT;
ALTER TABLE "orders" ADD COLUMN "branchName" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "orders_branchId_createdAt_idx" ON "orders"("branchId", "createdAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "shop_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
