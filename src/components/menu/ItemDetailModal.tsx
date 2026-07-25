import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Service } from "../../types/database";
import type { Package } from "../../services/packageService";
import useCurrency from "../../hooks/useCurrency";

export type CoatingDurationUnit = "month" | "year";

export type CoatingOption = {
  id: number;
  service_id: number;
  option_name: string;
  duration_years: number;
  duration_unit: CoatingDurationUnit | string | null;
  price: number | string;
  description: string | null;
  product_name: string | null;
  is_recommended: boolean;
  is_active: boolean;
  sort_order: number;
};

type Props = {
  service?: Service;
  packageItem?: Package;
  coatingOptions?: CoatingOption[];
  onClose: () => void;
  onBook: (coatingOption?: CoatingOption) => void;
};

function ItemDetailModal({
  service,
  packageItem,
  coatingOptions = [],
  onClose,
  onBook,
}: Props) {
  const { formatMoney } = useCurrency();

  const activeCoatingOptions = useMemo(
    () =>
      coatingOptions
        .filter((option) => option.is_active !== false)
        .sort((first, second) => {
          const sortDifference =
            Number(first.sort_order || 0) -
            Number(second.sort_order || 0);

          if (sortDifference !== 0) {
            return sortDifference;
          }

          return (
            toMonths(first) - toMonths(second)
          );
        }),
    [coatingOptions]
  );

  const [selectedCoatingOptionId, setSelectedCoatingOptionId] =
    useState<number | null>(null);

  useEffect(() => {
    if (activeCoatingOptions.length === 0) {
      setSelectedCoatingOptionId(null);
      return;
    }

    const recommended = activeCoatingOptions.find(
      (option) => option.is_recommended
    );

    setSelectedCoatingOptionId(
      recommended?.id ?? activeCoatingOptions[0].id
    );
  }, [service?.id, activeCoatingOptions]);

  if (!service && !packageItem) {
    return null;
  }

  const isPackage = Boolean(packageItem);

  const selectedCoatingOption =
    activeCoatingOptions.find(
      (option) => option.id === selectedCoatingOptionId
    ) ?? activeCoatingOptions[0];

  const title = isPackage
    ? packageItem?.package_name
    : service?.service_name;

  const englishTitle = isPackage
    ? packageItem?.package_name_en
    : service?.service_name_en;

  const description = isPackage
    ? packageItem?.description
    : service?.description;

  const descriptionEn = isPackage
    ? packageItem?.description_en
    : service?.description_en;

  const imageUrl = isPackage
    ? packageItem?.image_url
    : service?.image_url;

  const normalPrice = isPackage
    ? Number(packageItem?.package_price || 0)
    : Number(service?.price || 0);

  const displayedPrice = selectedCoatingOption
    ? Number(selectedCoatingOption.price || 0)
    : normalPrice;

  const includedServices =
    packageItem?.package_services
      ?.map((item) => item.services)
      .filter(Boolean) ?? [];

  return (
    <div style={overlay} onClick={onClose}>
      <div
        style={modal}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={closeButton}
          aria-label="关闭详情"
        >
          ×
        </button>

        <div style={imageArea}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title || "Service"}
              style={mainImage}
            />
          ) : (
            <div style={placeholder}>
              {isPackage ? "🎁" : "🚗"}
            </div>
          )}

          <span style={typeBadge}>
            {isPackage
              ? "套餐 / PACKAGE"
              : `${service?.category || "服务"} / SERVICE`}
          </span>
        </div>

        <div style={body}>
          <p style={eyebrow}>
            GTB Auto Detailing & Window Film
          </p>

          <h2 style={titleStyle}>{title}</h2>

          {englishTitle && (
            <p style={englishTitleStyle}>
              {englishTitle}
            </p>
          )}

          {description && (
            <p style={descriptionStyle}>
              {description}
            </p>
          )}

          {descriptionEn && (
            <p style={descriptionEnglish}>
              {descriptionEn}
            </p>
          )}

          {isPackage && (
            <section style={detailSection}>
              <h3 style={sectionTitle}>
                套餐包含 / What&apos;s Included
              </h3>

              {includedServices.length > 0 ? (
                <div style={includedList}>
                  {includedServices.map((item) => (
                    <div
                      key={item?.id}
                      style={includedItem}
                    >
                      <span style={checkIcon}>✓</span>

                      <div>
                        <strong>
                          {item?.service_name}
                        </strong>

                        {item?.service_name_en && (
                          <small style={includedEnglish}>
                            {item.service_name_en}
                          </small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={emptyText}>
                  暂无套餐内容 / No services listed
                </p>
              )}
            </section>
          )}

          {!isPackage && activeCoatingOptions.length > 0 && (
            <section style={coatingSection}>
              <div style={coatingHeader}>
                <div>
                  <p style={coatingEyebrow}>
                    CERAMIC COATING OPTIONS
                  </p>

                  <h3 style={coatingTitle}>
                    选择镀晶药剂期限 / Choose Durability
                  </h3>

                  <p style={coatingDescription}>
                    请选择需要的药剂有效月份或年份，价格会自动更新。
                  </p>
                </div>

                <span style={coatingCountBadge}>
                  {activeCoatingOptions.length} 个方案
                </span>
              </div>

              <div style={coatingGrid}>
                {activeCoatingOptions.map((option) => {
                  const selected =
                    option.id === selectedCoatingOption?.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setSelectedCoatingOptionId(option.id)
                      }
                      aria-pressed={selected}
                      style={{
                        ...coatingCard,
                        borderColor: selected
                          ? "#7c3aed"
                          : "#ddd6fe",
                        background: selected
                          ? "linear-gradient(145deg,#f5f3ff,#ede9fe)"
                          : "#ffffff",
                        boxShadow: selected
                          ? "0 14px 30px rgba(124,58,237,.16)"
                          : "0 8px 20px rgba(15,23,42,.05)",
                        transform: selected
                          ? "translateY(-2px)"
                          : "none",
                      }}
                    >
                      <div style={coatingCardTop}>
                        <strong style={coatingDuration}>
                          {formatDuration(option)}
                        </strong>

                        {option.is_recommended && (
                          <span style={recommendedBadge}>
                            ⭐ 推荐
                          </span>
                        )}
                      </div>

                      <span style={coatingOptionName}>
                        {option.option_name}
                      </span>

                      <strong style={coatingPrice}>
                        {formatMoney(
                          Number(option.price || 0)
                        )}
                      </strong>

                      {option.product_name && (
                        <span style={productName}>
                          药剂：{option.product_name}
                        </span>
                      )}

                      {option.description && (
                        <span style={optionDescription}>
                          {option.description}
                        </span>
                      )}

                      <span
                        style={{
                          ...selectionBadge,
                          color: selected
                            ? "#6d28d9"
                            : "#94a3b8",
                        }}
                      >
                        {selected
                          ? "✓ 已选择 / Selected"
                          : "点击选择 / Select"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {!isPackage &&
            (service?.before_image ||
              service?.after_image) && (
              <section style={detailSection}>
                <h3 style={sectionTitle}>
                  施工效果 / Before &amp; After
                </h3>

                <div style={comparisonGrid}>
                  {service.before_image && (
                    <div style={comparisonCard}>
                      <span style={beforeLabel}>
                        BEFORE
                      </span>

                      <img
                        src={service.before_image}
                        alt="施工前"
                        style={comparisonImage}
                      />

                      <strong style={imageCaption}>
                        施工前 / Before
                      </strong>
                    </div>
                  )}

                  {service.after_image && (
                    <div style={comparisonCard}>
                      <span style={afterLabel}>
                        AFTER
                      </span>

                      <img
                        src={service.after_image}
                        alt="施工后"
                        style={comparisonImage}
                      />

                      <strong style={imageCaption}>
                        施工后 / After
                      </strong>
                    </div>
                  )}
                </div>
              </section>
            )}

          {!isPackage && (
            <div style={ratingBox}>
              <span style={stars}>★★★★★</span>

              <strong>
                {Number(service?.rating ?? 5).toFixed(1)}
              </strong>

              <span style={reviewText}>
                ({service?.review_count ?? 0} Reviews)
              </span>
            </div>
          )}

          <div style={priceBox}>
            <div>
              <p style={priceLabel}>
                {selectedCoatingOption
                  ? "已选镀晶方案价格 / Selected Option Price"
                  : isPackage
                    ? "套餐价格 / Package Price"
                    : "服务价格 / Service Price"}
              </p>

              <strong style={priceStyle}>
                {formatMoney(displayedPrice)}
              </strong>

              {selectedCoatingOption && (
                <small style={selectedOptionSummary}>
                  {formatDuration(selectedCoatingOption)} ·{" "}
                  {selectedCoatingOption.product_name ||
                    selectedCoatingOption.option_name}
                </small>
              )}
            </div>
          </div>

          <div style={footer}>
            <button
              type="button"
              onClick={onClose}
              style={cancelButton}
            >
              返回 / Back
            </button>

            <button
              type="button"
              onClick={() => onBook(selectedCoatingOption)}
              style={bookButton}
            >
              📅 立即预约 / Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeDurationUnit(
  value: CoatingOption["duration_unit"]
): CoatingDurationUnit {
  return value === "month" ? "month" : "year";
}

function formatDuration(option: CoatingOption) {
  const unit = normalizeDurationUnit(
    option.duration_unit
  );

  return `${Number(option.duration_years || 0)}${
    unit === "month" ? "个月" : "年"
  }`;
}

function toMonths(option: CoatingOption) {
  const value = Number(option.duration_years || 0);
  return normalizeDurationUnit(option.duration_unit) ===
    "month"
    ? value
    : value * 12;
}

const overlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(15,23,42,.78)",
  backdropFilter: "blur(7px)",
};

const modal = {
  position: "relative" as const,
  width: "min(920px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto" as const,
  borderRadius: 24,
  background: "#ffffff",
  boxShadow: "0 30px 80px rgba(0,0,0,.35)",
};

const closeButton = {
  position: "absolute" as const,
  top: 15,
  right: 15,
  zIndex: 2,
  width: 38,
  height: 38,
  border: "none",
  borderRadius: 999,
  background: "rgba(15,23,42,.86)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 25,
};

const imageArea = {
  position: "relative" as const,
  height: 280,
  overflow: "hidden",
  background: "#e2e8f0",
};

const mainImage = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover" as const,
};

const placeholder = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg,#dbeafe,#ede9fe)",
  fontSize: 85,
};

const typeBadge = {
  position: "absolute" as const,
  left: 18,
  bottom: 18,
  padding: "8px 13px",
  borderRadius: 999,
  background: "#2563eb",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 900,
};

const body = { padding: 26 };

const eyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "1.4px",
};

const titleStyle = {
  margin: "7px 0 0",
  color: "#111827",
  fontSize: 31,
};

const englishTitleStyle = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 16,
  fontWeight: 700,
};

const descriptionStyle = {
  margin: "17px 0 0",
  color: "#334155",
  lineHeight: 1.8,
};

const descriptionEnglish = {
  margin: "7px 0 0",
  color: "#94a3b8",
  lineHeight: 1.7,
  fontStyle: "italic" as const,
};

const detailSection = {
  marginTop: 24,
  padding: 18,
  border: "1px solid #e2e8f0",
  borderRadius: 17,
  background: "#f8fafc",
};

const sectionTitle = {
  margin: "0 0 14px",
  color: "#111827",
  fontSize: 17,
};

const coatingSection = {
  ...detailSection,
  border: "1px solid #ddd6fe",
  background:
    "linear-gradient(145deg,#faf5ff,#ffffff)",
};

const coatingHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
  gap: 12,
  marginBottom: 15,
};

const coatingEyebrow = {
  margin: 0,
  color: "#7c3aed",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "1.2px",
};

const coatingTitle = {
  margin: "5px 0 0",
  color: "#111827",
  fontSize: 18,
};

const coatingDescription = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.6,
};

const coatingCountBadge = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 11,
  fontWeight: 900,
};

const coatingGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 12,
};

const coatingCard = {
  minWidth: 0,
  padding: 15,
  border: "1px solid #ddd6fe",
  borderRadius: 16,
  textAlign: "left" as const,
  cursor: "pointer",
  transition: "all .18s ease",
};

const coatingCardTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const coatingDuration = {
  color: "#4c1d95",
  fontSize: 18,
};

const recommendedBadge = {
  padding: "4px 7px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 9,
  fontWeight: 900,
};

const coatingOptionName = {
  display: "block",
  marginTop: 10,
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
};

const coatingPrice = {
  display: "block",
  marginTop: 8,
  color: "#7c3aed",
  fontSize: 22,
};

const productName = {
  display: "block",
  marginTop: 8,
  color: "#475569",
  fontSize: 11,
  fontWeight: 700,
};

const optionDescription = {
  display: "block",
  marginTop: 7,
  color: "#64748b",
  fontSize: 11,
  lineHeight: 1.55,
};

const selectionBadge = {
  display: "block",
  marginTop: 12,
  fontSize: 10,
  fontWeight: 900,
};

const includedList = {
  display: "grid",
  gap: 11,
};

const includedItem = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  color: "#334155",
};

const checkIcon = {
  color: "#16a34a",
  fontWeight: 900,
};

const includedEnglish = {
  display: "block",
  marginTop: 3,
  color: "#94a3b8",
};

const emptyText = {
  margin: 0,
  color: "#94a3b8",
};

const comparisonGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(210px,1fr))",
  gap: 14,
};

const comparisonCard = {
  position: "relative" as const,
  overflow: "hidden",
  borderRadius: 14,
  background: "#ffffff",
};

const comparisonImage = {
  width: "100%",
  height: 180,
  display: "block",
  objectFit: "cover" as const,
};

const beforeLabel = {
  position: "absolute" as const,
  top: 9,
  left: 9,
  padding: "5px 8px",
  borderRadius: 999,
  background: "#111827",
  color: "#ffffff",
  fontSize: 9,
  fontWeight: 900,
};

const afterLabel = {
  ...beforeLabel,
  background: "#16a34a",
};

const imageCaption = {
  display: "block",
  padding: 10,
  color: "#334155",
  fontSize: 12,
};

const ratingBox = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 8,
  marginTop: 22,
};

const stars = {
  color: "#f59e0b",
  letterSpacing: 1,
};

const reviewText = {
  color: "#94a3b8",
  fontSize: 12,
};

const priceBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 15,
  marginTop: 24,
  padding: 18,
  borderRadius: 17,
  background: "#eff6ff",
};

const priceLabel = {
  margin: 0,
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
};

const priceStyle = {
  display: "block",
  marginTop: 5,
  color: "#2563eb",
  fontSize: 31,
};

const selectedOptionSummary = {
  display: "block",
  marginTop: 6,
  color: "#64748b",
  fontSize: 12,
};

const footer = {
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap" as const,
  gap: 11,
  marginTop: 24,
};

const cancelButton = {
  padding: "11px 17px",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 800,
};

const bookButton = {
  padding: "11px 18px",
  border: "none",
  borderRadius: 12,
  background:
    "linear-gradient(135deg,#7c3aed,#6d28d9)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 900,
};

export default ItemDetailModal;