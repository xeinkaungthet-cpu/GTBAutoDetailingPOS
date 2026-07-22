import type { Service } from "../../types/database";
import type { Package } from "../../services/packageService";
import useCurrency from "../../hooks/useCurrency";

type Props = {
  service?: Service;
  packageItem?: Package;
  onClose: () => void;
  onBook: () => void;
};

function ItemDetailModal({
  service,
  packageItem,
  onClose,
  onBook,
}: Props) {
  const {
    formatMoney,
    displayCurrency,
  } = useCurrency();

  if (!service && !packageItem) {
    return null;
  }

  const isPackage = Boolean(packageItem);

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

  const price = isPackage
    ? Number(packageItem?.package_price || 0)
    : Number(service?.price || 0);

  const originalPrice = isPackage
    ? Number(packageItem?.original_price || 0)
    : 0;

  const savings = isPackage
    ? Math.max(originalPrice - price, 0)
    : 0;

  const showOriginalPrice =
    isPackage && originalPrice > price;

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

          <h2 style={titleStyle}>
            {title}
          </h2>

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

                      <div style={includedServiceContent}>
                        <div style={includedServiceHeader}>
                          <strong>
                            {item?.service_name}
                          </strong>

                          <span style={includedServicePrice}>
                            {formatMoney(
                              Number(item?.price || 0)
                            )}
                          </span>
                        </div>

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
                {isPackage
                  ? "套餐价格 / Package Price"
                  : "服务价格 / Service Price"}
              </p>

              {showOriginalPrice && (
                <span style={originalPriceStyle}>
                  原价 / Original{" "}
                  {formatMoney(originalPrice)}
                </span>
              )}

              <strong style={priceStyle}>
                {formatMoney(price)}
              </strong>

              {savings > 0 && (
                <span style={savingStyle}>
                  节省 / Save {formatMoney(savings)}
                </span>
              )}
            </div>

            <span style={currencyBadge}>
              显示货币 / Currency: {displayCurrency}
            </span>
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
              onClick={onBook}
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
  width: "min(760px, 100%)",
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

const body = {
  padding: 26,
};

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

const includedServiceContent = {
  minWidth: 0,
  flex: 1,
};

const includedServiceHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const includedServicePrice = {
  flexShrink: 0,
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 900,
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

const originalPriceStyle = {
  display: "block",
  marginTop: 7,
  color: "#94a3b8",
  fontSize: 12,
  textDecoration: "line-through",
};

const priceStyle = {
  display: "block",
  marginTop: 5,
  color: "#2563eb",
  fontSize: 31,
};

const savingStyle = {
  display: "block",
  marginTop: 7,
  color: "#15803d",
  fontSize: 12,
  fontWeight: 900,
};

const currencyBadge = {
  padding: "7px 10px",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  background: "#ffffff",
  color: "#1d4ed8",
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
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