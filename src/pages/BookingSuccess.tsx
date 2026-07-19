import { useLocation, useNavigate } from "react-router-dom";

type BookingSuccessState = {
  appointmentNo?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  customerName?: string;
  phone?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
};

function BookingSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  const booking =
    (location.state as BookingSuccessState | null) ?? {};

  const hasBooking = Boolean(booking.appointmentNo);

  async function copyAppointmentNumber() {
    if (!booking.appointmentNo) return;

    try {
      await navigator.clipboard.writeText(
        booking.appointmentNo
      );

      alert("预约编号已复制");
    } catch {
      alert("复制失败，请手动复制预约编号");
    }
  }

  function downloadBookingDetails() {
    if (!booking.appointmentNo) return;

    const content = [
      "GTB Auto Detailing & Window Film",
      "Appointment Confirmation",
      "",
      `预约编号：${booking.appointmentNo}`,
      `服务：${booking.serviceName || "-"}`,
      `预约日期：${formatDate(booking.appointmentDate)}`,
      `预约时间：${formatTime(booking.appointmentTime)}`,
      `客户：${booking.customerName || "-"}`,
      `电话：${booking.phone || "-"}`,
      `车牌：${booking.vehiclePlate || "-"}`,
      `车型：${booking.vehicleModel || "-"}`,
      `状态：等待确认`,
      "",
      "门店工作人员将尽快联系您确认预约。",
    ].join("\n");

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${booking.appointmentNo}.txt`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function addToCalendar() {
    if (
      !booking.appointmentDate ||
      !booking.appointmentTime
    ) {
      alert("缺少预约日期或时间");
      return;
    }

    const startDate = new Date(
      `${booking.appointmentDate}T${booking.appointmentTime}`
    );

    if (Number.isNaN(startDate.getTime())) {
      alert("预约时间格式不正确");
      return;
    }

    const endDate = new Date(
      startDate.getTime() + 60 * 60 * 1000
    );

    const calendarContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GTB Auto Detailing & Window Film//Appointment//CN",
      "BEGIN:VEVENT",
      `UID:${booking.appointmentNo}@gtb-auto-detailing`,
      `DTSTAMP:${toCalendarDate(new Date())}`,
      `DTSTART:${toCalendarDate(startDate)}`,
      `DTEND:${toCalendarDate(endDate)}`,
      `SUMMARY:${escapeCalendarText(
        booking.serviceName || "GTB Auto Detailing & Window Film Appointment"
      )}`,
      `DESCRIPTION:${escapeCalendarText(
        `预约编号：${booking.appointmentNo || "-"}`
      )}`,
      "STATUS:TENTATIVE",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([calendarContent], {
      type: "text/calendar;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${booking.appointmentNo || "appointment"}.ics`;
    link.click();

    URL.revokeObjectURL(url);
  }

  if (!hasBooking) {
    return (
      <main style={page}>
        <section style={missingCard}>
          <div style={smallLogo}>GTB</div>

          <h1 style={missingTitle}>
            找不到预约资料
          </h1>

          <p style={missingDescription}>
            此页面没有收到预约信息，请返回服务菜单重新选择服务。
          </p>

          <button
            type="button"
            onClick={() => navigate("/menu")}
            style={primaryButton}
          >
            返回服务菜单
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={page}>
      <section style={successCard}>
        <header style={header}>
          <div style={brandBlock}>
            <div style={brandLogo}>GTB</div>

            <div>
              <p style={brandName}>
                GTB Auto Detailing & Window Film
              </p>

              <p style={brandSubtitle}>
                Premium Car Care Experience
              </p>
            </div>
          </div>

          <span style={pendingBadge}>
            Waiting Confirmation
          </span>
        </header>

        <div style={divider} />

        <div style={successIntro}>
          <div style={successIcon}>✓</div>

          <div>
            <p style={successEyebrow}>
              BOOKING RECEIVED
            </p>

            <h1 style={successTitle}>
              预约已成功提交
            </h1>

            <p style={successDescription}>
              感谢您的预约。门店工作人员将尽快联系您确认具体时间。
            </p>
          </div>
        </div>

        <section style={appointmentTicket}>
          <div style={ticketTop}>
            <div>
              <p style={ticketLabel}>
                APPOINTMENT NUMBER
              </p>

              <div style={appointmentNumberRow}>
                <strong style={appointmentNumber}>
                  {booking.appointmentNo}
                </strong>

                <button
                  type="button"
                  onClick={copyAppointmentNumber}
                  style={copyButton}
                >
                  复制
                </button>
              </div>
            </div>

            <div style={carIcon}>🚘</div>
          </div>

          <div style={ticketDivider} />

          <div style={serviceBlock}>
            <p style={ticketLabel}>SELECTED SERVICE</p>

            <h2 style={serviceName}>
              {booking.serviceName || "汽车美容服务"}
            </h2>
          </div>

          <div style={informationGrid}>
            <InformationItem
              label="预约日期"
              value={formatDate(
                booking.appointmentDate
              )}
              icon="📅"
            />

            <InformationItem
              label="预约时间"
              value={formatTime(
                booking.appointmentTime
              )}
              icon="🕒"
            />

            <InformationItem
              label="客户姓名"
              value={booking.customerName || "-"}
              icon="👤"
            />

            <InformationItem
              label="联系电话"
              value={booking.phone || "-"}
              icon="📱"
            />

            <InformationItem
              label="车辆车牌"
              value={booking.vehiclePlate || "-"}
              icon="🚗"
            />

            <InformationItem
              label="车辆型号"
              value={booking.vehicleModel || "-"}
              icon="🔧"
            />
          </div>
        </section>

        <section style={noticeCard}>
          <div style={noticeIcon}>i</div>

          <div>
            <strong style={noticeTitle}>
              接下来会发生什么？
            </strong>

            <p style={noticeText}>
              当前预约状态为“等待确认”。门店确认后，会通过电话或消息与您联系。
            </p>
          </div>
        </section>

        <div style={secondaryActions}>
          <button
            type="button"
            onClick={addToCalendar}
            style={secondaryButton}
          >
            📅 加入日历
          </button>

          <button
            type="button"
            onClick={downloadBookingDetails}
            style={secondaryButton}
          >
            ↓ 保存预约资料
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate("/menu")}
          style={primaryButton}
        >
          返回服务菜单
        </button>

        <p style={footerText}>
          请保存预约编号，方便门店查询您的预约记录。
        </p>
      </section>
    </main>
  );
}

function InformationItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div style={informationItem}>
      <div style={informationIcon}>{icon}</div>

      <div>
        <p style={informationLabel}>{label}</p>
        <strong style={informationValue}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(value?: string) {
  if (!value) return "-";

  return value.slice(0, 5);
}

function toCalendarDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

const page = {
  minHeight: "100vh",
  boxSizing: "border-box" as const,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "42px 20px",
  background:
    "radial-gradient(circle at top left,#e0ecff 0,transparent 36%), radial-gradient(circle at bottom right,#dcfce7 0,transparent 32%), #f8fafc",
  fontFamily:
    'Inter, "Segoe UI", "Microsoft YaHei", Arial, sans-serif',
};

const successCard = {
  width: "min(760px, 100%)",
  boxSizing: "border-box" as const,
  padding: 34,
  border: "1px solid rgba(226,232,240,.9)",
  borderRadius: 28,
  background: "rgba(255,255,255,.96)",
  boxShadow: "0 30px 90px rgba(15,23,42,.14)",
};

const missingCard = {
  width: "min(520px, 100%)",
  padding: 40,
  boxSizing: "border-box" as const,
  borderRadius: 26,
  background: "#fff",
  textAlign: "center" as const,
  boxShadow: "0 30px 80px rgba(15,23,42,.12)",
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
};

const brandBlock = {
  display: "flex",
  alignItems: "center",
  gap: 13,
};

const brandLogo = {
  width: 46,
  height: 46,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 14,
  background: "#111827",
  color: "#fff",
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: 1,
};

const smallLogo = {
  width: 58,
  height: 58,
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 18,
  background: "#111827",
  color: "#fff",
  fontWeight: 900,
};

const brandName = {
  margin: 0,
  color: "#111827",
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: 1.1,
};

const brandSubtitle = {
  margin: "4px 0 0",
  color: "#94a3b8",
  fontSize: 12,
};

const pendingBadge = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "#fff7ed",
  color: "#c2410c",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0.4,
};

const divider = {
  height: 1,
  margin: "24px 0",
  background: "#e5e7eb",
};

const successIntro = {
  display: "flex",
  alignItems: "center",
  gap: 20,
};

const successIcon = {
  width: 68,
  height: 68,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 22,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: 36,
  fontWeight: 500,
};

const successEyebrow = {
  margin: 0,
  color: "#16a34a",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.6,
};

const successTitle = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: 34,
  lineHeight: 1.2,
  fontWeight: 750,
};

const successDescription = {
  margin: "10px 0 0",
  color: "#64748b",
  fontSize: 15,
  lineHeight: 1.7,
};

const appointmentTicket = {
  marginTop: 28,
  padding: 24,
  borderRadius: 22,
  border: "1px solid #e2e8f0",
  background:
    "linear-gradient(145deg,#ffffff,#f8fafc)",
};

const ticketTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
};

const ticketLabel = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1.3,
};

const appointmentNumberRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 10,
  marginTop: 6,
};

const appointmentNumber = {
  color: "#0f172a",
  fontSize: 21,
  letterSpacing: 0.3,
};

const copyButton = {
  padding: "6px 10px",
  border: "none",
  borderRadius: 8,
  background: "#e0e7ff",
  color: "#3730a3",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 800,
};

const carIcon = {
  width: 52,
  height: 52,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 16,
  background: "#eff6ff",
  fontSize: 28,
};

const ticketDivider = {
  height: 1,
  margin: "20px 0",
  background:
    "repeating-linear-gradient(to right,#cbd5e1 0,#cbd5e1 7px,transparent 7px,transparent 13px)",
};

const serviceBlock = {
  marginBottom: 22,
};

const serviceName = {
  margin: "7px 0 0",
  color: "#111827",
  fontSize: 25,
  fontWeight: 750,
};

const informationGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

const informationItem = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  minWidth: 0,
  padding: 13,
  borderRadius: 14,
  background: "#fff",
  border: "1px solid #eef2f7",
};

const informationIcon = {
  width: 35,
  height: 35,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  background: "#f1f5f9",
  fontSize: 16,
};

const informationLabel = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 10,
};

const informationValue = {
  display: "block",
  marginTop: 3,
  color: "#334155",
  fontSize: 13,
  overflowWrap: "anywhere" as const,
};

const noticeCard = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  marginTop: 20,
  padding: 16,
  borderRadius: 15,
  background: "#eff6ff",
};

const noticeIcon = {
  width: 27,
  height: 27,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "#2563eb",
  color: "#fff",
  fontFamily: "Georgia, serif",
  fontWeight: 700,
};

const noticeTitle = {
  color: "#1e3a8a",
  fontSize: 13,
};

const noticeText = {
  margin: "5px 0 0",
  color: "#3b5998",
  fontSize: 12,
  lineHeight: 1.6,
};

const secondaryActions = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  marginTop: 22,
};

const secondaryButton = {
  padding: 13,
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
};

const primaryButton = {
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: 12,
  padding: 15,
  border: "none",
  borderRadius: 13,
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 850,
};

const footerText = {
  margin: "16px 0 0",
  color: "#94a3b8",
  textAlign: "center" as const,
  fontSize: 11,
};

const missingTitle = {
  margin: "20px 0 0",
  color: "#111827",
  fontSize: 28,
};

const missingDescription = {
  margin: "12px 0 20px",
  color: "#64748b",
  lineHeight: 1.7,
};

export default BookingSuccess;