import { Link } from "react-router-dom";
import { ADMIN_LOTES_ROUTE, PROJECT_NAME, PUBLIC_PROJECT_ROUTE } from "../../config/project";
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
      <section className="rounded-[34px] border border-stone-200 bg-white/90 px-6 py-7 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Dashboard</p>
            <h2 className="font-display mt-3 text-[2.5rem] leading-tight text-[#092930]">{PROJECT_NAME}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Una vista general del inventario para seguir disponibilidad, reservas y unidades vendidas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={ADMIN_LOTES_ROUTE}
              className="rounded-full bg-[#0f2f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#143b43]"
            >
              Gestionar lotes
            </Link>
            <Link
              to={PUBLIC_PROJECT_ROUTE}
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#092930]"
            >
              Ver sitio
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total de lotes" value={String(metrics.total)} tone="neutral" />
        <DashboardCard label="Disponibles" value={String(metrics.available)} tone="available" />
        <DashboardCard label="Reservados" value={String(metrics.reserved)} tone="reserved" />
        <DashboardCard label="Vendidos" value={String(metrics.sold)} tone="sold" />
      </section>
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
