import type { Service } from "../../types/database";

type CartItem = {
  service: Service;
  quantity: number;
};

type Props = {
  cart: CartItem[];
  discount: number;
  paymentMethod: string;
  subtotal: number;
  total: number;
  onDiscountChange: (value: number) => void;
  onPaymentMethodChange: (value: string) => void;
  onUpdateQuantity: (serviceId: number, quantity: number) => void;
  onRemove: (serviceId: number) => void;
  onCheckout: () => void;
};

function ShoppingCart({
  cart,
  discount,
  paymentMethod,
  subtotal,
  total,
  onDiscountChange,
  onPaymentMethodChange,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: Props) {
  return (
    <div style={card}>
      <h2>购物车 / Cart</h2>

      {cart.length === 0 ? (
        <p style={{ color: "#6b7280" }}>购物车为空</p>
      ) : (
        cart.map((item) => (
          <div key={item.service.id} style={cartRow}>
            <div>
              <strong>{item.service.service_name}</strong>
              <p style={{ margin: 0, color: "#6b7280" }}>
                ${Number(item.service.price).toFixed(2)}
              </p>
              <p style={{ margin: 0, fontWeight: 700 }}>
                Subtotal: $
                {(Number(item.service.price) * item.quantity).toFixed(2)}
              </p>
            </div>

            <div style={qtyBox}>
              <button
                onClick={() =>
                  onUpdateQuantity(item.service.id, item.quantity - 1)
                }
                style={qtyBtn}
              >
                -
              </button>

              <span>{item.quantity}</span>

              <button
                onClick={() =>
                  onUpdateQuantity(item.service.id, item.quantity + 1)
                }
                style={qtyBtn}
              >
                +
              </button>
            </div>

            <button
              onClick={() => onRemove(item.service.id)}
              style={removeBtn}
            >
              删除
            </button>
          </div>
        ))
      )}

      <hr />

      <label>折扣 / Discount</label>
      <input
        type="number"
        value={discount}
        onChange={(e) => onDiscountChange(Number(e.target.value))}
        style={input}
      />

      <label>付款方式 / Payment</label>
      <select
        value={paymentMethod}
        onChange={(e) => onPaymentMethodChange(e.target.value)}
        style={input}
      >
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="tng">Touch 'n Go</option>
        <option value="bank_transfer">Bank Transfer</option>
      </select>

      <div style={summary}>
        <p>Subtotal: ${subtotal.toFixed(2)}</p>
        <p>Discount: ${discount.toFixed(2)}</p>
        <h2>Total: ${total.toFixed(2)}</h2>
      </div>

      <button onClick={onCheckout} style={checkoutBtn}>
        结账 Checkout
      </button>
    </div>
  );
}

const card = {
  background: "#fff",
  padding: 24,
  borderRadius: 18,
  boxShadow: "0 10px 25px rgba(0,0,0,.08)",
};

const input = {
  width: "100%",
  padding: 14,
  marginTop: 10,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

const cartRow = {
  display: "grid",
  gridTemplateColumns: "1fr 95px 70px",
  gap: 10,
  alignItems: "center",
  marginBottom: 14,
};

const qtyBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const qtyBtn = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "none",
  background: "#e5e7eb",
  cursor: "pointer",
};

const removeBtn = {
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: "#fee2e2",
  color: "#dc2626",
  cursor: "pointer",
};

const summary = {
  marginTop: 16,
  background: "#f8fafc",
  padding: 16,
  borderRadius: 14,
};

const checkoutBtn = {
  width: "100%",
  marginTop: 18,
  padding: 18,
  border: "none",
  borderRadius: 14,
  background: "#16a34a",
  color: "#fff",
  fontSize: 20,
  cursor: "pointer",
};

export default ShoppingCart;