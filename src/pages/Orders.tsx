import { useEffect, useMemo, useState } from "react";
import { OrderService } from "../services/orderService";
import { formatCurrency } from "../utils/currency";
type OrderRecord = {
  id: number;
  order_no: string;
  member_id?: number;
  vehicle_id?: number;
  subtotal?: number | string;
  discount?: number | string;
  total?: number | string;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  notes?: string;
  created_at?: string;

  members?: {
    id?: number;
    name?: string;
    phone?: string;
  } | null;

  vehicles?: {
    id?: number;
    plate_number?: string;
    brand?: string;
    model?: string;
    color?: string;
  } | null;
};

type OrderItem = {
  id: number;
  order_id: number;

  service_id?: number | null;
  product_id?: number | null;
  package_id?: number | null;

  quantity?: number;

  unit_price?: number | string;
  discount?: number | string;
  total?: number | string;

  services?: {
    id?: number;
    service_name?: string;
    category?: string;
    price?: number | string;
    duration_minutes?: number;
    image_url?: string;
  } | null;

  products?: {
    id?: number;
    product_name?: string;
    name?: string;
    sku?: string;
  } | null;

  packages?: {
    id?: number;

    package_name?: string;
    package_name_en?: string | null;

    description?: string | null;
    description_en?: string | null;

    original_price?: number | string;
    package_price?: number | string;

    estimated_minutes?: number;
    image_url?: string | null;

    package_services?: Array<{
      id?: number;
      service_id?: number;
      sort_order?: number;

      services?: {
        id?: number;
        service_name?: string;
        category?: string;
        price?: number | string;
        duration_minutes?: number;
      } | null;
    }>;
  } | null;
};

const statusOptions = [
  {
    value: "pending",
    label: "待处理 / Pending",
    color: "#b45309",
    background: "#fef3c7",
  },
  {
    value: "confirmed",
    label: "已确认 / Confirmed",
    color: "#1d4ed8",
    background: "#dbeafe",
  },
  {
    value: "in_progress",
    label: "施工中 / In Progress",
    color: "#6d28d9",
    background: "#ede9fe",
  },
  {
    value: "completed",
    label: "已完成 / Completed",
    color: "#15803d",
    background: "#dcfce7",
  },
  {
    value: "cancelled",
    label: "已取消 / Cancelled",
    color: "#b91c1c",
    background: "#fee2e2",
  },
];

function Orders() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<OrderRecord | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function loadOrders() {
    setLoading(true);

    try {
      const data = await OrderService.getAll();
      setOrders(data as OrderRecord[]);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function viewOrder(order: OrderRecord) {
    setSelectedOrder(order);
    setItems([]);
    setDetailsLoading(true);

    try {
      const data = await OrderService.getItems(order.id);
      setItems(data as OrderItem[]);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeOrderDetails() {
    setSelectedOrder(null);
    setItems([]);
  }

  async function changeOrderStatus(status: string) {
    if (!selectedOrder || updatingStatus) return;

    setUpdatingStatus(true);

    try {
      await OrderService.updateStatus(
        selectedOrder.id,
        status
      );

      const updatedOrder = {
        ...selectedOrder,
        status,
      };

      setSelectedOrder(updatedOrder);

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === selectedOrder.id
            ? {
                ...order,
                status,
              }
            : order
        )
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error));
      console.error(error);
    } finally {
      setUpdatingStatus(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((order) => {
      const searchableText = [
        order.order_no,
        order.members?.name,
        order.members?.phone,
        order.vehicles?.plate_number,
        order.vehicles?.brand,
        order.vehicles?.model,
        order.payment_method,
        order.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const completedCount = orders.filter(
    (order) => order.status === "completed"
  ).length;

  const pendingCount = orders.filter(
    (order) =>
      order.status === "pending" ||
      order.status === "confirmed"
  ).length;

  const totalRevenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

  return (
    <div>
      <div style={pageHeader}>
        <div>
          <p style={eyebrow}>GTB AUTO DETAILING</p>

          <h1 style={pageTitle}>
            订单记录 / Order Management
          </h1>

          <p style={pageDescription}>
            查看客户订单、服务明细、付款资料和订单状态
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          style={{
            ...refreshButton,
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? "载入中..." : "↻ 刷新订单"}
        </button>
      </div>

      <div style={summaryGrid}>
        <SummaryCard
          icon="🧾"
          label="全部订单 / Total"
          value={String(orders.length)}
        />

        <SummaryCard
          icon="⏳"
          label="待处理 / Pending"
          value={String(pendingCount)}
        />

        <SummaryCard
          icon="✅"
          label="已完成 / Completed"
          value={String(completedCount)}
        />

        <SummaryCard
          icon="💰"
          label="订单总额 / Revenue"
          value={formatCurrency(totalRevenue)}
        />
      </div>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="🔍 搜索订单号、客户、电话、车牌或车型"
          style={searchInput}
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          style={filterSelect}
        >
          <option value="all">
            全部状态 / All Status
          </option>

          {statusOptions.map((status) => (
            <option
              key={status.value}
              value={status.value}
            >
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={emptyState}>
          正在加载订单资料...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 52 }}>🧾</div>

          <h2>暂无订单</h2>

          <p style={emptyDescription}>
            POS 收银完成的订单会自动显示在这里。
          </p>
        </div>
      ) : (
        <div style={tableCard}>
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={tableHeader}>订单号</th>
                  <th style={tableHeader}>客户</th>
                  <th style={tableHeader}>车辆</th>
                  <th style={tableHeader}>金额</th>
                  <th style={tableHeader}>付款方式</th>
                  <th style={tableHeader}>状态</th>
                  <th style={tableHeader}>订单时间</th>
                  <th style={tableHeader}>操作</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const status = getStatusInfo(
                    order.status
                  );

                  return (
                    <tr key={order.id}>
                      <td style={tableCell}>
                        <strong style={orderNumber}>
                          {order.order_no}
                        </strong>
                      </td>

                      <td style={tableCell}>
                        <strong>
                          {order.members?.name ||
                            "未关联客户"}
                        </strong>

                        <p style={secondaryText}>
                          {order.members?.phone || "-"}
                        </p>
                      </td>

                      <td style={tableCell}>
                        <strong>
                          {order.vehicles?.plate_number ||
                            "未关联车辆"}
                        </strong>

                        <p style={secondaryText}>
                          {[
                            order.vehicles?.brand,
                            order.vehicles?.model,
                          ]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </p>
                      </td>

                      <td style={tableCell}>
                        <strong style={amountText}>
                          {formatCurrency(order.total)}
                        </strong>
                      </td>

                      <td style={tableCell}>
                        <span style={paymentBadge}>
                          {getPaymentLabel(
                            order.payment_method
                          )}
                        </span>
                      </td>

                      <td style={tableCell}>
                        <span
                          style={{
                            ...statusBadge,
                            color: status.color,
                            background: status.background,
                          }}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td style={tableCell}>
                        {formatDateTime(
                          order.created_at
                        )}
                      </td>

                      <td style={tableCell}>
                        <button
                          type="button"
                          onClick={() =>
                            viewOrder(order)
                          }
                          style={viewButton}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div
          style={modalBackground}
          onClick={closeOrderDetails}
        >
          <div
            style={modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeader}>
              <div>
                <p style={modalEyebrow}>
                  ORDER DETAILS
                </p>

                <h2 style={modalTitle}>
                  订单详情
                </h2>

                <p style={modalOrderNumber}>
                  {selectedOrder.order_no}
                </p>
              </div>

              <button
                type="button"
                onClick={closeOrderDetails}
                style={closeButton}
                aria-label="关闭订单详情"
              >
                ×
              </button>
            </div>

            <div style={modalStatusRow}>
              <span
                style={{
                  ...statusBadge,
                  color: getStatusInfo(
                    selectedOrder.status
                  ).color,
                  background: getStatusInfo(
                    selectedOrder.status
                  ).background,
                }}
              >
                {
                  getStatusInfo(
                    selectedOrder.status
                  ).label
                }
              </span>

              <span style={modalDate}>
                {formatDateTime(
                  selectedOrder.created_at
                )}
              </span>
            </div>

            <div style={detailGrid}>
              <DetailCard
                icon="👤"
                title="客户 / Customer"
                primary={
                  selectedOrder.members?.name ||
                  "未关联客户"
                }
                secondary={
                  selectedOrder.members?.phone || "-"
                }
              />

              <DetailCard
                icon="🚘"
                title="车辆 / Vehicle"
                primary={
                  selectedOrder.vehicles
                    ?.plate_number || "未关联车辆"
                }
                secondary={
                  [
                    selectedOrder.vehicles?.brand,
                    selectedOrder.vehicles?.model,
                    selectedOrder.vehicles?.color,
                  ]
                    .filter(Boolean)
                    .join(" ") || "-"
                }
              />

              <DetailCard
                icon="💳"
                title="付款方式 / Payment"
                primary={getPaymentLabel(
                  selectedOrder.payment_method
                )}
                secondary={
                  selectedOrder.payment_status ||
                  "-"
                }
              />

              <DetailCard
                icon="📋"
                title="订单状态 / Status"
                primary={
                  getStatusInfo(
                    selectedOrder.status
                  ).label
                }
                secondary={
                  selectedOrder.notes ||
                  "没有订单备注"
                }
              />
            </div>

            <section style={itemsSection}>
              <div style={sectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    ORDER ITEMS
                  </p>

                  <h3 style={sectionTitle}>
                    服务与产品明细
                  </h3>
                </div>

                <span style={itemCountBadge}>
                  {items.length} 项
                </span>
              </div>

              {detailsLoading ? (
                <div style={itemsEmpty}>
                  正在加载订单项目...
                </div>
              ) : items.length === 0 ? (
                <div style={itemsEmpty}>
                  此订单没有项目明细
                </div>
              ) : (
                <div style={itemList}>
                 {items.map((item) => {
  const packageServices =
    item.packages?.package_services
      ?.slice()
      .sort(
        (a, b) =>
          Number(a.sort_order || 0) -
          Number(b.sort_order || 0)
      )
      .map(
        (packageService) =>
          packageService.services?.service_name
      )
      .filter(
        (serviceName): serviceName is string =>
          Boolean(serviceName)
      ) ?? [];

  const itemName =
    item.packages?.package_name ||
    item.services?.service_name ||
    item.products?.product_name ||
    item.products?.name ||
    "订单项目";

  const itemType = item.packages
    ? "套餐 / Package"
    : item.services
      ? "服务 / Service"
      : "产品 / Product";

  const itemEmoji = item.packages
    ? "🔥"
    : item.services
      ? "✨"
      : "📦";

  return (
    <div
      key={item.id}
      style={itemRow}
    >
      <div style={itemIcon}>
        {itemEmoji}
      </div>

      <div style={{ flex: 1 }}>
        <strong style={itemNameStyle}>
          {itemName}
        </strong>

        {item.packages?.package_name_en && (
          <p style={itemMeta}>
            {item.packages.package_name_en}
          </p>
        )}

        <p style={itemMeta}>
          {itemType} · 数量{" "}
          {item.quantity || 1}
        </p>

        {item.packages &&
          packageServices.length > 0 && (
            <p style={itemMeta}>
              包含服务：
              {packageServices.join("、")}
            </p>
          )}

        <p style={itemUnitPrice}>
          单价：
          {formatCurrency(item.unit_price)}
        </p>
      </div>

      <strong style={itemTotal}>
        {formatCurrency(item.total)}
      </strong>
    </div>
  );
})}
                </div>
              )}
            </section>

            <div style={priceSummary}>
              <div style={priceRow}>
                <span>小计 / Subtotal</span>

                <strong>
                  {formatCurrency(
                    selectedOrder.subtotal
                  )}
                </strong>
              </div>

              <div style={priceRow}>
                <span>折扣 / Discount</span>

                <strong>
                  -{" "}
                  {formatCurrency(
                    selectedOrder.discount
                  )}
                </strong>
              </div>

              <div style={totalPriceRow}>
                <span>总金额 / Total</span>

                <strong style={totalPrice}>
                  {formatCurrency(
                    selectedOrder.total
                  )}
                </strong>
              </div>
            </div>

            <div style={statusUpdateSection}>
              <label style={statusUpdateLabel}>
                修改订单状态 / Update Status
              </label>

              <select
                value={
                  selectedOrder.status || "pending"
                }
                disabled={updatingStatus}
                onChange={(event) =>
                  changeOrderStatus(
                    event.target.value
                  )
                }
                style={statusSelect}
              >
                {statusOptions.map((status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ))}
              </select>

              {updatingStatus && (
                <p style={savingText}>
                  正在保存状态...
                </p>
              )}
            </div>

            <div style={modalActions}>
              <button
                type="button"
                onClick={() => window.print()}
                style={secondaryButton}
              >
                🖨 打印订单
              </button>

              <button
                type="button"
                onClick={closeOrderDetails}
                style={primaryButton}
              >
                完成查看
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div style={summaryCard}>
      <span style={summaryIcon}>{icon}</span>

      <div>
        <p style={summaryLabel}>{label}</p>

        <strong style={summaryValue}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function DetailCard({
  icon,
  title,
  primary,
  secondary,
}: {
  icon: string;
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div style={detailCard}>
      <div style={detailIcon}>{icon}</div>

      <div>
        <p style={detailTitle}>{title}</p>

        <strong style={detailPrimary}>
          {primary}
        </strong>

        <p style={detailSecondary}>
          {secondary}
        </p>
      </div>
    </div>
  );
}

function getStatusInfo(status?: string) {
  return (
    statusOptions.find(
      (option) => option.value === status
    ) || {
      value: status || "unknown",
      label: status || "未知 / Unknown",
      color: "#475569",
      background: "#f1f5f9",
    }
  );
}

function getPaymentLabel(method?: string) {
  const labels: Record<string, string> = {
    cash: "现金 / Cash",
    card: "银行卡 / Card",
    tng: "Touch 'n Go",
    bank_transfer: "银行转账 / Bank Transfer",
  };

  return method
    ? labels[method] || method
    : "-";
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "读取订单失败，请稍后重试";
}

const pageHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  marginBottom: 24,
};

const eyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.4,
};

const pageTitle = {
  margin: "5px 0 0",
  color: "#111827",
  fontSize: 35,
};

const pageDescription = {
  margin: "8px 0 0",
  color: "#6b7280",
};

const refreshButton = {
  padding: "12px 18px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 800,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 16,
  marginBottom: 22,
};

const summaryCard = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: 20,
  borderRadius: 18,
  background: "#fff",
  boxShadow:
    "0 10px 25px rgba(15,23,42,.07)",
};

const summaryIcon = {
  width: 48,
  height: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: 14,
  background: "#eff6ff",
  fontSize: 23,
};

const summaryLabel = {
  margin: 0,
  color: "#6b7280",
  fontSize: 12,
};

const summaryValue = {
  display: "block",
  marginTop: 4,
  color: "#111827",
  fontSize: 25,
};

const toolbar = {
  display: "flex",
  gap: 12,
  marginBottom: 22,
};

const searchInput = {
  flex: 1,
  padding: "13px 15px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  fontSize: 15,
};

const filterSelect = {
  minWidth: 220,
  padding: "13px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  fontSize: 14,
};

const tableCard = {
  overflow: "hidden",
  borderRadius: 20,
  background: "#fff",
  boxShadow:
    "0 10px 30px rgba(15,23,42,.08)",
};

const tableWrapper = {
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  minWidth: 1050,
  borderCollapse: "collapse" as const,
};

const tableHeader = {
  padding: "15px 16px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#475569",
  textAlign: "left" as const,
  fontSize: 12,
  fontWeight: 900,
};

const tableCell = {
  padding: "16px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
  fontSize: 13,
  verticalAlign: "middle" as const,
};

const orderNumber = {
  color: "#2563eb",
  whiteSpace: "nowrap" as const,
};

const secondaryText = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: 11,
};

const amountText = {
  color: "#111827",
  fontSize: 15,
  whiteSpace: "nowrap" as const,
};

const paymentBadge = {
  display: "inline-block",
  padding: "6px 9px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  whiteSpace: "nowrap" as const,
  fontSize: 11,
  fontWeight: 800,
};

const statusBadge = {
  display: "inline-block",
  padding: "7px 10px",
  borderRadius: 999,
  whiteSpace: "nowrap" as const,
  fontSize: 10,
  fontWeight: 900,
};

const viewButton = {
  padding: "9px 12px",
  border: "none",
  borderRadius: 10,
  background: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontWeight: 800,
};

const emptyState = {
  padding: 60,
  borderRadius: 20,
  background: "#fff",
  textAlign: "center" as const,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.06)",
};

const emptyDescription = {
  color: "#6b7280",
};

const modalBackground = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(15,23,42,.65)",
  backdropFilter: "blur(7px)",
};

const modal = {
  width: "min(880px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto" as const,
  boxSizing: "border-box" as const,
  padding: 28,
  borderRadius: 25,
  background: "#fff",
  boxShadow:
    "0 30px 90px rgba(0,0,0,.3)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
};

const modalEyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1.4,
};

const modalTitle = {
  margin: "5px 0 0",
  color: "#111827",
  fontSize: 28,
};

const modalOrderNumber = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 700,
};

const closeButton = {
  width: 38,
  height: 38,
  border: "none",
  borderRadius: 12,
  background: "#f1f5f9",
  color: "#334155",
  cursor: "pointer",
  fontSize: 24,
};

const modalStatusRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 20,
  paddingBottom: 18,
  borderBottom: "1px solid #e5e7eb",
};

const modalDate = {
  color: "#64748b",
  fontSize: 12,
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 14,
  marginTop: 20,
};

const detailCard = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: 15,
  borderRadius: 15,
  background: "#f8fafc",
  border: "1px solid #eef2f7",
};

const detailIcon = {
  width: 39,
  height: 39,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: 11,
  background: "#e0e7ff",
  fontSize: 19,
};

const detailTitle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 800,
};

const detailPrimary = {
  display: "block",
  marginTop: 5,
  color: "#1f2937",
  fontSize: 14,
};

const detailSecondary = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 11,
  overflowWrap: "anywhere" as const,
};

const itemsSection = {
  marginTop: 22,
  padding: 18,
  borderRadius: 17,
  border: "1px solid #e2e8f0",
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
};

const sectionEyebrow = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 1.2,
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#111827",
  fontSize: 18,
};

const itemCountBadge = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 800,
};

const itemList = {
  display: "grid",
  gap: 11,
  marginTop: 16,
};

const itemRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 13,
  borderRadius: 13,
  background: "#f8fafc",
};

const itemIcon = {
  width: 38,
  height: 38,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 11,
  background: "#fff",
  fontSize: 18,
};

const itemNameStyle = {
  color: "#1f2937",
  fontSize: 14,
};

const itemMeta = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 11,
};

const itemUnitPrice = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: 10,
};

const itemTotal = {
  color: "#1d4ed8",
  whiteSpace: "nowrap" as const,
  fontSize: 14,
};

const itemsEmpty = {
  marginTop: 14,
  padding: 25,
  borderRadius: 13,
  background: "#f8fafc",
  color: "#64748b",
  textAlign: "center" as const,
};

const priceSummary = {
  display: "grid",
  gap: 11,
  marginTop: 20,
  padding: 18,
  borderRadius: 16,
  background: "#f8fafc",
};

const priceRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
  color: "#64748b",
  fontSize: 13,
};

const totalPriceRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  paddingTop: 13,
  borderTop: "1px solid #dbe3ee",
  color: "#111827",
  fontSize: 16,
  fontWeight: 900,
};

const totalPrice = {
  color: "#16a34a",
  fontSize: 24,
};

const statusUpdateSection = {
  marginTop: 20,
};

const statusUpdateLabel = {
  display: "block",
  marginBottom: 8,
  color: "#374151",
  fontSize: 12,
  fontWeight: 800,
};

const statusSelect = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid #d1d5db",
  borderRadius: 11,
  background: "#fff",
  fontSize: 13,
};

const savingText = {
  margin: "7px 0 0",
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 700,
};

const modalActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 22,
};

const secondaryButton = {
  padding: 13,
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 800,
};

const primaryButton = {
  padding: 13,
  border: "none",
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

export default Orders;