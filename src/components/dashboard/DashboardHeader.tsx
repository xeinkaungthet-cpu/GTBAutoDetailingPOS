type DashboardHeaderProps = {
  businessScore?: number;
  loading?: boolean;
  onRefresh?: () => void;
  onOpenAI?: () => void;
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 18) {
    return "Good Afternoon";
  }

  return "Good Evening";
}

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function getScoreStatus(score: number) {
  if (score >= 90) {
    return {
      label: "Excellent",
      color: "#15803d",
      background: "#dcfce7",
    };
  }

  if (score >= 75) {
    return {
      label: "Good",
      color: "#1d4ed8",
      background: "#dbeafe",
    };
  }

  if (score >= 60) {
    return {
      label: "Needs Attention",
      color: "#b45309",
      background: "#fef3c7",
    };
  }

  return {
    label: "High Risk",
    color: "#b91c1c",
    background: "#fee2e2",
  };
}

function DashboardHeader({
  businessScore = 96,
  loading = false,
  onRefresh,
  onOpenAI,
}: DashboardHeaderProps) {
  const scoreStatus = getScoreStatus(businessScore);

  return (
    <section style={headerCard}>
      <div style={decorativeGlowOne} />
      <div style={decorativeGlowTwo} />

      <div style={headerContent}>
        <div style={welcomeSection}>
          <div style={brandBadge}>
            <span style={brandDot} />
            GTB1N EXECUTIVE DASHBOARD
          </div>

          <h1 style={title}>
            {getGreeting()} <span aria-hidden="true">👋</span>
          </h1>

          <p style={businessName}>
            GTB1N Auto Detailing & Window Film
          </p>

          <p style={dateText}>{formatToday()}</p>

          <p style={summaryText}>
            查看今日营业表现、利润、订单、预约、库存和经营风险。
          </p>

          <div style={actionRow}>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              style={{
                ...primaryButton,
                opacity: loading ? 0.65 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <span style={buttonIcon}>
                {loading ? "⏳" : "↻"}
              </span>

              {loading ? "Refreshing..." : "Refresh Data"}
            </button>

            <button
              type="button"
              onClick={onOpenAI}
              style={secondaryButton}
            >
              <span style={buttonIcon}>🤖</span>
              Open AI Assistant
            </button>
          </div>
        </div>

        <div style={scoreCard}>
          <div style={scoreHeader}>
            <div>
              <p style={scoreEyebrow}>
                BUSINESS HEALTH
              </p>

              <h2 style={scoreTitle}>
                AI Business Score
              </h2>
            </div>

            <span
              style={{
                ...statusBadge,
                color: scoreStatus.color,
                background: scoreStatus.background,
              }}
            >
              {scoreStatus.label}
            </span>
          </div>

          <div style={scoreBody}>
            <div style={scoreCircle}>
              <div style={scoreInnerCircle}>
                <strong style={scoreValue}>
                  {businessScore}
                </strong>

                <span style={scoreMaximum}>/ 100</span>
              </div>
            </div>

            <div style={scoreDetails}>
              <div style={scoreStars}>
                ★★★★★
              </div>

              <p style={scoreDescription}>
                今日整体经营状态良好。请继续关注退款、
                现金差额和库存预警。
              </p>

              <div style={scoreProgressTrack}>
                <div
                  style={{
                    ...scoreProgressBar,
                    width: `${Math.max(
                      0,
                      Math.min(businessScore, 100),
                    )}%`,
                  }}
                />
              </div>

              <div style={scoreProgressLabels}>
                <span>Risk</span>
                <span>Excellent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const headerCard = {
  position: "relative" as const,
  overflow: "hidden",
  marginBottom: 24,
  padding: 28,
  border: "1px solid rgba(212, 175, 55, 0.28)",
  borderRadius: 24,
  background:
    "linear-gradient(135deg, #080b12 0%, #111827 48%, #15110a 100%)",
  boxShadow:
    "0 22px 55px rgba(15, 23, 42, 0.18)",
};

const decorativeGlowOne = {
  position: "absolute" as const,
  top: -120,
  right: -70,
  width: 310,
  height: 310,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(212,175,55,.22) 0%, rgba(212,175,55,0) 72%)",
  pointerEvents: "none" as const,
};

const decorativeGlowTwo = {
  position: "absolute" as const,
  bottom: -150,
  left: "35%",
  width: 280,
  height: 280,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(59,130,246,.12) 0%, rgba(59,130,246,0) 72%)",
  pointerEvents: "none" as const,
};

const headerContent = {
  position: "relative" as const,
  zIndex: 1,
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.35fr) minmax(310px, .65fr)",
  gap: 24,
  alignItems: "stretch",
};

const welcomeSection = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
};

const brandBadge = {
  width: "fit-content",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 11px",
  border: "1px solid rgba(250, 204, 21, .30)",
  borderRadius: 999,
  background: "rgba(250, 204, 21, .08)",
  color: "#facc15",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "1.45px",
};

const brandDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#facc15",
  boxShadow: "0 0 12px rgba(250,204,21,.9)",
};

const title = {
  margin: "20px 0 0",
  color: "#ffffff",
  fontSize: "clamp(30px, 4vw, 48px)",
  lineHeight: 1.05,
  fontWeight: 900,
  letterSpacing: "-1.1px",
};

const businessName = {
  margin: "12px 0 0",
  color: "#f5d36a",
  fontSize: 18,
  fontWeight: 850,
};

const dateText = {
  margin: "8px 0 0",
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 700,
};

const summaryText = {
  maxWidth: 660,
  margin: "13px 0 0",
  color: "#94a3b8",
  fontSize: 14,
  lineHeight: 1.7,
};

const actionRow = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 10,
  marginTop: 22,
};

const primaryButton = {
  minHeight: 43,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  border: "none",
  borderRadius: 12,
  background:
    "linear-gradient(135deg, #f5c84b, #c69214)",
  color: "#111827",
  fontWeight: 900,
  boxShadow:
    "0 10px 24px rgba(212,175,55,.22)",
};

const secondaryButton = {
  minHeight: 43,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 12,
  background: "rgba(255,255,255,.06)",
  color: "#f8fafc",
  cursor: "pointer",
  fontWeight: 850,
};

const buttonIcon = {
  fontSize: 15,
};

const scoreCard = {
  minWidth: 0,
  padding: 20,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 20,
  background: "rgba(255,255,255,.055)",
  backdropFilter: "blur(14px)",
};

const scoreHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const scoreEyebrow = {
  margin: 0,
  color: "#d4af37",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "1.3px",
};

const scoreTitle = {
  margin: "5px 0 0",
  color: "#ffffff",
  fontSize: 18,
};

const statusBadge = {
  flexShrink: 0,
  padding: "6px 9px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
};

const scoreBody = {
  display: "grid",
  gridTemplateColumns: "118px minmax(0, 1fr)",
  gap: 18,
  alignItems: "center",
  marginTop: 20,
};

const scoreCircle = {
  width: 118,
  height: 118,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  background:
    "conic-gradient(#d4af37 0deg, #f5d36a 345deg, rgba(255,255,255,.12) 345deg)",
  boxShadow:
    "0 0 34px rgba(212,175,55,.15)",
};

const scoreInnerCircle = {
  width: 94,
  height: 94,
  display: "flex",
  alignItems: "baseline",
  justifyContent: "center",
  borderRadius: "50%",
  background: "#111827",
};

const scoreValue = {
  color: "#ffffff",
  fontSize: 35,
  lineHeight: 1,
};

const scoreMaximum = {
  marginLeft: 3,
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 800,
};

const scoreDetails = {
  minWidth: 0,
};

const scoreStars = {
  color: "#facc15",
  fontSize: 17,
  letterSpacing: "2px",
};

const scoreDescription = {
  margin: "10px 0 0",
  color: "#cbd5e1",
  fontSize: 12,
  lineHeight: 1.65,
};

const scoreProgressTrack = {
  height: 7,
  marginTop: 15,
  overflow: "hidden",
  borderRadius: 999,
  background: "rgba(255,255,255,.10)",
};

const scoreProgressBar = {
  height: "100%",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, #d4af37, #facc15)",
};

const scoreProgressLabels = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 5,
  color: "#64748b",
  fontSize: 9,
  fontWeight: 800,
};

export default DashboardHeader;