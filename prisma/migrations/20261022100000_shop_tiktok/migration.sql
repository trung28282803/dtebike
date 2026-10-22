-- Thêm link TikTok vào cấu hình chung của chuỗi.

-- AlterTable
ALTER TABLE "shop_settings" ADD COLUMN "tiktokUrl" TEXT NOT NULL DEFAULT '';
