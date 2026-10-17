import { QRCodeSVG } from "qrcode.react";

const menuUrl =
  "https://gtbautodetailingpos.pages.dev/menu";

const bookingUrl =
  "https://gtbautodetailingpos.pages.dev/menu#booking";

function CustomerQR() {
  async function copyBookingLink() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      alert("客户预约网址已复制");
    } catch {
      window.prompt("请复制客户预约网址：", bookingUrl);
    }
  }

  function openBooking() {
    window.open(bookingUrl, "_blank");
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
          <p style={eyebrow}>CUSTOMER BOOKING QR</p>

          <h1 style={heading}>
            客户扫码预约
          </h1>

          <p style={description}>
            客户扫码后直接进入公开菜单的在线预约区域，提交后自动进入 POS 预约记录。
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
            Service Menu & Online Appointment
          </p>

          <div style={qrWrapper}>
            <QRCodeSVG
              value={bookingUrl}
              size={390}
              level="H"
              includeMargin
              imageSettings={{
                src: "/gtb1n-logo.png",
                height: 70,
                width: 70,
                excavate: true,
              }}
            />
          </div>

          <h2 style={scanTitle}>
            扫码直接预约
          </h2>

          <p style={scanText}>
            Scan to choose a service and book an appointment directly
          </p>

          <div style={contact}>
            <span>📞 09695653413</span>
            <span>📞 09443751188</span>
            <span>📍 Lashio · 腊戌</span>
          </div>
        </section>

        <section style={actionCard} className="no-print">
          <h2 style={actionTitle}>
            二维码操作
          </h2>

          <p style={label}>
            客户直接预约网址
          </p>

          <div style={urlBox}>
            {bookingUrl}
          </div>

          <button
            type="button"
            onClick={openBooking}
            style={primaryButton}
          >
            📅 打开客户预约
          </button>

          <button
            type="button"
            onClick={openCustomerMenu}
            style={secondaryButton}
          >
            🌐 打开完整客户菜单
          </button>

          <button
            type="button"
            onClick={copyBookingLink}
            style={secondaryButton}
          >
            🔗 复制预约网址
          </button>

          <button
            type="button"
            onClick={printQrCode}
            style={printButton}
          >
            🖨️ 打印预约二维码
          </button>

          <div style={tipBox}>
            <strong>使用方式</strong>

            <p style={tipText}>
              客户扫码 → 选择服务 → 填写姓名、电话、车辆、日期和时间 →
              提交预约 → POS 的预约管理中查看。
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
