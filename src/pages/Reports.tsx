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
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "../lib/supabase";
import ProfitAnalytics from "../components/reports/ProfitAnalytics";
import useCurrency from "../hooks/useCurrency";
import type { CurrencyCode } from "../services/currencyService";

/* =========================================================
   数据类型
========================================================= */

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

type Refund = {
  id: number;
  refund_no: string;
  order_id: number;
  refund_type: string;
  refund_amount: number | string;
  refund_method: string | null;
  reason: string;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
};

type RefundItem = {
  id: number;
  refund_id: number;
  order_item_id: number;
  item_type: string;
  product_id: number | null;
  service_id: number | null;
  package_id: number | null;
  item_name: string | null;
  quantity: number | string;
  unit_price: number | string;
  refund_amount: number | string;
  restock: boolean;
  created_at: string;
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

type DailyFinancial = {
  date: string;
  displayDate: string;
  grossSales: number;
  refunds: number;
  netRevenue: number;
  orders: number;
  refundCount: number;
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

type RefundReasonSummary = {
  name: string;
  amount: number;
  count: number;
};

type PeriodFinancial = {
  grossSales: number;
  refunds: number;
  netRevenue: number;
};

const PAYMENT_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

const REFUND_COLORS = [
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#7c3aed",
  "#475569",
];

/* =========================================================
   页面组件
========================================================= */

function Reports() {
  const {
    formatMoney,
    convertToDisplay,
    displayCurrency,
    accountingCurrency,
    currentOption,
    accountingOption,
  } = useCurrency();

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

  const [refunds, setRefunds] = useState<
    Refund[]
  >([]);

  const [summaryRefunds, setSummaryRefunds] =
    useState<Refund[]>([]);

  const [orderItems, setOrderItems] = useState<
    OrderItem[]
  >([]);

  const [refundItems, setRefundItems] = useState<
    RefundItem[]
  >([]);

  const [serviceNames, setServiceNames] =
    useState<Record<number, string>>({});

  const [packageNames, setPackageNames] =
    useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadReportData();
  }, []);

  /* =======================================================
     加载报表数据
  ======================================================= */

  async function loadReportData() {
    try {
      setLoading(true);
      setError("");

      const rangeStart =
        parseInputDate(startDate);

      const rangeEnd = addDays(
        parseInputDate(endDate),
        1
      );

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
        rangeRefundsResult,
        summaryRefundsResult,
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

        supabase
          .from("refunds")
          .select(
            `
            id,
            refund_no,
            order_id,
            refund_type,
            refund_amount,
            refund_method,
            reason,
            status,
            notes,
            created_at,
            completed_at
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
          .from("refunds")
          .select(
            `
            id,
            refund_no,
            order_id,
            refund_type,
            refund_amount,
            refund_method,
            reason,
            status,
            notes,
            created_at,
            completed_at
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

      if (rangeRefundsResult.error) {
        throw rangeRefundsResult.error;
      }

      if (summaryRefundsResult.error) {
        throw summaryRefundsResult.error;
      }

      const loadedOrders =
        (rangeOrdersResult.data ?? []) as Order[];

      const loadedSummaryOrders =
        (summaryOrdersResult.data ??
          []) as Order[];

      const loadedRefunds =
        (rangeRefundsResult.data ??
          []) as Refund[];

      const loadedSummaryRefunds =
        (summaryRefundsResult.data ??
          []) as Refund[];

      setOrders(loadedOrders);
      setSummaryOrders(loadedSummaryOrders);
      setRefunds(loadedRefunds);
      setSummaryRefunds(loadedSummaryRefunds);

      const orderIds = loadedOrders.map(
        (order) => order.id
      );

      const refundIds = loadedRefunds.map(
        (refund) => refund.id
      );

      const itemsResult =
        orderIds.length > 0
          ? await supabase
              .from("order_items")
              .select(
                `
                id,
                order_id,
                service_id,
                product_id,
                package_id,
                quantity,
                unit_price,
                discount,
                total
              `
              )
              .in("order_id", orderIds)
              .order("id", {
                ascending: true,
              })
          : { data: [], error: null };

      if (itemsResult.error) {
        throw itemsResult.error;
      }

      const refundItemsResult =
        refundIds.length > 0
          ? await supabase
              .from("refund_items")
              .select(
                `
                id,
                refund_id,
                order_item_id,
                item_type,
                product_id,
                service_id,
                package_id,
                item_name,
                quantity,
                unit_price,
                refund_amount,
                restock,
                created_at
              `
              )
              .in("refund_id", refundIds)
              .order("id", {
                ascending: true,
              })
          : { data: [], error: null };

      if (refundItemsResult.error) {
        throw refundItemsResult.error;
      }

      const loadedItems =
        (itemsResult.data ?? []) as OrderItem[];

      const loadedRefundItems =
        (refundItemsResult.data ??
          []) as RefundItem[];

      setOrderItems(loadedItems);
      setRefundItems(loadedRefundItems);

      const serviceIds = Array.from(
        new Set(
          [
            ...loadedItems.map(
              (item) => item.service_id
            ),
            ...loadedRefundItems.map(
              (item) => item.service_id
            ),
          ].filter(
            (id): id is number => id !== null
          )
        )
      );

      const packageIds = Array.from(
        new Set(
          [
            ...loadedItems.map(
              (item) => item.package_id
            ),
            ...loadedRefundItems.map(
              (item) => item.package_id
            ),
          ].filter(
            (id): id is number => id !== null
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

        const serviceMap: Record<
          number,
          string
        > = {};

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
          .select(
            `
            id,
            package_name,
            package_name_en
          `
          )
          .in("id", packageIds);

        if (packagesError) {
          throw packagesError;
        }

        const packageMap: Record<
          number,
          string
        > = {};

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

  /* =======================================================
     选定日期范围统计
  ======================================================= */

  const grossSaleOrders = useMemo(
    () => orders.filter(isGrossSaleOrder),
    [orders]
  );

  const completedRefunds = useMemo(
    () => refunds.filter(isCompletedRefund),
    [refunds]
  );

  const grossSales = useMemo(
    () =>
      grossSaleOrders.reduce(
        (sum, order) =>
          sum + toNumber(order.total),
        0
      ),
    [grossSaleOrders]
  );

  const totalRefunds = useMemo(
    () =>
      completedRefunds.reduce(
        (sum, refund) =>
          sum +
          toNumber(refund.refund_amount),
        0
      ),
    [completedRefunds]
  );

  const netRevenue = grossSales - totalRefunds;

  const totalSubtotal = useMemo(
    () =>
      grossSaleOrders.reduce(
        (sum, order) =>
          sum + toNumber(order.subtotal),
        0
      ),
    [grossSaleOrders]
  );

  const totalDiscount = useMemo(
    () =>
      grossSaleOrders.reduce(
        (sum, order) =>
          sum + toNumber(order.discount),
        0
      ),
    [grossSaleOrders]
  );

  const averageOrderValue =
    grossSaleOrders.length > 0
      ? grossSales / grossSaleOrders.length
      : 0;

  const refundRate =
    grossSales > 0
      ? (totalRefunds / grossSales) * 100
      : 0;

  const restockedQuantity = useMemo(() => {
    const validRefundIds = new Set(
      completedRefunds.map(
        (refund) => refund.id
      )
    );

    return refundItems
      .filter(
        (item) =>
          validRefundIds.has(item.refund_id) &&
          item.restock
      )
      .reduce(
        (sum, item) =>
          sum + toNumber(item.quantity),
        0
      );
  }, [completedRefunds, refundItems]);

  const dailyFinancial = useMemo(() => {
    const rangeStart =
      parseInputDate(startDate);

    const rangeEnd = addDays(
      parseInputDate(endDate),
      1
    );

    const result = new Map<
      string,
      DailyFinancial
    >();

    const cursor = new Date(rangeStart);

    while (cursor < rangeEnd) {
      const key = toInputDate(cursor);

      result.set(key, {
        date: key,
        displayDate: formatShortDate(cursor),
        grossSales: 0,
        refunds: 0,
        netRevenue: 0,
        orders: 0,
        refundCount: 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    grossSaleOrders.forEach((order) => {
      const key = toInputDate(
        new Date(order.created_at)
      );

      const current = result.get(key);

      if (!current) return;

      current.grossSales += toNumber(
        order.total
      );
      current.orders += 1;
    });

    completedRefunds.forEach((refund) => {
      const key = toInputDate(
        new Date(refund.created_at)
      );

      const current = result.get(key);

      if (!current) return;

      current.refunds += toNumber(
        refund.refund_amount
      );
      current.refundCount += 1;
    });

    result.forEach((item) => {
      item.netRevenue =
        item.grossSales - item.refunds;
    });

    return Array.from(result.values());
  }, [
    grossSaleOrders,
    completedRefunds,
    startDate,
    endDate,
  ]);

  const paymentSummary = useMemo(() => {
    const map = new Map<
      string,
      PaymentSummary
    >();

    grossSaleOrders.forEach((order) => {
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
  }, [grossSaleOrders]);

  const refundMethodSummary = useMemo(() => {
    const map = new Map<
      string,
      PaymentSummary
    >();

    completedRefunds.forEach((refund) => {
      const methodKey =
        refund.refund_method || "other";

      const methodName =
        getPaymentLabel(methodKey);

      const current = map.get(methodName) ?? {
        name: methodName,
        amount: 0,
        orders: 0,
      };

      current.amount += toNumber(
        refund.refund_amount
      );
      current.orders += 1;

      map.set(methodName, current);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.amount - a.amount
    );
  }, [completedRefunds]);

  const refundReasonSummary = useMemo(() => {
    const map = new Map<
      string,
      RefundReasonSummary
    >();

    completedRefunds.forEach((refund) => {
      const reason =
        refund.reason?.trim() || "其他原因";

      const current = map.get(reason) ?? {
        name: reason,
        amount: 0,
        count: 0,
      };

      current.amount += toNumber(
        refund.refund_amount
      );
      current.count += 1;

      map.set(reason, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [completedRefunds]);

  const topServices = useMemo(() => {
    const validOrderIds = new Set(
      grossSaleOrders.map((order) => order.id)
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

      current.amount += toNumber(item.total);

      map.set(name, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [
    orderItems,
    grossSaleOrders,
    serviceNames,
    packageNames,
  ]);

  /* =======================================================
     今日 / 本周 / 本月净营业额
  ======================================================= */

  const todayFinancial = useMemo(() => {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    return calculateFinancialBetween(
      summaryOrders,
      summaryRefunds,
      start,
      addDays(start, 1)
    );
  }, [summaryOrders, summaryRefunds]);

  const weekFinancial = useMemo(() => {
    const now = new Date();

    return calculateFinancialBetween(
      summaryOrders,
      summaryRefunds,
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
  }, [summaryOrders, summaryRefunds]);

  const monthFinancial = useMemo(() => {
    const now = new Date();

    return calculateFinancialBetween(
      summaryOrders,
      summaryRefunds,
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
  }, [summaryOrders, summaryRefunds]);

  /* =======================================================
     货币显示与导出
  ======================================================= */

  function formatChartMoney(
    value: number
  ) {
    return formatCompactCurrency(
      convertToDisplay(
        Number.isFinite(value)
          ? value
          : 0
      ),
      displayCurrency
    );
  }

  /* =======================================================
     导出与打印
  ======================================================= */

  function exportCSV() {
    if (
      grossSaleOrders.length === 0 &&
      completedRefunds.length === 0
    ) {
      alert("当前日期范围没有销售或退款记录");
      return;
    }

    const exportDigits =
      displayCurrency === "MMK"
        ? 0
        : 2;

    const exportMoney = (
      value: number
    ) =>
      convertToDisplay(value).toFixed(
        exportDigits
      );

    const summaryRows = [
      ["GTB 财务报表"],
      ["开始日期", startDate],
      ["结束日期", endDate],
      ["账本基础货币", accountingCurrency],
      ["导出显示货币", displayCurrency],
      [
        "换算说明",
        "金额按当前手动汇率转换；数据库原始金额未修改",
      ],
      [
        "销售总额",
        exportMoney(grossSales),
      ],
      [
        "退款总额",
        exportMoney(totalRefunds),
      ],
      [
        "净营业额",
        exportMoney(netRevenue),
      ],
      [
        "退款率",
        `${refundRate.toFixed(2)}%`,
      ],
      [],
    ];

    const headers = [
      "交易类型",
      "交易编号",
      "关联订单",
      "日期时间",
      "付款/退款方式",
      `小计 (${displayCurrency})`,
      `折扣 (${displayCurrency})`,
      `金额 (${displayCurrency})`,
      "状态",
      "原因/备注",
    ];

    const orderRows = grossSaleOrders.map(
      (order) => [
        "销售",
        order.order_no,
        order.order_no,
        formatDateTime(order.created_at),
        getPaymentLabel(
          order.payment_method ?? "other"
        ),
        exportMoney(
          toNumber(order.subtotal)
        ),
        exportMoney(
          toNumber(order.discount)
        ),
        exportMoney(
          toNumber(order.total)
        ),
        getOrderStatusLabel(order.status),
        getPaymentStatusLabel(
          order.payment_status
        ),
      ]
    );

    const refundRows = completedRefunds.map(
      (refund) => [
        "退款",
        refund.refund_no,
        `Order ID ${refund.order_id}`,
        formatDateTime(refund.created_at),
        getPaymentLabel(
          refund.refund_method ?? "other"
        ),
        "",
        "",
        exportMoney(
          -toNumber(
            refund.refund_amount
          )
        ),
        getRefundStatusLabel(refund.status),
        [refund.reason, refund.notes]
          .filter(Boolean)
          .join(" - "),
      ]
    );

    const transactionRows = [
      ...orderRows,
      ...refundRows,
    ].sort((a, b) => {
      const dateA = new Date(String(a[3]));
      const dateB = new Date(String(b[3]));

      return dateA.getTime() - dateB.getTime();
    });

    const csvContent = [
      ...summaryRows,
      headers,
      ...transactionRows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(
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
    link.download = `GTB-Net-Financial-Report-${displayCurrency}-${startDate}-${endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  /* =======================================================
     页面 UI
  ======================================================= */

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
            NET FINANCIAL ANALYTICS
          </p>

          <h1 style={title}>
            财务报表 / Financial Reports
          </h1>

          <p style={subtitle}>
            销售总额、退款、净营业额、付款方式与经营趋势分析
          </p>

          <p style={subtitle}>
            当前显示货币：
            <strong>
              {" "}
              {currentOption.flag}{" "}
              {currentOption.code}
            </strong>
            {" · "}
            账本基础货币：
            <strong>
              {" "}
              {accountingOption.flag}{" "}
              {accountingCurrency}
            </strong>
          </p>
        </div>

        <div
          className="reports-no-print"
          style={headerActions}
        >
          <button
            type="button"
            onClick={() => void loadReportData()}
            disabled={loading}
            style={secondaryButton}
          >
            {loading
              ? "正在刷新..."
              : "↻ 刷新数据"}
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
          onClick={() => void loadReportData()}
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
          icon="💵"
          label="销售总额"
          english="Gross Sales"
          value={formatMoney(grossSales)}
          accent="#2563eb"
        />

        <ReportCard
          icon="↩️"
          label="退款总额"
          english="Total Refunds"
          value={formatMoney(totalRefunds)}
          accent="#dc2626"
        />

        <ReportCard
          icon="💰"
          label="实际净营业额"
          english="Net Revenue"
          value={formatMoney(netRevenue)}
          accent={
            netRevenue >= 0
              ? "#16a34a"
              : "#dc2626"
          }
        />

        <ReportCard
          icon="📉"
          label="退款率"
          english="Refund Rate"
          value={`${refundRate.toFixed(2)}%`}
          accent="#ea580c"
        />

        <ReportCard
          icon="🧾"
          label="销售订单"
          english="Gross Orders"
          value={`${grossSaleOrders.length} 单`}
          accent="#0891b2"
        />

        <ReportCard
          icon="📄"
          label="退款笔数"
          english="Refund Count"
          value={`${completedRefunds.length} 笔`}
          accent="#7c3aed"
        />

        <ReportCard
          icon="📊"
          label="平均客单价"
          english="Average Order"
          value={formatMoney(
            averageOrderValue
          )}
          accent="#8b5cf6"
        />

        <ReportCard
          icon="🏷️"
          label="折扣金额"
          english="Total Discount"
          value={formatMoney(totalDiscount)}
          accent="#f59e0b"
        />
      </section>

      <section style={periodGrid}>
        <PeriodCard
          icon="📅"
          title="今日经营"
          english="Today"
          financial={todayFinancial}
          accent="#0891b2"
          formatMoney={formatMoney}
        />

        <PeriodCard
          icon="🗓️"
          title="本周经营"
          english="This Week"
          financial={weekFinancial}
          accent="#db2777"
          formatMoney={formatMoney}
        />

        <PeriodCard
          icon="📈"
          title="本月经营"
          english="This Month"
          financial={monthFinancial}
          accent="#ea580c"
          formatMoney={formatMoney}
        />
      </section>

      <section
        className="reports-card"
        style={largeChartCard}
      >
        <div style={sectionHeader}>
          <div>
            <p style={sectionEyebrow}>
              GROSS · REFUNDS · NET
            </p>

            <h2 style={sectionTitle}>
              每日净营业趋势
            </h2>
          </div>

          <div style={sectionTotals}>
            <span style={grossTotalText}>
              销售 {formatMoney(grossSales)}
            </span>

            <span style={refundTotalText}>
              退款 {formatMoney(totalRefunds)}
            </span>

            <strong style={sectionTotal}>
              净额 {formatMoney(netRevenue)}
            </strong>
          </div>
        </div>

        <div style={chartHeight}>
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={dailyFinancial}
              margin={{
                top: 15,
                right: 20,
                left: 5,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient
                  id="grossGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#2563eb"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="#2563eb"
                    stopOpacity={0.02}
                  />
                </linearGradient>

                <linearGradient
                  id="refundGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#dc2626"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="#dc2626"
                    stopOpacity={0.01}
                  />
                </linearGradient>

                <linearGradient
                  id="netGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#16a34a"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="95%"
                    stopColor="#16a34a"
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
                  formatChartMoney(
                    Number(value)
                  )
                }
                tick={{
                  fill: "#64748b",
                  fontSize: 12,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                formatter={(value, name) => [
                  formatMoney(Number(value)),
                  getTrendLabel(String(name)),
                ]}
                labelFormatter={(label) =>
                  `日期：${label}`
                }
              />

              <Legend
                formatter={(value) =>
                  getTrendLabel(String(value))
                }
              />

              <Area
                type="monotone"
                dataKey="grossSales"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#grossGradient)"
                name="grossSales"
              />

              <Area
                type="monotone"
                dataKey="refunds"
                stroke="#dc2626"
                strokeWidth={2}
                fill="url(#refundGradient)"
                name="refunds"
              />

              <Area
                type="monotone"
                dataKey="netRevenue"
                stroke="#16a34a"
                strokeWidth={3}
                fill="url(#netGradient)"
                name="netRevenue"
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
                SALES PAYMENT METHODS
              </p>

              <h2 style={sectionTitle}>
                销售付款方式
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
                    innerRadius={52}
                    outerRadius={92}
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
                      formatMoney(
                        Number(value)
                      )
                    }
                  />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="暂无销售付款数据" />
          )}
        </div>

        <div
          className="reports-card"
          style={chartCard}
        >
          <div style={sectionHeader}>
            <div>
              <p style={sectionEyebrow}>
                REFUND METHODS
              </p>

              <h2 style={sectionTitle}>
                退款方式统计
              </h2>
            </div>
          </div>

          {refundMethodSummary.length > 0 ? (
            <div style={mediumChartHeight}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={refundMethodSummary}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={92}
                    paddingAngle={4}
                  >
                    {refundMethodSummary.map(
                      (_, index) => (
                        <Cell
                          key={index}
                          fill={
                            REFUND_COLORS[
                              index %
                                REFUND_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    formatter={(value) =>
                      formatMoney(
                        Number(value)
                      )
                    }
                  />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="暂无退款方式数据" />
          )}
        </div>

        <div
          className="reports-card"
          style={chartCard}
        >
          <div style={sectionHeader}>
            <div>
              <p style={sectionEyebrow}>
                TOP SALES ITEMS
              </p>

              <h2 style={sectionTitle}>
                热门销售项目（退款前）
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
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#475569",
                      fontSize: 11,
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
            <EmptyState text="暂无销售项目数据" />
          )}
        </div>

        <div
          className="reports-card"
          style={chartCard}
        >
          <div style={sectionHeader}>
            <div>
              <p style={sectionEyebrow}>
                REFUND REASONS
              </p>

              <h2 style={sectionTitle}>
                退款原因分析
              </h2>
            </div>
          </div>

          {refundReasonSummary.length > 0 ? (
            <div style={mediumChartHeight}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={refundReasonSummary}
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
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      formatChartMoney(
                        Number(value)
                      )
                    }
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#475569",
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    formatter={(value) => [
                      formatMoney(
                        Number(value)
                      ),
                      "退款金额",
                    ]}
                  />

                  <Bar
                    dataKey="amount"
                    fill="#dc2626"
                    radius={[0, 8, 8, 0]}
                    name="退款金额"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="暂无退款原因数据" />
          )}
        </div>
      </section>

      <section
        className="reports-card"
        style={operationsCard}
      >
        <div style={operationsGrid}>
          <OperationItem
            label="折扣前金额"
            value={formatMoney(totalSubtotal)}
            accent="#475569"
          />

          <OperationItem
            label="退款产品回库"
            value={`${restockedQuantity} 件`}
            accent="#16a34a"
          />

          <OperationItem
            label="选定日期交易"
            value={`${
              grossSaleOrders.length +
              completedRefunds.length
            } 笔`}
            accent="#2563eb"
          />

          <OperationItem
            label="净额计算公式"
            value="销售总额 - 退款总额"
            accent="#7c3aed"
          />
        </div>
      </section>

      <section
        className="reports-card"
        style={tableCard}
      >
        <div style={sectionHeader}>
          <div>
            <p style={sectionEyebrow}>
              SALES ORDER DETAILS
            </p>

            <h2 style={sectionTitle}>
              销售订单明细
            </h2>
          </div>

          <span style={orderCountBadge}>
            共 {grossSaleOrders.length} 单
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
                <th style={th}>销售总额</th>
                <th style={th}>付款状态</th>
                <th style={th}>订单状态</th>
              </tr>
            </thead>

            <tbody>
              {grossSaleOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={emptyTableCell}
                  >
                    当前日期范围暂无销售订单
                  </td>
                </tr>
              ) : (
                [...grossSaleOrders]
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
                            会员ID：
                            {order.member_id ?? "散客"}
                          </strong>

                          <span>
                            车辆ID：
                            {order.vehicle_id ??
                              "未登记"}
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
                        {formatMoney(
                          toNumber(order.subtotal)
                        )}
                      </td>

                      <td style={td}>
                        {formatMoney(
                          toNumber(order.discount)
                        )}
                      </td>

                      <td style={td}>
                        <strong style={moneyText}>
                          {formatMoney(
                            toNumber(order.total)
                          )}
                        </strong>
                      </td>

                      <td style={td}>
                        <PaymentStatusBadge
                          status={
                            order.payment_status
                          }
                        />
                      </td>

                      <td style={td}>
                        <StatusBadge
                          status={order.status}
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="reports-card"
        style={refundTableCard}
      >
        <div style={sectionHeader}>
          <div>
            <p style={sectionEyebrow}>
              REFUND DETAILS
            </p>

            <h2 style={sectionTitle}>
              退款交易明细
            </h2>
          </div>

          <span style={refundCountBadge}>
            共 {completedRefunds.length} 笔
          </span>
        </div>

        <div style={tableWrapper}>
          <table style={refundTable}>
            <thead>
              <tr>
                <th style={th}>退款编号</th>
                <th style={th}>日期时间</th>
                <th style={th}>原订单 ID</th>
                <th style={th}>退款类型</th>
                <th style={th}>退款方式</th>
                <th style={th}>退款原因</th>
                <th style={th}>退款金额</th>
                <th style={th}>状态</th>
              </tr>
            </thead>

            <tbody>
              {completedRefunds.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={emptyTableCell}
                  >
                    当前日期范围暂无退款记录
                  </td>
                </tr>
              ) : (
                [...completedRefunds]
                  .reverse()
                  .map((refund) => (
                    <tr key={refund.id}>
                      <td style={td}>
                        <strong
                          style={refundNumberText}
                        >
                          {refund.refund_no}
                        </strong>
                      </td>

                      <td style={td}>
                        {formatDateTime(
                          refund.created_at
                        )}
                      </td>

                      <td style={td}>
                        #{refund.order_id}
                      </td>

                      <td style={td}>
                        {getRefundTypeLabel(
                          refund.refund_type
                        )}
                      </td>

                      <td style={td}>
                        {getPaymentLabel(
                          refund.refund_method ||
                            "other"
                        )}
                      </td>

                      <td style={td}>
                        <div style={reasonCell}>
                          <strong>
                            {refund.reason || "—"}
                          </strong>

                          {refund.notes && (
                            <span>
                              {refund.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={td}>
                        <strong
                          style={refundMoneyText}
                        >
                          -
                          {formatMoney(
                            toNumber(
                              refund.refund_amount
                            )
                          )}
                        </strong>
                      </td>

                      <td style={td}>
                        <RefundStatusBadge
                          status={refund.status}
                        />
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
<ProfitAnalytics
  startDate={startDate}
  endDate={endDate}
/>
      <footer style={reportFooter}>
        <span>
          报表日期：{startDate} 至 {endDate}
        </span>

        <span>
          净营业额 = 日期内销售总额 - 日期内已完成退款
        </span>

        <span>
          GTB Auto Detailing & Window Film POS
        </span>
      </footer>
    </main>
  );
}

/* =========================================================
   UI 小组件
========================================================= */

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
        <p style={summaryLabel}>{label}</p>

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

function PeriodCard({
  icon,
  title,
  english,
  financial,
  accent,
  formatMoney,
}: {
  icon: string;
  title: string;
  english: string;
  financial: PeriodFinancial;
  accent: string;
  formatMoney: (
    value: number
  ) => string;
}) {
  return (
    <article
      className="reports-card"
      style={{
        ...periodCard,
        borderLeft: `5px solid ${accent}`,
      }}
    >
      <div style={periodHeader}>
        <div
          style={{
            ...periodIcon,
            background: `${accent}15`,
            color: accent,
          }}
        >
          {icon}
        </div>

        <div>
          <strong style={periodTitle}>
            {title}
          </strong>
          <span style={periodEnglish}>
            {english}
          </span>
        </div>
      </div>

      <strong
        style={{
          ...periodNetValue,
          color:
            financial.netRevenue >= 0
              ? "#15803d"
              : "#dc2626",
        }}
      >
        {formatMoney(financial.netRevenue)}
      </strong>

      <div style={periodMeta}>
        <span>
          销售：
          {formatMoney(financial.grossSales)}
        </span>
        <span>
          退款：
          {formatMoney(financial.refunds)}
        </span>
      </div>
    </article>
  );
}

function OperationItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={operationItem}>
      <span style={operationLabel}>
        {label}
      </span>

      <strong
        style={{
          ...operationValue,
          color: accent,
        }}
      >
        {value}
      </strong>
    </div>
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
    status?.toLowerCase() || "pending";

  const completed =
    normalizedStatus === "completed";

  const cancelled =
    normalizedStatus === "cancelled";

  const refunded =
    normalizedStatus === "refunded";

  return (
    <span
      style={{
        ...statusBadge,
        color: completed
          ? "#15803d"
          : cancelled || refunded
            ? "#b91c1c"
            : "#1d4ed8",
        background: completed
          ? "#dcfce7"
          : cancelled || refunded
            ? "#fee2e2"
            : "#dbeafe",
      }}
    >
      {getOrderStatusLabel(normalizedStatus)}
    </span>
  );
}

function PaymentStatusBadge({
  status,
}: {
  status: string | null;
}) {
  const normalizedStatus =
    status?.toLowerCase() || "unknown";

  const paid = normalizedStatus === "paid";
  const refunded =
    normalizedStatus === "refunded";
  const unpaid = normalizedStatus === "unpaid";

  return (
    <span
      style={{
        ...statusBadge,
        color: paid
          ? "#15803d"
          : refunded
            ? "#b91c1c"
            : unpaid
              ? "#92400e"
              : "#1d4ed8",
        background: paid
          ? "#dcfce7"
          : refunded
            ? "#fee2e2"
            : unpaid
              ? "#fef3c7"
              : "#dbeafe",
      }}
    >
      {getPaymentStatusLabel(status)}
    </span>
  );
}

function RefundStatusBadge({
  status,
}: {
  status: string | null;
}) {
  const normalizedStatus =
    status?.toLowerCase() || "pending";

  const completed =
    normalizedStatus === "completed";

  const failed = normalizedStatus === "failed";

  return (
    <span
      style={{
        ...statusBadge,
        color: completed
          ? "#15803d"
          : failed
            ? "#b91c1c"
            : "#92400e",
        background: completed
          ? "#dcfce7"
          : failed
            ? "#fee2e2"
            : "#fef3c7",
      }}
    >
      {getRefundStatusLabel(status)}
    </span>
  );
}

/* =========================================================
   财务计算函数
========================================================= */

function isGrossSaleOrder(order: Order) {
  const orderStatus =
    order.status?.toLowerCase() || "";

  const paymentStatus =
    order.payment_status?.toLowerCase() || "";

  return (
    orderStatus !== "cancelled" &&
    paymentStatus !== "unpaid"
  );
}

function isCompletedRefund(refund: Refund) {
  return (
    refund.status?.toLowerCase() ===
    "completed"
  );
}

function calculateFinancialBetween(
  sourceOrders: Order[],
  sourceRefunds: Refund[],
  start: Date,
  end: Date
): PeriodFinancial {
  const grossSales = sourceOrders
    .filter((order) => {
      if (!isGrossSaleOrder(order)) {
        return false;
      }

      const orderDate = new Date(
        order.created_at
      );

      return orderDate >= start && orderDate < end;
    })
    .reduce(
      (sum, order) =>
        sum + toNumber(order.total),
      0
    );

  const refunds = sourceRefunds
    .filter((refund) => {
      if (!isCompletedRefund(refund)) {
        return false;
      }

      const refundDate = new Date(
        refund.created_at
      );

      return (
        refundDate >= start && refundDate < end
      );
    })
    .reduce(
      (sum, refund) =>
        sum + toNumber(refund.refund_amount),
      0
    );

  return {
    grossSales,
    refunds,
    netRevenue: grossSales - refunds,
  };
}

/* =========================================================
   格式化工具
========================================================= */

function getMondayStart(date: Date) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;

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
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCompactCurrency(
  value: number,
  currency: CurrencyCode
) {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  const sign =
    safeValue < 0 ? "-" : "";

  const absoluteValue =
    Math.abs(safeValue);

  const formatted =
    new Intl.NumberFormat(
      "en-US",
      {
        notation: "compact",
        maximumFractionDigits: 1,
      }
    ).format(absoluteValue);

  if (currency === "MMK") {
    return `${sign}Ks ${formatted}`;
  }

  const symbol =
    currency === "CNY"
      ? "¥"
      : "$";

  return `${sign}${symbol}${formatted}`;
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
    bank_transfer: "银行转账 / Transfer",
    kbzpay: "KBZPay",
    wavepay: "WavePay",
    mobile: "电子钱包 / Mobile Pay",
    e_wallet: "电子钱包 / E-Wallet",
    original_payment: "原付款方式",
    other: "其他 / Other",
  };

  return (
    labels[method.toLowerCase()] ?? method
  );
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

  return labels[status || ""] ?? status ?? "—";
}

function getOrderStatusLabel(
  status: string | null
) {
  const labels: Record<string, string> = {
    pending: "待处理",
    in_progress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
    refunded: "已退款",
  };

  return labels[status || ""] ?? status ?? "—";
}

function getRefundStatusLabel(
  status: string | null
) {
  const labels: Record<string, string> = {
    pending: "待处理",
    processing: "处理中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };

  return labels[status || ""] ?? status ?? "—";
}

function getRefundTypeLabel(type: string) {
  const labels: Record<string, string> = {
    full: "整单退款",
    partial: "部分退款",
  };

  return labels[type || ""] ?? type ?? "退款";
}

function getTrendLabel(value: string) {
  const labels: Record<string, string> = {
    grossSales: "销售总额",
    refunds: "退款总额",
    netRevenue: "净营业额",
  };

  return labels[value] ?? value;
}

/* =========================================================
   页面样式
========================================================= */

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "30px",
  background:
    "linear-gradient(135deg,#f8fafc 0%,#eff6ff 100%)",
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

const periodGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(260px,1fr))",
  gap: 16,
  marginBottom: 20,
};

const periodCard: CSSProperties = {
  padding: 20,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const periodHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 15,
};

const periodIcon: CSSProperties = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  borderRadius: 12,
  fontSize: 20,
};

const periodTitle: CSSProperties = {
  display: "block",
  fontSize: 15,
};

const periodEnglish: CSSProperties = {
  display: "block",
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
};

const periodNetValue: CSSProperties = {
  display: "block",
  marginBottom: 12,
  fontSize: 27,
};

const periodMeta: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 8,
  color: "#64748b",
  fontSize: 12,
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
  flexWrap: "wrap",
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

const sectionTotals: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12,
};

const grossTotalText: CSSProperties = {
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 800,
};

const refundTotalText: CSSProperties = {
  color: "#dc2626",
  fontSize: 12,
  fontWeight: 800,
};

const sectionTotal: CSSProperties = {
  color: "#16a34a",
  fontSize: 18,
};

const chartHeight: CSSProperties = {
  width: "100%",
  height: 350,
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

const operationsCard: CSSProperties = {
  marginBottom: 20,
  padding: 20,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const operationsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 12,
};

const operationItem: CSSProperties = {
  padding: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  background: "#f8fafc",
};

const operationLabel: CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
};

const operationValue: CSSProperties = {
  display: "block",
  fontSize: 17,
};

const tableCard: CSSProperties = {
  marginBottom: 20,
  padding: 22,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const refundTableCard: CSSProperties = {
  ...tableCard,
  borderTop: "4px solid #dc2626",
};

const orderCountBadge: CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 800,
};

const refundCountBadge: CSSProperties = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#fef2f2",
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 800,
};

const tableWrapper: CSSProperties = {
  width: "100%",
  overflowX: "auto",
};

const table: CSSProperties = {
  width: "100%",
  minWidth: 1120,
  borderCollapse: "collapse",
};

const refundTable: CSSProperties = {
  width: "100%",
  minWidth: 1050,
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

const reasonCell: CSSProperties = {
  display: "flex",
  maxWidth: 260,
  flexDirection: "column",
  gap: 4,
};

const moneyText: CSSProperties = {
  color: "#15803d",
};

const refundMoneyText: CSSProperties = {
  color: "#dc2626",
};

const refundNumberText: CSSProperties = {
  color: "#b91c1c",
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