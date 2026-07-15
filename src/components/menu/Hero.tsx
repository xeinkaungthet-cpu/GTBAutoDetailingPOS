import heroImage from "../../assets/hero.png";
import gtbLogo from "../../assets/gtb-logo.jpg";

function Hero() {
  return (
    <header style={wrapper}>
      {/* 顶部联系方式 */}
      <div style={contactBar}>
        <div style={contactContent}>
  <a
    href="tel:09443751188"
    style={contactLink}
  >
    📞 09443751188
  </a>

  <a
    href="tel:09695653413"
    style={contactLink}
  >
    📞 09695653413
  </a>

  <a
    href="mailto:xeinkaungthet@gmail.com"
    style={contactLink}
  >
    ✉️ xeinkaungthet@gmail.com
  </a>

  <span style={contactItem}>
    💬 WeChat: buyaowen9
  </span>

  <span style={contactItem}>
    📍 MUSE
  </span>

  <span style={contactItem}>
    🕘 08:00 AM – 07:00 PM
  </span>
</div>
      </div>

      {/* Hero 主区域 */}
      <div style={hero}>
        <div style={overlay} />

        <div style={heroContent}>
          <div style={logoFrame}>
            <img
              src={gtbLogo}
              alt="GTB Auto Detailing Logo"
              style={logo}
            />
          </div>

          <p style={eyebrow}>
            PREMIUM CAR WASH · DETAILING
          </p>

          <h1 style={goldTitle}>
            GTB Auto Detailing
          </h1>

          <p style={subtitle}>
            Premium Car Wash & Professional Auto Detailing
          </p>

          <p style={servicesText}>
            Ceramic Coating · Paint Correction · Interior
            Detailing
          </p>

          <div style={rating}>
            <span style={stars}>★★★★★</span>
            <span>Professional Auto Care</span>
          </div>

          <div style={buttonRow}>
            <a
  href="#menu-content"
  style={primaryButtonLink}
>
  <span style={buttonMain}>
    📅 立即预约
  </span>

  <span style={buttonSmall}>
    Book Appointment
  </span>
</a>

            <a
  href="tel:09443751188"
  style={secondaryButton}
>
  <span style={buttonMain}>
    📞 电话联系
  </span>

  <span style={buttonSmall}>
    09443751188
  </span>
</a>
          </div>

          <div style={featureRow}>
            <span style={feature}>✓ 专业施工</span>
            <span style={feature}>✓ 高端产品</span>
            <span style={feature}>✓ 品质保证</span>
          </div>
        </div>
      </div>
    </header>
  );
}

const wrapper = {
  width: "100%",
  background: "#070b14",
};

const contactBar = {
  position: "relative" as const,
  zIndex: 5,
  padding: "11px 20px",
  borderBottom: "1px solid rgba(212,175,55,.35)",
  background: "#080b12",
};

const contactContent = {
  width: "min(1200px, 100%)",
  margin: "0 auto",

  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap" as const,

  gap: "10px 28px",

  color: "#e5e7eb",
  fontSize: 12,
  fontWeight: 650,
};

const hero = {
  position: "relative" as const,
  minHeight: "720px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "55px 20px 70px",

  backgroundImage: `url(${heroImage})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const overlay = {
  position: "absolute" as const,
  inset: 0,

  background:
    "linear-gradient(180deg,rgba(4,7,14,.78),rgba(4,7,14,.9))",
};

const heroContent = {
  position: "relative" as const,
  zIndex: 2,

  width: "min(900px, 100%)",

  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",

  textAlign: "center" as const,
};

const logoFrame = {
  width: 174,
  height: 174,

  padding: 6,

  border: "1px solid rgba(244,211,108,.75)",
  borderRadius: "50%",

  background:
    "linear-gradient(145deg,rgba(255,255,255,.2),rgba(212,175,55,.12))",

  boxShadow:
    "0 0 45px rgba(212,175,55,.25), 0 18px 50px rgba(0,0,0,.45)",
};

const logo = {
  width: "100%",
  height: "100%",

  display: "block",
  objectFit: "cover" as const,

  borderRadius: "50%",
};

const eyebrow = {
  margin: "25px 0 0",

  color: "#e6c565",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 2.6,
};

const goldTitle = {
  margin: "10px 0 0",

  background:
    "linear-gradient(90deg,#fff3b0,#d4af37,#fff0a3,#9c6b00)",

  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",

  fontSize: "clamp(40px, 7vw, 76px)",
  fontWeight: 950,
  lineHeight: 1.05,
  letterSpacing: "-1.5px",

  filter: "drop-shadow(0 4px 18px rgba(212,175,55,.18))",
};

const subtitle = {
  margin: "17px 0 0",

  color: "#f8fafc",
  fontSize: "clamp(18px, 2.5vw, 25px)",
  fontWeight: 750,
};

const servicesText = {
  margin: "9px 0 0",

  color: "#cbd5e1",
  fontSize: 14,
  lineHeight: 1.7,
};

const rating = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap" as const,

  gap: 10,
  marginTop: 20,

  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 700,
};

const stars = {
  color: "#f4c542",
  fontSize: 18,
  letterSpacing: 2,
};

const buttonRow = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap" as const,

  gap: 14,
  marginTop: 29,
};

const primaryButton = {
  minWidth: 190,

  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",

  padding: "13px 25px",

  border: "1px solid #f4d36c",
  borderRadius: 14,

  background:
    "linear-gradient(135deg,#d4af37,#9c6b00)",

  color: "#fff",
  cursor: "pointer",

  boxShadow:
    "0 12px 30px rgba(212,175,55,.28)",
};

const primaryButtonLink = {
  ...primaryButton,
  boxSizing: "border-box" as const,
  textDecoration: "none",
};

const secondaryButton = {
  minWidth: 170,

  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",

  boxSizing: "border-box" as const,
  padding: "13px 25px",

  border: "1px solid rgba(255,255,255,.4)",
  borderRadius: 14,

  background: "rgba(15,23,42,.55)",
  color: "#fff",

  textDecoration: "none",
  backdropFilter: "blur(10px)",
};

const buttonMain = {
  fontSize: 15,
  fontWeight: 900,
};

const buttonSmall = {
  marginTop: 3,
  fontSize: 10,
  fontWeight: 700,
  opacity: 0.86,
};

const featureRow = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap" as const,

  gap: "10px 24px",
  marginTop: 29,
};

const feature = {
  color: "#dbe4ef",
  fontSize: 12,
  fontWeight: 750,
};
const contactLink = {
  color: "#e5e7eb",
  textDecoration: "none",
  fontWeight: 700,
};

const contactItem = {
  color: "#e5e7eb",
  fontWeight: 700,
};

export default Hero;