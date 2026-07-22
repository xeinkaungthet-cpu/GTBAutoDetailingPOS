import { useEffect, useMemo, useState } from "react";

import type {
  Appointment,
  Service,
} from "../types/database";

import { AppointmentService } from "../services/appointmentService";
import { ServiceService } from "../services/serviceService";
import useCurrency from "../hooks/useCurrency";

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
    useState<Appointment[]>([]);

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

      setAppointments(appointmentData);
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
            GTB Auto Detailing & Window Film
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
          placeholder="🔍 搜索预约号、客户、电话、车牌、车型或服务"
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

              const appointmentTotal =
                selectedServices.reduce(
                  (sum, service) =>
                    sum +
                    Number(service.price || 0),
                  0
                );

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
                      🚘
                    </div>

                    <div>
                      <p style={vehicleLabel}>
                        VEHICLE
                      </p>

                      <strong>
                        {appointment.vehicle_plate ||
                          "未填写车牌"}
                      </strong>

                      <p style={vehicleModel}>
                        {appointment.vehicle_model ||
                          "未填写车型"}
                      </p>
                    </div>
                  </div>

                  <div style={serviceSection}>
                    <p style={sectionLabel}>
                      SELECTED SERVICE
                    </p>

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
                                Number(service.price || 0)
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
                        预计金额 / Estimated
                      </span>

                      <strong>
                        {formatDisplayMoney(
                          appointmentTotal
                        )}
                      </strong>
                    </div>
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
  appointment: Appointment,
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