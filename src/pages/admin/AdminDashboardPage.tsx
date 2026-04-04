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
    <div className="space-y-5 sm:space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Administracion</p>
        <h1 className="font-display mt-2 text-[2.2rem] leading-tight text-[#092930] sm:mt-3 sm:text-[2.8rem]">{PROJECT_NAME}</h1>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
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
    <article className="rounded-[20px] border border-stone-200 bg-white/92 px-3 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:px-6 sm:py-6">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-[11px] sm:tracking-[0.24em]">
        {label}
      </p>
      <div className="mt-2.5 flex items-end justify-between gap-2 sm:mt-5 sm:items-center sm:gap-4">
        <p className="font-display text-[2.15rem] leading-none text-[#092930] sm:text-[3rem]">{value}</p>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:py-1.5 sm:text-xs ${toneClass}`}>
          {label}
        </span>
      </div>
    </article>
  );
}
