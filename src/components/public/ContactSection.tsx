import { useEffect, useMemo, useState } from "react";
import type { LotData } from "../../types/lots";

type ContactSectionProps = {
  defaultWhatsAppHref: string;
  selectedLot: LotData | null;
};

export function ContactSection({ defaultWhatsAppHref, selectedLot }: ContactSectionProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedLot || selectedLot.type !== "lote") {
      return;
    }

    setMessage(
      `Hola, quiero recibir informacion sobre ${selectedLot.name ?? selectedLot.id}. Tambien me interesa coordinar una visita.`
    );
  }, [selectedLot]);

  const whatsappHref = useMemo(() => {
    const lines = [
      name ? `Mi nombre es ${name}.` : "",
      phone ? `Mi contacto es ${phone}.` : "",
      message || "Hola, quiero recibir informacion sobre lotes disponibles en Viva Lago."
    ]
      .filter(Boolean)
      .join(" ");

    if (defaultWhatsAppHref.includes("?text=")) {
      return `${defaultWhatsAppHref}${encodeURIComponent(` ${lines}`)}`;
    }

    return `${defaultWhatsAppHref}${defaultWhatsAppHref.includes("?") ? "&" : "?"}text=${encodeURIComponent(lines)}`;
  }, [defaultWhatsAppHref, message, name, phone]);

  return (
    <section
      id="contacto"
      className="overflow-hidden rounded-[34px] border border-stone-200 bg-[linear-gradient(180deg,#17323d_0%,#223f46_100%)] text-white shadow-[0_35px_90px_rgba(15,23,42,0.14)]"
    >
      <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.95fr)] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-200">Contacto</p>
          <h2 className="font-display mt-4 text-[2.4rem] font-semibold leading-tight text-white">
            Coordiná una consulta simple y seguí avanzando con tu lote.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">
            Si ya encontraste un lote que te interesa, podés continuar por WhatsApp con un mensaje prearmado
            o dejarnos tu intención de visita dentro del mismo flujo comercial.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <TrustPill title="Disponibilidad actualizada" copy="El mapa se alimenta con la misma base vigente del proyecto." />
            <TrustPill title="Financiación visible" copy="La ficha comercial muestra cuotas, entrega y precio cuando están disponibles." />
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/8 p-5 backdrop-blur sm:p-6">
          <div className="grid gap-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field-dark border-white/15 bg-white/10"
              placeholder="Nombre y apellido"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="field-dark border-white/15 bg-white/10"
              placeholder="Teléfono o WhatsApp"
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="field-dark min-h-[150px] border-white/15 bg-white/10"
              placeholder="Contanos qué lote te interesa o si querés agendar una visita."
            />
          </div>

          {selectedLot ? (
            <div className="mt-4 rounded-[22px] border border-white/10 bg-white/6 px-4 py-4 text-sm text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-100">Lote de interés</p>
              <p className="mt-2 font-semibold text-white">{selectedLot.name ?? selectedLot.id}</p>
              <p className="mt-1 text-slate-300">{selectedLot.id}</p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-50"
            >
              Consultar por WhatsApp
            </a>
            <a
              href="#explorar-lotes"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Seguir explorando
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustPill({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{copy}</p>
    </div>
  );
}
