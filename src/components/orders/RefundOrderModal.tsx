import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import useCurrency from "../../hooks/useCurrency";
import {
  RefundService,
  type RefundOrderResult,
} from "../../services/refundService";

export type RefundableOrder = {
  id: number;
  order_no?: string | null;
  total?: number | string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
};

type RefundOrderModalProps = {
  open: boolean;
  order: RefundableOrder | null;
  onClose: () => void;
  onSuccess: (
    result: RefundOrderResult
  ) => void | Promise<void>;
};

const refundReasons = [
  "客户取消服务",
  "服务质量问题",
  "商品退货",
  "重复付款",
  "错误结账",
  "价格或折扣错误",
  "其他原因",
];

const refundMethods = [
  { value: "cash", label: "现金退款 / Cash" },
  {
    value: "bank_transfer",
    label: "银行转账 / Bank Transfer",
  },
  { value: "card", label: "银行卡退款 / Card" },
  {
    value: "e_wallet",
    label: "电子钱包 / E-Wallet",
  },
  {
    value: "original_payment",
    label: "原付款方式 / Original Payment",
  },
];

function getDefaultRefundMethod(
  paymentMethod?: string | null
): string {
  const normalizedMethod =
    paymentMethod?.trim().toLowerCase();

  if (!normalizedMethod) {
    return "cash";
  }

  if (
    normalizedMethod === "cash" ||
    normalizedMethod === "bank_transfer" ||
    normalizedMethod === "card" ||
    normalizedMethod === "e_wallet"
  ) {
    return normalizedMethod;
  }

  return "original_payment";
}

export default function RefundOrderModal({
  open,
  order,
  onClose,
  onSuccess,
}: RefundOrderModalProps) {
  const {
    formatMoney,
    currentOption,
    accountingOption,
    displayCurrency,
    accountingCurrency,
  } = useCurrency();

  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] =
    useState("");
  const [refundMethod, setRefundMethod] =
    useState("cash");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [refundResult, setRefundResult] =
    useState<RefundOrderResult | null>(null);

  useEffect(() => {
    if (!open || !order) {
      return;
    }

    setReason("");
    setCustomReason("");
    setRefundMethod(
      getDefaultRefundMethod(order.payment_method)
    );
    setNotes("");
    setSubmitting(false);
    setErrorMessage("");
    setRefundResult(null);
  }, [open, order]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
      }
    };

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
  }, [open, submitting, onClose]);

  if (!open || !order) {
    return null;
  }

  const finalReason =
    reason === "其他原因"
      ? customReason.trim()
      : reason.trim();

  const orderTotal = Number(order.total ?? 0);
  const safeOrderTotal = Number.isFinite(orderTotal)
    ? orderTotal
    : 0;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!finalReason) {
      setErrorMessage("请选择或填写退款原因。");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const result =
        await RefundService.refundOrder({
          orderId: order.id,
          reason: finalReason,
          refundMethod,
          notes,
        });

      setRefundResult(result);
      await onSuccess(result);
    } catch (error) {
      console.error(
        "Refund order failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "退款失败，请稍后重试。"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <div
      style={styles.backdrop}
      onMouseDown={handleBackdropClick}
    >
      <section
        style={styles.modal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>
              ORDER REFUND
            </div>

            <h2 style={styles.title}>
              订单退款 / Refund Order
            </h2>

            <p style={styles.subtitle}>
              退款后，订单中的产品将自动回库，并记录退款及库存流水。
            </p>
          </div>

          <button
            type="button"
            style={styles.closeButton}
            onClick={onClose}
            disabled={submitting}
            aria-label="关闭退款窗口"
          >
            ×
          </button>
        </header>

        <div style={styles.content}>
          <div style={styles.orderCard}>
            <div style={styles.orderMainInfo}>
              <span style={styles.orderLabel}>
                订单编号
              </span>

              <strong style={styles.orderNumber}>
                {order.order_no ||
                  `Order #${order.id}`}
              </strong>
            </div>

            <div style={styles.orderAmountBox}>
              <span style={styles.amountLabel}>
                退款金额
              </span>

              <strong style={styles.amountValue}>
                {formatMoney(safeOrderTotal)}
              </strong>
            </div>
          </div>

          <div style={styles.currencyPanel}>
            <div style={styles.currencyItem}>
              <span style={styles.currencyLabel}>
                当前显示货币
              </span>

              <strong style={styles.currencyValue}>
                {currentOption.symbol} {currentOption.code}
              </strong>
            </div>

            <div style={styles.currencyDivider} />

            <div style={styles.currencyItem}>
              <span style={styles.currencyLabel}>
                账本保存货币
              </span>

              <strong style={styles.currencyValue}>
                {accountingOption.symbol} {accountingOption.code}
              </strong>
            </div>
          </div>

          {displayCurrency !== accountingCurrency && (
            <p style={styles.currencyNote}>
              当前退款金额仅换算为 {displayCurrency} 显示；
              实际退款记录仍按账本基础货币
              {" "}{accountingCurrency} 保存。
            </p>
          )}

          <div style={styles.statusGrid}>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>
                订单状态
              </span>

              <strong style={styles.statusValue}>
                {order.status || "—"}
              </strong>
            </div>

            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>
                付款状态
              </span>

              <strong style={styles.statusValue}>
                {order.payment_status || "—"}
              </strong>
            </div>

            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>
                原付款方式
              </span>

              <strong style={styles.statusValue}>
                {order.payment_method || "—"}
              </strong>
            </div>
          </div>

          {refundResult ? (
            <div style={styles.successPanel}>
              <div style={styles.successIcon}>
                ✓
              </div>

              <h3 style={styles.successTitle}>
                退款成功
              </h3>

              <p style={styles.successMessage}>
                {refundResult.message ||
                  "订单退款已经完成。"}
              </p>

              <div style={styles.resultGrid}>
                <div style={styles.resultItem}>
                  <span>退款编号</span>
                  <strong>
                    {refundResult.refund_no ||
                      "—"}
                  </strong>
                </div>

                <div style={styles.resultItem}>
                  <span>退款金额</span>
                  <strong>
                    {formatMoney(
                      Number(
                        refundResult.refund_amount ?? 0
                      )
                    )}
                  </strong>
                </div>

                <div style={styles.resultItem}>
                  <span>退款项目</span>
                  <strong>
                    {refundResult.refund_item_count ??
                      0}
                  </strong>
                </div>

                <div style={styles.resultItem}>
                  <span>产品回库数量</span>
                  <strong>
                    {refundResult.restock_quantity ??
                      0}
                  </strong>
                </div>
              </div>

              <p style={styles.successCurrencyNote}>
                退款记录已按账本货币 {accountingCurrency} 保存，
                当前页面以 {displayCurrency} 显示。
              </p>

              <button
                type="button"
                style={styles.successButton}
                onClick={onClose}
              >
                完成
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  退款原因
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <select
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setErrorMessage("");
                  }}
                  style={styles.input}
                  disabled={submitting}
                >
                  <option value="">
                    请选择退款原因
                  </option>

                  {refundReasons.map(
                    (reasonOption) => (
                      <option
                        key={reasonOption}
                        value={reasonOption}
                      >
                        {reasonOption}
                      </option>
                    )
                  )}
                </select>
              </div>

              {reason === "其他原因" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    其他退款原因
                    <span style={styles.required}>
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    value={customReason}
                    onChange={(event) => {
                      setCustomReason(
                        event.target.value
                      );
                      setErrorMessage("");
                    }}
                    style={styles.input}
                    placeholder="请输入退款原因"
                    maxLength={200}
                    disabled={submitting}
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  退款方式
                  <span style={styles.required}>
                    *
                  </span>
                </label>

                <select
                  value={refundMethod}
                  onChange={(event) =>
                    setRefundMethod(
                      event.target.value
                    )
                  }
                  style={styles.input}
                  disabled={submitting}
                >
                  {refundMethods.map((method) => (
                    <option
                      key={method.value}
                      value={method.value}
                    >
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  退款备注
                  <span style={styles.optional}>
                    选填
                  </span>
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  style={styles.textarea}
                  placeholder="例如：客户要求、负责人批准信息、退款说明等"
                  maxLength={500}
                  disabled={submitting}
                />

                <div style={styles.characterCount}>
                  {notes.length}/500
                </div>
              </div>

              <div style={styles.warningBox}>
                <strong style={styles.warningTitle}>
                  ⚠ 退款确认
                </strong>

                <p style={styles.warningText}>
                  此操作将创建退款记录、更新订单状态，并把订单内销售产品自动退回库存。
                  退款数据仍按账本基础货币 {accountingCurrency} 保存。
                </p>
              </div>

              {errorMessage && (
                <div style={styles.errorBox}>
                  <strong>退款失败</strong>
                  <div style={styles.errorText}>
                    {errorMessage}
                  </div>
                </div>
              )}

              <footer style={styles.footer}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={onClose}
                  disabled={submitting}
                >
                  取消
                </button>

                <button
                  type="submit"
                  style={{
                    ...styles.refundButton,
                    opacity: submitting ? 0.65 : 1,
                    cursor: submitting
                      ? "not-allowed"
                      : "pointer",
                  }}
                  disabled={submitting}
                >
                  {submitting
                    ? "正在处理退款..."
                    : `确认退款 ${formatMoney(
                        safeOrderTotal
                      )}`}
                </button>
              </footer>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "rgba(15, 23, 42, 0.68)",
    backdropFilter: "blur(4px)",
  },

  modal: {
    width: "100%",
    maxWidth: "720px",
    maxHeight: "92vh",
    overflowY: "auto" as const,
    borderRadius: "24px",
    background: "#ffffff",
    boxShadow:
      "0 30px 80px rgba(15, 23, 42, 0.35)",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    padding: "28px 30px",
    color: "#ffffff",
    background:
      "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
  },

  eyebrow: {
    marginBottom: "8px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.15em",
    color: "#fecaca",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1.2,
  },

  subtitle: {
    margin: "10px 0 0",
    maxWidth: "520px",
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#fee2e2",
  },

  closeButton: {
    width: "42px",
    height: "42px",
    flexShrink: 0,
    border: "1px solid rgba(255,255,255,0.28)",
    borderRadius: "12px",
    color: "#ffffff",
    background: "rgba(255,255,255,0.12)",
    fontSize: "26px",
    lineHeight: 1,
    cursor: "pointer",
  },

  content: {
    padding: "28px 30px 30px",
  },

  orderCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "20px",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    background: "#f8fafc",
  },

  orderMainInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "7px",
  },

  orderLabel: {
    fontSize: "13px",
    color: "#64748b",
  },

  orderNumber: {
    fontSize: "17px",
    color: "#0f172a",
    wordBreak: "break-all" as const,
  },

  orderAmountBox: {
    minWidth: "150px",
    padding: "14px 18px",
    borderRadius: "14px",
    textAlign: "right" as const,
    background: "#fff1f2",
  },

  amountLabel: {
    display: "block",
    marginBottom: "5px",
    fontSize: "13px",
    color: "#9f1239",
  },

  amountValue: {
    fontSize: "24px",
    color: "#dc2626",
  },

  currencyPanel: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginTop: "14px",
    padding: "14px 16px",
    border: "1px solid #dbeafe",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
  },

  currencyItem: {
    minWidth: 0,
    flex: 1,
  },

  currencyLabel: {
    display: "block",
    marginBottom: "4px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: 700,
  },

  currencyValue: {
    color: "#0f172a",
    fontSize: "15px",
  },

  currencyDivider: {
    width: "1px",
    height: "34px",
    flexShrink: 0,
    background: "#cbd5e1",
  },

  currencyNote: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "11px",
    lineHeight: 1.6,
  },

  statusGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    marginTop: "14px",
    marginBottom: "24px",
  },

  statusItem: {
    padding: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  statusLabel: {
    display: "block",
    marginBottom: "6px",
    fontSize: "12px",
    color: "#64748b",
  },

  statusValue: {
    fontSize: "14px",
    color: "#0f172a",
    textTransform: "capitalize" as const,
  },

  formGroup: {
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginBottom: "9px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
  },

  required: {
    marginLeft: "4px",
    color: "#dc2626",
  },

  optional: {
    marginLeft: "7px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#94a3b8",
  },

  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "14px 15px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    outline: "none",
    background: "#ffffff",
    fontSize: "15px",
    color: "#0f172a",
  },

  textarea: {
    width: "100%",
    minHeight: "105px",
    boxSizing: "border-box" as const,
    resize: "vertical" as const,
    padding: "14px 15px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    outline: "none",
    fontFamily: "inherit",
    fontSize: "15px",
    lineHeight: 1.6,
    color: "#0f172a",
  },

  characterCount: {
    marginTop: "5px",
    textAlign: "right" as const,
    fontSize: "12px",
    color: "#94a3b8",
  },

  warningBox: {
    marginTop: "6px",
    padding: "15px 17px",
    border: "1px solid #fbbf24",
    borderRadius: "14px",
    background: "#fffbeb",
  },

  warningTitle: {
    display: "block",
    marginBottom: "6px",
    color: "#92400e",
  },

  warningText: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#a16207",
  },

  errorBox: {
    marginTop: "16px",
    padding: "14px 16px",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    background: "#fef2f2",
    color: "#b91c1c",
  },

  errorText: {
    marginTop: "5px",
    whiteSpace: "pre-wrap" as const,
    fontSize: "13px",
    lineHeight: 1.6,
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #e2e8f0",
  },

  cancelButton: {
    minWidth: "120px",
    padding: "13px 18px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  refundButton: {
    minWidth: "210px",
    padding: "13px 20px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, #dc2626, #b91c1c)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 800,
    boxShadow:
      "0 10px 24px rgba(220, 38, 38, 0.22)",
  },

  successPanel: {
    padding: "18px 0 4px",
    textAlign: "center" as const,
  },

  successIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "72px",
    height: "72px",
    margin: "0 auto 18px",
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#16a34a",
    fontSize: "38px",
    fontWeight: 900,
  },

  successTitle: {
    margin: 0,
    fontSize: "26px",
    color: "#0f172a",
  },

  successMessage: {
    margin: "10px auto 22px",
    maxWidth: "500px",
    color: "#64748b",
    lineHeight: 1.6,
  },

  resultGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "24px",
    textAlign: "left" as const,
  },

  resultItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    padding: "15px",
    borderRadius: "12px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "13px",
  },

  successCurrencyNote: {
    margin: "-10px auto 20px",
    maxWidth: "520px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.6,
  },

  successButton: {
    minWidth: "180px",
    padding: "13px 22px",
    border: "none",
    borderRadius: "12px",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
  },
};