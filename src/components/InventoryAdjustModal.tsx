import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  InventoryService,
  type InventoryAction,
  type InventoryAdjustmentResult,
} from "../services/inventoryService";

export interface InventoryProduct {
  id: number;
  product_name: string;
  sku?: string | null;
  stock_qty: number | null;
  min_stock?: number | null;
  unit?: string | null;
}

interface InventoryAdjustModalProps {
  open: boolean;
  product: InventoryProduct | null;
  action: InventoryAction;
  onClose: () => void;
  onSuccess: (
    result: InventoryAdjustmentResult
  ) => void | Promise<void>;
}

const actionConfig: Record<
  InventoryAction,
  {
    title: string;
    subtitle: string;
    quantityLabel: string;
    buttonText: string;
    buttonColor: string;
    defaultReason: string;
  }
> = {
  increase: {
    title: "产品入库",
    subtitle: "增加该产品的现有库存数量",
    quantityLabel: "入库数量",
    buttonText: "确认入库",
    buttonColor: "#16a34a",
    defaultReason: "产品入库",
  },

  decrease: {
    title: "产品出库",
    subtitle: "减少该产品的现有库存数量",
    quantityLabel: "出库数量",
    buttonText: "确认出库",
    buttonColor: "#dc2626",
    defaultReason: "产品出库",
  },

  set: {
    title: "库存盘点",
    subtitle: "将库存直接修正为实际盘点数量",
    quantityLabel: "实际库存数量",
    buttonText: "确认盘点",
    buttonColor: "#2563eb",
    defaultReason: "库存盘点修正",
  },
};

export default function InventoryAdjustModal({
  open,
  product,
  action,
  onClose,
  onSuccess,
}: InventoryAdjustModalProps) {
  const config = useMemo(
    () => actionConfig[action],
    [action]
  );

  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(
    config.defaultReason
  );
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    if (!open) return;

    setErrorMessage("");
    setNotes("");
    setReason(config.defaultReason);

    if (action === "set") {
      setQuantity(
        String(Number(product?.stock_qty ?? 0))
      );
    } else {
      setQuantity("");
    }
  }, [
    open,
    action,
    product?.id,
    product?.stock_qty,
    config.defaultReason,
  ]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
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
  }, [open, submitting, onClose]);

  if (!open || !product) {
    return null;
  }

  const currentStock = Number(
    product.stock_qty ?? 0
  );

  const minimumStock = Number(
    product.min_stock ?? 0
  );

  const unit = product.unit || "pcs";

  const parsedQuantity = Number(quantity);

  let estimatedStock = currentStock;

  if (
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 0
  ) {
    if (action === "increase") {
      estimatedStock =
        currentStock + parsedQuantity;
    }

    if (action === "decrease") {
      estimatedStock =
        currentStock - parsedQuantity;
    }

    if (action === "set") {
      estimatedStock = parsedQuantity;
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setErrorMessage("");

    const normalizedQuantity =
      Number(quantity);

    if (!Number.isInteger(normalizedQuantity)) {
      setErrorMessage(
        "库存数量必须填写整数。"
      );
      return;
    }

    if (
      action !== "set" &&
      normalizedQuantity <= 0
    ) {
      setErrorMessage(
        "入库或出库数量必须大于 0。"
      );
      return;
    }

    if (
      action === "set" &&
      normalizedQuantity < 0
    ) {
      setErrorMessage(
        "盘点后的库存不能小于 0。"
      );
      return;
    }

    if (
      action === "decrease" &&
      normalizedQuantity > currentStock
    ) {
      setErrorMessage(
        `出库数量不能超过当前库存 ${currentStock} ${unit}。`
      );
      return;
    }

    if (!reason.trim()) {
      setErrorMessage(
        "请填写库存调整原因。"
      );
      return;
    }

    try {
      setSubmitting(true);

      const result =
        await InventoryService.adjustStock({
          productId: product!.id,
action,
          quantity: normalizedQuantity,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        });

      await onSuccess(result);
    } catch (error) {
      console.error(
        "Inventory adjustment failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "库存调整失败，请稍后再试。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={styles.overlay}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.badge}>
              INVENTORY MANAGEMENT
            </div>

            <h2 style={styles.title}>
              {config.title}
            </h2>

            <p style={styles.subtitle}>
              {config.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              ...styles.closeButton,
              opacity: submitting ? 0.5 : 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={styles.productCard}>
          <div>
            <div style={styles.productName}>
              {product.product_name}
            </div>

            <div style={styles.productCode}>
              SKU：{product.sku || "暂无 SKU"}
            </div>
          </div>

          <div style={styles.stockBox}>
            <span style={styles.stockLabel}>
              当前库存
            </span>

            <strong style={styles.stockNumber}>
              {currentStock} {unit}
            </strong>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              {config.quantityLabel}
              <span style={styles.required}>
                *
              </span>
            </label>

            <input
              autoFocus
              type="number"
              step="1"
              min="0"
              value={quantity}
              onChange={(event) => {
                setQuantity(
                  event.target.value
                );
                setErrorMessage("");
              }}
              placeholder={
                action === "set"
                  ? "请输入盘点后的实际库存"
                  : "请输入数量"
              }
              disabled={submitting}
              style={styles.input}
            />
          </div>

          <div style={styles.previewCard}>
            <div style={styles.previewItem}>
              <span>调整前库存</span>
              <strong>
                {currentStock} {unit}
              </strong>
            </div>

            <div style={styles.arrow}>→</div>

            <div style={styles.previewItem}>
              <span>预计调整后</span>

              <strong
                style={{
                  color:
                    estimatedStock < 0
                      ? "#dc2626"
                      : estimatedStock <=
                          minimumStock &&
                        minimumStock > 0
                      ? "#d97706"
                      : "#16a34a",
                }}
              >
                {estimatedStock} {unit}
              </strong>
            </div>
          </div>

          {minimumStock > 0 &&
            estimatedStock <= minimumStock &&
            estimatedStock >= 0 && (
              <div style={styles.warningBox}>
                ⚠ 调整后的库存已达到低库存警戒线。
                最低库存为 {minimumStock}{" "}
                {unit}。
              </div>
            )}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              调整原因
              <span style={styles.required}>
                *
              </span>
            </label>

            <input
              type="text"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setErrorMessage("");
              }}
              placeholder="例如：采购入库、内部领用、损坏报废"
              disabled={submitting}
              style={styles.input}
              maxLength={200}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              备注
              <span style={styles.optional}>
                选填
              </span>
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="可填写供应商、采购单号、盘点说明等"
              disabled={submitting}
              style={styles.textarea}
              maxLength={500}
            />
          </div>

          {errorMessage && (
            <div style={styles.errorBox}>
              ⚠ {errorMessage}
            </div>
          )}

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={styles.cancelButton}
            >
              取消
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitButton,
                backgroundColor:
                  config.buttonColor,
                opacity: submitting ? 0.65 : 1,
              }}
            >
              {submitting
                ? "正在处理..."
                : config.buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },

  modal: {
    width: "100%",
    maxWidth: "620px",
    maxHeight: "92vh",
    overflowY: "auto",
    backgroundColor: "#ffffff",
    borderRadius: "22px",
    boxShadow:
      "0 30px 80px rgba(15, 23, 42, 0.28)",
    padding: "28px",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "22px",
  },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "26px",
    fontWeight: 800,
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  closeButton: {
    width: "40px",
    height: "40px",
    border: "none",
    borderRadius: "12px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontSize: "25px",
    cursor: "pointer",
  },

  productCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    padding: "18px",
    marginBottom: "22px",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    backgroundColor: "#f8fafc",
  },

  productName: {
    color: "#0f172a",
    fontSize: "18px",
    fontWeight: 800,
  },

  productCode: {
    marginTop: "5px",
    color: "#64748b",
    fontSize: "13px",
  },

  stockBox: {
    minWidth: "120px",
    padding: "12px 15px",
    borderRadius: "13px",
    textAlign: "right",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
  },

  stockLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    marginBottom: "4px",
  },

  stockNumber: {
    color: "#0f172a",
    fontSize: "18px",
  },

  formGroup: {
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
  },

  required: {
    color: "#dc2626",
    marginLeft: "4px",
  },

  optional: {
    marginLeft: "8px",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: 500,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    height: "48px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "0 14px",
    outline: "none",
    fontSize: "15px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },

  textarea: {
    width: "100%",
    minHeight: "92px",
    boxSizing: "border-box",
    resize: "vertical",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "13px 14px",
    outline: "none",
    fontSize: "15px",
    fontFamily: "inherit",
    color: "#0f172a",
  },

  previewCard: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "14px",
    padding: "16px",
    marginBottom: "18px",
    backgroundColor: "#f8fafc",
    borderRadius: "14px",
  },

  previewItem: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    color: "#64748b",
    fontSize: "13px",
  },

  arrow: {
    color: "#94a3b8",
    fontSize: "23px",
    fontWeight: 700,
  },

  warningBox: {
    padding: "12px 14px",
    marginBottom: "18px",
    border: "1px solid #fbbf24",
    borderRadius: "12px",
    backgroundColor: "#fffbeb",
    color: "#92400e",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  errorBox: {
    padding: "12px 14px",
    marginBottom: "18px",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    paddingTop: "6px",
  },

  cancelButton: {
    minWidth: "110px",
    height: "46px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  submitButton: {
    minWidth: "140px",
    height: "46px",
    border: "none",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 8px 20px rgba(15, 23, 42, 0.14)",
  },
};