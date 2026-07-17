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

  const savings = Math.max(
    Number(packageItem.original_price || 0) -
      Number(packageItem.package_price || 0),
    0
  );

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
          <div style={placeholder}>🎁</div>
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
                <span>
                  ✓ {service?.service_name}
                </span>

                {service?.service_name_en && (
                  <small style={includedEnglish}>
                    {service.service_name_en}
                  </small>
                )}
              </div>
            ))
          )}
        </div>

<div style={metaRow}>
  <span style={status}>
    可预约 / Available
  </span>
</div>

        <div style={footer}>
          <div>
            <span style={originalPrice}>
              原价{" "}
              {formatCurrency(
                packageItem.original_price
              )}
            </span>

            <strong style={packagePrice}>
              {formatCurrency(
                packageItem.package_price
              )}
            </strong>

            {savings > 0 && (
              <span style={savingText}>
                节省 {formatCurrency(savings)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onBook?.(packageItem)}
            style={bookButton}
          >
           <span style={bookChinese}>
  🔍 查看详情
</span>

<span style={bookEnglish}>
  View Details
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
  borderRadius: 22,
  background: "#fff",
  boxShadow:
    "0 14px 36px rgba(15,23,42,.09)",
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
  background: "rgba(37,99,235,.94)",
  color: "#fff",
  fontSize: 10,
  fontWeight: 900,
};

const popularBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "rgba(220,38,38,.94)",
  color: "#fff",
  fontSize: 10,
  fontWeight: 900,
};

const content = {
  padding: 20,
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
  gap: 8,
  marginTop: 18,
  padding: 15,
  borderRadius: 14,
  background: "#f8fafc",
};

const includedTitle = {
  color: "#2563eb",
  fontSize: 12,
};

const includedItem = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
  color: "#334155",
  fontSize: 13,
};

const includedEnglish = {
  color: "#94a3b8",
  fontSize: 11,
};

const emptyText = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 12,
};

const metaRow = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 12,
  marginTop: 16,
};


const status = {
  padding: "6px 9px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: 10,
  fontWeight: 900,
};

const footer = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  flexWrap: "wrap" as const,
  gap: 16,
  marginTop: 20,
};

const originalPrice = {
  display: "block",
  color: "#94a3b8",
  fontSize: 12,
  textDecoration: "line-through",
};

const packagePrice = {
  display: "block",
  marginTop: 4,
  color: "#2563eb",
  fontSize: 29,
  lineHeight: 1.1,
};

const savingText = {
  display: "block",
  marginTop: 6,
  color: "#15803d",
  fontSize: 11,
  fontWeight: 800,
};

const bookButton = {
  minWidth: 135,
  padding: "11px 16px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 2,
  border: "none",
  borderRadius: 13,
  background: "#7c3aed",
  color: "#fff",
  cursor: "pointer",
  boxShadow:
    "0 8px 18px rgba(124,58,237,.22)",
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