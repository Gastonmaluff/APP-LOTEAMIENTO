import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PROJECT_SLUG } from "../config/project";
import { isFirebaseConfigured } from "../firebase/client";
import { buildDefaultProjectSettings, subscribeToProjectSettings } from "../services/projectSettingsRepository";
import type { ProjectSettings } from "../types/project";

type ProjectSettingsContextValue = {
  projectSettings: ProjectSettings;
  loading: boolean;
  error: string | null;
  source: "firestore" | "defaults" | "local-fallback";
};

const ProjectSettingsContext = createContext<ProjectSettingsContextValue | undefined>(undefined);

export function ProjectSettingsProvider({ children }: { children: ReactNode }) {
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(() => buildDefaultProjectSettings(PROJECT_SLUG));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"firestore" | "defaults" | "local-fallback">(
    isFirebaseConfigured ? "defaults" : "local-fallback"
  );

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setProjectSettings(buildDefaultProjectSettings(PROJECT_SLUG));
      setSource("local-fallback");
      setLoading(false);
      return;
    }

    return subscribeToProjectSettings(
      PROJECT_SLUG,
      (nextSettings, exists) => {
        setProjectSettings(nextSettings);
        setSource(exists ? "firestore" : "defaults");
        setError(null);
        setLoading(false);
      },
      (nextError) => {
        console.error("[ProjectSettingsContext] Error leyendo configuracion del proyecto:", nextError);
        setProjectSettings(buildDefaultProjectSettings(PROJECT_SLUG));
        setSource("local-fallback");
        setError("No se pudo leer la configuracion visual del proyecto.");
        setLoading(false);
      }
    );
  }, []);

  const value = useMemo(
    () => ({
      projectSettings,
      loading,
      error,
      source
    }),
    [error, loading, projectSettings, source]
  );

  return <ProjectSettingsContext.Provider value={value}>{children}</ProjectSettingsContext.Provider>;
}

export function useProjectSettings() {
  const context = useContext(ProjectSettingsContext);

  if (!context) {
    throw new Error("useProjectSettings debe usarse dentro de ProjectSettingsProvider.");
  }

  return context;
}
