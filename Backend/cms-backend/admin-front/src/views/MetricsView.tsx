import { useState, useEffect, useCallback } from "react";
import { graphqlRequest } from "../api/client";
import { GET_METRICS_QUERY } from "../api/operations";
import type { GetMetricsQuery } from "../generated/graphql";

type MetricsRange = "last_7_days" | "last_30_days" | "last_365_days";

interface MetricsTotals {
  pageViews: number;
  sessions: number;
  projectOpens: number;
  contactSubmissions: number;
  conversionRate: number;
}

interface MetricsBreakdown {
  key: string;
  value: number;
}

interface Metrics {
  range: string;
  totals: MetricsTotals;
  topProjects: MetricsBreakdown[];
  topSections: MetricsBreakdown[];
  topReferrers: MetricsBreakdown[];
  topOutbound: MetricsBreakdown[];
  devices: MetricsBreakdown[];
}

function topItems(items: { key: string; label?: string; value: number }[]) {
  return items
    .slice(0, 8)
    .filter((item) => item.value > 0)
    .map((item) => (
      <li key={item.key} style={{ margin: "0.25rem 0", fontSize: "0.8rem" }}>
        <span style={{ fontWeight: "bold", color: "#0f3d91" }}>{item.label || item.key}</span>: {item.value}
      </li>
    ));
}

function MetricsView() {
  const [range, setRange] = useState<MetricsRange>("last_30_days");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await graphqlRequest<GetMetricsQuery>(GET_METRICS_QUERY, { range });
      setMetrics(data.metrics as Metrics);
    } catch (err) {
      setError("No se pudieron cargar las métricas.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void loadMetrics();
    const interval = setInterval(() => {
      void loadMetrics();
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Cargando métricas…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}><p className="alert alert--error">{error}</p></div>
    );
  }

  if (!metrics) {
    return <div style={{ padding: "2rem" }}>No hay datos de métricas para el rango seleccionado.</div>;
  }

  const { totals, topProjects, topSections, topReferrers, devices } = metrics;
  const contactSubmissions = totals.contactSubmissions || 0;
  const conversionRate = totals.conversionRate || 0.0;

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem" }}>
        Métricas de tráfico {range.replace(/_/g, " ")}
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ background: "#f0f4f8", padding: "0.75rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f3d91" }}>
            {totals.pageViews}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Páginas vistas</div>
        </div>
        <div style={{ background: "#f0f4f8", padding: "0.75rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f3d91" }}>
            {totals.sessions}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Sesiones</div>
        </div>
        <div style={{ background: "#f0f4f8", padding: "0.75rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f3d91" }}>
            {totals.projectOpens}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Proyectos abiertos</div>
        </div>
        <div style={{ background: "#f0f4f8", padding: "0.75rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f3d91" }}>
            {contactSubmissions}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Contactos</div>
        </div>
        <div style={{ background: "#f0f4f8", padding: "0.75rem", borderRadius: "4px" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0f3d91" }}>
            {conversionRate}%
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Conversión</div>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Top proyectos</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {topItems(topProjects)}
        </ul>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Secciones más vistas</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {topItems(topSections)}
        </ul>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Referrers principales</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {topItems(topReferrers)}
        </ul>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Dispositivos</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {topItems(devices)}
        </ul>
      </div>

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => setRange("last_7_days")}
          style={{
            padding: "0.5rem 0.75rem",
            background: range === "last_7_days" ? "#0f3d91" : "#e0e7ff",
            color: range === "last_7_days" ? "#fff" : "#0f3d91",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          7 días
        </button>
        <button
          onClick={() => setRange("last_30_days")}
          style={{
            padding: "0.5rem 0.75rem",
            background: range === "last_30_days" ? "#0f3d91" : "#e0e7ff",
            color: range === "last_30_days" ? "#fff" : "#0f3d91",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          30 días
        </button>
        <button
          onClick={() => setRange("last_365_days")}
          style={{
            padding: "0.5rem 0.75rem",
            background: range === "last_365_days" ? "#0f3d91" : "#e0e7ff",
            color: range === "last_365_days" ? "#fff" : "#0f3d91",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          12 meses
        </button>
      </div>
    </div>
  );
}

export { MetricsView };