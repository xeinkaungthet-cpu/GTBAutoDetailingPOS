import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import KPIGrid, {
  type DashboardKPIItem,
} from "../components/dashboard/KPIGrid";
import RevenueChart, {
  type RevenueChartPoint,
  type RevenuePeriod,
} from "../components/dashboard/RevenueChart";
import AIInsight, {
  type AIInsightItem,
} from "../components/dashboard/AIInsight";

import { supabase } from "../lib/supabase";
import useCurrency from "../hooks/useCurrency";

type DashboardOrder = {
  id: number | string;
  order_no?: string | null;
  member_id?: number | string | null;
  vehicle_id?: number | string | null;
  status?: string | null;
  total?: number | string | null;
  cost?: number | string | null;
  profit?: number | string | null;
  created_at: string;
};

type DashboardMember = {
  id?: number | string;
  created_at?: string | null;
};



type DashboardOrderItem = {
  quantity?: number | string | null;
  services?: {
    service_name?: string | null;
  } | null;
};

type DashboardProduct = {
  id?: number | string;
  product_name?: string | null;
  name?: string | null;
  stock_qty?: number | string | null;
  min_stock?: number | string | null;
  is_active?: boolean | null;
};

function Dashboard() {
  const {
    formatMoney,
    displayCurrency,
    accountingCurrency,
  } = useCurrency();

  const [orders, setOrders] =
    useState<DashboardOrder[]>([]);
  const [members, setMembers] =
    useState<DashboardMember[]>([]);
  const [items, setItems] =
    useState<DashboardOrderItem[]>([]);
  const [products, setProducts] =
    useState<DashboardProduct[]>([]);
  const [chartPeriod, setChartPeriod] =
    useState<RevenuePeriod>("7d");
  const [loading, setLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    try {
     const [
  ordersResult,
  membersResult,
  itemsResult,
  productsResult,
] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("members")
          .select("*"),

        supabase
          .from("vehicles")
          .select("*"),

        supabase
          .from("order_items")
          .select("quantity, services(service_name)"),

        supabase
          .from("products")
          .select(
            "id, product_name, name, stock_qty, min_stock, is_active",
          ),
      ]);

    const firstError =
  ordersResult.error ||
  membersResult.error ||
  itemsResult.error ||
  productsResult.error;

      if (firstError) {
        throw firstError;
      }

      setOrders(
        (ordersResult.data as
          | DashboardOrder[]
          | null) ?? [],
      );

      setMembers(
        (membersResult.data as
          | DashboardMember[]
          | null) ?? [],
      );

     

      setItems(
        (itemsResult.data as
          | DashboardOrderItem[]
          | null) ?? [],
      );

      setProducts(
        (productsResult.data as
          | DashboardProduct[]
          | null) ?? [],
      );
    } catch (error: unknown) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dashboard 数据加载失败",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const revenueOrders = useMemo(
    () => orders.filter(isRevenueOrder),
    [orders],
  );

  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);

  const todayOrders = revenueOrders.filter(
    (order) =>
      isDateBetween(
        order.created_at,
        todayStart,
        tomorrowStart,
      ),
  );

  const yesterdayOrders = revenueOrders.filter(
    (order) =>
      isDateBetween(
        order.created_at,
        yesterdayStart,
        todayStart,
      ),
  );

  const todayRevenue =
    sumOrderTotal(todayOrders);
  const yesterdayRevenue =
    sumOrderTotal(yesterdayOrders);

  const todayProfit =
    sumOrderProfit(todayOrders);
  const yesterdayProfit =
    sumOrderProfit(yesterdayOrders);

  const todayRevenueTrend =
    normalizeTrend(
      calculateChange(
        todayRevenue,
        yesterdayRevenue,
      ),
    );

  const todayProfitTrend =
    normalizeTrend(
      calculateChange(
        todayProfit,
        yesterdayProfit,
      ),
    );

  const todayOrderTrend =
    normalizeTrend(
      calculateChange(
        todayOrders.length,
        yesterdayOrders.length,
      ),
    );

  const todayVehicleCount =
    new Set(
      todayOrders
        .map((order) =>
          String(order.vehicle_id ?? ""),
        )
        .filter(Boolean),
    ).size;

  const yesterdayVehicleCount =
    new Set(
      yesterdayOrders
        .map((order) =>
          String(order.vehicle_id ?? ""),
        )
        .filter(Boolean),
    ).size;

  const todayVehicleTrend =
    normalizeTrend(
      calculateChange(
        todayVehicleCount,
        yesterdayVehicleCount,
      ),
    );

  const todayNewMembers =
    members.filter((member) =>
      member.created_at
        ? isDateBetween(
            member.created_at,
            todayStart,
            tomorrowStart,
          )
        : false,
    ).length;

  const yesterdayNewMembers =
    members.filter((member) =>
      member.created_at
        ? isDateBetween(
            member.created_at,
            yesterdayStart,
            todayStart,
          )
        : false,
    ).length;

  const memberTrend =
    normalizeTrend(
      calculateChange(
        todayNewMembers,
        yesterdayNewMembers,
      ),
    );

  const averageTicket =
    todayOrders.length > 0
      ? todayRevenue / todayOrders.length
      : 0;

  const yesterdayAverageTicket =
    yesterdayOrders.length > 0
      ? yesterdayRevenue /
        yesterdayOrders.length
      : 0;

  const averageTicketTrend =
    normalizeTrend(
      calculateChange(
        averageTicket,
        yesterdayAverageTicket,
      ),
    );

  const lowStockProducts =
    products.filter((product) => {
      if (product.is_active === false) {
        return false;
      }

      const stock =
        Number(product.stock_qty) || 0;
      const minimum =
        Number(product.min_stock) || 0;

      return minimum > 0 && stock <= minimum;
    });

  const businessScore =
    calculateBusinessScore({
      todayRevenue,
      yesterdayRevenue,
      todayProfit,
      todayOrders: todayOrders.length,
      lowStockCount:
        lowStockProducts.length,
    });

  const kpiItems: DashboardKPIItem[] = [
    {
      key: "revenue",
      icon: "💰",
      label: "今日营业额",
      english: "Today's Revenue",
      value: formatMoney(todayRevenue),
      trend: Math.abs(todayRevenueTrend),
      trendDirection:
        toTrendDirection(todayRevenueTrend),
      accent: "#d4af37",
      background: "#fffdf7",
    },
    {
      key: "profit",
      icon: "📈",
      label: "今日利润",
      english: "Today's Profit",
      value:
        todayProfit > 0
          ? formatMoney(todayProfit)
          : "暂未记录",
      trend: Math.abs(todayProfitTrend),
      trendDirection:
        toTrendDirection(todayProfitTrend),
      comparisonText:
        todayProfit > 0
          ? "Compared with yesterday"
          : "订单未提供成本或利润字段",
      accent: "#16a34a",
      background: "#f7fff9",
    },
    {
      key: "orders",
      icon: "🧾",
      label: "今日订单",
      english: "Today's Orders",
      value: String(todayOrders.length),
      trend: Math.abs(todayOrderTrend),
      trendDirection:
        toTrendDirection(todayOrderTrend),
      accent: "#2563eb",
      background: "#f8fbff",
    },
    {
      key: "vehicles",
      icon: "🚘",
      label: "今日车辆",
      english: "Vehicles Today",
      value: String(todayVehicleCount),
      trend: Math.abs(todayVehicleTrend),
      trendDirection:
        toTrendDirection(todayVehicleTrend),
      accent: "#7c3aed",
      background: "#fbf9ff",
    },
    {
      key: "members",
      icon: "👥",
      label: "新增会员",
      english: "New Members",
      value: String(todayNewMembers),
      trend: Math.abs(memberTrend),
      trendDirection:
        toTrendDirection(memberTrend),
      accent: "#0891b2",
      background: "#f7fdff",
    },
    {
      key: "average",
      icon: "⭐",
      label: "平均客单价",
      english: "Average Ticket",
      value: formatMoney(averageTicket),
      trend: Math.abs(
        averageTicketTrend,
      ),
      trendDirection:
        toTrendDirection(
          averageTicketTrend,
        ),
      accent: "#ea580c",
      background: "#fffaf7",
    },
    {
      key: "inventory",
      icon: "📦",
      label: "库存预警",
      english: "Inventory Alerts",
      value: String(
        lowStockProducts.length,
      ),
      trend:
        lowStockProducts.length > 0
          ? 100
          : 0,
      trendDirection:
        lowStockProducts.length > 0
          ? "down"
          : "neutral",
      comparisonText:
        lowStockProducts.length > 0
          ? "需要尽快补货"
          : "库存状态正常",
      accent: "#dc2626",
      background: "#fff8f8",
    },
    {
      key: "score",
      icon: "🤖",
      label: "AI 经营评分",
      english: "AI Business Score",
      value: `${businessScore}/100`,
      trend: 0,
      trendDirection: "neutral",
      comparisonText:
        getBusinessScoreLabel(
          businessScore,
        ),
      accent: "#ca8a04",
      background: "#fffdf5",
    },
  ];

  const chartData =
    useMemo<RevenueChartPoint[]>(() => {
      const period =
        getChartPeriod(chartPeriod);

      return buildChartData(
        revenueOrders,
        period.start,
        period.end,
      );
    }, [revenueOrders, chartPeriod]);

  const topServices =
    useMemo(() => {
      const count: Record<string, number> =
        {};

      items.forEach((item) => {
        const name =
          item.services?.service_name ||
          "未命名服务";

        count[name] =
          (count[name] || 0) +
          (Number(item.quantity) || 1);
      });

      return Object.entries(count)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    }, [items]);

  const aiInsights =
    useMemo<AIInsightItem[]>(() => {
      const insights: AIInsightItem[] =
        [];

      if (
        todayRevenue >
        yesterdayRevenue
      ) {
        insights.push({
          title:
            "Revenue Increased",
          description:
            `今日营业额较昨日增加 ${Math.abs(
              todayRevenueTrend,
            ).toFixed(1)}%。`,
          level: "success",
        });
      } else if (
        todayRevenue <
        yesterdayRevenue
      ) {
        insights.push({
          title:
            "Revenue Needs Attention",
          description:
            `今日营业额较昨日下降 ${Math.abs(
              todayRevenueTrend,
            ).toFixed(1)}%，建议检查订单与预约。`,
          level: "warning",
        });
      }

      if (
        lowStockProducts.length > 0
      ) {
        insights.push({
          title:
            "Inventory Alert",
          description:
            `${lowStockProducts.length} 个产品已达到最低库存，需要安排采购。`,
          level: "danger",
        });
      }

      if (
        todayOrders.length === 0
      ) {
        insights.push({
          title:
            "No Sales Yet",
          description:
            "今天暂时没有有效订单，可以检查预约并进行客户回访。",
          level: "warning",
        });
      }

      if (insights.length === 0) {
        insights.push({
          title:
            "Business Stable",
          description:
            "当前经营数据稳定，暂时没有高风险提醒。",
          level: "success",
        });
      }

      return insights.slice(0, 3);
    }, [
      lowStockProducts.length,
      todayOrders.length,
      todayRevenue,
      yesterdayRevenue,
      todayRevenueTrend,
    ]);

  const aiSummary = buildAISummary({
    todayRevenue,
    todayOrders:
      todayOrders.length,
    averageTicket,
    lowStockCount:
      lowStockProducts.length,
    topService:
      topServices[0]?.[0] ?? "",
    formatMoney,
  });

  return (
    <main style={page}>
      <DashboardHeader
        businessScore={businessScore}
        loading={loading}
        onRefresh={() => {
          void loadDashboard();
        }}
        onOpenAI={() => {
          window.location.href =
            "/ai-business-assistant";
        }}
      />

      <section style={currencyPanel}>
        <div style={currencyItem}>
          <span style={currencyLabel}>
            当前显示货币
          </span>

          <strong style={currencyValue}>
            {displayCurrency}
          </strong>
        </div>

        <div style={currencyDivider} />

        <div style={currencyItem}>
          <span style={currencyLabel}>
            账本基础货币
          </span>

          <strong style={currencyValue}>
            {accountingCurrency}
          </strong>
        </div>

        <p style={currencyNote}>
          Dashboard 金额和图表会根据当前显示货币自动换算；数据库订单继续保留账本基础货币。
        </p>
      </section>

      {errorMessage && (
        <div style={errorBox}>
          数据加载失败：{errorMessage}
        </div>
      )}

      <KPIGrid
        items={kpiItems}
        loading={loading}
      />

      <RevenueChart
        data={chartData}
        loading={loading}
        period={chartPeriod}
        onPeriodChange={
          setChartPeriod
        }
        currencyLabel={
          displayCurrency
        }
        formatMoney={formatMoney}
      />

      <div style={lowerGrid}>
        <AIInsight
          businessScore={
            businessScore
          }
          summary={aiSummary}
          insights={aiInsights}
        />

        <section style={panelCard}>
          <div style={panelHeader}>
            <div>
              <p style={panelEyebrow}>
                TOP PERFORMANCE
              </p>

              <h2 style={panelTitle}>
                热门服务
              </h2>
            </div>

            <span style={panelBadge}>
              TOP 5
            </span>
          </div>

          <div style={serviceList}>
            {topServices.map(
              ([name, count], index) => (
                <div
                  key={name}
                  style={serviceRow}
                >
                  <div style={serviceNameBox}>
                    <span
                      style={rankBadge}
                    >
                      {index + 1}
                    </span>

                    <span style={serviceName}>
                      {name}
                    </span>
                  </div>

                  <strong
                    style={serviceCount}
                  >
                    {count} 次
                  </strong>
                </div>
              ),
            )}

            {!loading &&
              topServices.length ===
                0 && (
                <div style={emptyState}>
                  暂无热门服务数据
                </div>
              )}
          </div>
        </section>
      </div>

      <div style={lowerGrid}>
        <section style={panelCard}>
          <div style={panelHeader}>
            <div>
              <p style={panelEyebrow}>
                RECENT ACTIVITY
              </p>

              <h2 style={panelTitle}>
                最近订单
              </h2>
            </div>

            <span style={panelBadge}>
              LATEST 5
            </span>
          </div>

          <div>
            {orders
              .slice(0, 5)
              .map((order) => (
                <div
                  key={String(order.id)}
                  style={orderRow}
                >
                  <div>
                    <strong
                      style={orderNumber}
                    >
                      {order.order_no ||
                        `ORDER-${order.id}`}
                    </strong>

                    <p style={orderMeta}>
                      {formatDateTime(
                        order.created_at,
                      )}
                    </p>
                  </div>

                  <div style={orderAmountBox}>
                    <span style={statusBadge}>
                      {order.status ||
                        "pending"}
                    </span>

                    <strong
                      style={orderAmount}
                    >
                      {formatMoney(
                        Number(
                          order.total,
                        ) || 0,
                      )}
                    </strong>
                  </div>
                </div>
              ))}

            {!loading &&
              orders.length === 0 && (
                <div style={emptyState}>
                  暂无订单
                </div>
              )}
          </div>
        </section>

        <section style={panelCard}>
          <div style={panelHeader}>
            <div>
              <p style={panelEyebrow}>
                INVENTORY WATCH
              </p>

              <h2 style={panelTitle}>
                库存预警
              </h2>
            </div>

            <span
              style={{
                ...panelBadge,
                color:
                  lowStockProducts.length >
                  0
                    ? "#b91c1c"
                    : "#15803d",
                background:
                  lowStockProducts.length >
                  0
                    ? "#fee2e2"
                    : "#dcfce7",
              }}
            >
              {lowStockProducts.length}
            </span>
          </div>

          <div style={serviceList}>
            {lowStockProducts
              .slice(0, 5)
              .map((product) => (
                <div
                  key={String(
                    product.id,
                  )}
                  style={serviceRow}
                >
                  <div>
                    <strong
                      style={serviceName}
                    >
                      {product.product_name ||
                        product.name ||
                        "未命名产品"}
                    </strong>

                    <p style={orderMeta}>
                      最低库存：
                      {Number(
                        product.min_stock,
                      ) || 0}
                    </p>
                  </div>

                  <strong
                    style={{
                      ...serviceCount,
                      color: "#dc2626",
                    }}
                  >
                    {Number(
                      product.stock_qty,
                    ) || 0}
                  </strong>
                </div>
              ))}

            {!loading &&
              lowStockProducts.length ===
                0 && (
                <div style={healthyState}>
                  ✓ 当前库存状态正常
                </div>
              )}
          </div>
        </section>
      </div>
    </main>
  );
}

function getChartPeriod(
  period: RevenuePeriod,
) {
  const end = startOfDay(new Date());

  if (period === "30d") {
    return {
      start: addDays(end, -29),
      end,
    };
  }

  if (period === "90d") {
    return {
      start: addDays(end, -89),
      end,
    };
  }

  if (period === "1y") {
    return {
      start: addDays(end, -364),
      end,
    };
  }

  return {
    start: addDays(end, -6),
    end,
  };
}

function buildChartData(
  orders: DashboardOrder[],
  start: Date,
  end: Date,
): RevenueChartPoint[] {
  const dataMap = new Map<
    string,
    {
      revenue: number;
      profit: number;
      orders: number;
    }
  >();

  orders.forEach((order) => {
    const orderDate = new Date(
      order.created_at,
    );

    if (
      Number.isNaN(
        orderDate.getTime(),
      ) ||
      orderDate < start ||
      orderDate >= addDays(end, 1)
    ) {
      return;
    }

    const key =
      getDateKey(orderDate);

    const current =
      dataMap.get(key) ?? {
        revenue: 0,
        profit: 0,
        orders: 0,
      };

    current.revenue +=
      Number(order.total) || 0;
    current.profit +=
      getOrderProfit(order);
    current.orders += 1;

    dataMap.set(key, current);
  });

  const result: RevenueChartPoint[] =
    [];

  let currentDate =
    new Date(start);

  while (currentDate <= end) {
    const key =
      getDateKey(currentDate);

    const values =
      dataMap.get(key);

    result.push({
      label: formatShortDate(
        currentDate,
      ),
      revenue:
        values?.revenue ?? 0,
      profit:
        values?.profit ?? 0,
      orders:
        values?.orders ?? 0,
    });

    currentDate = addDays(
      currentDate,
      1,
    );
  }

  return result;
}

function buildAISummary({
  todayRevenue,
  todayOrders,
  averageTicket,
  lowStockCount,
  topService,
  formatMoney,
}: {
  todayRevenue: number;
  todayOrders: number;
  averageTicket: number;
  lowStockCount: number;
  topService: string;
  formatMoney: (
    value: number,
  ) => string;
}) {
  const parts = [
    `今日营业额 ${formatMoney(
      todayRevenue,
    )}，共完成 ${todayOrders} 笔有效订单。`,
    `平均客单价为 ${formatMoney(
      averageTicket,
    )}。`,
  ];

  if (topService) {
    parts.push(
      `当前最热门服务是「${topService}」。`,
    );
  }

  if (lowStockCount > 0) {
    parts.push(
      `有 ${lowStockCount} 个产品需要补货。`,
    );
  } else {
    parts.push(
      "目前库存状态正常。",
    );
  }

  return parts.join(" ");
}

function calculateBusinessScore({
  todayRevenue,
  yesterdayRevenue,
  todayProfit,
  todayOrders,
  lowStockCount,
}: {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayProfit: number;
  todayOrders: number;
  lowStockCount: number;
}) {
  let score = 70;

  if (todayRevenue > 0) {
    score += 8;
  }

  if (
    todayRevenue >=
    yesterdayRevenue
  ) {
    score += 7;
  }

  if (todayProfit > 0) {
    score += 5;
  }

  if (todayOrders >= 3) {
    score += 5;
  }

  score -= Math.min(
    lowStockCount * 3,
    15,
  );

  return Math.max(
    0,
    Math.min(score, 100),
  );
}

function getBusinessScoreLabel(
  score: number,
) {
  if (score >= 90) {
    return "Excellent";
  }

  if (score >= 75) {
    return "Good";
  }

  if (score >= 60) {
    return "Needs Attention";
  }

  return "High Risk";
}

function toTrendDirection(
  value: number,
):
  | "up"
  | "down"
  | "neutral" {
  if (value > 0) {
    return "up";
  }

  if (value < 0) {
    return "down";
  }

  return "neutral";
}

function normalizeTrend(
  value: number | null,
) {
  return value ?? 0;
}

function sumOrderTotal(
  orders: DashboardOrder[],
) {
  return orders.reduce(
    (sum, order) =>
      sum +
      (Number(order.total) || 0),
    0,
  );
}

function sumOrderProfit(
  orders: DashboardOrder[],
) {
  return orders.reduce(
    (sum, order) =>
      sum + getOrderProfit(order),
    0,
  );
}

function getOrderProfit(
  order: DashboardOrder,
) {
  const profit =
    Number(order.profit);

  if (Number.isFinite(profit)) {
    return profit;
  }

  const total =
    Number(order.total) || 0;
  const cost =
    Number(order.cost);

  if (Number.isFinite(cost)) {
    return total - cost;
  }

  return 0;
}

function isRevenueOrder(
  order: DashboardOrder,
) {
  const status = String(
    order.status ?? "",
  )
    .trim()
    .toLowerCase();

  return ![
    "cancelled",
    "canceled",
    "refunded",
    "void",
    "已取消",
    "取消",
    "退款",
  ].includes(status);
}

function calculateChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) {
    return current === 0
      ? 0
      : null;
  }

  return (
    ((current - previous) /
      previous) *
    100
  );
}

function isDateBetween(
  value: string,
  start: Date,
  endExclusive: Date,
) {
  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date >= start &&
    date < endExclusive
  );
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function addDays(
  date: Date,
  days: number,
) {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

function getDateKey(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  ).format(date);
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return date.toLocaleString(
    "en-US",
  );
}

const page = {
  minWidth: 0,
  paddingBottom: 36,
};

const currencyPanel = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 16,
  marginBottom: 24,
  padding: "14px 18px",
  border: "1px solid #bfdbfe",
  borderRadius: 14,
  background:
    "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
  boxShadow:
    "0 8px 24px rgba(37,99,235,.06)",
};

const currencyItem = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 3,
};

const currencyLabel = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
};

const currencyValue = {
  color: "#1d4ed8",
  fontSize: 16,
};

const currencyDivider = {
  width: 1,
  height: 34,
  background: "#bfdbfe",
};

const currencyNote = {
  flex: "1 1 320px",
  margin: 0,
  color: "#475569",
  fontSize: 12,
  lineHeight: 1.6,
};

const errorBox = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 12,
  background: "#fee2e2",
  color: "#991b1b",
};

const lowerGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20,
  marginTop: 20,
};

const panelCard = {
  minWidth: 0,
  padding: 22,
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  background: "#ffffff",
  boxShadow:
    "0 10px 25px rgba(0,0,0,.06)",
};

const panelHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
};

const panelEyebrow = {
  margin: 0,
  color: "#b88916",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "1.3px",
};

const panelTitle = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: 22,
};

const panelBadge = {
  padding: "6px 9px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 10,
  fontWeight: 900,
};

const serviceList = {
  display: "grid",
  gap: 2,
};

const serviceRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "13px 0",
  borderBottom: "1px solid #e5e7eb",
};

const serviceNameBox = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const rankBadge = {
  width: 29,
  height: 29,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  borderRadius: 9,
  background: "#fff7d6",
  color: "#9a6b00",
  fontSize: 11,
  fontWeight: 900,
};

const serviceName = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 850,
};

const serviceCount = {
  color: "#2563eb",
  fontSize: 13,
};

const orderRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "14px 0",
  borderBottom: "1px solid #e5e7eb",
};

const orderNumber = {
  color: "#0f172a",
  fontSize: 13,
};

const orderMeta = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: 10,
};

const orderAmountBox = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-end",
  gap: 7,
};

const statusBadge = {
  padding: "4px 8px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 9,
  fontWeight: 850,
  textTransform: "capitalize" as const,
};

const orderAmount = {
  color: "#0f172a",
  fontSize: 14,
};

const emptyState = {
  padding: "28px 12px",
  color: "#94a3b8",
  textAlign: "center" as const,
};

const healthyState = {
  padding: "28px 12px",
  color: "#15803d",
  textAlign: "center" as const,
  fontWeight: 850,
};

export default Dashboard;