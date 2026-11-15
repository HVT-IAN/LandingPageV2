import React, { useCallback, useEffect, useState } from "react";
import { ApiError, graphqlRequest } from "../api/client";
import { ABOUT_QUERY, UPDATE_ABOUT_MUTATION } from "../api/operations";
import { ImageUploader } from "../components/ImageUploader";
import { RichTextEditor } from "../components/RichTextEditor";
import type {
  About,
  AboutInput,
  GetAboutQuery,
  UpdateAboutMutation,
  UpdateAboutMutationVariables,
} from "../generated/graphql";

export const AboutView: React.FC = () => {
  const [form, setForm] = useState<About>({
    paragraphs: [],
    contentHtml: "",
    contentColumns: 1,
    contentAlign: "left",
    photoUrl: "",
    photoAlt: "",
  });
  const [paragraphInput, setParagraphInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAbout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<GetAboutQuery>(ABOUT_QUERY);
      setForm({
        paragraphs: [...data.about.paragraphs],
        contentHtml: data.about.contentHtml,
        contentColumns:
          data.about.contentColumns === 3
            ? 3
            : data.about.contentColumns === 2
            ? 2
            : 1,
        contentAlign: data.about.contentAlign === "justify" ? "justify" : "left",
        photoUrl: data.about.photoUrl,
        photoAlt: data.about.photoAlt,
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo cargar la sección Sobre mí."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAbout();
  }, [loadAbout]);

  const handleAddParagraph = () => {
    const clean = paragraphInput.trim();
    if (!clean) return;
    setForm((prev) => ({ ...prev, paragraphs: [...prev.paragraphs, clean] }));
    setParagraphInput("");
  };

  const handleUpdateParagraph = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.paragraphs];
      next[index] = value;
      return { ...prev, paragraphs: next };
    });
  };

  const handleRemoveParagraph = (index: number) => {
    setForm((prev) => ({
      ...prev,
      paragraphs: prev.paragraphs.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      // Contrato: updateAbout es REEMPLAZO TOTAL; reenvía paragraphs junto con el resto de campos.
      const input: AboutInput = {
        paragraphs: form.paragraphs.map((p) => p.trim()).filter(Boolean),
        contentHtml: form.contentHtml,
        contentColumns:
          form.contentColumns === 3 ? 3 : form.contentColumns === 2 ? 2 : 1,
        contentAlign: form.contentAlign === "justify" ? "justify" : "left",
        photoUrl: form.photoUrl.trim(),
        photoAlt: form.photoAlt.trim(),
      };

      const data = await graphqlRequest<
        UpdateAboutMutation,
        UpdateAboutMutationVariables
      >(UPDATE_ABOUT_MUTATION, { input });

      setForm({
        paragraphs: [...data.updateAbout.paragraphs],
        contentHtml: data.updateAbout.contentHtml,
        contentColumns: data.updateAbout.contentColumns,
        contentAlign: data.updateAbout.contentAlign,
        photoUrl: data.updateAbout.photoUrl,
        photoAlt: data.updateAbout.photoAlt,
      });
      setFeedback("Sección «Sobre mí» guardada correctamente.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Error al guardar «Sobre mí»."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel-section" aria-labelledby="about-heading">
      <header className="section-header">
        <div>
          <span className="mono-badge">SECCIÓN 02 · BIOGRAFÍA</span>
          <h2 id="about-heading" className="section-title">
            Sobre mí
          </h2>
          <p className="section-subtitle">
            Edita tu presentación con formato enriquecido, columnas (1, 2 o 3), alineación y fotografía.
          </p>
        </div>
      </header>

      {feedback && (
        <div className="alert alert--success" role="status">
          {feedback}
        </div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn--small btn--secondary"
            onClick={() => void loadAbout()}
          >
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="state-box" role="status" aria-live="polite">
          Cargando datos de Sobre mí…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card form-card" noValidate>
          <RichTextEditor
            id="about-content-html"
            label="Contenido enriquecido (HTML)"
            value={form.contentHtml}
            onChange={(html) => setForm((prev) => ({ ...prev, contentHtml: html }))}
            minHeight={420}
            helpText="Sanitizado automáticamente por el backend con nh3."
          />

          <div className="field-row">
            <div className="field-group">
              <label className="field-label" htmlFor="about-columns">
                Columnas del texto
              </label>
              <select
                id="about-columns"
                className="field-select"
                value={form.contentColumns}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    contentColumns: val === 3 ? 3 : val === 2 ? 2 : 1,
                  }));
                }}
              >
                <option value={1}>1 columna</option>
                <option value={2}>2 columnas</option>
                <option value={3}>3 columnas</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="about-align">
                Alineación
              </label>
              <select
                id="about-align"
                className="field-select"
                value={form.contentAlign}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    contentAlign: e.target.value === "justify" ? "justify" : "left",
                  }))
                }
              >
                <option value="left">Izquierda</option>
                <option value="justify">Justificado</option>
              </select>
            </div>
          </div>

          <ImageUploader
            idPrefix="about-photo"
            label="Fotografía (URL)"
            value={form.photoUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, photoUrl: url }))}
            altLabel="Texto alternativo de la foto"
            altValue={form.photoAlt}
            onAltChange={(alt) => setForm((prev) => ({ ...prev, photoAlt: alt }))}
          />

          <div className="field-group">
            <label className="field-label" htmlFor="about-new-paragraph">
              Párrafos de respaldo (`paragraphs` — preservados en reemplazo total)
            </label>
            <div className="input-with-action">
              <input
                id="about-new-paragraph"
                type="text"
                className="field-input"
                value={paragraphInput}
                onChange={(e) => setParagraphInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddParagraph();
                  }
                }}
                placeholder="Añadir párrafo de respaldo..."
              />
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleAddParagraph}
              >
                Añadir párrafo
              </button>
            </div>
            {form.paragraphs.length > 0 && (
              <div className="stack-list">
                {form.paragraphs.map((p, index) => (
                  <div key={index} className="stack-list__item">
                    <span className="mono-badge">P{index + 1}</span>
                    <input
                      type="text"
                      className="field-input"
                      aria-label={`Párrafo ${index + 1}`}
                      value={p}
                      onChange={(e) => handleUpdateParagraph(index, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn--danger btn--small"
                      onClick={() => handleRemoveParagraph(index)}
                      aria-label={`Eliminar párrafo ${index + 1}`}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Guardando cambios…" : "Guardar Sobre mí"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
