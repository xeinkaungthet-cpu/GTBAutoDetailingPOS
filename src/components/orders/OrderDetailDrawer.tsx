type Props = {
  open: boolean;
  order: any;
  items: any[];
  onClose: () => void;
  onStatusChange?: (status: string) => void;
};

function OrderDetailDrawer({
  open,
  order,
  items,
  onClose,
}: Props) {
  if (!open || !order) return null;

  return (
    <div style={overlay}>
      <div style={drawer}>
        <div style={header}>
          <div>
            <h2 style={{ margin: 0 }}>
              订单详情 / Order Detail
            </h2>

            <p style={orderNo}>
              {order.order_no}
            </p>
          </div>

          <button
            onClick={onClose}
            style={closeBtn}
          >
            ✕
          </button>
        </div>

        <hr />

        <h3>客户资料</h3>

        <p>
          👤 {order.members?.name}
        </p>

        <p>
          📞 {order.members?.phone}
        </p>

        <hr />

        <h3>车辆资料</h3>

        <p>
          🚗 {order.vehicles?.plate_number}
        </p>

        <p>
          {order.vehicles?.brand}{" "}
          {order.vehicles?.model}
        </p>

        <hr />

        <h3>服务项目</h3>

        {items.map((item: any) => (
          <div
            key={item.id}
            style={itemCard}
          >
            <strong>
              {item.services?.service_name ||
                item.products?.product_name}
            </strong>

            <p>
              数量：{item.quantity}
            </p>

            <p>
              单价：￥{item.unit_price}
            </p>

            <h4>
              ￥{item.total}
            </h4>
          </div>
        ))}

        <hr />

        <h2>
          合计：
          <span style={{ color: "#16a34a" }}>
            ￥{order.total}
          </span>
        </h2>

        <div style={buttonRow}>
          <button
            style={printBtn}
            onClick={() => window.print()}
          >
            🖨 打印订单
          </button>

          <button
            style={emailBtn}
          >
            📧 Email 收据
          </button>

          <button
            style={inspectionBtn}
          >
            🚗 查看验车
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 9999,
};

const drawer = {
  width: 560,
  background: "#fff",
  height: "100%",
  padding: 24,
  overflowY: "auto" as const,
};

const header = {
  display: "flex",
  justifyContent: "space-between",
};

const orderNo = {
  color: "#64748b",
};

const closeBtn = {
  width: 42,
  height: 42,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};

const itemCard = {
  padding: 15,
  borderRadius: 12,
  background: "#f8fafc",
  marginBottom: 12,
};

const buttonRow = {
  display: "flex",
  gap: 10,
  marginTop: 25,
};

const printBtn = {
  flex: 1,
  padding: 12,
};

const emailBtn = {
  flex: 1,
  padding: 12,
};

const inspectionBtn = {
  flex: 1,
  padding: 12,
};

export default OrderDetailDrawer;