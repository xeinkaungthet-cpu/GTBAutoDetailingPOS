function Footer() {
  return (
    <footer style={footer}>
      <div style={container}>
        <div style={section}>
          <h2 style={brand}>GTB Auto Detailing</h2>

          <p style={description}>
            Professional Auto Detailing & Car Wash
          </p>

          <p style={description}>
            专业洗车 · 汽车美容 · 抛光 · 镀晶护理
          </p>
        </div>

        <div style={section}>
          <h3 style={title}>联系我们 / Contact</h3>

          <a href="tel:09443751188" style={link}>
            📞 09443751188
          </a>

          <a href="tel:09695653413" style={link}>
            📞 09695653413
          </a>

          <a
            href="mailto:xeinkaungthet@gmail.com"
            style={link}
          >
            ✉️ xeinkaungthet@gmail.com
          </a>

          <p style={item}>💬 WeChat: buyaowen9</p>
        </div>

        <div style={section}>
          <h3 style={title}>店铺信息 / Information</h3>

          <p style={item}>📍 MUSE</p>

          <p style={item}>
            🕘 08:00 AM – 07:00 PM
          </p>

          <p style={item}>
            Open Daily / 每日营业
          </p>
        </div>
      </div>

      <div style={bottom}>
        © {new Date().getFullYear()} GTB Auto Detailing.
        All rights reserved.
      </div>
    </footer>
  );
}

const footer = {
  marginTop: "70px",
  background:
    "linear-gradient(135deg, #111827 0%, #030712 100%)",
  color: "#ffffff",
  borderTop: "1px solid rgba(212, 175, 55, 0.35)",
};

const container = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "45px 24px",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "35px",
};

const section = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
  gap: "10px",
};

const brand = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 900,
  color: "#d4af37",
};

const title = {
  margin: "0 0 8px",
  fontSize: "18px",
  color: "#d4af37",
};

const description = {
  margin: 0,
  color: "#d1d5db",
  lineHeight: 1.7,
};

const link = {
  color: "#e5e7eb",
  textDecoration: "none",
  lineHeight: 1.8,
  wordBreak: "break-word" as const,
};

const item = {
  margin: 0,
  color: "#e5e7eb",
  lineHeight: 1.8,
};

const bottom = {
  padding: "18px 20px",
  textAlign: "center" as const,
  color: "#9ca3af",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  fontSize: "14px",
};

export default Footer;