import { prisma } from "./prisma";
import type { Prisma, ProductKind, StockStatus } from "@prisma/client";

/* DTO phẳng, đã serialize — dùng chung cho trang khách (Server Component → Client) và API. */

export interface SettingsDTO {
  name: string;
  slogan: string;
  phone: string;
  phoneDisplay: string;
  address: string;
  addressNote: string;
  mapUrl: string;
  zaloUrl: string;
  kakaoUrl: string;
  openHours: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroHighlights: string[];
  warrantyFrameMonths: number;
  warrantyBatteryMonths: number;
  warrantyAccessoryMonths: number;
  shippingNote: string;
  fineprint: string;
  currency: string;
}

export interface VariantDTO {
  id: string;
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

export interface SpecDTO {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
}

export interface ProductDTO {
  id: string;
  kind: ProductKind;
  categoryId: string | null;
  brand: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  variants: VariantDTO[];
  specs: SpecDTO[];
}

export interface CategoryDTO {
  id: string;
  kind: ProductKind;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceDTO {
  id: string;
  icon: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CatalogDTO {
  settings: SettingsDTO | null;
  categories: CategoryDTO[];
  products: ProductDTO[];
  services: ServiceDTO[];
}

const settingsSelect = {
  name: true,
  slogan: true,
  phone: true,
  phoneDisplay: true,
  address: true,
  addressNote: true,
  mapUrl: true,
  zaloUrl: true,
  kakaoUrl: true,
  openHours: true,
  heroEyebrow: true,
  heroTitle: true,
  heroSubtitle: true,
  heroHighlights: true,
  warrantyFrameMonths: true,
  warrantyBatteryMonths: true,
  warrantyAccessoryMonths: true,
  shippingNote: true,
  fineprint: true,
  currency: true,
} as const;

const productInclude = {
  variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
  specs: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const toProduct = (p: ProductRow, onlyActiveVariants: boolean): ProductDTO => ({
  id: p.id,
  kind: p.kind,
  categoryId: p.categoryId,
  brand: p.brand,
  name: p.name,
  slug: p.slug,
  summary: p.summary,
  description: p.description,
  imageUrl: p.imageUrl,
  imageAlt: p.imageAlt,
  sortOrder: p.sortOrder,
  isFeatured: p.isFeatured,
  isActive: p.isActive,
  variants: p.variants
    .filter((v) => !onlyActiveVariants || v.isActive)
    .map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      voltageV: v.voltageV,
      capacityAh: v.capacityAh,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stockStatus: v.stockStatus,
      sortOrder: v.sortOrder,
      isActive: v.isActive,
    })),
  specs: p.specs.map((s) => ({ id: s.id, label: s.label, value: s.value, sortOrder: s.sortOrder })),
});

export async function getSettings(): Promise<SettingsDTO | null> {
  return prisma.shopSettings.findUnique({ where: { id: "default" }, select: settingsSelect });
}

// Danh mục cho trang khách: chỉ bản ghi đang hoạt động, phiên bản đang bán.
export async function getPublicCatalog(): Promise<CatalogDTO> {
  const [settings, categories, products, services] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: productInclude,
    }),
    prisma.shopService.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
  ]);

  // Sản phẩm thuộc danh mục đã ẩn thì coi như không có danh mục (vẫn hiện, không lọc được).
  const catIds = new Set(categories.map((c) => c.id));

  return {
    settings,
    categories: categories.map((c) => ({
      id: c.id,
      kind: c.kind,
      name: c.name,
      slug: c.slug,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    })),
    products: products.map((p) => {
      const dto = toProduct(p, true);
      if (dto.categoryId && !catIds.has(dto.categoryId)) dto.categoryId = null;
      return dto;
    }),
    services: services.map((s) => ({
      id: s.id,
      icon: s.icon,
      title: s.title,
      description: s.description,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
    })),
  };
}

// Danh mục đầy đủ cho trang quản trị (gồm cả bản ghi đã ẩn).
export async function getAdminCatalog(): Promise<CatalogDTO> {
  const [settings, categories, products, services] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: productInclude }),
    prisma.shopService.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
  ]);

  return {
    settings,
    categories: categories.map((c) => ({
      id: c.id,
      kind: c.kind,
      name: c.name,
      slug: c.slug,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    })),
    products: products.map((p) => toProduct(p, false)),
    services: services.map((s) => ({
      id: s.id,
      icon: s.icon,
      title: s.title,
      description: s.description,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
    })),
  };
}
