import { useEffect, useRef, useMemo, useState } from "react";
import { AdminFinanceSection } from "../../components/admin/AdminFinanceSection";
import { PROJECT_NAME, PROJECT_SLUG } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
import { useLots } from "../../contexts/LotsContext";
import { syncProjectLotsFromState } from "../../services/lotsRepository";
import { AdminInventorySection } from "./AdminLotsPage";

type AdminModule = "inventory" | "finance";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const { lots, seedRecommended, source } = useLots();
  const [activeModule, setActiveModule] = useState<AdminModule>("inventory");
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncStartedRef = useRef(false);

  const metrics = useMemo(() => {
    const vendibleLots = lots.filter((item) => item.type === "lote");

    return {
      total: vendibleLots.length,
      available: vendibleLots.filter((item) => item.status === "available").length,
      reserved: vendibleLots.filter((item) => item.status === "reserved").length,
      sold: vendibleLots.filter((item) => item.status === "sold").length
    };
  }, [lots]);

  useEffect(() => {
    if (!user || !seedRecommended || source === "local-fallback" || syncStartedRef.current) {
      return;
    }

    syncStartedRef.current = true;
    setSyncError(null);

    console.log("[AdminDashboard] Sincronizando inventario completo hacia Firestore:", {
      source,
      lotsCount: lots.length,
      userEmail: user.email ?? null
    });

    void syncProjectLotsFromState(PROJECT_SLUG, lots, user.email ?? null)
      .then((result) => {
        console.log("[AdminDashboard] Inventario sincronizado:", result);
      })
      .catch((error) => {
        console.error("[AdminDashboard] Error sincronizando inventario:", error);
        setSyncError(error instanceof Error ? error.message : "No se pudo sincronizar el inventario.");
        syncStartedRef.current = false;
      });
  }, [lots, seedRecommended, source, user]);

  return (
    <div className="space-y-5 sm:space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Administracion</p>
        <h1 className="font-display mt-2 text-[2.2rem] leading-tight text-[#092930] sm:mt-3 sm:text-[2.8rem]">{PROJECT_NAME}</h1>
      </section>

      <section className="grid grid-cols-2 gap-2 rounded-full border border-stone-200 bg-white/88 p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:max-w-md">
        <ModuleTab
          active={activeModule === "inventory"}
          label="Inventario"
          onClick={() => setActiveModule("inventory")}
        />
        <ModuleTab
          active={activeModule === "finance"}
          label="Financiero"
          onClick={() => setActiveModule("finance")}
        />
      </section>

      {activeModule === "inventory" ? (
        <>
          {syncError ? (
            <section className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {syncError}
            </section>
          ) : null}

          <section className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
            <DashboardCard label="Total de lotes" value={String(metrics.total)} tone="neutral" />
            <DashboardCard label="Disponibles" value={String(metrics.available)} tone="available" />
            <DashboardCard label="Reservados" value={String(metrics.reserved)} tone="reserved" />
            <DashboardCard label="Vendidos" value={String(metrics.sold)} tone="sold" />
          </section>

          <AdminInventorySection />
        </>
      ) : (
        <AdminFinanceSection />
      )}
    </div>
  );
}

function ModuleTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.24em] transition sm:text-sm",
        active ? "bg-[#092930] text-white" : "text-slate-600 hover:bg-[#f7f1e8] hover:text-[#092930]"
      ].join(" ")}
    >
      {label}
    </button>
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
