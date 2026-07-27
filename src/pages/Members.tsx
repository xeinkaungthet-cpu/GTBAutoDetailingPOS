import { useEffect, useMemo, useState } from "react";

import type { Member } from "../types/database";
import { MemberService } from "../services/memberService";
import { supabase } from "../lib/supabase";
import useCurrency from "../hooks/useCurrency";

type MemberRecord = Member & {
  id: number | string;
  name: string;
  phone: string;
  points?: number | null;
  balance?: number | null;
  email?: string | null;
  birthday?: string | null;
  created_at?: string | null;
};

type VehicleRecord = {
  id: number | string;
  member_id?: number | string | null;
  plate_number?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
};

type OrderRecord = {
  id: number | string;
  member_id?: number | string | null;
  order_no?: string | null;
  total?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

type MemberSummary = {
  vehicles: VehicleRecord[];
  orders: OrderRecord[];
  totalSpent: number;
  orderCount: number;
  lastVisit: string | null;
};

type MemberFilter = "all" | "active" | "inactive" | "new";

const EMPTY_SUMMARY: MemberSummary = {
  vehicles: [],
  orders: [],
  totalSpent: 0,
  orderCount: 0,
  lastVisit: null,
};

function Members() {
  const { formatMoney } = useCurrency();

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadMembers() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [memberData, vehicleResult, orderResult] = await Promise.all([
        MemberService.getAll(),
        supabase
          .from("vehicles")
          .select("id, member_id, plate_number, brand, model, color"),
        supabase
          .from("orders")
          .select("id, member_id, order_no, total, status, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (vehicleResult.error) {
        throw vehicleResult.error;
      }

      if (orderResult.error) {
        throw orderResult.error;
      }

      setMembers((memberData ?? []) as MemberRecord[]);
      setVehicles((vehicleResult.data ?? []) as VehicleRecord[]);
      setOrders((orderResult.data ?? []) as OrderRecord[]);
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "会员资料加载失败",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  const memberSummaries = useMemo(() => {
    const result = new Map<string, MemberSummary>();

    members.forEach((member) => {
      const memberId = String(member.id);

      const memberVehicles = vehicles.filter(
        (vehicle) => String(vehicle.member_id ?? "") === memberId,
      );

      const memberOrders = orders.filter(
        (order) =>
          String(order.member_id ?? "") === memberId &&
          isRevenueOrder(order),
      );

      const totalSpent = memberOrders.reduce(
        (sum, order) => sum + (Number(order.total) || 0),
        0,
      );

      result.set(memberId, {
        vehicles: memberVehicles,
        orders: memberOrders,
        totalSpent,
        orderCount: memberOrders.length,
        lastVisit: memberOrders[0]?.created_at ?? null,
      });
    });

    return result;
  }, [members, vehicles, orders]);

  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const now = new Date();

    return members.filter((member) => {
      const summary =
        memberSummaries.get(String(member.id)) ?? EMPTY_SUMMARY;

      const searchableText = [
        member.name,
        member.phone,
        member.email,
        ...summary.vehicles.flatMap((vehicle) => [
          vehicle.plate_number,
          vehicle.brand,
          vehicle.model,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      const lastVisitDate = summary.lastVisit
        ? new Date(summary.lastVisit)
        : null;

      const daysSinceLastVisit =
        lastVisitDate && !Number.isNaN(lastVisitDate.getTime())
          ? differenceInDays(lastVisitDate, now)
          : null;

      const createdAt = member.created_at
        ? new Date(member.created_at)
        : null;

      const daysSinceCreated =
        createdAt && !Number.isNaN(createdAt.getTime())
          ? differenceInDays(createdAt, now)
          : null;

      const matchesFilter =
        filter === "all" ||
        (filter === "active" &&
          daysSinceLastVisit !== null &&
          daysSinceLastVisit <= 30) ||
        (filter === "inactive" &&
          (daysSinceLastVisit === null || daysSinceLastVisit > 30)) ||
        (filter === "new" &&
          daysSinceCreated !== null &&
          daysSinceCreated <= 30);

      return matchesSearch && matchesFilter;
    });
  }, [members, memberSummaries, search, filter]);

  const selectedMember =
    members.find((member) => String(member.id) === selectedMemberId) ?? null;

  const selectedSummary = selectedMember
    ? memberSummaries.get(String(selectedMember.id)) ?? EMPTY_SUMMARY
    : EMPTY_SUMMARY;

  const totalCustomerValue = useMemo(
    () =>
      Array.from(memberSummaries.values()).reduce(
        (sum, summary) => sum + summary.totalSpent,
        0,
      ),
    [memberSummaries],
  );

  const activeMemberCount = useMemo(() => {
    const today = new Date();

    return members.filter((member) => {
      const summary =
        memberSummaries.get(String(member.id)) ?? EMPTY_SUMMARY;

      if (!summary.lastVisit) {
        return false;
      }

      const lastVisitDate = new Date(summary.lastVisit);

      return (
        !Number.isNaN(lastVisitDate.getTime()) &&
        differenceInDays(lastVisitDate, today) <= 30
      );
    }).length;
  }, [members, memberSummaries]);

  const inactiveMemberCount = members.length - activeMemberCount;

  const averageCustomerValue =
    members.length > 0 ? totalCustomerValue / members.length : 0;

  async function createMember() {
    const name = newMemberName.trim();
    const phone = newMemberPhone.trim();
    const email = newMemberEmail.trim();

    if (!name) {
      alert("请输入会员姓名");
      return;
    }

    if (!phone) {
      alert("请输入电话号码");
      return;
    }

    setSaving(true);

    try {
      await MemberService.create({
        name,
        phone,
        points: 0,
        balance: 0,
        ...(email ? { email } : {}),
      } as never);

      setNewMemberName("");
      setNewMemberPhone("");
      setNewMemberEmail("");
      setShowCreateForm(false);

      await loadMembers();
    } catch (error: unknown) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "新增会员失败",
      );
    } finally {
      setSaving(false);
    }
  }

  function openMember(memberId: number | string) {
    setSelectedMemberId(String(memberId));
  }

  return (
    <main style={page}>
      <style>
        {`
          @media (max-width: 1050px) {
            .gtb1n-crm-layout {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 720px) {
            .gtb1n-crm-header {
              align-items: flex-start !important;
              flex-direction: column !important;
            }

            .gtb1n-crm-toolbar {
              grid-template-columns: 1fr !important;
            }

            .gtb1n-member-row {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <section style={hero} className="gtb1n-crm-header">
        <div>
          <p style={heroEyebrow}>GTB1N CUSTOMER RELATIONSHIP MANAGEMENT</p>

          <h1 style={heroTitle}>会员管理 / CRM</h1>

          <p style={heroDescription}>
            统一管理客户资料、车辆、消费记录、积分和回访状态。
          </p>

          <div style={heroBadges}>
            <span style={onlineBadge}>
              <span style={onlineDot} />
              CUSTOMER DATA LIVE
            </span>

            <span style={securityBadge}>🔒 Private Customer Records</span>
          </div>
        </div>

        <div style={heroActions}>
          <button
            type="button"
            onClick={() => {
              void loadMembers();
            }}
            disabled={loading}
            style={secondaryButton}
          >
            {loading ? "载入中..." : "↻ 刷新资料"}
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            style={primaryButton}
          >
            + 新会员
          </button>
        </div>
      </section>

      {errorMessage && <div style={errorBox}>{errorMessage}</div>}

      <section style={statsGrid}>
        <MetricCard
          label="全部会员"
          english="Total Members"
          value={`${members.length} 人`}
          icon="👥"
          accent="#2563eb"
        />

        <MetricCard
          label="活跃会员"
          english="Active Customers"
          value={`${activeMemberCount} 人`}
          icon="⚡"
          accent="#16a34a"
        />

        <MetricCard
          label="沉睡会员"
          english="Inactive Customers"
          value={`${inactiveMemberCount} 人`}
          icon="🌙"
          accent="#dc2626"
        />

        <MetricCard
          label="客户总价值"
          english="Customer Lifetime Value"
          value={formatMoney(totalCustomerValue)}
          icon="💎"
          accent="#d4af37"
        />

        <MetricCard
          label="平均客户价值"
          english="Average Customer Value"
          value={formatMoney(averageCustomerValue)}
          icon="📈"
          accent="#7c3aed"
        />
      </section>

      <section style={toolbar} className="gtb1n-crm-toolbar">
        <div style={searchBox}>
          <span aria-hidden="true">🔎</span>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索姓名、电话、Email、车牌、品牌或车型..."
            style={searchInput}
          />
        </div>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as MemberFilter)
          }
          style={filterSelect}
        >
          <option value="all">全部会员</option>
          <option value="active">30天内活跃</option>
          <option value="inactive">超过30天未消费</option>
          <option value="new">30天内新增</option>
        </select>

        <span style={resultBadge}>
          {filteredMembers.length} RESULTS
        </span>
      </section>

      <div style={layout} className="gtb1n-crm-layout">
        <section style={listCard}>
          <div style={sectionHeader}>
            <div>
              <p style={sectionEyebrow}>CUSTOMER DIRECTORY</p>
              <h2 style={sectionTitle}>会员清单</h2>
            </div>

            <span style={sectionBadge}>LIVE</span>
          </div>

          {loading ? (
            <div style={emptyState}>正在载入会员资料...</div>
          ) : filteredMembers.length === 0 ? (
            <div style={emptyState}>没有找到符合条件的会员</div>
          ) : (
            <div style={memberList}>
              {filteredMembers.map((member) => {
                const summary =
                  memberSummaries.get(String(member.id)) ?? EMPTY_SUMMARY;

                const status = getMemberStatus(
                  summary.lastVisit,
                  member.created_at,
                );

                const memberLevel = getMemberLevel(summary.totalSpent);

                return (
                  <button
                    key={member.id}
                    type="button"
                    className="gtb1n-member-row"
                    onClick={() => openMember(member.id)}
                    style={{
                      ...memberRow,
                      borderColor:
                        String(member.id) === selectedMemberId
                          ? "#d4af37"
                          : "#e2e8f0",
                      background:
                        String(member.id) === selectedMemberId
                          ? "#fffdf5"
                          : "#ffffff",
                    }}
                  >
                    <div style={memberIdentity}>
                      <div style={avatar}>
                        {getInitials(member.name)}
                      </div>

                      <div style={memberMain}>
                        <div style={nameRow}>
                          <strong style={memberName}>{member.name}</strong>

                          <span
                            style={{
                              ...levelBadge,
                              color: memberLevel.color,
                              background: memberLevel.background,
                            }}
                          >
                            {memberLevel.label}
                          </span>
                        </div>

                        <p style={memberPhone}>{member.phone}</p>

                        {member.email && (
                          <p style={memberEmail}>{member.email}</p>
                        )}
                      </div>
                    </div>

                    <div style={memberMetric}>
                      <span style={metricLabel}>累计消费</span>
                      <strong style={metricValue}>
                        {formatMoney(summary.totalSpent)}
                      </strong>
                    </div>

                    <div style={memberMetric}>
                      <span style={metricLabel}>订单 / 车辆</span>
                      <strong style={metricValue}>
                        {summary.orderCount} / {summary.vehicles.length}
                      </strong>
                    </div>

                    <div style={memberStatusBox}>
                      <span
                        style={{
                          ...statusBadge,
                          color: status.color,
                          background: status.background,
                        }}
                      >
                        {status.label}
                      </span>

                      <span style={lastVisitText}>
                        {summary.lastVisit
                          ? formatDate(summary.lastVisit)
                          : "暂无消费"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside style={detailCard}>
          {selectedMember ? (
            <>
              <div style={detailHeader}>
                <div style={detailIdentity}>
                  <div style={detailAvatar}>
                    {getInitials(selectedMember.name)}
                  </div>

                  <div>
                    <p style={detailEyebrow}>CUSTOMER PROFILE</p>
                    <h2 style={detailName}>{selectedMember.name}</h2>
                    <p style={detailPhone}>{selectedMember.phone}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMemberId("")}
                  style={closeButton}
                >
                  ×
                </button>
              </div>

              <div style={detailStats}>
                <DetailMetric
                  label="累计消费"
                  value={formatMoney(selectedSummary.totalSpent)}
                />

                <DetailMetric
                  label="订单数量"
                  value={`${selectedSummary.orderCount} 单`}
                />

                <DetailMetric
                  label="会员积分"
                  value={`${Number(selectedMember.points) || 0}`}
                />

                <DetailMetric
                  label="账户余额"
                  value={formatMoney(Number(selectedMember.balance) || 0)}
                />
              </div>

              <div style={contactActions}>
                <a
                  href={`tel:${selectedMember.phone}`}
                  style={contactButton}
                >
                  📞 电话
                </a>

                <a
                  href={`https://wa.me/${normalizePhone(selectedMember.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={whatsAppButton}
                >
                  💬 WhatsApp
                </a>
              </div>

              <section style={detailSection}>
                <div style={detailSectionHeader}>
                  <h3 style={detailSectionTitle}>车辆档案</h3>
                  <span style={miniBadge}>
                    {selectedSummary.vehicles.length}
                  </span>
                </div>

                {selectedSummary.vehicles.length === 0 ? (
                  <p style={detailEmpty}>暂无车辆</p>
                ) : (
                  selectedSummary.vehicles.map((vehicle) => (
                    <div key={vehicle.id} style={vehicleRow}>
                      <span style={vehicleIcon}>🚘</span>

                      <div>
                        <strong style={vehiclePlate}>
                          {vehicle.plate_number || "未填写车牌"}
                        </strong>

                        <p style={vehicleDescription}>
                          {[vehicle.brand, vehicle.model, vehicle.color]
                            .filter(Boolean)
                            .join(" · ") || "车辆资料未完善"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section style={detailSection}>
                <div style={detailSectionHeader}>
                  <h3 style={detailSectionTitle}>最近消费</h3>
                  <span style={miniBadge}>
                    {selectedSummary.orders.length}
                  </span>
                </div>

                {selectedSummary.orders.length === 0 ? (
                  <p style={detailEmpty}>暂无消费记录</p>
                ) : (
                  selectedSummary.orders.slice(0, 5).map((order) => (
                    <div key={order.id} style={orderRow}>
                      <div>
                        <strong style={orderNo}>
                          {order.order_no || `ORDER-${order.id}`}
                        </strong>

                        <p style={orderDate}>
                          {order.created_at
                            ? formatDate(order.created_at)
                            : "-"}
                        </p>
                      </div>

                      <strong style={orderAmount}>
                        {formatMoney(Number(order.total) || 0)}
                      </strong>
                    </div>
                  ))
                )}
              </section>

              <div style={aiSuggestion}>
                <p style={aiEyebrow}>🤖 GTB1N AI FOLLOW-UP</p>

                <strong style={aiTitle}>
                  {buildFollowUpTitle(selectedSummary)}
                </strong>

                <p style={aiDescription}>
                  {buildFollowUpDescription(selectedSummary)}
                </p>
              </div>
            </>
          ) : (
            <div style={detailPlaceholder}>
              <span style={placeholderIcon}>👤</span>
              <strong>选择一位会员</strong>
              <p>查看客户价值、车辆、消费记录和回访建议。</p>
            </div>
          )}
        </aside>
      </div>

      {showCreateForm && (
        <div
          style={modalOverlay}
          onClick={() => setShowCreateForm(false)}
        >
          <section
            style={modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={modalHeader}>
              <div>
                <p style={modalEyebrow}>NEW CUSTOMER</p>
                <h2 style={modalTitle}>新增会员</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={closeButton}
              >
                ×
              </button>
            </div>

            <label style={fieldLabel}>
              姓名 / Name
              <input
                value={newMemberName}
                onChange={(event) => setNewMemberName(event.target.value)}
                placeholder="客户姓名"
                style={input}
              />
            </label>

            <label style={fieldLabel}>
              电话 / Phone
              <input
                value={newMemberPhone}
                onChange={(event) => setNewMemberPhone(event.target.value)}
                placeholder="电话号码"
                style={input}
              />
            </label>

            <label style={fieldLabel}>
              Email（可选）
              <input
                value={newMemberEmail}
                onChange={(event) => setNewMemberEmail(event.target.value)}
                placeholder="customer@email.com"
                style={input}
              />
            </label>

            <div style={modalActions}>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={cancelButton}
              >
                取消
              </button>

              <button
                type="button"
                onClick={() => {
                  void createMember();
                }}
                disabled={saving}
                style={{
                  ...saveButton,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "保存中..." : "保存会员"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function MetricCard({
  label,
  english,
  value,
  icon,
  accent,
}: {
  label: string;
  english: string;
  value: string;
  icon: string;
  accent: string;
}) {
  return (
    <article style={metricCard}>
      <div
        style={{
          ...metricIcon,
          color: accent,
          background: `${accent}12`,
          borderColor: `${accent}28`,
        }}
      >
        {icon}
      </div>

      <p style={metricCardLabel}>{label}</p>
      <p style={metricCardEnglish}>{english}</p>
      <strong style={metricCardValue}>{value}</strong>
    </article>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article style={detailMetricCard}>
      <span style={detailMetricLabel}>{label}</span>
      <strong style={detailMetricValue}>{value}</strong>
    </article>
  );
}

function getMemberStatus(
  lastVisit: string | null,
  createdAt?: string | null,
) {
  if (lastVisit) {
    const visitDate = new Date(lastVisit);

    if (!Number.isNaN(visitDate.getTime())) {
      const days = differenceInDays(visitDate, new Date());

      if (days <= 30) {
        return {
          label: "活跃",
          color: "#15803d",
          background: "#dcfce7",
        };
      }

      return {
        label: "待回访",
        color: "#b45309",
        background: "#fef3c7",
      };
    }
  }

  if (createdAt) {
    const createdDate = new Date(createdAt);

    if (
      !Number.isNaN(createdDate.getTime()) &&
      differenceInDays(createdDate, new Date()) <= 30
    ) {
      return {
        label: "新客户",
        color: "#1d4ed8",
        background: "#dbeafe",
      };
    }
  }

  return {
    label: "未消费",
    color: "#64748b",
    background: "#f1f5f9",
  };
}

function getMemberLevel(totalSpent: number) {
  if (totalSpent >= 10_000_000) {
    return {
      label: "VIP BLACK",
      color: "#facc15",
      background: "#111827",
    };
  }

  if (totalSpent >= 5_000_000) {
    return {
      label: "VIP GOLD",
      color: "#92400e",
      background: "#fef3c7",
    };
  }

  if (totalSpent >= 1_000_000) {
    return {
      label: "VIP SILVER",
      color: "#475569",
      background: "#e2e8f0",
    };
  }

  return {
    label: "STANDARD",
    color: "#1d4ed8",
    background: "#dbeafe",
  };
}

function buildFollowUpTitle(summary: MemberSummary) {
  if (!summary.lastVisit) {
    return "建议发送首次到店优惠";
  }

  const days = differenceInDays(
    new Date(summary.lastVisit),
    new Date(),
  );

  if (days > 60) {
    return "高优先级回访客户";
  }

  if (days > 30) {
    return "建议安排客户回访";
  }

  return "客户目前保持活跃";
}

function buildFollowUpDescription(summary: MemberSummary) {
  if (!summary.lastVisit) {
    return "该客户尚未完成消费，可以推荐基础洗车或首次到店套餐。";
  }

  const days = differenceInDays(
    new Date(summary.lastVisit),
    new Date(),
  );

  if (days > 60) {
    return `该客户已经 ${days} 天没有到店，建议通过 WhatsApp 发送专属优惠。`;
  }

  if (days > 30) {
    return `距离上次消费已经 ${days} 天，可以推荐保养洗车、内饰清洁或镀晶维护。`;
  }

  return "最近消费状态良好，可以在下次到店时推荐升级套餐或会员储值。";
}

function isRevenueOrder(order: OrderRecord) {
  const status = String(order.status ?? "")
    .trim()
    .toLowerCase();

  return ![
    "cancelled",
    "canceled",
    "refunded",
    "void",
    "已取消",
    "取消",
    "退款",
  ].includes(status);
}

function differenceInDays(start: Date, end: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.max(
    0,
    Math.floor(
      (startOfDay(end).getTime() - startOfDay(start).getTime()) /
        millisecondsPerDay,
    ),
  );
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  const value = String(name ?? "").trim();

  if (!value) {
    return "GT";
  }

  const words = value.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
}

function normalizePhone(phone: string) {
  return String(phone ?? "").replace(/[^\d]/g, "");
}

const page = {
  minWidth: 0,
  paddingBottom: 42,
};

const hero = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 22,
  marginBottom: 22,
  padding: "28px",
  border: "1px solid rgba(212,175,55,.28)",
  borderRadius: 24,
  background:
    "linear-gradient(135deg,#090d16 0%,#111827 58%,#1b1508 100%)",
  boxShadow: "0 20px 48px rgba(15,23,42,.16)",
};

const heroEyebrow = {
  margin: 0,
  color: "#f4cf61",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: "1.55px",
};

const heroTitle = {
  margin: "8px 0 0",
  color: "#ffffff",
  fontSize: "clamp(32px,4vw,46px)",
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: "-1px",
};

const heroDescription = {
  maxWidth: 640,
  margin: "11px 0 0",
  color: "#94a3b8",
  lineHeight: 1.65,
};

const heroBadges = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
  marginTop: 15,
};

const onlineBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "6px 10px",
  border: "1px solid rgba(34,197,94,.28)",
  borderRadius: 999,
  background: "rgba(34,197,94,.10)",
  color: "#86efac",
  fontSize: 10,
  fontWeight: 900,
};

const onlineDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 10px rgba(34,197,94,.9)",
};

const securityBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 999,
  background: "rgba(255,255,255,.06)",
  color: "#cbd5e1",
  fontSize: 10,
  fontWeight: 850,
};

const heroActions = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 10,
};

const primaryButton = {
  padding: "12px 18px",
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(135deg,#f4cf61,#c99518)",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 950,
};

const secondaryButton = {
  padding: "12px 16px",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,.07)",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 850,
};

const errorBox = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 12,
  background: "#fee2e2",
  color: "#991b1b",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 14,
  marginBottom: 20,
};

const metricCard = {
  minWidth: 0,
  padding: 18,
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  background: "#ffffff",
  boxShadow: "0 10px 28px rgba(15,23,42,.07)",
};

const metricIcon = {
  width: 43,
  height: 43,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 13,
  fontSize: 21,
};

const metricCardLabel = {
  margin: "14px 0 0",
  color: "#334155",
  fontSize: 12,
  fontWeight: 850,
};

const metricCardEnglish = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 700,
};

const metricCardValue = {
  display: "block",
  marginTop: 10,
  color: "#0f172a",
  fontSize: 23,
  fontWeight: 950,
  overflowWrap: "anywhere" as const,
};

const toolbar = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) 230px auto",
  alignItems: "center",
  gap: 10,
  marginBottom: 20,
  padding: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#ffffff",
};

const searchBox = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  minWidth: 0,
  padding: "0 13px",
  border: "1px solid #dbe3ec",
  borderRadius: 12,
  background: "#f8fafc",
};

const searchInput = {
  width: "100%",
  minWidth: 0,
  padding: "13px 0",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#0f172a",
};

const filterSelect = {
  width: "100%",
  padding: 13,
  border: "1px solid #dbe3ec",
  borderRadius: 12,
  background: "#ffffff",
  color: "#334155",
  fontWeight: 750,
};

const resultBadge = {
  padding: "8px 11px",
  borderRadius: 999,
  background: "#111827",
  color: "#f4cf61",
  fontSize: 9,
  fontWeight: 950,
  whiteSpace: "nowrap" as const,
};

const layout = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1.35fr) minmax(340px,.65fr)",
  alignItems: "start",
  gap: 20,
};

const listCard = {
  minWidth: 0,
  padding: 20,
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  background: "#ffffff",
  boxShadow: "0 12px 34px rgba(15,23,42,.07)",
};

const detailCard = {
  position: "sticky" as const,
  top: 18,
  minWidth: 0,
  padding: 20,
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  background: "#ffffff",
  boxShadow: "0 12px 34px rgba(15,23,42,.09)",
};

const sectionHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const sectionEyebrow = {
  margin: 0,
  color: "#b88916",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: "1.3px",
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: 23,
};

const sectionBadge = {
  padding: "6px 9px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: 9,
  fontWeight: 900,
};

const memberList = {
  display: "grid",
  gap: 9,
};

const memberRow = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "minmax(230px,1.3fr) minmax(130px,.65fr) minmax(110px,.5fr) auto",
  alignItems: "center",
  gap: 14,
  padding: 14,
  border: "1px solid",
  borderRadius: 15,
  cursor: "pointer",
  textAlign: "left" as const,
};

const memberIdentity = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 11,
};

const avatar = {
  width: 45,
  height: 45,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  borderRadius: 14,
  background: "linear-gradient(135deg,#111827,#334155)",
  color: "#f4cf61",
  fontSize: 13,
  fontWeight: 950,
};

const memberMain = {
  minWidth: 0,
};

const nameRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 7,
};

const memberName = {
  color: "#0f172a",
  fontSize: 14,
};

const levelBadge = {
  padding: "4px 7px",
  borderRadius: 999,
  fontSize: 8,
  fontWeight: 950,
};

const memberPhone = {
  margin: "5px 0 0",
  color: "#475569",
  fontSize: 11,
  fontWeight: 750,
};

const memberEmail = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: 10,
};

const memberMetric = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 5,
};

const metricLabel = {
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 750,
};

const metricValue = {
  color: "#0f172a",
  fontSize: 13,
};

const memberStatusBox = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-end",
  gap: 6,
};

const statusBadge = {
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 900,
};

const lastVisitText = {
  color: "#94a3b8",
  fontSize: 9,
};

const emptyState = {
  padding: "42px 20px",
  borderRadius: 15,
  background: "#f8fafc",
  color: "#64748b",
  textAlign: "center" as const,
};

const detailHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const detailIdentity = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const detailAvatar = {
  width: 58,
  height: 58,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  borderRadius: 18,
  background: "linear-gradient(135deg,#111827,#334155)",
  color: "#f4cf61",
  fontSize: 17,
  fontWeight: 950,
};

const detailEyebrow = {
  margin: 0,
  color: "#b88916",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: "1.2px",
};

const detailName = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: 22,
};

const detailPhone = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 11,
};

const closeButton = {
  width: 38,
  height: 38,
  border: "1px solid #dbe3ec",
  borderRadius: 11,
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontSize: 21,
};

const detailStats = {
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: 9,
  marginTop: 18,
};

const detailMetricCard = {
  padding: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  background: "#f8fafc",
};

const detailMetricLabel = {
  display: "block",
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 750,
};

const detailMetricValue = {
  display: "block",
  marginTop: 7,
  color: "#0f172a",
  fontSize: 14,
};

const contactActions = {
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: 9,
  marginTop: 14,
};

const contactButton = {
  padding: "11px 12px",
  borderRadius: 11,
  background: "#eff6ff",
  color: "#1d4ed8",
  textAlign: "center" as const,
  textDecoration: "none",
  fontSize: 11,
  fontWeight: 900,
};

const whatsAppButton = {
  padding: "11px 12px",
  borderRadius: 11,
  background: "#dcfce7",
  color: "#15803d",
  textAlign: "center" as const,
  textDecoration: "none",
  fontSize: 11,
  fontWeight: 900,
};

const detailSection = {
  marginTop: 18,
  paddingTop: 16,
  borderTop: "1px solid #e2e8f0",
};

const detailSectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const detailSectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 15,
};

const miniBadge = {
  padding: "4px 7px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 8,
  fontWeight: 900,
};

const detailEmpty = {
  margin: "12px 0 0",
  color: "#94a3b8",
  fontSize: 11,
};

const vehicleRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 10,
  padding: 11,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#f8fafc",
};

const vehicleIcon = {
  fontSize: 23,
};

const vehiclePlate = {
  color: "#0f172a",
  fontSize: 12,
};

const vehicleDescription = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 9,
};

const orderRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 10,
  padding: "10px 0",
  borderBottom: "1px solid #e5e7eb",
};

const orderNo = {
  color: "#0f172a",
  fontSize: 11,
};

const orderDate = {
  margin: "4px 0 0",
  color: "#94a3b8",
  fontSize: 9,
};

const orderAmount = {
  color: "#16a34a",
  fontSize: 11,
};

const aiSuggestion = {
  marginTop: 18,
  padding: 15,
  border: "1px solid rgba(212,175,55,.28)",
  borderRadius: 15,
  background: "linear-gradient(135deg,#111827,#1b1508)",
};

const aiEyebrow = {
  margin: 0,
  color: "#f4cf61",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: "1.1px",
};

const aiTitle = {
  display: "block",
  marginTop: 8,
  color: "#ffffff",
  fontSize: 13,
};

const aiDescription = {
  margin: "7px 0 0",
  color: "#cbd5e1",
  fontSize: 10,
  lineHeight: 1.6,
};

const detailPlaceholder = {
  minHeight: 420,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  color: "#64748b",
  textAlign: "center" as const,
};

const placeholderIcon = {
  fontSize: 40,
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 10000,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(15,23,42,.72)",
  backdropFilter: "blur(8px)",
};

const modal = {
  width: "min(520px,100%)",
  padding: 22,
  border: "1px solid rgba(212,175,55,.24)",
  borderRadius: 22,
  background: "#ffffff",
  boxShadow: "0 30px 90px rgba(15,23,42,.35)",
};

const modalHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 18,
};

const modalEyebrow = {
  margin: 0,
  color: "#b88916",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: "1.3px",
};

const modalTitle = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: 25,
};

const fieldLabel = {
  display: "block",
  marginTop: 13,
  color: "#334155",
  fontSize: 11,
  fontWeight: 850,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: 7,
  padding: 13,
  border: "1px solid #dbe3ec",
  borderRadius: 11,
  outline: "none",
  background: "#f8fafc",
};

const modalActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 9,
  marginTop: 20,
};

const cancelButton = {
  padding: "11px 15px",
  border: "1px solid #dbe3ec",
  borderRadius: 11,
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 850,
};

const saveButton = {
  padding: "11px 17px",
  border: "none",
  borderRadius: 11,
  background: "linear-gradient(135deg,#f4cf61,#c99518)",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 950,
};

export default Members;