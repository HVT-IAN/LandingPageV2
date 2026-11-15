import React, { useCallback, useEffect, useState } from "react";
import { ApiError, graphqlRequest, resolveAssetUrl } from "../api/client";
import {
  CREATE_PROJECT_MUTATION,
  DELETE_PROJECT_MUTATION,
  PROJECTS_QUERY,
  REORDER_PROJECTS_MUTATION,
  UPDATE_PROJECT_MUTATION,
} from "../api/operations";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ImageUploader } from "../components/ImageUploader";
import { RichTextEditor } from "../components/RichTextEditor";
import type {
  CreateProjectMutation,
  CreateProjectMutationVariables,
  DeleteProjectMutation,
  DeleteProjectMutationVariables,
  GetProjectsQuery,
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  ReorderProjectsMutation,
  ReorderProjectsMutationVariables,
  UpdateProjectMutation,
  UpdateProjectMutationVariables,
} from "../generated/graphql";

export interface ProjectsViewProps {
  initialProjectId?: number | "new" | null;
  onNavigateProject?: (projectId: number | "new" | null) => void;
}

interface ProjectFormState {
  slug: string;
  title: string;
  dateLabel: string;
  role: string;
  description: string;
  descriptionColumns: number;
  descriptionAlign: string;
  imageUrl: string;
  imageAlt: string;
  repoUrl: string;
  demoUrl: string;
  tags: string[];
  featured: boolean;
  published: boolean;
}

const EMPTY_FORM: ProjectFormState = {
  slug: "",
  title: "",
  dateLabel: "",
  role: "",
  description: "",
  descriptionColumns: 1,
  descriptionAlign: "left",
  imageUrl: "",
  imageAlt: "",
  repoUrl: "",
  demoUrl: "",
  tags: [],
  featured: false,
  published: true,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  initialProjectId = null,
  onNavigateProject,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | "new" | null>(initialProjectId);
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<GetProjectsQuery>(PROJECTS_QUERY);
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar los proyectos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Sincroniza deep link (/admin/projects/3 o /admin/projects/new) cuando cargan los proyectos
  useEffect(() => {
    if (initialProjectId === "new") {
      setEditingId("new");
      setForm(EMPTY_FORM);
      setFormError(null);
      return;
    }
    if (typeof initialProjectId === "number" && projects.length > 0) {
      const found = projects.find((p) => p.id === initialProjectId);
      if (found) {
        setEditingId(found.id);
        setForm({
          slug: found.slug,
          title: found.title,
          dateLabel: found.dateLabel,
          role: found.role,
          description: found.description,
          descriptionColumns: found.descriptionColumns === 2 ? 2 : 1,
          descriptionAlign: found.descriptionAlign === "justify" ? "justify" : "left",
          imageUrl: found.imageUrl,
          imageAlt: found.imageAlt,
          repoUrl: found.repoUrl,
          demoUrl: found.demoUrl,
          tags: [...found.tags],
          featured: found.featured,
          published: found.published,
        });
        setFormError(null);
      }
    }
  }, [initialProjectId, projects]);

  const openCreateForm = () => {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setTagInput("");
    setFormError(null);
    setFeedback(null);
    onNavigateProject?.("new");
  };

  const openEditForm = (project: Project) => {
    setEditingId(project.id);
    setForm({
      slug: project.slug,
      title: project.title,
      dateLabel: project.dateLabel,
      role: project.role,
      description: project.description,
      descriptionColumns: project.descriptionColumns === 2 ? 2 : 1,
      descriptionAlign: project.descriptionAlign === "justify" ? "justify" : "left",
      imageUrl: project.imageUrl,
      imageAlt: project.imageAlt,
      repoUrl: project.repoUrl,
      demoUrl: project.demoUrl,
      tags: [...project.tags],
      featured: project.featured,
      published: project.published,
    });
    setTagInput("");
    setFormError(null);
    setFeedback(null);
    onNavigateProject?.(project.id);
  };

  const closeForm = () => {
    setEditingId(null);
    setFormError(null);
    onNavigateProject?.(null);
  };

  const commitOrder = async (orderedProjects: Project[]) => {
    const ids = orderedProjects.map((p) => p.id);
    if (ids.length === 0) return;

    const previous = projects;
    setProjects(orderedProjects);
    setReordering(true);
    setError(null);
    setFeedback(null);

    try {
      const data = await graphqlRequest<
        ReorderProjectsMutation,
        ReorderProjectsMutationVariables
      >(REORDER_PROJECTS_MUTATION, { ids });
      setProjects(data.reorderProjects);
      setFeedback("Orden de proyectos actualizado.");
    } catch (err) {
      setProjects(previous);
      setError(
        err instanceof ApiError ? err.message : "No se pudo guardar el nuevo orden."
      );
    } finally {
      setReordering(false);
    }
  };

  const moveProjectByIndex = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= projects.length) return;
    const next = [...projects];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    void commitOrder(next);
  };

  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const fromIndex = projects.findIndex((p) => p.id === draggedId);
    const toIndex = projects.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      return;
    }
    const next = [...projects];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setDraggedId(null);
    void commitOrder(next);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.altKey && e.key === "ArrowUp") {
      e.preventDefault();
      moveProjectByIndex(index, -1);
    } else if (e.altKey && e.key === "ArrowDown") {
      e.preventDefault();
      moveProjectByIndex(index, 1);
    }
  };

  const handleQuickToggle = async (
    project: Project,
    field: "published" | "featured"
  ) => {
    setError(null);
    setFeedback(null);
    try {
      const input: ProjectUpdateInput = { [field]: !project[field] };
      const data = await graphqlRequest<
        UpdateProjectMutation,
        UpdateProjectMutationVariables
      >(UPDATE_PROJECT_MUTATION, {
        id: project.id,
        input,
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? data.updateProject : p))
      );
      setFeedback(
        `Proyecto "${project.title}" actualizado (${
          field === "published"
            ? data.updateProject.published
              ? "publicado"
              : "oculto"
            : data.updateProject.featured
            ? "destacado"
            : "normal"
        }).`
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo actualizar el proyecto."
      );
    }
  };

  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    if (!form.tags.includes(clean)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, clean] }));
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);

    const slug = form.slug.trim();
    const title = form.title.trim();

    if (!title) {
      setFormError("El título es obligatorio.");
      return;
    }
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setFormError(
        "El slug es obligatorio y solo admite minúsculas, números y guiones internos (ej. mi-proyecto)."
      );
      return;
    }

    setSaving(true);
    try {
      if (editingId === "new") {
        const input: ProjectCreateInput = {
          slug,
          title,
          dateLabel: form.dateLabel.trim(),
          role: form.role.trim(),
          description: form.description,
          descriptionColumns: form.descriptionColumns === 2 ? 2 : 1,
          descriptionAlign: form.descriptionAlign === "justify" ? "justify" : "left",
          imageUrl: form.imageUrl.trim(),
          imageAlt: form.imageAlt.trim(),
          repoUrl: form.repoUrl.trim(),
          demoUrl: form.demoUrl.trim(),
          tags: form.tags,
          featured: form.featured,
          published: form.published,
        };
        const data = await graphqlRequest<
          CreateProjectMutation,
          CreateProjectMutationVariables
        >(CREATE_PROJECT_MUTATION, { input });
        setProjects((prev) => [...prev, data.createProject]);
        setFeedback(`Proyecto "${data.createProject.title}" creado correctamente.`);
        closeForm();
      } else if (typeof editingId === "number") {
        const input: ProjectUpdateInput = {
          slug,
          title,
          dateLabel: form.dateLabel.trim(),
          role: form.role.trim(),
          description: form.description,
          descriptionColumns: form.descriptionColumns === 2 ? 2 : 1,
          descriptionAlign: form.descriptionAlign === "justify" ? "justify" : "left",
          imageUrl: form.imageUrl.trim(),
          imageAlt: form.imageAlt.trim(),
          repoUrl: form.repoUrl.trim(),
          demoUrl: form.demoUrl.trim(),
          tags: form.tags,
          featured: form.featured,
          published: form.published,
        };
        const data = await graphqlRequest<
          UpdateProjectMutation,
          UpdateProjectMutationVariables
        >(UPDATE_PROJECT_MUTATION, { id: editingId, input });
        setProjects((prev) =>
          prev.map((p) => (p.id === editingId ? data.updateProject : p))
        );
        setFeedback(`Proyecto "${data.updateProject.title}" guardado correctamente.`);
        closeForm();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Ocurrió un error al guardar el proyecto.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    setFeedback(null);
    try {
      await graphqlRequest<DeleteProjectMutation, DeleteProjectMutationVariables>(
        DELETE_PROJECT_MUTATION,
        { id: deleteTarget.id }
      );
      const removedTitle = deleteTarget.title;
      const removedId = deleteTarget.id;
      setProjects((prev) => prev.filter((p) => p.id !== removedId));
      if (editingId === removedId) {
        closeForm();
      }
      setDeleteTarget(null);
      setFeedback(`Proyecto "${removedTitle}" eliminado.`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo eliminar el proyecto."
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="panel-section" aria-labelledby="projects-heading">
      <header className="section-header">
        <div>
          <span className="mono-badge">SECCIÓN 01 · PORTAFOLIO</span>
          <h2 id="projects-heading" className="section-title">
            Proyectos
          </h2>
          <p className="section-subtitle">
            Arrastra las filas o usa los botones / teclado (<kbd>Alt</kbd> +{" "}
            <kbd>↑</kbd>/<kbd>↓</kbd>) para reordenar todos los proyectos.
          </p>
        </div>
        <div className="section-header__actions">
          {editingId === null ? (
            <button type="button" className="btn btn--primary" onClick={openCreateForm}>
              + Nuevo proyecto
            </button>
          ) : (
            <button type="button" className="btn btn--secondary" onClick={closeForm}>
              Volver al listado
            </button>
          )}
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
            onClick={() => void loadProjects()}
          >
            Reintentar
          </button>
        </div>
      )}

      {editingId !== null && (
        <form onSubmit={handleSubmitForm} className="card form-card" noValidate>
          <div className="card-header">
            <h3 className="card-title">
              {editingId === "new"
                ? "Crear nuevo proyecto"
                : `Editar proyecto #${editingId}`}
            </h3>
            <button type="button" className="btn btn--ghost" onClick={closeForm}>
              Cancelar
            </button>
          </div>

          {formError && (
            <div className="alert alert--error" role="alert">
              {formError}
            </div>
          )}

          <div className="field-row">
            <div className="field-group">
              <label className="field-label" htmlFor="proj-title">
                Título *
              </label>
              <input
                id="proj-title"
                type="text"
                className="field-input"
                maxLength={160}
                value={form.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    title: newTitle,
                    slug:
                      editingId === "new" && (!prev.slug || prev.slug === slugify(prev.title))
                        ? slugify(newTitle)
                        : prev.slug,
                  }));
                }}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="proj-slug">
                Slug (URL identificador) *
              </label>
              <div className="input-with-action">
                <input
                  id="proj-slug"
                  type="text"
                  className="field-input"
                  maxLength={120}
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="mi-proyecto"
                  required
                />
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }))
                  }
                >
                  Generar
                </button>
              </div>
              <p className="field-help">Patrón: minúsculas, números y guiones (máx. 120).</p>
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label" htmlFor="proj-date">
                Fecha
              </label>
              <input
                id="proj-date"
                type="text"
                className="field-input"
                value={form.dateLabel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dateLabel: e.target.value }))
                }
                placeholder="2025"
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="proj-role">
                Rol
              </label>
              <input
                id="proj-role"
                type="text"
                className="field-input"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                placeholder="Diseño UI & Frontend"
              />
            </div>
          </div>

          <RichTextEditor
            id="proj-description"
            label="Descripción enriquecida"
            value={form.description}
            onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
            minHeight={360}
            helpText="El servidor sanitiza el HTML con nh3 al guardar y al leer."
          />

          <div className="field-row">
            <div className="field-group">
              <label className="field-label" htmlFor="proj-columns">
                Columnas del texto
              </label>
              <select
                id="proj-columns"
                className="field-select"
                value={form.descriptionColumns}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    descriptionColumns: Number(e.target.value) === 2 ? 2 : 1,
                  }))
                }
              >
                <option value={1}>1 columna</option>
                <option value={2}>2 columnas</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="proj-align">
                Alineación
              </label>
              <select
                id="proj-align"
                className="field-select"
                value={form.descriptionAlign}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    descriptionAlign: e.target.value === "justify" ? "justify" : "left",
                  }))
                }
              >
                <option value="left">Izquierda</option>
                <option value="justify">Justificado</option>
              </select>
            </div>
          </div>

          <ImageUploader
            idPrefix="proj-image"
            label="Imagen del proyecto (URL)"
            value={form.imageUrl}
            onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
            altLabel="Texto alternativo de la imagen"
            altValue={form.imageAlt}
            onAltChange={(alt) => setForm((prev) => ({ ...prev, imageAlt: alt }))}
          />

          <div className="field-row">
            <div className="field-group">
              <label className="field-label" htmlFor="proj-repo">
                Repositorio (URL)
              </label>
              <input
                id="proj-repo"
                type="url"
                className="field-input"
                value={form.repoUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, repoUrl: e.target.value }))
                }
                placeholder="https://github.com/..."
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="proj-demo">
                Demo (URL)
              </label>
              <input
                id="proj-demo"
                type="url"
                className="field-input"
                value={form.demoUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, demoUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="proj-tag-input">
              Tags / Tecnologías
            </label>
            <div className="input-with-action">
              <input
                id="proj-tag-input"
                type="text"
                className="field-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Ej. Three.js, React, CSS..."
              />
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleAddTag}
              >
                Añadir tag
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="tag-list" aria-label="Tags del proyecto">
                {form.tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                    <button
                      type="button"
                      className="tag-chip__remove"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Quitar tag ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, published: e.target.checked }))
                }
              />
              <span>Publicado en la landing</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, featured: e.target.checked }))
                }
              />
              <span>Proyecto destacado</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving
                ? "Guardando…"
                : editingId === "new"
                ? "Crear proyecto"
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="state-box" role="status" aria-live="polite">
          Cargando proyectos…
        </div>
      ) : projects.length === 0 ? (
        <div className="state-box state-box--empty">
          <p>No hay proyectos registrados todavía.</p>
          <button type="button" className="btn btn--primary" onClick={openCreateForm}>
            Crear el primer proyecto
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              Listado de proyectos ({projects.length})
              {reordering && <span className="saving-inline"> · Guardando orden…</span>}
            </h3>
          </div>
          <ul className="project-list" aria-label="Lista reordenable de proyectos">
            {projects.map((project, index) => (
              <li
                key={project.id}
                className={`project-item ${
                  draggedId === project.id ? "project-item--dragging" : ""
                }`}
                draggable
                onDragStart={() => handleDragStart(project.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(project.id)}
                onKeyDown={(e) => handleRowKeyDown(e, index)}
                tabIndex={0}
                aria-label={`Proyecto ${index + 1}: ${project.title}. Usa Alt+Flecha Arriba o Abajo para reordenar.`}
              >
                <div className="project-item__order">
                  <span className="drag-handle" aria-hidden="true" title="Arrastrar">
                    ⋮⋮
                  </span>
                  <span className="mono-badge">#{project.position}</span>
                  <div className="order-buttons">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => moveProjectByIndex(index, -1)}
                      disabled={index === 0 || reordering}
                      aria-label={`Mover "${project.title}" hacia arriba`}
                      title="Subir posición"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => moveProjectByIndex(index, 1)}
                      disabled={index === projects.length - 1 || reordering}
                      aria-label={`Mover "${project.title}" hacia abajo`}
                      title="Bajar posición"
                    >
                      ↓
                    </button>
                  </div>
                </div>

                {project.imageUrl && (
                  <img
                    src={resolveAssetUrl(project.imageUrl)}
                    alt={project.imageAlt || project.title}
                    className="project-item__thumb"
                  />
                )}

                <div className="project-item__info">
                  <div className="project-item__title-row">
                    <strong>{project.title}</strong>
                    <code className="slug-code">/{project.slug}</code>
                  </div>
                  <div className="project-item__meta">
                    {project.dateLabel && <span>{project.dateLabel}</span>}
                    {project.role && <span>· {project.role}</span>}
                    <span>· {project.descriptionColumns} col.</span>
                    <span>
                      · {project.descriptionAlign === "justify" ? "Justificado" : "Izquierda"}
                    </span>
                  </div>
                  {project.tags.length > 0 && (
                    <div className="tag-list tag-list--compact">
                      {project.tags.map((t) => (
                        <span key={t} className="tag-chip tag-chip--small">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="project-item__toggles">
                  <button
                    type="button"
                    className={`status-pill ${
                      project.published ? "status-pill--active" : "status-pill--muted"
                    }`}
                    onClick={() => void handleQuickToggle(project, "published")}
                    aria-pressed={project.published}
                  >
                    {project.published ? "Publicado" : "Borrador"}
                  </button>
                  <button
                    type="button"
                    className={`status-pill ${
                      project.featured ? "status-pill--accent" : "status-pill--muted"
                    }`}
                    onClick={() => void handleQuickToggle(project, "featured")}
                    aria-pressed={project.featured}
                  >
                    {project.featured ? "★ Destacado" : "☆ Normal"}
                  </button>
                </div>

                <div className="project-item__actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => openEditForm(project)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    onClick={() => setDeleteTarget(project)}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar proyecto"
        message={
          deleteTarget
            ? `¿Seguro que deseas eliminar permanentemente el proyecto "${deleteTarget.title}" (${deleteTarget.slug})? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Sí, eliminar proyecto"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
};
