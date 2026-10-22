import { Prisma, OrderStatus, OrderType } from "@prisma/client";
import { prisma } from "./prisma";
import { BRAND } from "./brand";
import { nextStatuses } from "./order-status";

/* Logic đơn hàng. Đơn chỉ là "yêu cầu" — cửa hàng gọi xác nhận rồi mới chốt,
   nên không trừ tồn kho; chỉ chặn phiên bản đã ẩn/hết hàng. */

export type OrderErrorCode = "INVALID" | "NOT_FOUND" | "OUT_OF_STOCK" | "BAD_TRANSITION";

export class OrderError extends Error {
  constructor(public code: OrderErrorCode, message: string) {
    super(message);
    this.name = "OrderError";
  }
}

export interface OrderInput {
  type: OrderType;
  name: string;
  phone: string;
  address?: string | null;
  note?: string | null;
  // Chi nhánh khách muốn được phục vụ. Bỏ trống: chuỗi chỉ có 1 chi nhánh thì tự gán, còn lại để trống.
  branchId?: string | null;
  // ORDER: cần variantId. QUOTE: productId là đủ (variantId tùy chọn).
  items: { productId: string; variantId?: string | null; quantity?: number }[];
}

const MAX_ITEMS = 10;
const MAX_QTY = 20;

const genCode = () => {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${BRAND.codePrefix}${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
};

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function createOrder(input: OrderInput) {
  /* ---------- 1. Validate đầu vào ---------- */
  if (input.type !== "ORDER" && input.type !== "QUOTE") throw new OrderError("INVALID", "Loại yêu cầu không hợp lệ.");
  if (!input?.items?.length) throw new OrderError("INVALID", "Chưa chọn sản phẩm.");
  if (input.items.length > MAX_ITEMS) throw new OrderError("INVALID", `Tối đa ${MAX_ITEMS} dòng mỗi đơn.`);

  const name = input.name?.trim() || "";
  if (!name) throw new OrderError("INVALID", "Chưa nhập họ tên.");
  if (name.length > 100) throw new OrderError("INVALID", "Họ tên quá dài.");

  const phone = input.phone?.trim() || "";
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) throw new OrderError("INVALID", "Số điện thoại chưa hợp lệ.");

  const address = input.address?.trim() || "";
  if (input.type === "ORDER" && !address) throw new OrderError("INVALID", "Chưa nhập địa chỉ giao hàng.");
  if (address.length > 500) throw new OrderError("INVALID", "Địa chỉ quá dài.");

  const note = input.note?.trim() || "";
  if (note.length > 500) throw new OrderError("INVALID", "Ghi chú quá dài.");

  /* ---------- 2. Đối chiếu sản phẩm/phiên bản với DB — không tin FE ---------- */
  const settings = await prisma.shopSettings.findUnique({ where: { id: "default" }, select: { currency: true } });
  const currency = settings?.currency ?? "KRW";

  // Chi nhánh: phải tồn tại và đang hoạt động. Không chọn mà chuỗi chỉ có 1 chi nhánh thì gán luôn.
  let branch: { id: string; name: string } | null = null;
  if (input.branchId) {
    branch = await prisma.shopBranch.findFirst({
      where: { id: String(input.branchId), isActive: true },
      select: { id: true, name: true },
    });
    if (!branch) throw new OrderError("NOT_FOUND", "Chi nhánh không còn hoạt động.");
  } else {
    const active = await prisma.shopBranch.findMany({ where: { isActive: true }, select: { id: true, name: true }, take: 2 });
    if (active.length === 1) branch = active[0];
  }

  const lines: Prisma.OrderItemCreateWithoutOrderInput[] = [];
  let total: number | null = 0;

  for (const it of input.items) {
    const qty = Math.min(MAX_QTY, Math.max(1, Math.trunc(Number(it.quantity) || 1)));
    const product = await prisma.product.findUnique({
      where: { id: String(it.productId || "") },
      include: { variants: true },
    });
    if (!product || !product.isActive) throw new OrderError("NOT_FOUND", "Sản phẩm không còn bán.");

    let variant = it.variantId ? product.variants.find((v) => v.id === it.variantId) : undefined;
    if (it.variantId && !variant) throw new OrderError("NOT_FOUND", "Phiên bản không tồn tại.");

    // Đặt mua bắt buộc có phiên bản; nếu sản phẩm chỉ có 1 phiên bản đang bán thì tự chọn.
    if (!variant && input.type === "ORDER") {
      const active = product.variants.filter((v) => v.isActive);
      if (active.length === 1) variant = active[0];
      else throw new OrderError("INVALID", `Chưa chọn phiên bản cho ${product.name}.`);
    }

    if (variant) {
      if (!variant.isActive) throw new OrderError("NOT_FOUND", "Phiên bản không còn bán.");
      if (input.type === "ORDER" && variant.stockStatus === "OUT_OF_STOCK")
        throw new OrderError("OUT_OF_STOCK", `${product.name} ${variant.name} đã hết hàng.`);
    }

    const unitPrice = variant?.price ?? null;
    if (unitPrice == null) total = null;
    else if (total != null) total += unitPrice * qty;

    lines.push({
      product: { connect: { id: product.id } },
      ...(variant ? { variant: { connect: { id: variant.id } } } : {}),
      productName: product.name,
      variantName: variant?.name ?? "",
      unitPrice,
      quantity: qty,
    });
  }

  /* ---------- 3. Ghi đơn — mã trùng (P2002) thì sinh lại, tối đa 5 lần ---------- */
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.order.create({
        data: {
          code: genCode(),
          type: input.type,
          customerName: name,
          phone,
          address,
          note,
          ...(branch ? { branch: { connect: { id: branch.id } }, branchName: branch.name } : {}),
          totalPrice: total,
          currency,
          items: { create: lines },
          logs: { create: { fromStatus: null, toStatus: "NEW", note: "Khách gửi yêu cầu từ web" } },
        },
        include: { items: true },
      });
    } catch (e) {
      if (!isUniqueViolation(e) || attempt === 4) throw e;
    }
  }
  throw new Error("unreachable");
}

export async function changeOrderStatus(id: string, to: OrderStatus, note = "") {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.order.findUnique({ where: { id }, select: { status: true } });
    if (!cur) throw new OrderError("NOT_FOUND", "Không tìm thấy đơn.");
    if (!nextStatuses(cur.status).includes(to))
      throw new OrderError("BAD_TRANSITION", `Không chuyển được từ "${cur.status}" sang "${to}".`);

    await tx.orderStatusLog.create({ data: { orderId: id, fromStatus: cur.status, toStatus: to, note } });
    return tx.order.update({ where: { id }, data: { status: to } });
  });
}
