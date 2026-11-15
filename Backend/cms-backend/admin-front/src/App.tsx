import React, { useCallback, useEffect, useState } from "react";
import { ApiError, graphqlRequest, setOnUnauthenticated } from "./api/client";
import {
  LOGOUT_MUTATION,
  ME_QUERY,
  UNREAD_MESSAGES_COUNT_QUERY,
} from "./api/operations";
import type {
  LogoutMutation,
  MeQuery,
  UnreadMessagesCountQuery,
  User,
} from "./generated/graphql";
import { AboutView } from "./views/AboutView";
import { LoginView } from "./views/LoginView";
import { MessagesView } from "./views/MessagesView";
import { ProjectsView } from "./views/ProjectsView";
import { SettingsView } from "./views/SettingsView";
import { SkillsView } from "./views/SkillsView";
import { SocialLinksView } from "./views/SocialLinksView";

type SectionKey =
  | "projects"
  | "about"
  | "settings"
  | "skills"
  | "social"
  | "messages";

interface RouteState {
  section: SectionKey;
  projectId: number | "new" | null;
}

function parsePathname(pathname: string): RouteState {
  const clean = pathname.replace(/^\/admin\/?/, "").replace(/\/+$/, "");
  if (!clean || clean === "projects") {
    return { section: "projects", projectId: null };
  }
  if (clean === "projects/new") {
    return { section: "projects", projectId: "new" };
  }
  const projectMatch = /^projects\/(\d+)$/.exec(clean);
  if (projectMatch) {
    return { section: "projects", projectId: Number(projectMatch[1]) };
  }
  if (clean === "about") return { section: "about", projectId: null };
  if (clean === "settings") return { section: "settings", projectId: null };
  if (clean === "skills") return { section: "skills", projectId: null };
  if (clean === "social" || clean === "social-links") {
    return { section: "social", projectId: null };
  }
  if (clean === "messages") return { section: "messages", projectId: null };
  return { section: "projects", projectId: null };
}

function buildPathname(route: RouteState): string {
  if (route.section === "projects") {
    if (route.projectId === "new") return "/admin/projects/new";
    if (typeof route.projectId === "number") return `/admin/projects/${route.projectId}`;
    return "/admin/projects";
  }
  if (route.section === "social") return "/admin/social-links";
  return `/admin/${route.section}`;
}

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authNetworkError, setAuthNetworkError] = useState<string | null>(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const [route, setRoute] = useState<RouteState>(() =>
    parsePathname(window.location.pathname)
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const navigate = useCallback((nextRoute: RouteState, replace = false) => {
    setRoute(nextRoute);
    const targetPath = buildPathname(nextRoute);
    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({}, "", targetPath);
      } else {
        window.history.pushState({}, "", targetPath);
      }
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parsePathname(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    setOnUnauthenticated(() => {
      setUser(null);
      setSessionExpiredMessage(
        "Tu sesión ha expirado o requiere autenticación. Inicia sesión para continuar."
      );
    });
    return () => setOnUnauthenticated(null);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await graphqlRequest<UnreadMessagesCountQuery>(
        UNREAD_MESSAGES_COUNT_QUERY,
        undefined,
        { suppressUnauthenticatedRedirect: true }
      );
      setUnreadCount(data.messages.total);
    } catch {
      // No interrumpir layout por el badge
    }
  }, []);

  const checkSession = useCallback(async () => {
    setCheckingAuth(true);
    setAuthNetworkError(null);
    try {
      const data = await graphqlRequest<MeQuery>(ME_QUERY, undefined, {
        suppressUnauthenticatedRedirect: true,
      });
      setUser(data.me);
      void refreshUnreadCount();
    } catch (err) {
      if (err instanceof ApiError && err.code === "UNAUTHENTICATED") {
        setUser(null);
      } else if (err instanceof ApiError) {
        setAuthNetworkError(err.message);
      } else {
        setAuthNetworkError("Error al verificar la sesión activa.");
      }
    } finally {
      setCheckingAuth(false);
    }
  }, [refreshUnreadCount]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const handleLogout = async () => {
    try {
      await graphqlRequest<LogoutMutation>(LOGOUT_MUTATION, undefined, {
        suppressUnauthenticatedRedirect: true,
      });
    } finally {
      setUser(null);
      setSessionExpiredMessage(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="loading-screen__brand">IAN OSCANI · CMS</div>
        <p className="loading-screen__text">Verificando sesión…</p>
      </div>
    );
  }

  if (authNetworkError && !user) {
    return (
      <div className="loading-screen" role="alert">
        <div className="loading-screen__brand">IAN OSCANI · CMS</div>
        <p className="loading-screen__error">{authNetworkError}</p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void checkSession()}
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        sessionExpiredMessage={sessionExpiredMessage}
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          setSessionExpiredMessage(null);
          void refreshUnreadCount();
        }}
      />
    );
  }

  const navItems: Array<{ key: SectionKey; label: string; badge?: number }> = [
    { key: "projects", label: "Proyectos" },
    { key: "about", label: "Sobre mí" },
    { key: "settings", label: "Configuración" },
    { key: "skills", label: "Tecnologías" },
    { key: "social", label: "Redes sociales" },
    { key: "messages", label: "Mensajes", badge: unreadCount },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Navegación del panel">
        <div className="admin-sidebar__brand">
          <span className="mono-badge">PORTFOLIO CMS</span>
          <h1 className="admin-sidebar__title">IAN OSCANI</h1>
        </div>

        <nav className="admin-nav">
          <ul className="admin-nav__list">
            {navItems.map((item) => {
              const active = route.section === item.key;
              return (
                <li key={item.key} className="admin-nav__item">
                  <button
                    type="button"
                    className={`admin-nav__button ${
                      active ? "admin-nav__button--active" : ""
                    }`}
                    onClick={() =>
                      navigate({ section: item.key, projectId: null })
                    }
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className="unread-badge"
                        aria-label={`${item.badge} mensajes no leídos`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="admin-sidebar__footer">
          <div className="user-pill" title={user.email}>
            <span className="user-pill__dot" aria-hidden="true" />
            <span className="user-pill__email">{user.email}</span>
          </div>
          <div className="sidebar-actions">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary btn--small"
            >
              Ver landing ↗
            </a>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => void handleLogout()}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main" id="main-content">
        {route.section === "projects" && (
          <ProjectsView
            initialProjectId={route.projectId}
            onNavigateProject={(projectId) =>
              navigate({ section: "projects", projectId })
            }
          />
        )}
        {route.section === "about" && <AboutView />}
        {route.section === "settings" && <SettingsView />}
        {route.section === "skills" && <SkillsView />}
        {route.section === "social" && <SocialLinksView />}
        {route.section === "messages" && (
          <MessagesView onUnreadCountChange={() => void refreshUnreadCount()} />
        )}
      </main>
    </div>
  );
};
