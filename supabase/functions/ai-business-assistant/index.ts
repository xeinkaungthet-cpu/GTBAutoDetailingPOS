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

    if (!openAIKey) {
      return jsonResponse(
        {
          error:
            "服务器尚未设置 OPENAI_API_KEY，请先在 Supabase Secrets 中添加。",
        },
        500,
      );
    }

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
    ] = await Promise.all([
      safeReadAll(ctx.supabaseAdmin, "orders"),
      safeReadAll(ctx.supabaseAdmin, "order_items"),
      safeReadAll(ctx.supabaseAdmin, "refunds"),
      safeReadAll(ctx.supabaseAdmin, "expenses"),
      safeReadAll(ctx.supabaseAdmin, "products"),
      safeReadAll(ctx.supabaseAdmin, "appointments"),
      safeReadAll(ctx.supabaseAdmin, "report_profit_ledger"),
      safeReadAll(ctx.supabaseAdmin, "business_settings", 10),
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

    const countableExpenses = expensesResult.rows.filter(isCountableExpense);

    const todayExpenses = countableExpenses.filter(
      (row) =>
        rowDateKey(row, ["expense_date", "created_at"], timeZone) === todayKey,
    );

    const monthExpenses = countableExpenses.filter((row) =>
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
        ["transaction_date", "entry_date", "date", "created_at"],
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

    const monthExpenseAmount = sumRows(monthExpenses, [
      "amount",
      "expense_amount",
      "total",
    ]);

    const ledgerRevenue = sumKnownField(monthLedger, [
      "net_revenue",
      "revenue",
      "sales_amount",
    ]);

    const ledgerCogs = sumKnownField(monthLedger, [
      "net_cogs",
      "cogs",
      "cost_amount",
      "cost_total",
    ]);

    const ledgerGrossProfit = sumKnownField(monthLedger, ["gross_profit"]);
    const ledgerNetProfit = sumKnownField(monthLedger, ["net_profit"]);

    const settings = settingsResult.rows[0] ?? {};
    const accountingCurrency =
      firstText(settings, ["accounting_currency"]) || "USD";
    const displayCurrency =
      firstText(settings, ["display_currency"]) || accountingCurrency;

    const lowStockProducts = buildLowStock(productsResult.rows);

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
        expenseAmount: roundMoney(
          sumRows(todayExpenses, ["amount", "expense_amount", "total"]),
        ),
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
            "回答结构：经营结论、关键数字、异常或风险、最优先的三个行动。",
            "默认使用简体中文，表达清楚、专业、直接。",
          ].join(" ");

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
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
        max_output_tokens: 1800,
        store: false,
      }),
    });

    const openAIPayload = (await openAIResponse.json()) as JsonRecord;

    if (!openAIResponse.ok) {
      const errorRecord =
        openAIPayload.error && typeof openAIPayload.error === "object"
          ? (openAIPayload.error as JsonRecord)
          : {};

      return jsonResponse(
        {
          error: firstText(errorRecord, ["message"]) || "OpenAI 请求失败",
          status: openAIResponse.status,
        },
        502,
      );
    }

    const rawOutput = extractOpenAIText(openAIPayload);

    if (!rawOutput) {
      return jsonResponse({ error: "AI 没有返回可显示的文字" }, 502);
    }

    const structuredOutput = parseStructuredOutput(rawOutput);

    if (!structuredOutput?.answer) {
      return jsonResponse(
        {
          error: "AI 返回的数据格式不正确，请重新分析。",
          details: "structured_output_parse_failed",
        },
        502,
      );
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
        model,
        createdBy,
      },
    );

    return jsonResponse({
      answer: structuredOutput.answer,
      snapshot,
      model,
      generatedAt: now.toISOString(),
      mode: "approval_required",
      proposedActionCount: structuredOutput.actions.length,
      actionRequests: savedActionResult.actions,
      actionWarnings: savedActionResult.warnings,
    });
  },
};