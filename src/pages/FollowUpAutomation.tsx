import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { supabase } from "../lib/supabase";

type FollowUpTask = {
  id: number;
  order_id: number;
  member_id: number | null;
  task_type:
    | "service_follow_up"
    | "review_request"
    | "maintenance_reminder"
    | string;
  channel: string;
  recipient: string | null;
  subject: string | null;
  message: string | null;
  scheduled_at: string;
  status: string;
  attempts: number;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type StatusFilter =
  | "all"
  | "pending"
  | "sent"
  | "failed"
  | "cancelled";

type LoadMode = "initial" | "manual" | "silent";

type ProcessFollowUpResult = {
  success?: boolean;
  processed?: number;
  sent?: number;
  failed?: number;
  error?: string;
  message?: string;
};

type ActionNotice = {
  type: "success" | "error";
  text: string;
};

const TASK_FIELDS = `
  id,
  order_id,
  member_id,
  task_type,
  channel,
  recipient,
  subject,
  message,
  scheduled_at,
  status,
  attempts,
  sent_at,
  last_error,
  created_at,
  updated_at
`;

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatTime(value: Date | null): string {
  if (!value) {
    return "尚未刷新";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function getTaskTypeLabel(taskType: string): string {
  const labels: Record<string, string> = {
    service_follow_up: "服务满意度跟进",
    review_request: "客户评价邀请",
    maintenance_reminder: "车辆护理提醒",
  };

  return labels[taskType] ?? taskType;
}

function getTaskTypeIcon(taskType: string): string {
  const icons: Record<string, string> = {
    service_follow_up: "💬",
    review_request: "⭐",
    maintenance_reminder: "🚘",
  };

  return icons[taskType] ?? "📨";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "待发送",
    processing: "处理中",
    sent: "已发送",
    failed: "发送失败",
    cancelled: "已取消",
  };

  return labels[status] ?? status;
}

function getStatusStyle(status: string): CSSProperties {
  if (status === "sent") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (status === "failed") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }

  if (status === "processing") {
    return {
      background: "#dbeafe",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }

  if (status === "cancelled") {
    return {
      background: "#f1f5f9",
      color: "#475569",
      border: "1px solid #cbd5e1",
    };
  }

  return {
    background: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a",
  };
}

function getCountdownLabel(
  task: FollowUpTask,
  now: number,
): string {
  if (task.status === "sent") {
    return "已完成";
  }

  if (task.status === "failed") {
    return "等待重试";
  }

  if (task.status === "cancelled") {
    return "已取消";
  }

  if (task.status === "processing") {
    return "正在处理";
  }

  const scheduledTime = new Date(task.scheduled_at).getTime();

  if (Number.isNaN(scheduledTime)) {
    return "时间无效";
  }

  const difference = scheduledTime - now;

  if (difference <= 0) {
    return "已到期，等待系统处理";
  }

  const totalMinutes = Math.ceil(difference / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}天 ${hours}小时`;
  }

  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  }

  return `${minutes}分钟`;
}

function getCountdownStyle(
  task: FollowUpTask,
  now: number,
): CSSProperties {
  if (task.status === "sent") {
    return { color: "#15803d" };
  }

  if (task.status === "failed") {
    return { color: "#dc2626" };
  }

  if (
    task.status === "pending" &&
    new Date(task.scheduled_at).getTime() <= now
  ) {
    return { color: "#d97706", fontWeight: 800 };
  }

  return { color: "#475569" };
}

function StatCard({
  title,
  value,
  subtitle,
  valueColor,
  active,
  onClick,
}: {
  title: string;
  value: number;
  subtitle: string;
  valueColor: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: "#ffffff",
        border: active
          ? "2px solid #0f172a"
          : "1px solid #e2e8f0",
        borderRadius: "18px",
        padding: "20px",
        boxShadow: active
          ? "0 10px 30px rgba(15, 23, 42, 0.12)"
          : "0 8px 24px rgba(15, 23, 42, 0.05)",
        cursor: "pointer",
        transition: "transform 160ms ease, box-shadow 160ms ease",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "14px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: valueColor,
          fontSize: "32px",
          fontWeight: 800,
          marginTop: "8px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#94a3b8",
          fontSize: "13px",
          marginTop: "6px",
        }}
      >
        {subtitle}
      </div>
    </button>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "12px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "12px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#0f172a",
          fontSize: "14px",
          fontWeight: 700,
          overflowWrap: "anywhere",
        }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function FollowUpAutomation() {
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedTaskId, setSelectedTaskId] =
    useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] =
    useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copiedField, setCopiedField] = useState("");
  const [processingDueTasks, setProcessingDueTasks] =
    useState(false);
  const [retryingTaskId, setRetryingTaskId] =
    useState<number | null>(null);
  const [actionNotice, setActionNotice] =
    useState<ActionNotice | null>(null);

  const loadTasks = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      }

      if (mode === "manual") {
        setRefreshing(true);
      }

      setErrorMessage("");

      const { data, error } = await supabase
        .from("follow_up_tasks")
        .select(TASK_FIELDS)
        .order("scheduled_at", { ascending: false })
        .limit(300);

      if (error) {
        console.error("加载售后任务失败：", error);
        setErrorMessage(
          `加载售后任务失败：${error.message}`,
        );

        if (mode !== "silent") {
          setTasks([]);
        }
      } else {
        setTasks((data ?? []) as FollowUpTask[]);
        setLastUpdatedAt(new Date());
      }

      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  useEffect(() => {
    void loadTasks("initial");

    const refreshTimer = window.setInterval(() => {
      void loadTasks("silent");
    }, 60000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadTasks]);

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(countdownTimer);
    };
  }, []);

  useEffect(() => {
    if (selectedTaskId === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedTaskId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTaskId]);

  const selectedTask = useMemo(
    () =>
      tasks.find((task) => task.id === selectedTaskId) ??
      null,
    [selectedTaskId, tasks],
  );

  const statistics = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter(
        (task) =>
          task.status === "pending" ||
          task.status === "processing",
      ).length,
      sent: tasks.filter((task) => task.status === "sent")
        .length,
      failed: tasks.filter(
        (task) => task.status === "failed",
      ).length,
      cancelled: tasks.filter(
        (task) => task.status === "cancelled",
      ).length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending"
          ? task.status === "pending" ||
            task.status === "processing"
          : task.status === statusFilter);

      const searchSource = [
        task.id,
        task.order_id,
        task.member_id,
        task.recipient,
        task.subject,
        task.message,
        task.task_type,
        task.status,
        task.last_error,
      ]
        .filter((value) => value !== null)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword.length === 0 ||
        searchSource.includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [tasks, statusFilter, searchText]);

  async function processDueTasks() {
    const confirmed = window.confirm(
      "现在立即检查并处理所有已经到期的售后任务吗？\n\n未来尚未到期的任务不会提前发送。",
    );

    if (!confirmed) {
      return;
    }

    setProcessingDueTasks(true);
    setActionNotice(null);
    setErrorMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        setActionNotice({
          type: "error",
          text: "登录状态已经失效，请重新登录后再操作。",
        });
        return;
      }

      const { data, error } =
        await supabase.functions.invoke(
          "process-follow-up-tasks",
          {
            body: {
              source: "manual",
            },
          },
        );

      if (error) {
        let message = error.message;

        const context = (
          error as unknown as {
            context?: Response;
          }
        ).context;

        if (context instanceof Response) {
          try {
            const payload = (await context
              .clone()
              .json()) as ProcessFollowUpResult;

            message =
              payload.error ??
              payload.message ??
              message;
          } catch {
            // 保留 Supabase 返回的原始错误信息。
          }
        }

        throw new Error(message);
      }

      const result =
        (data ?? {}) as ProcessFollowUpResult;

      if (result.success === false) {
        throw new Error(
          result.error ??
            result.message ??
            "售后任务处理失败",
        );
      }

      const processed = Number(
        result.processed ?? 0,
      );
      const sent = Number(result.sent ?? 0);
      const failed = Number(result.failed ?? 0);

      setActionNotice({
        type: failed > 0 ? "error" : "success",
        text:
          processed === 0
            ? "检查完成：当前没有已经到期的待发送任务。"
            : `处理完成：共处理 ${processed} 条，成功发送 ${sent} 条，失败 ${failed} 条。`,
      });

      await loadTasks("silent");
    } catch (error) {
      console.error("手动处理售后任务失败：", error);

      setActionNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "手动处理失败，请稍后再试。",
      });
    } finally {
      setProcessingDueTasks(false);
    }
  }

  async function retryFailedTask(task: FollowUpTask) {
    if (task.status !== "failed") {
      setActionNotice({
        type: "error",
        text: "只有发送失败的任务可以重试。",
      });
      return;
    }

    const confirmed = window.confirm(
      `确定立即重试任务 #${task.id} 吗？\n\n系统会把任务重新设为待发送，并立即尝试发送邮件。`,
    );

    if (!confirmed) {
      return;
    }

    setRetryingTaskId(task.id);
    setActionNotice(null);
    setErrorMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        setActionNotice({
          type: "error",
          text: "登录状态已经失效，请重新登录后再操作。",
        });
        return;
      }

      const { data, error } =
        await supabase.functions.invoke(
          "process-follow-up-tasks",
          {
            body: {
              source: "manual",
              action: "retry",
              task_id: task.id,
            },
          },
        );

      if (error) {
        let message = error.message;

        const context = (
          error as unknown as {
            context?: Response;
          }
        ).context;

        if (context instanceof Response) {
          try {
            const payload = (await context
              .clone()
              .json()) as ProcessFollowUpResult;

            message =
              payload.error ??
              payload.message ??
              message;
          } catch {
            // 保留 Supabase 返回的原始错误信息。
          }
        }

        throw new Error(message);
      }

      const result =
        (data ?? {}) as ProcessFollowUpResult;

      if (result.success === false) {
        throw new Error(
          result.error ??
            result.message ??
            "失败任务重试失败",
        );
      }

      const processed = Number(
        result.processed ?? 0,
      );
      const sent = Number(result.sent ?? 0);
      const failed = Number(result.failed ?? 0);

      setActionNotice({
        type: failed > 0 ? "error" : "success",
        text:
          failed > 0
            ? `重试完成：处理 ${processed} 条，成功 ${sent} 条，仍失败 ${failed} 条。请打开任务详情查看最新错误。`
            : sent > 0
              ? `重试完成：处理 ${processed} 条，成功发送 ${sent} 条。`
              : `任务 #${task.id} 已提交重试，系统没有返回发送失败记录。`,
      });

      await loadTasks("silent");
    } catch (error) {
      console.error("重试售后任务失败：", error);

      setActionNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "重试失败，请稍后再试。",
      });

      await loadTasks("silent");
    } finally {
      setRetryingTaskId(null);
    }
  }

  async function copyText(
    fieldName: string,
    value: string | null,
  ) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldName);

      window.setTimeout(() => {
        setCopiedField("");
      }, 1800);
    } catch (error) {
      console.error("复制失败：", error);
      setErrorMessage(
        "复制失败，请手动选择文字后复制。",
      );
    }
  }

  const cardStyle: CSSProperties = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "28px",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "999px",
                background: "#fef3c7",
                color: "#92400e",
                fontWeight: 700,
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              ⚡ AI AUTOMATION
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 800,
              }}
            >
              售后自动化管理
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
              }}
            >
              Follow-up Automation Management
            </p>

            <div
              style={{
                marginTop: "10px",
                color: "#94a3b8",
                fontSize: "12px",
              }}
            >
              页面每 60 秒自动刷新 · 最后更新：
              {formatTime(lastUpdatedAt)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => void processDueTasks()}
              disabled={processingDueTasks}
              style={{
                border: "none",
                borderRadius: "12px",
                padding: "12px 18px",
                background: processingDueTasks
                  ? "#fbbf24"
                  : "#d97706",
                color: "#ffffff",
                fontWeight: 800,
                cursor: processingDueTasks
                  ? "not-allowed"
                  : "pointer",
                boxShadow:
                  "0 8px 18px rgba(217, 119, 6, 0.22)",
              }}
            >
              {processingDueTasks
                ? "正在处理..."
                : "⚡ 立即处理到期任务"}
            </button>

            <button
              type="button"
              onClick={() => void loadTasks("manual")}
              disabled={refreshing}
              style={{
                border: "none",
                borderRadius: "12px",
                padding: "12px 18px",
                background: refreshing
                  ? "#94a3b8"
                  : "#0f172a",
                color: "#ffffff",
                fontWeight: 700,
                cursor: refreshing
                  ? "not-allowed"
                  : "pointer",
                boxShadow:
                  "0 8px 18px rgba(15, 23, 42, 0.16)",
              }}
            >
              {refreshing
                ? "正在刷新..."
                : "↻ 立即刷新状态"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          <StatCard
            title="全部任务"
            value={statistics.total}
            subtitle="Total Tasks"
            valueColor="#0f172a"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />

          <StatCard
            title="待发送"
            value={statistics.pending}
            subtitle="Pending / Processing"
            valueColor="#d97706"
            active={statusFilter === "pending"}
            onClick={() => setStatusFilter("pending")}
          />

          <StatCard
            title="已发送"
            value={statistics.sent}
            subtitle="Successfully Sent"
            valueColor="#16a34a"
            active={statusFilter === "sent"}
            onClick={() => setStatusFilter("sent")}
          />

          <StatCard
            title="发送失败"
            value={statistics.failed}
            subtitle="Failed"
            valueColor="#dc2626"
            active={statusFilter === "failed"}
            onClick={() => setStatusFilter("failed")}
          />
        </div>

        <div
          style={{
            ...cardStyle,
            marginBottom: "20px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="搜索订单、客户邮箱、主题、邮件内容、任务编号..."
            style={{
              flex: "1 1 360px",
              minWidth: "240px",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              outline: "none",
              fontSize: "14px",
            }}
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              minWidth: "170px",
              fontSize: "14px",
            }}
          >
            <option value="all">全部状态</option>
            <option value="pending">
              待发送 / 处理中
            </option>
            <option value="sent">已发送</option>
            <option value="failed">发送失败</option>
            <option value="cancelled">已取消</option>
          </select>

          <div
            style={{
              color: "#64748b",
              fontSize: "14px",
              marginLeft: "auto",
            }}
          >
            当前显示：
            <strong style={{ color: "#0f172a" }}>
              {filteredTasks.length}
            </strong>
            条
          </div>
        </div>

        {actionNotice && (
          <div
            style={{
              marginBottom: "18px",
              padding: "14px 16px",
              borderRadius: "12px",
              background:
                actionNotice.type === "success"
                  ? "#dcfce7"
                  : "#fee2e2",
              border:
                actionNotice.type === "success"
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
              color:
                actionNotice.type === "success"
                  ? "#166534"
                  : "#991b1b",
              fontWeight: 700,
            }}
          >
            {actionNotice.type === "success"
              ? "✅ "
              : "⚠️ "}
            {actionNotice.text}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              marginBottom: "18px",
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#991b1b",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            ...cardStyle,
            padding: 0,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              正在加载售后任务...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  marginBottom: "10px",
                }}
              >
                📭
              </div>

              <div
                style={{
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                暂无符合条件的售后任务
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                系统会每 15 分钟自动检查到期任务
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "1500px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f8fafc",
                      borderBottom:
                        "1px solid #e2e8f0",
                    }}
                  >
                    {[
                      "任务",
                      "订单",
                      "售后类型",
                      "收件人",
                      "状态",
                      "计划发送",
                      "倒计时 / 处理状态",
                      "实际发送",
                      "尝试次数",
                      "操作",
                    ].map((title) => (
                      <th
                        key={title}
                        style={{
                          padding: "14px 16px",
                          textAlign: "left",
                          color: "#475569",
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      style={{
                        borderBottom:
                          "1px solid #f1f5f9",
                        background:
                          selectedTaskId === task.id
                            ? "#f8fafc"
                            : "#ffffff",
                      }}
                    >
                      <td
                        style={{
                          padding: "16px",
                          fontWeight: 800,
                        }}
                      >
                        #{task.id}
                      </td>

                      <td
                        style={{
                          padding: "16px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        #{task.order_id}
                      </td>

                      <td style={{ padding: "16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span>
                            {getTaskTypeIcon(
                              task.task_type,
                            )}
                          </span>
                          {getTaskTypeLabel(
                            task.task_type,
                          )}
                        </div>

                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          {task.channel}
                        </div>
                      </td>

                      <td style={{ padding: "16px" }}>
                        <div
                          style={{
                            maxWidth: "260px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={task.recipient ?? ""}
                        >
                          {task.recipient || "未设置"}
                        </div>

                        {task.subject && (
                          <div
                            style={{
                              color: "#64748b",
                              fontSize: "12px",
                              marginTop: "4px",
                              maxWidth: "260px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={task.subject}
                          >
                            {task.subject}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "16px" }}>
                        <span
                          style={{
                            ...getStatusStyle(
                              task.status,
                            ),
                            display: "inline-flex",
                            padding: "5px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getStatusLabel(task.status)}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "16px",
                          color: "#475569",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(task.scheduled_at)}
                      </td>

                      <td
                        style={{
                          padding: "16px",
                          whiteSpace: "nowrap",
                          ...getCountdownStyle(task, now),
                        }}
                      >
                        {getCountdownLabel(task, now)}
                      </td>

                      <td
                        style={{
                          padding: "16px",
                          color: "#475569",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(task.sent_at)}
                      </td>

                      <td
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          fontWeight: 700,
                        }}
                      >
                        {task.attempts}
                      </td>

                      <td
                        style={{
                          padding: "16px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTaskId(task.id)
                          }
                          style={{
                            border:
                              "1px solid #cbd5e1",
                            borderRadius: "10px",
                            background: "#ffffff",
                            color: "#0f172a",
                            padding: "8px 12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "16px",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            fontSize: "14px",
          }}
        >
          🤖 自动化状态：系统每 15 分钟检查一次待发送任务；
          此页面每 60 秒自动刷新一次状态。
        </div>
      </div>

      {selectedTask && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="售后任务详情"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTaskId(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.62)",
            display: "flex",
            justifyContent: "flex-end",
            backdropFilter: "blur(3px)",
          }}
        >
          <div
            style={{
              width: "min(680px, 100%)",
              height: "100%",
              background: "#ffffff",
              boxShadow:
                "-20px 0 60px rgba(15, 23, 42, 0.22)",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                padding: "22px 24px",
                background: "#0f172a",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#facc15",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                  }}
                >
                  FOLLOW-UP TASK
                </div>

                <h2
                  style={{
                    margin: "6px 0 0",
                    fontSize: "24px",
                  }}
                >
                  {getTaskTypeIcon(
                    selectedTask.task_type,
                  )}{" "}
                  {getTaskTypeLabel(
                    selectedTask.task_type,
                  )}
                </h2>

                <div
                  style={{
                    marginTop: "8px",
                    color: "#cbd5e1",
                    fontSize: "13px",
                  }}
                >
                  任务 #{selectedTask.id} · 订单 #
                  {selectedTask.order_id}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                aria-label="关闭详情"
                style={{
                  width: "38px",
                  height: "38px",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  background: "#1e293b",
                  color: "#ffffff",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    ...getStatusStyle(
                      selectedTask.status,
                    ),
                    display: "inline-flex",
                    padding: "7px 12px",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {getStatusLabel(selectedTask.status)}
                </span>

                <div
                  style={{
                    ...getCountdownStyle(
                      selectedTask,
                      now,
                    ),
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  {getCountdownLabel(selectedTask, now)}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "12px",
                  marginBottom: "22px",
                }}
              >
                <DetailItem
                  label="任务编号"
                  value={`#${selectedTask.id}`}
                />
                <DetailItem
                  label="订单编号"
                  value={`#${selectedTask.order_id}`}
                />
                <DetailItem
                  label="会员编号"
                  value={
                    selectedTask.member_id === null
                      ? "—"
                      : `#${selectedTask.member_id}`
                  }
                />
                <DetailItem
                  label="发送渠道"
                  value={selectedTask.channel}
                />
                <DetailItem
                  label="计划发送"
                  value={formatDate(
                    selectedTask.scheduled_at,
                  )}
                />
                <DetailItem
                  label="实际发送"
                  value={formatDate(
                    selectedTask.sent_at,
                  )}
                />
                <DetailItem
                  label="尝试次数"
                  value={selectedTask.attempts}
                />
                <DetailItem
                  label="创建时间"
                  value={formatDate(
                    selectedTask.created_at,
                  )}
                />
                <DetailItem
                  label="最后更新"
                  value={formatDate(
                    selectedTask.updated_at,
                  )}
                />
              </div>

              <section
                style={{
                  marginBottom: "18px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderBottom:
                      "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <strong style={{ fontSize: "14px" }}>
                    收件人
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        "recipient",
                        selectedTask.recipient,
                      )
                    }
                    disabled={!selectedTask.recipient}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#2563eb",
                      fontWeight: 700,
                      cursor: selectedTask.recipient
                        ? "pointer"
                        : "not-allowed",
                    }}
                  >
                    {copiedField === "recipient"
                      ? "已复制"
                      : "复制邮箱"}
                  </button>
                </div>

                <div
                  style={{
                    padding: "16px",
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedTask.recipient || "未设置"}
                </div>
              </section>

              <section
                style={{
                  marginBottom: "18px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderBottom:
                      "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <strong style={{ fontSize: "14px" }}>
                    邮件主题
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        "subject",
                        selectedTask.subject,
                      )
                    }
                    disabled={!selectedTask.subject}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#2563eb",
                      fontWeight: 700,
                      cursor: selectedTask.subject
                        ? "pointer"
                        : "not-allowed",
                    }}
                  >
                    {copiedField === "subject"
                      ? "已复制"
                      : "复制主题"}
                  </button>
                </div>

                <div
                  style={{
                    padding: "16px",
                    fontWeight: 700,
                    lineHeight: 1.7,
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedTask.subject ||
                    `发送时自动生成：${getTaskTypeLabel(
                      selectedTask.task_type,
                    )}`}
                </div>
              </section>

              <section
                style={{
                  marginBottom: "18px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderBottom:
                      "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <strong style={{ fontSize: "14px" }}>
                    邮件内容
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        "message",
                        selectedTask.message,
                      )
                    }
                    disabled={!selectedTask.message}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#2563eb",
                      fontWeight: 700,
                      cursor: selectedTask.message
                        ? "pointer"
                        : "not-allowed",
                    }}
                  >
                    {copiedField === "message"
                      ? "已复制"
                      : "复制内容"}
                  </button>
                </div>

                <div
                  style={{
                    padding: "16px",
                    color: "#334155",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedTask.message ||
                    "系统将在任务到期后，根据客户与订单资料自动生成正式邮件内容。"}
                </div>
              </section>

              <section
                style={{
                  marginBottom: "18px",
                  border: selectedTask.last_error
                    ? "1px solid #fecaca"
                    : "1px solid #e2e8f0",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: selectedTask.last_error
                      ? "#fef2f2"
                      : "#f8fafc",
                    borderBottom: selectedTask.last_error
                      ? "1px solid #fecaca"
                      : "1px solid #e2e8f0",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "14px",
                      color: selectedTask.last_error
                        ? "#991b1b"
                        : "#0f172a",
                    }}
                  >
                    失败原因 / 系统错误
                  </strong>
                </div>

                <div
                  style={{
                    padding: "16px",
                    color: selectedTask.last_error
                      ? "#b91c1c"
                      : "#64748b",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedTask.last_error ||
                    "没有错误记录"}
                </div>
              </section>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "14px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1e40af",
                  fontSize: "13px",
                  lineHeight: 1.7,
                }}
              >
                系统会根据计划发送时间自动处理此任务。
                待发送任务到期后，最长约 15
                分钟内会被定时任务检查并处理。
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "22px",
                }}
              >
                {selectedTask.status === "failed" && (
                  <button
                    type="button"
                    onClick={() =>
                      void retryFailedTask(selectedTask)
                    }
                    disabled={
                      retryingTaskId === selectedTask.id
                    }
                    style={{
                      border: "none",
                      borderRadius: "12px",
                      padding: "11px 18px",
                      background:
                        retryingTaskId === selectedTask.id
                          ? "#fca5a5"
                          : "#dc2626",
                      color: "#ffffff",
                      fontWeight: 800,
                      cursor:
                        retryingTaskId === selectedTask.id
                          ? "not-allowed"
                          : "pointer",
                      boxShadow:
                        "0 8px 18px rgba(220, 38, 38, 0.2)",
                    }}
                  >
                    {retryingTaskId === selectedTask.id
                      ? "正在重试..."
                      : "↻ 立即重试发送"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setSelectedTaskId(null)
                  }
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    borderRadius: "12px",
                    padding: "11px 18px",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  关闭详情
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}