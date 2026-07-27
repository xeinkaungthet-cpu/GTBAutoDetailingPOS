import type { ReactNode } from "react";

type TrendDirection = "up" | "down" | "neutral";

type KPICardProps = {
  icon: ReactNode;
  label: string;
  english?: string;
  value: string;
  trend?: number;
  trendDirection?: TrendDirection;
  comparisonText?: string;
  accent?: string;
  background?: string;
  loading?: boolean;
  onClick?: () => void;
};

function KPICard({
  icon,
  label,
  english,
  value,
  trend = 0,
  trendDirection = "neutral",
  comparisonText = "Compared with yesterday",
  accent = "#d4af37",
  background = "#fffdf7",
  loading = false,
  onClick,
}: KPICardProps) {
  const trendStyle = getTrendStyle(trendDirection);
  const displayTrend = Math.abs(Number(trend) || 0);

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (
          onClick &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        ...card,
        background,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        style={{
          ...topAccent,
          background: accent,
        }}
      />

      <div style={cardHeader}>
        <div
          style={{
            ...iconBox,
            color: accent,
            background: `${accent}16`,
            borderColor: `${accent}30`,
          }}
        >
          {icon}
        </div>

        <span
          style={{
            ...trendBadge,
            color: trendStyle.color,
            background: trendStyle.background,
          }}
        >
          <span aria-hidden="true">
            {trendStyle.icon}
          </span>

          {displayTrend.toFixed(1)}%
        </span>
      </div>

      <div style={content}>
        <p style={labelText}>{label}</p>

        {english && (
          <p style={englishText}>{english}</p>
        )}

        {loading ? (
          <div style={loadingSkeleton} />
        ) : (
          <strong style={valueText}>{value}</strong>
        )}
      </div>

      <div style={footer}>
        <span
          style={{
            ...trendDot,
            background: trendStyle.color,
          }}
        />

        <span>{comparisonText}</span>
      </div>
    </article>
  );
}

function getTrendStyle(
  direction: TrendDirection,
) {
  if (direction === "up") {
    return {
      icon: "▲",
      color: "#15803d",
      background: "#dcfce7",
    };
  }

  if (direction === "down") {
    return {
      icon: "▼",
      color: "#b91c1c",
      background: "#fee2e2",
    };
  }

  return {
    icon: "•",
    color: "#64748b",
    background: "#f1f5f9",
  };
}

const card = {
  position: "relative" as const,
  minWidth: 0,
  overflow: "hidden",
  padding: 19,
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  boxShadow:
    "0 10px 28px rgba(15,23,42,.07)",
  transition:
    "transform .18s ease, box-shadow .18s ease",
};

const topAccent = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: 4,
};

const cardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const iconBox = {
  width: 46,
  height: 46,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  border: "1px solid",
  borderRadius: 14,
  fontSize: 22,
};

const trendBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
};

const content = {
  marginTop: 17,
};

const labelText = {
  margin: 0,
  color: "#334155",
  fontSize: 13,
  fontWeight: 850,
};

const englishText = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".3px",
};

const valueText = {
  display: "block",
  marginTop: 11,
  color: "#0f172a",
  fontSize: "clamp(23px, 2.3vw, 31px)",
  lineHeight: 1.05,
  fontWeight: 950,
  overflowWrap: "anywhere" as const,
};

const footer = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  marginTop: 16,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 700,
};

const trendDot = {
  width: 6,
  height: 6,
  flexShrink: 0,
  borderRadius: "50%",
};

const loadingSkeleton = {
  width: "74%",
  height: 31,
  marginTop: 12,
  borderRadius: 8,
  background:
    "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
  backgroundSize: "200% 100%",
};

export default KPICard;