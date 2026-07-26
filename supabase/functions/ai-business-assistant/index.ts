// Supabase Edge Function: AI Business Assistant
// Reads business data on the server, aggregates it, then sends only a
// privacy-conscious business snapshot to the OpenAI Responses API.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseContext } from "@supabase/server";

type JsonRecord = Record<string, unknown>;

type AssistantRequest = {
  question?: string;
  language?: "zh-CN" | "en";
};

type RiskLevel = "low" | "medium" | "high";

type ProposedAction = {
  action_type:
    | "review_low_stock"
    | "review_pending_appointments"
    | "review_cash_flow"
    | "review_profitability"
    | "review_service_performance"
    | "review_data_quality";
  target_type:
    | "inventory"
    | "appointments"
    | "finance"
    | "services"
    | "system";
  target_id: string;
  title: string;
  description: string;
  risk_level: RiskLevel;
  payload: {
    metric_name: string;
    metric_value: number;
    related_count: number;
    reference_period: string;
    recommended_next_step: string;
  };
};

type AssistantStructuredOutput = {
  answer: string;
  actions: ProposedAction[];
};

type SavedActionRequest = {
  id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  title: string;
  description: string | null;
  risk_level: RiskLevel;
  status: string;
  created_at: string;
};

type ReadResult = {
  rows: JsonRecord[];
  warning?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function toNumber(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstValue(row: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function firstNumber(row: JsonRecord, keys: string[]): number {
  return toNumber(firstValue(row, keys));
}

function firstText(row: JsonRecord, keys: string[]): string {
  return toText(firstValue(row, keys));
}

function getDateKey(value: unknown, timeZone: string): string {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function rowDateKey(
  row: JsonRecord,
  candidates: string[],
  timeZone: string,
): string {
  return getDateKey(firstValue(row, candidates), timeZone);
}

function isRevenueOrder(row: JsonRecord): boolean {
  const status = firstText(row, ["status"]).toLowerCase();
  const paymentStatus = firstText(row, ["payment_status"]).toLowerCase();

  return (
    status !== "cancelled" &&
    status !== "void" &&
    paymentStatus !== "refunded" &&
    paymentStatus !== "unpaid" &&
    paymentStatus !== "void"
  );
}

function isCountableRefund(row: JsonRecord): boolean {
  const status = firstText(row, ["status"]).toLowerCase();
  return !["failed", "cancelled", "pending", "processing"].includes(status);
}

function isCountableExpense(row: JsonRecord): boolean {
  const status = firstText(row, ["status"]).toLowerCase();
  return !["cancelled", "rejected", "void"].includes(status);
}

function sumRows(rows: JsonRecord[], fields: string[]): number {
  return rows.reduce((sum, row) => sum + firstNumber(row, fields), 0);
}

function sumKnownField(rows: JsonRecord[], fields: string[]): number | null {
  const hasKnownField = rows.some((row) =>
    fields.some(
      (field) =>
        row[field] !== undefined && row[field] !== null && row[field] !== "",
    )
  );

  return hasKnownField ? sumRows(rows, fields) : null;
}

function roundMoney(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 100) / 100;
}

function expenseAmount(row: JsonRecord): number {
  const direct = firstValue(row, [
    "total_amount",
    "amount",
    "expense_amount",
    "total",
  ]);

  if (direct !== null) {
    return toNumber(direct);
  }

  return (
    firstNumber(row, ["subtotal"]) +
    firstNumber(row, ["tax_amount", "tax"])
  );
}

function sumExpenses(rows: JsonRecord[]): number {
  return rows.reduce((sum, row) => sum + expenseAmount(row), 0);
}

function isPaidExpense(row: JsonRecord): boolean {
  const status = firstText(row, ["status"]).toLowerCase();
  const paymentStatus = firstText(row, ["payment_status"]).toLowerCase();

  if (["cancelled", "rejected", "void"].includes(status)) {
    return false;
  }

  if (["cancelled", "rejected", "void", "pending", "unpaid"].includes(paymentStatus)) {
    return false;
  }

  return paymentStatus === "" || ["paid", "completed"].includes(paymentStatus);
}

function isPendingExpense(row: JsonRecord): boolean {
  const status = firstText(row, ["status"]).toLowerCase();
  const paymentStatus = firstText(row, ["payment_status"]).toLowerCase();

  return (
    !["cancelled", "rejected", "void"].includes(status) &&
    ["pending", "unpaid"].includes(paymentStatus)
  );
}

function moneyText(value: unknown, currency: string): string {
  return `${currency} ${toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function buildCashClosingSnapshot(
  rows: JsonRecord[],
  todayKey: string,
  monthKey: string,
) {
  const validRows = rows
    .filter((row) => Boolean(firstText(row, ["closing_date"])))
    .sort((a, b) =>
      firstText(b, ["closing_date"]).localeCompare(
        firstText(a, ["closing_date"]),
      ),
    );

  const todayClosing = validRows.find(
    (row) => firstText(row, ["closing_date"]) === todayKey,
  );
  const latestClosing = validRows[0];
  const monthClosings = validRows.filter((row) =>
    firstText(row, ["closing_date"]).startsWith(monthKey),
  );

  const monthDifferenceTotal = monthClosings.reduce(
    (sum, row) => sum + firstNumber(row, ["difference"]),
    0,
  );
  const unbalancedCount = monthClosings.filter(
    (row) => Math.abs(firstNumber(row, ["difference"])) > 0.01,
  ).length;

  return {
    todayStatus: todayClosing
      ? firstText(todayClosing, ["status"]) || "closed"
      : "open",
    todayExpectedCash: roundMoney(
      todayClosing ? firstNumber(todayClosing, ["expected_cash"]) : 0,
    ),
    todayActualCash: roundMoney(
      todayClosing ? firstNumber(todayClosing, ["actual_cash"]) : 0,
    ),
    todayDifference: roundMoney(
      todayClosing ? firstNumber(todayClosing, ["difference"]) : 0,
    ),
    latestClosingDate: latestClosing
      ? firstText(latestClosing, ["closing_date"])
      : null,
    latestStatus: latestClosing
      ? firstText(latestClosing, ["status"]) || "closed"
      : null,
    latestDifference: roundMoney(
      latestClosing ? firstNumber(latestClosing, ["difference"]) : 0,
    ),
    monthClosingCount: monthClosings.length,
    monthDifferenceTotal: roundMoney(monthDifferenceTotal),
    unbalancedCount,
  };
}

function buildRuleBasedAnalysis(
  snapshot: JsonRecord,
  question: string,
  language: "zh-CN" | "en",
): AssistantStructuredOutput {
  const today = (snapshot.today ?? {}) as JsonRecord;
  const month = (snapshot.month ?? {}) as JsonRecord;
  const appointments = (snapshot.appointments ?? {}) as JsonRecord;
  const inventory = (snapshot.inventory ?? {}) as JsonRecord;
  const cashClosing = (snapshot.cashClosing ?? {}) as JsonRecord;
  const currency = firstText(snapshot, ["accountingCurrency"]) || "USD";

  const todayRevenue = firstNumber(today, ["revenue"]);
  const todayRefunds = firstNumber(today, ["refundAmount"]);
  const todayExpenses = firstNumber(today, ["expenseAmount"]);
  const todayNet = todayRevenue - todayRefunds - todayExpenses;
  const monthRevenue = firstNumber(month, ["revenue"]);
  const monthRefunds = firstNumber(month, ["refundAmount"]);
  const monthExpenses = firstNumber(month, ["expenseAmount"]);
  const monthNetCash = firstNumber(month, ["netCashAfterRefundsAndExpenses"]);
  const grossProfitValue = firstValue(month, ["grossProfit"]);
  const netProfitValue = firstValue(month, ["netProfit"]);
  const lowStockCount = firstNumber(inventory, ["lowStockCount"]);
  const pendingAppointments = firstNumber(appointments, ["pendingCount"]);
  const todayClosingStatus = firstText(cashClosing, ["todayStatus"]) || "open";
  const todayDifference = firstNumber(cashClosing, ["todayDifference"]);
  const unbalancedCount = firstNumber(cashClosing, ["unbalancedCount"]);
  const pendingExpenseCount = firstNumber(month, ["pendingExpenseCount"]);
  const pendingExpenseAmount = firstNumber(month, ["pendingExpenseAmount"]);
  const topItems = Array.isArray(snapshot.topItemsThisMonth)
    ? (snapshot.topItemsThisMonth as JsonRecord[])
    : [];
  const warnings = Array.isArray(snapshot.dataWarnings)
    ? (snapshot.dataWarnings as unknown[]).map(String)
    : [];

  const actions: ProposedAction[] = [];

  if (todayClosingStatus === "open" || Math.abs(todayDifference) > 0.01) {
    actions.push({
      action_type: "review_cash_flow",
      target_type: "finance",
      target_id: `cash-closing-${firstText(today, ["date"]) || "today"}`,
      title:
        todayClosingStatus === "open"
          ? "完成今天的现金关账"
          : "复核现金关账差额",
      description:
        todayClosingStatus === "open"
          ? "今天尚未找到已保存的现金关账记录。"
          : `今天现金差额为 ${moneyText(todayDifference, currency)}。`,
      risk_level: Math.abs(todayDifference) > 0.01 ? "high" : "medium",
      payload: {
        metric_name: "cash_closing_difference",
        metric_value: todayDifference,
        related_count: 1,
        reference_period: firstText(today, ["date"]) || "today",
        recommended_next_step:
          "核对现金销售、现金退款、现金费用、备用金与实际清点金额。",
      },
    });
  }

  if (lowStockCount > 0) {
    actions.push({
      action_type: "review_low_stock",
      target_type: "inventory",
      target_id: "low-stock-products",
      title: `处理 ${Math.round(lowStockCount)} 个低库存产品`,
      description: "库存已达到或低于最低库存线，可能影响施工或产品销售。",
      risk_level: lowStockCount >= 3 ? "high" : "medium",
      payload: {
        metric_name: "low_stock_count",
        metric_value: lowStockCount,
        related_count: Math.round(lowStockCount),
        reference_period: "current",
        recommended_next_step: "打开产品库存，确认补货数量与采购优先级。",
      },
    });
  }

  if (pendingAppointments > 0) {
    actions.push({
      action_type: "review_pending_appointments",
      target_type: "appointments",
      target_id: "pending-appointments",
      title: `确认 ${Math.round(pendingAppointments)} 个待处理预约`,
      description: "待确认预约需要尽快联系客户，避免流失。",
      risk_level: pendingAppointments >= 5 ? "high" : "medium",
      payload: {
        metric_name: "pending_appointment_count",
        metric_value: pendingAppointments,
        related_count: Math.round(pendingAppointments),
        reference_period: "current",
        recommended_next_step: "打开预约管理，确认日期、时间、车型和服务项目。",
      },
    });
  }

  if (monthNetCash < 0 || (netProfitValue !== null && toNumber(netProfitValue) < 0)) {
    actions.push({
      action_type: "review_profitability",
      target_type: "finance",
      target_id: `profitability-${firstText(month, ["month"]) || "month"}`,
      title: "检查本月现金流与利润",
      description: `本月净现金为 ${moneyText(monthNetCash, currency)}。`,
      risk_level: "high",
      payload: {
        metric_name: "month_net_cash",
        metric_value: monthNetCash,
        related_count: 1,
        reference_period: firstText(month, ["month"]) || "current_month",
        recommended_next_step: "检查退款、费用、低毛利项目及未录入成本。",
      },
    });
  }

  if (warnings.length > 0) {
    actions.push({
      action_type: "review_data_quality",
      target_type: "system",
      target_id: "data-warning",
      title: "检查经营数据读取警告",
      description: warnings.slice(0, 3).join("；"),
      risk_level: "medium",
      payload: {
        metric_name: "data_warning_count",
        metric_value: warnings.length,
        related_count: warnings.length,
        reference_period: "current_request",
        recommended_next_step: "检查相关数据库表、字段和权限设置。",
      },
    });
  }

  const selectedActions = actions
    .sort((a, b) => {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.risk_level] - weight[a.risk_level];
    })
    .slice(0, 3);

  const topItemText = topItems.length
    ? topItems
        .slice(0, 3)
        .map((item, index) =>
          `${index + 1}. ${firstText(item, ["name"]) || "未命名项目"}（数量 ${firstNumber(item, ["quantity"]) || 0}，收入 ${moneyText(firstNumber(item, ["revenue"]), currency)}）`,
        )
        .join("\n")
    : "暂无足够的本月热销项目数据。";

  if (language === "en") {
    return {
      answer: [
        "Local fallback analysis is active because the external AI service is unavailable.",
        "",
        `Question: ${question}`,
        "",
        "Today",
        `Revenue: ${moneyText(todayRevenue, currency)}`,
        `Refunds: ${moneyText(todayRefunds, currency)}`,
        `Paid expenses: ${moneyText(todayExpenses, currency)}`,
        `Net cash movement: ${moneyText(todayNet, currency)}`,
        "",
        "This month",
        `Revenue: ${moneyText(monthRevenue, currency)}`,
        `Refunds: ${moneyText(monthRefunds, currency)}`,
        `Paid expenses: ${moneyText(monthExpenses, currency)}`,
        `Net cash: ${moneyText(monthNetCash, currency)}`,
        grossProfitValue === null
          ? "Gross profit: unavailable"
          : `Gross profit: ${moneyText(grossProfitValue, currency)}`,
        netProfitValue === null
          ? "Net profit: unavailable"
          : `Net profit: ${moneyText(netProfitValue, currency)}`,
        "",
        `Pending appointments: ${Math.round(pendingAppointments)}`,
        `Low-stock products: ${Math.round(lowStockCount)}`,
        `Pending expenses: ${Math.round(pendingExpenseCount)} / ${moneyText(pendingExpenseAmount, currency)}`,
        `Cash closing status today: ${todayClosingStatus}; difference ${moneyText(todayDifference, currency)}`,
        `Unbalanced closings this month: ${Math.round(unbalancedCount)}`,
      ].join("\n"),
      actions: selectedActions,
    };
  }

  const actionLines = selectedActions.length
    ? selectedActions
        .map(
          (action, index) =>
            `${index + 1}. ${action.title}：${action.payload.recommended_next_step}`,
        )
        .join("\n")
    : "1. 当前没有发现必须立即处理的高风险事项，继续保持每日记账与关账。";

  return {
    answer: [
      "当前已自动切换到本地智能分析模式。即使 OpenAI API 额度暂时不可用，系统仍会根据数据库实时数据给出经营总结。",
      "",
      `你的问题：${question}`,
      "",
      "【今日经营】",
      `营业额：${moneyText(todayRevenue, currency)}（${Math.round(firstNumber(today, ["orderCount"]))} 笔订单）`,
      `退款：${moneyText(todayRefunds, currency)}（${Math.round(firstNumber(today, ["refundCount"]))} 笔）`,
      `已付费用：${moneyText(todayExpenses, currency)}（${Math.round(firstNumber(today, ["expenseCount"]))} 笔）`,
      `今日净现金变动：${moneyText(todayNet, currency)}`,
      "",
      "【本月经营】",
      `营业额：${moneyText(monthRevenue, currency)}`,
      `退款：${moneyText(monthRefunds, currency)}`,
      `已付费用：${moneyText(monthExpenses, currency)}`,
      `净现金：${moneyText(monthNetCash, currency)}`,
      grossProfitValue === null
        ? "毛利润：利润流水暂时没有可用数据"
        : `毛利润：${moneyText(grossProfitValue, currency)}`,
      netProfitValue === null
        ? "最终净利润：暂时没有可用数据"
        : `最终净利润：${moneyText(netProfitValue, currency)}`,
      `待付款费用：${Math.round(pendingExpenseCount)} 笔，共 ${moneyText(pendingExpenseAmount, currency)}`,
      "",
      "【运营检查】",
      `待确认预约：${Math.round(pendingAppointments)} 个`,
      `低库存产品：${Math.round(lowStockCount)} 个`,
      `今日现金关账：${todayClosingStatus === "open" ? "尚未关账" : "已保存"}，差额 ${moneyText(todayDifference, currency)}`,
      `本月存在差额的关账：${Math.round(unbalancedCount)} 天`,
      "",
      "【本月热销项目】",
      topItemText,
      "",
      "【最优先行动】",
      actionLines,
    ].join("\n"),
    actions: selectedActions,
  };
}

function getOpenAIErrorMessage(payload: JsonRecord): string {
  const errorRecord =
    payload.error && typeof payload.error === "object"
      ? (payload.error as JsonRecord)
      : {};
  const message =
    firstText(errorRecord, ["message"]) || "OpenAI 请求失败";
  const code = firstText(errorRecord, ["code", "type"]).toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (
    code.includes("insufficient_quota") ||
    normalizedMessage.includes("exceeded your current quota") ||
    normalizedMessage.includes("billing quota")
  ) {
    return "OpenAI API 额度已用完或尚未启用 API 计费，已自动切换到本地智能分析。";
  }

  if (
    code.includes("rate_limit") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "OpenAI API 当前请求过于频繁，已自动切换到本地智能分析。";
  }

  return `${message}；已自动切换到本地智能分析。`;
}

function extractOpenAIText(payload: JsonRecord): string {
  if (typeof payload.output_text === "string") {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const textParts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    const content = Array.isArray((item as JsonRecord).content)
      ? ((item as JsonRecord).content as unknown[])
      : [];

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;

      const contentRecord = contentItem as JsonRecord;

      if (
        contentRecord.type === "output_text" &&
        typeof contentRecord.text === "string"
      ) {
        textParts.push(contentRecord.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

function parseStructuredOutput(value: string): AssistantStructuredOutput | null {
  try {
    const parsed = JSON.parse(value) as Partial<AssistantStructuredOutput>;

    if (typeof parsed.answer !== "string" || !Array.isArray(parsed.actions)) {
      return null;
    }

    const allowedActionTypes = new Set<ProposedAction["action_type"]>([
      "review_low_stock",
      "review_pending_appointments",
      "review_cash_flow",
      "review_profitability",
      "review_service_performance",
      "review_data_quality",
    ]);

    const allowedTargetTypes = new Set<ProposedAction["target_type"]>([
      "inventory",
      "appointments",
      "finance",
      "services",
      "system",
    ]);

    const allowedRiskLevels = new Set<RiskLevel>(["low", "medium", "high"]);

    const actions = parsed.actions
      .filter((item): item is ProposedAction => {
        if (!item || typeof item !== "object") return false;

        return (
          allowedActionTypes.has(item.action_type) &&
          allowedTargetTypes.has(item.target_type) &&
          allowedRiskLevels.has(item.risk_level) &&
          typeof item.target_id === "string" &&
          typeof item.title === "string" &&
          typeof item.description === "string" &&
          item.payload !== null &&
          typeof item.payload === "object" &&
          typeof item.payload.metric_name === "string" &&
          Number.isFinite(Number(item.payload.metric_value)) &&
          Number.isFinite(Number(item.payload.related_count)) &&
          typeof item.payload.reference_period === "string" &&
          typeof item.payload.recommended_next_step === "string"
        );
      })
      .slice(0, 3)
      .map((item) => ({
        ...item,
        target_id: item.target_id.trim().slice(0, 160),
        title: item.title.trim().slice(0, 180),
        description: item.description.trim().slice(0, 1200),
        payload: {
          metric_name: item.payload.metric_name.trim().slice(0, 120),
          metric_value: toNumber(item.payload.metric_value),
          related_count: Math.max(0, Math.round(toNumber(item.payload.related_count))),
          reference_period: item.payload.reference_period.trim().slice(0, 80),
          recommended_next_step: item.payload.recommended_next_step
            .trim()
            .slice(0, 500),
        },
      }));

    return {
      answer: parsed.answer.trim(),
      actions,
    };
  } catch {
    return null;
  }
}

function actionDeduplicationKey(action: {
  action_type: string;
  target_type?: string | null;
  target_id?: string | null;
  title?: string | null;
}): string {
  return [
    action.action_type,
    action.target_type ?? "",
    action.target_id ?? "",
    action.title ?? "",
  ]
    .map((part) => part.trim().toLowerCase())
    .join("|");
}

async function savePendingActions(
  supabaseAdmin: any,
  actions: ProposedAction[],
  options: {
    question: string;
    model: string;
    createdBy: string | null;
  },
): Promise<{ actions: SavedActionRequest[]; warnings: string[] }> {
  if (actions.length === 0) {
    return { actions: [], warnings: [] };
  }

  const warnings: string[] = [];
  const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("ai_action_requests")
    .select(
      "id,action_type,target_type,target_id,title,status,created_at",
    )
    .in("status", ["pending", "approved", "executing"])
    .gte("created_at", recentCutoff);

  if (existingError) {
    warnings.push(`读取现有 AI 操作申请失败：${existingError.message}`);
  }

  const existingKeys = new Set(
    (Array.isArray(existingRows) ? existingRows : []).map(
      (row: JsonRecord) =>
        actionDeduplicationKey({
          action_type: firstText(row, ["action_type"]),
          target_type: firstText(row, ["target_type"]),
          target_id: firstText(row, ["target_id"]),
          title: firstText(row, ["title"]),
        }),
    ),
  );

  const newRows = actions
    .filter((action) => !existingKeys.has(actionDeduplicationKey(action)))
    .map((action) => ({
      action_type: action.action_type,
      target_type: action.target_type,
      target_id: action.target_id || null,
      title: action.title,
      description: action.description,
      risk_level: action.risk_level,
      status: "pending",
      payload: action.payload,
      source_question: options.question,
      ai_model: options.model,
      created_by: options.createdBy,
    }));

  if (newRows.length === 0) {
    return { actions: [], warnings };
  }

  const { data: insertedRows, error: insertError } = await supabaseAdmin
    .from("ai_action_requests")
    .insert(newRows)
    .select(
      "id,action_type,target_type,target_id,title,description,risk_level,status,created_at",
    );

  if (insertError) {
    warnings.push(`保存 AI 操作申请失败：${insertError.message}`);
    return { actions: [], warnings };
  }

  const savedActions = (Array.isArray(insertedRows)
    ? insertedRows
    : []) as SavedActionRequest[];

  if (savedActions.length > 0) {
    const logRows = savedActions.map((action) => ({
      action_request_id: action.id,
      event_type: "created",
      actor_user_id: options.createdBy,
      event_data: {
        source: "ai-business-assistant",
        action_type: action.action_type,
        risk_level: action.risk_level,
      },
    }));

    const { error: logError } = await supabaseAdmin
      .from("ai_action_logs")
      .insert(logRows);

    if (logError) {
      warnings.push(`保存 AI 操作日志失败：${logError.message}`);
    }
  }

  return { actions: savedActions, warnings };
}

async function safeReadAll(
  supabaseAdmin: any,
  source: string,
  limit = 1200,
): Promise<ReadResult> {
  try {
    const { data, error } = await supabaseAdmin
      .from(source)
      .select("*")
      .limit(limit);

    if (error) {
      return {
        rows: [],
        warning: `${source}: ${error.message}`,
      };
    }

    return {
      rows: Array.isArray(data) ? (data as JsonRecord[]) : [],
    };
  } catch (error) {
    return {
      rows: [],
      warning: `${source}: ${
        error instanceof Error ? error.message : "读取失败"
      }`,
    };
  }
}

function buildTopItems(
  rows: JsonRecord[],
  monthKey: string,
  timeZone: string,
) {
  const grouped = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();

  for (const row of rows) {
    const dateKey = rowDateKey(
      row,
      ["created_at", "order_date", "transaction_date"],
      timeZone,
    );

    if (!dateKey.startsWith(monthKey)) continue;

    const name =
      firstText(row, ["item_name", "name", "service_name", "product_name"]) ||
      "未命名项目";

    const quantity = Math.max(1, firstNumber(row, ["quantity", "qty"]));
    const revenue =
      firstNumber(row, ["line_total", "total", "subtotal"]) ||
      firstNumber(row, ["unit_price", "price"]) * quantity;

    const current = grouped.get(name) ?? {
      name,
      quantity: 0,
      revenue: 0,
    };

    current.quantity += quantity;
    current.revenue += revenue;
    grouped.set(name, current);
  }

  return [...grouped.values()]
    .sort(
      (first, second) =>
        second.quantity - first.quantity || second.revenue - first.revenue,
    )
    .slice(0, 5)
    .map((item) => ({
      name: item.name,
      quantity: item.quantity,
      revenue: roundMoney(item.revenue),
    }));
}

function buildLowStock(rows: JsonRecord[]) {
  return rows
    .map((row) => {
      const stock = firstNumber(row, [
        "stock_qty",
        "stock_quantity",
        "quantity",
        "stock",
      ]);

      const minimum = firstNumber(row, [
        "min_stock",
        "minimum_stock",
        "reorder_level",
      ]);

      return {
        name:
          firstText(row, ["product_name", "name", "title"]) || "未命名产品",
        stock,
        minimum,
      };
    })
    .filter((item) => item.minimum > 0 && item.stock <= item.minimum)
    .sort((first, second) => first.stock - second.stock)
    .slice(0, 10);
}

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "只支持 POST 请求" }, 405);
    }

    const { data: ctx, error: authError } = await createSupabaseContext(req, {
      auth: "user",
    });

    if (authError || !ctx) {
      return jsonResponse(
        {
          error: "请先登录后再使用 AI 经营助手",
          details: authError?.message,
        },
        authError?.status ?? 401,
      );
    }

    let requestBody: AssistantRequest = {};

    try {
      requestBody = await req.json();
    } catch {
      requestBody = {};
    }

    const question =
      requestBody.question?.trim().slice(0, 2000) ||
      "请生成今天的经营总结，并列出最重要的三个待处理事项。";

    const language = requestBody.language === "en" ? "en" : "zh-CN";
    const openAIKey = Deno.env.get("OPENAI_API_KEY");

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";
    const timeZone = Deno.env.get("BUSINESS_TIME_ZONE") || "Asia/Yangon";

    const [
      ordersResult,
      orderItemsResult,
      refundsResult,
      expensesResult,
      productsResult,
      appointmentsResult,
      profitLedgerResult,
      settingsResult,
      dailyCashClosingsResult,
    ] = await Promise.all([
      safeReadAll(ctx.supabaseAdmin, "orders"),
      safeReadAll(ctx.supabaseAdmin, "order_items"),
      safeReadAll(ctx.supabaseAdmin, "refunds"),
      safeReadAll(ctx.supabaseAdmin, "expenses"),
      safeReadAll(ctx.supabaseAdmin, "products"),
      safeReadAll(ctx.supabaseAdmin, "appointments"),
      safeReadAll(ctx.supabaseAdmin, "report_profit_ledger"),
      safeReadAll(ctx.supabaseAdmin, "business_settings", 10),
      safeReadAll(ctx.supabaseAdmin, "daily_cash_closings", 500),
    ]);

    const warnings = [
      ordersResult.warning,
      orderItemsResult.warning,
      refundsResult.warning,
      expensesResult.warning,
      productsResult.warning,
      appointmentsResult.warning,
      profitLedgerResult.warning,
      settingsResult.warning,
      dailyCashClosingsResult.warning,
    ].filter((warning): warning is string => Boolean(warning));

    const now = new Date();
    const todayKey = getDateKey(now, timeZone);
    const monthKey = todayKey.slice(0, 7);

    const revenueOrders = ordersResult.rows.filter(isRevenueOrder);

    const todayOrders = revenueOrders.filter(
      (row) =>
        rowDateKey(row, ["created_at", "order_date"], timeZone) === todayKey,
    );

    const monthOrders = revenueOrders.filter((row) =>
      rowDateKey(row, ["created_at", "order_date"], timeZone).startsWith(
        monthKey,
      )
    );

    const completedRefunds = refundsResult.rows.filter(isCountableRefund);

    const todayRefunds = completedRefunds.filter(
      (row) =>
        rowDateKey(row, ["created_at", "refund_date"], timeZone) === todayKey,
    );

    const monthRefunds = completedRefunds.filter((row) =>
      rowDateKey(row, ["created_at", "refund_date"], timeZone).startsWith(
        monthKey,
      )
    );

    const paidExpenses = expensesResult.rows.filter(isPaidExpense);
    const pendingExpenses = expensesResult.rows.filter(isPendingExpense);

    const todayExpenses = paidExpenses.filter(
      (row) =>
        rowDateKey(
          row,
          ["paid_date", "expense_date", "created_at"],
          timeZone,
        ) === todayKey,
    );

    const monthExpenses = paidExpenses.filter((row) =>
      rowDateKey(
        row,
        ["paid_date", "expense_date", "created_at"],
        timeZone,
      ).startsWith(monthKey)
    );

    const monthPendingExpenses = pendingExpenses.filter((row) =>
      rowDateKey(row, ["expense_date", "created_at"], timeZone).startsWith(
        monthKey,
      )
    );

    const todayAppointments = appointmentsResult.rows.filter(
      (row) =>
        rowDateKey(row, ["appointment_date", "created_at"], timeZone) ===
        todayKey,
    );

    const pendingAppointments = appointmentsResult.rows.filter((row) => {
      const status = firstText(row, ["status"]).toLowerCase();
      return ["", "pending"].includes(status);
    });

    const monthLedger = profitLedgerResult.rows.filter((row) =>
      rowDateKey(
        row,
        [
          "transaction_at",
          "transaction_date",
          "entry_date",
          "date",
          "created_at",
        ],
        timeZone,
      ).startsWith(monthKey)
    );

    const monthRevenue = sumRows(monthOrders, [
      "total",
      "grand_total",
      "net_total",
    ]);

    const monthRefundAmount = sumRows(monthRefunds, [
      "refund_amount",
      "amount",
      "total",
    ]);

    const monthExpenseAmount = sumExpenses(monthExpenses);
    const monthPendingExpenseAmount = sumExpenses(monthPendingExpenses);

    const ledgerRevenue = sumKnownField(monthLedger, [
      "revenue",
      "net_revenue",
      "sales_amount",
    ]);

    const ledgerCogs = sumKnownField(monthLedger, [
      "cost",
      "net_cogs",
      "cogs",
      "cost_amount",
      "cost_total",
    ]);

    const ledgerGrossProfit = sumKnownField(monthLedger, [
      "profit",
      "gross_profit",
    ]);
    const storedLedgerNetProfit = sumKnownField(monthLedger, ["net_profit"]);
    const ledgerNetProfit =
      storedLedgerNetProfit ??
      (ledgerGrossProfit === null
        ? null
        : ledgerGrossProfit - monthExpenseAmount);

    const settings = settingsResult.rows[0] ?? {};
    const accountingCurrency =
      firstText(settings, ["accounting_currency"]) || "USD";
    const displayCurrency =
      firstText(settings, ["display_currency"]) || accountingCurrency;

    const lowStockProducts = buildLowStock(productsResult.rows);
    const cashClosing = buildCashClosingSnapshot(
      dailyCashClosingsResult.rows,
      todayKey,
      monthKey,
    );

    const snapshot = {
      generatedAt: now.toISOString(),
      businessTimeZone: timeZone,
      accountingCurrency,
      displayCurrency,
      note: "所有金额均为数据库账本金额，除非字段另有说明。",
      today: {
        date: todayKey,
        orderCount: todayOrders.length,
        revenue: roundMoney(
          sumRows(todayOrders, ["total", "grand_total", "net_total"]),
        ),
        refundCount: todayRefunds.length,
        refundAmount: roundMoney(
          sumRows(todayRefunds, ["refund_amount", "amount", "total"]),
        ),
        expenseCount: todayExpenses.length,
        expenseAmount: roundMoney(sumExpenses(todayExpenses)),
        appointmentCount: todayAppointments.length,
      },
      month: {
        month: monthKey,
        orderCount: monthOrders.length,
        revenue: roundMoney(monthRevenue),
        refundCount: monthRefunds.length,
        refundAmount: roundMoney(monthRefundAmount),
        expenseCount: monthExpenses.length,
        expenseAmount: roundMoney(monthExpenseAmount),
        pendingExpenseCount: monthPendingExpenses.length,
        pendingExpenseAmount: roundMoney(monthPendingExpenseAmount),
        netCashAfterRefundsAndExpenses: roundMoney(
          monthRevenue - monthRefundAmount - monthExpenseAmount,
        ),
        ledgerRevenue: roundMoney(ledgerRevenue),
        costOfGoodsSold: roundMoney(ledgerCogs),
        grossProfit: roundMoney(ledgerGrossProfit),
        netProfit: roundMoney(ledgerNetProfit),
      },
      appointments: {
        pendingCount: pendingAppointments.length,
        todayCount: todayAppointments.length,
      },
      inventory: {
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
      },
      cashClosing,
      topItemsThisMonth: buildTopItems(
        orderItemsResult.rows,
        monthKey,
        timeZone,
      ),
      dataWarnings: warnings,
    };

    const instructions =
      language === "en"
        ? [
            "You are the internal business AI assistant for GTB Auto Detailing.",
            "Use only the supplied business snapshot and never invent missing figures.",
            "Clearly distinguish facts, risks, and recommendations.",
            "Do not expose customer names, phone numbers, emails, or other personal data.",
            "Return a professional business analysis plus zero to three review actions.",
            "Use the daily cash-closing snapshot to identify missing closings or cash differences.",
            "Review actions are proposals only. They must never modify data, send messages, or execute work before explicit administrator approval.",
            "Only create an action when the supplied snapshot contains a concrete issue that needs human review.",
          ].join(" ")
        : [
            "你是 GTB Auto Detailing 的内部 AI 经营助手。",
            "只能根据提供的经营快照回答，缺失的数据必须明确说明，禁止编造数字。",
            "把事实、风险和建议清楚分开。",
            "不要输出客户姓名、电话、Email 或其他个人资料。",
            "返回专业经营分析，并可提出零到三个需要管理员处理的审核建议。",
            "这些建议只能建立待批准申请，禁止直接修改数据、发送信息或执行任何操作。",
            "只有经营快照中存在明确问题时才建立申请；没有明确问题时 actions 返回空数组。",
            "必须检查每日现金关账状态、现金差额以及本月存在差额的天数。",
            "回答结构：经营结论、关键数字、异常或风险、最优先的三个行动。",
            "默认使用简体中文，表达清楚、专业、直接。",
          ].join(" ");

    let structuredOutput: AssistantStructuredOutput;
    let effectiveModel = model;
    let mode = "approval_required";
    let provider = "openai";
    let providerWarning = "";

    if (!openAIKey) {
      structuredOutput = buildRuleBasedAnalysis(
        snapshot as unknown as JsonRecord,
        question,
        language,
      );
      effectiveModel = "gtb-local-rule-engine-v1";
      mode = "local_fallback";
      provider = "local";
      providerWarning =
        "服务器尚未设置 OPENAI_API_KEY，已自动使用本地智能分析。";
    } else {
      try {
        const openAIResponse = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openAIKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              instructions,
              input: [
                {
                  role: "user",
                  content: [
                    {
                      type: "input_text",
                      text: [
                        `经营问题：${question}`,
                        "",
                        "经营数据快照：",
                        JSON.stringify(snapshot, null, 2),
                      ].join("\n"),
                    },
                  ],
                },
              ],
              text: {
                format: {
                  type: "json_schema",
                  name: "gtb_business_analysis",
                  description:
                    "Business analysis and administrator-approval action proposals.",
                  strict: true,
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      answer: { type: "string" },
                      actions: {
                        type: "array",
                        maxItems: 3,
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            action_type: {
                              type: "string",
                              enum: [
                                "review_low_stock",
                                "review_pending_appointments",
                                "review_cash_flow",
                                "review_profitability",
                                "review_service_performance",
                                "review_data_quality",
                              ],
                            },
                            target_type: {
                              type: "string",
                              enum: [
                                "inventory",
                                "appointments",
                                "finance",
                                "services",
                                "system",
                              ],
                            },
                            target_id: { type: "string" },
                            title: { type: "string" },
                            description: { type: "string" },
                            risk_level: {
                              type: "string",
                              enum: ["low", "medium", "high"],
                            },
                            payload: {
                              type: "object",
                              additionalProperties: false,
                              properties: {
                                metric_name: { type: "string" },
                                metric_value: { type: "number" },
                                related_count: { type: "integer" },
                                reference_period: { type: "string" },
                                recommended_next_step: { type: "string" },
                              },
                              required: [
                                "metric_name",
                                "metric_value",
                                "related_count",
                                "reference_period",
                                "recommended_next_step",
                              ],
                            },
                          },
                          required: [
                            "action_type",
                            "target_type",
                            "target_id",
                            "title",
                            "description",
                            "risk_level",
                            "payload",
                          ],
                        },
                      },
                    },
                    required: ["answer", "actions"],
                  },
                },
              },
              max_output_tokens: 1400,
              store: false,
            }),
          },
        );

        const openAIPayload = (await openAIResponse.json()) as JsonRecord;

        if (!openAIResponse.ok) {
          providerWarning = getOpenAIErrorMessage(openAIPayload);
          structuredOutput = buildRuleBasedAnalysis(
            snapshot as unknown as JsonRecord,
            question,
            language,
          );
          effectiveModel = "gtb-local-rule-engine-v1";
          mode = "local_fallback";
          provider = "local";
        } else {
          const rawOutput = extractOpenAIText(openAIPayload);
          const parsedOutput = rawOutput
            ? parseStructuredOutput(rawOutput)
            : null;

          if (!parsedOutput?.answer) {
            providerWarning =
              "OpenAI 返回的数据格式不完整，已自动使用本地智能分析。";
            structuredOutput = buildRuleBasedAnalysis(
              snapshot as unknown as JsonRecord,
              question,
              language,
            );
            effectiveModel = "gtb-local-rule-engine-v1";
            mode = "local_fallback";
            provider = "local";
          } else {
            structuredOutput = parsedOutput;
          }
        }
      } catch (openAIError) {
        providerWarning =
          openAIError instanceof Error
            ? openAIError.message
            : "OpenAI 服务暂时不可用";
        structuredOutput = buildRuleBasedAnalysis(
          snapshot as unknown as JsonRecord,
          question,
          language,
        );
        effectiveModel = "gtb-local-rule-engine-v1";
        mode = "local_fallback";
        provider = "local";
      }
    }

    const contextRecord = ctx as unknown as {
      user?: { id?: string };
    };
    const createdBy = contextRecord.user?.id ?? null;

    const savedActionResult = await savePendingActions(
      ctx.supabaseAdmin,
      structuredOutput.actions,
      {
        question,
        model: effectiveModel,
        createdBy,
      },
    );

    return jsonResponse({
      answer: structuredOutput.answer,
      snapshot,
      model: effectiveModel,
      provider,
      providerWarning: providerWarning || null,
      generatedAt: now.toISOString(),
      mode,
      proposedActionCount: structuredOutput.actions.length,
      actionRequests: savedActionResult.actions,
      actionWarnings: savedActionResult.warnings,
    });
  },
};