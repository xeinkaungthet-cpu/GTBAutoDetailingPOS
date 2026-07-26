import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "../lib/supabase";
import useCurrency from "../hooks/useCurrency";

type RangeType = "7d" | "30d" | "month";

type DashboardOrder = {
  id: number | string;
  order_no?: string | null;
  member_id?: number | string | null;
  vehicle_id?: number | string | null;
  status?: string | null;
  total?: number | string | null;
  created_at: string;
};

type OrderItem = {
  quantity?: number | string | null;
  services?: {
    service_name?: string | null;
  } | null;
};

type ChartPoint = {
  date: string;
  fullDate: string;
  revenue: number;
  orders: number;
  movingAverage: number;
};

function Dashboard() {
  const {
    formatMoney: formatDisplayMoney,
    convertToDisplay,
    displayCurrency,
    accountingCurrency,
  } = useCurrency();

  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [range, setRange] = useState<RangeType>("7d");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    const [
      ordersResult,
      membersResult,
      vehiclesResult,
      itemsResult,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase.from("members").select("*"),

      supabase.from("vehicles").select("*"),

      supabase
        .from("order_items")
        .select("*, services(*)"),
    ]);

    const firstError =
      ordersResult.error ||
      membersResult.error ||
      vehiclesResult.error ||
      itemsResult.error;

    if (firstError) {
      console.error(firstError);
      setErrorMessage(firstError.message);
    }

    setOrders(
      (ordersResult.data as DashboardOrder[] | null) ?? []
    );

    setMembers(membersResult.data ?? []);
    setVehicles(vehiclesResult.data ?? []);

    setItems(
      (itemsResult.data as OrderItem[] | null) ?? []
    );

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const revenueOrders = useMemo(
    () => orders.filter(isRevenueOrder),
    [orders]
  );

  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);

  const todayOrders = revenueOrders.filter((order) =>
    isDateBetween(
      order.created_at,
      todayStart,
      tomorrowStart
    )
  );

  const yesterdayOrders = revenueOrders.filter((order) =>
    isDateBetween(
      order.created_at,
      yesterdayStart,
      todayStart
    )
  );

  const todaySales = sumOrderTotal(todayOrders);
  const yesterdaySales = sumOrderTotal(yesterdayOrders);

  const todayChange = calculateChange(
    todaySales,
    yesterdaySales
  );

  const monthStart = new Date(
    todayStart.getFullYear(),
    todayStart.getMonth(),
    1
  );

  const monthOrders = revenueOrders.filter((order) =>
    isDateBetween(
      order.created_at,
      monthStart,
      tomorrowStart
    )
  );

  const monthSales = sumOrderTotal(monthOrders);

  const avgOrder =
    monthOrders.length > 0
      ? monthSales / monthOrders.length
      : 0;

  const period = useMemo(
    () => getPeriod(range),
    [range]
  );

  const chartData = useMemo(
    () =>
      buildChartData(
        revenueOrders,
        period.currentStart,
        period.currentEnd
      ),
    [
      revenueOrders,
      period.currentStart,
      period.currentEnd,
    ]
  );

  const periodSales = useMemo(
    () => chartData.reduce(
      (sum, item) => sum + item.revenue,
      0
    ),
    [chartData]
  );

  const previousPeriodSales = useMemo(
    () =>
      sumOrdersWithinPeriod(
        revenueOrders,
        period.previousStart,
        period.previousEnd
      ),
    [
      revenueOrders,
      period.previousStart,
      period.previousEnd,
    ]
  );

  const periodChange = calculateChange(
    periodSales,
    previousPeriodSales
  );

  const chartColor =
    periodChange === null || periodChange === 0
      ? "#2563eb"
      : periodChange > 0
        ? "#16a34a"
        : "#dc2626";

  const highestDay = chartData.reduce<ChartPoint | null>(
    (highest, item) => {
      if (!highest || item.revenue > highest.revenue) {
        return item;
      }

      return highest;
    },
    null
  );

  const averageDailySales =
    chartData.length > 0
      ? periodSales / chartData.length
      : 0;

  const serviceCount: Record<string, number> = {};

  items.forEach((item) => {
    const name =
      item.services?.service_name || "未知服务";

    serviceCount[name] =
      (serviceCount[name] || 0) +
      Number(item.quantity || 1);
  });

  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>
      <style>
        {`
          @media (max-width: 1100px) {
            .dashboard-grid-four {
              grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
            }

            .dashboard-section-grid {
              grid-template-columns:
                1fr !important;
            }
          }

          @media (max-width: 720px) {
            .dashboard-header {
              align-items: flex-start !important;
              flex-direction: column !important;
              gap: 14px !important;
            }

            .dashboard-grid-four,
            .dashboard-grid-two {
              grid-template-columns:
                1fr !important;
            }

            .revenue-chart-header {
              align-items: flex-start !important;
              flex-direction: column !important;
            }

            .revenue-market-row {
              align-items: flex-start !important;
              flex-direction: column !important;
            }

            .revenue-chart-stats {
              grid-template-columns:
                1fr !important;
            }
          }
        `}
      </style>

      <div
        style={header}
        className="dashboard-header"
      >
        <div>
          <h1 style={{ margin: 0 }}>
            Dashboard
          </h1>

          <p
            style={{
              color: "#6b7280",
              marginTop: 6,
            }}
          >
            GTB1N Auto Detailing & Window Film POS 营业总览
          </p>
        </div>

        <div style={headerActions}>
          <button
            type="button"
            onClick={loadDashboard}
            style={refreshButton}
          >
            ↻ 刷新数据
          </button>

          <div style={aiBox}>
            🤖 AI Assistant Ready
          </div>
        </div>
      </div>

      <section style={currencyInfoPanel}>
        <div style={currencyInfoItem}>
          <span style={currencyInfoLabel}>当前显示货币</span>
          <strong style={currencyInfoValue}>
            {displayCurrency}
          </strong>
        </div>

        <div style={currencyInfoDivider} />

        <div style={currencyInfoItem}>
          <span style={currencyInfoLabel}>账本基础货币</span>
          <strong style={currencyInfoValue}>
            {accountingCurrency}
          </strong>
        </div>

        <p style={currencyInfoNote}>
          Dashboard 金额与图表会自动换算为当前显示货币；
          Supabase 订单金额继续保留账本基础货币。
        </p>
      </section>

      {errorMessage && (
        <div style={errorBox}>
          数据加载失败：{errorMessage}
        </div>
      )}

      {loading && (
        <div style={loadingBox}>
          正在加载营业数据……
        </div>
      )}

      <div
        style={grid4}
        className="dashboard-grid-four"
      >
        <StatCard
          title="今日营业额"
          value={formatDisplayMoney(todaySales)}
          icon="💰"
          bg="#dcfce7"
          border="#16a34a"
          trend={todayChange}
          trendLabel="较昨日"
        />

        <StatCard
          title="今日订单"
          value={`${todayOrders.length} 单`}
          icon="🧾"
          bg="#dbeafe"
          border="#2563eb"
        />

        <StatCard
          title="总会员"
          value={`${members.length} 人`}
          icon="👤"
          bg="#ede9fe"
          border="#7c3aed"
        />

        <StatCard
          title="车辆数量"
          value={`${vehicles.length} 台`}
          icon="🚗"
          bg="#ffedd5"
          border="#ea580c"
        />
      </div>

      <section style={chartCard}>
        <div
          style={chartHeader}
          className="revenue-chart-header"
        >
          <div>
            <p style={chartEyebrow}>
              REVENUE MARKET
            </p>

            <h2 style={chartTitle}>
              营业额走势
            </h2>

            <p style={chartDescription}>
              根据 Supabase 真实订单自动统计
            </p>
          </div>

          <div style={rangeTabs}>
            <RangeButton
              active={range === "7d"}
              onClick={() => setRange("7d")}
            >
              7天
            </RangeButton>

            <RangeButton
              active={range === "30d"}
              onClick={() => setRange("30d")}
            >
              30天
            </RangeButton>

            <RangeButton
              active={range === "month"}
              onClick={() => setRange("month")}
            >
              本月
            </RangeButton>
          </div>
        </div>

        <div
          style={marketRow}
          className="revenue-market-row"
        >
          <div>
            <p style={marketLabel}>
              {period.label}营业额
            </p>

            <div style={marketValue}>
              {formatDisplayMoney(periodSales)}
            </div>
          </div>

          <TrendBadge
            change={periodChange}
            label="较上一周期"
          />
        </div>

        <div
          style={chartStats}
          className="revenue-chart-stats"
        >
          <ChartStat
            title="上一周期"
            value={formatDisplayMoney(previousPeriodSales)}
          />

          <ChartStat
            title="日均营业额"
            value={formatDisplayMoney(averageDailySales)}
          />

          <ChartStat
            title="最高单日"
            value={formatDisplayMoney(
              highestDay?.revenue ?? 0
            )}
            subtitle={highestDay?.fullDate ?? "暂无数据"}
          />
        </div>
<div style={chartLegend}>
  <span style={legendItem}>
    <span
      style={{
        ...legendLine,
        background: chartColor,
      }}
    />
    每日营业额 · {displayCurrency}
  </span>

  <span style={legendItem}>
    <span
      style={{
        ...legendLine,
        background: "#f59e0b",
      }}
    />
    7日平均线
  </span>
</div>
        <div style={chartContainer}>
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 18,
                left: 4,
                bottom: 6,
              }}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={chartColor}
                    stopOpacity={0.35}
                  />

                  <stop
                    offset="95%"
                    stopColor={chartColor}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#e5e7eb"
              />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: "#6b7280",
                  fontSize: 12,
                }}
                interval={
                  range === "7d"
                    ? 0
                    : "preserveStartEnd"
                }
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: "#6b7280",
                  fontSize: 12,
                }}
                tickFormatter={(value) =>
                  formatCompactDisplayMoney(
                    Number(value),
                    convertToDisplay,
                    displayCurrency
                  )
                }
              />

              <Tooltip
                content={
                  <RevenueTooltip
                    formatMoney={formatDisplayMoney}
                  />
                }
                cursor={{
                  stroke: chartColor,
                  strokeDasharray: "5 5",
                }}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke={chartColor}
                strokeWidth={3}
                fill="url(#revenueGradient)"
                activeDot={{
                  r: 6,
                  fill: chartColor,
                  stroke: "#ffffff",
                  strokeWidth: 3,
                }}
              />
              <Line
  type="monotone"
  dataKey="movingAverage"
  stroke="#f59e0b"
  strokeWidth={2.5}
  dot={false}
  activeDot={{
    r: 5,
    fill: "#f59e0b",
    stroke: "#ffffff",
    strokeWidth: 2,
  }}
/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
              <div style={volumeHeader}>
          <div>
            <p style={volumeEyebrow}>
              ORDER VOLUME
            </p>

            <h3 style={volumeTitle}>
              订单量 / 成交量
            </h3>
          </div>

          <strong style={volumeTotal}>
            {chartData.reduce(
              (sum, item) => sum + item.orders,
              0
            )}{" "}
            单
          </strong>
        </div>

        <div style={volumeChartContainer}>
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 18,
                left: 4,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#f3f4f6"
              />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: "#9ca3af",
                  fontSize: 11,
                }}
                interval={
                  range === "7d"
                    ? 0
                    : "preserveStartEnd"
                }
              />

              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={30}
                tick={{
                  fill: "#9ca3af",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={
                  <OrderVolumeTooltip
                    formatMoney={formatDisplayMoney}
                  />
                }
                cursor={{
                  fill: "rgba(37, 99, 235, 0.08)",
                }}
              />

              <Bar
                dataKey="orders"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
                maxBarSize={34}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div
        style={grid2}
        className="dashboard-grid-two"
      >
        <StatCard
          title="本月营业额"
          value={formatDisplayMoney(monthSales)}
          icon="📈"
          bg="#fef9c3"
          border="#ca8a04"
        />

        <StatCard
          title="本月平均客单价"
          value={formatDisplayMoney(avgOrder)}
          icon="📊"
          bg="#e0f2fe"
          border="#0284c7"
        />
      </div>

      <div
        style={sectionGrid}
        className="dashboard-section-grid"
      >
        <div style={card}>
          <h2>最近订单</h2>

          {orders.slice(0, 5).map((order) => (
            <div
              key={order.id}
              style={orderRow}
            >
              <div>
                <strong>
                  {order.order_no ||
                    `ORDER-${order.id}`}
                </strong>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#6b7280",
                  }}
                >
                  会员ID：
                  {order.member_id ?? "—"} · 车辆ID：
                  {order.vehicle_id ?? "—"}
                </p>
              </div>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                <span style={badge}>
                  {order.status || "pending"}
                </span>

                <h3
                  style={{
                    margin: "8px 0 0",
                  }}
                >
                  {formatDisplayMoney(
                    Number(order.total || 0)
                  )}
                </h3>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <p>暂无订单</p>
          )}
        </div>

        <div style={card}>
          <h2>热门服务</h2>

          {topServices.map(
            ([name, count], index) => (
              <div
                key={name}
                style={serviceRow}
              >
                <span>
                  {index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : "⭐"}{" "}
                  {name}
                </span>

                <strong>{count} 次</strong>
              </div>
            )
          )}

          {topServices.length === 0 && (
            <p>暂无数据</p>
          )}
        </div>
      </div>

      <div style={aiPanel}>
        <h2>🤖 AI 店长提醒</h2>

        <p>
          今日营业数据已准备好。后续这里会自动显示：
        </p>

        <ul>
          <li>每日营业额分析</li>
          <li>热门服务建议</li>
          <li>库存不足提醒</li>
          <li>Email 自动日报</li>
        </ul>
      </div>
    </>
  );
}

function StatCard({
  title,
  value,
  icon,
  bg,
  border,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: string;
  bg: string;
  border: string;
  trend?: number | null;
  trendLabel?: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        background: bg,
        borderLeft: `6px solid ${border}`,
      }}
    >
      <div style={statCardTop}>
        <div style={{ fontSize: 34 }}>
          {icon}
        </div>

        {trend !== undefined && (
          <TrendBadge
            change={trend}
            label={trendLabel || ""}
            compact
          />
        )}
      </div>

      <p
        style={{
          margin: "10px 0 0",
          color: "#374151",
        }}
      >
        {title}
      </p>

      <h1
        style={{
          margin: "8px 0 0",
          fontSize: 34,
        }}
      >
        {value}
      </h1>
    </div>
  );
}

function RangeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...rangeButton,
        background: active
          ? "#111827"
          : "transparent",
        color: active
          ? "#ffffff"
          : "#6b7280",
      }}
    >
      {children}
    </button>
  );
}

function TrendBadge({
  change,
  label,
  compact = false,
}: {
  change: number | null;
  label: string;
  compact?: boolean;
}) {
  if (change === null) {
    return (
      <div
        style={{
          ...trendBadge,
          padding: compact
            ? "5px 8px"
            : "8px 12px",
          background: "#dbeafe",
          color: "#1d4ed8",
        }}
      >
        ● 新增
        {!compact && ` · ${label}暂无基准`}
      </div>
    );
  }

  const positive = change > 0;
  const negative = change < 0;

  const background = positive
    ? "#dcfce7"
    : negative
      ? "#fee2e2"
      : "#f3f4f6";

  const color = positive
    ? "#166534"
    : negative
      ? "#991b1b"
      : "#4b5563";

  const icon = positive
    ? "▲"
    : negative
      ? "▼"
      : "—";

  return (
    <div
      style={{
        ...trendBadge,
        padding: compact
          ? "5px 8px"
          : "8px 12px",
        background,
        color,
      }}
    >
      {icon} {Math.abs(change).toFixed(1)}%
      {!compact && ` · ${label}`}
    </div>
  );
}

function ChartStat({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div style={chartStatCard}>
      <p style={chartStatTitle}>
        {title}
      </p>

      <strong style={chartStatValue}>
        {value}
      </strong>

      {subtitle && (
        <p style={chartStatSubtitle}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function RevenueTooltip({
  active,
  payload,
  formatMoney,
}: {
  active?: boolean;
  payload?: Array<{
    payload: ChartPoint;
  }>;
  formatMoney: (value: number) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload as ChartPoint;

  const difference =
    point.revenue - point.movingAverage;

  const differencePercent =
    point.movingAverage > 0
      ? (difference / point.movingAverage) * 100
      : 0;

  const isUp = difference >= 0;

  return (
    <div style={tooltipBox}>
      <p style={tooltipDate}>
        {point.fullDate}
      </p>

      <div style={tooltipDataRow}>
        <span style={tooltipLabel}>
          当日营业额
        </span>

        <strong style={tooltipValueSmall}>
          {formatMoney(point.revenue)}
        </strong>
      </div>

      <div style={tooltipDataRow}>
        <span style={tooltipLabel}>
          7日平均
        </span>

        <strong style={tooltipAverageValue}>
          {formatMoney(point.movingAverage)}
        </strong>
      </div>

      <div style={tooltipDataRow}>
        <span style={tooltipLabel}>
          当日订单
        </span>

        <strong style={tooltipValueSmall}>
          {point.orders} 单
        </strong>
      </div>

      <div
        style={{
          ...tooltipTrend,
          color: isUp
            ? "#86efac"
            : "#fca5a5",
        }}
      >
        {isUp ? "▲" : "▼"}{" "}
        {Math.abs(differencePercent).toFixed(1)}%
        相比7日平均
      </div>
    </div>
  );
}
function OrderVolumeTooltip({
  active,
  payload,
  formatMoney,
}: {
  active?: boolean;
  payload?: Array<{
    payload: ChartPoint;
  }>;
  formatMoney: (value: number) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload as ChartPoint;

  return (
    <div style={tooltipBox}>
      <p style={tooltipDate}>
        {point.fullDate}
      </p>

      <strong style={tooltipValue}>
        {point.orders} 单
      </strong>

      <p style={tooltipOrders}>
        营业额：{formatMoney(point.revenue)}
      </p>
    </div>
  );
}
function getPeriod(range: RangeType) {
  const currentEnd = startOfDay(new Date());

  let currentStart: Date;
  let label: string;

  if (range === "30d") {
    currentStart = addDays(currentEnd, -29);
    label = "近30天";
  } else if (range === "month") {
    currentStart = new Date(
      currentEnd.getFullYear(),
      currentEnd.getMonth(),
      1
    );
    label = "本月";
  } else {
    currentStart = addDays(currentEnd, -6);
    label = "近7天";
  }

  const numberOfDays =
    differenceInDays(
      currentStart,
      currentEnd
    ) + 1;

  const previousEnd = addDays(
    currentStart,
    -1
  );

  const previousStart = addDays(
    previousEnd,
    -(numberOfDays - 1)
  );

  return {
    label,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
  };
}

function buildChartData(
  orders: DashboardOrder[],
  start: Date,
  end: Date
): ChartPoint[] {
  const dataMap = new Map<
    string,
    {
      revenue: number;
      orders: number;
    }
  >();

  orders.forEach((order) => {
    const orderDate = new Date(order.created_at);

    if (
      Number.isNaN(orderDate.getTime()) ||
      orderDate < start ||
      orderDate >= addDays(end, 1)
    ) {
      return;
    }

    const key = getDateKey(orderDate);

    const existing = dataMap.get(key) || {
      revenue: 0,
      orders: 0,
    };

    existing.revenue += Number(order.total || 0);
    existing.orders += 1;

    dataMap.set(key, existing);
  });

  const chartData: ChartPoint[] = [];

  let date = new Date(start);

  while (date <= end) {
    const key = getDateKey(date);
    const value = dataMap.get(key);

    chartData.push({
      date: formatShortDate(date),
      fullDate: formatFullDate(date),
      revenue: value?.revenue ?? 0,
      orders: value?.orders ?? 0,
      movingAverage: 0,
    });

    date = addDays(date, 1);
  }

  return chartData.map((item, index, allItems) => {
    const startIndex = Math.max(0, index - 6);

    const averageItems = allItems.slice(
      startIndex,
      index + 1
    );

    const totalRevenue = averageItems.reduce(
      (sum, current) =>
        sum + current.revenue,
      0
    );

    return {
      ...item,
      movingAverage:
        averageItems.length > 0
          ? totalRevenue / averageItems.length
          : 0,
    };
  });
}
function sumOrdersWithinPeriod(
  orders: DashboardOrder[],
  start: Date,
  end: Date
) {
  const endExclusive = addDays(end, 1);

  return orders
    .filter((order) =>
      isDateBetween(
        order.created_at,
        start,
        endExclusive
      )
    )
    .reduce(
      (sum, order) =>
        sum + Number(order.total || 0),
      0
    );
}

function sumOrderTotal(
  orders: DashboardOrder[]
) {
  return orders.reduce(
    (sum, order) =>
      sum + Number(order.total || 0),
    0
  );
}
function isRevenueOrder(
  order: DashboardOrder
) {
  const status = String(
    order.status || ""
  )
    .trim()
    .toLowerCase();

  const excludedStatuses = [
    "cancelled",
    "canceled",
    "refunded",
    "void",
    "已取消",
    "取消",
    "退款",
  ];

  return !excludedStatuses.includes(status);
}

function isDateBetween(
  dateValue: string,
  start: Date,
  endExclusive: Date
) {
  const date = new Date(dateValue);

  return (
    !Number.isNaN(date.getTime()) &&
    date >= start &&
    date < endExclusive
  );
}

function calculateChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return (
    ((current - previous) / previous) * 100
  );
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function addDays(
  date: Date,
  days: number
) {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

function differenceInDays(
  start: Date,
  end: Date
) {
  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.round(
    (startOfDay(end).getTime() -
      startOfDay(start).getTime()) /
      millisecondsPerDay
  );
}

function getDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatFullDate(date: Date) {
  return `${date.getFullYear()}年${
    date.getMonth() + 1
  }月${date.getDate()}日`;
}

function formatCompactDisplayMoney(
  accountingValue: number,
  convertToDisplay: (value: number) => number,
  displayCurrency: string
) {
  const convertedValue = convertToDisplay(
    Number.isFinite(accountingValue)
      ? accountingValue
      : 0
  );

  const absoluteValue = Math.abs(convertedValue);
  const sign = convertedValue < 0 ? "-" : "";

  if (absoluteValue >= 1_000_000_000) {
    return `${sign}${displayCurrency} ${(
      absoluteValue / 1_000_000_000
    ).toFixed(1)}B`;
  }

  if (absoluteValue >= 1_000_000) {
    return `${sign}${displayCurrency} ${(
      absoluteValue / 1_000_000
    ).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${sign}${displayCurrency} ${(
      absoluteValue / 1_000
    ).toFixed(1)}K`;
  }

  return `${sign}${displayCurrency} ${absoluteValue.toFixed(
    displayCurrency === "MMK" ? 0 : 1
  )}`;
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 10,
};

const aiBox = {
  background: "#111827",
  color: "#ffffff",
  padding: "12px 18px",
  borderRadius: 999,
};

const refreshButton = {
  padding: "11px 16px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const currencyInfoPanel = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 16,
  marginBottom: 20,
  padding: "14px 18px",
  border: "1px solid #bfdbfe",
  borderRadius: 14,
  background:
    "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
  boxShadow:
    "0 8px 24px rgba(37, 99, 235, 0.06)",
};

const currencyInfoItem = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 3,
};

const currencyInfoLabel = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
};

const currencyInfoValue = {
  color: "#1d4ed8",
  fontSize: 16,
};

const currencyInfoDivider = {
  width: 1,
  height: 34,
  background: "#bfdbfe",
};

const currencyInfoNote = {
  flex: "1 1 320px",
  margin: 0,
  color: "#475569",
  fontSize: 12,
  lineHeight: 1.6,
};

const loadingBox = {
  marginBottom: 18,
  padding: 14,
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 12,
};

const errorBox = {
  marginBottom: 18,
  padding: 14,
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: 12,
};

const grid4 = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: 20,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 20,
  marginTop: 20,
};

const sectionGrid = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr",
  gap: 20,
  marginTop: 20,
};

const statCard = {
  padding: 22,
  borderRadius: 16,
  boxShadow:
    "0 10px 25px rgba(0,0,0,.08)",
};

const statCardTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};
const chartLegend = {
  marginTop: 20,
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 18,
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 700,
};

const legendItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const legendLine = {
  display: "inline-block",
  width: 24,
  height: 3,
  borderRadius: 999,
};
const chartCard = {
  marginTop: 20,
  padding: 24,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  boxShadow:
    "0 14px 35px rgba(15,23,42,.08)",
};

const chartHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
};

const chartEyebrow = {
  margin: "0 0 5px",
  color: "#2563eb",
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: "1.4px",
};

const tooltipDataRow = {
  marginTop: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
};

const tooltipLabel = {
  color: "#9ca3af",
  fontSize: 12,
};

const tooltipValueSmall = {
  color: "#ffffff",
  fontSize: 15,
};

const tooltipAverageValue = {
  color: "#fbbf24",
  fontSize: 15,
};

const tooltipTrend = {
  marginTop: 12,
  paddingTop: 10,
  borderTop: "1px solid rgba(255,255,255,.12)",
  fontSize: 12,
  fontWeight: 800,
};

const chartTitle = {
  margin: 0,
  color: "#111827",
  fontSize: 26,
};

const chartDescription = {
  margin: "7px 0 0",
  color: "#6b7280",
};

const rangeTabs = {
  display: "inline-flex",
  padding: 4,
  background: "#f3f4f6",
  borderRadius: 12,
  gap: 4,
};

const rangeButton = {
  minWidth: 64,
  padding: "9px 13px",
  border: "none",
  borderRadius: 9,
  cursor: "pointer",
  fontWeight: 800,
};

const marketRow = {
  marginTop: 25,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 18,
};

const marketLabel = {
  margin: 0,
  color: "#6b7280",
  fontWeight: 700,
};

const marketValue = {
  marginTop: 4,
  color: "#111827",
  fontSize: 42,
  fontWeight: 900,
  letterSpacing: "-1.5px",
};

const trendBadge = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
};

const chartStats = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const chartStatCard = {
  padding: 15,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
};

const chartStatTitle = {
  margin: 0,
  color: "#6b7280",
  fontSize: 13,
};

const chartStatValue = {
  display: "block",
  marginTop: 6,
  color: "#111827",
  fontSize: 20,
};

const chartStatSubtitle = {
  margin: "5px 0 0",
  color: "#9ca3af",
  fontSize: 12,
};

const chartContainer = {
  width: "100%",
  height: 360,
  marginTop: 22,
};
const volumeHeader = {
  marginTop: 20,
  paddingTop: 20,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
};

const volumeEyebrow = {
  margin: "0 0 4px",
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "1.2px",
};

const volumeTitle = {
  margin: 0,
  color: "#111827",
  fontSize: 18,
};

const volumeTotal = {
  color: "#2563eb",
  fontSize: 20,
};

const volumeChartContainer = {
  width: "100%",
  height: 180,
  marginTop: 10,
};

const tooltipBox = {
  minWidth: 150,
  padding: "13px 15px",
  background: "rgba(17,24,39,.96)",
  color: "#ffffff",
  borderRadius: 12,
  boxShadow:
    "0 12px 28px rgba(0,0,0,.22)",
};

const tooltipDate = {
  margin: 0,
  color: "#d1d5db",
  fontSize: 12,
};

const tooltipValue = {
  display: "block",
  marginTop: 6,
  fontSize: 22,
};

const tooltipOrders = {
  margin: "5px 0 0",
  color: "#9ca3af",
  fontSize: 12,
};

const card = {
  background: "#ffffff",
  padding: 22,
  borderRadius: 16,
  boxShadow:
    "0 10px 25px rgba(0,0,0,.08)",
};

const orderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 0",
  borderBottom: "1px solid #e5e7eb",
};

const serviceRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 0",
  borderBottom: "1px solid #e5e7eb",
};

const badge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  textTransform: "capitalize" as const,
};

const aiPanel = {
  marginTop: 20,
  background:
    "linear-gradient(135deg, #111827, #2563eb)",
  color: "#ffffff",
  padding: 24,
  borderRadius: 18,
};

export default Dashboard;