import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

/* Be Vietnam Pro: thiết kế riêng cho dấu tiếng Việt, có đủ 400–800 cho cả thân
   và tiêu đề. next/font tự host font nên không phụ thuộc Google lúc chạy. */
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bevn",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.full} — Đặt mua xe điện & phụ kiện`,
  description: `${BRAND.full}. Xem mẫu xe, chọn dung lượng pin, hỏi giá phụ kiện và gửi yêu cầu đặt hàng trực tuyến.`,
};

export const viewport: Viewport = {
  themeColor: "#0a2e29",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body>{children}</body>
    </html>
  );
}
