import { useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { registerSalePayment } from "../../services/financeRepository";
import type { InstallmentRecord, SaleOperationRecord } from "../../types/finance";
import { formatPrice } from "../../utils/mapUtils";

type AdminRegisterPaymentModalProps = {
  installments: InstallmentRecord[];
  onClose: () => void;
  sale: SaleOperationRecord;
};

type PaymentFormState = {
  installmentId: string;
  paidAt: string;
  amount: string;
  paymentMethod: string;
  note: string;
  markAsFullPayment: boolean;
};

export function AdminRegisterPaymentModal({ installments, onClose, sale }: AdminRegisterPaymentModalProps) {
  const { user } = useAuth();
  const pendingInstallments = useMemo(
    () => installments.filter((installment) => installment.status !== "paid"),
    [installments]
  );
  const initialInstallment = pendingInstallments[0] ?? installments[0] ?? null;
  const [form, setForm] = useState<PaymentFormState>({
    installmentId: initialInstallment?.id ?? "",
    paidAt: new Date().toISOString().slice(0, 10),
    amount: initialInstallment?.amount ? String(initialInstallment.amount) : "",
    paymentMethod: "transferencia",
    note: "",
    markAsFullPayment: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInstallment = useMemo(
    () => installments.find((installment) => installment.id === form.installmentId) ?? null,
    [form.installmentId, installments]
  );

  async function handleSubmit() {
    if (!selectedInstallment) {
      setError("Selecciona una cuota.");
      return;
    }

    const amount = Number(form.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un monto valido.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await registerSalePayment(
        sale,
        installments,
        {
          installmentId: selectedInstallment.id,
          paidAt: form.paidAt,
          amount,
          paymentMethod: form.paymentMethod,
          note: form.note,
          markAsFullPayment: form.markAsFullPayment
        },
        user?.email ?? null
      );
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo registrar el cobro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto bg-[#091719]/70 px-3 py-4 backdrop-blur-sm sm:px-6">
      <div className="mx-auto max-w-[760px] rounded-[28px] border border-white/60 bg-[#f8f4ec] p-5 shadow-[0_40px_90px_rgba(5,16,18,0.38)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Registrar cobro</p>
            <h2 className="font-display mt-3 text-[2rem] leading-tight text-[#092930]">{sale.lotLabel}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Cuota">
            <select
              value={form.installmentId}
              onChange={(event) => {
                const nextInstallment = installments.find((installment) => installment.id === event.target.value) ?? null;
                setForm((current) => ({
                  ...current,
                  installmentId: event.target.value,
                  amount: nextInstallment?.amount ? String(nextInstallment.amount) : current.amount
                }));
              }}
              className="field-light"
            >
              {pendingInstallments.map((installment) => (
                <option key={installment.id} value={installment.id}>
                  Cuota {installment.number} - {installment.dueDate} - {formatPrice(installment.amount, sale.currency)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha de pago">
            <input
              type="date"
              value={form.paidAt}
              onChange={(event) => setForm((current) => ({ ...current, paidAt: event.target.value }))}
              className="field-light"
            />
          </Field>

          <Field label="Monto pagado">
            <input
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              className="field-light"
              inputMode="decimal"
            />
          </Field>

          <Field label="Medio de pago">
            <select
              value={form.paymentMethod}
              onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}
              className="field-light"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
          </Field>
        </div>

        <Field label="Observacion">
          <textarea
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            className="field-light mt-4 min-h-[96px]"
          />
        </Field>

        <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.markAsFullPayment}
            onChange={(event) => setForm((current) => ({ ...current, markAsFullPayment: event.target.checked }))}
            className="h-4 w-4 rounded border-stone-300"
          />
          Marcar como pago completo
        </label>

        {selectedInstallment ? (
          <div className="mt-4 rounded-[22px] border border-stone-200 bg-white/70 p-4 text-sm text-slate-700">
            Cuota {selectedInstallment.number} | Vence: {selectedInstallment.dueDate} | Monto esperado:{" "}
            {formatPrice(selectedInstallment.amount, sale.currency)}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={saving}
            className="rounded-full bg-[#0f2f35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#143b43] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Registrando..." : "Registrar cobro"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#8fa88b] hover:text-[#0f2f35]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
