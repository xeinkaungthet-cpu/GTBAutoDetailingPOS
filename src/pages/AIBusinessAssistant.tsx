import { useMemo, useState } from "react";
import type {
  FormEvent,
  KeyboardEvent,
} from "react";

import useCurrency from "../hooks/useCurrency";
import { supabase } from "../lib/supabase";

type BusinessSnapshot = {
  generatedAt?: string;
  businessTimeZone?: string;
  accountingCurrency?: string;
  displayCurrency?: string;
  today?: {
    date?: string;
    orderCount?: number;
    revenue?: number;
    refundCount?: number;
    refundAmount?: number;
    expenseCount?: number;
    expenseAmount?: number;
    appointmentCount?: number;
  };
  month?: {
    month?: string;
    orderCount?: number;
    revenue?: number;
    refundCount?: number;
    refundAmount?: number;
    expenseCount?: number;
    expenseAmount?: number;
    netCashAfterRefundsAndExpenses?: number;
    ledgerRevenue?: number;
    costOfGoodsSold?: number;
    grossProfit?: number;
    netProfit?: number;
  };
  appointments?: {
    pendingCount?: number;
    todayCount?: number;
  };
  inventory?: {
    lowStockCount?: number;
    lowStockProducts?: Array<Record<string, unknown>>;
  };
  cashClosing?: {
    todayStatus?: string;
    todayExpectedCash?: number;
    todayActualCash?: number;
    todayDifference?: number;
    latestClosingDate?: string | null;
    latestStatus?: string | null;
    latestDifference?: number;
    monthClosingCount?: number;
    monthDifferenceTotal?: number;
    unbalancedCount?: number;
  };
  topItemsThisMonth?: Array<Record<string, unknown>>;
  dataWarnings?: string[];
};

type AssistantResponse = {
  answer: string;
  snapshot: BusinessSnapshot;
  model: string;
  generatedAt: string;
  mode: string;
  provider?: string;
  providerWarning?: string | null;
};

type ConversationItem = {
  id: string;
  question: string;
  response: AssistantResponse;
};

const quickQuestions = [
  "请生成今天的经营总结，并列出最重要的三个待处理事项。",
  "分析本月营业额、退款、支出和利润情况，有哪些风险？",
  "现在有哪些库存或预约问题需要优先处理？",
  "分析本月热销服务，并给出三个提高利润的建议。",
  "检查今天的现金关账和本月现金差额，有没有需要马上处理的问题？",
];

function AIBusinessAssistant() {
  const { formatMoney } = useCurrency();

  const [question, setQuestion] = useState(
    quickQuestions[0]
  );
  const [conversation, setConversation] =
    useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const latestResponse =
    conversation.length > 0
      ? conversation[conversation.length - 1]
          .response
      : null;

  const summaryCards = useMemo(() => {
    const snapshot = latestResponse?.snapshot;

    if (!snapshot) {
      return [];
    }

    return [
      {
        label: "今日营业额",
        english: "Today's Revenue",
        value: formatMoney(
          Number(snapshot.today?.revenue ?? 0)
        ),
        icon: "💰",
      },
      {
        label: "本月营业额",
        english: "Monthly Revenue",
        value: formatMoney(
          Number(snapshot.month?.revenue ?? 0)
        ),
        icon: "📈",
      },
      {
        label: "本月净现金",
        english: "Net Cash",
        value: formatMoney(
          Number(
            snapshot.month
              ?.netCashAfterRefundsAndExpenses ?? 0
          )
        ),
        icon: "🏦",
      },
      {
        label: "待确认预约",
        english: "Pending Bookings",
        value: String(
          snapshot.appointments?.pendingCount ?? 0
        ),
        icon: "📅",
      },
      {
        label: "低库存项目",
        english: "Low Stock",
        value: String(
          snapshot.inventory?.lowStockCount ?? 0
        ),
        icon: "📦",
      },
      {
        label: "今日现金差额",
        english: "Cash Difference",
        value: formatMoney(
          Number(snapshot.cashClosing?.todayDifference ?? 0)
        ),
        icon: "💵",
      },
    ];
  }, [formatMoney, latestResponse]);

  async function askAssistant(
    submittedQuestion: string
  ) {
    const normalizedQuestion =
      submittedQuestion.trim();

    if (!normalizedQuestion || loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } =
        await supabase.functions.invoke<AssistantResponse>(
          "ai-business-assistant",
          {
            body: {
              question: normalizedQuestion,
              language: "zh-CN",
            },
          }
        );

      if (error) {
        throw await getFunctionError(error);
      }

      if (!data?.answer) {
        throw new Error(
          "AI 没有返回可显示的经营分析。"
        );
      }

      setConversation((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random()}`,
          question: normalizedQuestion,
          response: data,
        },
      ]);

      setQuestion("");
    } catch (error) {
      console.error(
        "AI 经营助手调用失败：",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "AI 经营助手暂时无法使用，请稍后再试。"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void askAssistant(question);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void askAssistant(question);
    }
  }

  return (
    <main style={page} className="ai-page">
      <style>
        {`
          @keyframes aiPulse {
            0%, 100% { opacity: .45; transform: scale(.96); }
            50% { opacity: 1; transform: scale(1.04); }
          }

          @media (max-width: 1100px) {
            .ai-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .ai-layout {
              grid-template-columns: 1fr !important;
            }

            .ai-quick-panel {
              position: static !important;
            }
          }

          @media (max-width: 650px) {
            .ai-page {
              padding: 14px !important;
            }

            .ai-hero {
              padding: 26px 20px !important;
            }

            .ai-title {
              font-size: 32px !important;
            }

            .ai-summary-grid {
              grid-template-columns: 1fr !important;
            }

            .ai-composer-footer {
              align-items: stretch !important;
              flex-direction: column !important;
            }

            .ai-send-button {
              width: 100% !important;
            }
          }
        `}
      </style>

      <section style={hero} className="ai-hero">
        <div style={heroGlowOne} />
        <div style={heroGlowTwo} />

        <div style={heroContent}>
          <div style={heroBadges}>
            <span
              style={
                latestResponse?.mode === "local_fallback"
                  ? localBadge
                  : onlineBadge
              }
            >
              <span
                style={
                  latestResponse?.mode === "local_fallback"
                    ? localDot
                    : onlineDot
                }
              />
              {latestResponse?.mode === "local_fallback"
                ? "LOCAL ANALYSIS"
                : latestResponse
                  ? "AI ONLINE"
                  : "HYBRID READY"}
            </span>

            <span style={analysisBadge}>
              分析模式 / Analysis Only
            </span>
          </div>

          <p style={eyebrow}>
            GTB INTELLIGENT OPERATIONS
          </p>

          <h1 style={title} className="ai-title">
            AI 经营助手
            <span style={titleAccent}>
              {" "}/ Business Intelligence
            </span>
          </h1>

          <p style={heroDescription}>
            自动读取营业额、利润、退款、支出、库存和预约数据，
            帮你发现经营风险并给出下一步行动建议。
          </p>

          <div style={privacyNote}>
            🔐 当前版本只做只读分析；OpenAI 额度不可用时会自动切换本地智能分析，不会中断使用。
          </div>
        </div>
      </section>

      {latestResponse && (
        <section
          style={summaryGrid}
          className="ai-summary-grid"
        >
          {summaryCards.map((card) => (
            <article
              key={card.label}
              style={summaryCard}
            >
              <span style={summaryIcon}>
                {card.icon}
              </span>

              <div>
                <p style={summaryLabel}>
                  {card.label}
                </p>

                <p style={summaryEnglish}>
                  {card.english}
                </p>

                <strong style={summaryValue}>
                  {card.value}
                </strong>
              </div>
            </article>
          ))}
        </section>
      )}

      <section style={layout} className="ai-layout">
        <aside
          style={quickPanel}
          className="ai-quick-panel"
        >
          <div style={sectionHeading}>
            <span style={sectionIcon}>⚡</span>

            <div>
              <h2 style={sectionTitle}>
                快速分析
              </h2>
              <p style={sectionSubtitle}>
                Quick Questions
              </p>
            </div>
          </div>

          <div style={quickQuestionList}>
            {quickQuestions.map(
              (quickQuestion, index) => (
                <button
                  key={quickQuestion}
                  type="button"
                  onClick={() =>
                    setQuestion(quickQuestion)
                  }
                  style={quickQuestionButton}
                >
                  <span style={quickNumber}>
                    {String(index + 1).padStart(
                      2,
                      "0"
                    )}
                  </span>
                  <span>{quickQuestion}</span>
                </button>
              )
            )}
          </div>

          <div style={capabilityBox}>
            <strong style={capabilityTitle}>
              当前可分析
            </strong>

            <Capability text="今日与本月营业额" />
            <Capability text="退款、支出和净现金" />
            <Capability text="利润与成本异常" />
            <Capability text="低库存产品" />
            <Capability text="待确认预约" />
            <Capability text="本月热销项目" />
            <Capability text="每日现金关账与差额" />
          </div>
        </aside>

        <div style={mainColumn}>
          <form
            onSubmit={handleSubmit}
            style={composerCard}
          >
            <div style={composerHeader}>
              <div>
                <h2 style={composerTitle}>
                  向经营助手提问
                </h2>

                <p style={composerSubtitle}>
                  Ask about your business performance
                </p>
              </div>

              <span style={characterCount}>
                {question.length} / 2000
              </span>
            </div>

            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target.value.slice(0, 2000)
                )
              }
              onKeyDown={handleKeyDown}
              placeholder="例如：分析今天的经营情况，有哪些问题需要我马上处理？"
              style={questionInput}
              disabled={loading}
            />

            <div
              style={composerFooter}
              className="ai-composer-footer"
            >
              <span style={keyboardHint}>
                Enter 发送 · Shift + Enter 换行
              </span>

              <button
                type="submit"
                disabled={
                  loading || !question.trim()
                }
                style={{
                  ...sendButton,
                  opacity:
                    loading || !question.trim()
                      ? 0.58
                      : 1,
                  cursor:
                    loading || !question.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
                className="ai-send-button"
              >
                {loading ? (
                  <>
                    <span style={loadingDot}>
                      ●
                    </span>
                    AI 正在分析...
                  </>
                ) : (
                  <>✦ 开始经营分析</>
                )}
              </button>
            </div>
          </form>

          {errorMessage && (
            <div style={errorCard}>
              <strong>AI 请求失败</strong>
              <p style={errorText}>
                {errorMessage}
              </p>
            </div>
          )}

          {conversation.length === 0 ? (
            <section style={emptyState}>
              <div style={emptyIcon}>🧠</div>
              <h2 style={emptyTitle}>
                你的经营数据，交给 AI 分析
              </h2>
              <p style={emptyDescription}>
                从左侧选择常用问题，或者输入你想了解的经营情况。
              </p>
            </section>
          ) : (
            <section style={conversationList}>
              {conversation
                .slice()
                .reverse()
                .map((item, index) => (
                  <article
                    key={item.id}
                    style={answerCard}
                  >
                    <div style={questionBubble}>
                      <span style={userAvatar}>
                        YOU
                      </span>

                      <div>
                        <span style={messageLabel}>
                          你的问题
                        </span>
                        <p style={questionText}>
                          {item.question}
                        </p>
                      </div>
                    </div>

                    <div style={answerHeader}>
                      <div style={aiIdentity}>
                        <span style={aiAvatar}>
                          AI
                        </span>

                        <div>
                          <strong style={aiName}>
                            GTB AI 经营助手
                          </strong>
                          <span style={aiMeta}>
                            {item.response.model} ·{" "}
                            {formatDateTime(
                              item.response.generatedAt
                            )}
                          </span>
                        </div>
                      </div>

                      {index === 0 && (
                        <span style={latestBadge}>
                          LATEST
                        </span>
                      )}
                    </div>

                    {item.response.providerWarning && (
                      <div style={providerNotice}>
                        <strong>已启用备用分析模式</strong>
                        <span>{item.response.providerWarning}</span>
                      </div>
                    )}

                    <div style={answerText}>
                      {item.response.answer}
                    </div>

                    <div style={answerFooter}>
                      <span>
                        数据时区：
                        {item.response.snapshot
                          .businessTimeZone ||
                          "Asia/Yangon"}
                      </span>
                      <span>
                        模式：
                        {item.response.mode === "local_fallback"
                          ? "本地智能分析"
                          : "OpenAI 智能分析"}
                      </span>
                    </div>
                  </article>
                ))}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function Capability({ text }: { text: string }) {
  return (
    <div style={capabilityItem}>
      <span style={capabilityCheck}>✓</span>
      <span>{text}</span>
    </div>
  );
}

async function getFunctionError(
  unknownError: unknown
): Promise<Error> {
  const fallback =
    unknownError instanceof Error
      ? unknownError.message
      : "AI 经营助手调用失败。";

  const context = (
    unknownError as { context?: Response }
  )?.context;

  if (
    context &&
    typeof context.json === "function"
  ) {
    try {
      const payload = (await context.json()) as {
        error?: string;
        details?: string;
      };

      return new Error(
        payload.error ||
          payload.details ||
          fallback
      );
    } catch {
      return new Error(fallback);
    }
  }

  return new Error(fallback);
}

function formatDateTime(value: string) {
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
  }).format(date);
}

const page = {
  minHeight: "100%",
  padding: 28,
  background:
    "linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%)",
};

const hero = {
  position: "relative" as const,
  overflow: "hidden",
  padding: "38px 42px",
  borderRadius: 28,
  background:
    "radial-gradient(circle at 12% 15%,rgba(250,204,21,.18),transparent 30%),linear-gradient(135deg,#070b12 0%,#111827 55%,#172033 100%)",
  boxShadow:
    "0 26px 65px rgba(15,23,42,.2)",
};

const heroGlowOne = {
  position: "absolute" as const,
  top: -100,
  right: 80,
  width: 280,
  height: 280,
  borderRadius: "50%",
  background: "rgba(37,99,235,.16)",
  filter: "blur(65px)",
};

const heroGlowTwo = {
  position: "absolute" as const,
  right: -100,
  bottom: -140,
  width: 360,
  height: 360,
  borderRadius: "50%",
  background: "rgba(250,204,21,.1)",
  filter: "blur(75px)",
};

const heroContent = {
  position: "relative" as const,
  zIndex: 1,
  maxWidth: 900,
};

const heroBadges = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const onlineBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 10px",
  border: "1px solid rgba(34,197,94,.26)",
  borderRadius: 999,
  background: "rgba(34,197,94,.1)",
  color: "#86efac",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: "1px",
};

const onlineDot = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 14px #22c55e",
};

const localBadge = {
  ...onlineBadge,
  border: "1px solid rgba(250,204,21,.3)",
  background: "rgba(250,204,21,.1)",
  color: "#fde68a",
};

const localDot = {
  ...onlineDot,
  background: "#facc15",
  boxShadow: "0 0 14px #facc15",
};

const analysisBadge = {
  padding: "7px 10px",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 999,
  background: "rgba(255,255,255,.06)",
  color: "#b9c2d0",
  fontSize: 10,
  fontWeight: 800,
};

const eyebrow = {
  margin: "24px 0 0",
  color: "#facc15",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: "2.3px",
};

const title = {
  margin: "11px 0 0",
  color: "#ffffff",
  fontSize: 46,
  lineHeight: 1.12,
  letterSpacing: "-1.4px",
};

const titleAccent = {
  color: "#facc15",
};

const heroDescription = {
  maxWidth: 720,
  margin: "17px 0 0",
  color: "#b9c2d0",
  fontSize: 15,
  lineHeight: 1.8,
};

const privacyNote = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  marginTop: 20,
  padding: "10px 13px",
  borderRadius: 12,
  background: "rgba(255,255,255,.06)",
  color: "#d1d5db",
  fontSize: 11,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(6,minmax(0,1fr))",
  gap: 14,
  marginTop: 18,
};

const summaryCard = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  minHeight: 112,
  padding: 18,
  border: "1px solid #e2e8f0",
  borderRadius: 19,
  background: "#ffffff",
  boxShadow:
    "0 12px 30px rgba(15,23,42,.06)",
};

const summaryIcon = {
  width: 42,
  height: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  borderRadius: 13,
  background: "#f1f5f9",
  fontSize: 20,
};

const summaryLabel = {
  margin: 0,
  color: "#334155",
  fontSize: 11,
  fontWeight: 900,
};

const summaryEnglish = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: 9,
};

const summaryValue = {
  display: "block",
  marginTop: 9,
  color: "#0f172a",
  fontSize: 19,
};

const layout = {
  display: "grid",
  gridTemplateColumns:
    "310px minmax(0,1fr)",
  gap: 18,
  marginTop: 18,
  alignItems: "start",
};

const quickPanel = {
  position: "sticky" as const,
  top: 20,
  padding: 20,
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  background: "#ffffff",
  boxShadow:
    "0 14px 34px rgba(15,23,42,.06)",
};

const sectionHeading = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const sectionIcon = {
  width: 42,
  height: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 13,
  background:
    "linear-gradient(135deg,#fef3c7,#fde047)",
  fontSize: 20,
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 17,
};

const sectionSubtitle = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: 10,
};

const quickQuestionList = {
  display: "grid",
  gap: 9,
  marginTop: 18,
};

const quickQuestionButton = {
  display: "grid",
  gridTemplateColumns: "30px 1fr",
  gap: 10,
  width: "100%",
  padding: 13,
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  background: "#f8fafc",
  color: "#334155",
  cursor: "pointer",
  textAlign: "left" as const,
  fontSize: 11,
  lineHeight: 1.55,
};

const quickNumber = {
  color: "#2563eb",
  fontSize: 10,
  fontWeight: 950,
};

const capabilityBox = {
  marginTop: 18,
  padding: 15,
  borderRadius: 15,
  background: "#0f172a",
};

const capabilityTitle = {
  color: "#ffffff",
  fontSize: 11,
};

const capabilityItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 10,
  color: "#cbd5e1",
  fontSize: 10,
};

const capabilityCheck = {
  width: 18,
  height: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "rgba(34,197,94,.14)",
  color: "#4ade80",
  fontSize: 10,
  fontWeight: 950,
};

const mainColumn = {
  minWidth: 0,
};

const composerCard = {
  padding: 22,
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  background: "#ffffff",
  boxShadow:
    "0 14px 34px rgba(15,23,42,.06)",
};

const composerHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 20,
};

const composerTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: 19,
};

const composerSubtitle = {
  margin: "4px 0 0",
  color: "#94a3b8",
  fontSize: 10,
};

const characterCount = {
  color: "#94a3b8",
  fontSize: 10,
};

const questionInput = {
  width: "100%",
  minHeight: 135,
  marginTop: 17,
  padding: 17,
  boxSizing: "border-box" as const,
  resize: "vertical" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 15,
  outline: "none",
  background: "#f8fafc",
  color: "#0f172a",
  fontSize: 14,
  lineHeight: 1.7,
  fontFamily: "inherit",
};

const composerFooter = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 15,
  marginTop: 14,
};

const keyboardHint = {
  color: "#94a3b8",
  fontSize: 10,
};

const sendButton = {
  minWidth: 190,
  minHeight: 47,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  padding: "0 18px",
  border: "none",
  borderRadius: 13,
  background:
    "linear-gradient(135deg,#2563eb,#4f46e5)",
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 900,
  boxShadow:
    "0 12px 25px rgba(37,99,235,.22)",
};

const loadingDot = {
  color: "#bfdbfe",
  animation: "aiPulse 1s ease-in-out infinite",
};

const errorCard = {
  marginTop: 15,
  padding: 17,
  border: "1px solid #fecaca",
  borderRadius: 15,
  background: "#fff1f2",
  color: "#991b1b",
};

const errorText = {
  margin: "7px 0 0",
  fontSize: 12,
  lineHeight: 1.6,
};

const emptyState = {
  marginTop: 18,
  padding: "58px 24px",
  border: "1px dashed #cbd5e1",
  borderRadius: 22,
  background: "rgba(255,255,255,.72)",
  textAlign: "center" as const,
};

const emptyIcon = {
  width: 70,
  height: 70,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 22,
  background:
    "linear-gradient(135deg,#dbeafe,#ede9fe)",
  fontSize: 33,
};

const emptyTitle = {
  margin: "18px 0 0",
  color: "#0f172a",
  fontSize: 21,
};

const emptyDescription = {
  margin: "9px 0 0",
  color: "#64748b",
  fontSize: 12,
};

const conversationList = {
  display: "grid",
  gap: 16,
  marginTop: 18,
};

const answerCard = {
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  borderRadius: 22,
  background: "#ffffff",
  boxShadow:
    "0 14px 34px rgba(15,23,42,.06)",
};

const questionBubble = {
  display: "flex",
  gap: 12,
  padding: "17px 20px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
};

const userAvatar = {
  width: 38,
  height: 38,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  borderRadius: 12,
  background: "#0f172a",
  color: "#ffffff",
  fontSize: 9,
  fontWeight: 950,
};

const messageLabel = {
  color: "#64748b",
  fontSize: 9,
  fontWeight: 900,
};

const questionText = {
  margin: "5px 0 0",
  color: "#0f172a",
  fontSize: 13,
  lineHeight: 1.6,
};

const answerHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 15,
  padding: "18px 20px 0",
};

const aiIdentity = {
  display: "flex",
  alignItems: "center",
  gap: 11,
};

const aiAvatar = {
  width: 40,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 13,
  background:
    "linear-gradient(135deg,#2563eb,#4f46e5)",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 950,
  boxShadow:
    "0 8px 18px rgba(37,99,235,.2)",
};

const aiName = {
  display: "block",
  color: "#0f172a",
  fontSize: 12,
};

const aiMeta = {
  display: "block",
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 9,
};

const latestBadge = {
  padding: "5px 8px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#15803d",
  fontSize: 8,
  fontWeight: 950,
};

const providerNotice = {
  display: "grid",
  gap: 5,
  margin: "16px 20px 0",
  padding: "12px 14px",
  border: "1px solid #fde68a",
  borderRadius: 13,
  background: "#fffbeb",
  color: "#92400e",
  fontSize: 10,
  lineHeight: 1.55,
};

const answerText = {
  padding: "21px 20px 24px",
  color: "#26364a",
  fontSize: 13,
  lineHeight: 1.9,
  whiteSpace: "pre-wrap" as const,
  overflowWrap: "anywhere" as const,
};

const answerFooter = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 20px",
  borderTop: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#94a3b8",
  fontSize: 9,
  flexWrap: "wrap" as const,
};

export default AIBusinessAssistant;