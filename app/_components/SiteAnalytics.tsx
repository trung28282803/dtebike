"use client";

import { Analytics } from "@vercel/analytics/next";

/* Vercel Web Analytics — script ~1 KB nạp async sau khi trang hiển thị, không cookie.
   Gói Hobby chỉ có 2.500 lượt xem/tháng nên bỏ qua trang quản trị để dành hạn mức cho khách.
   Tách thành Client Component vì `beforeSend` là hàm — không truyền được từ Server Component (layout). */
export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (new URL(event.url).pathname.startsWith("/admin")) return null;
        return event;
      }}
    />
  );
}
