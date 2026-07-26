import gtbMenuQr from "../assets/gtb-menu-qr.png";

const menuUrl =
  "https://gtbautodetailingpos.pages.dev/menu";

function CustomerQR() {
  async function copyMenuLink() {
    try {
      await navigator.clipboard.writeText(menuUrl);
      alert("客户菜单网址已复制");
    } catch {
      window.prompt("请复制客户菜单网址：", menuUrl);
    }
  }

  function openCustomerMenu() {
    window.open(menuUrl, "_blank");
  }

  function printQrCode() {
    window.print();
  }

  return (
    <div style={page}>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }

            #qr-print-area,
            #qr-print-area * {
              visibility: visible;
            }

            #qr-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              box-shadow: none !important;
              border: none !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div style={header} className="no-print">
        <div>
          <p style={eyebrow}>CUSTOMER MENU</p>

          <h1 style={heading}>
            客户扫码菜单
          </h1>

          <p style={description}>
            客户扫描二维码即可查看服务套餐和在线预约。
          </p>
        </div>
      </div>

      <div style={layout}>
        <section
          id="qr-print-area"
          style={qrCard}
        >
          <div style={brand}>
            GTB1N Auto Detailing & Window Film
          </div>

          <p style={subtitle}>
            Service Menu & Appointment
          </p>

          <div style={qrWrapper}>
            <img
              src={gtbMenuQr}
              alt="GTB 客户菜单二维码"
              style={qrImage}
            />
          </div>

          <h2 style={scanTitle}>
            扫码查看服务菜单
          </h2>

          <p style={scanText}>
            Scan to view services, packages and book an
            appointment
          </p>

          <div style={contact}>
            <span>📞 09443751188</span>
            <span>📞 09695653413</span>
            <span>📍 MUSE</span>
          </div>
        </section>

        <section style={actionCard} className="no-print">
          <h2 style={actionTitle}>
            二维码操作
          </h2>

          <p style={label}>
            正式客户菜单网址
          </p>

          <div style={urlBox}>
            {menuUrl}
          </div>

          <button
            type="button"
            onClick={openCustomerMenu}
            style={primaryButton}
          >
            🌐 打开客户菜单
          </button>

          <button
            type="button"
            onClick={copyMenuLink}
            style={secondaryButton}
          >
            🔗 复制菜单网址
          </button>

          <button
            type="button"
            onClick={printQrCode}
            style={printButton}
          >
            🖨️ 打印二维码
          </button>

          <div style={tipBox}>
            <strong>使用建议</strong>

            <p style={tipText}>
              可以把二维码打印后放在收银台、客户休息区、
              店铺门口或宣传单上。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "32px",
  background: "#f3f4f6",
};

const header = {
  maxWidth: "1150px",
  margin: "0 auto 24px",
};

const eyebrow = {
  margin: "0 0 6px",
  color: "#b8860b",
  fontSize: "13px",
  fontWeight: 800,
  letterSpacing: "1.5px",
};

const heading = {
  margin: 0,
  color: "#111827",
  fontSize: "34px",
};

const description = {
  margin: "10px 0 0",
  color: "#6b7280",
  lineHeight: 1.7,
};

const layout = {
  maxWidth: "1150px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "24px",
  alignItems: "start",
};

const qrCard = {
  padding: "38px",
  background: "#ffffff",
  borderRadius: "24px",
  textAlign: "center" as const,
  border: "1px solid #e5e7eb",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

const brand = {
  color: "#b8860b",
  fontSize: "30px",
  fontWeight: 900,
};

const subtitle = {
  margin: "8px 0 25px",
  color: "#6b7280",
};

const qrWrapper = {
  display: "inline-flex",
  padding: "18px",
  background: "#ffffff",
  borderRadius: "20px",
  border: "2px solid #e5e7eb",
};

const qrImage = {
  display: "block",
  width: "100%",
  maxWidth: "390px",
  height: "auto",
};

const scanTitle = {
  margin: "24px 0 8px",
  color: "#111827",
  fontSize: "24px",
};

const scanText = {
  maxWidth: "500px",
  margin: "0 auto",
  color: "#6b7280",
  lineHeight: 1.7,
};

const contact = {
  marginTop: "25px",
  display: "flex",
  flexWrap: "wrap" as const,
  justifyContent: "center",
  gap: "14px",
  color: "#374151",
  fontWeight: 700,
};

const actionCard = {
  padding: "30px",
  background: "#ffffff",
  borderRadius: "24px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

const actionTitle = {
  margin: "0 0 22px",
  color: "#111827",
};

const label = {
  margin: "0 0 8px",
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: 700,
};

const urlBox = {
  marginBottom: "18px",
  padding: "14px",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  color: "#374151",
  lineHeight: 1.6,
  wordBreak: "break-all" as const,
};

const buttonBase = {
  width: "100%",
  marginBottom: "12px",
  padding: "14px 18px",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 800,
};

const primaryButton = {
  ...buttonBase,
  border: "none",
  background: "#111827",
  color: "#ffffff",
};

const secondaryButton = {
  ...buttonBase,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
};

const printButton = {
  ...buttonBase,
  border: "none",
  background: "#d4af37",
  color: "#111827",
};

const tipBox = {
  marginTop: "14px",
  padding: "16px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "14px",
  color: "#78350f",
};

const tipText = {
  margin: "8px 0 0",
  lineHeight: 1.7,
};

export default CustomerQR;