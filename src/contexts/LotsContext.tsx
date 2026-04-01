import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PROJECT_SLUG } from "../config/project";
import { structuredLotsData, unmatchedLots } from "../data/structuredLotsData";
import { isFirebaseConfigured } from "../firebase/client";
import { sortLots, subscribeToProjectLots } from "../services/lotsRepository";
import type { LotData } from "../types/lots";

type LotsSource = "firestore" | "seed-data" | "local-fallback";

type LotsContextValue = {
  lots: LotData[];
  lotsById: Map<string, LotData>;
  loading: boolean;
  error: string | null;
  source: LotsSource;
  seedRecommended: boolean;
};

const LotsContext = createContext<LotsContextValue | undefined>(undefined);

export function LotsProvider({ children }: { children: ReactNode }) {
  const [lots, setLots] = useState<LotData[]>(sortLots(structuredLotsData));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<LotsSource>("local-fallback");
  const [seedRecommended, setSeedRecommended] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLots(sortLots(structuredLotsData));
      setSource("local-fallback");
      setSeedRecommended(true);
      setLoading(false);
      return;
    }

    return subscribeToProjectLots(
      PROJECT_SLUG,
      (nextLots, isEmpty) => {
        if (isEmpty) {
          setLots(sortLots(structuredLotsData));
          setSource("seed-data");
          setSeedRecommended(true);
        } else {
          setLots(nextLots);
          setSource("firestore");
          setSeedRecommended(false);
        }

        setError(null);
        setLoading(false);
      },
      (nextError) => {
        console.error("[LotsContext] Error leyendo Firestore:", nextError);
        setLots(sortLots(structuredLotsData));
        setSource("local-fallback");
        setSeedRecommended(true);
        setError("No se pudieron leer los lotes desde Firestore. Se usa fallback local.");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    console.log("[LotsContext] Resumen de carga de lotes:", {
      projectSlug: PROJECT_SLUG,
      source,
      lotsCount: lots.length,
      seedRecommended,
      unmatchedLots
    });
  }, [lots.length, seedRecommended, source]);

  const lotsById = useMemo(() => new Map(lots.map((item) => [item.id, item])), [lots]);

  return (
    <LotsContext.Provider
      value={{
        lots,
        lotsById,
        loading,
        error,
        source,
        seedRecommended
      }}
    >
      {children}
    </LotsContext.Provider>
  );
}

export function useLots() {
  const context = useContext(LotsContext);

  if (!context) {
    throw new Error("useLots debe usarse dentro de LotsProvider.");
  }

  return context;
}
