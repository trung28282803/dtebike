// Dùng client chung ở lib/prisma.ts để đi qua Neon serverless driver (cổng 443),
// thay vì tự tạo PrismaClient mới (sẽ dùng TCP 5432 và bị firewall chặn).
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { slugify } from "../lib/slug";

/* Dữ liệu demo lấy theo nội dung trang mẫu (giá won Hàn Quốc).
   ⚠️ Seed XÓA SẠCH mọi bảng trước khi ghi — chỉ chạy ở DB trống / môi trường dev. */

async function main() {
  await prisma.orderStatusLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productSpec.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shopService.deleteMany();
  await prisma.shopBranch.deleteMany();
  await prisma.shopSettings.deleteMany();

  /* ---------- Cấu hình chung của chuỗi ---------- */
  await prisma.shopSettings.create({
    data: {
      id: "default",
      name: "Dtebike",
      slogan: "Xe điện Dũng Trần",
      phone: "01067232868",
      phoneDisplay: "010-6723-2868",
      heroEyebrow: "Xe điện Victory · Hàn Quốc",
      heroTitle: "Chọn chiếc xe phù hợp với hành trình của bạn.",
      heroSubtitle: "Xem các mẫu xe, lựa chọn dung lượng pin và gửi yêu cầu đặt hàng trực tiếp cho Dtebike.",
      heroHighlights: [
        "Nhiều lựa chọn dung lượng pin cho từng mẫu xe",
        "Tư vấn và sửa chữa xe điện tận tình",
        "Trao đổi trước để xác nhận phí và khu vực giao hàng",
      ],
      warrantyFrameMonths: 12,
      warrantyBatteryMonths: 6,
      warrantyAccessoryMonths: 3,
      shippingNote: "Phí giao hàng và thời gian nhận xe xác nhận theo địa chỉ thực tế.",
      fineprint:
        "Giá và điều kiện bán hàng cần được cửa hàng xác nhận trước khi thanh toán. Chính sách bảo hành áp dụng theo điều kiện thực tế của người bán.",
      currency: "KRW",
    },
  });

  /* ---------- Chi nhánh: [tên, địa chỉ] — SĐT để trống → dùng hotline chung ---------- */
  const branches: [string, string][] = [
    ["Suwon (수원)", "수원시 매탄동 153-107"],
    ["Cheongju (청주)", "청주시 북대동 865-2"],
    ["Daejeon (대전)", "대전시 용전동 169-14"],
    ["Gyeongsan (경산)", "경산시 임당동 645-11"],
  ];
  await prisma.shopBranch.createMany({
    data: branches.map(([name, address], i) => ({
      name,
      address,
      addressNote: "Vui lòng gọi trước khi đến để được hướng dẫn đường đi.",
      openHours: "09:00 – 19:00 hằng ngày",
      sortOrder: i + 1,
    })),
  });

  /* ---------- Dịch vụ ---------- */
  await prisma.shopService.createMany({
    data: [
      { icon: "🔋", title: "Tư vấn pin", description: "Chọn đúng dung lượng pin cho quãng đường của bạn; xác nhận cấu hình trước khi đặt.", sortOrder: 1 },
      { icon: "🛠️", title: "Sửa chữa xe điện", description: "Lỗi IC/controller, pin, dây điện và các vấn đề vận hành — liên hệ để được kiểm tra.", sortOrder: 2 },
      { icon: "🚚", title: "Giao hàng", description: "Phí giao hàng và thời gian nhận xe được xác nhận theo địa chỉ thực tế.", sortOrder: 3 },
    ],
  });

  /* ---------- Danh mục ---------- */
  const cat = async (kind: "VEHICLE" | "ACCESSORY", name: string, sortOrder: number) =>
    (await prisma.category.create({ data: { kind, name, slug: slugify(name), sortOrder } })).id;

  // Phân loại xe chỉ mang tính minh họa — admin sửa lại theo thực tế.
  const vScooter = await cat("VEHICLE", "Xe máy điện", 1);
  const vBike = await cat("VEHICLE", "Xe đạp điện", 2);

  const aDrive = await cat("ACCESSORY", "Truyền động", 1);
  const aBrake = await cat("ACCESSORY", "Phanh", 2);
  const aElec = await cat("ACCESSORY", "Điện & điều khiển", 3);
  const aBattery = await cat("ACCESSORY", "Pin & sạc", 4);
  const aLight = await cat("ACCESSORY", "Đèn & hiển thị", 5);
  const aBasket = await cat("ACCESSORY", "Giỏ & chở đồ", 6);
  const aSeat = await cat("ACCESSORY", "Tay lái & yên", 7);
  const aTire = await cat("ACCESSORY", "Lốp & bánh xe", 8);
  const aLock = await cat("ACCESSORY", "Bảo vệ & khóa", 9);
  const aOther = await cat("ACCESSORY", "Phụ tùng khác", 10);

  /* ---------- Xe điện: [tên, danh mục, ảnh, nổi bật, [[tên pin, giá]]] ---------- */
  const vehicles: [string, string, string, boolean, [string, number][]][] = [
    ["Victory X5 Pro", vScooter, "victory-x5-pro", true, [["48V 9Ah", 989000], ["48V 12Ah", 1059000], ["48V 15Ah", 1109000], ["48V 21Ah", 1159000], ["48V 24Ah", 1199000]]],
    ["Victory C1", vBike, "victory-c1", false, [["48V 12Ah", 659000], ["48V 20Ah", 799000]]],
    ["Victory M3 Pro Max", vBike, "victory-m3-pro-max", false, [["48V 9Ah", 659000], ["48V 12Ah", 699000], ["48V 15Ah", 749000], ["48V 21Ah", 799000], ["48V 24Ah", 859000]]],
    ["Victory VF900", vScooter, "victory-vf900", false, [["48V 9Ah", 939000], ["48V 12Ah", 989000], ["48V 15Ah", 1029000], ["48V 21Ah", 1089000], ["48V 24Ah", 1139000]]],
    ["Victory Z1000", vScooter, "victory-z1000", false, [["48V 9Ah", 949000], ["48V 12Ah", 999000], ["48V 15Ah", 1049000], ["48V 21Ah", 1099000], ["48V 24Ah", 1149000]]],
    ["Victory Cyber X7", vScooter, "victory-cyber-x7", true, [["48V 21Ah", 1259000], ["48V 24Ah", 1319000]]],
  ];

  let order = 1;
  for (const [name, categoryId, img, featured, batteries] of vehicles) {
    await prisma.product.create({
      data: {
        kind: "VEHICLE",
        categoryId,
        brand: "Victory",
        name,
        slug: slugify(name),
        summary: "Chọn dung lượng pin phù hợp",
        imageUrl: `/images/vehicles/${img}.jpeg`,
        imageAlt: name,
        sortOrder: order++,
        isFeatured: featured,
        variants: {
          create: batteries.map(([vname, price], i) => {
            const m = /(\d+)V (\d+(?:\.\d+)?)Ah/.exec(vname);
            return {
              name: vname,
              voltageV: m ? Number(m[1]) : null,
              capacityAh: m ? Number(m[2]) : null,
              price,
              sortOrder: i,
            };
          }),
        },
        specs: {
          create: [
            { label: "Điện áp", value: "48V", sortOrder: 1 },
            { label: "Pin", value: `${batteries[0][0].split(" ")[1]} – ${batteries[batteries.length - 1][0].split(" ")[1]}`, sortOrder: 2 },
            { label: "Bảo hành khung", value: "12 tháng", sortOrder: 3 },
          ],
        },
      },
    });
  }

  /* ---------- Phụ kiện: [tên, danh mục, ảnh, mô tả ngắn] — chưa có giá → hỏi giá ---------- */
  const accessories: [string, string, string, string][] = [
    ["Nhông líp / bánh răng truyền động", aDrive, "nhong-lip", "Phụ tùng truyền động"],
    ["Yên xe đạp điện", aSeat, "yen-xe", "Phụ tùng yên xe"],
    ["Dây phanh có lò xo", aBrake, "day-phanh-lo-xo", "Phụ tùng phanh"],
    ["Giỏ xe đạp điện bằng kim loại", aBasket, "gio-kim-loai", "Phụ kiện giỏ xe"],
    ["Dây cáp phanh", aBrake, "day-cap-phanh", "Phụ tùng phanh"],
    ["Ổ khóa điện kèm chìa", aElec, "o-khoa-dien", "Phụ tùng điện"],
    ["Bọc / sưởi tay lái", aSeat, "boc-tay-lai", "Phụ kiện tay lái"],
    ["Cụm khóa điện", aElec, "cum-khoa-dien", "Phụ tùng điện"],
    ["Bộ sạc pin xe điện", aBattery, "bo-sac-pin", "Phụ tùng pin"],
    ["Cụm phanh đĩa", aBrake, "cum-phanh-dia", "Phụ tùng phanh"],
    ["Giỏ nhựa có nắp", aBasket, "gio-nhua-co-nap", "Phụ kiện giỏ xe"],
    ["Dây xích xe điện", aDrive, "day-xich", "Phụ tùng truyền động"],
    ["Tay ga điện", aElec, "tay-ga", "Phụ tùng điều khiển"],
    ["Đồng hồ hiển thị", aLight, "dong-ho-hien-thi", "Đồng hồ và màn hình"],
    ["Bộ điều khiển IC", aElec, "bo-dieu-khien-ic", "Bộ điều khiển xe điện"],
    ["Đèn pha LED", aLight, "den-pha-led", "Đèn chiếu sáng"],
    ["Lốp xe điện", aTire, "lop-xe", "Lốp và bánh xe"],
    ["Hộp / bệ pin xe điện", aBattery, "hop-pin", "Phụ tùng pin"],
    ["Bộ má phanh", aBrake, "bo-ma-phanh", "Phụ tùng phanh"],
    ["Khóa chống trộm dạng dây", aLock, "khoa-day-chong-trom", "Phụ kiện bảo vệ xe"],
    ["Chân chống", aOther, "chan-chong", "Phụ tùng khung"],
  ];

  order = 1;
  for (const [name, categoryId, img, summary] of accessories) {
    await prisma.product.create({
      data: {
        kind: "ACCESSORY",
        categoryId,
        name,
        slug: slugify(name),
        summary,
        imageUrl: `/images/accessories/${img}.jpeg`,
        imageAlt: name,
        sortOrder: order++,
        variants: { create: [{ name: "Tiêu chuẩn", price: null, sortOrder: 0 }] },
      },
    });
  }

  console.log(`Seed xong: ${vehicles.length} xe, ${accessories.length} phụ kiện, 12 danh mục, 3 dịch vụ, ${branches.length} chi nhánh.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
