import { useEffect, useMemo, useState } from "react";

import type {
  Appointment,
  Service,
} from "../types/database";

import { AppointmentService } from "../services/appointmentService";
import { ServiceService } from "../services/serviceService";
import useCurrency from "../hooks/useCurrency";

type VehicleSizeCode =
  | "small"
  | "medium"
  | "suv"
  | "large";

type AppointmentRecord = Appointment & {
  vehicle_size_code?: VehicleSizeCode | string | null;
  vehicle_size_name?: string | null;
  quoted_price?: number | string | null;
  quoted_currency?: string | null;
  quoted_display_price?: number | string | null;
  quoted_display_currency?: string | null;

  coating_option_id?: number | null;
  coating_option_name?: string | null;
  coating_duration_years?: number | string | null;
  coating_duration_unit?: "month" | "year" | string | null;
  coating_product_name?: string | null;
  coating_price?: number | string | null;
};

const VEHICLE_SIZE_PRESETS: Record<
  VehicleSizeCode,
  {
    nameZh: string;
    nameEn: string;
    icon: string;
  }
> = {
  small: {
    nameZh: "小型车",
    nameEn: "Small Car",
    icon: "🚗",
  },
  medium: {
    nameZh: "中型车",
    nameEn: "Medium Car",
    icon: "🚘",
  },
  suv: {
    nameZh: "SUV",
    nameEn: "SUV",
    icon: "🚙",
  },
  large: {
    nameZh: "大型车",
    nameEn: "Large Vehicle",
    icon: "🚐",
  },
};

const statusOptions = [
  {
    value: "pending",
    label: "待确认 / Pending",
    color: "#b45309",
    background: "#fef3c7",
  },
  {
    value: "confirmed",
    label: "已确认 / Confirmed",
    color: "#1d4ed8",
    background: "#dbeafe",
  },
  {
    value: "in_progress",
    label: "施工中 / In Progress",
    color: "#6d28d9",
    background: "#ede9fe",
  },
  {
    value: "completed",
    label: "已完成 / Completed",
    color: "#15803d",
    background: "#dcfce7",
  },
  {
    value: "cancelled",
    label: "已取消 / Cancelled",
    color: "#b91c1c",
    background: "#fee2e2",
  },
];

function Appointments() {
  const {
    formatMoney: formatDisplayMoney,
    displayCurrency,
    accountingCurrency,
    loading: currencyLoading,
    error: currencyError,
  } = useCurrency();

  const [appointments, setAppointments] =
    useState<AppointmentRecord[]>([]);

  const [services, setServices] =
    useState<Service[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  async function loadData() {
    setLoading(true);

    try {
      const [appointmentData, serviceData] =
        await Promise.all([
          AppointmentService.getAll(),
          ServiceService.getAll(),
        ]);

      setAppointments(
        appointmentData as AppointmentRecord[]
      );
      setServices(serviceData);
    } catch (error: unknown) {
      alert(getErrorMessage(error));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const serviceMap = useMemo(() => {
    return new Map(
      services.map((service) => [
        String(service.id),
        service,
      ])
    );
  }, [services]);

  const filteredAppointments = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return appointments
      .filter((appointment) => {
        const serviceNames =
          getAppointmentServices(
            appointment,
            serviceMap
          )
            .map((service) =>
              service.service_name.toLowerCase()
            )
            .join(" ");

        const matchesSearch =
          !keyword ||
          appointment.appointment_no
            ?.toLowerCase()
            .includes(keyword) ||
          appointment.customer_name
            ?.toLowerCase()
            .includes(keyword) ||
          appointment.phone
            ?.toLowerCase()
            .includes(keyword) ||
          appointment.vehicle_plate
            ?.toLowerCase()
            .includes(keyword) ||
          appointment.vehicle_model
            ?.toLowerCase()
            .includes(keyword) ||
          appointment.vehicle_size_name
            ?.toLowerCase()
            .includes(keyword) ||
          appointment.vehicle_size_code
            ?.toLowerCase()
            .includes(keyword) ||
          appointment.coating_option_name
            ?.toLowerCase()
            .includes(keyword) ||
          appointment.coating_product_name
            ?.toLowerCase()
            .includes(keyword) ||
          getCoatingSearchText(appointment).includes(keyword) ||
          serviceNames.includes(keyword);

        const matchesStatus =
          statusFilter === "all" ||
          appointment.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (
          a.status === "pending" &&
          b.status !== "pending"
        ) {
          return -1;
        }

        if (
          a.status !== "pending" &&
          b.status === "pending"
        ) {
          return 1;
        }

        return Number(b.id) - Number(a.id);
      });
  }, [
    appointments,
    search,
    statusFilter,
    serviceMap,
  ]);

  const todayCount = appointments.filter(
    (appointment) =>
      appointment.appointment_date ===
      getTodayDate()
  ).length;

  const futureCount = appointments.filter(
    (appointment) =>
      Boolean(
        appointment.appointment_date &&
          appointment.appointment_date >
            getTodayDate() &&
          appointment.status !== "cancelled"
      )
  ).length;

  const pendingCount = appointments.filter(
    (appointment) =>
      appointment.status === "pending"
  ).length;

  async function changeStatus(
    id: number,
    status: string
  ) {
    setUpdatingId(id);

    try {
      await AppointmentService.updateStatus(
        id,
        status
      );

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === id
            ? {
                ...appointment,
                status,
              }
            : appointment
        )
      );
    } catch (error: unknown) {
      alert(getErrorMessage(error));
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div style={pageHeader}>
        <div>
          <p style={eyebrow}>
            GTB1N Auto Detailing & Window Film
          </p>

          <h1 style={pageTitle}>
            预约管理 / Appointments
          </h1>

          <p style={pageDescription}>
            管理客户预约、服务项目和施工状态
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={refreshButton}
          disabled={loading}
        >
          {loading
            ? "载入中..."
            : "↻ 刷新预约"}
        </button>
      </div>

      <div style={currencyInfoCard}>
        <div>
          <strong style={currencyInfoTitle}>
            显示货币 / Display Currency
          </strong>
          <p style={currencyInfoText}>
            当前价格以 {displayCurrency} 显示，账本基础货币为{" "}
            {accountingCurrency}。
          </p>
        </div>

        <span style={currencyBadge}>
          {currencyLoading
            ? "读取汇率..."
            : `${displayCurrency} ← ${accountingCurrency}`}
        </span>

        {currencyError && (
          <p style={currencyErrorText}>
            汇率读取失败：{currencyError}
          </p>
        )}
      </div>

      <div style={summaryGrid}>
        <SummaryCard
          icon="📋"
          label="全部预约 / Total"
          value={appointments.length}
        />

        <SummaryCard
          icon="📅"
          label="今日预约 / Today"
          value={todayCount}
        />

        <SummaryCard
          icon="⏳"
          label="待确认 / Pending"
          value={pendingCount}
        />

        <SummaryCard
          icon="🗓️"
          label="未来预约 / Upcoming"
          value={futureCount}
        />
      </div>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="🔍 搜索预约号、客户、车牌、车型、服务或镀晶药剂"
          style={searchInput}
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          style={filterSelect}
        >
          <option value="all">
            全部状态 / All Status
          </option>

          {statusOptions.map((status) => (
            <option
              key={status.value}
              value={status.value}
            >
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={emptyState}>
          正在加载预约数据...
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: 48 }}>
            📅
          </div>

          <h2>暂无预约</h2>

          <p style={emptyDescription}>
            客户从公开服务菜单提交预约后，
            会自动显示在这里。
          </p>
        </div>
      ) : (
        <div style={appointmentGrid}>
          {filteredAppointments.map(
            (appointment) => {
              const status = getStatusInfo(
                appointment.status
              );

              const selectedServices =
                getAppointmentServices(
                  appointment,
                  serviceMap
                );

              const currentServiceTotal =
                selectedServices.reduce(
                  (sum, service) =>
                    sum +
                    Number(service.price || 0),
                  0
                );

              const quotedPrice = toFiniteNumber(
                appointment.quoted_price
              );

              const hasQuotedPrice =
                quotedPrice !== null;

              const appointmentTotal =
                quotedPrice ?? currentServiceTotal;

              const vehicleSize =
                getVehicleSizeInfo(appointment);

              const coatingInfo =
                getCoatingOptionInfo(appointment);

              return (
                <article
                  key={appointment.id}
                  style={{
                    ...appointmentCard,
                    borderTop:
                      appointment.status ===
                      "pending"
                        ? "4px solid #f59e0b"
                        : "4px solid transparent",
                  }}
                >
                  <div style={cardHeader}>
                    <div>
                      <p
                        style={
                          appointmentNumber
                        }
                      >
                        {
                          appointment.appointment_no
                        }
                      </p>

                      <h2 style={customerName}>
                        {
                          appointment.customer_name
                        }
                      </h2>
                    </div>

                    <span
                      style={{
                        ...statusBadge,
                        color: status.color,
                        background:
                          status.background,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div style={customerContact}>
                    <span>
                      📞 {appointment.phone}
                    </span>

                    <span>
                      🌐 Website
                    </span>
                  </div>

                  <div style={vehicleCard}>
                    <div style={vehicleIcon}>
                      {vehicleSize.icon}
                    </div>

                    <div style={vehicleContent}>
                      <p style={vehicleLabel}>
                        VEHICLE
                      </p>

                      <strong>
                        {appointment.vehicle_plate ||
                          "未填写车牌"}
                      </strong>

                      <p style={vehicleModel}>
                        车辆型号：
                        {appointment.vehicle_model ||
                          "未填写"}
                      </p>

                      {vehicleSize.label && (
                        <span style={vehicleSizeBadge}>
                          {vehicleSize.icon} 车型大小：
                          {vehicleSize.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={serviceSection}>
                    <p style={sectionLabel}>
                      SELECTED SERVICE
                    </p>

                    {coatingInfo.hasOption && (
                      <div style={coatingOptionCard}>
                        <div style={coatingOptionHeader}>
                          <span style={coatingOptionIcon}>🛡️</span>

                          <div style={coatingOptionContent}>
                            <p style={coatingOptionEyebrow}>
                              COATING PRODUCT OPTION
                            </p>

                            <strong style={coatingOptionTitle}>
                              {coatingInfo.title}
                            </strong>

                            {coatingInfo.productName && (
                              <span style={coatingProductName}>
                                药剂 / Product：{coatingInfo.productName}
                              </span>
                            )}
                          </div>

                          {coatingInfo.basePrice !== null && (
                            <div style={coatingBasePrice}>
                              <small>方案基础价</small>
                              <strong>
                                {formatDisplayMoney(
                                  coatingInfo.basePrice
                                )}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedServices.length >
                    0 ? (
                      selectedServices.map(
                        (service) => (
                          <div
                            key={service.id}
                            style={serviceRow}
                          >
                            <div>
                              <strong>
                                {
                                  service.service_name
                                }
                              </strong>

                              <p
                                style={
                                  serviceMeta
                                }
                              >
                                {service.category} ·
                                {" "}
                                {service.duration_minutes ||
                                  0}
                                分钟
                              </p>
                            </div>

                            <strong
                              style={servicePrice}
                            >
                              {formatDisplayMoney(
                                selectedServices.length === 1 &&
                                  hasQuotedPrice
                                  ? appointmentTotal
                                  : Number(
                                      service.price || 0
                                    )
                              )}
                            </strong>
                          </div>
                        )
                      )
                    ) : (
                      <div style={missingService}>
                        找不到服务资料：
                        {appointment.service_ids ||
                          "-"}
                      </div>
                    )}

                    <div style={totalRow}>
                      <span>
                        {hasQuotedPrice
                          ? "预约锁定价格 / Booked Quote"
                          : "预计金额 / Estimated"}
                      </span>

                      <strong>
                        {formatDisplayMoney(
                          appointmentTotal
                        )}
                      </strong>
                    </div>

                    {hasQuotedPrice && (
                      <p style={quoteMeta}>
                        已使用客户提交预约时保存的
                        {coatingInfo.hasOption
                          ? "车型与镀晶方案最终报价"
                          : "车型报价"}
                        {appointment.quoted_currency
                          ? ` · 账本货币 ${appointment.quoted_currency}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div style={dateTimeGrid}>
                    <InformationItem
                      icon="📅"
                      label="预约日期 / Date"
                      value={formatDate(
                        appointment.appointment_date
                      )}
                    />

                    <InformationItem
                      icon="🕒"
                      label="预约时间 / Time"
                      value={formatTime(
                        appointment.appointment_time
                      )}
                    />
                  </div>

                  {appointment.notes && (
                    <div style={notesBox}>
                      <strong>
                        备注 / Notes
                      </strong>

                      <p style={notesText}>
                        {appointment.notes}
                      </p>
                    </div>
                  )}

                  <div style={statusControl}>
                    <label style={statusLabel}>
                      修改预约状态 / Update
                      Status
                    </label>

                    <select
                      value={
                        appointment.status ||
                        "pending"
                      }
                      disabled={
                        updatingId ===
                        appointment.id
                      }
                      onChange={(event) =>
                        changeStatus(
                          appointment.id,
                          event.target.value
                        )
                      }
                      style={statusSelect}
                    >
                      {statusOptions.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    {updatingId ===
                      appointment.id && (
                      <span
                        style={updatingText}
                      >
                        保存中...
                      </span>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div style={summaryCard}>
      <span style={summaryIcon}>
        {icon}
      </span>

      <div>
        <p style={summaryLabel}>{label}</p>
        <strong style={summaryValue}>
          {value}
        </strong>
      </div>
    </div>
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
      <span style={informationIcon}>
        {icon}
      </span>

      <div>
        <p style={informationLabel}>
          {label}
        </p>

        <strong style={informationValue}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function getAppointmentServices(
  appointment: AppointmentRecord,
  serviceMap: Map<string, Service>
) {
  const serviceIds = String(
    appointment.service_ids || ""
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return serviceIds
    .map((id) => serviceMap.get(id))
    .filter(
      (service): service is Service =>
        Boolean(service)
    );
}

function getCoatingOptionInfo(
  appointment: AppointmentRecord
) {
  const durationValue = toFiniteNumber(
    appointment.coating_duration_years
  );

  const normalizedUnit =
    appointment.coating_duration_unit === "month"
      ? "month"
      : appointment.coating_duration_unit === "year"
        ? "year"
        : "";

  const savedDuration =
    durationValue !== null
      ? formatCoatingDuration(
          durationValue,
          normalizedUnit || "year"
        )
      : "";

  const notesDuration = extractNoteValue(
    appointment.notes,
    "镀晶期限"
  );

  const duration = savedDuration || notesDuration;

  const optionName =
    String(
      appointment.coating_option_name ||
        extractNoteValue(appointment.notes, "镀晶方案") ||
        ""
    ).trim();

  const productName =
    String(
      appointment.coating_product_name ||
        extractNoteValue(appointment.notes, "镀晶药剂") ||
        ""
    ).trim();

  const basePrice = toFiniteNumber(
    appointment.coating_price
  );

  const hasOption = Boolean(
    appointment.coating_option_id ||
      duration ||
      optionName ||
      productName
  );

  return {
    hasOption,
    duration,
    optionName,
    productName,
    basePrice,
    title:
      [duration, optionName]
        .filter(Boolean)
        .join(" · ") || "已选择镀晶方案",
  };
}

function getCoatingSearchText(
  appointment: AppointmentRecord
) {
  const coatingInfo =
    getCoatingOptionInfo(appointment);

  return [
    coatingInfo.duration,
    coatingInfo.optionName,
    coatingInfo.productName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatCoatingDuration(
  value: number,
  unit: string
) {
  return unit === "month"
    ? `${value} 个月`
    : `${value} 年`;
}

function extractNoteValue(
  notes: string | null | undefined,
  label: string
) {
  if (!notes) return "";

  const escapedLabel = label.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const match = notes.match(
    new RegExp(`${escapedLabel}[：:]\\s*([^\\n\\r]+)`)
  );

  return match?.[1]?.trim() || "";
}

function getVehicleSizeInfo(
  appointment: AppointmentRecord
) {
  const rawCode = String(
    appointment.vehicle_size_code || ""
  )
    .trim()
    .toLowerCase();

  const preset =
    rawCode in VEHICLE_SIZE_PRESETS
      ? VEHICLE_SIZE_PRESETS[
          rawCode as VehicleSizeCode
        ]
      : undefined;

  const savedLabel = String(
    appointment.vehicle_size_name || ""
  ).trim();

  const notesLabel = extractVehicleSizeFromNotes(
    appointment.notes
  );

  const fallbackLabel = preset
    ? Array.from(
        new Set([preset.nameZh, preset.nameEn])
      ).join(" / ")
    : "";

  return {
    code: rawCode,
    label:
      savedLabel ||
      notesLabel ||
      fallbackLabel,
    icon: preset?.icon || "🚘",
  };
}

function extractVehicleSizeFromNotes(
  notes?: string | null
) {
  return extractNoteValue(notes, "车型大小");
}

function toFiniteNumber(
  value: number | string | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function getStatusInfo(status?: string) {
  return (
    statusOptions.find(
      (option) => option.value === status
    ) || statusOptions[0]
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

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(
    `${value}T00:00:00`
  );

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "读取预约失败，请稍后重试";
}

const pageHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  marginBottom: 24,
};

const eyebrow = {
  margin: 0,
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.4,
};

const pageTitle = {
  margin: "5px 0 0",
  fontSize: 35,
  color: "#111827",
};

const pageDescription = {
  margin: "8px 0 0",
  color: "#6b7280",
};

const refreshButton = {
  padding: "12px 18px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 800,
};

const currencyInfoCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 14,
  marginBottom: 18,
  padding: "15px 18px",
  border: "1px solid #bfdbfe",
  borderRadius: 15,
  background: "#eff6ff",
};

const currencyInfoTitle = {
  color: "#1e3a8a",
  fontSize: 13,
};

const currencyInfoText = {
  margin: "5px 0 0",
  color: "#3b5998",
  fontSize: 12,
  lineHeight: 1.5,
};

const currencyBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  background: "#ffffff",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 900,
  border: "1px solid #bfdbfe",
};

const currencyErrorText = {
  width: "100%",
  margin: 0,
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 700,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 16,
  marginBottom: 22,
};

const summaryCard = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: 20,
  borderRadius: 18,
  background: "#fff",
  boxShadow:
    "0 10px 25px rgba(15,23,42,.07)",
};

const summaryIcon = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 48,
  height: 48,
  borderRadius: 14,
  background: "#eff6ff",
  fontSize: 23,
};

const summaryLabel = {
  margin: 0,
  color: "#6b7280",
  fontSize: 12,
};

const summaryValue = {
  display: "block",
  marginTop: 4,
  fontSize: 27,
  color: "#111827",
};

const toolbar = {
  display: "flex",
  gap: 12,
  marginBottom: 22,
};

const searchInput = {
  flex: 1,
  padding: "13px 15px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  fontSize: 15,
};

const filterSelect = {
  minWidth: 220,
  padding: "13px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  background: "#fff",
  fontSize: 14,
};

const appointmentGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(390px, 1fr))",
  alignItems: "start",
  gap: 20,
};

const appointmentCard = {
  padding: 22,
  borderRadius: 20,
  border: "1px solid #e5e7eb",
  background: "#fff",
  boxShadow:
    "0 12px 30px rgba(15,23,42,.07)",
};

const cardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 14,
};

const appointmentNumber = {
  margin: 0,
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0.6,
};

const customerName = {
  margin: "7px 0 0",
  fontSize: 22,
  color: "#111827",
};

const statusBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
};

const customerContact = {
  display: "flex",
  flexWrap: "wrap" as const,
  justifyContent: "space-between",
  gap: 10,
  marginTop: 13,
  color: "#64748b",
  fontSize: 13,
};

const vehicleCard = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  background: "#f8fafc",
};

const vehicleContent = {
  minWidth: 0,
  flex: 1,
};

const vehicleSizeBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  marginTop: 8,
  padding: "6px 9px",
  borderRadius: 999,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 800,
};

const vehicleIcon = {
  width: 43,
  height: 43,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  background: "#e0e7ff",
  fontSize: 22,
};

const vehicleLabel = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 1,
};

const vehicleModel = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 12,
};

const serviceSection = {
  marginTop: 18,
  padding: 16,
  borderRadius: 15,
  border: "1px solid #e2e8f0",
};

const sectionLabel = {
  margin: "0 0 12px",
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 1.1,
};

const coatingOptionCard = {
  marginBottom: 14,
  padding: 14,
  border: "1px solid #ddd6fe",
  borderRadius: 14,
  background: "linear-gradient(135deg,#faf5ff,#f5f3ff)",
};

const coatingOptionHeader = {
  display: "flex",
  alignItems: "flex-start",
  gap: 11,
  flexWrap: "wrap" as const,
};

const coatingOptionIcon = {
  width: 38,
  height: 38,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 11,
  background: "#ede9fe",
  fontSize: 18,
};

const coatingOptionContent = {
  minWidth: 0,
  flex: 1,
};

const coatingOptionEyebrow = {
  margin: 0,
  color: "#7c3aed",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 0.8,
};

const coatingOptionTitle = {
  display: "block",
  marginTop: 4,
  color: "#4c1d95",
  fontSize: 14,
  fontWeight: 900,
  overflowWrap: "anywhere" as const,
};

const coatingProductName = {
  display: "block",
  marginTop: 5,
  color: "#6d28d9",
  fontSize: 11,
  overflowWrap: "anywhere" as const,
};

const coatingBasePrice = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-end",
  gap: 3,
  marginLeft: "auto",
  color: "#6d28d9",
  fontSize: 11,
};

const serviceRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 15,
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9",
};

const serviceMeta = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: 11,
};

const servicePrice = {
  color: "#1d4ed8",
  whiteSpace: "nowrap" as const,
};

const missingService = {
  padding: 12,
  borderRadius: 10,
  background: "#fff7ed",
  color: "#9a3412",
  fontSize: 12,
};

const totalRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 13,
  paddingTop: 13,
  borderTop: "1px solid #e2e8f0",
  fontSize: 15,
};

const quoteMeta = {
  margin: "9px 0 0",
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1.5,
};

const dateTimeGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 12,
  marginTop: 18,
};

const informationItem = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 13,
  borderRadius: 13,
  background: "#f8fafc",
};

const informationIcon = {
  fontSize: 19,
};

const informationLabel = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 10,
};

const informationValue = {
  display: "block",
  marginTop: 4,
  color: "#334155",
  fontSize: 13,
};

const notesBox = {
  marginTop: 18,
  padding: 14,
  borderRadius: 13,
  background: "#fffbeb",
  color: "#78350f",
  fontSize: 12,
};

const notesText = {
  margin: "7px 0 0",
  lineHeight: 1.6,
};

const statusControl = {
  position: "relative" as const,
  marginTop: 18,
  paddingTop: 17,
  borderTop: "1px solid #e5e7eb",
};

const statusLabel = {
  display: "block",
  marginBottom: 8,
  color: "#374151",
  fontSize: 12,
  fontWeight: 800,
};

const statusSelect = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid #d1d5db",
  borderRadius: 11,
  background: "#fff",
  fontSize: 13,
};

const updatingText = {
  display: "inline-block",
  marginTop: 8,
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 700,
};

const emptyState = {
  padding: 60,
  borderRadius: 20,
  background: "#fff",
  textAlign: "center" as const,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.06)",
};

const emptyDescription = {
  color: "#6b7280",
};

export default Appointments;