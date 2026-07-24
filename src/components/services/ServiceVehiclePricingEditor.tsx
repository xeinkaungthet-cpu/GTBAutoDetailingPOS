import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import useCurrency from "../../hooks/useCurrency";
import VehiclePricingService, {
  type ServiceVehiclePrice,
  type VehicleSizeCode,
  type VehicleSizeOption,
} from "../../services/vehiclePricingService";

type Props = {
  serviceId: number;
};

type EditableVehiclePrice = {
  code: VehicleSizeCode;
  nameZh: string;
  nameEn: string;
  icon: string;
  price: string;
  costPrice: string;
  durationMinutes: string;
  isActive: boolean;
};

const DEFAULT_SIZE_ORDER: VehicleSizeCode[] = [
  "small",
  "medium",
  "suv",
  "large",
];

export default function ServiceVehiclePricingEditor({
  serviceId,
}: Props) {
  const {
    displayCurrency,
    accountingCurrency,
    convertToDisplay,
    convertToAccounting,
    formatMoney,
  } = useCurrency();

  const [rows, setRows] = useState<EditableVehiclePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadPrices();
  }, [serviceId, displayCurrency]);

  const activeCount = useMemo(
    () => rows.filter((row) => row.isActive).length,
    [rows]
  );

  async function loadPrices() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [sizes, prices] = await Promise.all([
        VehiclePricingService.getVehicleSizes(false),
        VehiclePricingService.getServicePrices(serviceId, false),
      ]);

      setRows(buildRows(sizes, prices, convertToDisplay));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  function updateRow<K extends keyof EditableVehiclePrice>(
    code: VehicleSizeCode,
    field: K,
    value: EditableVehiclePrice[K]
  ) {
    setRows((current) =>
      current.map((row) =>
        row.code === code
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );

    setMessage("");
    setError("");
  }

  async function savePrices() {
    setMessage("");
    setError("");

    const invalidRow = rows.find((row) => {
      const price = Number(row.price);
      const costPrice = Number(row.costPrice);
      const durationMinutes = Number(row.durationMinutes);

      return (
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isFinite(costPrice) ||
        costPrice < 0 ||
        !Number.isFinite(durationMinutes) ||
        durationMinutes < 0
      );
    });

    if (invalidRow) {
      setError(
        `${invalidRow.nameZh}的价格、成本或施工时间不正确，请检查后再保存。`
      );
      return;
    }

    const negativeProfitRows = rows.filter((row) => {
      const accountingPrice = convertToAccounting(Number(row.price));
      const accountingCost = convertToAccounting(Number(row.costPrice));

      return accountingCost > accountingPrice;
    });

    if (negativeProfitRows.length > 0) {
      const names = negativeProfitRows
        .map((row) => row.nameZh)
        .join("、");

      const confirmed = window.confirm(
        `${names}的内部成本高于销售价格，会产生负利润。\n仍然继续保存吗？`
      );

      if (!confirmed) {
        return;
      }
    }

    setSaving(true);

    try {
      await VehiclePricingService.saveAllServicePrices(
        serviceId,
        rows.map((row) => ({
          vehicle_size_code: row.code,
          price: roundAccountingAmount(
            convertToAccounting(Number(row.price))
          ),
          cost_price: roundAccountingAmount(
            convertToAccounting(Number(row.costPrice))
          ),
          duration_minutes: Math.round(Number(row.durationMinutes)),
          is_active: row.isActive,
        }))
      );

      await loadPrices();
      setMessage("四种车型价格已保存成功");
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={styles.section}>
      <style>
        {`
          .vehicle-price-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .vehicle-price-fields {
            display: grid;
            gap: 10px;
          }

          @media (max-width: 1350px) {
            .vehicle-price-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 760px) {
            .vehicle-price-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>VEHICLE-SIZE PRICING</p>
          <h3 style={styles.title}>车型独立价格</h3>
          <p style={styles.description}>
            洗车、抛光、镀晶等服务可按照车辆大小分别设置售价、成本和施工时间。
          </p>
        </div>

        <div style={styles.headerMeta}>
          <span style={styles.currencyBadge}>
            输入货币：{displayCurrency}
          </span>
          <span style={styles.accountingBadge}>
            账本货币：{accountingCurrency}
          </span>
          <span style={styles.activeBadge}>
            {activeCount}/4 可预约
          </span>
        </div>
      </div>

      {loading ? (
        <div style={styles.notice}>正在载入车型价格...</div>
      ) : error && rows.length === 0 ? (
        <div style={styles.errorNotice}>{error}</div>
      ) : (
        <>
          <div className="vehicle-price-grid">
            {rows.map((row) => {
              const accountingPrice = convertToAccounting(
                toNumber(row.price)
              );
              const accountingCost = convertToAccounting(
                toNumber(row.costPrice)
              );
              const profit = accountingPrice - accountingCost;
              const margin =
                accountingPrice > 0
                  ? (profit / accountingPrice) * 100
                  : 0;

              return (
                <article key={row.code} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.vehicleIdentity}>
                      <span style={styles.icon}>{row.icon}</span>
                      <div>
                        <strong style={styles.vehicleName}>
                          {row.nameZh}
                        </strong>
                        <span style={styles.vehicleEnglish}>
                          {row.nameEn}
                        </span>
                      </div>
                    </div>

                    <label style={styles.switchLabel}>
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(event) =>
                          updateRow(
                            row.code,
                            "isActive",
                            event.target.checked
                          )
                        }
                      />
                      <span>
                        {row.isActive ? "可预约" : "暂停"}
                      </span>
                    </label>
                  </div>

                  <div className="vehicle-price-fields">
                    <VehiclePriceField
                      label={`销售价格 (${displayCurrency})`}
                      value={row.price}
                      onChange={(value) =>
                        updateRow(row.code, "price", value)
                      }
                    />

                    <VehiclePriceField
                      label={`内部成本 (${displayCurrency})`}
                      value={row.costPrice}
                      onChange={(value) =>
                        updateRow(row.code, "costPrice", value)
                      }
                    />

                    <VehiclePriceField
                      label="施工时间（分钟）"
                      value={row.durationMinutes}
                      step="1"
                      onChange={(value) =>
                        updateRow(
                          row.code,
                          "durationMinutes",
                          value
                        )
                      }
                    />
                  </div>

                  <div style={styles.profitBox}>
                    <div style={styles.profitRow}>
                      <span>客户显示价格</span>
                      <strong>{formatMoney(accountingPrice)}</strong>
                    </div>

                    <div style={styles.profitRow}>
                      <span>预计利润</span>
                      <strong
                        style={{
                          color: profit >= 0 ? "#15803d" : "#dc2626",
                        }}
                      >
                        {formatMoney(profit)}
                      </strong>
                    </div>

                    <div style={styles.profitRow}>
                      <span>毛利率</span>
                      <strong
                        style={{
                          color:
                            profit < 0
                              ? "#dc2626"
                              : margin < 30
                                ? "#d97706"
                                : "#15803d",
                        }}
                      >
                        {Number.isFinite(margin)
                          ? `${margin.toFixed(1)}%`
                          : "0.0%"}
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {message && <div style={styles.successNotice}>{message}</div>}
          {error && <div style={styles.errorNotice}>{error}</div>}

          <div style={styles.footer}>
            <p style={styles.footerHint}>
              保存后，客户菜单会根据客户选择的小型车、中型车、SUV 或大型车显示对应价格。
            </p>

            <button
              type="button"
              onClick={() => void savePrices()}
              disabled={saving || rows.length === 0}
              style={{
                ...styles.saveButton,
                opacity: saving || rows.length === 0 ? 0.65 : 1,
                cursor:
                  saving || rows.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {saving ? "正在保存..." : "保存四种车型价格"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

type VehiclePriceFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
};

function VehiclePriceField({
  label,
  value,
  onChange,
  step = "0.01",
}: VehiclePriceFieldProps) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function buildRows(
  sizes: VehicleSizeOption[],
  prices: ServiceVehiclePrice[],
  convertToDisplay: (value: number) => number
): EditableVehiclePrice[] {
  const orderedSizes = [...sizes].sort((first, second) => {
    const firstDefaultOrder = DEFAULT_SIZE_ORDER.indexOf(first.code);
    const secondDefaultOrder = DEFAULT_SIZE_ORDER.indexOf(second.code);

    const firstOrder =
      Number.isFinite(first.sort_order) && first.sort_order > 0
        ? first.sort_order
        : firstDefaultOrder >= 0
          ? firstDefaultOrder + 1
          : 999;

    const secondOrder =
      Number.isFinite(second.sort_order) && second.sort_order > 0
        ? second.sort_order
        : secondDefaultOrder >= 0
          ? secondDefaultOrder + 1
          : 999;

    return firstOrder - secondOrder;
  });

  return orderedSizes.map((size) => {
    const priceRow = prices.find(
      (price) => price.vehicle_size_code === size.code
    );

    return {
      code: size.code,
      nameZh: size.name_zh,
      nameEn: size.name_en,
      icon: size.icon || "🚗",
      price: formatInput(
        convertToDisplay(toNumber(priceRow?.price))
      ),
      costPrice: formatInput(
        convertToDisplay(toNumber(priceRow?.cost_price))
      ),
      durationMinutes: String(
        Math.max(0, Math.round(toNumber(priceRow?.duration_minutes)))
      ),
      isActive: priceRow?.is_active !== false,
    };
  });
}

function toNumber(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function formatInput(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return String(Number(value.toFixed(6)));
}

function roundAccountingAmount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(6));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "车型价格处理失败，请稍后重试";
}

const styles: Record<string, CSSProperties> = {
  section: {
    marginTop: 20,
    padding: 20,
    border: "1px solid #bfdbfe",
    borderRadius: 20,
    background:
      "linear-gradient(145deg, rgba(239,246,255,.96), rgba(255,255,255,.98))",
    boxShadow: "0 18px 45px rgba(37,99,235,.08)",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.15em",
  },
  title: {
    margin: "6px 0 0",
    color: "#0f172a",
    fontSize: 23,
    fontWeight: 900,
  },
  description: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.6,
  },
  headerMeta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  currencyBadge: {
    padding: "8px 11px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 900,
  },
  accountingBadge: {
    padding: "8px 11px",
    borderRadius: 999,
    background: "#ede9fe",
    color: "#6d28d9",
    fontSize: 11,
    fontWeight: 900,
  },
  activeBadge: {
    padding: "8px 11px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#15803d",
    fontSize: 11,
    fontWeight: 900,
  },
  card: {
    minWidth: 0,
    padding: 15,
    border: "1px solid #dbe3ef",
    borderRadius: 16,
    background: "#ffffff",
    boxShadow: "0 10px 24px rgba(15,23,42,.05)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  vehicleIdentity: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    display: "grid",
    placeItems: "center",
    width: 42,
    height: 42,
    borderRadius: 13,
    background: "linear-gradient(145deg, #dbeafe, #ede9fe)",
    fontSize: 22,
  },
  vehicleName: {
    display: "block",
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 900,
  },
  vehicleEnglish: {
    display: "block",
    marginTop: 2,
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: 800,
  },
  switchLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#475569",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  field: {
    display: "grid",
    gap: 6,
  },
  fieldLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: 850,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 11,
    padding: "10px 11px",
    background: "#f8fafc",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 800,
    outline: "none",
  },
  profitBox: {
    display: "grid",
    gap: 7,
    marginTop: 13,
    padding: 11,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  profitRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    color: "#64748b",
    fontSize: 11,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 18,
    flexWrap: "wrap",
  },
  footerHint: {
    flex: "1 1 420px",
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
  },
  saveButton: {
    border: 0,
    borderRadius: 13,
    padding: "12px 18px",
    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 900,
    boxShadow: "0 12px 24px rgba(37,99,235,.22)",
  },
  notice: {
    padding: 16,
    borderRadius: 13,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: 800,
  },
  successNotice: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #86efac",
    background: "#f0fdf4",
    color: "#15803d",
    fontSize: 12,
    fontWeight: 850,
  },
  errorNotice: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: 850,
  },
};