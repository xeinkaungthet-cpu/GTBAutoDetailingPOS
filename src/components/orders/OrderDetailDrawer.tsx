import { useState } from "react";
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
  const [
    sendingEmail,
    setSendingEmail,
  ] = useState(false);

  async function sendReceiptEmail() {
    if (sendingEmail) {
      return;
    }

    const savedEmail =
      order.members?.email?.trim();

    const customerEmail =
      savedEmail ||
      window.prompt(
        "请输入客户邮箱 / Customer Email"
      )?.trim();

    if (!customerEmail) {
      alert("客户邮箱不能为空");
      return;
    }

    setSendingEmail(true);

    try {
      const receiptItems =
        items.map((item: any) => {
          const packageServices =
            item.packages
              ?.package_services
              ?.slice()
              .sort(
                (a: any, b: any) =>
                  Number(
                    a.sort_order || 0
                  ) -
                  Number(
                    b.sort_order || 0
                  )
              )
              .map(
                (
                  packageService: any
                ) =>
                  packageService.services
                    ?.service_name
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
            "订单项目";

          const itemType =
            item.packages
              ? "package"
              : item.services
                ? "service"
                : "product";

          return {
            name: itemName,

            nameEn:
              item.packages
                ?.package_name_en ??
              item.services
                ?.service_name_en ??
              null,

            itemType,

            quantity:
              Number(
                item.quantity
              ) || 1,

            unitPrice:
              Number(
                item.unit_price
              ) || 0,

            total:
              Number(
                item.total
              ) || 0,

            includedServices:
              packageServices,
          };
        });

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "send-receipt-email",
          {
            body: {
              to: customerEmail,

              order: {
                orderNo:
                  order.order_no,

                customerName:
                  order.members
                    ?.name ||
                  "Customer",

                customerPhone:
                  order.members
                    ?.phone ||
                  null,

                vehiclePlate:
                  order.vehicles
                    ?.plate_number ||
                  null,

                vehicleName: [
                  order.vehicles
                    ?.brand,
                  order.vehicles
                    ?.model,
                ]
                  .filter(Boolean)
                  .join(" "),

                subtotal:
                  Number(
                    order.subtotal
                  ) || 0,

                discount:
                  Number(
                    order.discount
                  ) || 0,

                total:
                  Number(
                    order.total
                  ) || 0,

                paymentMethod:
                  order.payment_method ||
                  "",

                createdAt:
                  order.created_at ||
                  null,
              },

              items:
                receiptItems,
            },
          }
        );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "邮件发送失败"
        );
      }

      alert(
        `收据已发送到：${customerEmail}`
      );
    } catch (error: unknown) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "邮件发送失败"
      );
    } finally {
      setSendingEmail(false);
    }
  }

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

    {items.map((item: any) => {
  const packageServices =
    item.packages?.package_services
      ?.slice()
      .sort(
        (a: any, b: any) =>
          Number(a.sort_order || 0) -
          Number(b.sort_order || 0)
      )
      .map(
        (packageService: any) =>
          packageService.services?.service_name
      )
      .filter(Boolean) ?? [];

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

  return (
    <div
      key={item.id}
      style={itemCard}
    >
      <strong>
        {item.packages ? "🔥 " : ""}
        {itemName}
      </strong>

      {item.packages?.package_name_en && (
        <p>
          {item.packages.package_name_en}
        </p>
      )}

      <p>
        类型：{itemType}
      </p>

      {item.packages &&
        packageServices.length > 0 && (
          <p>
            包含服务：
            {packageServices.join("、")}
          </p>
        )}

      <p>
        数量：{item.quantity || 1}
      </p>

      <p>
        单价：￥{Number(
          item.unit_price || 0
        ).toLocaleString()}
      </p>

      <h4>
        ￥{Number(
          item.total || 0
        ).toLocaleString()}
      </h4>
    </div>
  );
})}

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
  type="button"
  style={{
    ...emailBtn,

    cursor:
      sendingEmail
        ? "not-allowed"
        : "pointer",

    opacity:
      sendingEmail
        ? 0.65
        : 1,
  }}
  disabled={sendingEmail}
  onClick={
    sendReceiptEmail
  }
>
  {sendingEmail
    ? "正在发送..."
    : "📧 Email 收据"}
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