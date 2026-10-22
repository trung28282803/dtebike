// Định danh thương hiệu — sửa một chỗ, đổi toàn hệ thống.
// Nội dung hiển thị (tên, SĐT, địa chỉ…) nằm trong bảng shop_settings và sửa ở admin;
// ở đây chỉ là giá trị dự phòng + hằng số kỹ thuật.
export const BRAND = {
  name: "Dtebike",
  full: "Dtebike — Xe điện Dũng Trần",
  short: "Dtebike",
  // Logo: ô gradient + BikeIcon (cùng hình với favicon app/icon.svg) — xem class .brand .mark.
  taglineClient: "Xe điện Dũng Trần",
  taglineAdmin: "Trang quản trị",
  // Tiền tố mã đơn: DT + yymmdd + 4 số → DT261021-4821
  codePrefix: "DT",
  thanks: "Cám ơn bạn! Cửa hàng sẽ liên hệ xác nhận hàng, phí giao và bảo hành trong thời gian sớm nhất.",
} as const;
