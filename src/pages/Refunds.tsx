import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";

import {
  RefundService,
  type RefundRecord,
} from "../services/refundService";
import useCurrency from "../hooks/useCurrency";

/* =========================================================
   格式化工具
========================================================= */

function formatDate(
  value: string | null | undefined
): string {
  if (!value) {
    return "—";
  }

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

function formatShortDate(
  value: string | null | undefined
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getRefundStatusLabel(
  status: string | null | undefined
): string {
  const normalizedStatus =
    status?.trim().toLowerCase() || "";

  const labels: Record<string, string> = {
    completed: "已完成",
    pending: "待处理",
    processing: "处理中",
    failed: "失败",
    cancelled: "已取消",
  };

  return labels[normalizedStatus] || status || "未知";
}

function getRefundTypeLabel(
  refundType: string | null | undefined
): string {
  const normalizedType =
    refundType?.trim().toLowerCase() || "";

  const labels: Record<string, string> = {
    full: "整单退款",
    partial: "部分退款",
  };

  return labels[normalizedType] || refundType || "退款";
}

function getPaymentMethodLabel(
  paymentMethod: string | null | undefined
): string {
  const normalizedMethod =
    paymentMethod?.trim().toLowerCase() || "";

  const labels: Record<string, string> = {
    cash: "现金 / Cash",
    card: "银行卡 / Card",
    bank_transfer: "银行转账",
    e_wallet: "电子钱包",
    original_payment: "原付款方式",
  };

  return (
    labels[normalizedMethod] ||
    paymentMethod ||
    "—"
  );
}

function getStatusStyle(
  status: string | null | undefined
): CSSProperties {
  const normalizedStatus =
    status?.trim().toLowerCase() || "";

  if (normalizedStatus === "completed") {
    return {
      background: "#dcfce7",
      color: "#15803d",
      border: "1px solid #86efac",
    };
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "processing"
  ) {
    return {
      background: "#fef3c7",
      color: "#b45309",
      border: "1px solid #fcd34d",
    };
  }

  if (normalizedStatus === "failed") {
    return {
      background: "#fee2e2",
      color: "#dc2626",
      border: "1px solid #fca5a5",
    };
  }

  if (normalizedStatus === "cancelled") {
    return {
      background: "#f1f5f9",
      color: "#475569",
      border: "1px solid #cbd5e1",
    };
  }

  return {
    background: "#e0e7ff",
    color: "#4338ca",
    border: "1px solid #a5b4fc",
  };
}

/* =========================================================
   页面
========================================================= */

export default function Refunds() {
  const {
    formatMoney: formatDisplayMoney,
    displayCurrency,
    accountingCurrency,
  } = useCurrency();

  function formatMoney(
    value: number | string | null | undefined
  ): string {
    const numberValue = Number(value ?? 0);

    return formatDisplayMoney(
      Number.isFinite(numberValue) ? numberValue : 0
    );
  }

  const [refunds, setRefunds] = useState<
    RefundRecord[]
  >([]);

  const [
    selectedRefund,
    setSelectedRefund,
  ] = useState<RefundRecord | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  async function loadRefunds(
    showRefreshLoading = false
  ) {
    if (showRefreshLoading) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const data =
        await RefundService.getAll();

      setRefunds(data);
    } catch (error) {
      console.error(
        "Load refunds failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "读取退款记录失败，请稍后重试。"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadRefunds();
  }, []);

  useEffect(() => {
    if (!selectedRefund) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setSelectedRefund(null);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [selectedRefund]);

  const filteredRefunds = useMemo(() => {
    const keyword =
      searchText.trim().toLowerCase();

    return refunds.filter((refund) => {
      const status =
        refund.status
          ?.trim()
          .toLowerCase() || "";

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      const searchableText = [
        refund.refund_no,
        refund.reason,
        refund.notes,
        refund.refund_method,
        refund.refund_type,
        refund.status,

        refund.orders?.order_no,
        refund.orders?.payment_method,
        refund.orders?.payment_status,
        refund.orders?.status,

        refund.orders?.members?.name,
        refund.orders?.members?.phone,

        refund.orders?.vehicles
          ?.plate_number,
        refund.orders?.vehicles?.brand,
        refund.orders?.vehicles?.model,

        ...(refund.refund_items ?? []).map(
          (item) => item.item_name || ""
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword ||
        searchableText.includes(keyword);

      return (
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    refunds,
    searchText,
    statusFilter,
  ]);

  const summary = useMemo(() => {
    const completedRefunds =
      refunds.filter(
        (refund) =>
          refund.status
            ?.trim()
            .toLowerCase() ===
          "completed"
      );

    const totalRefundAmount =
      completedRefunds.reduce(
        (sum, refund) =>
          sum +
          Number(
            refund.refund_amount || 0
          ),
        0
      );

    const refundedItemCount =
      completedRefunds.reduce(
        (sum, refund) =>
          sum +
          (refund.refund_items ?? []).reduce(
            (itemSum, item) =>
              itemSum +
              Number(item.quantity || 0),
            0
          ),
        0
      );

    const restockedQuantity =
      completedRefunds.reduce(
        (sum, refund) =>
          sum +
          (refund.refund_items ?? [])
            .filter((item) => item.restock)
            .reduce(
              (itemSum, item) =>
                itemSum +
                Number(
                  item.quantity || 0
                ),
              0
            ),
        0
      );

    const today = new Date();

    const todayRefundCount =
      completedRefunds.filter((refund) => {
        const refundDate =
          new Date(refund.created_at);

        return (
          refundDate.getFullYear() ===
            today.getFullYear() &&
          refundDate.getMonth() ===
            today.getMonth() &&
          refundDate.getDate() ===
            today.getDate()
        );
      }).length;

    return {
      totalRefundCount:
        completedRefunds.length,
      totalRefundAmount,
      refundedItemCount,
      restockedQuantity,
      todayRefundCount,
    };
  }, [refunds]);

  return (
    <main style={styles.page}>
      {/* 页面标题 */}

      <header style={styles.pageHeader}>
        <div>
          <p style={styles.eyebrow}>
            REFUND MANAGEMENT
          </p>

          <h1 style={styles.pageTitle}>
            退款记录 / Refunds
          </h1>

          <p style={styles.pageSubtitle}>
            查看订单退款、退款金额、退款项目和产品回库记录
          </p>
        </div>

        <button
          type="button"
          style={{
            ...styles.refreshButton,
            opacity: refreshing ? 0.7 : 1,
          }}
          disabled={refreshing}
          onClick={() =>
            void loadRefunds(true)
          }
        >
          {refreshing
            ? "正在刷新..."
            : "↻ 刷新数据"}
        </button>
      </header>

      <section style={styles.currencyPanel}>
        <div style={styles.currencyItem}>
          <span style={styles.currencyLabel}>
            当前显示货币 / Display
          </span>

          <strong style={styles.currencyValue}>
            {displayCurrency}
          </strong>
        </div>

        <div style={styles.currencyDivider} />

        <div style={styles.currencyItem}>
          <span style={styles.currencyLabel}>
            账本保存货币 / Accounting
          </span>

          <strong style={styles.currencyValue}>
            {accountingCurrency}
          </strong>
        </div>

        {displayCurrency !== accountingCurrency && (
          <p style={styles.currencyNote}>
            页面金额仅按当前汇率换算显示，退款记录及账本金额仍以{" "}
            {accountingCurrency} 保存。
          </p>
        )}
      </section>

      {/* 错误提示 */}

      {errorMessage && (
        <div style={styles.errorBox}>
          <div>
            <strong>
              无法读取退款记录
            </strong>

            <p style={styles.errorText}>
              {errorMessage}
            </p>
          </div>

          <button
            type="button"
            style={styles.retryButton}
            onClick={() =>
              void loadRefunds()
            }
          >
            重新加载
          </button>
        </div>
      )}

      {/* 数据统计 */}

      <section style={styles.summaryGrid}>
        <article style={styles.summaryCard}>
          <div style={styles.iconBlue}>
            ↩
          </div>

          <div>
            <p style={styles.cardLabel}>
              已完成退款
            </p>

            <strong style={styles.cardValue}>
              {summary.totalRefundCount}
            </strong>

            <p style={styles.cardHint}>
              今日退款：
              {summary.todayRefundCount} 笔
            </p>
          </div>
        </article>

        <article style={styles.summaryCard}>
          <div style={styles.iconRed}>
            {displayCurrency}
          </div>

          <div>
            <p style={styles.cardLabel}>
              累计退款金额
            </p>

            <strong
              style={{
                ...styles.cardValue,
                color: "#dc2626",
              }}
            >
              {formatMoney(
                summary.totalRefundAmount
              )}
            </strong>

            <p style={styles.cardHint}>
              已完成退款总额
            </p>
          </div>
        </article>

        <article style={styles.summaryCard}>
          <div style={styles.iconPurple}>
            ☷
          </div>

          <div>
            <p style={styles.cardLabel}>
              退款项目数量
            </p>

            <strong style={styles.cardValue}>
              {summary.refundedItemCount}
            </strong>

            <p style={styles.cardHint}>
              包含服务、套餐及产品
            </p>
          </div>
        </article>

        <article style={styles.summaryCard}>
          <div style={styles.iconGreen}>
            + 
          </div>

          <div>
            <p style={styles.cardLabel}>
              产品回库数量
            </p>

            <strong
              style={{
                ...styles.cardValue,
                color: "#16a34a",
              }}
            >
              {summary.restockedQuantity}
            </strong>

            <p style={styles.cardHint}>
              已恢复到产品库存
            </p>
          </div>
        </article>
      </section>

      {/* 搜索与筛选 */}

      <section style={styles.filterCard}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>
            🔍
          </span>

          <input
            type="text"
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
            placeholder="搜索退款编号、订单编号、客户、电话、车牌、原因或项目..."
            style={styles.searchInput}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          style={styles.filterSelect}
        >
          <option value="all">
            全部退款状态
          </option>

          <option value="completed">
            已完成
          </option>

          <option value="pending">
            待处理
          </option>

          <option value="processing">
            处理中
          </option>

          <option value="failed">
            失败
          </option>

          <option value="cancelled">
            已取消
          </option>
        </select>
      </section>

      {/* 退款列表 */}

      <section style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              退款记录清单
            </h2>

            <p style={styles.sectionSubtitle}>
              当前显示：
              {filteredRefunds.length} 笔退款
            </p>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />

            <strong>
              正在读取退款记录...
            </strong>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              ↩
            </div>

            <h3 style={styles.emptyTitle}>
              暂无退款记录
            </h3>

            <p style={styles.emptyText}>
              当前筛选条件下没有找到退款记录。
            </p>
          </div>
        ) : (
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    退款资料
                  </th>

                  <th style={styles.th}>
                    原订单
                  </th>

                  <th style={styles.th}>
                    客户 / 车辆
                  </th>

                  <th style={styles.th}>
                    退款金额
                  </th>

                  <th style={styles.th}>
                    退款项目
                  </th>

                  <th style={styles.th}>
                    状态
                  </th>

                  <th style={styles.th}>
                    操作
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRefunds.map(
                  (refund) => {
                    const itemQuantity =
                      (
                        refund.refund_items ??
                        []
                      ).reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.quantity || 0
                          ),
                        0
                      );

                    const memberName =
                      refund.orders?.members
                        ?.name || "非会员客户";

                    const phone =
                      refund.orders?.members
                        ?.phone || "—";

                    const plateNumber =
                      refund.orders?.vehicles
                        ?.plate_number || "—";

                    const vehicleText = [
                      refund.orders?.vehicles
                        ?.brand,
                      refund.orders?.vehicles
                        ?.model,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <tr
                        key={refund.id}
                        style={styles.tr}
                      >
                        <td style={styles.td}>
                          <strong
                            style={
                              styles.refundNumber
                            }
                          >
                            {refund.refund_no}
                          </strong>

                          <span
                            style={
                              styles.secondaryText
                            }
                          >
                            {getRefundTypeLabel(
                              refund.refund_type
                            )}
                          </span>

                          <span
                            style={
                              styles.dateText
                            }
                          >
                            {formatDate(
                              refund.created_at
                            )}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <strong
                            style={styles.orderNumber}
                          >
                            {refund.orders
                              ?.order_no ||
                              `Order #${refund.order_id}`}
                          </strong>

                          <span
                            style={
                              styles.secondaryText
                            }
                          >
                            {formatShortDate(
                              refund.orders
                                ?.created_at
                            )}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <strong
                            style={
                              styles.customerName
                            }
                          >
                            {memberName}
                          </strong>

                          <span
                            style={
                              styles.secondaryText
                            }
                          >
                            {phone}
                          </span>

                          <span
                            style={
                              styles.vehicleText
                            }
                          >
                            {plateNumber}
                            {vehicleText
                              ? ` · ${vehicleText}`
                              : ""}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <strong
                            style={
                              styles.amountText
                            }
                          >
                            {formatMoney(
                              refund.refund_amount
                            )}
                          </strong>

                          <span
                            style={
                              styles.secondaryText
                            }
                          >
                            {getPaymentMethodLabel(
                              refund.refund_method
                            )}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <strong
                            style={
                              styles.itemCount
                            }
                          >
                            {itemQuantity}
                          </strong>

                          <span
                            style={
                              styles.secondaryText
                            }
                          >
                            个项目
                          </span>
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              ...getStatusStyle(
                                refund.status
                              ),
                            }}
                          >
                            {getRefundStatusLabel(
                              refund.status
                            )}
                          </span>
                        </td>

                        <td style={styles.td}>
                          <button
                            type="button"
                            style={
                              styles.detailButton
                            }
                            onClick={() =>
                              setSelectedRefund(
                                refund
                              )
                            }
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 退款详情弹窗 */}

      {selectedRefund && (
        <div
          style={styles.modalBackdrop}
          onMouseDown={() =>
            setSelectedRefund(null)
          }
        >
          <section
            style={styles.modal}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header style={styles.modalHeader}>
              <div>
                <p style={styles.modalEyebrow}>
                  REFUND DETAILS
                </p>

                <h2 style={styles.modalTitle}>
                  退款详情
                </h2>

                <p style={styles.modalSubtitle}>
                  {selectedRefund.refund_no}
                </p>
              </div>

              <button
                type="button"
                style={
                  styles.modalCloseButton
                }
                onClick={() =>
                  setSelectedRefund(null)
                }
                aria-label="关闭退款详情"
              >
                ×
              </button>
            </header>

            <div style={styles.modalContent}>
              <div style={styles.detailHero}>
                <div>
                  <span
                    style={
                      styles.detailSmallLabel
                    }
                  >
                    原订单编号
                  </span>

                  <strong
                    style={
                      styles.detailOrderNumber
                    }
                  >
                    {selectedRefund.orders
                      ?.order_no ||
                      `Order #${selectedRefund.order_id}`}
                  </strong>
                </div>

                <div
                  style={
                    styles.detailAmountBox
                  }
                >
                  <span
                    style={
                      styles.detailAmountLabel
                    }
                  >
                    退款金额 · {displayCurrency}
                  </span>

                  <strong
                    style={
                      styles.detailAmountValue
                    }
                  >
                    {formatMoney(
                      selectedRefund.refund_amount
                    )}
                  </strong>
                </div>
              </div>

              <div style={styles.detailGrid}>
                <DetailItem
                  label="退款类型"
                  value={getRefundTypeLabel(
                    selectedRefund.refund_type
                  )}
                />

                <DetailItem
                  label="退款状态"
                  value={getRefundStatusLabel(
                    selectedRefund.status
                  )}
                />

                <DetailItem
                  label="退款方式"
                  value={getPaymentMethodLabel(
                    selectedRefund.refund_method
                  )}
                />

                <DetailItem
                  label="退款时间"
                  value={formatDate(
                    selectedRefund.completed_at ||
                      selectedRefund.created_at
                  )}
                />

                <DetailItem
                  label="客户姓名"
                  value={
                    selectedRefund.orders
                      ?.members?.name ||
                    "非会员客户"
                  }
                />

                <DetailItem
                  label="联系电话"
                  value={
                    selectedRefund.orders
                      ?.members?.phone || "—"
                  }
                />

                <DetailItem
                  label="车辆车牌"
                  value={
                    selectedRefund.orders
                      ?.vehicles
                      ?.plate_number || "—"
                  }
                />

                <DetailItem
                  label="车辆资料"
                  value={
                    [
                      selectedRefund.orders
                        ?.vehicles?.brand,
                      selectedRefund.orders
                        ?.vehicles?.model,
                    ]
                      .filter(Boolean)
                      .join(" ") || "—"
                  }
                />
              </div>

              <section style={styles.reasonCard}>
                <div>
                  <span style={styles.reasonLabel}>
                    退款原因
                  </span>

                  <strong
                    style={styles.reasonValue}
                  >
                    {selectedRefund.reason ||
                      "—"}
                  </strong>
                </div>

                {selectedRefund.notes && (
                  <div
                    style={styles.notesSection}
                  >
                    <span
                      style={styles.reasonLabel}
                    >
                      备注
                    </span>

                    <p style={styles.notesText}>
                      {selectedRefund.notes}
                    </p>
                  </div>
                )}
              </section>

              <section
                style={styles.itemsSection}
              >
                <div
                  style={styles.itemsHeader}
                >
                  <div>
                    <h3
                      style={
                        styles.itemsTitle
                      }
                    >
                      退款项目
                    </h3>

                    <p
                      style={
                        styles.itemsSubtitle
                      }
                    >
                      共{" "}
                      {
                        selectedRefund
                          .refund_items.length
                      }{" "}
                      条项目记录
                    </p>
                  </div>
                </div>

                {selectedRefund.refund_items
                  .length === 0 ? (
                  <div
                    style={
                      styles.noItemsState
                    }
                  >
                    没有退款项目资料
                  </div>
                ) : (
                  <div
                    style={
                      styles.refundItemList
                    }
                  >
                    {selectedRefund.refund_items.map(
                      (item) => (
                        <article
                          key={item.id}
                          style={
                            styles.refundItemCard
                          }
                        >
                          <div
                            style={
                              styles.refundItemMain
                            }
                          >
                            <div
                              style={
                                styles.itemTypeBadge
                              }
                            >
                              {item.item_type ||
                                "item"}
                            </div>

                            <div>
                              <strong
                                style={
                                  styles.refundItemName
                                }
                              >
                                {item.item_name ||
                                  "未命名项目"}
                              </strong>

                              <p
                                style={
                                  styles.refundItemMeta
                                }
                              >
                                数量：
                                {item.quantity}
                                {" · "}
                                单价：
                                {formatMoney(
                                  item.unit_price
                                )}
                              </p>
                            </div>
                          </div>

                          <div
                            style={
                              styles.refundItemRight
                            }
                          >
                            <strong
                              style={
                                styles.refundItemAmount
                              }
                            >
                              {formatMoney(
                                item.refund_amount
                              )}
                            </strong>

                            <span
                              style={
                                item.restock
                                  ? styles.restockBadge
                                  : styles.noRestockBadge
                              }
                            >
                              {item.restock
                                ? "✓ 已回库"
                                : "无需回库"}
                            </span>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>

              <button
                type="button"
                style={styles.finishButton}
                onClick={() =>
                  setSelectedRefund(null)
                }
              >
                完成
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   详情小卡片
========================================================= */

type DetailItemProps = {
  label: string;
  value: string;
};

function DetailItem({
  label,
  value,
}: DetailItemProps) {
  return (
    <div style={styles.detailItem}>
      <span style={styles.detailItemLabel}>
        {label}
      </span>

      <strong
        style={styles.detailItemValue}
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   页面样式
========================================================= */

const styles: Record<
  string,
  CSSProperties
> = {
  page: {
    minHeight: "100vh",
    padding: "34px",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
    color: "#0f172a",
    boxSizing: "border-box",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    marginBottom: "28px",
  },

  eyebrow: {
    margin: "0 0 10px",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "2px",
  },

  pageTitle: {
    margin: 0,
    fontSize: "36px",
    lineHeight: 1.15,
    letterSpacing: "-1.4px",
  },

  pageSubtitle: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: "16px",
  },

  refreshButton: {
    minWidth: "142px",
    height: "48px",
    padding: "0 20px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 800,
    fontSize: "15px",
    cursor: "pointer",
    boxShadow:
      "0 8px 20px rgba(15, 23, 42, 0.06)",
  },

  currencyPanel: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    padding: "16px 20px",
    marginBottom: "22px",
    border: "1px solid #bfdbfe",
    borderRadius: "17px",
    background:
      "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
    boxShadow:
      "0 8px 22px rgba(37, 99, 235, 0.06)",
  },

  currencyItem: {
    minWidth: "150px",
  },

  currencyLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 800,
  },

  currencyValue: {
    display: "block",
    marginTop: "4px",
    color: "#0f172a",
    fontSize: "17px",
  },

  currencyDivider: {
    width: "1px",
    height: "34px",
    background: "#cbd5e1",
  },

  currencyNote: {
    flex: "1 1 280px",
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.6,
  },

  errorBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    padding: "18px 20px",
    marginBottom: "22px",
    border: "1px solid #fecaca",
    borderRadius: "16px",
    background: "#fef2f2",
    color: "#991b1b",
  },

  errorText: {
    margin: "5px 0 0",
    fontSize: "14px",
  },

  retryButton: {
    padding: "10px 18px",
    border: "1px solid #fca5a5",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#b91c1c",
    fontWeight: 800,
    cursor: "pointer",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  summaryCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    minHeight: "130px",
    padding: "22px",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    background: "#ffffff",
    boxShadow:
      "0 12px 30px rgba(15, 23, 42, 0.05)",
  },

  iconBlue: {
    display: "grid",
    placeItems: "center",
    width: "54px",
    height: "54px",
    flexShrink: 0,
    borderRadius: "16px",
    background: "#dbeafe",
    color: "#2563eb",
    fontSize: "25px",
    fontWeight: 900,
  },

  iconRed: {
    display: "grid",
    placeItems: "center",
    width: "54px",
    height: "54px",
    flexShrink: 0,
    borderRadius: "16px",
    background: "#fee2e2",
    color: "#dc2626",
    fontSize: "24px",
    fontWeight: 900,
  },

  iconPurple: {
    display: "grid",
    placeItems: "center",
    width: "54px",
    height: "54px",
    flexShrink: 0,
    borderRadius: "16px",
    background: "#ede9fe",
    color: "#7c3aed",
    fontSize: "24px",
    fontWeight: 900,
  },

  iconGreen: {
    display: "grid",
    placeItems: "center",
    width: "54px",
    height: "54px",
    flexShrink: 0,
    borderRadius: "16px",
    background: "#dcfce7",
    color: "#16a34a",
    fontSize: "26px",
    fontWeight: 900,
  },

  cardLabel: {
    margin: "0 0 5px",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 700,
  },

  cardValue: {
    display: "block",
    color: "#0f172a",
    fontSize: "29px",
    lineHeight: 1.1,
  },

  cardHint: {
    margin: "8px 0 0",
    color: "#94a3b8",
    fontSize: "12px",
  },

  filterCard: {
    display: "grid",
    gridTemplateColumns:
      "minmax(260px, 1fr) 230px",
    gap: "14px",
    padding: "18px",
    marginBottom: "24px",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    background: "#ffffff",
    boxShadow:
      "0 10px 25px rgba(15, 23, 42, 0.04)",
  },

  searchWrapper: {
    position: "relative",
  },

  searchIcon: {
    position: "absolute",
    left: "17px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "16px",
  },

  searchInput: {
    width: "100%",
    height: "52px",
    padding: "0 18px 0 48px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },

  filterSelect: {
    width: "100%",
    height: "52px",
    padding: "0 15px",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: 700,
    outline: "none",
  },

  tableCard: {
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: "22px",
    background: "#ffffff",
    boxShadow:
      "0 14px 35px rgba(15, 23, 42, 0.06)",
  },

  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 26px",
    borderBottom: "1px solid #e2e8f0",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "22px",
  },

  sectionSubtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  tableScroll: {
    width: "100%",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    minWidth: "1100px",
    borderCollapse: "collapse",
  },

  th: {
    padding: "17px 18px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 900,
    textAlign: "left",
    whiteSpace: "nowrap",
  },

  tr: {
    borderBottom: "1px solid #eef2f7",
  },

  td: {
    padding: "19px 18px",
    verticalAlign: "middle",
  },

  refundNumber: {
    display: "block",
    color: "#1d4ed8",
    fontSize: "14px",
    marginBottom: "6px",
  },

  orderNumber: {
    display: "block",
    color: "#0f172a",
    fontSize: "14px",
    marginBottom: "6px",
  },

  customerName: {
    display: "block",
    color: "#0f172a",
    fontSize: "14px",
    marginBottom: "5px",
  },

  secondaryText: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    marginTop: "4px",
  },

  dateText: {
    display: "block",
    color: "#94a3b8",
    fontSize: "12px",
    marginTop: "5px",
  },

  vehicleText: {
    display: "block",
    color: "#2563eb",
    fontSize: "12px",
    marginTop: "5px",
  },

  amountText: {
    display: "block",
    color: "#dc2626",
    fontSize: "18px",
    marginBottom: "5px",
  },

  itemCount: {
    display: "inline-block",
    color: "#0f172a",
    fontSize: "20px",
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "82px",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 900,
  },

  detailButton: {
    padding: "9px 14px",
    border: "1px solid #93c5fd",
    borderRadius: "10px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 800,
    cursor: "pointer",
  },

  loadingState: {
    display: "grid",
    placeItems: "center",
    gap: "15px",
    minHeight: "320px",
    color: "#64748b",
  },

  spinner: {
    width: "38px",
    height: "38px",
    border: "4px solid #dbeafe",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
  },

  emptyState: {
    display: "grid",
    placeItems: "center",
    minHeight: "340px",
    padding: "40px",
    textAlign: "center",
  },

  emptyIcon: {
    display: "grid",
    placeItems: "center",
    width: "72px",
    height: "72px",
    marginBottom: "15px",
    borderRadius: "22px",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: "32px",
    fontWeight: 900,
  },

  emptyTitle: {
    margin: "0 0 8px",
    fontSize: "21px",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "grid",
    placeItems: "center",
    padding: "20px",
    background: "rgba(15, 23, 42, 0.68)",
    backdropFilter: "blur(5px)",
  },

  modal: {
    width: "min(880px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    borderRadius: "24px",
    background: "#ffffff",
    boxShadow:
      "0 30px 80px rgba(15, 23, 42, 0.35)",
  },

  modalHeader: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    padding: "24px 28px",
    background: "#0f172a",
    color: "#ffffff",
  },

  modalEyebrow: {
    margin: "0 0 7px",
    color: "#fbbf24",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "1.7px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "27px",
  },

  modalSubtitle: {
    margin: "7px 0 0",
    color: "#cbd5e1",
    fontSize: "14px",
  },

  modalCloseButton: {
    width: "42px",
    height: "42px",
    border: "1px solid #334155",
    borderRadius: "12px",
    background: "#1e293b",
    color: "#ffffff",
    fontSize: "25px",
    cursor: "pointer",
  },

  modalContent: {
    padding: "28px",
  },

  detailHero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "22px",
    padding: "22px",
    marginBottom: "18px",
    border: "1px solid #dbeafe",
    borderRadius: "18px",
    background: "#f8fbff",
  },

  detailSmallLabel: {
    display: "block",
    marginBottom: "7px",
    color: "#64748b",
    fontSize: "13px",
  },

  detailOrderNumber: {
    color: "#0f172a",
    fontSize: "18px",
  },

  detailAmountBox: {
    minWidth: "190px",
    padding: "16px 20px",
    borderRadius: "16px",
    background: "#fef2f2",
    textAlign: "right",
  },

  detailAmountLabel: {
    display: "block",
    marginBottom: "5px",
    color: "#dc2626",
    fontSize: "13px",
  },

  detailAmountValue: {
    color: "#dc2626",
    fontSize: "27px",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },

  detailItem: {
    padding: "17px",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
    background: "#ffffff",
  },

  detailItemLabel: {
    display: "block",
    marginBottom: "7px",
    color: "#64748b",
    fontSize: "12px",
  },

  detailItemValue: {
    color: "#0f172a",
    fontSize: "14px",
  },

  reasonCard: {
    display: "grid",
    gap: "17px",
    padding: "20px",
    marginBottom: "22px",
    border: "1px solid #fde68a",
    borderRadius: "17px",
    background: "#fffbeb",
  },

  reasonLabel: {
    display: "block",
    marginBottom: "7px",
    color: "#92400e",
    fontSize: "12px",
    fontWeight: 800,
  },

  reasonValue: {
    color: "#78350f",
    fontSize: "15px",
  },

  notesSection: {
    paddingTop: "15px",
    borderTop: "1px solid #fde68a",
  },

  notesText: {
    margin: 0,
    color: "#78350f",
    fontSize: "14px",
    lineHeight: 1.7,
  },

  itemsSection: {
    marginTop: "5px",
  },

  itemsHeader: {
    marginBottom: "14px",
  },

  itemsTitle: {
    margin: 0,
    fontSize: "20px",
  },

  itemsSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  refundItemList: {
    display: "grid",
    gap: "11px",
  },

  refundItemCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    padding: "17px",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
    background: "#f8fafc",
  },

  refundItemMain: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  itemTypeBadge: {
    display: "grid",
    placeItems: "center",
    minWidth: "62px",
    height: "34px",
    padding: "0 9px",
    borderRadius: "10px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "11px",
    fontWeight: 900,
    textTransform: "uppercase",
  },

  refundItemName: {
    display: "block",
    color: "#0f172a",
    fontSize: "15px",
  },

  refundItemMeta: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  refundItemRight: {
    display: "grid",
    justifyItems: "end",
    gap: "6px",
  },

  refundItemAmount: {
    color: "#dc2626",
    fontSize: "17px",
  },

  restockBadge: {
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: "11px",
    fontWeight: 900,
  },

  noRestockBadge: {
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#f1f5f9",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 800,
  },

  noItemsState: {
    padding: "30px",
    border: "1px dashed #cbd5e1",
    borderRadius: "15px",
    color: "#64748b",
    textAlign: "center",
  },

  finishButton: {
    display: "block",
    width: "220px",
    height: "50px",
    margin: "27px auto 0",
    border: 0,
    borderRadius: "14px",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 900,
    cursor: "pointer",
  },
};