import { useMemo, useState } from "react";

export type RevenuePeriod =
  | "7d"
  | "30d"
  | "90d"
  | "1y";

export type RevenueChartPoint = {
  label: string;
  revenue: number;
  profit: number;
  orders: number;
};

type RevenueChartProps = {
  data: RevenueChartPoint[];
  loading?: boolean;
  currencyLabel?: string;
  formatMoney?: (value: number) => string;
  period?: RevenuePeriod;
  onPeriodChange?: (
    period: RevenuePeriod,
  ) => void;
};

type ChartMetric =
  | "revenue"
  | "profit"
  | "orders";

const periodOptions: Array<{
  value: RevenuePeriod;
  label: string;
}> = [
  {
    value: "7d",
    label: "7 Days",
  },
  {
    value: "30d",
    label: "30 Days",
  },
  {
    value: "90d",
    label: "90 Days",
  },
  {
    value: "1y",
    label: "1 Year",
  },
];

const metricOptions: Array<{
  value: ChartMetric;
  label: string;
  color: string;
}> = [
  {
    value: "revenue",
    label: "营业额 / Revenue",
    color: "#d4af37",
  },
  {
    value: "profit",
    label: "利润 / Profit",
    color: "#16a34a",
  },
  {
    value: "orders",
    label: "订单 / Orders",
    color: "#2563eb",
  },
];

function RevenueChart({
  data,
  loading = false,
  currencyLabel = "USD",
  formatMoney = defaultFormatMoney,
  period = "7d",
  onPeriodChange,
}: RevenueChartProps) {
  const [metric, setMetric] =
    useState<ChartMetric>("revenue");

  const selectedMetric =
    metricOptions.find(
      (item) => item.value === metric,
    ) ?? metricOptions[0];

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      value: Number(item[metric]) || 0,
    }));
  }, [data, metric]);

  const values = chartData.map(
    (item) => item.value,
  );

  const maximumValue = Math.max(
    ...values,
    1,
  );

  const minimumValue = Math.min(
    ...values,
    0,
  );

  const totalValue = values.reduce(
    (sum, value) => sum + value,
    0,
  );

  const averageValue =
    values.length > 0
      ? totalValue / values.length
      : 0;

  const highestValue = Math.max(
    ...values,
    0,
  );

  const currentValue =
    values.length > 0
      ? values[values.length - 1]
      : 0;

  const previousValue =
    values.length > 1
      ? values[values.length - 2]
      : 0;

  const changePercent =
    previousValue === 0
      ? currentValue > 0
        ? 100
        : 0
      : ((currentValue - previousValue) /
          Math.abs(previousValue)) *
        100;

  return (
    <section style={card}>
      <div style={header}>
        <div>
          <p style={eyebrow}>
            PERFORMANCE ANALYTICS
          </p>

          <h2 style={title}>
            营业趋势 / Revenue Trend
          </h2>

          <p style={description}>
            对比营业额、利润和订单数量的变化趋势。
          </p>
        </div>

        <div style={periodSelector}>
          {periodOptions.map((option) => {
            const active =
              period === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onPeriodChange?.(
                    option.value,
                  )
                }
                style={{
                  ...periodButton,
                  color: active
                    ? "#111827"
                    : "#64748b",
                  background: active
                    ? "#f4cf61"
                    : "transparent",
                  boxShadow: active
                    ? "0 6px 15px rgba(212,175,55,.20)"
                    : "none",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={metricSelector}>
        {metricOptions.map((option) => {
          const active =
            metric === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setMetric(option.value)
              }
              style={{
                ...metricButton,
                borderColor: active
                  ? `${option.color}55`
                  : "#e2e8f0",
                background: active
                  ? `${option.color}10`
                  : "#ffffff",
                color: active
                  ? option.color
                  : "#64748b",
              }}
            >
              <span
                style={{
                  ...metricDot,
                  background: option.color,
                }}
              />

              {option.label}
            </button>
          );
        })}
      </div>

      <div style={summaryGrid}>
        <SummaryItem
          label="当前"
          english="Current"
          value={formatMetricValue(
            currentValue,
            metric,
            formatMoney,
          )}
          accent={selectedMetric.color}
        />

        <SummaryItem
          label="平均"
          english="Average"
          value={formatMetricValue(
            averageValue,
            metric,
            formatMoney,
          )}
          accent="#7c3aed"
        />

        <SummaryItem
          label="最高"
          english="Highest"
          value={formatMetricValue(
            highestValue,
            metric,
            formatMoney,
          )}
          accent="#0891b2"
        />

        <SummaryItem
          label="趋势"
          english="Change"
          value={`${
            changePercent >= 0 ? "+" : ""
          }${changePercent.toFixed(1)}%`}
          accent={
            changePercent >= 0
              ? "#16a34a"
              : "#dc2626"
          }
        />
      </div>

      <div style={chartWrapper}>
        {loading ? (
          <ChartLoading />
        ) : chartData.length === 0 ? (
          <div style={emptyState}>
            <div style={emptyIcon}>📊</div>

            <strong>
              暂无趋势数据
            </strong>

            <span>
              完成订单后，这里会自动显示经营趋势。
            </span>
          </div>
        ) : (
          <SvgLineChart
            data={chartData}
            maximumValue={maximumValue}
            minimumValue={minimumValue}
            color={selectedMetric.color}
            metric={metric}
            formatMoney={formatMoney}
          />
        )}
      </div>

      <div style={footer}>
        <span>
          显示货币：
          <strong>
            {currencyLabel}
          </strong>
        </span>

        <span>
          最后更新：
          {new Date().toLocaleTimeString(
            "en-US",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          )}
        </span>
      </div>
    </section>
  );
}

type SvgChartPoint = RevenueChartPoint & {
  value: number;
};

type SvgLineChartProps = {
  data: SvgChartPoint[];
  maximumValue: number;
  minimumValue: number;
  color: string;
  metric: ChartMetric;
  formatMoney: (value: number) => string;
};

function SvgLineChart({
  data,
  maximumValue,
  minimumValue,
  color,
  metric,
  formatMoney,
}: SvgLineChartProps) {
  const width = 900;
  const height = 330;
  const paddingLeft = 68;
  const paddingRight = 28;
  const paddingTop = 28;
  const paddingBottom = 58;

  const chartWidth =
    width - paddingLeft - paddingRight;

  const chartHeight =
    height - paddingTop - paddingBottom;

  const valueRange = Math.max(
    maximumValue - minimumValue,
    1,
  );

  const points = data.map(
    (item, index) => {
      const x =
        data.length === 1
          ? paddingLeft +
            chartWidth / 2
          : paddingLeft +
            (index /
              (data.length - 1)) *
              chartWidth;

      const normalized =
        (item.value - minimumValue) /
        valueRange;

      const y =
        paddingTop +
        chartHeight -
        normalized * chartHeight;

      return {
        ...item,
        x,
        y,
      };
    },
  );

  const polylinePoints = points
    .map(
      (point) =>
        `${point.x},${point.y}`,
    )
    .join(" ");

  const areaPath =
    points.length > 0
      ? [
          `M ${points[0].x} ${
            paddingTop + chartHeight
          }`,
          ...points.map(
            (point) =>
              `L ${point.x} ${point.y}`,
          ),
          `L ${
            points[points.length - 1].x
          } ${
            paddingTop + chartHeight
          }`,
          "Z",
        ].join(" ")
      : "";

  const gridLines = Array.from({
    length: 5,
  }).map((_, index) => {
    const ratio = index / 4;

    const y =
      paddingTop +
      ratio * chartHeight;

    const value =
      maximumValue -
      ratio * valueRange;

    return {
      y,
      value,
    };
  });

  const labelInterval = Math.max(
    1,
    Math.ceil(data.length / 7),
  );

  return (
    <div style={svgContainer}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        role="img"
        aria-label="营业趋势图"
      >
        <defs>
          <linearGradient
            id="revenue-chart-area"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={color}
              stopOpacity="0.30"
            />

            <stop
              offset="100%"
              stopColor={color}
              stopOpacity="0.02"
            />
          </linearGradient>

          <filter
            id="revenue-chart-shadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="6"
              floodColor={color}
              floodOpacity="0.22"
            />
          </filter>
        </defs>

        {gridLines.map(
          (gridLine, index) => (
            <g key={index}>
              <line
                x1={paddingLeft}
                y1={gridLine.y}
                x2={
                  width - paddingRight
                }
                y2={gridLine.y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="5 6"
              />

              <text
                x={paddingLeft - 12}
                y={gridLine.y + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="10"
                fontWeight="700"
              >
                {formatAxisValue(
                  gridLine.value,
                  metric,
                )}
              </text>
            </g>
          ),
        )}

        {areaPath && (
          <path
            d={areaPath}
            fill="url(#revenue-chart-area)"
          />
        )}

        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#revenue-chart-shadow)"
        />

        {points.map(
          (point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#ffffff"
                stroke={color}
                strokeWidth="4"
              >
                <title>
                  {point.label}:{" "}
                  {formatMetricValue(
                    point.value,
                    metric,
                    formatMoney,
                  )}
                </title>
              </circle>

              {(index %
                labelInterval ===
                0 ||
                index ===
                  points.length - 1) && (
                <text
                  x={point.x}
                  y={height - 23}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="700"
                >
                  {shortenLabel(
                    point.label,
                  )}
                </text>
              )}
            </g>
          ),
        )}
      </svg>
    </div>
  );
}

function SummaryItem({
  label,
  english,
  value,
  accent,
}: {
  label: string;
  english: string;
  value: string;
  accent: string;
}) {
  return (
    <article style={summaryItem}>
      <span
        style={{
          ...summaryAccent,
          background: accent,
        }}
      />

      <div>
        <p style={summaryLabel}>
          {label}
        </p>

        <p style={summaryEnglish}>
          {english}
        </p>
      </div>

      <strong
        style={{
          ...summaryValue,
          color: accent,
        }}
      >
        {value}
      </strong>
    </article>
  );
}

function ChartLoading() {
  return (
    <div style={loadingBox}>
      <div style={loadingBars}>
        {[42, 67, 54, 82, 72, 94, 78].map(
          (heightValue, index) => (
            <span
              key={index}
              style={{
                ...loadingBar,
                height: `${heightValue}%`,
              }}
            />
          ),
        )}
      </div>

      <span style={loadingText}>
        正在载入经营趋势...
      </span>
    </div>
  );
}

function formatMetricValue(
  value: number,
  metric: ChartMetric,
  formatMoney: (value: number) => string,
) {
  if (metric === "orders") {
    return Math.round(value).toLocaleString(
      "en-US",
    );
  }

  return formatMoney(value);
}

function formatAxisValue(
  value: number,
  metric: ChartMetric,
) {
  if (metric === "orders") {
    return Math.round(value).toString();
  }

  const absoluteValue =
    Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${(
      value / 1_000_000
    ).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${(
      value / 1_000
    ).toFixed(1)}K`;
  }

  return Math.round(value).toString();
}

function shortenLabel(label: string) {
  if (label.length <= 9) {
    return label;
  }

  return `${label.slice(0, 8)}…`;
}

function defaultFormatMoney(
  value: number,
) {
  return `$${Number(value || 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

const card = {
  minWidth: 0,
  marginBottom: 24,
  padding: 22,
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  background: "#ffffff",
  boxShadow:
    "0 12px 34px rgba(15,23,42,.07)",
};

const header = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 16,
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
  fontSize: 24,
  fontWeight: 950,
};

const description = {
  margin: "7px 0 0",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.6,
};

const periodSelector = {
  display: "inline-flex",
  flexWrap: "wrap" as const,
  gap: 4,
  padding: 4,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#f8fafc",
};

const periodButton = {
  minHeight: 34,
  padding: "7px 11px",
  border: "none",
  borderRadius: 9,
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 900,
  transition: "all .18s ease",
};

const metricSelector = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 9,
  marginTop: 20,
};

const metricButton = {
  minHeight: 37,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 11px",
  border: "1px solid",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 850,
};

const metricDot = {
  width: 8,
  height: 8,
  flexShrink: 0,
  borderRadius: "50%",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
  marginTop: 18,
};

const summaryItem = {
  position: "relative" as const,
  minWidth: 0,
  padding: "12px 13px 12px 16px",
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  background: "#f8fafc",
};

const summaryAccent = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: 4,
  height: "100%",
};

const summaryLabel = {
  margin: 0,
  color: "#475569",
  fontSize: 11,
  fontWeight: 850,
};

const summaryEnglish = {
  margin: "2px 0 0",
  color: "#94a3b8",
  fontSize: 9,
};

const summaryValue = {
  display: "block",
  marginTop: 8,
  fontSize: 18,
  fontWeight: 950,
  overflowWrap: "anywhere" as const,
};

const chartWrapper = {
  minHeight: 350,
  marginTop: 18,
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background:
    "linear-gradient(180deg, #ffffff, #f8fafc)",
};

const svgContainer = {
  width: "100%",
  minWidth: 560,
  height: 350,
  overflowX: "auto" as const,
};

const emptyState = {
  minHeight: 350,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: 24,
  color: "#64748b",
  textAlign: "center" as const,
};

const emptyIcon = {
  fontSize: 42,
};

const loadingBox = {
  minHeight: 350,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
};

const loadingBars = {
  width: "70%",
  height: 160,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 10,
};

const loadingBar = {
  width: "9%",
  minWidth: 12,
  borderRadius: "7px 7px 2px 2px",
  background:
    "linear-gradient(180deg, #f4cf61, #d4af37)",
  opacity: 0.55,
};

const loadingText = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 750,
};

const footer = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 8,
  marginTop: 13,
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 700,
};

export default RevenueChart;