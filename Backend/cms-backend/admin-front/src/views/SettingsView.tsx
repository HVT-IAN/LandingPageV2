import React, { useCallback, useEffect, useState } from "react";
import { ApiError, graphqlRequest } from "../api/client";
import { SETTINGS_QUERY, UPDATE_SETTINGS_MUTATION } from "../api/operations";
import { ImageUploader } from "../components/ImageUploader";
import type {
  GetSettingsQuery,
  SettingsInput,
  SiteSettings,
  UpdateSettingsMutation,
  UpdateSettingsMutationVariables,
} from "../generated/graphql";

const EMPTY_SETTINGS: SiteSettings = {
  seoTitle: "",
  metaDescription: "",
  logoUrl: "",
  faviconUrl: "",
  latitude: "",
  longitude: "",
  frameText: "",
  availability: "",
  heroTitle: "",
  heroSubtitle: "",
  heroHook: "",
  ctaPrimary: "",
  ctaSecondary: "",
  contactTitle: "",
  contactText: "",
  contactEmail: "",
};

const SETTINGS_KEYS: Array<keyof SettingsInput> = [
  "seoTitle",
  "metaDescription",
  "logoUrl",
  "faviconUrl",
  "latitude",
  "longitude",
  "frameText",
  "availability",
  "heroTitle",
  "heroSubtitle",
  "heroHook",
  "ctaPrimary",
  "ctaSecondary",
  "contactTitle",
  "contactText",
  "contactEmail",
];

export const SettingsView: React.FC = () => {
  const [original, setOriginal] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [form, setForm] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<GetSettingsQuery>(SETTINGS_QUERY);
      setOriginal(data.settings);
      setForm(data.settings);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar la configuración del sitio."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const setField = (key: keyof SiteSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getModifiedInput = (): SettingsInput => {
    const partial: SettingsInput = {};
    for (const key of SETTINGS_KEYS) {
      if (form[key] !== original[key]) {
        partial[key] = form[key];
      }
    }
    return partial;
  };

  const modifiedCount = Object.keys(getModifiedInput()).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    const partialInput = getModifiedInput();
    if (Object.keys(partialInput).length === 0) {
      setFeedback("No hay cambios pendientes por guardar.");
      return;
    }

    setSaving(true);
    try {
      // Contrato: updateSettings es PARCIAL; envía únicamente los campos modificados.
      const data = await graphqlRequest<
        UpdateSettingsMutation,
        UpdateSettingsMutationVariables
      >(UPDATE_SETTINGS_MUTATION, { input: partialInput });
      setOriginal(data.updateSettings);
      setForm(data.updateSettings);
      setFeedback(
        `Configuración actualizada (${Object.keys(partialInput).length} campo(s) modificado(s)).`
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la configuración."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel-section" aria-labelledby="settings-heading">
      <header className="section-header">
        <div>
          <span className="mono-badge">SECCIÓN 03 · AJUSTES GLOBALES</span>
          <h2 id="settings-heading" className="section-title">
            Configuración del Sitio
          </h2>
          <p className="section-subtitle">
            Fila única de 16 campos (SEO, Hero, CTAs, Marco, Coordenadas y Contacto). Solo se envían los campos modificados.
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
            onClick={() => void loadSettings()}
          >
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="state-box" role="status" aria-live="polite">
          Cargando configuración…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card form-card" noValidate>
          <fieldset className="form-fieldset">
            <legend className="fieldset-legend">1. SEO e Identidad Visual</legend>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="set-seoTitle">
                  Título SEO (máx. 160)
                </label>
                <input
                  id="set-seoTitle"
                  type="text"
                  className="field-input"
                  maxLength={160}
                  value={form.seoTitle}
                  onChange={(e) => setField("seoTitle", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="set-metaDescription">
                  Meta description (máx. 320)
                </label>
                <textarea
                  id="set-metaDescription"
                  className="field-textarea"
                  maxLength={320}
                  rows={2}
                  value={form.metaDescription}
                  onChange={(e) => setField("metaDescription", e.target.value)}
                />
              </div>
            </div>

            <ImageUploader
              idPrefix="set-logo"
              label="Logo (URL)"
              value={form.logoUrl}
              onChange={(url) => setField("logoUrl", url)}
            />

            <ImageUploader
              idPrefix="set-favicon"
              label="Favicon (URL)"
              value={form.faviconUrl}
              onChange={(url) => setField("faviconUrl", url)}
            />
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="fieldset-legend">2. Portada (Hero) y Llamados a la Acción</legend>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="set-heroTitle">
                  Título del Hero
                </label>
                <input
                  id="set-heroTitle"
                  type="text"
                  className="field-input"
                  value={form.heroTitle}
                  onChange={(e) => setField("heroTitle", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="set-heroSubtitle">
                  Subtítulo del Hero
                </label>
                <input
                  id="set-heroSubtitle"
                  type="text"
                  className="field-input"
                  value={form.heroSubtitle}
                  onChange={(e) => setField("heroSubtitle", e.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="set-heroHook">
                Gancho (Hero Hook)
              </label>
              <input
                id="set-heroHook"
                type="text"
                className="field-input"
                value={form.heroHook}
                onChange={(e) => setField("heroHook", e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="set-ctaPrimary">
                  Botón principal (CTA primario)
                </label>
                <input
                  id="set-ctaPrimary"
                  type="text"
                  className="field-input"
                  value={form.ctaPrimary}
                  onChange={(e) => setField("ctaPrimary", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="set-ctaSecondary">
                  Botón secundario (CTA secundario)
                </label>
                <input
                  id="set-ctaSecondary"
                  type="text"
                  className="field-input"
                  value={form.ctaSecondary}
                  onChange={(e) => setField("ctaSecondary", e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="fieldset-legend">3. Marco Técnico y Coordenadas</legend>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="set-latitude">
                  Latitud
                </label>
                <input
                  id="set-latitude"
                  type="text"
                  className="field-input"
                  value={form.latitude}
                  onChange={(e) => setField("latitude", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="set-longitude">
                  Longitud
                </label>
                <input
                  id="set-longitude"
                  type="text"
                  className="field-input"
                  value={form.longitude}
                  onChange={(e) => setField("longitude", e.target.value)}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="set-frameText">
                  Texto del marco
                </label>
                <input
                  id="set-frameText"
                  type="text"
                  className="field-input"
                  value={form.frameText}
                  onChange={(e) => setField("frameText", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="set-availability">
                  Disponibilidad
                </label>
                <input
                  id="set-availability"
                  type="text"
                  className="field-input"
                  value={form.availability}
                  onChange={(e) => setField("availability", e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="fieldset-legend">4. Sección de Contacto</legend>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="set-contactTitle">
                  Título de contacto
                </label>
                <input
                  id="set-contactTitle"
                  type="text"
                  className="field-input"
                  value={form.contactTitle}
                  onChange={(e) => setField("contactTitle", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="set-contactEmail">
                  Email de contacto
                </label>
                <input
                  id="set-contactEmail"
                  type="email"
                  className="field-input"
                  value={form.contactEmail}
                  onChange={(e) => setField("contactEmail", e.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="set-contactText">
                Texto de contacto
              </label>
              <textarea
                id="set-contactText"
                className="field-textarea"
                rows={3}
                value={form.contactText}
                onChange={(e) => setField("contactText", e.target.value)}
              />
            </div>
          </fieldset>

          <div className="form-actions">
            <span className="field-help">
              {modifiedCount > 0
                ? `${modifiedCount} campo(s) modificado(s)`
                : "Sin modificaciones pendientes"}
            </span>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={modifiedCount === 0 || saving}
              onClick={() => {
                setForm(original);
                setFeedback(null);
              }}
            >
              Descartar cambios
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
