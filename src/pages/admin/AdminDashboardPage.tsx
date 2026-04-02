import { PROJECT_NAME } from "../../config/project";
import { AdminInventorySection } from "./AdminLotsPage";
import { useLots } from "../../contexts/LotsContext";
import { useMemo } from "react";

export function AdminDashboardPage() {
  const { lots } = useLots();

  const metrics = useMemo(() => {
    const vendibleLots = lots.filter((item) => item.type === "lote");

    return {
      total: vendibleLots.length,
      available: vendibleLots.filter((item) => item.status === "available").length,
      reserved: vendibleLots.filter((item) => item.status === "reserved").length,
      sold: vendibleLots.filter((item) => item.status === "sold").length
    };
  }, [lots]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Administracion</p>
        <h1 className="font-display mt-3 text-[2.8rem] leading-tight text-[#092930]">{PROJECT_NAME}</h1>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Dashboard</p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Una vista general del inventario para seguir disponibilidad, reservas y unidades vendidas.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total de lotes" value={String(metrics.total)} tone="neutral" />
        <DashboardCard label="Disponibles" value={String(metrics.available)} tone="available" />
        <DashboardCard label="Reservados" value={String(metrics.reserved)} tone="reserved" />
        <DashboardCard label="Vendidos" value={String(metrics.sold)} tone="sold" />
      </section>

      <AdminInventorySection />
    </div>
  );
}

function DashboardCard({
  label,
  tone,
  value
}: {
  label: string;
  tone: "available" | "neutral" | "reserved" | "sold";
  value: string;
}) {
  const toneClass =
    tone === "available"
      ? "bg-[#eef5eb] text-[#4f684b]"
      : tone === "reserved"
        ? "bg-[#f4ede3] text-[#7a6754]"
        : tone === "sold"
          ? "bg-[#ece8e2] text-[#61594f]"
          : "bg-[#f6f1e8] text-[#0f2f35]";

  return (
    <article className="rounded-[28px] border border-stone-200 bg-white/92 px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="font-display text-[3rem] leading-none text-[#092930]">{value}</p>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${toneClass}`}>{label}</span>
      </div>
    </article>
  );
}
