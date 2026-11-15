import React, { useState } from "react";
import { ApiError, graphqlRequest } from "../api/client";
import { LOGIN_MUTATION } from "../api/operations";
import type { LoginMutation, LoginMutationVariables, User } from "../generated/graphql";

export interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  sessionExpiredMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  sessionExpiredMessage,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Ingresa tu correo electrónico y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const data = await graphqlRequest<LoginMutation, LoginMutationVariables>(
        LOGIN_MUTATION,
        { email: trimmedEmail, password },
        { suppressUnauthenticatedRedirect: true }
      );
      onLoginSuccess(data.login);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No fue posible iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-card__header">
          <span className="mono-badge">CMS · PANEL DE ADMINISTRACIÓN</span>
          <h1 className="login-card__title">IAN OSCANI</h1>
          <p className="login-card__subtitle">
            Inicia sesión para administrar proyectos, contenido y mensajes.
          </p>
        </div>

        {sessionExpiredMessage && !error && (
          <div className="alert alert--warning" role="status">
            {sessionExpiredMessage}
          </div>
        )}

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="field-group">
            <label className="field-label" htmlFor="login-email">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="login-password">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? "Verificando credenciales…" : "Entrar al panel"}
          </button>
        </form>

        <footer className="login-card__footer">
          <span>Sesión segura mediante cookie HttpOnly (cms_session) · GraphQL API</span>
        </footer>
      </div>
    </div>
  );
};
