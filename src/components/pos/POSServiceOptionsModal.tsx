import { useEffect, useMemo, useState } from "react";

import type { Service } from "../../types/database";
import useCurrency from "../../hooks/useCurrency";

export type VehicleSizeCode = "small" | "medium" | "suv" | "large";

export type PosVehiclePrice = {
  service_id: number;
  vehicle_size_code: VehicleSizeCode | string;
  price: number | string;
  cost_price?: number | string | null;
  duration_minutes?: number | null;
  is_active?: boolean | null;
};

export type PosCoatingOption = {
  id: number;
  service_id: number;
  option_name: string;
  duration_years: number;
  duration_unit: "month" | "year" | string;
  price: number | string;
  description?: string | null;
  product_name?: string | null;
  is_recommended?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | null;
};

export type PosServiceSelection = {
  service: Service;
  vehicleSizeCode: VehicleSizeCode;
  vehicleSizeName: string;
  vehicleSizeNameEn: string;
  vehicleSizeIcon: string;
  finalPrice: number;
  coatingOption: PosCoatingOption | null;
};

type Props = {
  service: Service | null;
  vehiclePrices: PosVehiclePrice[];
  coatingOptions: PosCoatingOption[];
  onClose: () => void;
  onConfirm: (selection: PosServiceSelection) => void;
};

const VEHICLE_SIZES: Array<{
  code: VehicleSizeCode;
  name: string;
  nameEn: string;
  icon: string;
}> = [
  { code: "small", name: "小型车", nameEn: "Small Car", icon: "🚗" },
  { code: "medium", name: "中型车", nameEn: "Medium Car", icon: "🚘" },
  { code: "suv", name: "SUV", nameEn: "SUV", icon: "🚙" },
  { code: "large", name: "大型车", nameEn: "Large Vehicle", icon: "🚐" },
];

export default function POSServiceOptionsModal({
  service,
  vehiclePrices,
  coatingOptions,
  onClose,
  onConfirm,
}: Props) {
  const { formatMoney } = useCurrency();

  const activeVehiclePrices = useMemo(
    () => vehiclePrices.filter((row) => row.is_active !== false),
    [vehiclePrices],
  );

  const activeCoatingOptions = useMemo(
    () =>
      coatingOptions
        .filter((row) => row.is_active !== false)
        .slice()
        .sort((a, b) => {
          const firstOrder = Number(a.sort_order ?? 0);
          const secondOrder = Number(b.sort_order ?? 0);

          if (firstOrder !== secondOrder) {
            return firstOrder - secondOrder;
          }

          return durationInMonths(a) - durationInMonths(b);
        }),
    [coatingOptions],
  );

  const availableVehicleCodes = useMemo(() => {
    if (vehiclePrices.length === 0) {
      return new Set<VehicleSizeCode>(VEHICLE_SIZES.map((item) => item.code));
    }

    return new Set<VehicleSizeCode>(
      activeVehiclePrices
        .map((row) => row.vehicle_size_code)
        .filter(isVehicleSizeCode),
    );
  }, [activeVehiclePrices, vehiclePrices.length]);

  const defaultVehicleCode = useMemo<VehicleSizeCode>(() => {
    const preferred = VEHICLE_SIZES.find((item) =>
      availableVehicleCodes.has(item.code),
    );

    return preferred?.code ?? "small";
  }, [availableVehicleCodes]);

  const recommendedOption = useMemo(
    () =>
      activeCoatingOptions.find((option) => option.is_recommended === true) ??
      activeCoatingOptions[0] ??
      null,
    [activeCoatingOptions],
  );

  const [vehicleSizeCode, setVehicleSizeCode] =
    useState<VehicleSizeCode>(defaultVehicleCode);
  const [coatingOptionId, setCoatingOptionId] = useState<number | null>(
    recommendedOption?.id ?? null,
  );

  useEffect(() => {
    setVehicleSizeCode(defaultVehicleCode);
    setCoatingOptionId(recommendedOption?.id ?? null);
  }, [service?.id, defaultVehicleCode, recommendedOption?.id]);

  if (!service) {
    return null;
  }

  const selectedVehicle =
    VEHICLE_SIZES.find((item) => item.code === vehicleSizeCode) ??
    VEHICLE_SIZES[0];

  const selectedVehiclePrice = findVehiclePrice(
    activeVehiclePrices,
    vehicleSizeCode,
  );

  const smallVehiclePrice = findVehiclePrice(activeVehiclePrices, "small");

  const serviceBasePrice = toMoney(service.price);
  const vehiclePrice = selectedVehiclePrice?.price !== undefined
    ? toMoney(selectedVehiclePrice.price)
    : serviceBasePrice;
  const smallPrice = smallVehiclePrice?.price !== undefined
    ? toMoney(smallVehiclePrice.price)
    : serviceBasePrice;

  const selectedCoatingOption =
    activeCoatingOptions.find((option) => option.id === coatingOptionId) ?? null;

  const vehicleDifference = vehiclePrice - smallPrice;
  const finalPrice = roundMoney(
    selectedCoatingOption
      ? Math.max(0, toMoney(selectedCoatingOption.price) + vehicleDifference)
      : vehiclePrice,
  );

  const hasCoatingOptions = activeCoatingOptions.length > 0;
  const canConfirm =
    availableVehicleCodes.has(vehicleSizeCode) &&
    (!hasCoatingOptions || selectedCoatingOption !== null);

  return (
    <div style={overlay} onClick={onClose}>
      <section style={modal} onClick={(event) => event.stopPropagation()}>
        <header style={header}>
          <div>
            <p style={eyebrow}>POS SERVICE CONFIGURATION</p>
            <h2 style={title}>选择车型与药剂方案</h2>
            <p style={subtitle}>
              {service.service_name}
              {getServiceNameEn(service) ? ` / ${getServiceNameEn(service)}` : ""}
            </p>
          </div>

          <button type="button" onClick={onClose} style={closeButton}>
            ×
          </button>
        </header>

        <div style={sectionBox}>
          <div style={sectionHeadingRow}>
            <div>
              <p style={sectionEyebrow}>VEHICLE SIZE</p>
              <h3 style={sectionTitle}>选择车辆大小</h3>
            </div>
            <span style={requiredBadge}>必选</span>
          </div>

          <div style={vehicleGrid}>
            {VEHICLE_SIZES.map((vehicle) => {
              const available = availableVehicleCodes.has(vehicle.code);
              const row = findVehiclePrice(activeVehiclePrices, vehicle.code);
              const displayPrice = row?.price !== undefined
                ? toMoney(row.price)
                : serviceBasePrice;
              const selected = vehicleSizeCode === vehicle.code;

              return (
                <button
                  key={vehicle.code}
                  type="button"
                  disabled={!available}
                  onClick={() => setVehicleSizeCode(vehicle.code)}
                  style={{
                    ...vehicleCard,
                    borderColor: selected ? "#2563eb" : "#dbe3ef",
                    background: selected ? "#eff6ff" : "#ffffff",
                    opacity: available ? 1 : 0.45,
                    cursor: available ? "pointer" : "not-allowed",
                  }}
                >
                  <span style={vehicleIcon}>{vehicle.icon}</span>
                  <span style={vehicleName}>{vehicle.name}</span>
                  <span style={vehicleNameEn}>{vehicle.nameEn}</span>
                  <strong style={vehiclePriceText}>{formatMoney(displayPrice)}</strong>
                  {!available && <small style={unavailableText}>未启用</small>}
                </button>
              );
            })}
          </div>
        </div>

        {hasCoatingOptions && (
          <div style={sectionBox}>
            <div style={sectionHeadingRow}>
              <div>
                <p style={sectionEyebrow}>COATING DURABILITY</p>
                <h3 style={sectionTitle}>选择镀晶药剂期限</h3>
              </div>
              <span style={requiredBadge}>必选</span>
            </div>

            <div style={optionGrid}>
              {activeCoatingOptions.map((option) => {
                const selected = coatingOptionId === option.id;
                const optionFinalPrice = roundMoney(
                  Math.max(0, toMoney(option.price) + vehicleDifference),
                );

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setCoatingOptionId(option.id)}
                    style={{
                      ...optionCard,
                      borderColor: selected ? "#7c3aed" : "#ddd6fe",
                      background: selected ? "#f5f3ff" : "#ffffff",
                    }}
                  >
                    <div style={optionTopRow}>
                      <strong style={durationText}>
                        {formatDuration(option)}
                      </strong>
                      {option.is_recommended && (
                        <span style={recommendedBadge}>推荐</span>
                      )}
                    </div>

                    <span style={optionName}>{option.option_name}</span>
                    {option.product_name && (
                      <span style={productName}>药剂：{option.product_name}</span>
                    )}
                    <strong style={optionPrice}>{formatMoney(optionFinalPrice)}</strong>
                    {option.description && (
                      <span style={optionDescription}>{option.description}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <footer style={footer}>
          <div>
            <span style={finalPriceLabel}>最终单价 / Final Price</span>
            <strong style={finalPriceValue}>{formatMoney(finalPrice)}</strong>
            {selectedCoatingOption && (
              <small style={calculationHint}>
                药剂基础价 {formatMoney(toMoney(selectedCoatingOption.price))}
                {vehicleDifference === 0
                  ? ""
                  : ` ${vehicleDifference > 0 ? "+" : "−"} 车型差价 ${formatMoney(
                      Math.abs(vehicleDifference),
                    )}`}
              </small>
            )}
          </div>

          <div style={footerActions}>
            <button type="button" onClick={onClose} style={cancelButton}>
              取消
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => {
                if (!canConfirm) return;

                onConfirm({
                  service,
                  vehicleSizeCode,
                  vehicleSizeName: selectedVehicle.name,
                  vehicleSizeNameEn: selectedVehicle.nameEn,
                  vehicleSizeIcon: selectedVehicle.icon,
                  finalPrice,
                  coatingOption: selectedCoatingOption,
                });
              }}
              style={{
                ...confirmButton,
                opacity: canConfirm ? 1 : 0.55,
                cursor: canConfirm ? "pointer" : "not-allowed",
              }}
            >
              加入购物车
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function findVehiclePrice(
  prices: PosVehiclePrice[],
  code: VehicleSizeCode,
): PosVehiclePrice | undefined {
  return prices.find((row) => row.vehicle_size_code === code);
}

function isVehicleSizeCode(value: string): value is VehicleSizeCode {
  return value === "small" || value === "medium" || value === "suv" || value === "large";
}

function getServiceNameEn(service: Service): string {
  return String(
    (service as Service & { service_name_en?: string | null }).service_name_en ?? "",
  );
}

function durationInMonths(option: PosCoatingOption): number {
  const amount = Number(option.duration_years ?? 0);
  return option.duration_unit === "year" ? amount * 12 : amount;
}

function formatDuration(option: PosCoatingOption): string {
  const amount = Number(option.duration_years ?? 0);
  return option.duration_unit === "year" ? `${amount} 年` : `${amount} 个月`;
}

function toMoney(value: number | string | null | undefined): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

const overlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 10000,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(15,23,42,.72)",
  backdropFilter: "blur(8px)",
};

const modal = {
  width: "min(1080px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto" as const,
  border: "1px solid rgba(212,175,55,.24)",
  borderRadius: 24,
  background: "#ffffff",
  boxShadow: "0 34px 100px rgba(15,23,42,.42)",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  padding: "24px 26px",
  borderBottom: "1px solid rgba(212,175,55,.24)",
  background:
    "linear-gradient(135deg,#090d16 0%,#111827 62%,#1a1408 100%)",
};

const eyebrow = {
  margin: 0,
  color: "#f4cf61",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: "1.5px",
};

const title = {
  margin: "7px 0 0",
  color: "#ffffff",
  fontSize: 27,
  fontWeight: 950,
};

const subtitle = {
  margin: "7px 0 0",
  color: "#cbd5e1",
  fontWeight: 700,
};
const closeButton = {
  width: 42,
  height: 42,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 12,
  background: "rgba(255,255,255,.08)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 24,
};
const sectionBox = { margin: "22px 26px", padding: 20, border: "1px solid #dbeafe", borderRadius: 18, background: "#f8fbff" };
const sectionHeadingRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 15 };
const sectionEyebrow = { margin: 0, color: "#2563eb", fontSize: 9, fontWeight: 900, letterSpacing: "1.2px" };
const sectionTitle = { margin: "5px 0 0", color: "#0f172a", fontSize: 19 };
const requiredBadge = { padding: "6px 10px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 900 };
const vehicleGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 };
const vehicleCard = { minHeight: 155, padding: 16, border: "2px solid #dbe3ef", borderRadius: 16, display: "flex", flexDirection: "column" as const, alignItems: "flex-start", textAlign: "left" as const };
const vehicleIcon = { fontSize: 27 };
const vehicleName = { marginTop: 9, color: "#111827", fontSize: 16, fontWeight: 900 };
const vehicleNameEn = { marginTop: 3, color: "#94a3b8", fontSize: 11, fontWeight: 700 };
const vehiclePriceText = { marginTop: "auto", color: "#2563eb", fontSize: 18 };
const unavailableText = { marginTop: 5, color: "#dc2626", fontWeight: 800 };
const optionGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 };
const optionCard = { padding: 17, border: "2px solid #ddd6fe", borderRadius: 16, display: "flex", flexDirection: "column" as const, alignItems: "flex-start", textAlign: "left" as const, cursor: "pointer" };
const optionTopRow = { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const durationText = { color: "#5b21b6", fontSize: 20 };
const recommendedBadge = { padding: "5px 8px", borderRadius: 999, color: "#92400e", background: "#fef3c7", fontSize: 10, fontWeight: 900 };
const optionName = { marginTop: 12, color: "#111827", fontWeight: 900 };
const productName = { marginTop: 6, color: "#64748b", fontSize: 12 };
const optionPrice = { marginTop: 13, color: "#7c3aed", fontSize: 21 };
const optionDescription = { marginTop: 8, color: "#64748b", fontSize: 11, lineHeight: 1.5 };
const footer = { position: "sticky" as const, bottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 16, padding: "20px 26px", borderTop: "1px solid #e2e8f0", background: "rgba(255,255,255,.97)" };
const finalPriceLabel = { display: "block", color: "#64748b", fontSize: 11, fontWeight: 800 };
const finalPriceValue = { display: "block", marginTop: 4, color: "#0f172a", fontSize: 29 };
const calculationHint = { display: "block", marginTop: 4, color: "#64748b" };
const footerActions = { display: "flex", gap: 10 };
const cancelButton = { padding: "12px 17px", border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff", cursor: "pointer", fontWeight: 800 };
const confirmButton = {
  padding: "12px 20px",
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(135deg,#f4cf61,#c99518)",
  color: "#111827",
  fontWeight: 950,
  boxShadow: "0 10px 24px rgba(212,175,55,.22)",
};