import { statusPalette } from "../utils/mapUtils";

const items = [
  { key: "available", label: "Disponible", color: statusPalette.available },
  { key: "reserved", label: "Reservado", color: statusPalette.reserved },
  { key: "sold", label: "Vendido", color: statusPalette.sold }
] as const;

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-medium text-white"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
