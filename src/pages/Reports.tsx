import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import { supabase } from "../lib/supabase";

type Order = {
  id: number;
  order_no: string;
  member_id: number | null;
  vehicle_id: number | null;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
  created_at: string;
};

type OrderItem = {
  id: number;
  order_id: number;

  service_id: number | null;
  product_id: number | null;
  package_id: number | null;

  quantity: number | string;
  unit_price: number | string;
  discount: number | string;
  total: number | string;
};
type ServiceLookup = {
  id: number;
  service_name: string;
};
type PackageLookup = {
  id: number;
  package_name: string;
  package_name_en?: string | null;
};
type DailyRevenue = {
  date: string;
  displayDate: string;
  revenue: number;
  orders: number;
};

type PaymentSummary = {
  name: string;
  amount: number;
  orders: number;
};

type ServiceSummary = {
  name: string;
  quantity: number;
  amount: number;
};

const PAYMENT_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

function Reports() {
  const today = new Date();

  const [startDate, setStartDate] = useState(
    toInputDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    )
  );

  const [endDate, setEndDate] = useState(
    toInputDate(today)
  );

  const [orders, setOrders] = useState<Order[]>(
    []
  );

  const [summaryOrders, setSummaryOrders] =
    useState<Order[]>([]);

const [orderItems, setOrderItems] = useState<
  OrderItem[]
>([]);

const [serviceNames, setServiceNames] =
  useState<Record<number, string>>({});

const [packageNames, setPackageNames] =
  useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReportData();
  }, []);

  async function loadReportData() {
    try {
      setLoading(true);
      setError("");

      const rangeStart =
        parseInputDate(startDate);

      const rangeEnd =
        addDays(parseInputDate(endDate), 1);

      if (rangeStart >= rangeEnd) {
        throw new Error(
          "开始日期不能晚于结束日期"
        );
      }

      const currentDate = new Date();

      const todayStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate()
      );

      const tomorrow = addDays(todayStart, 1);

      const weekStart =
        getMondayStart(currentDate);

      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );

      const summaryStart = new Date(
        Math.min(
          todayStart.getTime(),
          weekStart.getTime(),
          monthStart.getTime()
        )
      );

      const [
        rangeOrdersResult,
        summaryOrdersResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            `
            id,
            order_no,
            member_id,
vehicle_id,
            subtotal,
            discount,
            total,
            payment_method,
            payment_status,
            status,
            created_at
          `
          )
          .gte(
            "created_at",
            rangeStart.toISOString()
          )
          .lt(
            "created_at",
            rangeEnd.toISOString()
          )
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("orders")
          .select(
            `
            id,
            order_no,
            member_id,
vehicle_id,
            subtotal,
            discount,
            total,
            payment_method,
            payment_status,
            status,
            created_at
          `
          )
          .gte(
            "created_at",
            summaryStart.toISOString()
          )
          .lt(
            "created_at",
            tomorrow.toISOString()
          )
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (rangeOrdersResult.error) {
        throw rangeOrdersResult.error;
      }

      if (summaryOrdersResult.error) {
        throw summaryOrdersResult.error;
      }

      const loadedOrders =
        (rangeOrdersResult.data ?? []) as Order[];

      const loadedSummaryOrders =
        (summaryOrdersResult.data ??
          []) as Order[];

      setOrders(loadedOrders);
      setSummaryOrders(loadedSummaryOrders);

      const orderIds = loadedOrders.map(
        (order) => order.id
      );

      if (orderIds.length === 0) {
  setOrderItems([]);
  setServiceNames({});
  setPackageNames({});
  return;
}

const {
  data: itemsData,
  error: itemsError,
} = await supabase
  .from("order_items")
  .select(`
    id,
    order_id,
    service_id,
    product_id,
    package_id,
    quantity,
    unit_price,
    discount,
    total
  `)
  .in("order_id", orderIds)
  .order("id", {
    ascending: true,
  });

if (itemsError) {
  throw itemsError;
}

const loadedItems =
  (itemsData ?? []) as OrderItem[];

setOrderItems(loadedItems);

const serviceIds = Array.from(
  new Set(
    loadedItems
      .map((item) => item.service_id)
      .filter(
        (id): id is number =>
          id !== null
      )
  )
);

const packageIds = Array.from(
  new Set(
    loadedItems
      .map((item) => item.package_id)
      .filter(
        (id): id is number =>
          id !== null
      )
  )
);

if (serviceIds.length > 0) {
  const {
    data: servicesData,
    error: servicesError,
  } = await supabase
    .from("services")
    .select("id, service_name")
    .in("id", serviceIds);

  if (servicesError) {
    throw servicesError;
  }

  const serviceMap: Record<number, string> =
    {};

  (
    (servicesData ?? []) as ServiceLookup[]
  ).forEach((service) => {
    serviceMap[service.id] =
      service.service_name;
  });

  setServiceNames(serviceMap);
} else {
  setServiceNames({});
}

if (packageIds.length > 0) {
  const {
    data: packagesData,
    error: packagesError,
  } = await supabase
    .from("packages")
    .select(`
      id,
      package_name,
      package_name_en
    `)
    .in("id", packageIds);

  if (packagesError) {
    throw packagesError;
  }

  const packageMap: Record<number, string> =
    {};

  (
    (packagesData ?? []) as PackageLookup[]
  ).forEach((packageItem) => {
    packageMap[packageItem.id] =
      packageItem.package_name;
  });

  setPackageNames(packageMap);
} else {
  setPackageNames({});
}
    } catch (reportError) {
      console.error(
        "Failed to load reports:",
        reportError
      );

      setError(
        reportError instanceof Error
          ? reportError.message
          : "财务报表加载失败"
      );
    } finally {
      setLoading(false);
    }
  }

  const revenueOrders = useMemo(
    () => orders.filter(isRevenueOrder),
    [orders]
  );

  const totalRevenue = useMemo(
    () =>
      revenueOrders.reduce(
        (sum, order) =>
          sum + toNumber(order.total),
        0
      ),
    [revenueOrders]
  );

  const totalSubtotal = useMemo(
    () =>
      revenueOrders.reduce(
        (sum, order) =>
          sum + toNumber(order.subtotal),
        0
      ),
    [revenueOrders]
  );

  const totalDiscount = useMemo(
    () =>
      revenueOrders.reduce(
        (sum, order) =>
          sum + toNumber(order.discount),
        0
      ),
    [revenueOrders]
  );

  const averageOrderValue =
    revenueOrders.length > 0
      ? totalRevenue / revenueOrders.length
      : 0;

  const dailyRevenue = useMemo(() => {
    const rangeStart =
      parseInputDate(startDate);

    const rangeEnd =
      addDays(parseInputDate(endDate), 1);

    const result = new Map<
      string,
      DailyRevenue
    >();

    const cursor = new Date(rangeStart);

    while (cursor < rangeEnd) {
      const key = toInputDate(cursor);

      result.set(key, {
        date: key,
        displayDate: formatShortDate(cursor),
        revenue: 0,
        orders: 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    revenueOrders.forEach((order) => {
      const key = toInputDate(
        new Date(order.created_at)
      );

      const current = result.get(key);

      if (!current) return;

      current.revenue += toNumber(order.total);
      current.orders += 1;
    });

    return Array.from(result.values());
  }, [
    revenueOrders,
    startDate,
    endDate,
  ]);

  const paymentSummary = useMemo(() => {
    const map = new Map<
      string,
      PaymentSummary
    >();

    revenueOrders.forEach((order) => {
      const paymentKey =
        order.payment_method || "other";

      const paymentName =
        getPaymentLabel(paymentKey);

      const current = map.get(paymentName) ?? {
        name: paymentName,
        amount: 0,
        orders: 0,
      };

      current.amount += toNumber(order.total);
      current.orders += 1;

      map.set(paymentName, current);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.amount - a.amount
    );
  }, [revenueOrders]);

  const topServices = useMemo(() => {
    const validOrderIds = new Set(
      revenueOrders.map((order) => order.id)
    );

    const map = new Map<
      string,
      ServiceSummary
    >();

    orderItems.forEach((item) => {
      if (!validOrderIds.has(item.order_id)) {
        return;
      }

const name = item.package_id
  ? `🔥 ${
      packageNames[item.package_id] ??
      `套餐 #${item.package_id}`
    }`
  : item.service_id
    ? serviceNames[item.service_id] ??
      `服务 #${item.service_id}`
    : item.product_id
      ? `产品 #${item.product_id}`
      : "其他项目";

      const current = map.get(name) ?? {
        name,
        quantity: 0,
        amount: 0,
      };

      current.quantity += toNumber(
        item.quantity
      );

      current.amount += toNumber(
  item.total
);

      map.set(name, current);
    });

    return Array.from(map.values())
      .sort(
        (a, b) =>
          b.quantity - a.quantity
      )
      .slice(0, 8);
}, [
  orderItems,
  revenueOrders,
  serviceNames,
  packageNames,
]);

  const todayRevenue = useMemo(() => {
    const now = new Date();

    return calculateRevenueBetween(
      summaryOrders,
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ),
      addDays(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ),
        1
      )
    );
  }, [summaryOrders]);

  const weekRevenue = useMemo(() => {
    const now = new Date();

    return calculateRevenueBetween(
      summaryOrders,
      getMondayStart(now),
      addDays(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ),
        1
      )
    );
  }, [summaryOrders]);

  const monthRevenue = useMemo(() => {
    const now = new Date();

    return calculateRevenueBetween(
      summaryOrders,
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ),
      addDays(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        ),
        1
      )
    );
  }, [summaryOrders]);

  function exportCSV() {
    if (orders.length === 0) {
      alert("当前日期范围没有订单");
      return;
    }

    const headers = [
      "订单编号",
      "日期",
      "会员ID",
"车辆ID",
      "付款方式",
      "小计",
      "折扣",
      "总金额",
      "付款状态",
      "订单状态",
    ];

    const rows = orders.map((order) => [
      order.order_no,
      formatDateTime(order.created_at),
      order.member_id ?? "",
order.vehicle_id ?? "",
      getPaymentLabel(
        order.payment_method ?? "other"
      ),
      toNumber(order.subtotal).toFixed(2),
      toNumber(order.discount).toFixed(2),
      toNumber(order.total).toFixed(2),
      getPaymentStatusLabel(
        order.payment_status
      ),
      getOrderStatusLabel(
        order.status
      ),
    ]);

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\ufeff" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `GTB-Financial-Report-${startDate}-${endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  return (
    <main
      className="reports-print-area"
      style={page}
    >
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }

            .reports-print-area,
            .reports-print-area * {
              visibility: visible !important;
            }

            .reports-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 0 !important;
              background: white !important;
            }

            .reports-no-print {
              display: none !important;
            }

            .reports-card {
              box-shadow: none !important;
              break-inside: avoid;
            }
          }
        `}
      </style>

      <header style={header}>
        <div>
          <p style={eyebrow}>
            FINANCIAL ANALYTICS
          </p>

          <h1 style={title}>
            财务报表 / Financial Reports
          </h1>

          <p style={subtitle}>
            营业额、订单、付款方式与热门服务分析
          </p>
        </div>

        <div
          className="reports-no-print"
          style={headerActions}
        >
          <button
            type="button"
            onClick={loadReportData}
            disabled={loading}
            style={secondaryButton}
          >
            ↻ 刷新数据
          </button>

          <button
            type="button"
            onClick={exportCSV}
            style={exportButton}
          >
            ↓ 导出 CSV
          </button>

          <button
            type="button"
            onClick={printReport}
            style={primaryButton}
          >
            🖨 打印报表
          </button>
        </div>
      </header>

      <section
        className="reports-no-print reports-card"
        style={filterCard}
      >
        <div style={filterGroup}>
          <label style={filterLabel}>
            开始日期 / Start Date
          </label>

          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
            style={dateInput}
          />
        </div>

        <div style={filterGroup}>
          <label style={filterLabel}>
            结束日期 / End Date
          </label>

          <input
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
            style={dateInput}
          />
        </div>

        <button
          type="button"
          onClick={loadReportData}
          disabled={loading}
          style={{
            ...applyButton,
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading
            ? "正在加载..."
            : "应用日期 / Apply"}
        </button>
      </section>

      {error && (
        <div style={errorBox}>
          <strong>报表加载失败</strong>
          <span>{error}</span>
        </div>
      )}

      <section style={summaryGrid}>
        <ReportCard
          icon="💰"
          label="日期范围营业额"
          english="Selected Revenue"
          value={formatCurrency(totalRevenue)}
          accent="#16a34a"
        />

        <ReportCard
          icon="🧾"
          label="有效订单"
          english="Completed Orders"
          value={`${revenueOrders.length} 单`}
          accent="#2563eb"
        />

        <ReportCard
          icon="📊"
          label="平均客单价"
          english="Average Order"
          value={formatCurrency(
            averageOrderValue
          )}
          accent="#8b5cf6"
        />

        <ReportCard
          icon="🏷️"
          label="折扣金额"
          english="Total Discount"
          value={formatCurrency(totalDiscount)}
          accent="#f59e0b"
        />

        <ReportCard
          icon="📅"
          label="今日营业额"
          english="Today Revenue"
          value={formatCurrency(todayRevenue)}
          accent="#0891b2"
        />

        <ReportCard
          icon="🗓️"
          label="本周营业额"
          english="Week Revenue"
          value={formatCurrency(weekRevenue)}
          accent="#db2777"
        />

        <ReportCard
          icon="📈"
          label="本月营业额"
          english="Month Revenue"
          value={formatCurrency(monthRevenue)}
          accent="#ea580c"
        />

        <ReportCard
          icon="🧮"
          label="折扣前金额"
          english="Gross Subtotal"
          value={formatCurrency(totalSubtotal)}
          accent="#475569"
        />
      </section>

      <section
        className="reports-card"
        style={largeChartCard}
      >
        <div style={sectionHeader}>
          <div>
            <p style={sectionEyebrow}>
              REVENUE TREND
            </p>

            <h2 style={sectionTitle}>
              每日营业趋势
            </h2>
          </div>

          <strong style={sectionTotal}>
            {formatCurrency(totalRevenue)}
          </strong>
        </div>

        <div style={chartHeight}>
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={dailyRevenue}
              margin={{
                top: 15,
                right: 15,
                left: 5,
                bottom: 5,
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
                    stopColor="#2563eb"
                    stopOpacity={0.35}
                  />

                  <stop
                    offset="95%"
                    stopColor="#2563eb"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="displayDate"
                tick={{
                  fill: "#64748b",
                  fontSize: 12,
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tickFormatter={(value) =>
                  `$${value}`
                }
                tick={{
                  fill: "#64748b",
                  fontSize: 12,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                formatter={(value) => [
                  formatCurrency(
                    Number(value)
                  ),
                  "营业额",
                ]}
                labelFormatter={(label) =>
                  `日期：${label}`
                }
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                name="营业额"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={chartGrid}>
        <div
          className="reports-card"
          style={chartCard}
        >
          <div style={sectionHeader}>
            <div>
              <p style={sectionEyebrow}>
                PAYMENT METHODS
              </p>

              <h2 style={sectionTitle}>
                付款方式统计
              </h2>
            </div>
          </div>

          {paymentSummary.length > 0 ? (
            <div style={mediumChartHeight}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={paymentSummary}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {paymentSummary.map(
                      (_, index) => (
                        <Cell
                          key={index}
                          fill={
                            PAYMENT_COLORS[
                              index %
                                PAYMENT_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(
                        Number(value)
                      )
                    }
                  />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="暂无付款数据" />
          )}
        </div>

        <div
          className="reports-card"
          style={chartCard}
        >
          <div style={sectionHeader}>
            <div>
              <p style={sectionEyebrow}>
                TOP SERVICES
              </p>

              <h2 style={sectionTitle}>
                热门服务排行
              </h2>
            </div>
          </div>

          {topServices.length > 0 ? (
            <div style={mediumChartHeight}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={topServices}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 20,
                    left: 15,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#475569",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${Number(value)} 次`,
                      "销售数量",
                    ]}
                  />

                  <Bar
                    dataKey="quantity"
                    fill="#8b5cf6"
                    radius={[0, 8, 8, 0]}
                    name="销售数量"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="暂无服务销售数据" />
          )}
        </div>
      </section>

      <section
        className="reports-card"
        style={tableCard}
      >
        <div style={sectionHeader}>
          <div>
            <p style={sectionEyebrow}>
              ORDER DETAILS
            </p>

            <h2 style={sectionTitle}>
              财务订单明细
            </h2>
          </div>

          <span style={orderCountBadge}>
            共 {orders.length} 单
          </span>
        </div>

        <div style={tableWrapper}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>订单编号</th>
                <th style={th}>日期时间</th>
                <th style={th}>会员 / 车辆</th>
                <th style={th}>付款方式</th>
                <th style={th}>小计</th>
                <th style={th}>折扣</th>
                <th style={th}>总金额</th>
                <th style={th}>状态</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={emptyTableCell}
                  >
                    当前日期范围暂无订单
                  </td>
                </tr>
              ) : (
                [...orders]
                  .reverse()
                  .map((order) => (
                    <tr key={order.id}>
                      <td style={td}>
                        <strong>
                          {order.order_no}
                        </strong>
                      </td>

                      <td style={td}>
                        {formatDateTime(
                          order.created_at
                        )}
                      </td>

                      <td style={td}>
                        <div style={customerCell}>
                          <strong>
  会员ID：{order.member_id ?? "散客"}
</strong>

<span>
  车辆ID：{order.vehicle_id ?? "未登记"}
</span>
                        </div>
                      </td>

                      <td style={td}>
                        {getPaymentLabel(
                          order.payment_method ||
                            "other"
                        )}
                      </td>

                      <td style={td}>
                        {formatCurrency(
                          toNumber(
                            order.subtotal
                          )
                        )}
                      </td>

                      <td style={td}>
                        {formatCurrency(
                          toNumber(
                            order.discount
                          )
                        )}
                      </td>

                      <td style={td}>
                        <strong style={moneyText}>
                          {formatCurrency(
                            toNumber(order.total)
                          )}
                        </strong>
                      </td>

                      <td style={td}>
                        <StatusBadge
                          status={
                            order.status
                          }
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer style={reportFooter}>
        <span>
          报表日期：{startDate} 至 {endDate}
        </span>

        <span>
          GTB Auto Detailing & Window Film POS
        </span>
      </footer>
    </main>
  );
}

function ReportCard({
  icon,
  label,
  english,
  value,
  accent,
}: {
  icon: string;
  label: string;
  english: string;
  value: string;
  accent: string;
}) {
  return (
    <article
      className="reports-card"
      style={{
        ...summaryCard,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div
        style={{
          ...summaryIcon,
          background: `${accent}15`,
          color: accent,
        }}
      >
        {icon}
      </div>

      <div>
        <p style={summaryLabel}>
          {label}
        </p>

        <p style={summaryEnglish}>
          {english}
        </p>

        <strong style={summaryValue}>
          {value}
        </strong>
      </div>
    </article>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div style={emptyState}>
      <span style={emptyIcon}>📊</span>
      <span>{text}</span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  const normalizedStatus =
    status || "pending";

  const completed =
    normalizedStatus === "completed";

  const cancelled =
    normalizedStatus === "cancelled";

  return (
    <span
      style={{
        ...statusBadge,
        color: completed
          ? "#15803d"
          : cancelled
            ? "#b91c1c"
            : "#1d4ed8",
        background: completed
          ? "#dcfce7"
          : cancelled
            ? "#fee2e2"
            : "#dbeafe",
      }}
    >
      {getOrderStatusLabel(
        normalizedStatus
      )}
    </span>
  );
}

function isRevenueOrder(order: Order) {
  return (
    order.status !== "cancelled" &&
    order.payment_status !== "refunded" &&
    order.payment_status !== "unpaid"
  );
}

function calculateRevenueBetween(
  sourceOrders: Order[],
  start: Date,
  end: Date
) {
  return sourceOrders
    .filter((order) => {
      if (!isRevenueOrder(order)) {
        return false;
      }

      const orderDate = new Date(
        order.created_at
      );

      return (
        orderDate >= start &&
        orderDate < end
      );
    })
    .reduce(
      (sum, order) =>
        sum + toNumber(order.total),
      0
    );
}

function getMondayStart(date: Date) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const day = result.getDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  result.setDate(
    result.getDate() + difference
  );

  return result;
}

function parseInputDate(value: string) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    0
  );
}

function addDays(date: Date, days: number) {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

function toInputDate(date: Date) {
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "zh-CN",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }
  ).format(value || 0);
}

function toNumber(
  value: number | string | null | undefined
) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function getPaymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "现金 / Cash",
    card: "银行卡 / Card",
    transfer: "银行转账 / Transfer",
    bank_transfer:
      "银行转账 / Transfer",
    kbzpay: "KBZPay",
    wavepay: "WavePay",
    mobile: "电子钱包 / Mobile Pay",
    other: "其他 / Other",
  };

  return labels[method.toLowerCase()] ?? method;
}

function getPaymentStatusLabel(
  status: string | null
) {
  const labels: Record<string, string> = {
    paid: "已付款",
    unpaid: "未付款",
    partial: "部分付款",
    refunded: "已退款",
  };

  return labels[status || ""] ?? status ?? "";
}

function getOrderStatusLabel(
  status: string | null
) {
  const labels: Record<string, string> = {
    pending: "待处理",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };

  return labels[status || ""] ?? status ?? "";
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "30px",
  background: "#f8fafc",
  color: "#0f172a",
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 20,
  marginBottom: 24,
};

const eyebrow: CSSProperties = {
  margin: "0 0 7px",
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.4,
};

const title: CSSProperties = {
  margin: 0,
  fontSize: 34,
  lineHeight: 1.15,
};

const subtitle: CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 14,
};

const headerActions: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const buttonBase: CSSProperties = {
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  ...buttonBase,
  border: "none",
  background: "#0f172a",
  color: "#ffffff",
};

const exportButton: CSSProperties = {
  ...buttonBase,
  border: "none",
  background: "#16a34a",
  color: "#ffffff",
};

const secondaryButton: CSSProperties = {
  ...buttonBase,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
};

const filterCard: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  flexWrap: "wrap",
  gap: 14,
  marginBottom: 22,
  padding: 18,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const filterGroup: CSSProperties = {
  minWidth: 190,
  flex: "1 1 190px",
  display: "flex",
  flexDirection: "column",
  gap: 7,
};

const filterLabel: CSSProperties = {
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
};

const dateInput: CSSProperties = {
  minHeight: 44,
  padding: "0 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 11,
  fontSize: 14,
  outline: "none",
};

const applyButton: CSSProperties = {
  minHeight: 44,
  padding: "0 22px",
  border: "none",
  borderRadius: 11,
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 850,
  cursor: "pointer",
};

const errorBox: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 20,
  padding: 15,
  borderRadius: 14,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(210px,1fr))",
  gap: 16,
  marginBottom: 20,
};

const summaryCard: CSSProperties = {
  minHeight: 125,
  padding: 18,
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const summaryIcon: CSSProperties = {
  width: 44,
  height: 44,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 13,
  fontSize: 21,
};

const summaryLabel: CSSProperties = {
  margin: 0,
  color: "#334155",
  fontSize: 13,
  fontWeight: 850,
};

const summaryEnglish: CSSProperties = {
  margin: "3px 0 10px",
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const summaryValue: CSSProperties = {
  color: "#0f172a",
  fontSize: 23,
  lineHeight: 1,
};

const largeChartCard: CSSProperties = {
  marginBottom: 20,
  padding: 22,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const chartGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(360px,1fr))",
  gap: 20,
  marginBottom: 20,
};

const chartCard: CSSProperties = {
  minWidth: 0,
  padding: 22,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const sectionHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  marginBottom: 18,
};

const sectionEyebrow: CSSProperties = {
  margin: "0 0 4px",
  color: "#64748b",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1.2,
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const sectionTotal: CSSProperties = {
  color: "#16a34a",
  fontSize: 20,
};

const chartHeight: CSSProperties = {
  width: "100%",
  height: 330,
};

const mediumChartHeight: CSSProperties = {
  width: "100%",
  height: 300,
};

const emptyState: CSSProperties = {
  minHeight: 280,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  color: "#94a3b8",
};

const emptyIcon: CSSProperties = {
  fontSize: 34,
};

const tableCard: CSSProperties = {
  padding: 22,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const orderCountBadge: CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 800,
};

const tableWrapper: CSSProperties = {
  width: "100%",
  overflowX: "auto",
};

const table: CSSProperties = {
  width: "100%",
  minWidth: 950,
  borderCollapse: "collapse",
};

const th: CSSProperties = {
  padding: "13px 12px",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#64748b",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
};

const td: CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
  fontSize: 13,
  verticalAlign: "middle",
};

const customerCell: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const moneyText: CSSProperties = {
  color: "#15803d",
};

const statusBadge: CSSProperties = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const emptyTableCell: CSSProperties = {
  padding: 45,
  color: "#94a3b8",
  textAlign: "center",
};

const reportFooter: CSSProperties = {
  marginTop: 18,
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 10,
  color: "#94a3b8",
  fontSize: 11,
};

export default Reports;