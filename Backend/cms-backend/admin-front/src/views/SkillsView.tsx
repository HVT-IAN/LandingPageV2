import React, { useCallback, useEffect, useState } from "react";
import { ApiError, graphqlRequest } from "../api/client";
import { REPLACE_SKILLS_MUTATION, SKILLS_QUERY } from "../api/operations";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type {
  GetSkillsQuery,
  ReplaceSkillsMutation,
  ReplaceSkillsMutationVariables,
  SkillGroup,
} from "../generated/graphql";

export const SkillsView: React.FC = () => {
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [skillInputs, setSkillInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteGroupIndex, setDeleteGroupIndex] = useState<number | null>(null);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<GetSkillsQuery>(SKILLS_QUERY);
      setGroups(
        data.skills.groups.map((g) => ({
          name: g.name,
          skills: [...g.skills],
        }))
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los grupos de tecnologías."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newGroupName.trim();
    if (!clean) return;
    setGroups((prev) => [...prev, { name: clean, skills: [] }]);
    setNewGroupName("");
    setFeedback(null);
  };

  const handleGroupNameChange = (index: number, name: string) => {
    setGroups((prev) =>
      prev.map((g, idx) => (idx === index ? { ...g, name } : g))
    );
  };

  const moveGroup = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= groups.length) return;
    setGroups((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleAddSkill = (groupIndex: number) => {
    const raw = (skillInputs[groupIndex] ?? "").trim();
    if (!raw) return;
    setGroups((prev) =>
      prev.map((g, idx) =>
        idx === groupIndex ? { ...g, skills: [...g.skills, raw] } : g
      )
    );
    setSkillInputs((prev) => ({ ...prev, [groupIndex]: "" }));
  };

  const handleRemoveSkill = (groupIndex: number, skillIndex: number) => {
    setGroups((prev) =>
      prev.map((g, idx) =>
        idx === groupIndex
          ? { ...g, skills: g.skills.filter((_, sIdx) => sIdx !== skillIndex) }
          : g
      )
    );
  };

  const moveSkill = (groupIndex: number, skillIndex: number, direction: -1 | 1) => {
    setGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== groupIndex) return g;
        const target = skillIndex + direction;
        if (target < 0 || target >= g.skills.length) return g;
        const nextSkills = [...g.skills];
        const [moved] = nextSkills.splice(skillIndex, 1);
        nextSkills.splice(target, 0, moved);
        return { ...g, skills: nextSkills };
      })
    );
  };

  const handleSaveAll = async () => {
    setError(null);
    setFeedback(null);

    for (const g of groups) {
      if (!g.name.trim()) {
        setError("Todos los grupos deben tener un nombre (máx. 80 caracteres).");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = groups.map((g) => ({
        name: g.name.trim(),
        skills: g.skills.map((s) => s.trim()).filter(Boolean),
      }));
      const data = await graphqlRequest<
        ReplaceSkillsMutation,
        ReplaceSkillsMutationVariables
      >(REPLACE_SKILLS_MUTATION, { groups: payload });
      setGroups(
        data.replaceSkills.groups.map((g) => ({
          name: g.name,
          skills: [...g.skills],
        }))
      );
      setFeedback("Grupos y tecnologías guardados correctamente (reemplazo total).");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar las tecnologías."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel-section" aria-labelledby="skills-heading">
      <header className="section-header">
        <div>
          <span className="mono-badge">SECCIÓN 04 · STACK TÉCNICO</span>
          <h2 id="skills-heading" className="section-title">
            Tecnologías y Habilidades
          </h2>
          <p className="section-subtitle">
            Administra los grupos y sus tecnologías. Al guardar se realiza el reemplazo total respetando el orden.
          </p>
        </div>
        <div className="section-header__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleSaveAll()}
            disabled={saving || loading}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
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
            onClick={() => void loadSkills()}
          >
            Recargar
          </button>
        </div>
      )}

      <form onSubmit={handleAddGroup} className="card form-card--compact">
        <div className="field-group">
          <label className="field-label" htmlFor="new-skill-group">
            Nuevo grupo de tecnologías
          </label>
          <div className="input-with-action">
            <input
              id="new-skill-group"
              type="text"
              className="field-input"
              maxLength={80}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ej. Frontend, Backend, Herramientas..."
            />
            <button type="submit" className="btn btn--secondary">
              + Añadir grupo
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="state-box" role="status" aria-live="polite">
          Cargando grupos de tecnologías…
        </div>
      ) : groups.length === 0 ? (
        <div className="state-box state-box--empty">
          <p>No hay grupos de tecnologías configurados.</p>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="card skill-group-card">
              <div className="skill-group-card__header">
                <div className="order-buttons">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => moveGroup(gIdx, -1)}
                    disabled={gIdx === 0}
                    aria-label={`Subir grupo ${group.name}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => moveGroup(gIdx, 1)}
                    disabled={gIdx === groups.length - 1}
                    aria-label={`Bajar grupo ${group.name}`}
                  >
                    ↓
                  </button>
                </div>
                <input
                  type="text"
                  className="field-input field-input--bold"
                  maxLength={80}
                  value={group.name}
                  onChange={(e) => handleGroupNameChange(gIdx, e.target.value)}
                  aria-label={`Nombre del grupo ${gIdx + 1}`}
                />
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => setDeleteGroupIndex(gIdx)}
                >
                  Eliminar grupo
                </button>
              </div>

              <div className="input-with-action">
                <input
                  type="text"
                  className="field-input"
                  value={skillInputs[gIdx] ?? ""}
                  onChange={(e) =>
                    setSkillInputs((prev) => ({ ...prev, [gIdx]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill(gIdx);
                    }
                  }}
                  placeholder={`Añadir skill a ${group.name || "este grupo"}...`}
                  aria-label={`Nueva tecnología para ${group.name}`}
                />
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => handleAddSkill(gIdx)}
                >
                  Añadir
                </button>
              </div>

              {group.skills.length === 0 ? (
                <p className="field-help">Sin tecnologías en este grupo.</p>
              ) : (
                <ul className="skill-items-list" aria-label={`Skills de ${group.name}`}>
                  {group.skills.map((skill, sIdx) => (
                    <li key={`${skill}-${sIdx}`} className="skill-item-row">
                      <span className="skill-item-row__name">{skill}</span>
                      <div className="skill-item-row__actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => moveSkill(gIdx, sIdx, -1)}
                          disabled={sIdx === 0}
                          aria-label={`Subir ${skill}`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => moveSkill(gIdx, sIdx, 1)}
                          disabled={sIdx === group.skills.length - 1}
                          aria-label={`Bajar ${skill}`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon--danger"
                          onClick={() => handleRemoveSkill(gIdx, sIdx)}
                          aria-label={`Quitar ${skill}`}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteGroupIndex !== null}
        title="Eliminar grupo de tecnologías"
        message={
          deleteGroupIndex !== null && groups[deleteGroupIndex]
            ? `¿Deseas quitar el grupo "${groups[deleteGroupIndex].name}" y sus tecnologías de la lista? Recuerda pulsar «Guardar cambios» para aplicar el reemplazo en el servidor.`
            : ""
        }
        confirmLabel="Quitar grupo"
        onConfirm={() => {
          if (deleteGroupIndex !== null) {
            setGroups((prev) => prev.filter((_, idx) => idx !== deleteGroupIndex));
          }
          setDeleteGroupIndex(null);
        }}
        onCancel={() => setDeleteGroupIndex(null)}
      />
    </section>
  );
};
