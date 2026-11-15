import React, { useCallback, useEffect, useState } from "react";
import { ApiError, graphqlRequest } from "../api/client";
import { REPLACE_SOCIAL_LINKS_MUTATION, SOCIAL_LINKS_QUERY } from "../api/operations";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type {
  GetSocialLinksQuery,
  ReplaceSocialLinksMutation,
  ReplaceSocialLinksMutationVariables,
  SocialLink,
} from "../generated/graphql";

const PLATFORM_REGEX = /^[a-z0-9_-]{2,40}$/;

export const SocialLinksView: React.FC = () => {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [newPlatform, setNewPlatform] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newVisible, setNewVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const loadSocialLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<GetSocialLinksQuery>(SOCIAL_LINKS_QUERY);
      setLinks(
        data.socialLinks.map((l) => ({
          platform: l.platform,
          url: l.url,
          visible: l.visible,
        }))
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las redes sociales."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSocialLinks();
  }, [loadSocialLinks]);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    const platform = newPlatform.trim().toLowerCase();
    const url = newUrl.trim();

    if (!PLATFORM_REGEX.test(platform)) {
      setError(
        "La plataforma debe tener entre 2 y 40 caracteres en minúsculas, números, guiones o guiones bajos (ej. github, linkedin, x_twitter)."
      );
      return;
    }
    if (!url || url.length > 500) {
      setError("La URL es obligatoria (máximo 500 caracteres).");
      return;
    }

    setLinks((prev) => [...prev, { platform, url, visible: newVisible }]);
    setNewPlatform("");
    setNewUrl("");
    setNewVisible(true);
  };

  const updateLinkField = <K extends keyof SocialLink>(
    index: number,
    key: K,
    value: SocialLink[K]
  ) => {
    setLinks((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    setLinks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleSaveAll = async () => {
    setError(null);
    setFeedback(null);

    for (const link of links) {
      const p = link.platform.trim();
      if (!PLATFORM_REGEX.test(p)) {
        setError(
          `Plataforma inválida "${link.platform}". Usa solo minúsculas, números, "-" o "_" (2 a 40 caracteres).`
        );
        return;
      }
      if (!link.url.trim()) {
        setError(`La URL de "${link.platform}" no puede estar vacía.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = links.map((l) => ({
        platform: l.platform.trim(),
        url: l.url.trim(),
        visible: l.visible,
      }));
      const data = await graphqlRequest<
        ReplaceSocialLinksMutation,
        ReplaceSocialLinksMutationVariables
      >(REPLACE_SOCIAL_LINKS_MUTATION, { links: payload });
      setLinks(
        data.replaceSocialLinks.map((l) => ({
          platform: l.platform,
          url: l.url,
          visible: l.visible,
        }))
      );
      setFeedback("Redes sociales actualizadas correctamente (reemplazo total).");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar las redes sociales."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel-section" aria-labelledby="social-heading">
      <header className="section-header">
        <div>
          <span className="mono-badge">SECCIÓN 05 · ENLACES EXTERNOS</span>
          <h2 id="social-heading" className="section-title">
            Redes Sociales
          </h2>
          <p className="section-subtitle">
            Controla la visibilidad y el orden de tus perfiles sociales (reemplazo total).
          </p>
        </div>
        <div className="section-header__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleSaveAll()}
            disabled={saving || loading}
          >
            {saving ? "Guardando…" : "Guardar redes sociales"}
          </button>
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
            onClick={() => void loadSocialLinks()}
          >
            Recargar
          </button>
        </div>
      )}

      <form onSubmit={handleAddLink} className="card form-card--compact" noValidate>
        <div className="field-row field-row--3col">
          <div className="field-group">
            <label className="field-label" htmlFor="social-platform">
              Plataforma (<code>{"^[a-z0-9_-]{2,40}$"}</code>)
            </label>
            <input
              id="social-platform"
              type="text"
              className="field-input"
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              placeholder="github, linkedin, instagram..."
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="social-url">
              URL
            </label>
            <input
              id="social-url"
              type="url"
              className="field-input"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://github.com/..."
            />
          </div>

          <div className="field-group field-group--inline-end">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={newVisible}
                onChange={(e) => setNewVisible(e.target.checked)}
              />
              <span>Visible</span>
            </label>
            <button type="submit" className="btn btn--secondary">
              + Añadir red
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="state-box" role="status" aria-live="polite">
          Cargando redes sociales…
        </div>
      ) : links.length === 0 ? (
        <div className="state-box state-box--empty">
          <p>No hay redes sociales registradas.</p>
        </div>
      ) : (
        <div className="card">
          <ul className="project-list" aria-label="Lista de redes sociales">
            {links.map((link, idx) => (
              <li key={idx} className="project-item">
                <div className="project-item__order">
                  <span className="mono-badge">#{idx + 1}</span>
                  <div className="order-buttons">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => moveLink(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Subir ${link.platform}`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => moveLink(idx, 1)}
                      disabled={idx === links.length - 1}
                      aria-label={`Bajar ${link.platform}`}
                    >
                      ↓
                    </button>
                  </div>
                </div>

                <div className="field-row project-item__info">
                  <div className="field-group">
                    <label className="sr-only" htmlFor={`social-plat-${idx}`}>
                      Plataforma {idx + 1}
                    </label>
                    <input
                      id={`social-plat-${idx}`}
                      type="text"
                      className="field-input"
                      value={link.platform}
                      onChange={(e) =>
                        updateLinkField(idx, "platform", e.target.value)
                      }
                    />
                  </div>
                  <div className="field-group">
                    <label className="sr-only" htmlFor={`social-url-${idx}`}>
                      URL {idx + 1}
                    </label>
                    <input
                      id={`social-url-${idx}`}
                      type="url"
                      className="field-input"
                      value={link.url}
                      onChange={(e) => updateLinkField(idx, "url", e.target.value)}
                    />
                  </div>
                </div>

                <div className="project-item__toggles">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={link.visible}
                      onChange={(e) =>
                        updateLinkField(idx, "visible", e.target.checked)
                      }
                    />
                    <span>{link.visible ? "Visible" : "Oculta"}</span>
                  </label>
                </div>

                <div className="project-item__actions">
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    onClick={() => setDeleteIndex(idx)}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={deleteIndex !== null}
        title="Quitar red social"
        message={
          deleteIndex !== null && links[deleteIndex]
            ? `¿Seguro que deseas quitar "${links[deleteIndex].platform}" de la lista? Recuerda pulsar «Guardar redes sociales» para confirmar el reemplazo.`
            : ""
        }
        confirmLabel="Sí, quitar"
        onConfirm={() => {
          if (deleteIndex !== null) {
            setLinks((prev) => prev.filter((_, idx) => idx !== deleteIndex));
          }
          setDeleteIndex(null);
        }}
        onCancel={() => setDeleteIndex(null)}
      />
    </section>
  );
};
