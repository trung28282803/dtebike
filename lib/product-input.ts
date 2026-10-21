import { ProductKind, StockStatus, type Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { str, optStr, int, optInt, optFloat, bool, enumOf, ValidationError } from "./api";

/* Validate body sản phẩm dùng chung cho POST và PATCH — phiên bản và thông số gửi
   nguyên danh sách, server thay toàn bộ (đơn giản, không cần diff từng dòng). */

export interface VariantInput {
  id?: string;
  name: string;
  sku: string | null;
  voltageV: number | null;
  capacityAh: number | null;
  price: number | null;
  compareAtPrice: number | null;
  stockStatus: StockStatus;
  sortOrder: number;
  isActive: boolean;
}

export interface SpecInput {
  label: string;
  value: string;
  sortOrder: number;
}

const MAX_VARIANTS = 30;
const MAX_SPECS = 30;
const MAX_PRICE = 1_000_000_000;

export async function parseProductBody(b: any) {
  const kind = enumOf(b.kind, "loại sản phẩm", Object.values(ProductKind));

  const categoryId = b.categoryId ? str(b.categoryId, "danh mục", 40) : null;
  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { kind: true } });
    if (!cat) throw new ValidationError("Danh mục không tồn tại.");
    if (cat.kind !== kind) throw new ValidationError("Danh mục không cùng loại với sản phẩm.");
  }

  const rawVariants: unknown[] = Array.isArray(b.variants) ? b.variants : [];
  if (rawVariants.length > MAX_VARIANTS) throw new ValidationError(`Tối đa ${MAX_VARIANTS} phiên bản.`);
  const variants: VariantInput[] = rawVariants.map((v: any, i) => ({
    id: typeof v.id === "string" && v.id ? v.id : undefined,
    name: str(v.name, `tên phiên bản #${i + 1}`, 80),
    sku: optStr(v.sku, "SKU", 60) || null,
    voltageV: optInt(v.voltageV, "điện áp", 0, 1000),
    capacityAh: optFloat(v.capacityAh, "dung lượng pin", 0, 1000),
    price: optInt(v.price, "giá", 0, MAX_PRICE),
    compareAtPrice: optInt(v.compareAtPrice, "giá gạch", 0, MAX_PRICE),
    stockStatus: v.stockStatus === undefined ? "IN_STOCK" : enumOf(v.stockStatus, "tình trạng", Object.values(StockStatus)),
    sortOrder: v.sortOrder == null ? i : int(v.sortOrder, "thứ tự", 0, 9999),
    isActive: bool(v.isActive, true),
  }));
  const names = new Set(variants.map((v) => v.name.toLowerCase()));
  if (names.size !== variants.length) throw new ValidationError("Tên phiên bản bị trùng.");
  const skus = variants.map((v) => v.sku).filter(Boolean);
  if (new Set(skus).size !== skus.length) throw new ValidationError("SKU bị trùng.");

  const rawSpecs: unknown[] = Array.isArray(b.specs) ? b.specs : [];
  if (rawSpecs.length > MAX_SPECS) throw new ValidationError(`Tối đa ${MAX_SPECS} thông số.`);
  const specs: SpecInput[] = rawSpecs.map((s: any, i) => ({
    label: str(s.label, `nhãn thông số #${i + 1}`, 60),
    value: str(s.value, `giá trị thông số #${i + 1}`, 200),
    sortOrder: s.sortOrder == null ? i : int(s.sortOrder, "thứ tự", 0, 9999),
  }));

  return {
    kind,
    categoryId,
    brand: optStr(b.brand, "thương hiệu", 80),
    name: str(b.name, "tên sản phẩm", 160),
    summary: optStr(b.summary, "mô tả ngắn", 160),
    description: optStr(b.description, "mô tả", 4000),
    imageUrl: optStr(b.imageUrl, "ảnh", 500),
    imageAlt: optStr(b.imageAlt, "mô tả ảnh", 160),
    sortOrder: b.sortOrder == null ? 0 : int(b.sortOrder, "thứ tự", 0, 9999),
    isFeatured: bool(b.isFeatured, false),
    isActive: bool(b.isActive, true),
    variants,
    specs,
  };
}

export const productInclude = {
  variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
  specs: { orderBy: [{ sortOrder: "asc" }] },
} satisfies Prisma.ProductInclude;
