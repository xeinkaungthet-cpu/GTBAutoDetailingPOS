import type { Service } from "../../types/database";
import ServiceCard from "./ServiceCard";

type Props = {
  title: string;
  services: Service[];
  onBook?: (service: Service) => void;
};

type CategoryInfo = {
  icon: string;
  englishTitle: string;
  description: string;
  descriptionEn: string;
};

function CategorySection({
  title,
  services,
  onBook,
}: Props) {
  if (services.length === 0) return null;

  const categoryInfo = getCategoryInfo(title);

  return (
    <section style={section}>
      <div style={sectionHeader}>
        <div style={headingBlock}>
          <div style={iconBox}>
            {categoryInfo.icon}
          </div>

          <div>
            <p style={eyebrow}>
              SERVICE CATEGORY
            </p>

            <h2 style={titleStyle}>
              {title}
            </h2>

            <p style={englishTitle}>
              {categoryInfo.englishTitle}
            </p>
          </div>
        </div>

        <div style={serviceCount}>
          <strong style={serviceCountNumber}>
            {services.length}
          </strong>

          <span style={serviceCountLabel}>
            {services.length === 1
              ? "Service"
              : "Services"}
          </span>

          <span style={serviceCountChinese}>
            可预约服务
          </span>
        </div>
      </div>

      <div style={descriptionCard}>
        <p style={description}>
          {categoryInfo.description}
        </p>

        <p style={descriptionEnglish}>
          {categoryInfo.descriptionEn}
        </p>
      </div>

      <div style={serviceGrid}>
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onBook={onBook}
          />
        ))}
      </div>
    </section>
  );
}

function getCategoryInfo(
  category: string
): CategoryInfo {
  switch (category) {
    case "洗车":
      return {
        icon: "🚗",
        englishTitle: "Car Wash",
        description:
          "专业车身清洗服务，保持车辆干净整洁。",
        descriptionEn:
          "Professional exterior washing services to keep your vehicle clean and refreshed.",
      };

    case "美容":
      return {
        icon: "✨",
        englishTitle: "Auto Detailing",
        description:
          "恢复车漆光泽，并提供更全面的外观护理。",
        descriptionEn:
          "Restore paint gloss and enhance your vehicle with professional detailing care.",
      };

    case "镀膜":
      return {
        icon: "🛡️",
        englishTitle: "Paint Protection",
        description:
          "为车漆增加保护层，提升光泽和耐久性。",
        descriptionEn:
          "Protect your paintwork with durable coatings and long-lasting gloss.",
      };

    case "清洁":
      return {
        icon: "🧽",
        englishTitle: "Deep Cleaning",
        description:
          "深度清洁内饰、发动机舱及车内空气环境。",
        descriptionEn:
          "Deep cleaning solutions for interiors, engine bays and cabin hygiene.",
      };

    default:
      return {
        icon: "⭐",
        englishTitle: "Other Services",
        description:
          "更多专业汽车美容与护理服务。",
        descriptionEn:
          "More professional vehicle care and detailing services.",
      };
  }
}

const section = {
  marginBottom: 70,
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 20,
  marginBottom: 18,
};

const headingBlock = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const iconBox = {
  width: 58,
  height: 58,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: 18,
  background:
    "linear-gradient(135deg,#dbeafe,#e0e7ff)",
  fontSize: 30,
  boxShadow:
    "0 10px 24px rgba(37,99,235,.12)",
};

const eyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1.4,
};

const titleStyle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: 36,
  lineHeight: 1.15,
  fontWeight: 900,
};

const englishTitle = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 17,
  fontWeight: 650,
};

const serviceCount = {
  minWidth: 112,
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 16,
  background: "#fff",
  border: "1px solid #e2e8f0",
  boxShadow:
    "0 8px 22px rgba(15,23,42,.06)",
};

const serviceCountNumber = {
  color: "#2563eb",
  fontSize: 24,
  lineHeight: 1,
};

const serviceCountLabel = {
  marginTop: 5,
  color: "#334155",
  fontSize: 11,
  fontWeight: 800,
};

const serviceCountChinese = {
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 10,
};

const descriptionCard = {
  marginBottom: 24,
  padding: "15px 18px",
  borderLeft: "4px solid #2563eb",
  borderRadius: "0 14px 14px 0",
  background: "#f8fafc",
};

const description = {
  margin: 0,
  color: "#334155",
  fontSize: 14,
  lineHeight: 1.65,
  fontWeight: 650,
};

const descriptionEnglish = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.6,
};

const serviceGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "stretch",
  gap: 25,
};

export default CategorySection;