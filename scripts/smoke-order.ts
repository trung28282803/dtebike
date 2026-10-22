/* Smoke test nghiệp vụ đơn hàng trên DB thật (sau khi db:apply + db:seed). Chạy: npm run db:smoke
   Tự dọn dữ liệu tạo ra. Kiểm tra:
     1. Đặt mua xe với phiên bản cụ thể → có mã DT…, tổng = giá × số lượng.
     2. Hỏi giá phụ kiện chưa niêm yết → totalPrice = null.
     3. Chặn phiên bản hết hàng (OUT_OF_STOCK) khi đặt mua.
     4. Chuyển trạng thái đúng luồng; chặn chuyển ngược/kết thúc.
     5. Xóa sản phẩm không làm mất dòng đơn (snapshot + SetNull).
     6. Chi nhánh: chặn id không tồn tại/đã ẩn; xóa chi nhánh vẫn giữ branchName trên đơn. */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { createOrder, changeOrderStatus, OrderError } from "../lib/orders";

const ok = (msg: string) => console.log("✓", msg);
const fail = (msg: string) => {
  console.error("✗", msg);
  process.exitCode = 1;
};

async function expectError(fn: () => Promise<unknown>, code: string, label: string) {
  try {
    await fn();
    fail(`${label}: không ném lỗi`);
  } catch (e) {
    if (e instanceof OrderError && e.code === code) ok(`${label}: ${e.message}`);
    else fail(`${label}: lỗi khác — ${(e as Error).message}`);
  }
}

async function main() {
  const vehicle = await prisma.product.findFirst({ where: { kind: "VEHICLE", isActive: true }, include: { variants: true } });
  const accessory = await prisma.product.findFirst({ where: { kind: "ACCESSORY", isActive: true }, include: { variants: true } });
  if (!vehicle || !accessory) throw new Error("Chưa có dữ liệu — chạy npm run db:seed trước.");
  const variant = vehicle.variants.find((v) => v.price != null)!;

  const created: string[] = [];
  const customer = { name: "Smoke Test", phone: "010-0000-0000", address: "Địa chỉ test" };

  // 1
  const o1 = await createOrder({ type: "ORDER", ...customer, items: [{ productId: vehicle.id, variantId: variant.id, quantity: 2 }] });
  created.push(o1.id);
  if (o1.code.startsWith("DT") && o1.totalPrice === variant.price! * 2) ok(`đặt mua: ${o1.code}, tổng ${o1.totalPrice}`);
  else fail(`đặt mua: mã/tổng sai (${o1.code}, ${o1.totalPrice})`);

  // 2
  const o2 = await createOrder({ type: "QUOTE", name: customer.name, phone: customer.phone, items: [{ productId: accessory.id }] });
  created.push(o2.id);
  if (o2.totalPrice === null && o2.items[0].productName === accessory.name) ok(`hỏi giá: ${o2.code}, chưa có giá`);
  else fail("hỏi giá: totalPrice phải null");

  // 3
  await prisma.productVariant.update({ where: { id: variant.id }, data: { stockStatus: "OUT_OF_STOCK" } });
  await expectError(
    () => createOrder({ type: "ORDER", ...customer, items: [{ productId: vehicle.id, variantId: variant.id }] }),
    "OUT_OF_STOCK",
    "chặn hết hàng"
  );
  await prisma.productVariant.update({ where: { id: variant.id }, data: { stockStatus: "IN_STOCK" } });

  // 4
  await changeOrderStatus(o1.id, "CONTACTED", "đã gọi");
  await changeOrderStatus(o1.id, "CONFIRMED");
  await changeOrderStatus(o1.id, "DELIVERED");
  await expectError(() => changeOrderStatus(o1.id, "CANCELLED"), "BAD_TRANSITION", "chặn hủy đơn đã giao");
  const logs = await prisma.orderStatusLog.count({ where: { orderId: o1.id } });
  if (logs === 4) ok("ghi đủ 4 dòng nhật ký trạng thái");
  else fail(`nhật ký: ${logs} dòng, mong đợi 4`);

  // 5
  const tmp = await prisma.product.create({
    data: { kind: "ACCESSORY", name: "Tạm smoke", slug: `tam-smoke-${Date.now()}`, variants: { create: [{ name: "Tiêu chuẩn", price: 12345 }] } },
    include: { variants: true },
  });
  const o3 = await createOrder({ type: "ORDER", ...customer, items: [{ productId: tmp.id, variantId: tmp.variants[0].id }] });
  created.push(o3.id);
  await prisma.product.delete({ where: { id: tmp.id } });
  const item = await prisma.orderItem.findFirst({ where: { orderId: o3.id } });
  if (item && item.productId === null && item.productName === "Tạm smoke" && item.unitPrice === 12345) ok("xóa sản phẩm vẫn giữ snapshot dòng đơn");
  else fail("snapshot dòng đơn bị mất sau khi xóa sản phẩm");

  // 6
  await expectError(
    () => createOrder({ type: "ORDER", ...customer, branchId: "khong-ton-tai", items: [{ productId: vehicle.id, variantId: variant.id }] }),
    "NOT_FOUND",
    "chặn chi nhánh không tồn tại"
  );
  const tmpBranch = await prisma.shopBranch.create({ data: { name: "Chi nhánh smoke", sortOrder: 9999 } });
  const o4 = await createOrder({ type: "ORDER", ...customer, branchId: tmpBranch.id, items: [{ productId: vehicle.id, variantId: variant.id }] });
  created.push(o4.id);
  await prisma.shopBranch.delete({ where: { id: tmpBranch.id } });
  const o4After = await prisma.order.findUnique({ where: { id: o4.id }, select: { branchId: true, branchName: true } });
  if (o4.branchId === tmpBranch.id && o4After?.branchId === null && o4After.branchName === "Chi nhánh smoke")
    ok("xóa chi nhánh vẫn giữ tên chi nhánh trên đơn");
  else fail(`chi nhánh: branchId=${o4After?.branchId}, branchName=${o4After?.branchName}`);

  await prisma.order.deleteMany({ where: { id: { in: created } } });
  console.log(process.exitCode ? "CÓ LỖI." : "Tất cả OK.");
}

main()
  .catch((e) => {
    console.error("FAIL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
