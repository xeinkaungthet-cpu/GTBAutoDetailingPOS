import { QRCodeSVG } from "qrcode.react";

const MENU_URL =
  "https://gtbautodetailingpos.pages.dev/menu";

function MenuQRCode() {
  function printQRCode() {
    window.print();
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={badge}>
          GTB Auto Detailing & Window Film
        </div>

        <h1 style={title}>
          客户服务菜单二维码
        </h1>

        <p style={subtitle}>
          Customer Service Menu QR Code
        </p>

        <div style={qrWrapper}>
          <QRCodeSVG
            value={MENU_URL}
            size={260}
            level="H"
            includeMargin
          />
        </div>

        <h2 style={scanTitle}>
          扫码查看服务与套餐
        </h2>

        <p style={scanEnglish}>
          Scan to View Services & Packages
        </p>

        <p style={urlText}>
          {MENU_URL}
        </p>

        <div style={actions}>
          <a
            href={MENU_URL}
            target="_blank"
            rel="noreferrer"
            style={openButton}
          >
            打开菜单 / Open Menu
          </a>

          <button
            type="button"
            onClick={printQRCode}
            style={printButton}
          >
            🖨️ 打印二维码 / Print
          </button>
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "48px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg,#eef2ff,#f8fafc,#ecfdf5)",
};

const card = {
  width: "100%",
  maxWidth: 620,
  padding: "42px 30px",
  background: "#ffffff",
  borderRadius: 28,
  textAlign: "center" as const,
  border: "1px solid #e2e8f0",
  boxShadow:
    "0 24px 65px rgba(15,23,42,.14)",
};

const badge = {
  display: "inline-flex",
  padding: "8px 15px",
  borderRadius: 999,
  background: "#111827",
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1.2,
};

const title = {
  margin: "22px 0 6px",
  color: "#0f172a",
  fontSize: 31,
};

const subtitle = {
  margin: "0 0 28px",
  color: "#64748b",
  fontSize: 15,
};

const qrWrapper = {
  display: "inline-flex",
  padding: 18,
  background: "#ffffff",
  borderRadius: 22,
  border: "2px solid #e2e8f0",
  boxShadow:
    "0 14px 32px rgba(15,23,42,.10)",
};

const scanTitle = {
  margin: "25px 0 5px",
  color: "#0f172a",
  fontSize: 23,
};

const scanEnglish = {
  margin: 0,
  color: "#64748b",
  fontSize: 14,
};

const urlText = {
  margin: "18px auto 24px",
  padding: "11px 14px",
  maxWidth: 430,
  borderRadius: 12,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 12,
  wordBreak: "break-all" as const,
};

const actions = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap" as const,
  gap: 12,
};

const buttonBase = {
  minHeight: 46,
  padding: "0 20px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  fontWeight: 850,
  fontSize: 14,
  cursor: "pointer",
};

const openButton = {
  ...buttonBase,
  background: "#16a34a",
  color: "#ffffff",
  textDecoration: "none",
  border: "none",
};

const printButton = {
  ...buttonBase,
  background: "#111827",
  color: "#ffffff",
  border: "none",
};

export default MenuQRCode;