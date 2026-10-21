"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";
import type { CatalogDTO } from "@/lib/catalog";
import { DialogProvider } from "@/components/Dialog";
import OrdersPanel from "./OrdersPanel";
import ProductsPanel from "./ProductsPanel";
import CategoriesPanel from "./CategoriesPanel";
import ServicesPanel from "./ServicesPanel";
import SettingsPanel from "./SettingsPanel";

type Tab = "orders" | "vehicles" | "accessories" | "categories" | "services" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "orders", label: "Đơn hàng" },
  { key: "vehicles", label: "Xe điện" },
  { key: "accessories", label: "Phụ kiện" },
  { key: "categories", label: "Danh mục" },
  { key: "services", label: "Dịch vụ" },
  { key: "settings", label: "Cửa hàng" },
];

export default function AdminShell({ data }: { data: CatalogDTO }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [newCount, setNewCount] = useState(0);

  // Ổn định tham chiếu để effect đếm trong OrdersPanel không chạy lặp.
  const onNewCount = useCallback((n: number) => setNewCount(n), []);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <DialogProvider>
      <div className="wrap wide">
        <header className="admin-top">
          <div className="brand">
            <div className="mark">{BRAND.mark}</div>
            <div>
              <b>{data.settings?.name || BRAND.short}</b>
              <span>{BRAND.taglineAdmin}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="ghost" href="/" target="_blank">
              Xem trang bán hàng ↗
            </Link>
            <button className="ghost" onClick={logout}>
              Đăng xuất
            </button>
          </div>
        </header>

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === "orders" && newCount > 0 && <span className="pill">{newCount}</span>}
            </button>
          ))}
        </div>

        {tab === "orders" && <OrdersPanel currency={data.settings?.currency ?? "KRW"} onNewCount={onNewCount} />}
        {tab === "vehicles" && <ProductsPanel kind="VEHICLE" data={data} />}
        {tab === "accessories" && <ProductsPanel kind="ACCESSORY" data={data} />}
        {tab === "categories" && <CategoriesPanel data={data} />}
        {tab === "services" && <ServicesPanel data={data} />}
        {tab === "settings" && <SettingsPanel settings={data.settings} />}

        <div className="foot">
          © {new Date().getFullYear()} {BRAND.full} · trang quản trị
        </div>
      </div>
    </DialogProvider>
  );
}
