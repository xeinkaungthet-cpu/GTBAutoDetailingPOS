import type { Service } from "../../types/database";

type Props = {
  service: Service;
  quantity: number;
  onClick: () => void;
};

function ServiceCard({ service, quantity, onClick }: Props) {
  const added = quantity > 0;

  return (
    <button
      onClick={onClick}
      style={{
        ...card,
        border: added
          ? "2px solid #16a34a"
          : "1px solid #e5e7eb",
        background: added ? "#f0fdf4" : "#fff",
        boxShadow: added
          ? "0 12px 30px rgba(22,163,74,.18)"
          : "0 6px 18px rgba(15,23,42,.08)",
      }}
    >
      <div style={imageWrap}>
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.service_name}
            style={image}
          />
        ) : (
          <div style={placeholder}>🚗</div>
        )}

        {added && <span style={quantityBadge}>×{quantity}</span>}
      </div>

      <div style={content}>
        <div style={titleRow}>
          <strong style={title}>
            {added ? "✅ " : ""}
            {service.service_name}
          </strong>
        </div>

        <div style={metaRow}>
          <span style={categoryBadge}>{service.category}</span>

          <span style={duration}>
            ⏱ {service.duration_minutes || 0} min
          </span>
        </div>

        <div style={footer}>
          <strong style={price}>
            ${Number(service.price).toFixed(2)}
          </strong>

          <span
            style={{
              ...status,
              color: added ? "#15803d" : "#2563eb",
            }}
          >
            {added ? "Added" : "+ Add"}
          </span>
        </div>
      </div>
    </button>
  );
}

const card = {
  width: "100%",
  padding: 0,
  overflow: "hidden",
  borderRadius: 18,
  cursor: "pointer",
  transition: "all .2s ease",
  textAlign: "left" as const,
};

const imageWrap = {
  height: 145,
  position: "relative" as const,
  background: "#e5e7eb",
};

const image = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  display: "block",
};

const placeholder = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 48,
  background: "linear-gradient(135deg,#dbeafe,#e0e7ff)",
};

const quantityBadge = {
  position: "absolute" as const,
  top: 10,
  right: 10,
  background: "#16a34a",
  color: "#fff",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 800,
  boxShadow: "0 4px 12px rgba(0,0,0,.18)",
};

const content = {
  padding: 16,
};

const titleRow = {
  minHeight: 44,
};

const title = {
  fontSize: 16,
  lineHeight: 1.4,
};

const metaRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginTop: 10,
};

const categoryBadge = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 700,
};

const duration = {
  color: "#6b7280",
  fontSize: 12,
};

const footer = {
  marginTop: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const price = {
  fontSize: 22,
  color: "#111827",
};

const status = {
  fontSize: 14,
  fontWeight: 800,
};

export default ServiceCard;