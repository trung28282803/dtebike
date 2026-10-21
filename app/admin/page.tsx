import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminCatalog } from "@/lib/catalog";
import { BRAND } from "@/lib/brand";
import AdminShell from "./_components/AdminShell";

// middleware đã chặn, nhưng kiểm tra lại ở server để không phụ thuộc một lớp duy nhất.
export const dynamic = "force-dynamic";
export const metadata = { title: `Quản trị — ${BRAND.full}` };

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login?next=%2Fadmin");

  const data = await getAdminCatalog();
  return <AdminShell data={data} />;
}
