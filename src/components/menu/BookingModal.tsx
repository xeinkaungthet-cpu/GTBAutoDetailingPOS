import { formatCurrency } from "../../utils/currency";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Service } from "../../types/database";
import { supabase } from "../../lib/supabase";

type Props = {
  service: Service;
  onClose: () => void;
};

function BookingModal({ service, onClose }: Props) {
const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitBooking() {
    if (loading) return;

    if (!customerName.trim()) {
      alert("请输入姓名");
      return;
    }

    if (!phone.trim()) {
      alert("请输入电话号码");
      return;
    }

if (!email.trim()) {
  alert("请输入 Email");
  return;
}

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email)) {
  alert("Email 格式不正确");
  return;
}

    if (!appointmentDate) {
      alert("请选择预约日期");
      return;
    }

    if (!appointmentTime) {
      alert("请选择预约时间");
      return;
    }

    const selectedDateTime = new Date(
      `${appointmentDate}T${appointmentTime}`
    );

    if (
      Number.isNaN(selectedDateTime.getTime()) ||
      selectedDateTime.getTime() < Date.now()
    ) {
      alert("预约日期和时间不能早于当前时间");
      return;
    }

    setLoading(true);

    try {
      const appointmentNo = `APT-${Date.now()}`;

      const { error } = await supabase.from("appointments").insert([
        {
          appointment_no: appointmentNo,
          customer_name: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          vehicle_plate: vehiclePlate.trim(),
          vehicle_model: vehicleModel.trim(),
          service_ids: String(service.id),
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          status: "pending",
          notes: notes.trim(),
        },
      ]);

      if (error) {
        throw error;
      }

      navigate("/booking-success", {
  state: {
    appointmentNo,
    serviceName: service.service_name,
    appointmentDate,
    appointmentTime,
    customerName,
    phone,
email,
vehiclePlate,
vehicleModel,
  },
});
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={modalBackground}
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        style={modal}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={header}>
          <div>
            <p style={eyebrow}>GTB AUTO DETAILING</p>
            <h2 style={title}>
              在线预约 / Book Appointment
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={closeIconButton}
            aria-label="关闭预约窗口"
          >
            ×
          </button>
        </div>

        <div style={serviceSummary}>
          {service.image_url ? (
            <img
              src={service.image_url}
              alt={service.service_name}
              style={serviceImage}
            />
          ) : (
            <div style={servicePlaceholder}>🚗</div>
          )}

          <div style={{ flex: 1 }}>
            <strong style={serviceName}>
              {service.service_name}
            </strong>

            <div style={serviceMeta}>
              <span>{service.category}</span>
              <span>
                ⏱ {service.duration_minutes || 0} 分钟
              </span>
            </div>

            <div style={servicePrice}>
              {formatCurrency(service.price)}
            </div>
          </div>
        </div>

        <div style={formGrid}>
          <label style={field}>
            <span style={label}>姓名 / Name *</span>

            <input
              value={customerName}
              onChange={(event) =>
                setCustomerName(event.target.value)
              }
              placeholder="请输入姓名"
              style={input}
              disabled={loading}
            />
          </label>

          <label style={field}>
            <span style={label}>电话 / Phone *</span>
<label style={field}>
  <span style={label}>Email *</span>

  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="customer@email.com"
    style={input}
    disabled={loading}
  />
</label>
            <input
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              placeholder="请输入电话号码"
              style={input}
              disabled={loading}
            />
          </label>

          <label style={field}>
            <span style={label}>
              车牌 / Plate Number
            </span>

            <input
              value={vehiclePlate}
              onChange={(event) =>
                setVehiclePlate(event.target.value)
              }
              placeholder="例如：ABC 1234"
              style={input}
              disabled={loading}
            />
          </label>

          <label style={field}>
            <span style={label}>
              车型 / Vehicle Model
            </span>

            <input
              value={vehicleModel}
              onChange={(event) =>
                setVehicleModel(event.target.value)
              }
              placeholder="例如：Toyota Vios"
              style={input}
              disabled={loading}
            />
          </label>

          <label style={field}>
            <span style={label}>
              预约日期 / Date *
            </span>

            <input
              type="date"
              value={appointmentDate}
              min={getTodayDate()}
              onChange={(event) =>
                setAppointmentDate(event.target.value)
              }
              style={input}
              disabled={loading}
            />
          </label>

          <label style={field}>
            <span style={label}>
              预约时间 / Time *
            </span>

            <input
              type="time"
              value={appointmentTime}
              onChange={(event) =>
                setAppointmentTime(event.target.value)
              }
              style={input}
              disabled={loading}
            />
          </label>
        </div>

        <label style={field}>
          <span style={label}>备注 / Notes</span>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            placeholder="例如：需要重点清洁座椅、车身有轻微刮痕等"
            style={textarea}
            disabled={loading}
          />
        </label>

        <div style={notice}>
          提交预约后，门店工作人员会联系您确认具体时间。
        </div>

        <div style={actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={cancelButton}
          >
            返回
          </button>

          <button
            type="button"
            onClick={submitBooking}
            disabled={loading}
            style={{
              ...submitButton,
              opacity: loading ? 0.65 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "提交中..."
              : "确认预约 / Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getTodayDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .split("T")[0];
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "预约提交失败，请稍后重试";
}

const modalBackground = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(15,23,42,.62)",
  backdropFilter: "blur(8px)",
};

const modal = {
  width: "min(720px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  boxSizing: "border-box" as const,
  padding: 28,
  borderRadius: 24,
  background: "#fff",
  boxShadow: "0 30px 90px rgba(0,0,0,.3)",
};

const header = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
};

const eyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1.3,
};

const title = {
  margin: "5px 0 0",
  fontSize: 28,
};

const closeIconButton = {
  width: 38,
  height: 38,
  border: "none",
  borderRadius: 12,
  background: "#f1f5f9",
  color: "#334155",
  cursor: "pointer",
  fontSize: 25,
  lineHeight: 1,
};

const serviceSummary = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginTop: 22,
  padding: 14,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const serviceImage = {
  width: 105,
  height: 82,
  flexShrink: 0,
  borderRadius: 13,
  objectFit: "cover" as const,
};

const servicePlaceholder = {
  width: 105,
  height: 82,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 13,
  background: "linear-gradient(135deg,#dbeafe,#e0e7ff)",
  fontSize: 38,
};

const serviceName = {
  fontSize: 18,
};

const serviceMeta = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 12,
  marginTop: 7,
  color: "#64748b",
  fontSize: 13,
};

const servicePrice = {
  marginTop: 8,
  color: "#2563eb",
  fontSize: 20,
  fontWeight: 900,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 15,
  marginTop: 22,
};

const field = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  marginTop: 15,
};

const label = {
  color: "#334155",
  fontSize: 14,
  fontWeight: 800,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  fontSize: 15,
  outline: "none",
};

const textarea = {
  width: "100%",
  minHeight: 105,
  boxSizing: "border-box" as const,
  resize: "vertical" as const,
  padding: "13px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  fontSize: 15,
  outline: "none",
};

const notice = {
  marginTop: 18,
  padding: 13,
  borderRadius: 12,
  background: "#eff6ff",
  color: "#1e40af",
  fontSize: 13,
};

const actions = {
  display: "grid",
  gridTemplateColumns: "1fr 1.5fr",
  gap: 12,
  marginTop: 22,
};

const cancelButton = {
  padding: 14,
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 800,
};

const submitButton = {
  padding: 14,
  border: "none",
  borderRadius: 12,
  background: "#22c55e",
  color: "#fff",
  fontSize: 15,
  fontWeight: 900,
};

export default BookingModal;