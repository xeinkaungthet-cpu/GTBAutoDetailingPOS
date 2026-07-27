import useCurrency from "../../hooks/useCurrency";

export type PosCartItem = {
  key: string;
  itemType: "service" | "package" | "product";

  serviceId: number | null;
  packageId: number | null;
  productId: number | null;

  name: string;
  nameEn?: string | null;

  price: number;
  originalPrice?: number | null;

  includedServices?: string[];

  sku?: string | null;
  unit?: string | null;
  stockQty?: number | null;
  maxQuantity?: number | null;

  vehicleSizeCode?: "small" | "medium" | "suv" | "large" | null;
  vehicleSizeName?: string | null;
  vehicleSizeNameEn?: string | null;
  vehicleSizeIcon?: string | null;

  coatingOptionId?: number | null;
  coatingOptionName?: string | null;
  coatingDurationYears?: number | null;
  coatingDurationUnit?: "month" | "year" | string | null;
  coatingProductName?: string | null;
  coatingPrice?: number | null;

  quantity: number;
};

type Props = {
  cart: PosCartItem[];

  discount: number;
  paymentMethod: string;

  subtotal: number;
  total: number;

  checkingOut: boolean;

  onDiscountChange: (value: number) => void;
  onPaymentMethodChange: (value: string) => void;
  onUpdateQuantity: (itemKey: string, quantity: number) => void;
  onRemove: (itemKey: string) => void;
  onCheckout: () => void;
};

function ShoppingCart({
  cart,
  discount,
  paymentMethod,
  subtotal,
  total,
  checkingOut,
  onDiscountChange,
  onPaymentMethodChange,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: Props) {
  const { formatMoney } = useCurrency();

  return (
    <aside style={card}>
      <div style={cartHeader}>
        <div>
          <p style={eyebrow}>ACTIVE ORDER</p>
          <h2 style={heading}>购物车 / Cart</h2>
        </div>

        <span style={itemCountBadge}>
          {cart.reduce((sum, item) => sum + item.quantity, 0)} ITEMS
        </span>
      </div>

      <div style={secureNotice}>
        <span>🔒</span>
        <span>GTB1N Secure Checkout</span>
      </div>

      {cart.length === 0 ? (
        <div style={emptyCart}>
          <span style={emptyIcon}>🛒</span>
          <p style={emptyText}>购物车为空</p>
        </div>
      ) : (
        <div style={cartList}>
          {cart.map((item) => {
            const itemSubtotal = Number(item.price) * item.quantity;
            const maxQuantity = normalizeMaximum(item.maxQuantity);
            const reachedStockLimit =
              item.itemType === "product" &&
              maxQuantity !== null &&
              item.quantity >= maxQuantity;

            const showOriginalPrice =
              item.itemType === "package" &&
              Number(item.originalPrice || 0) > Number(item.price);

            const badge = getItemBadge(item.itemType);

            return (
              <div key={item.key} style={cartRow}>
                <div style={itemInfo}>
                  <div style={titleRow}>
                    <span style={badge.style}>{badge.label}</span>
                    <strong style={itemName}>{item.name}</strong>
                  </div>

                  {item.nameEn && <p style={englishName}>{item.nameEn}</p>}

                  {item.itemType === "service" && item.vehicleSizeName && (
                    <div style={serviceOptionMeta}>
                      <span>
                        {item.vehicleSizeIcon || "🚗"} 车型：{item.vehicleSizeName}
                        {item.vehicleSizeNameEn ? ` / ${item.vehicleSizeNameEn}` : ""}
                      </span>

                      {item.coatingOptionId && (
                        <span>
                          🛡️ {formatCoatingDuration(item)}
                          {item.coatingOptionName ? ` · ${item.coatingOptionName}` : ""}
                        </span>
                      )}

                      {item.coatingProductName && (
                        <span>药剂：{item.coatingProductName}</span>
                      )}
                    </div>
                  )}

                  {item.itemType === "product" && (
                    <div style={productMeta}>
                      {item.sku && <span>SKU: {item.sku}</span>}
                      <span>
                        库存：{maxQuantity ?? Number(item.stockQty ?? 0)}
                        {item.unit ? ` ${item.unit}` : ""}
                      </span>
                    </div>
                  )}

                  <div style={priceRow}>
                    <span style={unitPrice}>
                      {formatMoney(Number(item.price))}
                    </span>

                    {showOriginalPrice && (
                      <span style={originalPrice}>
                        {formatMoney(Number(item.originalPrice))}
                      </span>
                    )}
                  </div>

                  <p style={itemSubtotalText}>
                    Subtotal: {formatMoney(itemSubtotal)}
                  </p>

                  {reachedStockLimit && (
                    <p style={stockLimitText}>已达到当前库存上限</p>
                  )}
                </div>

                <div style={actions}>
                  <div style={qtyBox}>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(item.key, item.quantity - 1)
                      }
                      style={qtyButton}
                      disabled={checkingOut}
                    >
                      −
                    </button>

                    <span style={quantityText}>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(item.key, item.quantity + 1)
                      }
                      style={{
                        ...qtyButton,
                        opacity: checkingOut || reachedStockLimit ? 0.45 : 1,
                        cursor:
                          checkingOut || reachedStockLimit
                            ? "not-allowed"
                            : "pointer",
                      }}
                      disabled={checkingOut || reachedStockLimit}
                      title={
                        reachedStockLimit ? "产品数量不能超过当前库存" : undefined
                      }
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(item.key)}
                    style={removeButton}
                    disabled={checkingOut}
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <hr style={divider} />

      <label style={fieldLabel}>折扣 / Discount</label>

      <input
        type="number"
        min="0"
        step="0.01"
        value={discount}
        onChange={(event) => onDiscountChange(Number(event.target.value))}
        style={input}
        disabled={checkingOut}
      />

      <label style={fieldLabel}>付款方式 / Payment</label>

      <select
        value={paymentMethod}
        onChange={(event) => onPaymentMethodChange(event.target.value)}
        style={input}
        disabled={checkingOut}
      >
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="tng">Touch &apos;n Go</option>
        <option value="bank_transfer">Bank Transfer</option>
      </select>

      <div style={summary}>
        <div style={summaryRow}>
          <span>Subtotal</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>

        <div style={summaryRow}>
          <span>Discount</span>
          <strong>−{formatMoney(discount)}</strong>
        </div>

        <div style={totalRow}>
          <span>Total</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={checkingOut || cart.length === 0}
        style={{
          ...checkoutButton,
          opacity: checkingOut || cart.length === 0 ? 0.55 : 1,
          cursor:
            checkingOut || cart.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        {checkingOut ? "正在结账..." : "结账 / Checkout"}
      </button>
    </aside>
  );
}

function formatCoatingDuration(item: PosCartItem) {
  const amount = Number(item.coatingDurationYears ?? 0);

  if (!amount) {
    return "镀晶方案";
  }

  return item.coatingDurationUnit === "year"
    ? `${amount} 年`
    : `${amount} 个月`;
}

function normalizeMaximum(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return Math.max(0, Math.floor(numberValue));
}

function getItemBadge(itemType: PosCartItem["itemType"]) {
  if (itemType === "package") {
    return {
      label: "🔥 套餐",
      style: packageBadge,
    };
  }

  if (itemType === "product") {
    return {
      label: "🧴 产品",
      style: productBadge,
    };
  }

  return {
    label: "服务",
    style: serviceBadge,
  };
}

const card = {
  position: "sticky" as const,
  top: 18,
  minWidth: 0,
  padding: 22,
  border: "1px solid #d9e0ea",
  borderRadius: 22,
  background:
    "linear-gradient(180deg,#ffffff 0%,#fbfcfe 100%)",
  boxShadow: "0 18px 48px rgba(15,23,42,.12)",
};

const cartHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const eyebrow = {
  margin: 0,
  color: "#b88916",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: "1.35px",
};

const heading = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: 24,
  fontWeight: 950,
};

const itemCountBadge = {
  flexShrink: 0,
  padding: "7px 10px",
  borderRadius: 999,
  background: "#111827",
  color: "#f4cf61",
  fontSize: 9,
  fontWeight: 950,
};

const secureNotice = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  marginTop: 14,
  padding: "9px 11px",
  border: "1px solid #dbeafe",
  borderRadius: 11,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 10,
  fontWeight: 850,
};

const emptyCart = {
  minHeight: 120,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 14,
  background: "#f8fafc",
};

const emptyIcon = {
  fontSize: 30,
};

const emptyText = {
  margin: 0,
  color: "#6b7280",
};

const cartList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
};

const cartRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
  padding: 13,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
};

const itemInfo = {
  minWidth: 0,
};

const titleRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 7,
};

const itemName = {
  color: "#111827",
  wordBreak: "break-word" as const,
};

const packageBadge = {
  padding: "3px 7px",
  borderRadius: 999,
  color: "#9a3412",
  background: "#ffedd5",
  fontSize: 11,
  fontWeight: 900,
};

const serviceBadge = {
  padding: "3px 7px",
  borderRadius: 999,
  color: "#1d4ed8",
  background: "#dbeafe",
  fontSize: 11,
  fontWeight: 900,
};

const productBadge = {
  padding: "3px 7px",
  borderRadius: 999,
  color: "#047857",
  background: "#d1fae5",
  fontSize: 11,
  fontWeight: 900,
};

const englishName = {
  margin: "4px 0 0",
  color: "#6b7280",
  fontSize: 12,
};

const serviceOptionMeta = {
  display: "grid",
  gap: 4,
  marginTop: 8,
  padding: 9,
  borderRadius: 10,
  background: "#f5f3ff",
  color: "#5b21b6",
  fontSize: 11,
  fontWeight: 800,
};

const productMeta = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
  marginTop: 7,
  color: "#64748b",
  fontSize: 11,
};

const priceRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 7,
};

const unitPrice = {
  color: "#111827",
  fontWeight: 900,
};

const originalPrice = {
  color: "#9ca3af",
  fontSize: 12,
  textDecoration: "line-through",
};

const itemSubtotalText = {
  margin: "5px 0 0",
  color: "#374151",
  fontSize: 13,
  fontWeight: 800,
};

const stockLimitText = {
  margin: "5px 0 0",
  color: "#dc2626",
  fontSize: 11,
  fontWeight: 800,
};

const actions = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 8,
};

const qtyBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const quantityText = {
  minWidth: 20,
  textAlign: "center" as const,
  fontWeight: 900,
};

const qtyButton = {
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 8,
  background: "#e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontSize: 17,
  fontWeight: 900,
};

const removeButton = {
  padding: "7px 10px",
  border: "none",
  borderRadius: 9,
  background: "#fee2e2",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 800,
};

const divider = {
  margin: "20px 0",
  border: "none",
  borderTop: "1px solid #e5e7eb",
};

const fieldLabel = {
  display: "block",
  marginTop: 10,
  color: "#4b5563",
  fontWeight: 800,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 14,
  marginTop: 8,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  fontSize: 16,
};

const summary = {
  marginTop: 16,
  padding: 16,
  borderRadius: 14,
  background: "#f8fafc",
};

const summaryRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 9,
  color: "#475569",
};

const totalRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  paddingTop: 11,
  borderTop: "1px solid #dbe3ec",
  color: "#111827",
  fontSize: 23,
};

const checkoutButton = {
  width: "100%",
  marginTop: 18,
  padding: 18,
  border: "none",
  borderRadius: 14,
  background:
    "linear-gradient(135deg,#16a34a 0%,#059669 100%)",
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 950,
  boxShadow: "0 12px 28px rgba(22,163,74,.24)",
};

export default ShoppingCart;