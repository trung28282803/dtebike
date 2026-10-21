-- Thêm liên kết mạng xã hội, email và bản đồ nhúng vào cấu hình cửa hàng.

-- AlterTable
ALTER TABLE "shop_settings" ADD COLUMN "mapEmbedUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "shop_settings" ADD COLUMN "facebookUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "shop_settings" ADD COLUMN "messengerUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "shop_settings" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
