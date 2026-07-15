import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Service } from "../../types/database";
import type { Package } from "../../services/packageService";

import { formatCurrency } from "../../utils/currency";
import { supabase } from "../../lib/supabase";

type Props = {
  service?: Service;
  packageItem?: Package;
  onClose: () => void;
};

function BookingModal({
  service,
  packageItem,
  onClose,
}: Props) {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  const [appointmentDate, setAppointmentDate] =
    useState("");

  const [appointmentTime, setAppointmentTime] =
    useState("");

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isPackageBooking = Boolean(packageItem);

  const bookingName =
    packageItem?.package_name ||
    service?.service_name ||
    "预约项目";

  const bookingNameEn =
    packageItem?.package_name_en ||
    service?.service_name_en ||
    "";

  const bookingImage =
    packageItem?.image_url ||
    service?.image_url ||
    "";

  const bookingPrice = Number(
    packageItem?.package_price ??
      service?.price ??
      0
  );

  const bookingMinutes = Number(
    packageItem?.estimated_minutes ??
      service?.duration_minutes ??
      0
  );

  const packageServices =
    packageItem?.package_services
      ?.map((item) => item.services)
      .filter(
        (
          includedService
        ): includedService is Service =>
          Boolean(includedService)
      ) ?? [];

  const serviceIds = isPackageBooking
    ? packageServices
        .map((includedService) => includedService.id)
        .join(",")
    : service
      ? String(service.id)
      : "";

  async function submitBooking() {
    if (loading) return;

    if (!service && !packageItem) {
      alert("没有找到预约项目");
      return;
    }

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

    if (!emailRegex.test(email.trim())) {
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

      const packageNote = packageItem
        ? [
            `预约类型：套餐 / Package`,
            `套餐：${packageItem.package_name}`,
            packageItem.package_name_en
              ? `English: ${packageItem.package_name_en}`
              : "",
            `套餐价格：${formatCurrency(
              packageItem.package_price
            )}`,
            packageServices.length > 0
              ? `包含服务：${packageServices
                  .map(
                    (includedService) =>
                      includedService.service_name
                  )
                  .join("、")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n")
        : `预约类型：单项服务 / Service\n服务：${service?.service_name}`;

      const combinedNotes = [
        packageNote,
        notes.trim()
          ? `客户备注：${notes.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const { error } = await supabase
        .from("appointments")
        .insert([
          {
            appointment_no: appointmentNo,
            customer_name: customerName.trim(),
            phone: phone.trim(),
            email: email.trim(),

            vehicle_plate: vehiclePlate.trim(),
            vehicle_model: vehicleModel.trim(),

            service_ids: serviceIds,

            appointment_date: appointmentDate,
            appointment_time: appointmentTime,

            status: "pending",
            notes: combinedNotes,
          },
        ]);

      if (error) {
        throw error;
      }

      navigate("/booking-success", {
        state: {
          appointmentNo,

          serviceName: bookingName,
          serviceNameEn: bookingNameEn,

          bookingType: isPackageBooking
            ? "package"
            : "service",

          bookingPrice,

          appointmentDate,
          appointmentTime,

          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),

          vehiclePlate: vehiclePlate.trim(),
          vehicleModel: vehicleModel.trim(),
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
        if (!loading) {
          onClose();
        }
      }}
    >
      <div
        style={modal}
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div style={header}>
          <div>
            <p style={eyebrow}>
              GTB AUTO DETAILING
            </p>

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

        <div style={bookingTypeBadge}>
          {isPackageBooking
            ? "🎁 套餐预约 / Package Booking"
            : "🚗 服务预约 / Service Booking"}
        </div>

        <div style={serviceSummary}>
          {bookingImage ? (
            <img
              src={bookingImage}
              alt={bookingName}
              style={serviceImage}
            />
          ) : (
            <div style={servicePlaceholder}>
              {isPackageBooking ? "🎁" : "🚗"}
            </div>
          )}

          <div style={summaryContent}>
            <strong style={serviceName}>
              {bookingName}
            </strong>

            {bookingNameEn && (
              <span style={englishName}>
                {bookingNameEn}
              </span>
            )}

            <div style={serviceMeta}>
              <span>
                {isPackageBooking
                  ? `${packageServices.length} 项服务`
                  : service?.category || "Service"}
              </span>

              <span>
                ⏱ {bookingMinutes} 分钟
              </span>
            </div>

            <div style={servicePrice}>
              {formatCurrency(bookingPrice)}
            </div>
          </div>
        </div>

        {isPackageBooking &&
          packageServices.length > 0 && (
            <div style={includedServicesBox}>
              <strong style={includedServicesTitle}>
                套餐包含 / What&apos;s Included
              </strong>

              <div style={includedServicesGrid}>
                {packageServices.map(
                  (includedService) => (
                    <div
                      key={includedService.id}
                      style={includedServiceItem}
                    >
                      <span>
                        ✓{" "}
                        {
                          includedService.service_name
                        }
                      </span>

                      {includedService.service_name_en && (
                        <small
                          style={
                            includedServiceEnglish
                          }
                        >
                          {
                            includedService.service_name_en
                          }
                        </small>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        <div style={formGrid}>
          <label style={field}>
            <span style={label}>
              姓名 / Name *
            </span>

            <input
              value={customerName}
              onChange={(event) =>
                setCustomerName(
                  event.target.value
                )
              }
              placeholder="请输入姓名"
              style={input}
              disabled={loading}
            />
          </label>

          <label style={field}>
            <span style={label}>
              电话 / Phone *
            </span>

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
            <span style={label}>Email *</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="customer@email.com"
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
                setVehiclePlate(
                  event.target.value
                )
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
                setVehicleModel(
                  event.target.value
                )
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
                setAppointmentDate(
                  event.target.value
                )
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
                setAppointmentTime(
                  event.target.value
                )
              }
              style={input}
              disabled={loading}
            />
          </label>
        </div>

        <label style={notesField}>
          <span style={label}>
            备注 / Notes
          </span>

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
          <br />
          Our team will contact you to confirm the
          appointment.
        </div>

        <div style={actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={cancelButton}
          >
            返回 / Back
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
              : isPackageBooking
                ? "确认套餐预约 / Confirm Package"
                : "确认预约 / Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getTodayDate() {
  const now = new Date();

  const timezoneOffset =
    now.getTimezoneOffset() * 60_000;

  return new Date(
    now.getTime() - timezoneOffset
  )
    .toISOString()
    .split("T")[0];
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message
    );
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
  width: "min(760px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto" as const,

  boxSizing: "border-box" as const,
  padding: 28,

  borderRadius: 24,
  background: "#fff",

  boxShadow:
    "0 30px 90px rgba(0,0,0,.3)",
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
  color: "#111827",
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

const bookingTypeBadge = {
  display: "inline-flex",

  marginTop: 18,
  padding: "7px 11px",

  borderRadius: 999,

  background: "#ede9fe",
  color: "#6d28d9",

  fontSize: 11,
  fontWeight: 900,
};

const serviceSummary = {
  display: "flex",
  alignItems: "center",
  gap: 16,

  marginTop: 14,
  padding: 14,

  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const serviceImage = {
  width: 110,
  height: 88,
  flexShrink: 0,

  borderRadius: 13,
  objectFit: "cover" as const,
};

const servicePlaceholder = {
  width: 110,
  height: 88,
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: 13,

  background:
    "linear-gradient(135deg,#dbeafe,#e0e7ff)",

  fontSize: 38,
};

const summaryContent = {
  display: "flex",
  flex: 1,
  flexDirection: "column" as const,
  minWidth: 0,
};

const serviceName = {
  color: "#111827",
  fontSize: 19,
};

const englishName = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
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
  fontSize: 21,
  fontWeight: 900,
};

const includedServicesBox = {
  marginTop: 14,
  padding: 14,

  border: "1px solid #e2e8f0",
  borderRadius: 14,

  background: "#fafafa",
};

const includedServicesTitle = {
  color: "#2563eb",
  fontSize: 12,
};

const includedServicesGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",

  gap: 9,
  marginTop: 11,
};

const includedServiceItem = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,

  color: "#334155",
  fontSize: 12,
};

const includedServiceEnglish = {
  color: "#94a3b8",
  fontSize: 10,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",

  gap: 15,
  marginTop: 20,
};

const field = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
};

const notesField = {
  ...field,
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
  lineHeight: 1.6,
  outline: "none",
};

const notice = {
  marginTop: 18,
  padding: 13,

  borderRadius: 12,

  background: "#eff6ff",
  color: "#1e40af",

  fontSize: 13,
  lineHeight: 1.6,
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