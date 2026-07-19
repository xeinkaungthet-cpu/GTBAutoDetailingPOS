import "@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY =
  Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

type ReceiptItem = {
  name: string;
  nameEn?: string | null;

  itemType:
    | "service"
    | "package"
    | "product";

  quantity: number;
  unitPrice: number;
  total: number;

  includedServices?: string[];
};

type ReceiptRequest = {
  to: string;

  order: {
    orderNo: string;
    customerName: string;
    customerPhone?: string | null;

    vehiclePlate?: string | null;
    vehicleName?: string | null;

    subtotal: number;
    discount: number;
    total: number;

    paymentMethod: string;
    createdAt?: string | null;
  };

  items: ReceiptItem[];
};

function escapeHtml(
  value: unknown
): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(
  value: unknown
): string {
  const numberValue =
    Number(value) || 0;

  return `￥${numberValue.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function getPaymentName(
  paymentMethod: string
): string {
  const paymentNames: Record<
    string,
    string
  > = {
    cash: "现金 / Cash",
    card: "银行卡 / Card",
    transfer:
      "银行转账 / Bank Transfer",
    qr: "二维码支付 / QR Payment",
  };

  return (
    paymentNames[paymentMethod] ||
    paymentMethod ||
    "-"
  );
}

function buildItemsHtml(
  items: ReceiptItem[]
): string {
  return items
    .map((item) => {
      const includedServices =
        item.includedServices ?? [];

      const includedHtml =
        includedServices.length > 0
          ? `
            <div
              style="
                margin-top: 8px;
                padding: 10px 12px;
                border-radius: 8px;
                background: #fff7ed;
                color: #9a3412;
                font-size: 13px;
                line-height: 1.7;
              "
            >
              <strong>
                包含服务 / Included:
              </strong>
              ${includedServices
                .map(escapeHtml)
                .join("、")}
            </div>
          `
          : "";

      const typeName =
        item.itemType === "package"
          ? "🔥 套餐 / Package"
          : item.itemType === "service"
            ? "服务 / Service"
            : "产品 / Product";

      return `
        <tr>
          <td
            style="
              padding: 16px 12px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
            "
          >
            <strong
              style="
                display: block;
                color: #111827;
                font-size: 15px;
              "
            >
              ${escapeHtml(item.name)}
            </strong>

            ${
              item.nameEn
                ? `
                  <span
                    style="
                      display: block;
                      margin-top: 3px;
                      color: #64748b;
                      font-size: 13px;
                    "
                  >
                    ${escapeHtml(item.nameEn)}
                  </span>
                `
                : ""
            }

            <span
              style="
                display: block;
                margin-top: 5px;
                color: #64748b;
                font-size: 12px;
              "
            >
              ${typeName}
            </span>

            ${includedHtml}
          </td>

          <td
            align="center"
            style="
              padding: 16px 8px;
              border-bottom: 1px solid #e5e7eb;
              color: #374151;
              vertical-align: top;
            "
          >
            ${Number(item.quantity) || 1}
          </td>

          <td
            align="right"
            style="
              padding: 16px 8px;
              border-bottom: 1px solid #e5e7eb;
              color: #374151;
              vertical-align: top;
              white-space: nowrap;
            "
          >
            ${formatMoney(item.unitPrice)}
          </td>

          <td
            align="right"
            style="
              padding: 16px 12px;
              border-bottom: 1px solid #e5e7eb;
              color: #111827;
              font-weight: 700;
              vertical-align: top;
              white-space: nowrap;
            "
          >
            ${formatMoney(item.total)}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildReceiptHtml(
  payload: ReceiptRequest
): string {
  const { order, items } = payload;

  const vehicleDescription = [
    order.vehiclePlate,
    order.vehicleName,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");

  const createdAt = order.createdAt
    ? new Date(
        order.createdAt
      ).toLocaleString("en-GB")
    : new Date().toLocaleString("en-GB");

  return `
    <!doctype html>
    <html>
      <body
        style="
          margin: 0;
          padding: 0;
          background: #f1f5f9;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        "
      >
        <div
          style="
            max-width: 720px;
            margin: 0 auto;
            padding: 32px 16px;
          "
        >
          <div
            style="
              overflow: hidden;
              border-radius: 18px;
              background: #ffffff;
              box-shadow:
                0 10px 30px
                rgba(15, 23, 42, 0.08);
            "
          >
            <div
              style="
                padding: 30px;
                background:
                  linear-gradient(
                    135deg,
                    #111827,
                    #1e293b
                  );
                color: #ffffff;
              "
            >
              <div
                style="
                  color: #fb923c;
                  font-size: 13px;
                  font-weight: 700;
                  letter-spacing: 1.5px;
                "
              >
                PAYMENT RECEIPT
              </div>

           <h1
  style="
    margin: 8px 0 4px;
    color: #ffd166;
    font-size: 29px;
    font-weight: 900;
    letter-spacing: 0.5px;
    text-shadow:
      0 0 6px rgba(255, 209, 102, 0.85),
      0 0 14px rgba(245, 158, 11, 0.55);
  "
>
  GTB Auto Detailing & Window Film
</h1>

              <div
                style="
                  color: #cbd5e1;
                  font-size: 14px;
                "
              >
                专业汽车美容与洗车服务
              </div>
            </div>

            <div style="padding: 28px">
              <h2
                style="
                  margin: 0 0 6px;
                  font-size: 21px;
                "
              >
                感谢您的惠顾，
                ${escapeHtml(
                  order.customerName
                )}
              </h2>

              <p
                style="
                  margin: 0 0 24px;
                  color: #64748b;
                  line-height: 1.6;
                "
              >
                您的订单已经完成，以下是本次服务收据。
              </p>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  margin-bottom: 24px;
                  border-collapse: collapse;
                  border-radius: 12px;
                  background: #f8fafc;
                "
              >
                <tr>
                  <td
                    style="
                      padding: 14px;
                      color: #64748b;
                      font-size: 13px;
                    "
                  >
                    订单号 / Order No.
                  </td>

                  <td
                    align="right"
                    style="
                      padding: 14px;
                      font-weight: 700;
                    "
                  >
                    ${escapeHtml(
                      order.orderNo
                    )}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 0 14px 14px;
                      color: #64748b;
                      font-size: 13px;
                    "
                  >
                    日期 / Date
                  </td>

                  <td
                    align="right"
                    style="
                      padding: 0 14px 14px;
                    "
                  >
                    ${escapeHtml(createdAt)}
                  </td>
                </tr>

                ${
                  order.customerPhone
                    ? `
                      <tr>
                        <td
                          style="
                            padding: 0 14px 14px;
                            color: #64748b;
                            font-size: 13px;
                          "
                        >
                          电话 / Phone
                        </td>

                        <td
                          align="right"
                          style="
                            padding: 0 14px 14px;
                          "
                        >
                          ${escapeHtml(
                            order.customerPhone
                          )}
                        </td>
                      </tr>
                    `
                    : ""
                }

                ${
                  vehicleDescription
                    ? `
                      <tr>
                        <td
                          style="
                            padding: 0 14px 14px;
                            color: #64748b;
                            font-size: 13px;
                          "
                        >
                          车辆 / Vehicle
                        </td>

                        <td
                          align="right"
                          style="
                            padding: 0 14px 14px;
                          "
                        >
                          ${vehicleDescription}
                        </td>
                      </tr>
                    `
                    : ""
                }

                <tr>
                  <td
                    style="
                      padding: 0 14px 14px;
                      color: #64748b;
                      font-size: 13px;
                    "
                  >
                    付款方式 / Payment
                  </td>

                  <td
                    align="right"
                    style="
                      padding: 0 14px 14px;
                    "
                  >
                    ${escapeHtml(
                      getPaymentName(
                        order.paymentMethod
                      )
                    )}
                  </td>
                </tr>
              </table>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  border-collapse: collapse;
                "
              >
                <thead>
                  <tr
                    style="
                      background: #f8fafc;
                      color: #64748b;
                      font-size: 12px;
                      text-transform: uppercase;
                    "
                  >
                    <th
                      align="left"
                      style="padding: 12px"
                    >
                      项目 / Item
                    </th>

                    <th
                      align="center"
                      style="padding: 12px 8px"
                    >
                      数量
                    </th>

                    <th
                      align="right"
                      style="padding: 12px 8px"
                    >
                      单价
                    </th>

                    <th
                      align="right"
                      style="padding: 12px"
                    >
                      金额
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${buildItemsHtml(items)}
                </tbody>
              </table>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  margin-top: 22px;
                  border-collapse: collapse;
                "
              >
                <tr>
                  <td
                    align="right"
                    style="
                      padding: 6px;
                      color: #64748b;
                    "
                  >
                    小计 / Subtotal
                  </td>

                  <td
                    align="right"
                    width="150"
                    style="padding: 6px"
                  >
                    ${formatMoney(
                      order.subtotal
                    )}
                  </td>
                </tr>

                <tr>
                  <td
                    align="right"
                    style="
                      padding: 6px;
                      color: #64748b;
                    "
                  >
                    折扣 / Discount
                  </td>

                  <td
                    align="right"
                    style="padding: 6px"
                  >
                    -${formatMoney(
                      order.discount
                    )}
                  </td>
                </tr>

                <tr>
                  <td
                    align="right"
                    style="
                      padding: 12px 6px 6px;
                      font-size: 18px;
                      font-weight: 800;
                    "
                  >
                    合计 / Total
                  </td>

                  <td
                    align="right"
                    style="
                      padding: 12px 6px 6px;
                      color: #16a34a;
                      font-size: 22px;
                      font-weight: 800;
                    "
                  >
                    ${formatMoney(order.total)}
                  </td>
                </tr>
              </table>

              <div
                style="
                  margin-top: 28px;
                  padding: 18px;
                  border-radius: 12px;
                  background: #ecfdf5;
                  color: #166534;
                  line-height: 1.6;
                  text-align: center;
                "
              >
                感谢选择 GTB Auto Detailing & Window Film。
                <br />
                Thank you for choosing us!
              </div>
            </div>

            <div
              style="
                padding: 20px 28px;
                background: #111827;
                color: #94a3b8;
                font-size: 12px;
                line-height: 1.7;
                text-align: center;
              "
            >
              此邮件由 GTB Auto Detailing & Window Film POS
              自动发送。
              <br />
              This receipt was generated
              automatically.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "只允许 POST 请求",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error(
        "服务器缺少 RESEND_API_KEY"
      );
    }

    const payload =
      (await request.json()) as ReceiptRequest;

    if (!payload.to?.trim()) {
      return new Response(
        JSON.stringify({
          error: "客户邮箱不能为空",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    if (!payload.order?.orderNo) {
      return new Response(
        JSON.stringify({
          error: "订单资料不完整",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    if (
      !Array.isArray(payload.items) ||
      payload.items.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "订单项目不能为空",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${RESEND_API_KEY}`,

          "Content-Type":
            "application/json",

          "Idempotency-Key":
            `receipt-${payload.order.orderNo}`,
        },

        body: JSON.stringify({
          from:
            "GTB Auto Detailing & Window Film <onboarding@resend.dev>",

          to: [
            payload.to.trim(),
          ],

          subject:
            `GTB 收据 / Receipt ${payload.order.orderNo}`,

          html:
            buildReceiptHtml(payload),
        }),
      }
    );

    const resendResult =
      await resendResponse.json();

    if (!resendResponse.ok) {
      console.error(
        "Resend error:",
        resendResult
      );

      return new Response(
        JSON.stringify({
          error:
            resendResult?.message ||
            "邮件发送失败",

          details: resendResult,
        }),
        {
          status: resendResponse.status,

          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "收据邮件发送成功",
        emailId: resendResult.id,
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "服务器发生未知错误",
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});