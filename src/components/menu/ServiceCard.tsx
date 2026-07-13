import { useState } from "react";
import type { Service } from "../../types/database";
import { formatCurrency } from "../../utils/currency";

type Props = {
  service: Service;
  onBook?: (service: Service) => void;
};

function ServiceCard({ service, onBook }: Props) {
  const isAvailable = service.is_active !== false;

  const [beforeImageFailed, setBeforeImageFailed] =
    useState(false);

  const [afterImageFailed, setAfterImageFailed] =
    useState(false);

  const showComparison =
    Boolean(service.before_image) &&
    Boolean(service.after_image) &&
    !beforeImageFailed &&
    !afterImageFailed;

  return (
    <article style={card}>
      <div style={imageWrapper}>
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={`${service.service_name}${
              service.service_name_en
                ? ` - ${service.service_name_en}`
                : ""
            }`}
            style={image}
          />
        ) : (
          <div style={placeholder}>🚗</div>
        )}

        <div style={topBadgeRow}>
          <span style={categoryBadge}>
            {getCategoryLabel(service.category)}
          </span>

          {service.is_popular && (
            <span style={popularBadge}>
              🔥 BEST SELLER
            </span>
          )}

          {!service.is_popular &&
            service.is_recommended && (
              <span style={recommendedBadge}>
                ⭐ RECOMMENDED
              </span>
            )}
        </div>
      </div>

      <div style={content}>
        <div>
          <h2 style={title}>
            {service.service_name}
          </h2>

          {service.service_name_en && (
            <p style={englishTitle}>
              {service.service_name_en}
            </p>
          )}

          {service.description && (
            <p style={description}>
              {service.description}
            </p>
          )}

          {service.description_en && (
            <p style={descriptionEn}>
              {service.description_en}
            </p>
          )}
{(service.before_image || service.after_image) && (
  <div style={beforeAfterContainer}>

    {service.before_image && (
      <div style={compareBlock}>
        <div style={compareTitle}>
          🔴 Before
        </div>

        <img
          src={service.before_image}
          alt="Before"
          style={compareImage}
        />
      </div>
    )}

    {service.after_image && (
      <div style={compareBlock}>
        <div style={compareTitle}>
          🟢 After
        </div>

        <img
          src={service.after_image}
          alt="After"
          style={compareImage}
        />
      </div>
    )}

  </div>
)}

        </div>

        <div style={ratingRow}>
          <span style={stars}>
            {getStarDisplay(service.rating)}
          </span>

          <span style={ratingText}>
            {Number(service.rating ?? 5).toFixed(1)} / 5.0
          </span>

          <span style={reviewCount}>
            ({service.review_count ?? 0} Reviews)
          </span>
        </div>

        {showComparison && (
          <section style={comparisonSection}>
            <div style={comparisonHeader}>
              <div>
                <p style={comparisonEyebrow}>
                  RESULTS PREVIEW
                </p>

                <h3 style={comparisonTitle}>
                  施工效果 / Before &amp; After
                </h3>
              </div>

              <span style={comparisonBadge}>
                ✨ Transformation
              </span>
            </div>

            <div style={comparisonGrid}>
              <div style={comparisonImageCard}>
                <div style={comparisonImageWrapper}>
                  <img
                    src={service.before_image}
                    alt={`${service.service_name} 施工前`}
                    style={comparisonImage}
                    onError={() =>
                      setBeforeImageFailed(true)
                    }
                  />

                  <span style={beforeBadge}>
                    BEFORE
                  </span>
                </div>

                <div style={comparisonCaption}>
                  <strong>施工前</strong>
                  <span>Before Service</span>
                </div>
              </div>

              <div style={comparisonArrow}>
                <span>→</span>
              </div>

              <div style={comparisonImageCard}>
                <div style={comparisonImageWrapper}>
                  <img
                    src={service.after_image}
                    alt={`${service.service_name} 施工后`}
                    style={comparisonImage}
                    onError={() =>
                      setAfterImageFailed(true)
                    }
                  />

                  <span style={afterBadge}>
                    AFTER
                  </span>
                </div>

                <div style={comparisonCaption}>
                  <strong>施工后</strong>
                  <span>After Service</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <div style={metaRow}>
          <div style={duration}>
            <span>
              ⏱ {service.duration_minutes || 0} Minutes
            </span>

            <span style={durationChinese}>
              预计 {service.duration_minutes || 0} 分钟
            </span>
          </div>

          <span
            style={{
              ...status,
              color: isAvailable
                ? "#15803d"
                : "#b91c1c",
              background: isAvailable
                ? "#dcfce7"
                : "#fee2e2",
            }}
          >
            {isAvailable
              ? "可预约 / Available"
              : "暂停预约 / Unavailable"}
          </span>
        </div>

        <div style={footer}>
          <div>
            <p style={priceLabel}>
              STARTING FROM
            </p>

            <strong style={price}>
              {formatCurrency(service.price)}
            </strong>
          </div>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={() => onBook?.(service)}
            style={{
              ...bookButton,
              opacity: isAvailable ? 1 : 0.55,
              cursor: isAvailable
                ? "pointer"
                : "not-allowed",
            }}
          >
            <span style={bookButtonChinese}>
              📅 立即预约
            </span>

            <span style={bookButtonEnglish}>
              Book Now
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

function getCategoryLabel(category?: string) {
  switch (category) {
    case "洗车":
      return "🚗 洗车 / Car Wash";

    case "美容":
      return "✨ 美容 / Detailing";

    case "镀膜":
      return "🛡️ 镀膜 / Coating";

    case "清洁":
      return "🧽 清洁 / Cleaning";

    default:
      return category || "其他 / Other";
  }
}

function getStarDisplay(rating?: number) {
  const safeRating = Math.max(
    0,
    Math.min(5, Number(rating ?? 5))
  );

  const fullStars = Math.round(safeRating);

  return `${"★".repeat(fullStars)}${"☆".repeat(
    5 - fullStars
  )}`;
}

const card = {
  display: "flex",
  flexDirection: "column" as const,
  minWidth: 0,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  background: "#fff",
  boxShadow: "0 12px 32px rgba(15,23,42,.08)",
  transition:
    "transform .2s ease, box-shadow .2s ease",
};

const imageWrapper = {
  position: "relative" as const,
  height: 220,
  overflow: "hidden",
  background: "#e5e7eb",
};

const image = {
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
    "linear-gradient(135deg,#dbeafe,#e0e7ff)",
  fontSize: 68,
};

const topBadgeRow = {
  position: "absolute" as const,
  top: 14,
  left: 14,
  right: 14,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 8,
};

const categoryBadge = {
  maxWidth: "100%",
  padding: "7px 12px",
  overflow: "hidden",
  borderRadius: 999,
  background: "rgba(37,99,235,.94)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  boxShadow:
    "0 6px 18px rgba(37,99,235,.24)",
};

const popularBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "rgba(220,38,38,.94)",
  color: "#fff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 0.4,
  boxShadow:
    "0 6px 18px rgba(220,38,38,.24)",
};

const recommendedBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "rgba(124,58,237,.94)",
  color: "#fff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 0.4,
  boxShadow:
    "0 6px 18px rgba(124,58,237,.24)",
};

const content = {
  display: "flex",
  flex: 1,
  flexDirection: "column" as const,
  padding: 20,
};

const title = {
  margin: 0,
  color: "#111827",
  fontSize: 24,
  lineHeight: 1.3,
  fontWeight: 850,
};

const englishTitle = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.25,
};

const description = {
  margin: "14px 0 0",
  color: "#334155",
  fontSize: 14,
  lineHeight: 1.65,
};

const descriptionEn = {
  margin: "6px 0 0",
  color: "#94a3b8",
  fontSize: 13,
  lineHeight: 1.6,
  fontStyle: "italic" as const,
};

const ratingRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 8,
  marginTop: 14,
};

const stars = {
  color: "#f59e0b",
  fontSize: 17,
  letterSpacing: 1,
};

const ratingText = {
  color: "#111827",
  fontSize: 14,
  fontWeight: 800,
};

const reviewCount = {
  color: "#64748b",
  fontSize: 13,
};

const comparisonSection = {
  marginTop: 20,
  padding: 15,
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  background:
    "linear-gradient(145deg,#f8fafc,#ffffff)",
};

const comparisonHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 10,
  marginBottom: 13,
};

const comparisonEyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 1.2,
};

const comparisonTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: 15,
};

const comparisonBadge = {
  padding: "6px 9px",
  borderRadius: 999,
  background: "#ede9fe",
  color: "#6d28d9",
  fontSize: 9,
  fontWeight: 900,
};

const comparisonGrid = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) auto minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
};

const comparisonImageCard = {
  minWidth: 0,
  overflow: "hidden",
  borderRadius: 13,
  background: "#fff",
  border: "1px solid #e2e8f0",
};

const comparisonImageWrapper = {
  position: "relative" as const,
  height: 115,
  overflow: "hidden",
  background: "#e2e8f0",
};

const comparisonImage = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover" as const,
};

const beforeBadge = {
  position: "absolute" as const,
  top: 8,
  left: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(15,23,42,.82)",
  color: "#fff",
  fontSize: 8,
  fontWeight: 900,
};

const afterBadge = {
  position: "absolute" as const,
  top: 8,
  left: 8,
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(22,163,74,.9)",
  color: "#fff",
  fontSize: 8,
  fontWeight: 900,
};

const comparisonCaption = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
  padding: "9px 10px",
  color: "#334155",
  fontSize: 11,
};

const comparisonArrow = {
  width: 30,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "#2563eb",
  color: "#fff",
  fontSize: 17,
  fontWeight: 900,
  boxShadow:
    "0 5px 14px rgba(37,99,235,.22)",
};

const metaRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 12,
  marginTop: 18,
};

const duration = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 3,
  color: "#475569",
  fontSize: 13,
  fontWeight: 700,
};

const durationChinese = {
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 500,
};

const status = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 9px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
};

const footer = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 16,
  marginTop: "auto",
  paddingTop: 22,
};

const priceLabel = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1,
};

const price = {
  display: "block",
  marginTop: 4,
  color: "#2563eb",
  fontSize: 28,
  lineHeight: 1.1,
  fontWeight: 900,
};

const bookButton = {
  minWidth: 128,
  padding: "10px 16px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  border: "none",
  borderRadius: 12,
  background: "#22c55e",
  color: "#fff",
  boxShadow:
    "0 8px 18px rgba(34,197,94,.22)",
};

const bookButtonChinese = {
  fontSize: 14,
  fontWeight: 900,
};

const bookButtonEnglish = {
  fontSize: 10,
  fontWeight: 700,
  opacity: 0.9,
  letterSpacing: 0.3,
};

const beforeAfterContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  marginTop: 18,
};

const compareBlock = {
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  background: "#f8fafc",
};

const compareTitle = {
  padding: "8px 10px",
  color: "#334155",
  fontSize: 11,
  fontWeight: 900,
  textAlign: "center" as const,
};

const compareImage = {
  width: "100%",
  height: 120,
  display: "block",
  objectFit: "cover" as const,
};

export default ServiceCard;