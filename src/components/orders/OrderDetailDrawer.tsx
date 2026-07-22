import { useState } from "react";

import useCurrency from "../../hooks/useCurrency";
import { supabase } from "../../lib/supabase";

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
  const [sendingEmail, setSendingEmail] =
    useState(false);

  const {
    formatMoney,
    displayCurrency,
    accountingCurrency,
    currentOption,
    accountingOption,
  } = useCurrency();

  async function sendReceiptEmail() {
    if (sendingEmail) {
      return;
    }

    const savedEmail =
      order.members?.email?.trim();

    const customerEmail =
      savedEmail ||
      window
        .prompt(
          "请输入客户邮箱 / Customer Email",
        )
        ?.trim();

    if (!customerEmail) {
      alert("客户邮箱不能为空");
      return;
    }

    setSendingEmail(true);

    try {
      const receiptItems = items.map(
        (item: any) => {
          const packageServices =
            item.packages?.package_services
              ?.slice()
              .sort(
                (a: any, b: any) =>
                  Number(a.sort_order || 0) -
                  Number(b.sort_order || 0),
              )
              .map(
                (packageService: any) =>
                  packageService.services
                    ?.service_name,
              )
              .filter(Boolean) ?? [];

          const itemName =
            item.packages?.package_name ||
            item.services?.service_name ||
            item.products?.product_name ||
            item.products?.name ||
            item.item_name ||
            "订单项目";

          const itemType = item.packages
            ? "package"
            : item.services
              ? "service"
              : item.products
                ? "product"
                : String(
                    item.item_type ||
                      "product",
                  );

          return {
            name: itemName,
            nameEn:
              item.packages?.package_name_en ??
              item.services?.service_name_en ??
              null,
            itemType,
            quantity:
              Number(item.quantity) || 1,
            unitPrice:
              Number(item.unit_price) || 0,
            total:
              Number(item.total) || 0,
            includedServices:
              packageServices,
          };
        },
      );

      const { data, error } =
        await supabase.functions.invoke(
          "send-receipt-email",
          {
            body: {
              to: customerEmail,
              order: {
                orderNo: order.order_no,
                customerName:
                  order.members?.name ||
                  "Customer",
                customerPhone:
                  order.members?.phone ||
                  null,
                vehiclePlate:
                  order.vehicles
                    ?.plate_number || null,
                vehicleName: [
                  order.vehicles?.brand,
                  order.vehicles?.model,
                ]
                  .filter(Boolean)
                  .join(" "),
                subtotal:
                  Number(order.subtotal) || 0,
                discount:
                  Number(order.discount) || 0,
                total:
                  Number(order.total) || 0,
                paymentMethod:
                  order.payment_method || "",
                createdAt:
                  order.created_at || null,
              },
              items: receiptItems,
            },
          },
        );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.error || "邮件发送失败",
        );
      }

      alert(
        `收据已发送到：${customerEmail}`,
      );
    } catch (error: unknown) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "邮件发送失败",
      );
    } finally {
      setSendingEmail(false);
    }
  }

  if (!open || !order) {
    return null;
  }

  const subtotal =
    Number(order.subtotal) || 0;
  const discount =
    Number(order.discount) || 0;
  const total = Number(order.total) || 0;
  const receivedAmount =
    Number(order.received_amount) || 0;
  const changeAmount =
    Number(order.change_amount) || 0;

  return (
    <div style={overlay}>
      <div style={drawer}>
        <div style={header}>
          <div>
            <p style={eyebrow}>
              ORDER RECEIPT
            </p>

            <h2 style={title}>
              订单详情 / Order Detail
            </h2>

            <p style={orderNo}>
              {order.order_no}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={closeBtn}
            aria-label="关闭订单详情"
          >
            ✕
          </button>
        </div>

        <div style={currencyPanel}>
          <div>
            <span style={currencyLabel}>
              当前显示货币
            </span>

            <strong style={currencyValue}>
              {currentOption.code}
            </strong>
          </div>

          <div style={currencyDivider} />

          <div>
            <span style={currencyLabel}>
              账本保存货币
            </span>

            <strong style={currencyValue}>
              {accountingOption.code}
            </strong>
          </div>
        </div>

        <section style={informationSection}>
          <h3 style={sectionTitle}>客户资料</h3>

          <div style={informationGrid}>
            <InformationItem
              label="客户"
              value={
                order.members?.name || "散客"
              }
            />

            <InformationItem
              label="电话"
              value={
                order.members?.phone || "—"
              }
            />

            <InformationItem
              label="车辆"
              value={
                order.vehicles?.plate_number ||
                "未登记"
              }
            />

            <InformationItem
              label="车型"
              value={
                [
                  order.vehicles?.brand,
                  order.vehicles?.model,
                ]
                  .filter(Boolean)
                  .join(" ") || "—"
              }
            />
          </div>
        </section>

        <section style={itemsSection}>
          <div style={sectionHeader}>
            <h3 style={sectionTitle}>
              订单项目
            </h3>

            <span style={itemCount}>
              {items.length} 项
            </span>
          </div>

          {items.length === 0 ? (
            <div style={emptyItems}>
              暂无订单项目
            </div>
          ) : (
            items.map(
              (item: any, index: number) => {
                const packageServices =
                  item.packages
                    ?.package_services
                    ?.slice()
                    .sort(
                      (a: any, b: any) =>
                        Number(
                          a.sort_order || 0,
                        ) -
                        Number(
                          b.sort_order || 0,
                        ),
                    )
                    .map(
                      (
                        packageService: any,
                      ) =>
                        packageService.services
                          ?.service_name,
                    )
                    .filter(Boolean) ?? [];

                const itemName =
                  item.packages
                    ?.package_name ||
                  item.services
                    ?.service_name ||
                  item.products
                    ?.product_name ||
                  item.products?.name ||
                  item.item_name ||
                  "订单项目";

                const itemType =
                  item.packages
                    ? "套餐 / Package"
                    : item.services
                      ? "服务 / Service"
                      : "产品 / Product";

                const quantity =
                  Number(item.quantity) || 1;

                const unitPrice =
                  Number(item.unit_price) || 0;

                const itemTotal =
                  Number(item.total) ||
                  unitPrice * quantity;

                return (
                  <article
                    key={
                      item.id ??
                      `${itemName}-${index}`
                    }
                    style={itemCard}
                  >
                    <div style={itemHeader}>
                      <div>
                        <span style={itemTypeBadge}>
                          {itemType}
                        </span>

                        <strong
                          style={itemNameStyle}
                        >
                          {item.packages
                            ? "🔥 "
                            : ""}
                          {itemName}
                        </strong>
                      </div>

                      <strong
                        style={itemTotalStyle}
                      >
                        {formatMoney(itemTotal)}
                      </strong>
                    </div>

                    {item.packages
                      ?.package_name_en && (
                      <p style={itemEnglishName}>
                        {
                          item.packages
                            .package_name_en
                        }
                      </p>
                    )}

                    {item.packages &&
                      packageServices.length >
                        0 && (
                        <div
                          style={
                            includedServices
                          }
                        >
                          <strong>
                            包含服务：
                          </strong>

                          <span>
                            {packageServices.join(
                              "、",
                            )}
                          </span>
                        </div>
                      )}

                    <div style={itemMeta}>
                      <span>
                        数量：{quantity}
                      </span>

                      <span>
                        单价：
                        {formatMoney(unitPrice)}
                      </span>
                    </div>
                  </article>
                );
              },
            )
          )}
        </section>

        <section style={summaryCard}>
          <SummaryRow
            label="小计 / Subtotal"
            value={formatMoney(subtotal)}
          />

          <SummaryRow
            label="折扣 / Discount"
            value={`−${formatMoney(
              discount,
            )}`}
          />

          <div style={summaryDivider} />

          <div style={totalRow}>
            <span>合计 / Total</span>

            <strong>
              {formatMoney(total)}
            </strong>
          </div>

          {receivedAmount > 0 && (
            <>
              <div style={summaryDivider} />

              <SummaryRow
                label="实收 / Received"
                value={formatMoney(
                  receivedAmount,
                )}
              />

              <SummaryRow
                label="找零 / Change"
                value={formatMoney(
                  changeAmount,
                )}
              />
            </>
          )}

          {displayCurrency !==
            accountingCurrency && (
            <p style={currencyNote}>
              当前金额已从账本货币{" "}
              {accountingCurrency} 换算为{" "}
              {displayCurrency} 显示。数据库订单金额没有被修改。
            </p>
          )}
        </section>

        <div style={buttonRow}>
          <button
            type="button"
            style={printBtn}
            onClick={() => window.print()}
          >
            🖨 打印订单
          </button>

          <button
            type="button"
            style={{
              ...emailBtn,
              cursor: sendingEmail
                ? "not-allowed"
                : "pointer",
              opacity: sendingEmail
                ? 0.65
                : 1,
            }}
            disabled={sendingEmail}
            onClick={sendReceiptEmail}
          >
            {sendingEmail
              ? "正在发送..."
              : "📧 Email 收据"}
          </button>

          <button
            type="button"
            style={inspectionBtn}
          >
            🚗 查看验车
          </button>
        </div>
      </div>
    </div>
  );
}

function InformationItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={informationItem}>
      <span style={informationLabel}>
        {label}
      </span>

      <strong style={informationValue}>
        {value}
      </strong>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={summaryRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(15,23,42,.52)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 9999,
  backdropFilter: "blur(3px)",
};

const drawer = {
  width: 590,
  maxWidth: "100%",
  height: "100%",
  padding: 24,
  boxSizing: "border-box" as const,
  overflowY: "auto" as const,
  background: "#ffffff",
  boxShadow:
    "-18px 0 50px rgba(15,23,42,.18)",
};

const header = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const eyebrow = {
  margin: "0 0 6px",
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "1.5px",
};

const title = {
  margin: 0,
  color: "#0f172a",
  fontSize: 27,
};

const orderNo = {
  margin: "7px 0 0",
  color: "#64748b",
  fontWeight: 800,
};

const closeBtn = {
  width: 42,
  height: 42,
  flexShrink: 0,
  border: "none",
  borderRadius: 11,
  color: "#475569",
  background: "#f1f5f9",
  cursor: "pointer",
  fontSize: 17,
  fontWeight: 900,
};

const currencyPanel = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  marginTop: 20,
  padding: 14,
  borderRadius: 14,
  border: "1px solid #dbeafe",
  background:
    "linear-gradient(135deg,#eff6ff,#f8fafc)",
};

const currencyLabel = {
  display: "block",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
};

const currencyValue = {
  display: "block",
  marginTop: 3,
  color: "#0f172a",
  fontSize: 16,
};

const currencyDivider = {
  width: 1,
  height: 34,
  background: "#cbd5e1",
};

const informationSection = {
  marginTop: 22,
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 18,
};

const informationGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 12,
};

const informationItem = {
  minWidth: 0,
  padding: 12,
  borderRadius: 12,
  background: "#f8fafc",
};

const informationLabel = {
  display: "block",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
};

const informationValue = {
  display: "block",
  marginTop: 4,
  color: "#0f172a",
  overflowWrap: "anywhere" as const,
};

const itemsSection = {
  marginTop: 24,
};

const itemCount = {
  padding: "5px 9px",
  borderRadius: 999,
  color: "#1d4ed8",
  background: "#dbeafe",
  fontSize: 11,
  fontWeight: 900,
};

const emptyItems = {
  marginTop: 12,
  padding: 28,
  borderRadius: 14,
  color: "#64748b",
  background: "#f8fafc",
  textAlign: "center" as const,
};

const itemCard = {
  marginTop: 12,
  padding: 15,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow:
    "0 5px 16px rgba(15,23,42,.05)",
};

const itemHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 14,
};

const itemTypeBadge = {
  display: "block",
  width: "fit-content",
  marginBottom: 6,
  padding: "4px 7px",
  borderRadius: 999,
  color: "#475569",
  background: "#f1f5f9",
  fontSize: 10,
  fontWeight: 900,
};

const itemNameStyle = {
  color: "#0f172a",
  lineHeight: 1.4,
};

const itemTotalStyle = {
  flexShrink: 0,
  color: "#16a34a",
  fontSize: 17,
};

const itemEnglishName = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 12,
};

const includedServices = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
  marginTop: 11,
  padding: 10,
  borderRadius: 10,
  color: "#475569",
  background: "#f8fafc",
  fontSize: 12,
  lineHeight: 1.5,
};

const itemMeta = {
  display: "flex",
  flexWrap: "wrap" as const,
  justifyContent: "space-between",
  gap: 10,
  marginTop: 12,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const summaryCard = {
  marginTop: 24,
  padding: 17,
  borderRadius: 15,
  border: "1px solid #bbf7d0",
  background:
    "linear-gradient(135deg,#f0fdf4,#ffffff)",
};

const summaryRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 9,
  color: "#475569",
};

const summaryDivider = {
  height: 1,
  margin: "11px 0",
  background: "#d1fae5",
};

const totalRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  color: "#0f172a",
  fontSize: 23,
};

const currencyNote = {
  margin: "13px 0 0",
  paddingTop: 11,
  borderTop: "1px dashed #bbf7d0",
  color: "#64748b",
  fontSize: 11,
  lineHeight: 1.5,
};

const buttonRow = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginTop: 24,
};

const baseButton = {
  minHeight: 46,
  padding: "11px 9px",
  borderRadius: 11,
  cursor: "pointer",
  fontWeight: 900,
};

const printBtn = {
  ...baseButton,
  border: "1px solid #cbd5e1",
  color: "#334155",
  background: "#ffffff",
};

const emailBtn = {
  ...baseButton,
  border: "none",
  color: "#ffffff",
  background: "#2563eb",
};

const inspectionBtn = {
  ...baseButton,
  border: "none",
  color: "#ffffff",
  background: "#7c3aed",
};

export default OrderDetailDrawer;