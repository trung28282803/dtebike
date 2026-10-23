-- Nhiều ảnh cho một sản phẩm: ảnh phụ lưu mảng theo thứ tự, ảnh chính vẫn ở imageUrl.

-- AlterTable
ALTER TABLE "products" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
