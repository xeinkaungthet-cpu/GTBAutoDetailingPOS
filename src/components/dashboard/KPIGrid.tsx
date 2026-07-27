import KPICard from "./KPICard";

type TrendDirection = "up" | "down" | "neutral";

export type DashboardKPIItem = {
  key: string;
  icon: string;
  label: string;
  english?: string;
  value: string;
  trend?: number;
  trendDirection?: TrendDirection;
  comparisonText?: string;
  accent?: string;
  background?: string;
  onClick?: () => void;
};

type KPIGridProps = {
  items: DashboardKPIItem[];
  loading?: boolean;
};

function KPIGrid({
  items,
  loading = false,
}: KPIGridProps) {
  return (
    <section style={section}>
      <div style={sectionHeader}>
        <div>
          <p style={eyebrow}>
            LIVE BUSINESS METRICS
          </p>

          <h2 style={title}>
            今日经营概览
          </h2>

          <p style={description}>
            实时查看营业额、利润、订单、客户、库存和经营评分。
          </p>
        </div>

        <span style={liveBadge}>
          <span style={liveDot} />
          LIVE
        </span>
      </div>

      <div style={grid}>
        {items.map((item) => (
          <KPICard
            key={item.key}
            icon={item.icon}
            label={item.label}
            english={item.english}
            value={item.value}
            trend={item.trend}
            trendDirection={item.trendDirection}
            comparisonText={item.comparisonText}
            accent={item.accent}
            background={item.background}
            loading={loading}
            onClick={item.onClick}
          />
        ))}
      </div>
    </section>
  );
}

const section = {
  marginBottom: 24,
};

const sectionHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 14,
  marginBottom: 15,
};

const eyebrow = {
  margin: 0,
  color: "#b88916",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "1.4px",
};

const title = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: 25,
  fontWeight: 950,
};

const description = {
  margin: "7px 0 0",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.6,
};

const liveBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 10px",
  border: "1px solid #bbf7d0",
  borderRadius: 999,
  background: "#f0fdf4",
  color: "#15803d",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".8px",
};

const liveDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 10px rgba(34,197,94,.75)",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(215px, 1fr))",
  gap: 15,
};

export default KPIGrid;