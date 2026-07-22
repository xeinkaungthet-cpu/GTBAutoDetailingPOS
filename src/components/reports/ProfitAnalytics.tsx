import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "../../lib/supabase";
import useCurrency from "../../hooks/useCurrency";
import type { CurrencyCode } from "../../services/currencyService";

type ProfitAnalyticsProps = {
  startDate: string;
  endDate: string;
  refreshKey?: number;
};

type LedgerRow = {
  transaction_type: string;
  transaction_at: string;

  order_id: number | null;
  order_no: string | null;

  refund_id: number | null;
  refund_no: string | null;

  order_item_id: number | null;

  item_type: string;
  item_name: string;

  service_id: number | null;
  package_id: number | null;
  product_id: number | null;

  quantity: number | string;
  unit_price: number | string;
  cost_price: number | string;

  revenue: number | string;
  cost: number | string;
  profit: number | string;

  margin_percent: number | string | null;

  restock: boolean | null;
  status: string | null;
  payment_status: string | null;
};

type DailyProfit = {
  date: string;
  displayDate: string;
  netRevenue: number;
  netCost: number;
  grossProfit: number;
};

type ItemProfitSummary = {
  key: string;
  itemType: string;
  itemName: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  zeroCost: boolean;
};

const PAGE_SIZE = 1000;
const LOW_MARGIN_THRESHOLD = 30;

function ProfitAnalytics({
  startDate,
  endDate,
  refreshKey = 0,
}: ProfitAnalyticsProps) {
  const {
    formatMoney,
    convertToDisplay,
    displayCurrency,
    accountingCurrency,
    currentOption,
    accountingOption,
  } = useCurrency();

  const [rows, setRows] = useState<LedgerRow[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    void loadProfitLedger();
  }, [startDate, endDate, refreshKey]);

  async function loadProfitLedger() {
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
          "利润报表的开始日期不能晚于结束日期"
        );
      }

      const loadedRows: LedgerRow[] = [];

      let from = 0;

      while (true) {
        const {
          data,
          error: queryError,
        } = await supabase
          .from("report_profit_ledger")
          .select(
            `
            transaction_type,
            transaction_at,
            order_id,
            order_no,
            refund_id,
            refund_no,
            order_item_id,
            item_type,
            item_name,
            service_id,
            package_id,
            product_id,
            quantity,
            unit_price,
            cost_price,
            revenue,
            cost,
            profit,
            margin_percent,
            restock,
            status,
            payment_status
          `
          )
          .gte(
            "transaction_at",
            rangeStart.toISOString()
          )
          .lt(
            "transaction_at",
            rangeEnd.toISOString()
          )
          .order("transaction_at", {
            ascending: true,
          })
          .range(
            from,
            from + PAGE_SIZE - 1
          );

        if (queryError) {
          throw queryError;
        }

        const page =
          (data ?? []) as LedgerRow[];

        loadedRows.push(...page);

        if (page.length < PAGE_SIZE) {
          break;
        }

        from += PAGE_SIZE;
      }

      setRows(loadedRows);
    } catch (loadError: unknown) {
      console.error(
        "Failed to load profit ledger:",
        loadError
      );

      setRows([]);

      setError(
        getErrorMessage(loadError)
      );
    } finally {
      setLoading(false);
    }
  }

  const saleRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.transaction_type === "sale"
      ),
    [rows]
  );

  const refundRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.transaction_type === "refund"
      ),
    [rows]
  );

  const grossSales = useMemo(
    () =>
      saleRows.reduce(
        (sum, row) =>
          sum + toNumber(row.revenue),
        0
      ),
    [saleRows]
  );

  const totalRefunds = useMemo(
    () =>
      Math.abs(
        refundRows.reduce(
          (sum, row) =>
            sum + toNumber(row.revenue),
          0
        )
      ),
    [refundRows]
  );

  const netRevenue = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          sum + toNumber(row.revenue),
        0
      ),
    [rows]
  );

  const salesCost = useMemo(
    () =>
      saleRows.reduce(
        (sum, row) =>
          sum + toNumber(row.cost),
        0
      ),
    [saleRows]
  );

  const refundCostReversal = useMemo(
    () =>
      Math.abs(
        refundRows.reduce(
          (sum, row) =>
            sum + toNumber(row.cost),
          0
        )
      ),
    [refundRows]
  );

  const netCost = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          sum + toNumber(row.cost),
        0
      ),
    [rows]
  );

  const grossProfit = useMemo(
    () =>
      rows.reduce(
        (sum, row) =>
          sum + toNumber(row.profit),
        0
      ),
    [rows]
  );

  const grossMargin =
    netRevenue > 0
      ? (grossProfit / netRevenue) * 100
      : 0;

  const eligibleCostRows = useMemo(
    () =>
      saleRows.filter(
        (row) =>
          isCatalogItemType(
            row.item_type
          ) &&
          toNumber(row.revenue) > 0
      ),
    [saleRows]
  );

  const zeroCostRows = useMemo(
    () =>
      eligibleCostRows.filter(
        (row) =>
          toNumber(row.cost_price) <= 0
      ),
    [eligibleCostRows]
  );

  const costCoverage =
    eligibleCostRows.length > 0
      ? ((eligibleCostRows.length -
          zeroCostRows.length) /
          eligibleCostRows.length) *
        100
      : 100;

  const itemSummaries = useMemo(() => {
    const map = new Map<
      string,
      ItemProfitSummary
    >();

    rows.forEach((row) => {
      if (
        !isCatalogItemType(
          row.item_type
        )
      ) {
        return;
      }

      const itemName =
        row.item_name ||
        "未命名项目";

      const key =
        `${row.item_type}:${itemName}`;

      const direction =
        row.transaction_type === "refund"
          ? -1
          : 1;

      const current =
        map.get(key) ?? {
          key,
          itemType: row.item_type,
          itemName,
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          zeroCost: false,
        };

      current.quantity +=
        direction *
        toNumber(row.quantity);

      current.revenue +=
        toNumber(row.revenue);

      current.cost +=
        toNumber(row.cost);

      current.profit +=
        toNumber(row.profit);

      if (
        row.transaction_type === "sale" &&
        toNumber(row.revenue) > 0 &&
        toNumber(row.cost_price) <= 0
      ) {
        current.zeroCost = true;
      }

      map.set(key, current);
    });

    return Array.from(
      map.values()
    )
      .map((item) => ({
        ...item,

        margin:
          item.revenue > 0
            ? (item.profit /
                item.revenue) *
              100
            : 0,
      }))
      .sort(
        (a, b) =>
          b.profit - a.profit
      );
  }, [rows]);

  const serviceRanking = useMemo(
    () =>
      itemSummaries
        .filter(
          (item) =>
            item.itemType ===
            "service"
        )
        .slice(0, 8),
    [itemSummaries]
  );

  const packageRanking = useMemo(
    () =>
      itemSummaries
        .filter(
          (item) =>
            item.itemType ===
            "package"
        )
        .slice(0, 8),
    [itemSummaries]
  );

  const productRanking = useMemo(
    () =>
      itemSummaries
        .filter(
          (item) =>
            item.itemType ===
            "product"
        )
        .slice(0, 8),
    [itemSummaries]
  );

  const lowMarginItems = useMemo(
    () =>
      itemSummaries
        .filter(
          (item) =>
            item.revenue > 0 &&
            (
              item.profit < 0 ||
              item.margin <
                LOW_MARGIN_THRESHOLD ||
              item.zeroCost
            )
        )
        .sort((a, b) => {
          if (
            a.profit < 0 &&
            b.profit >= 0
          ) {
            return -1;
          }

          if (
            a.profit >= 0 &&
            b.profit < 0
          ) {
            return 1;
          }

          if (
            a.zeroCost &&
            !b.zeroCost
          ) {
            return -1;
          }

          if (
            !a.zeroCost &&
            b.zeroCost
          ) {
            return 1;
          }

          return (
            a.margin - b.margin
          );
        }),
    [itemSummaries]
  );

  const dailyProfit = useMemo(() => {
    const rangeStart =
      parseInputDate(startDate);

    const rangeEnd = addDays(
      parseInputDate(endDate),
      1
    );

    const map = new Map<
      string,
      DailyProfit
    >();

    const cursor =
      new Date(rangeStart);

    while (cursor < rangeEnd) {
      const date =
        toInputDate(cursor);

      map.set(date, {
        date,

        displayDate:
          `${cursor.getMonth() + 1}/${cursor.getDate()}`,

        netRevenue: 0,
        netCost: 0,
        grossProfit: 0,
      });

      cursor.setDate(
        cursor.getDate() + 1
      );
    }

    rows.forEach((row) => {
      const date = toInputDate(
        new Date(
          row.transaction_at
        )
      );

      const current =
        map.get(date);

      if (!current) {
        return;
      }

      current.netRevenue +=
        toNumber(row.revenue);

      current.netCost +=
        toNumber(row.cost);

      current.grossProfit +=
        toNumber(row.profit);
    });

    return Array.from(
      map.values()
    );
  }, [
    rows,
    startDate,
    endDate,
  ]);

  const latestRows = useMemo(
    () =>
      [...rows]
        .reverse()
        .slice(0, 100),
    [rows]
  );

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

  function exportProfitCSV() {
    if (rows.length === 0) {
      alert(
        "当前日期范围没有利润流水数据"
      );

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
      ["GTB 真实利润报表"],
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
        "销售成本",
        exportMoney(salesCost),
      ],

      [
        "退款成本冲回",
        exportMoney(refundCostReversal),
      ],

      [
        "净销售成本",
        exportMoney(netCost),
      ],

      [
        "真实毛利润",
        exportMoney(grossProfit),
      ],

      [
        "真实毛利率",
        `${grossMargin.toFixed(2)}%`,
      ],

      [
        "成本完整度",
        `${costCoverage.toFixed(2)}%`,
      ],

      [],
    ];

    const headers = [
      "交易类型",
      "交易时间",
      "订单编号",
      "退款编号",
      "项目类型",
      "项目名称",
      "数量",
      `单价 (${displayCurrency})`,
      `成本单价 (${displayCurrency})`,
      `收入影响 (${displayCurrency})`,
      `成本影响 (${displayCurrency})`,
      `利润影响 (${displayCurrency})`,
      "毛利率",
    ];

    const detailRows =
      rows.map((row) => [
        getTransactionLabel(
          row.transaction_type
        ),

        formatDateTime(
          row.transaction_at
        ),

        row.order_no ?? "",
        row.refund_no ?? "",

        getItemTypeLabel(
          row.item_type
        ),

        row.item_name,

        toNumber(
          row.quantity
        ).toFixed(2),

        exportMoney(
          toNumber(row.unit_price)
        ),

        exportMoney(
          toNumber(row.cost_price)
        ),

        exportMoney(
          toNumber(row.revenue)
        ),

        exportMoney(
          toNumber(row.cost)
        ),

        exportMoney(
          toNumber(row.profit)
        ),

        row.margin_percent === null
          ? ""
          : `${toNumber(
              row.margin_percent
            ).toFixed(2)}%`,
      ]);

    const content = [
      ...summaryRows,
      headers,
      ...detailRows,
    ]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value ?? ""
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\ufeff" + content],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `GTB-Profit-Report-${displayCurrency}-${startDate}-${endDate}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  }

  return (
    <section className="profit-analytics">
      <style>
        {`
          .profit-analytics {
            margin-top: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            color: #0f172a;
          }

          .profit-header,
          .profit-card,
          .profit-summary-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 30px rgba(15, 23, 42, .05);
          }

          .profit-header {
            padding: 22px;
            border-radius: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 18px;
            background:
              linear-gradient(
                135deg,
                #eff6ff 0%,
                #ffffff 55%,
                #ecfdf5 100%
              );
          }

          .profit-eyebrow {
            margin: 0 0 6px;
            color: #2563eb;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 1.4px;
          }

          .profit-title {
            margin: 0;
            font-size: 25px;
          }

          .profit-subtitle {
            margin: 8px 0 0;
            color: #64748b;
            font-size: 13px;
          }

          .profit-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
          }

          .profit-button {
            min-height: 42px;
            padding: 0 15px;
            border-radius: 11px;
            cursor: pointer;
            font-weight: 850;
          }

          .profit-refresh-button {
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #334155;
          }

          .profit-export-button {
            border: none;
            background: #16a34a;
            color: #ffffff;
          }

          .profit-error {
            padding: 15px;
            border: 1px solid #fecaca;
            border-radius: 14px;
            background: #fef2f2;
            color: #b91c1c;
          }

          .profit-warning {
            padding: 16px;
            border: 1px solid #fcd34d;
            border-radius: 15px;
            background: #fffbeb;
            color: #92400e;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 15px;
          }

          .profit-warning p {
            max-width: 850px;
            margin: 6px 0 0;
            font-size: 12px;
            line-height: 1.6;
          }

          .profit-warning-badge {
            padding: 7px 11px;
            border-radius: 999px;
            background: #fef3c7;
            font-size: 11px;
            font-weight: 900;
          }

          .profit-summary-grid {
            display: grid;
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .profit-summary-card {
            min-height: 120px;
            padding: 17px;
            border-radius: 17px;
            display: flex;
            align-items: flex-start;
            gap: 13px;
          }

          .profit-summary-icon {
            width: 43px;
            height: 43px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border-radius: 13px;
            font-size: 20px;
            font-weight: 900;
          }

          .profit-summary-label {
            margin: 0;
            color: #334155;
            font-size: 12px;
            font-weight: 850;
          }

          .profit-summary-english {
            margin: 3px 0 9px;
            color: #94a3b8;
            font-size: 9px;
            font-weight: 750;
            text-transform: uppercase;
          }

          .profit-summary-value {
            font-size: 22px;
          }

          .profit-chart-grid {
            display: grid;
            grid-template-columns:
              minmax(0, 1.45fr)
              minmax(320px, .8fr);
            gap: 18px;
          }

          .profit-ranking-grid {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 18px;
          }

          .profit-card {
            min-width: 0;
            padding: 21px;
            border-radius: 20px;
          }

          .profit-card-header {
            margin-bottom: 17px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          }

          .profit-card-eyebrow {
            margin: 0 0 4px;
            color: #64748b;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1.1px;
          }

          .profit-card-title {
            margin: 0;
            font-size: 19px;
          }

          .profit-large-chart {
            width: 100%;
            height: 350px;
          }

          .profit-ranking-chart {
            width: 100%;
            height: 235px;
          }

          .profit-coverage-panel {
            padding: 19px;
            text-align: center;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            background: #f8fafc;
          }

          .profit-coverage-value {
            display: block;
            font-size: 42px;
            line-height: 1;
          }

          .profit-coverage-label {
            display: block;
            margin-top: 7px;
            color: #64748b;
            font-size: 10px;
            font-weight: 750;
          }

          .profit-progress-track {
            height: 9px;
            margin-top: 17px;
            overflow: hidden;
            border-radius: 999px;
            background: #e2e8f0;
          }

          .profit-progress-value {
            height: 100%;
            border-radius: 999px;
          }

          .profit-metric-list {
            margin-top: 15px;
          }

          .profit-metric-row {
            padding: 10px 2px;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            gap: 15px;
            color: #475569;
            font-size: 12px;
          }

          .profit-formula {
            margin-top: 15px;
            padding: 14px;
            border: 1px solid #bbf7d0;
            border-radius: 13px;
            background: #f0fdf4;
            color: #166534;
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 12px;
          }

          .profit-ranking-list {
            margin-top: 10px;
          }

          .profit-ranking-row {
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .profit-rank-number {
            width: 27px;
            height: 27px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 900;
          }

          .profit-ranking-name {
            min-width: 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 3px;
            color: #334155;
            font-size: 12px;
          }

          .profit-ranking-name small {
            color: #64748b;
          }

          .profit-table-wrapper {
            width: 100%;
            overflow-x: auto;
          }

          .profit-table {
            width: 100%;
            min-width: 980px;
            border-collapse: collapse;
          }

          .profit-table th {
            padding: 12px 11px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
            color: #64748b;
            text-align: left;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .profit-table td {
            padding: 13px 11px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            font-size: 12px;
            vertical-align: middle;
          }

          .profit-empty {
            padding: 42px !important;
            color: #94a3b8 !important;
            text-align: center;
          }

          .profit-badge {
            display: inline-flex;
            padding: 6px 9px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 850;
            white-space: nowrap;
          }

          .profit-reference {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .profit-reference span {
            color: #94a3b8;
            font-size: 10px;
          }

          @media (max-width: 1250px) {
            .profit-summary-grid {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }

            .profit-chart-grid,
            .profit-ranking-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .profit-summary-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <header className="profit-header">
        <div>
          <p className="profit-eyebrow">
            REAL PROFIT ANALYTICS
          </p>

          <h2 className="profit-title">
            真实利润分析 / Profit Analytics
          </h2>

          <p className="profit-subtitle">
            根据成交成本快照、退款金额和退款成本冲回计算真实利润
          </p>

          <p className="profit-subtitle">
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

        <div className="profit-actions">
          <button
            type="button"
            onClick={() =>
              void loadProfitLedger()
            }
            disabled={loading}
            className="profit-button profit-refresh-button"
            style={{
              opacity: loading
                ? 0.65
                : 1,
            }}
          >
            {loading
              ? "载入中..."
              : "↻ 刷新利润"}
          </button>

          <button
            type="button"
            onClick={exportProfitCSV}
            className="profit-button profit-export-button"
          >
            ↓ 导出利润 CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="profit-error">
          <strong>
            利润分析加载失败
          </strong>

          <div>{error}</div>
        </div>
      )}

      {zeroCostRows.length > 0 && (
        <div className="profit-warning">
          <div>
            <strong>
              ⚠ 检测到成本为 0 的销售项目
            </strong>

            <p>
              当前日期范围共有{" "}
              {zeroCostRows.length}{" "}
              条销售项目成本为 0。
              这通常来自成本快照升级前的历史订单，
              历史毛利润可能偏高；升级后的新订单不受影响。
            </p>
          </div>

          <span className="profit-warning-badge">
            成本完整度{" "}
            {formatPercent(
              costCoverage
            )}
          </span>
        </div>
      )}

      <div className="profit-summary-grid">
        <ProfitCard
          icon="💰"
          label="净营业额"
          english="Net Revenue"
          value={formatMoney(
            netRevenue
          )}
          accent="#2563eb"
        />

        <ProfitCard
          icon="📦"
          label="净销售成本"
          english="Net COGS"
          value={formatMoney(
            netCost
          )}
          accent="#7c3aed"
        />

        <ProfitCard
          icon="📈"
          label="真实毛利润"
          english="Gross Profit"
          value={formatMoney(
            grossProfit
          )}
          accent={
            grossProfit >= 0
              ? "#16a34a"
              : "#dc2626"
          }
        />

        <ProfitCard
          icon="％"
          label="真实毛利率"
          english="Gross Margin"
          value={formatPercent(
            grossMargin
          )}
          accent={getMarginColor(
            grossMargin,
            grossProfit
          )}
        />

        <ProfitCard
          icon="🧾"
          label="销售总额"
          english="Gross Sales"
          value={formatMoney(
            grossSales
          )}
          accent="#0891b2"
        />

        <ProfitCard
          icon="↩️"
          label="退款总额"
          english="Total Refunds"
          value={formatMoney(
            totalRefunds
          )}
          accent="#dc2626"
        />

        <ProfitCard
          icon="🏭"
          label="销售成本"
          english="Sales COGS"
          value={formatMoney(
            salesCost
          )}
          accent="#ea580c"
        />

        <ProfitCard
          icon="♻️"
          label="退款成本冲回"
          english="Refund Cost Reversal"
          value={formatMoney(
            refundCostReversal
          )}
          accent="#059669"
        />
      </div>

      <div className="profit-chart-grid">
        <article className="profit-card">
          <div className="profit-card-header">
            <div>
              <p className="profit-card-eyebrow">
                REVENUE · COST · PROFIT
              </p>

              <h3 className="profit-card-title">
                每日真实利润趋势
              </h3>
            </div>

            <strong
              style={{
                color:
                  grossProfit >= 0
                    ? "#15803d"
                    : "#dc2626",

                fontSize: 19,
              }}
            >
              {formatMoney(
                grossProfit
              )}
            </strong>
          </div>

          <div className="profit-large-chart">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={dailyProfit}
                margin={{
                  top: 15,
                  right: 20,
                  left: 5,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                  tickFormatter={(
                    value
                  ) =>
                      formatChartMoney(
                        Number(value)
                      )}
                />

                <Tooltip
                  formatter={(
                    value,
                    name
                  ) => [
                    formatMoney(
                      Number(value)
                    ),

                    getProfitTrendLabel(
                      String(name)
                    ),
                  ]}
                />

                <Legend
                  formatter={(value) =>
                    getProfitTrendLabel(
                      String(value)
                    )
                  }
                />

                <Area
                  type="monotone"
                  dataKey="netRevenue"
                  name="netRevenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="#dbeafe"
                />

                <Area
                  type="monotone"
                  dataKey="netCost"
                  name="netCost"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="#ede9fe"
                />

                <Area
                  type="monotone"
                  dataKey="grossProfit"
                  name="grossProfit"
                  stroke="#16a34a"
                  strokeWidth={3}
                  fill="#dcfce7"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="profit-card">
          <div className="profit-card-header">
            <div>
              <p className="profit-card-eyebrow">
                COST QUALITY CONTROL
              </p>

              <h3 className="profit-card-title">
                成本资料完整度
              </h3>
            </div>
          </div>

          <div className="profit-coverage-panel">
            <strong
              className="profit-coverage-value"
              style={{
                color:
                  costCoverage >= 95
                    ? "#15803d"
                    : costCoverage >= 70
                      ? "#d97706"
                      : "#dc2626",
              }}
            >
              {formatPercent(
                costCoverage
              )}
            </strong>

            <span className="profit-coverage-label">
              Cost Snapshot Coverage
            </span>

            <div className="profit-progress-track">
              <div
                className="profit-progress-value"
                style={{
                  width:
                    `${Math.min(
                      Math.max(
                        costCoverage,
                        0
                      ),
                      100
                    )}%`,

                  background:
                    costCoverage >= 95
                      ? "#16a34a"
                      : costCoverage >= 70
                        ? "#f59e0b"
                        : "#dc2626",
                }}
              />
            </div>
          </div>

          <div className="profit-metric-list">
            <MetricRow
              label="可计算成本的销售项目"
              value={`${eligibleCostRows.length} 条`}
            />

            <MetricRow
              label="成本大于 0"
              value={
                `${
                  eligibleCostRows.length -
                  zeroCostRows.length
                } 条`
              }
              color="#15803d"
            />

            <MetricRow
              label="成本为 0"
              value={`${zeroCostRows.length} 条`}
              color={
                zeroCostRows.length > 0
                  ? "#dc2626"
                  : "#15803d"
              }
            />

            <MetricRow
              label="利润流水总行数"
              value={`${rows.length} 条`}
            />
          </div>

          <div className="profit-formula">
            <strong>
              真实毛利润公式
            </strong>

            <span>
              净营业额 − 净销售成本
            </span>

            <small>
              {formatMoney(
                netRevenue
              )}{" "}
              −{" "}
              {formatMoney(
                netCost
              )}{" "}
              ={" "}
              {formatMoney(
                grossProfit
              )}
            </small>
          </div>
        </article>
      </div>

      <div className="profit-ranking-grid">
        <RankingCard
          icon="🔧"
          title="服务利润排行"
          english="SERVICE PROFIT RANKING"
          data={serviceRanking}
          accent="#2563eb"
          formatMoney={formatMoney}
          formatChartMoney={
            formatChartMoney
          }
        />

        <RankingCard
          icon="🎁"
          title="套餐利润排行"
          english="PACKAGE PROFIT RANKING"
          data={packageRanking}
          accent="#7c3aed"
          formatMoney={formatMoney}
          formatChartMoney={
            formatChartMoney
          }
        />

        <RankingCard
          icon="🧴"
          title="产品利润排行"
          english="PRODUCT PROFIT RANKING"
          data={productRanking}
          accent="#059669"
          formatMoney={formatMoney}
          formatChartMoney={
            formatChartMoney
          }
        />
      </div>

      <article className="profit-card">
        <div className="profit-card-header">
          <div>
            <p className="profit-card-eyebrow">
              LOW MARGIN CONTROL
            </p>

            <h3 className="profit-card-title">
              低毛利与成本异常提醒
            </h3>
          </div>

          <span
            className="profit-badge"
            style={{
              color: "#92400e",
              background: "#fef3c7",
            }}
          >
            {lowMarginItems.length} 项
          </span>
        </div>

        <div className="profit-table-wrapper">
          <table className="profit-table">
            <thead>
              <tr>
                <th>项目类型</th>
                <th>项目名称</th>
                <th>净数量</th>
                <th>净收入</th>
                <th>净成本</th>
                <th>真实利润</th>
                <th>毛利率</th>
                <th>状态</th>
              </tr>
            </thead>

            <tbody>
              {lowMarginItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="profit-empty"
                  >
                    当前日期范围没有低毛利或成本异常项目
                  </td>
                </tr>
              ) : (
                lowMarginItems.map(
                  (item) => (
                    <tr key={item.key}>
                      <td>
                        {getItemTypeLabel(
                          item.itemType
                        )}
                      </td>

                      <td>
                        <strong>
                          {item.itemName}
                        </strong>
                      </td>

                      <td>
                        {formatQuantity(
                          item.quantity
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          item.revenue
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          item.cost
                        )}
                      </td>

                      <td>
                        <strong
                          style={{
                            color:
                              item.profit >= 0
                                ? "#15803d"
                                : "#dc2626",
                          }}
                        >
                          {formatMoney(
                            item.profit
                          )}
                        </strong>
                      </td>

                      <td>
                        {formatPercent(
                          item.margin
                        )}
                      </td>

                      <td>
                        <MarginBadge
                          item={item}
                        />
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="profit-card">
        <div className="profit-card-header">
          <div>
            <p className="profit-card-eyebrow">
              PROFIT LEDGER DETAILS
            </p>

            <h3 className="profit-card-title">
              利润流水明细
            </h3>
          </div>

          <span
            className="profit-badge"
            style={{
              color: "#1d4ed8",
              background: "#eff6ff",
            }}
          >
            显示最近{" "}
            {latestRows.length} /{" "}
            {rows.length} 条
          </span>
        </div>

        <div className="profit-table-wrapper">
          <table
            className="profit-table"
            style={{
              minWidth: 1380,
            }}
          >
            <thead>
              <tr>
                <th>交易时间</th>
                <th>类型</th>
                <th>订单 / 退款编号</th>
                <th>项目</th>
                <th>数量</th>
                <th>单价</th>
                <th>成本单价</th>
                <th>收入影响</th>
                <th>成本影响</th>
                <th>利润影响</th>
                <th>毛利率</th>
              </tr>
            </thead>

            <tbody>
              {latestRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="profit-empty"
                  >
                    当前日期范围暂无利润流水
                  </td>
                </tr>
              ) : (
                latestRows.map(
                  (row, index) => (
                    <tr
                      key={
                        `${row.transaction_type}-` +
                        `${row.refund_id ?? 0}-` +
                        `${row.order_item_id ?? 0}-` +
                        index
                      }
                    >
                      <td>
                        {formatDateTime(
                          row.transaction_at
                        )}
                      </td>

                      <td>
                        <TransactionBadge
                          type={
                            row.transaction_type
                          }
                        />
                      </td>

                      <td>
                        <div className="profit-reference">
                          <strong>
                            {row.order_no ||
                              `订单 #${row.order_id}`}
                          </strong>

                          {row.refund_no && (
                            <span>
                              {row.refund_no}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="profit-reference">
                          <strong>
                            {row.item_name}
                          </strong>

                          <span>
                            {getItemTypeLabel(
                              row.item_type
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        {formatQuantity(
                          toNumber(
                            row.quantity
                          )
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          toNumber(
                            row.unit_price
                          )
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          toNumber(
                            row.cost_price
                          )
                        )}
                      </td>

                      <td>
                        <SignedMoney
                          value={toNumber(
                            row.revenue
                          )}
                          formatMoney={
                            formatMoney
                          }
                        />
                      </td>

                      <td>
                        <SignedMoney
                          value={toNumber(
                            row.cost
                          )}
                          formatMoney={
                            formatMoney
                          }
                        />
                      </td>

                      <td>
                        <SignedMoney
                          value={toNumber(
                            row.profit
                          )}
                          formatMoney={
                            formatMoney
                          }
                          strong
                        />
                      </td>

                      <td>
                        {row.margin_percent ===
                        null
                          ? "—"
                          : formatPercent(
                              toNumber(
                                row.margin_percent
                              )
                            )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function ProfitCard({
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
      className="profit-summary-card"
      style={{
        borderTop:
          `4px solid ${accent}`,
      }}
    >
      <span
        className="profit-summary-icon"
        style={{
          color: accent,
          background: `${accent}15`,
        }}
      >
        {icon}
      </span>

      <div>
        <p className="profit-summary-label">
          {label}
        </p>

        <p className="profit-summary-english">
          {english}
        </p>

        <strong className="profit-summary-value">
          {value}
        </strong>
      </div>
    </article>
  );
}

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="profit-metric-row">
      <span>{label}</span>

      <strong
        style={{
          color: color ?? "#0f172a",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function RankingCard({
  icon,
  title,
  english,
  data,
  accent,
  formatMoney,
  formatChartMoney,
}: {
  icon: string;
  title: string;
  english: string;
  data: ItemProfitSummary[];
  accent: string;
  formatMoney: (
    value: number
  ) => string;
  formatChartMoney: (
    value: number
  ) => string;
}) {
  return (
    <article className="profit-card">
      <div className="profit-card-header">
        <div>
          <p className="profit-card-eyebrow">
            {english}
          </p>

          <h3 className="profit-card-title">
            {icon} {title}
          </h3>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="profit-empty">
          暂无利润排行数据
        </div>
      ) : (
        <>
          <div className="profit-ranking-chart">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={data.slice(0, 6)}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 15,
                  left: 10,
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
                  tick={{
                    fill: "#64748b",
                    fontSize: 10,
                  }}
                  tickFormatter={(
                    value
                  ) =>
                      formatChartMoney(
                        Number(value)
                      )}
                />

                <YAxis
                  type="category"
                  dataKey="itemName"
                  width={105}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#475569",
                    fontSize: 10,
                  }}
                />

                <Tooltip
                  formatter={(value) => [
                    formatMoney(
                      Number(value)
                    ),
                    "真实利润",
                  ]}
                />

                <Bar
                  dataKey="profit"
                  fill={accent}
                  radius={[
                    0,
                    7,
                    7,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="profit-ranking-list">
            {data.map(
              (item, index) => (
                <div
                  key={item.key}
                  className="profit-ranking-row"
                >
                  <span
                    className="profit-rank-number"
                    style={{
                      color: accent,
                      background:
                        `${accent}12`,
                    }}
                  >
                    {index + 1}
                  </span>

                  <div className="profit-ranking-name">
                    <strong>
                      {item.itemName}
                    </strong>

                    <small>
                      收入{" "}
                      {formatMoney(
                        item.revenue
                      )}{" "}
                      · 毛利率{" "}
                      {formatPercent(
                        item.margin
                      )}
                    </small>
                  </div>

                  <strong
                    style={{
                      color:
                        item.profit >= 0
                          ? "#15803d"
                          : "#dc2626",
                    }}
                  >
                    {formatMoney(
                      item.profit
                    )}
                  </strong>
                </div>
              )
            )}
          </div>
        </>
      )}
    </article>
  );
}

function MarginBadge({
  item,
}: {
  item: ItemProfitSummary;
}) {
  let label = "健康毛利";
  let color = "#166534";
  let background = "#dcfce7";

  if (item.profit < 0) {
    label = "负利润";
    color = "#b91c1c";
    background = "#fee2e2";
  } else if (item.zeroCost) {
    label = "成本为 0";
    color = "#7c2d12";
    background = "#ffedd5";
  } else if (
    item.margin <
    LOW_MARGIN_THRESHOLD
  ) {
    label = "低毛利";
    color = "#92400e";
    background = "#fef3c7";
  }

  return (
    <span
      className="profit-badge"
      style={{
        color,
        background,
      }}
    >
      {label}
    </span>
  );
}

function TransactionBadge({
  type,
}: {
  type: string;
}) {
  const refund =
    type === "refund";

  return (
    <span
      className="profit-badge"
      style={{
        color: refund
          ? "#b91c1c"
          : "#166534",

        background: refund
          ? "#fee2e2"
          : "#dcfce7",
      }}
    >
      {refund ? "退款" : "销售"}
    </span>
  );
}

function SignedMoney({
  value,
  formatMoney,
  strong = false,
}: {
  value: number;
  formatMoney: (
    value: number
  ) => string;
  strong?: boolean;
}) {
  return (
    <span
      style={{
        color:
          value < 0
            ? "#dc2626"
            : value > 0
              ? "#15803d"
              : "#64748b",

        fontWeight:
          strong ? 900 : 700,
      }}
    >
      {value > 0 ? "+" : ""}
      {formatMoney(value)}
    </span>
  );
}

function isCatalogItemType(
  itemType: string
) {
  return [
    "service",
    "package",
    "product",
  ].includes(itemType);
}

function getMarginColor(
  margin: number,
  profit: number
) {
  if (profit < 0) {
    return "#dc2626";
  }

  if (
    margin <
    LOW_MARGIN_THRESHOLD
  ) {
    return "#d97706";
  }

  return "#16a34a";
}

function getTransactionLabel(
  type: string
) {
  return type === "refund"
    ? "退款"
    : "销售";
}

function getItemTypeLabel(
  type: string
) {
  const labels: Record<
    string,
    string
  > = {
    service: "服务",
    package: "套餐",
    product: "产品",
    refund_adjustment:
      "退款调整",
    other: "其他",
  };

  return labels[type] ?? type;
}

function getProfitTrendLabel(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    netRevenue: "净营业额",
    netCost: "净销售成本",
    grossProfit: "真实毛利润",
  };

  return labels[value] ?? value;
}

function parseInputDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
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

function addDays(
  date: Date,
  days: number
) {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;
}

function toInputDate(
  date: Date
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function formatPercent(
  value: number
) {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  return `${safeValue.toFixed(2)}%`;
}

function formatQuantity(
  value: number
) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2);
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "zh-CN",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function toNumber(
  value:
    | number
    | string
    | null
    | undefined
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ?? "操作失败"
    );
  }

  return "利润分析加载失败，请稍后重试";
}

export default ProfitAnalytics;