import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "../../utils/mapUtils";
import type { InstallmentStatus, SaleOperationRecord } from "../../types/finance";

type CalendarPaymentEntry = {
  id: string;
  saleId: string;
  clientName: string;
  lotLabel: string;
  dueDate: string;
  amount: number;
  installmentNumber: number;
  status: InstallmentStatus;
  currency: SaleOperationRecord["currency"];
};

type AdminPaymentsCalendarProps = {
  entries: CalendarPaymentEntry[];
  loading?: boolean;
};

export function AdminPaymentsCalendar({ entries, loading = false }: AdminPaymentsCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-PY", {
        month: "long",
        year: "numeric"
      }).format(visibleMonth),
    [visibleMonth]
  );

  const entriesByDate = useMemo(() => {
    return entries.reduce<Record<string, CalendarPaymentEntry[]>>((accumulator, entry) => {
      if (!accumulator[entry.dueDate]) {
        accumulator[entry.dueDate] = [];
      }

      accumulator[entry.dueDate].push(entry);
      return accumulator;
    }, {});
  }, [entries]);

  const visibleMonthEntries = useMemo(() => {
    const monthKey = getMonthKey(visibleMonth);
    return entries
      .filter((entry) => entry.dueDate.slice(0, 7) === monthKey)
      .sort((left, right) => {
        if (left.dueDate !== right.dueDate) {
          return left.dueDate.localeCompare(right.dueDate);
        }

        return left.installmentNumber - right.installmentNumber;
      });
  }, [entries, visibleMonth]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth, entriesByDate), [entriesByDate, visibleMonth]);

  useEffect(() => {
    if (visibleMonthEntries.length === 0) {
      setActiveDateKey(null);
      return;
    }

    setActiveDateKey((currentValue) => {
      if (currentValue && visibleMonthEntries.some((entry) => entry.dueDate === currentValue)) {
        return currentValue;
      }

      return visibleMonthEntries[0]?.dueDate ?? null;
    });
  }, [visibleMonthEntries]);

  const activeEntries = activeDateKey ? entriesByDate[activeDateKey] ?? [] : [];

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#715b3b]">Calendario de pagos</p>
          <h3 className="font-display mt-2 text-[1.8rem] text-[#092930]">Vencimientos del mes</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            Visualiza rapidamente los cobros pendientes y vencidos para anticipar seguimiento comercial.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-lg text-[#0f2f35] transition hover:border-[#8fa88b]"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <div className="min-w-[10rem] rounded-full border border-stone-200 bg-[#f7f1e8] px-4 py-2 text-center text-sm font-semibold capitalize text-[#092930]">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-lg text-[#0f2f35] transition hover:border-[#8fa88b]"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={`calendar-header-${index}`} className="h-5 rounded-full bg-stone-100" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <div
                key={`calendar-cell-${index}`}
                className="h-20 animate-pulse rounded-[18px] border border-stone-200 bg-stone-50"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
          <div>
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-xs">
              {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((weekday) => (
                <div key={weekday} className="py-2">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const isActive = activeDateKey === day.isoDate;
                const hasEntries = day.entries.length > 0;

                return (
                  <button
                    key={day.isoDate}
                    type="button"
                    onMouseEnter={() => {
                      if (hasEntries) {
                        setActiveDateKey(day.isoDate);
                      }
                    }}
                    onFocus={() => {
                      if (hasEntries) {
                        setActiveDateKey(day.isoDate);
                      }
                    }}
                    onClick={() => {
                      if (hasEntries) {
                        setActiveDateKey(day.isoDate);
                      }
                    }}
                    className={`min-h-[4.75rem] rounded-[18px] border px-2 py-2 text-left transition sm:min-h-[5.6rem] sm:px-3 sm:py-3 ${
                      day.isCurrentMonth
                        ? "border-stone-200 bg-white text-[#092930]"
                        : "border-stone-100 bg-stone-50/80 text-slate-400"
                    } ${
                      hasEntries
                        ? "shadow-[0_14px_28px_rgba(15,23,42,0.04)] hover:border-[#b7c6b2] hover:bg-[#f5f8f2]"
                        : ""
                    } ${
                      isActive
                        ? "border-[#8fa88b] bg-[#eef4ea] ring-2 ring-[#dbe7d4]"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold sm:text-base">{day.dayNumber}</span>
                      {hasEntries ? (
                        <span className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-[#092930] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {day.entries.length}
                        </span>
                      ) : null}
                    </div>

                    {hasEntries ? (
                      <div className="mt-3 space-y-1">
                        {day.entries.slice(0, 2).map((entry) => (
                          <div
                            key={entry.id}
                            className={`h-1.5 rounded-full ${getStatusFillTone(entry.status)}`}
                          />
                        ))}
                        {day.entries.length > 2 ? (
                          <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            +{day.entries.length - 2} mas
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-stone-200 bg-[#fcfbf8] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {activeDateKey ? formatActiveDate(activeDateKey) : "Detalle del dia"}
            </p>

            {activeEntries.length > 0 ? (
              <div className="mt-4 space-y-3">
                {activeEntries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[18px] border border-stone-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#092930]">{entry.clientName}</p>
                        <p className="mt-1 text-xs text-slate-600 sm:text-sm">{entry.lotLabel}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusTone(entry.status)}`}
                      >
                        {getStatusLabel(entry.status)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-xs leading-6 text-slate-600 sm:text-sm">
                      <p>
                        Cuota {entry.installmentNumber} - {formatPrice(entry.amount, entry.currency)}
                      </p>
                      <p>Vence: {entry.dueDate}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-dashed border-stone-300 bg-stone-50/70 px-4 py-5 text-sm leading-7 text-slate-600">
                {visibleMonthEntries.length === 0
                  ? "No hay cuotas pendientes o vencidas en este mes."
                  : "Toca un dia resaltado para ver cliente, lote, monto y estado del cobro."}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function buildCalendarDays(
  visibleMonth: Date,
  entriesByDate: Record<string, CalendarPaymentEntry[]>
) {
  const firstDay = startOfMonth(visibleMonth);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isoDate = toIsoDate(date);

    return {
      isoDate,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
      entries: entriesByDate[isoDate] ?? []
    };
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKey(date: Date) {
  return toIsoDate(date).slice(0, 7);
}

function formatActiveDate(isoDate: string) {
  return new Intl.DateTimeFormat("es-PY", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${isoDate}T00:00:00`));
}

function getStatusLabel(status: InstallmentStatus) {
  if (status === "paid") {
    return "Pagada";
  }

  if (status === "overdue") {
    return "Vencida";
  }

  return "Pendiente";
}

function getStatusTone(status: InstallmentStatus) {
  if (status === "overdue") {
    return "border-[#d6c2b6] bg-[#f3e6df] text-[#8a5b48]";
  }

  if (status === "paid") {
    return "border-[#cedcc8] bg-[#eff5ec] text-[#567052]";
  }

  return "border-[#dccfbf] bg-[#f6f1ea] text-[#7e6f5d]";
}

function getStatusFillTone(status: InstallmentStatus) {
  if (status === "overdue") {
    return "bg-[#b46d51]";
  }

  if (status === "paid") {
    return "bg-[#6f8f6b]";
  }

  return "bg-[#cbb89d]";
}

