import React, { useCallback, useEffect, useState } from "react";
import { ApiError, graphqlRequest } from "../api/client";
import {
  DELETE_MESSAGE_MUTATION,
  MARK_MESSAGE_READ_MUTATION,
  MESSAGES_QUERY,
} from "../api/operations";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type {
  DeleteMessageMutation,
  DeleteMessageMutationVariables,
  GetMessagesQuery,
  GetMessagesQueryVariables,
  MarkMessageReadMutation,
  MarkMessageReadMutationVariables,
  Message,
} from "../generated/graphql";

export interface MessagesViewProps {
  onUnreadCountChange: () => void;
}

function formatIsoDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return iso;
  }
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  onUnreadCountChange,
}) => {
  const [items, setItems] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clampedPageSize = Math.min(100, Math.max(1, pageSize));
      const data = await graphqlRequest<GetMessagesQuery, GetMessagesQueryVariables>(
        MESSAGES_QUERY,
        {
          unreadOnly,
          page: Math.max(1, page),
          pageSize: clampedPageSize,
        }
      );
      setItems(data.messages.items);
      setTotal(data.messages.total);
      setPage(data.messages.page);
      setPageSize(data.messages.pageSize);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudieron cargar los mensajes."
      );
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, page, pageSize]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleMarkRead = async (msg: Message) => {
    setError(null);
    setFeedback(null);
    try {
      await graphqlRequest<
        MarkMessageReadMutation,
        MarkMessageReadMutationVariables
      >(MARK_MESSAGE_READ_MUTATION, { id: msg.id });
      setFeedback(`Mensaje de "${msg.name}" marcado como leído.`);
      onUnreadCountChange();
      await loadMessages();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo marcar el mensaje como leído."
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    setFeedback(null);
    try {
      await graphqlRequest<DeleteMessageMutation, DeleteMessageMutationVariables>(
        DELETE_MESSAGE_MUTATION,
        { id: deleteTarget.id }
      );
      setFeedback(`Mensaje de "${deleteTarget.name}" eliminado.`);
      setDeleteTarget(null);
      onUnreadCountChange();
      await loadMessages();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo eliminar el mensaje."
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="panel-section" aria-labelledby="messages-heading">
      <header className="section-header">
        <div>
          <span className="mono-badge">SECCIÓN 06 · BANDEJA DE ENTRADA</span>
          <h2 id="messages-heading" className="section-title">
            Mensajes de Contacto
          </h2>
          <p className="section-subtitle">
            Mensajes recibidos desde el formulario público ({total} en total para el filtro actual).
          </p>
        </div>

        <div className="section-header__actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
            />
            <span>Solo no leídos</span>
          </label>

          <div className="field-inline">
            <label htmlFor="messages-page-size" className="field-label--inline">
              Por página:
            </label>
            <select
              id="messages-page-size"
              className="field-select field-select--small"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Math.min(100, Math.max(1, Number(e.target.value))));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
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
            onClick={() => void loadMessages()}
          >
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="state-box" role="status" aria-live="polite">
          Cargando mensajes…
        </div>
      ) : items.length === 0 ? (
        <div className="state-box state-box--empty">
          <p>
            {unreadOnly
              ? "No tienes mensajes sin leer."
              : "La bandeja de mensajes está vacía."}
          </p>
        </div>
      ) : (
        <div className="stack-list">
          {items.map((msg) => (
            <article
              key={msg.id}
              className={`card message-card ${
                msg.read ? "message-card--read" : "message-card--unread"
              }`}
            >
              <header className="message-card__header">
                <div>
                  <span
                    className={`status-pill ${
                      msg.read ? "status-pill--muted" : "status-pill--accent"
                    }`}
                  >
                    {msg.read ? "Leído" : "No leído"}
                  </span>
                  <strong className="message-card__sender">{msg.name}</strong>
                  <a href={`mailto:${msg.email}`} className="message-card__email">
                    &lt;{msg.email}&gt;
                  </a>
                </div>
                <time className="message-card__date" dateTime={msg.createdAt}>
                  {formatIsoDate(msg.createdAt)}
                </time>
              </header>

              <p className="message-card__body">{msg.message}</p>

              <footer className="message-card__actions">
                {!msg.read && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => void handleMarkRead(msg)}
                  >
                    ✓ Marcar como leído
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => setDeleteTarget(msg)}
                >
                  Eliminar
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {total > 0 && (
        <nav className="pagination-bar" aria-label="Paginación de mensajes">
          <span className="pagination-bar__info">
            Página {page} de {totalPages} · {total} mensaje(s)
          </span>
          <div className="pagination-bar__buttons">
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente →
            </button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar mensaje"
        message={
          deleteTarget
            ? `¿Seguro que deseas borrar el mensaje de "${deleteTarget.name}" (${deleteTarget.email})?`
            : ""
        }
        confirmLabel="Sí, eliminar mensaje"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
};
