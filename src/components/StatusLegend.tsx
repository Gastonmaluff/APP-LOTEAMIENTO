import { statusPalette } from "../utils/mapUtils";

const items = [
  { key: "available", label: "Disponible", color: statusPalette.available },
  { key: "reserved", label: "Reservado", color: statusPalette.reserved },
  { key: "sold", label: "Vendido", color: statusPalette.sold }
] as const;

type StatusLegendProps = {
  variant?: "dark" | "light";
};

export function StatusLegend({ variant = "dark" }: StatusLegendProps) {
  const itemClass =
    variant === "light"
      ? "border-stone-200/90 bg-white/80 text-slate-700"
      : "border-white/10 bg-slate-950/70 text-white";

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.key}
          className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${itemClass}`}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
