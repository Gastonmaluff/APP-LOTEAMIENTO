import { useEffect, useMemo, useState } from "react";
import { PROJECT_SLUG, PUBLIC_PROJECT_ROUTE } from "../../config/project";
import { useAuth } from "../../contexts/AuthContext";
import { useProjectSettings } from "../../contexts/ProjectSettingsContext";
import {
  deleteProjectAlignmentBackground,
  saveProjectMapAlignment,
  uploadProjectAlignmentBackground
} from "../../services/projectSettingsRepository";
import type { MapAlignmentConfig } from "../../types/project";
import { defaultMapAlignmentConfig } from "../../types/project";
import { clampAlignmentConfig } from "../../utils/mapAlignment";
import { MapAlignmentEditor } from "./MapAlignmentEditor";

export function AdminMapAlignmentSection() {
  const { user } = useAuth();
  const { projectSettings, loading } = useProjectSettings();
  const [draft, setDraft] = useState<MapAlignmentConfig>(projectSettings.mapAlignment);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "saving">("idle");
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(projectSettings.mapAlignment);
    setSaveState("idle");
  }, [projectSettings.mapAlignment]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(projectSettings.mapAlignment) !== JSON.stringify(draft),
    [draft, projectSettings.mapAlignment]
  );

  useEffect(() => {
    if (saveState !== "saved") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveState("idle");
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveState]);

  async function handleBackgroundUpload(file: File) {
    setBackgroundBusy(true);
    setError(null);

    try {
      const uploadedBackground = await uploadProjectAlignmentBackground(PROJECT_SLUG, file);
      if (draft.backgroundImageStoragePath) {
        await deleteProjectAlignmentBackground(draft.backgroundImageStoragePath);
      }
      setDraft((current) =>
        clampAlignmentConfig({
          ...current,
          backgroundImage: uploadedBackground.url,
          backgroundImageStoragePath: uploadedBackground.storagePath
        })
      );
    } catch (nextError) {
      console.error("[AdminMapAlignmentSection] Error subiendo mapa base:", nextError);
      setError(nextError instanceof Error ? nextError.message : "No se pudo subir la imagen base.");
    } finally {
      setBackgroundBusy(false);
    }
  }

  async function handleSave() {
    setSaveState("saving");
    setError(null);

    try {
      await saveProjectMapAlignment(PROJECT_SLUG, draft, user?.email ?? null);
      setSaveState("saved");
    } catch (nextError) {
      console.error("[AdminMapAlignmentSection] Error guardando alineacion:", nextError);
      setError(nextError instanceof Error ? nextError.message : "No se pudo guardar la alineacion.");
      setSaveState("idle");
    }
  }

  function handleReset() {
    setDraft((current) =>
      clampAlignmentConfig({
        ...defaultMapAlignmentConfig,
        backgroundImage: current.backgroundImage,
        backgroundImageStoragePath: current.backgroundImageStoragePath
      })
    );
    setSaveState("idle");
  }

  function handlePreviewPublic() {
    window.open(`${import.meta.env.BASE_URL.replace(/\/$/, "")}${PUBLIC_PROJECT_ROUTE}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#715b3b]">Alineacion sobre mapa</p>
          <h2 className="font-display mt-3 text-[2.15rem] leading-tight text-[#092930]">
            Calibracion visual del loteamiento
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Superpone el SVG sobre una imagen real, afina el fondo con una paleta sobria y guarda la composicion para
            que el sitio publico la use automaticamente.
          </p>
        </div>

        <div className="rounded-[22px] border border-stone-200 bg-white/92 px-4 py-3 text-sm text-slate-600 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          {loading ? "Cargando configuracion visual..." : hasUnsavedChanges ? "Hay cambios listos para guardar." : "La vista publica ya esta alineada con la configuracion guardada."}
        </div>
      </div>

      <MapAlignmentEditor
        backgroundBusy={backgroundBusy}
        error={error}
        onBackgroundUpload={handleBackgroundUpload}
        onChange={(nextValue) => {
          setDraft(nextValue);
          setSaveState("idle");
        }}
        onPreviewPublic={handlePreviewPublic}
        onReset={handleReset}
        onSave={handleSave}
        saveState={saveState}
        value={draft}
      />
    </section>
  );
}
