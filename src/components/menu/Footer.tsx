function Footer() {
  return (
    <footer style={footer}>
      <h2>GTB Auto Detailing</h2>

      <p>Professional Car Wash · Auto Detailing · Ceramic Coating</p>

      <div style={links}>
        <span>📍 Location</span>
        <span>📞 Call</span>
        <span>💬 WhatsApp</span>
        <span>⭐ Google Review</span>
      </div>

      <p style={{ marginTop: 20, opacity: 0.7 }}>
        © 2026 GTB Auto Detailing. All rights reserved.
      </p>
    </footer>
  );
}

const footer = {
  marginTop: 60,
  padding: 40,
  textAlign: "center" as const,
  background: "#111827",
  color: "#fff",
  borderRadius: 24,
};

const links = {
  display: "flex",
  justifyContent: "center",
  gap: 20,
  flexWrap: "wrap" as const,
  marginTop: 20,
};

export default Footer;