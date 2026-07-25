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


  function printReceipt() {
    const printableWindow = window.open(
      "",
      "_blank",
      "width=920,height=900",
    );

    if (!printableWindow) {
      alert("浏览器阻止了打印窗口，请允许弹出窗口后重试。");
      return;
    }

    const customerName =
      order.members?.name || "散客 / Walk-in Customer";
    const customerPhone =
      order.members?.phone || "—";
    const vehiclePlate =
      order.vehicles?.plate_number || "未登记";
    const vehicleName =
      [order.vehicles?.brand, order.vehicles?.model]
        .filter(Boolean)
        .join(" ") || "—";

    const itemHtml = items
      .map((item: any, index: number) => {
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
                packageService.services?.service_name,
            )
            .filter(Boolean) ?? [];

        const itemName =
          item.item_name_snapshot ||
          item.packages?.package_name ||
          item.services?.service_name ||
          item.products?.product_name ||
          item.products?.name ||
          item.item_name ||
          `订单项目 ${index + 1}`;

        const itemNameEn =
          item.item_name_en_snapshot ??
          item.packages?.package_name_en ??
          item.services?.service_name_en ??
          "";

        const normalizedItemType = String(
          item.item_type ?? "",
        ).toLowerCase();

        const itemType =
          item.packages || normalizedItemType === "package"
            ? "套餐 / Package"
            : item.services || normalizedItemType === "service"
              ? "服务 / Service"
              : "产品 / Product";

        const quantity = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const itemTotal =
          Number(item.total) || unitPrice * quantity;

        const vehicleSizeCode = String(
          item.vehicle_size_code ?? "",
        ).toLowerCase();
        const vehiclePreset =
          VEHICLE_SIZE_PRESETS[
            vehicleSizeCode as VehicleSizeCode
          ];
        const vehicleSizeName =
          item.vehicle_size_name ||
          vehiclePreset?.nameZh ||
          "";
        const vehicleSizeNameEn =
          item.vehicle_size_name_en ||
          vehiclePreset?.nameEn ||
          "";

        const coatingDurationLabel =
          formatCoatingDuration(
            item.coating_duration_years,
            item.coating_duration_unit,
          );
        const coatingOptionName = String(
          item.coating_option_name ?? "",
        ).trim();
        const coatingProductName = String(
          item.coating_product_name ?? "",
        ).trim();
        const coatingPriceValue =
          item.coating_price === null ||
          item.coating_price === undefined ||
          item.coating_price === ""
            ? null
            : Number(item.coating_price);
        const hasCoatingOption = Boolean(
          item.coating_option_id ||
            coatingOptionName ||
            coatingProductName ||
            coatingDurationLabel,
        );

        const includedHtml =
          packageServices.length > 0
            ? `<div class="included"><strong>包含服务 / Included:</strong> ${packageServices
                .map(escapeReceiptHtml)
                .join("、")}</div>`
            : "";

        const vehicleHtml = vehicleSizeName
          ? `<div class="option vehicle-option">
              <div class="option-label">VEHICLE SIZE / 车型大小</div>
              <div class="option-value">${escapeReceiptHtml(
                vehicleSizeName,
              )}${
                vehicleSizeNameEn &&
                vehicleSizeNameEn !== vehicleSizeName
                  ? ` / ${escapeReceiptHtml(
                      vehicleSizeNameEn,
                    )}`
                  : ""
              }</div>
            </div>`
          : "";

        const coatingHtml = hasCoatingOption
          ? `<div class="option coating-option">
              <div class="option-label">COATING PRODUCT OPTION / 镀晶药剂方案</div>
              <div class="option-value">${escapeReceiptHtml(
                [coatingDurationLabel, coatingOptionName]
                  .filter(Boolean)
                  .join(" · ") || "镀晶药剂方案",
              )}</div>
              ${
                coatingProductName
                  ? `<div class="detail-row"><span>药剂 / Product</span><strong>${escapeReceiptHtml(
                      coatingProductName,
                    )}</strong></div>`
                  : ""
              }
              ${
                coatingPriceValue !== null &&
                Number.isFinite(coatingPriceValue)
                  ? `<div class="detail-row"><span>方案基础价 / Base Price</span><strong>${escapeReceiptHtml(
                      formatMoney(coatingPriceValue),
                    )}</strong></div>`
                  : ""
              }
              <div class="detail-row final"><span>车型计算后单价 / Final Unit Price</span><strong>${escapeReceiptHtml(
                formatMoney(unitPrice),
              )}</strong></div>
            </div>`
          : "";

        return `<section class="item-card">
          <div class="item-head">
            <div>
              <div class="type-badge">${escapeReceiptHtml(
                itemType,
              )}</div>
              <h3>${escapeReceiptHtml(itemName)}</h3>
              ${
                itemNameEn
                  ? `<p class="name-en">${escapeReceiptHtml(
                      itemNameEn,
                    )}</p>`
                  : ""
              }
            </div>
            <strong class="item-total">${escapeReceiptHtml(
              formatMoney(itemTotal),
            )}</strong>
          </div>
          ${includedHtml}
          ${vehicleHtml}
          ${coatingHtml}
          <div class="item-meta"><span>数量 / Qty: ${quantity}</span><span>单价 / Unit: ${escapeReceiptHtml(
            formatMoney(unitPrice),
          )}</span></div>
        </section>`;
      })
      .join("");

    const generatedAt = new Date().toLocaleString("en-US");

    printableWindow.document.open();
    printableWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeReceiptHtml(
    order.order_no || "GTB Receipt",
  )}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
    .receipt { width: 780px; max-width: calc(100% - 28px); margin: 24px auto; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 18px 45px rgba(15,23,42,.12); }
    .brand { padding: 26px 30px; background: linear-gradient(135deg,#0f172a,#1e293b); color: #fff; }
    .brand small { color: #60a5fa; font-weight: 800; letter-spacing: 1.5px; }
    .brand h1 { margin: 7px 0 3px; font-size: 25px; }
    .brand p { margin: 0; color: #cbd5e1; }
    .content { padding: 26px 30px 32px; }
    .order-title { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
    .order-title h2 { margin: 0; font-size: 22px; }
    .order-no { color: #2563eb; font-weight: 800; text-align: right; }
    .info-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; margin-top: 20px; }
    .info { padding: 12px 14px; border-radius: 11px; background: #f8fafc; }
    .info span { display: block; color: #64748b; font-size: 11px; font-weight: 700; }
    .info strong { display: block; margin-top: 4px; overflow-wrap: anywhere; }
    .section-title { margin: 24px 0 10px; font-size: 17px; }
    .item-card { margin-top: 12px; padding: 15px; border: 1px solid #dbe3ed; border-radius: 13px; break-inside: avoid; }
    .item-head { display: flex; justify-content: space-between; gap: 16px; }
    .item-head h3 { margin: 5px 0 0; font-size: 16px; }
    .type-badge { display: inline-block; padding: 4px 7px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: 9px; font-weight: 800; }
    .name-en { margin: 4px 0 0; color: #64748b; font-size: 11px; }
    .item-total { color: #15803d; white-space: nowrap; }
    .included { margin-top: 10px; padding: 9px 10px; border-radius: 9px; background: #fff7ed; color: #9a3412; font-size: 11px; }
    .option { margin-top: 11px; padding: 11px; border-radius: 10px; }
    .vehicle-option { border: 1px solid #bfdbfe; background: #eff6ff; }
    .coating-option { border: 1px solid #ddd6fe; background: #faf5ff; }
    .option-label { color: #2563eb; font-size: 9px; font-weight: 900; letter-spacing: .8px; }
    .coating-option .option-label { color: #7c3aed; }
    .option-value { margin-top: 5px; font-size: 12px; font-weight: 800; }
    .detail-row { display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; color: #64748b; font-size: 10px; }
    .detail-row strong { color: #334155; text-align: right; }
    .detail-row.final { padding-top: 8px; border-top: 1px dashed #ddd6fe; color: #4c1d95; font-weight: 800; }
    .detail-row.final strong { color: #4c1d95; }
    .item-meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 11px; color: #64748b; font-size: 10px; font-weight: 700; }
    .totals { margin-top: 22px; padding: 16px; border: 1px solid #bbf7d0; border-radius: 13px; background: #f0fdf4; }
    .total-row { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; color: #475569; }
    .grand-total { padding-top: 10px; border-top: 1px solid #bbf7d0; color: #0f172a; font-size: 20px; font-weight: 900; }
    .currency-note { margin-top: 12px; color: #64748b; font-size: 10px; line-height: 1.5; text-align: center; }
    .footer { padding: 18px 30px; background: #0f172a; color: #94a3b8; text-align: center; font-size: 10px; }
    @media print {
      body { background: #fff; }
      .receipt { width: 100%; max-width: none; margin: 0; border-radius: 0; box-shadow: none; }
      @page { size: A4; margin: 10mm; }
    }
  </style>
</head>
<body>
  <main class="receipt">
    <header class="brand">
      <small>PAYMENT RECEIPT</small>
      <h1>GTB Auto Detailing &amp; Window Film</h1>
      <p>专业汽车美容与洗车服务</p>
    </header>
    <div class="content">
      <div class="order-title">
        <div><h2>订单收据 / Order Receipt</h2><div>生成时间 / Generated: ${escapeReceiptHtml(
          generatedAt,
        )}</div></div>
        <div class="order-no">${escapeReceiptHtml(
          order.order_no || "—",
        )}</div>
      </div>
      <div class="info-grid">
        <div class="info"><span>客户 / Customer</span><strong>${escapeReceiptHtml(
          customerName,
        )}</strong></div>
        <div class="info"><span>电话 / Phone</span><strong>${escapeReceiptHtml(
          customerPhone,
        )}</strong></div>
        <div class="info"><span>车牌 / Plate</span><strong>${escapeReceiptHtml(
          vehiclePlate,
        )}</strong></div>
        <div class="info"><span>车辆 / Vehicle</span><strong>${escapeReceiptHtml(
          vehicleName,
        )}</strong></div>
      </div>
      <h2 class="section-title">订单项目 / Items</h2>
      ${itemHtml || "<p>暂无订单项目</p>"}
      <div class="totals">
        <div class="total-row"><span>小计 / Subtotal</span><strong>${escapeReceiptHtml(
          formatMoney(Number(order.subtotal) || 0),
        )}</strong></div>
        <div class="total-row"><span>折扣 / Discount</span><strong>−${escapeReceiptHtml(
          formatMoney(Number(order.discount) || 0),
        )}</strong></div>
        <div class="total-row grand-total"><span>合计 / Total</span><strong>${escapeReceiptHtml(
          formatMoney(Number(order.total) || 0),
        )}</strong></div>
        ${
          Number(order.received_amount) > 0
            ? `<div class="total-row"><span>实收 / Received</span><strong>${escapeReceiptHtml(
                formatMoney(Number(order.received_amount)),
              )}</strong></div><div class="total-row"><span>找零 / Change</span><strong>${escapeReceiptHtml(
                formatMoney(Number(order.change_amount) || 0),
              )}</strong></div>`
            : ""
        }
      </div>
      <p class="currency-note">显示货币：${escapeReceiptHtml(
        displayCurrency,
      )} · 账本货币：${escapeReceiptHtml(
        accountingCurrency,
      )}</p>
    </div>
    <footer class="footer">感谢选择 GTB Auto Detailing &amp; Window Film · Thank you for choosing us!</footer>
  </main>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });<\/script>
</body>
</html>`);
    printableWindow.document.close();
  }

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
            item.item_name_snapshot ||
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
              item.item_name_en_snapshot ??
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
            vehicleSizeCode:
              item.vehicle_size_code ?? null,
            vehicleSizeName:
              item.vehicle_size_name ?? null,
            vehicleSizeNameEn:
              item.vehicle_size_name_en ?? null,
            coatingOptionName:
              item.coating_option_name ?? null,
            coatingDurationValue:
              item.coating_duration_years ?? null,
            coatingDurationUnit:
              item.coating_duration_unit ?? null,
            coatingProductName:
              item.coating_product_name ?? null,
            coatingPrice:
              item.coating_price === null ||
              item.coating_price === undefined
                ? null
                : Number(item.coating_price),
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
                  item.item_name_snapshot ||
                  item.packages
                    ?.package_name ||
                  item.services
                    ?.service_name ||
                  item.products
                    ?.product_name ||
                  item.products?.name ||
                  item.item_name ||
                  "订单项目";

                const normalizedItemType = String(
                  item.item_type ?? "",
                ).toLowerCase();

                const itemType =
                  item.packages ||
                  normalizedItemType === "package"
                    ? "套餐 / Package"
                    : item.services ||
                        normalizedItemType === "service"
                      ? "服务 / Service"
                      : "产品 / Product";

                const quantity =
                  Number(item.quantity) || 1;

                const unitPrice =
                  Number(item.unit_price) || 0;

                const itemTotal =
                  Number(item.total) ||
                  unitPrice * quantity;

                const vehicleSizeCode = String(
                  item.vehicle_size_code ?? "",
                ).toLowerCase();

                const vehiclePreset =
                  VEHICLE_SIZE_PRESETS[
                    vehicleSizeCode as VehicleSizeCode
                  ];

                const vehicleSizeName =
                  item.vehicle_size_name ||
                  vehiclePreset?.nameZh ||
                  "";

                const vehicleSizeNameEn =
                  item.vehicle_size_name_en ||
                  vehiclePreset?.nameEn ||
                  "";

                const vehicleSizeIcon =
                  vehiclePreset?.icon || "🚘";

                const coatingDurationLabel =
                  formatCoatingDuration(
                    item.coating_duration_years,
                    item.coating_duration_unit,
                  );

                const coatingOptionName = String(
                  item.coating_option_name ?? "",
                ).trim();

                const coatingProductName = String(
                  item.coating_product_name ?? "",
                ).trim();

                const coatingPriceValue =
                  item.coating_price === null ||
                  item.coating_price === undefined ||
                  item.coating_price === ""
                    ? null
                    : Number(item.coating_price);

                const hasCoatingOption = Boolean(
                  item.coating_option_id ||
                    coatingOptionName ||
                    coatingProductName ||
                    coatingDurationLabel,
                );

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

                    {vehicleSizeName && (
                      <div style={vehicleOptionBox}>
                        <div style={optionIcon}>
                          {vehicleSizeIcon}
                        </div>

                        <div style={optionContent}>
                          <span style={optionEyebrow}>
                            VEHICLE SIZE / 车型大小
                          </span>

                          <strong style={optionTitle}>
                            {vehicleSizeName}
                            {vehicleSizeNameEn &&
                              vehicleSizeNameEn !==
                                vehicleSizeName
                              ? ` / ${vehicleSizeNameEn}`
                              : ""}
                          </strong>
                        </div>
                      </div>
                    )}

                    {hasCoatingOption && (
                      <div style={coatingOptionBox}>
                        <div style={coatingHeader}>
                          <div>
                            <span style={coatingEyebrow}>
                              COATING PRODUCT OPTION
                            </span>

                            <strong style={coatingTitle}>
                              {[
                                coatingDurationLabel,
                                coatingOptionName,
                              ]
                                .filter(Boolean)
                                .join(" · ") ||
                                "镀晶药剂方案"}
                            </strong>
                          </div>

                          <span style={coatingBadge}>
                            🛡️ 镀晶方案
                          </span>
                        </div>

                        {coatingProductName && (
                          <div style={coatingDetailRow}>
                            <span>药剂 / Product</span>
                            <strong>
                              {coatingProductName}
                            </strong>
                          </div>
                        )}

                        {coatingPriceValue !== null &&
                          Number.isFinite(
                            coatingPriceValue,
                          ) && (
                            <div style={coatingDetailRow}>
                              <span>
                                方案基础价 / Base Price
                              </span>
                              <strong>
                                {formatMoney(
                                  coatingPriceValue,
                                )}
                              </strong>
                            </div>
                          )}

                        <div style={coatingFinalRow}>
                          <span>
                            车型计算后单价 / Final Unit Price
                          </span>
                          <strong>
                            {formatMoney(unitPrice)}
                          </strong>
                        </div>
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
            onClick={printReceipt}
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

type VehicleSizeCode =
  | "small"
  | "medium"
  | "suv"
  | "large";

const VEHICLE_SIZE_PRESETS: Record<
  VehicleSizeCode,
  {
    nameZh: string;
    nameEn: string;
    icon: string;
  }
> = {
  small: {
    nameZh: "小型车",
    nameEn: "Small Car",
    icon: "🚗",
  },
  medium: {
    nameZh: "中型车",
    nameEn: "Medium Car",
    icon: "🚘",
  },
  suv: {
    nameZh: "SUV",
    nameEn: "SUV",
    icon: "🚙",
  },
  large: {
    nameZh: "大型车",
    nameEn: "Large Vehicle",
    icon: "🚐",
  },
};

function formatCoatingDuration(
  value: unknown,
  unit: unknown,
) {
  const numericValue = Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0
  ) {
    return "";
  }

  return String(unit).toLowerCase() === "year"
    ? `${numericValue}年`
    : `${numericValue}个月`;
}

function escapeReceiptHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

const vehicleOptionBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 12,
  padding: 11,
  border: "1px solid #bfdbfe",
  borderRadius: 11,
  background: "#eff6ff",
};

const optionIcon = {
  display: "grid",
  placeItems: "center",
  width: 36,
  height: 36,
  flexShrink: 0,
  borderRadius: 10,
  background: "#dbeafe",
  fontSize: 19,
};

const optionContent = {
  minWidth: 0,
};

const optionEyebrow = {
  display: "block",
  color: "#2563eb",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "1px",
};

const optionTitle = {
  display: "block",
  marginTop: 3,
  color: "#0f172a",
  fontSize: 13,
};

const coatingOptionBox = {
  marginTop: 12,
  padding: 12,
  border: "1px solid #ddd6fe",
  borderRadius: 12,
  background:
    "linear-gradient(135deg,#f5f3ff,#ffffff)",
};

const coatingHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const coatingEyebrow = {
  display: "block",
  color: "#7c3aed",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "1px",
};

const coatingTitle = {
  display: "block",
  marginTop: 4,
  color: "#4c1d95",
  fontSize: 14,
  lineHeight: 1.4,
};

const coatingBadge = {
  flexShrink: 0,
  padding: "5px 8px",
  borderRadius: 999,
  color: "#6d28d9",
  background: "#ede9fe",
  fontSize: 10,
  fontWeight: 900,
};

const coatingDetailRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 9,
  color: "#64748b",
  fontSize: 11,
};

const coatingFinalRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 10,
  paddingTop: 9,
  borderTop: "1px dashed #ddd6fe",
  color: "#4c1d95",
  fontSize: 12,
  fontWeight: 900,
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