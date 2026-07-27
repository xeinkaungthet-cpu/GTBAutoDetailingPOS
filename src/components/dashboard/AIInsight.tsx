type InsightLevel = "success" | "warning" | "danger";

export type AIInsightItem = {
  title: string;
  description: string;
  level: InsightLevel;
};

type AIInsightProps = {
  businessScore?: number;
  summary?: string;
  insights?: AIInsightItem[];
};

const defaultInsights: AIInsightItem[] = [
  {
    title: "Revenue Increased",
    description: "Today's revenue is 12% higher than yesterday.",
    level: "success",
  },
  {
    title: "Inventory Alert",
    description: "Glass Cleaner stock is running low.",
    level: "warning",
  },
  {
    title: "VIP Follow-up",
    description: "18 VIP customers have not returned for over 30 days.",
    level: "danger",
  },
];

function AIInsight({
  businessScore = 96,
  summary = "Today's business performance is healthy. Continue promoting Ceramic Coating and monitor inventory levels.",
  insights = defaultInsights,
}: AIInsightProps) {
  return (
    <section style={card}>
      <div style={header}>
        <div>
          <p style={eyebrow}>AI BUSINESS ASSISTANT</p>

          <h2 style={title}>GTB1N AI Insight</h2>

          <p style={description}>
            AI 自动分析今日经营状况，并提供建议。
          </p>
        </div>

        <div style={scoreBadge}>
          {businessScore}/100
        </div>
      </div>

      <div style={summaryBox}>
        <strong>Today's Summary</strong>

        <p>{summary}</p>
      </div>

      <div style={list}>
        {insights.map((item) => (
          <article
            key={item.title}
            style={{
              ...itemCard,
              borderLeft: `6px solid ${getColor(item.level)}`,
            }}
          >
            <h4>{item.title}</h4>

            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function getColor(level: InsightLevel) {
  switch (level) {
    case "success":
      return "#16a34a";

    case "warning":
      return "#ca8a04";

    case "danger":
      return "#dc2626";
  }
}

const card = {
  padding: 22,
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  background: "#fff",
  boxShadow: "0 10px 25px rgba(0,0,0,.06)",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: "#b88916",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "1.5px",
};

const title = {
  margin: "5px 0",
  fontSize: 24,
  fontWeight: 900,
};

const description = {
  margin: 0,
  color: "#64748b",
};

const scoreBadge = {
  padding: "10px 16px",
  borderRadius: 12,
  background: "#111827",
  color: "#fff",
  fontWeight: 900,
  fontSize: 22,
};

const summaryBox = {
  padding: 18,
  borderRadius: 16,
  background: "#f8fafc",
  marginBottom: 18,
};

const list = {
  display: "grid",
  gap: 14,
};

const itemCard = {
  padding: 16,
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
};

export default AIInsight;