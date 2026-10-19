import { AdminView } from "@/components/admin-view";
import { requireAdmin } from "@/lib/auth";
import { getDashboard, PERIODS } from "@/lib/dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração", robots: { index: false } };

export default async function Admin({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await requireAdmin("/admin");
  const { p = "30" } = await searchParams;
  const period = PERIODS.some(([v]) => v === p) ? p : "30";
  const d = await getDashboard(period);
  return <AdminView d={d} period={period} />;
}
