import type { Package } from "../../services/packageService";
import { formatCurrency } from "../../utils/currency";

type Props = {
  packageItem: Package;
  onBook?: (packageItem: Package) => void;
};

function PackageCard({
  packageItem,
  onBook,
}: Props) {
  const includedServices =
    packageItem.package_services
      ?.map((item) => item.services)
      .filter(Boolean) ?? [];

  const originalPrice = Number(
    packageItem.original_price || 0
  );

  const currentPrice = Number(
    packageItem.package_price || 0
  );

  const savings = Math.max(
    originalPrice - currentPrice,
    0
  );

  const discountPercent =
    originalPrice > 0 && savings > 0
      ? Math.round(
          (savings / originalPrice) * 100
        )
      : 0;

  return (
    <article style={card}>
      <div style={imageWrapper}>
        {packageItem.image_url ? (
          <img
            src={packageItem.image_url}
            alt={packageItem.package_name}
            style={image}
          />
        ) : (
          <div style={placeholder}>
            🎁
          </div>
        )}

        <div style={badgeRow}>
          <span style={packageBadge}>
            套餐 / PACKAGE
          </span>

          {packageItem.is_popular && (
            <span style={popularBadge}>
              🔥 BEST VALUE
            </span>
          )}
        </div>

        {discountPercent > 0 && (
          <div style={discountBadge}>
            SAVE {discountPercent}%
          </div>
        )}
      </div>

      <div style={content}>
        <h2 style={title}>
          {packageItem.package_name}
        </h2>

        {packageItem.package_name_en && (
          <p style={englishTitle}>
            {packageItem.package_name_en}
          </p>
        )}

        {packageItem.description && (
          <p style={description}>
            {packageItem.description}
          </p>
        )}

        {packageItem.description_en && (
          <p style={descriptionEn}>
            {packageItem.description_en}
          </p>
        )}

        <div style={includedBox}>
          <strong style={includedTitle}>
            套餐包含 / What&apos;s Included
          </strong>

          {includedServices.length === 0 ? (
            <p style={emptyText}>
              暂无服务项目
            </p>
          ) : (
            includedServices.map((service) => (
              <div
                key={service?.id}
                style={includedItem}
              >
                <div style={serviceChinese}>
                  <span style={checkIcon}>✓</span>
                  <span>
                    {service?.service_name}
                  </span>
                </div>

                {service?.service_name_en && (
                  <small style={includedEnglish}>
                    {service.service_name_en}
                  </small>
                )}
              </div>
            ))
          )}
        </div>

        <div style={availabilityRow}>
          <span style={statusDot} />

          <span style={statusText}>
            可预约 / Available
          </span>
        </div>

        <div style={footer}>
          <div style={priceSection}>
            {originalPrice > currentPrice && (
              <div style={originalPriceRow}>
                <span style={originalLabel}>
                  原价
                </span>

                <span style={originalPriceStyle}>
                  {formatCurrency(originalPrice)}
                </span>
              </div>
            )}

            <div style={currentPriceRow}>
              <span style={currentLabel}>
                现价
              </span>

              <strong style={packagePrice}>
                {formatCurrency(currentPrice)}
              </strong>
            </div>

            {savings > 0 && (
              <div style={savingText}>
                立即节省{" "}
                {formatCurrency(savings)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              onBook?.(packageItem)
            }
            style={bookButton}
          >
            <span style={bookChinese}>
              📅 立即预约
            </span>

            <span style={bookEnglish}>
              Book Package
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

const card = {
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  borderRadius: 24,
  background: "#ffffff",
  boxShadow:
    "0 18px 45px rgba(15,23,42,.10)",
  transition:
    "transform .2s ease, box-shadow .2s ease",
};

const imageWrapper = {
  position: "relative" as const,
  height: 230,
  background: "#e2e8f0",
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
    "linear-gradient(135deg,#dbeafe,#ede9fe)",
  fontSize: 70,
};

const badgeRow = {
  position: "absolute" as const,
  top: 14,
  left: 14,
  right: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap" as const,
};

const packageBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "rgba(37,99,235,.95)",
  color: "#ffffff",
  fontSize: 10,
  fontWeight: 900,
};

const popularBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "rgba(220,38,38,.95)",
  color: "#ffffff",
  fontSize: 10,
  fontWeight: 900,
};

const discountBadge = {
  position: "absolute" as const,
  right: 14,
  bottom: 14,
  padding: "8px 12px",
  borderRadius: 999,
  background: "#111827",
  color: "#fbbf24",
  fontSize: 11,
  fontWeight: 900,
  boxShadow:
    "0 8px 18px rgba(0,0,0,.20)",
};

const content = {
  padding: 22,
};

const title = {
  margin: 0,
  color: "#111827",
  fontSize: 25,
  lineHeight: 1.3,
};

const englishTitle = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 15,
  fontWeight: 650,
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

const includedBox = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
  marginTop: 18,
  padding: 16,
  borderRadius: 15,
  background: "#f8fafc",
  border: "1px solid #f1f5f9",
};

const includedTitle = {
  marginBottom: 2,
  color: "#2563eb",
  fontSize: 12,
};

const includedItem = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 3,
  color: "#334155",
  fontSize: 13,
};

const serviceChinese = {
  display: "flex",
  alignItems: "center",
  gap: 7,
};

const checkIcon = {
  color: "#16a34a",
  fontWeight: 900,
};

const includedEnglish = {
  paddingLeft: 20,
  color: "#94a3b8",
  fontSize: 11,
};

const emptyText = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 12,
};

const availabilityRow = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  marginTop: 16,
  padding: "7px 11px",
  borderRadius: 999,
  background: "#dcfce7",
};

const statusDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#16a34a",
};

const statusText = {
  color: "#15803d",
  fontSize: 11,
  fontWeight: 900,
};

const footer = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  flexWrap: "wrap" as const,
  gap: 18,
  marginTop: 20,
  paddingTop: 18,
  borderTop: "1px solid #f1f5f9",
};

const priceSection = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
};

const originalPriceRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const originalLabel = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const originalPriceStyle = {
  color: "#94a3b8",
  fontSize: 14,
  textDecoration: "line-through",
  textDecorationThickness: "2px",
};

const currentPriceRow = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  marginTop: 5,
};

const currentLabel = {
  padding: "4px 7px",
  borderRadius: 6,
  background: "#fee2e2",
  color: "#dc2626",
  fontSize: 11,
  fontWeight: 900,
};

const packagePrice = {
  color: "#dc2626",
  fontSize: 31,
  lineHeight: 1.1,
  fontWeight: 900,
};

const savingText = {
  marginTop: 7,
  color: "#15803d",
  fontSize: 12,
  fontWeight: 800,
};

const bookButton = {
  minWidth: 140,
  padding: "12px 17px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 2,
  border: "none",
  borderRadius: 14,
  background:
    "linear-gradient(135deg,#7c3aed,#6d28d9)",
  color: "#ffffff",
  cursor: "pointer",
  boxShadow:
    "0 10px 22px rgba(124,58,237,.25)",
};

const bookChinese = {
  fontSize: 14,
  fontWeight: 900,
};

const bookEnglish = {
  fontSize: 10,
  fontWeight: 700,
  opacity: 0.9,
};

export default PackageCard;