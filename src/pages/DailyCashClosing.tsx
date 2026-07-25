import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import useCurrency from "../hooks/useCurrency";
import { supabase } from "../lib/supabase";

type PaymentRow = {
  id: number;
  payment_method: string | null;
  amount: number | string | null;
  status: string | null;
  paid_at: string | null;
};

type RefundOrderRelation = {
  payment_method: string | null;
};

type RefundRow = {
  id: number;
  refund_method: string | null;
  refund_amount: number | string | null;
  status: string | null;
  created_at: string;
  completed_at: string | null;
  orders: RefundOrderRelation | RefundOrderRelation[] | null;
};

type ExpenseRow = {
  id: number;
  payment_method: string | null;
  payment_status: string | null;
  total_amount: number | string | null;
  expense_date: string;
  paid_date: string | null;
};

type PaymentBreakdownItem = {
  amount: number;
  count: number;
};

type PaymentBreakdown = {
  cash: PaymentBreakdownItem;
  card: PaymentBreakdownItem;
  bank_transfer: PaymentBreakdownItem;
  e_wallet: PaymentBreakdownItem;
  other: PaymentBreakdownItem;
};

type DaySummary = {
  totalSales: number;
  cashSales: number;
  nonCashSales: number;
  totalRefunds: number;
  cashRefunds: number;
  totalPaidExpenses: number;
  cashExpenses: number;
  totalOrderCount: number;
  cashOrderCount: number;
  cashRefundCount: number;
  cashExpenseCount: number;
  paymentBreakdown: PaymentBreakdown;
};

type DailyClosingRow = {
  id: number;
  closing_no: string;
  closing_date: string;
  accounting_currency: string;
  display_currency: string;
  opening_cash: number | string;
  total_sales: number | string;
  cash_sales: number | string;
  non_cash_sales: number | string;
  total_refunds: number | string;
  cash_refunds: number | string;
  total_paid_expenses: number | string;
  cash_expenses: number | string;
  cash_in_adjustment: number | string;
  cash_out_adjustment: number | string;
  expected_cash: number | string;
  actual_cash: number | string;
  difference: number | string;
  total_order_count: number;
  cash_order_count: number;
  cash_refund_count: number;
  cash_expense_count: number;
  payment_breakdown: PaymentBreakdown | null;
  status: string;
  notes: string | null;
  closed_by_name: string | null;
  closed_at: string;
  created_at: string;
  updated_at: string;
};

type LocalUser = {
  full_name?: string;
  name?: string;
  role?: string;
};

const EMPTY_BREAKDOWN: PaymentBreakdown = {
  cash: { amount: 0, count: 0 },
  card: { amount: 0, count: 0 },
  bank_transfer: { amount: 0, count: 0 },
  e_wallet: { amount: 0, count: 0 },
  other: { amount: 0, count: 0 },
};

const EMPTY_SUMMARY: DaySummary = {
  totalSales: 0,
  cashSales: 0,
  nonCashSales: 0,
  totalRefunds: 0,
  cashRefunds: 0,
  totalPaidExpenses: 0,
  cashExpenses: 0,
  totalOrderCount: 0,
  cashOrderCount: 0,
  cashRefundCount: 0,
  cashExpenseCount: 0,
  paymentBreakdown: EMPTY_BREAKDOWN,
};

function DailyCashClosing() {
  const {
    formatMoney,
    convertToDisplay,
    convertToAccounting,
    displayCurrency,
    accountingCurrency,
  } = useCurrency();

  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [summary, setSummary] = useState<DaySummary>(EMPTY_SUMMARY);
  const [existingClosing, setExistingClosing] =
    useState<DailyClosingRow | null>(null);
  const [history, setHistory] = useState<DailyClosingRow[]>([]);

  const [openingCashInput, setOpeningCashInput] = useState("0");
  const [cashInInput, setCashInInput] = useState("0");
  const [cashOutInput, setCashOutInput] = useState("0");
  const [actualCashInput, setActualCashInput] = useState("0");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const openingCashAccounting = useMemo(
    () => safeAccountingAmount(openingCashInput, convertToAccounting),
    [openingCashInput, convertToAccounting],
  );

  const cashInAccounting = useMemo(
    () => safeAccountingAmount(cashInInput, convertToAccounting),
    [cashInInput, convertToAccounting],
  );

  const cashOutAccounting = useMemo(
    () => safeAccountingAmount(cashOutInput, convertToAccounting),
    [cashOutInput, convertToAccounting],
  );

  const actualCashAccounting = useMemo(
    () => safeAccountingAmount(actualCashInput, convertToAccounting),
    [actualCashInput, convertToAccounting],
  );

  const expectedCash = useMemo(
    () =>
      roundMoney(
        openingCashAccounting +
          summary.cashSales -
          summary.cashRefunds -
          summary.cashExpenses +
          cashInAccounting -
          cashOutAccounting,
      ),
    [
      openingCashAccounting,
      summary.cashSales,
      summary.cashRefunds,
      summary.cashExpenses,
      cashInAccounting,
      cashOutAccounting,
    ],
  );

  const difference = useMemo(
    () => roundMoney(actualCashAccounting - expectedCash),
    [actualCashAccounting, expectedCash],
  );

  useEffect(() => {
    void loadPageData();
  }, [selectedDate, displayCurrency]);

  async function loadPageData() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { startIso, endIso } = getLocalDayRange(selectedDate);

      const [
        paymentsResult,
        refundsResult,
        expensesResult,
        closingResult,
        historyResult,
      ] = await Promise.all([
        supabase
          .from("payments")
          .select("id, payment_method, amount, status, paid_at")
          .gte("paid_at", startIso)
          .lt("paid_at", endIso)
          .order("paid_at", { ascending: true }),

        supabase
          .from("refunds")
          .select(
            `
              id,
              refund_method,
              refund_amount,
              status,
              created_at,
              completed_at,
              orders (payment_method)
            `,
          )
          .gte("created_at", startIso)
          .lt("created_at", endIso)
          .order("created_at", { ascending: true }),

        supabase
          .from("expenses")
          .select(
            `
              id,
              payment_method,
              payment_status,
              total_amount,
              expense_date,
              paid_date
            `,
          )
          .eq("paid_date", selectedDate)
          .order("id", { ascending: true }),

        supabase
          .from("daily_cash_closings")
          .select("*")
          .eq("closing_date", selectedDate)
          .maybeSingle(),

        supabase
          .from("daily_cash_closings")
          .select("*")
          .order("closing_date", { ascending: false })
          .limit(31),
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (refundsResult.error) throw refundsResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (closingResult.error) throw closingResult.error;
      if (historyResult.error) throw historyResult.error;

      const nextSummary = calculateDaySummary(
        (paymentsResult.data ?? []) as PaymentRow[],
        (refundsResult.data ?? []) as RefundRow[],
        (expensesResult.data ?? []) as ExpenseRow[],
      );

      const closing = (closingResult.data ?? null) as DailyClosingRow | null;

      setSummary(nextSummary);
      setExistingClosing(closing);
      setHistory((historyResult.data ?? []) as DailyClosingRow[]);

      if (closing) {
        setOpeningCashInput(
          formatInputAmount(convertToDisplay(toNumber(closing.opening_cash))),
        );
        setCashInInput(
          formatInputAmount(
            convertToDisplay(toNumber(closing.cash_in_adjustment)),
          ),
        );
        setCashOutInput(
          formatInputAmount(
            convertToDisplay(toNumber(closing.cash_out_adjustment)),
          ),
        );
        setActualCashInput(
          formatInputAmount(convertToDisplay(toNumber(closing.actual_cash))),
        );
        setNotes(closing.notes ?? "");
      } else {
        setOpeningCashInput("0");
        setCashInInput("0");
        setCashOutInput("0");
        setActualCashInput("0");
        setNotes("");
      }
    } catch (error: unknown) {
      console.error("Load daily cash closing failed:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveClosing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const rawInputs = [
      { label: "开店备用金", value: openingCashInput },
      { label: "其他现金存入", value: cashInInput },
      { label: "其他现金取出", value: cashOutInput },
      { label: "实际清点现金", value: actualCashInput },
    ];

    const invalidInput = rawInputs.find(({ value }) => {
      const numberValue = Number(value);
      return !Number.isFinite(numberValue) || numberValue < 0;
    });

    if (invalidInput) {
      alert(`请输入正确的${invalidInput.label}金额`);
      return;
    }

    const confirmed = window.confirm(
      existingClosing
        ? `该日期已经完成过关账。确定更新 ${selectedDate} 的关账记录吗？`
        : `确定保存 ${selectedDate} 的每日现金关账吗？`,
    );

    if (!confirmed) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const localUser = getStoredUser();
      const { data: authData } = await supabase.auth.getUser();

      const payload = {
        closing_date: selectedDate,
        accounting_currency: accountingCurrency,
        display_currency: displayCurrency,

        opening_cash: roundMoney(openingCashAccounting),

        total_sales: roundMoney(summary.totalSales),
        cash_sales: roundMoney(summary.cashSales),
        non_cash_sales: roundMoney(summary.nonCashSales),

        total_refunds: roundMoney(summary.totalRefunds),
        cash_refunds: roundMoney(summary.cashRefunds),

        total_paid_expenses: roundMoney(summary.totalPaidExpenses),
        cash_expenses: roundMoney(summary.cashExpenses),

        cash_in_adjustment: roundMoney(cashInAccounting),
        cash_out_adjustment: roundMoney(cashOutAccounting),

        expected_cash: roundMoney(expectedCash),
        actual_cash: roundMoney(actualCashAccounting),
        difference: roundMoney(difference),

        total_order_count: summary.totalOrderCount,
        cash_order_count: summary.cashOrderCount,
        cash_refund_count: summary.cashRefundCount,
        cash_expense_count: summary.cashExpenseCount,

        payment_breakdown: summary.paymentBreakdown,
        status: "closed",
        notes: notes.trim() || null,

        closed_by_auth_user_id: authData.user?.id ?? null,
        closed_by_name:
          localUser.full_name || localUser.name || "Administrator",
        closed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("daily_cash_closings")
        .upsert(payload, {
          onConflict: "closing_date",
        })
        .select("*")
        .single();

      if (error) throw error;

      setExistingClosing(data as DailyClosingRow);
      setSuccessMessage(
        existingClosing
          ? "每日现金关账已更新。"
          : "每日现金关账已保存。",
      );

      await loadPageData();
      setSuccessMessage(
        existingClosing
          ? "每日现金关账已更新。"
          : "每日现金关账已保存。",
      );
    } catch (error: unknown) {
      console.error("Save daily cash closing failed:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function useExpectedCashAsActual() {
    setActualCashInput(
      formatInputAmount(convertToDisplay(Math.max(expectedCash, 0))),
    );
  }

  function printClosing() {
    window.print();
  }

  const differenceStatus = getDifferenceStatus(difference);

  return (
    <main className="cash-closing-page">
      <style>{pageStyles}</style>

      <header className="cash-closing-header no-print">
        <div>
          <p className="cash-closing-eyebrow">DAILY CASH CONTROL</p>
          <h1>每日现金关账 / Daily Cash Closing</h1>
          <p>
            自动汇总现金销售、现金退款和已付现金费用，再与实际清点现金核对。
          </p>
        </div>

        <div className="cash-closing-header-actions">
          <button
            type="button"
            className="cash-closing-secondary-button"
            onClick={() => void loadPageData()}
            disabled={loading || saving}
          >
            {loading ? "正在读取..." : "↻ 刷新数据"}
          </button>

          <button
            type="button"
            className="cash-closing-print-button"
            onClick={printClosing}
            disabled={loading}
          >
            🖨 打印关账单
          </button>
        </div>
      </header>

      <section className="cash-closing-currency-strip">
        <div>
          <span>当前显示货币 / Display</span>
          <strong>{displayCurrency}</strong>
        </div>
        <div className="cash-closing-currency-arrow">→</div>
        <div>
          <span>账本保存货币 / Accounting</span>
          <strong>{accountingCurrency}</strong>
        </div>
        <p>页面按当前货币显示，保存时统一换算到账本基础货币。</p>
      </section>

      {errorMessage && (
        <div className="cash-closing-alert cash-closing-alert-error no-print">
          <strong>⚠ 无法处理现金关账</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="cash-closing-alert cash-closing-alert-success no-print">
          <strong>✓ 操作成功</strong>
          <span>{successMessage}</span>
        </div>
      )}

      <section className="cash-closing-control-card no-print">
        <div className="cash-closing-date-field">
          <label htmlFor="cash-closing-date">关账日期 / Closing Date</label>
          <input
            id="cash-closing-date"
            type="date"
            value={selectedDate}
            max={todayInputValue()}
            onChange={(event) => setSelectedDate(event.target.value)}
            disabled={loading || saving}
          />
        </div>

        <div className="cash-closing-status-panel">
          <span>关账状态 / Status</span>
          <strong
            className={
              existingClosing
                ? "cash-closing-status-closed"
                : "cash-closing-status-open"
            }
          >
            {existingClosing ? "✓ 已关账 / Closed" : "待关账 / Open"}
          </strong>
          {existingClosing && (
            <small>
              {existingClosing.closing_no} · {formatDateTime(existingClosing.closed_at)}
            </small>
          )}
        </div>
      </section>

      {loading ? (
        <section className="cash-closing-loading-card">
          正在读取当天销售、退款、费用及关账资料...
        </section>
      ) : (
        <>
          <section className="cash-closing-summary-grid">
            <SummaryCard
              icon="💰"
              label="销售总额"
              english="Total Sales"
              value={formatMoney(summary.totalSales)}
              hint={`${summary.totalOrderCount} 笔已完成付款`}
              accent="#2563eb"
            />
            <SummaryCard
              icon="💵"
              label="现金销售"
              english="Cash Sales"
              value={formatMoney(summary.cashSales)}
              hint={`${summary.cashOrderCount} 笔现金订单`}
              accent="#16a34a"
            />
            <SummaryCard
              icon="↩️"
              label="现金退款"
              english="Cash Refunds"
              value={`−${formatMoney(summary.cashRefunds)}`}
              hint={`${summary.cashRefundCount} 笔现金退款`}
              accent="#dc2626"
            />
            <SummaryCard
              icon="🧾"
              label="现金费用"
              english="Cash Expenses"
              value={`−${formatMoney(summary.cashExpenses)}`}
              hint={`${summary.cashExpenseCount} 笔已付现金费用`}
              accent="#ea580c"
            />
          </section>

          <section className="cash-closing-main-grid">
            <form
              className="cash-closing-form-card"
              onSubmit={saveClosing}
            >
              <div className="cash-closing-section-heading">
                <div>
                  <p>CASH COUNT</p>
                  <h2>现金清点与调整</h2>
                </div>
                <span>{selectedDate}</span>
              </div>

              <div className="cash-closing-form-grid">
                <MoneyInput
                  id="opening-cash"
                  label="开店备用金 / Opening Cash"
                  value={openingCashInput}
                  currency={displayCurrency}
                  onChange={setOpeningCashInput}
                  disabled={saving}
                />

                <MoneyInput
                  id="cash-in"
                  label="其他现金存入 / Cash In"
                  value={cashInInput}
                  currency={displayCurrency}
                  onChange={setCashInInput}
                  disabled={saving}
                  hint="例如：老板补充零钱、非销售现金存入"
                />

                <MoneyInput
                  id="cash-out"
                  label="其他现金取出 / Cash Out"
                  value={cashOutInput}
                  currency={displayCurrency}
                  onChange={setCashOutInput}
                  disabled={saving}
                  hint="例如：临时取款；已登记费用不要重复填写"
                />

                <MoneyInput
                  id="actual-cash"
                  label="实际清点现金 / Actual Cash"
                  value={actualCashInput}
                  currency={displayCurrency}
                  onChange={setActualCashInput}
                  disabled={saving}
                  required
                />
              </div>

              <button
                type="button"
                className="cash-closing-use-expected"
                onClick={useExpectedCashAsActual}
                disabled={saving}
              >
                使用系统应有现金作为实点金额
              </button>

              <div className="cash-closing-notes-field">
                <label htmlFor="cash-closing-notes">
                  关账备注 / Closing Notes
                </label>
                <textarea
                  id="cash-closing-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="例如：现金差额原因、临时取款说明、交班备注..."
                  maxLength={500}
                  disabled={saving}
                />
                <small>{notes.length}/500</small>
              </div>

              <div className="cash-closing-form-footer">
                <p>
                  保存后会建立当天关账快照；以后修改订单、退款或费用，不会自动改写已保存快照，重新点击更新关账才会同步。
                </p>

                <button
                  type="submit"
                  className="cash-closing-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "正在保存关账..."
                    : existingClosing
                      ? "更新每日关账 / Update Closing"
                      : "完成每日关账 / Close Day"}
                </button>
              </div>
            </form>

            <section className="cash-closing-reconciliation-card">
              <div className="cash-closing-section-heading">
                <div>
                  <p>RECONCILIATION</p>
                  <h2>现金核对结果</h2>
                </div>
                <span className={`cash-closing-difference-badge ${differenceStatus.className}`}>
                  {differenceStatus.label}
                </span>
              </div>

              <div className="cash-closing-formula">
                <FormulaRow
                  label="开店备用金"
                  value={formatMoney(openingCashAccounting)}
                />
                <FormulaRow
                  label="＋ 现金销售"
                  value={formatMoney(summary.cashSales)}
                  positive
                />
                <FormulaRow
                  label="－ 现金退款"
                  value={formatMoney(summary.cashRefunds)}
                  negative
                />
                <FormulaRow
                  label="－ 现金费用"
                  value={formatMoney(summary.cashExpenses)}
                  negative
                />
                <FormulaRow
                  label="＋ 其他现金存入"
                  value={formatMoney(cashInAccounting)}
                  positive
                />
                <FormulaRow
                  label="－ 其他现金取出"
                  value={formatMoney(cashOutAccounting)}
                  negative
                />
              </div>

              <div className="cash-closing-total-box">
                <span>系统应有现金 / Expected Cash</span>
                <strong>{formatMoney(expectedCash)}</strong>
              </div>

              <div className="cash-closing-actual-box">
                <span>实际清点现金 / Actual Cash</span>
                <strong>{formatMoney(actualCashAccounting)}</strong>
              </div>

              <div className={`cash-closing-difference-box ${differenceStatus.className}`}>
                <span>现金差额 / Difference</span>
                <strong>{formatSignedMoney(difference, formatMoney)}</strong>
                <small>{differenceStatus.description}</small>
              </div>
            </section>
          </section>

          <section className="cash-closing-payment-card">
            <div className="cash-closing-section-heading">
              <div>
                <p>PAYMENT BREAKDOWN</p>
                <h2>当天收款方式汇总</h2>
              </div>
              <span>非现金销售：{formatMoney(summary.nonCashSales)}</span>
            </div>

            <div className="cash-closing-payment-grid">
              <PaymentMethodCard
                icon="💵"
                label="现金 / Cash"
                data={summary.paymentBreakdown.cash}
                formatMoney={formatMoney}
              />
              <PaymentMethodCard
                icon="💳"
                label="银行卡 / Card"
                data={summary.paymentBreakdown.card}
                formatMoney={formatMoney}
              />
              <PaymentMethodCard
                icon="🏦"
                label="银行转账 / Bank"
                data={summary.paymentBreakdown.bank_transfer}
                formatMoney={formatMoney}
              />
              <PaymentMethodCard
                icon="📱"
                label="电子钱包 / E-Wallet"
                data={summary.paymentBreakdown.e_wallet}
                formatMoney={formatMoney}
              />
              <PaymentMethodCard
                icon="•••"
                label="其他 / Other"
                data={summary.paymentBreakdown.other}
                formatMoney={formatMoney}
              />
            </div>
          </section>

          <section className="cash-closing-print-receipt print-only">
            <h1>GTB Auto Detailing & Window Film</h1>
            <h2>每日现金关账单 / Daily Cash Closing</h2>
            <p>日期：{selectedDate}</p>
            <p>关账编号：{existingClosing?.closing_no ?? "尚未保存"}</p>
            <hr />
            <FormulaRow label="开店备用金" value={formatMoney(openingCashAccounting)} />
            <FormulaRow label="现金销售" value={formatMoney(summary.cashSales)} />
            <FormulaRow label="现金退款" value={`-${formatMoney(summary.cashRefunds)}`} />
            <FormulaRow label="现金费用" value={`-${formatMoney(summary.cashExpenses)}`} />
            <FormulaRow label="其他现金存入" value={formatMoney(cashInAccounting)} />
            <FormulaRow label="其他现金取出" value={`-${formatMoney(cashOutAccounting)}`} />
            <hr />
            <FormulaRow label="系统应有现金" value={formatMoney(expectedCash)} />
            <FormulaRow label="实际清点现金" value={formatMoney(actualCashAccounting)} />
            <FormulaRow label="现金差额" value={formatSignedMoney(difference, formatMoney)} />
            <p>备注：{notes || "—"}</p>
            <p>关账员工：{existingClosing?.closed_by_name || getStoredUser().full_name || "Administrator"}</p>
          </section>

          <section className="cash-closing-history-card no-print">
            <div className="cash-closing-section-heading">
              <div>
                <p>CLOSING HISTORY</p>
                <h2>最近关账记录</h2>
              </div>
              <span>最近 {history.length} 天</span>
            </div>

            <div className="cash-closing-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>关账编号</th>
                    <th>现金销售</th>
                    <th>现金退款</th>
                    <th>现金费用</th>
                    <th>应有现金</th>
                    <th>实点现金</th>
                    <th>差额</th>
                    <th>关账员工</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="cash-closing-empty-cell">
                        暂无每日关账记录
                      </td>
                    </tr>
                  ) : (
                    history.map((closing) => {
                      const rowDifference = toNumber(closing.difference);
                      return (
                        <tr key={closing.id}>
                          <td>{closing.closing_date}</td>
                          <td>
                            <strong>{closing.closing_no}</strong>
                          </td>
                          <td>{formatMoney(toNumber(closing.cash_sales))}</td>
                          <td>{formatMoney(toNumber(closing.cash_refunds))}</td>
                          <td>{formatMoney(toNumber(closing.cash_expenses))}</td>
                          <td>{formatMoney(toNumber(closing.expected_cash))}</td>
                          <td>{formatMoney(toNumber(closing.actual_cash))}</td>
                          <td>
                            <strong
                              className={
                                Math.abs(rowDifference) < 0.0001
                                  ? "cash-closing-table-balanced"
                                  : rowDifference > 0
                                    ? "cash-closing-table-over"
                                    : "cash-closing-table-short"
                              }
                            >
                              {formatSignedMoney(rowDifference, formatMoney)}
                            </strong>
                          </td>
                          <td>{closing.closed_by_name || "—"}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setSelectedDate(closing.closing_date)}
                            >
                              查看
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  english,
  value,
  hint,
  accent,
}: {
  icon: string;
  label: string;
  english: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <article
      className="cash-closing-summary-card"
      style={{ borderTopColor: accent }}
    >
      <div
        className="cash-closing-summary-icon"
        style={{ color: accent, background: `${accent}14` }}
      >
        {icon}
      </div>
      <div>
        <p>{label}</p>
        <span>{english}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function MoneyInput({
  id,
  label,
  value,
  currency,
  onChange,
  disabled,
  hint,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  currency: string;
  onChange: (value: string) => void;
  disabled: boolean;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="cash-closing-money-field">
      <label htmlFor={id}>{label}</label>
      <div>
        <span>{currency}</span>
        <input
          id={id}
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
        />
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function FormulaRow({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="cash-closing-formula-row">
      <span>{label}</span>
      <strong
        style={{
          color: positive ? "#15803d" : negative ? "#dc2626" : "#0f172a",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function PaymentMethodCard({
  icon,
  label,
  data,
  formatMoney,
}: {
  icon: string;
  label: string;
  data: PaymentBreakdownItem;
  formatMoney: (value: number) => string;
}) {
  return (
    <article className="cash-closing-payment-method-card">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{formatMoney(data.amount)}</strong>
      <small>{data.count} 笔</small>
    </article>
  );
}

function calculateDaySummary(
  payments: PaymentRow[],
  refunds: RefundRow[],
  expenses: ExpenseRow[],
): DaySummary {
  const breakdown = cloneBreakdown();

  const completedPayments = payments.filter((payment) =>
    isCompletedStatus(payment.status),
  );

  completedPayments.forEach((payment) => {
    const group = getPaymentGroup(payment.payment_method);
    const amount = toNumber(payment.amount);

    breakdown[group].amount += amount;
    breakdown[group].count += 1;
  });

  const completedRefunds = refunds.filter((refund) =>
    isCompletedStatus(refund.status),
  );

  const cashRefunds = completedRefunds.filter((refund) =>
    isCashRefund(refund),
  );

  const paidExpenses = expenses.filter((expense) =>
    isPaidExpense(expense.payment_status),
  );

  const cashExpenses = paidExpenses.filter((expense) =>
    isCashMethod(expense.payment_method),
  );

  const totalSales = sumBy(completedPayments, (payment) => payment.amount);
  const cashSales = breakdown.cash.amount;
  const totalRefunds = sumBy(
    completedRefunds,
    (refund) => refund.refund_amount,
  );
  const cashRefundAmount = sumBy(
    cashRefunds,
    (refund) => refund.refund_amount,
  );
  const totalPaidExpenses = sumBy(
    paidExpenses,
    (expense) => expense.total_amount,
  );
  const cashExpenseAmount = sumBy(
    cashExpenses,
    (expense) => expense.total_amount,
  );

  return {
    totalSales: roundMoney(totalSales),
    cashSales: roundMoney(cashSales),
    nonCashSales: roundMoney(totalSales - cashSales),
    totalRefunds: roundMoney(totalRefunds),
    cashRefunds: roundMoney(cashRefundAmount),
    totalPaidExpenses: roundMoney(totalPaidExpenses),
    cashExpenses: roundMoney(cashExpenseAmount),
    totalOrderCount: completedPayments.length,
    cashOrderCount: breakdown.cash.count,
    cashRefundCount: cashRefunds.length,
    cashExpenseCount: cashExpenses.length,
    paymentBreakdown: {
      cash: roundBreakdownItem(breakdown.cash),
      card: roundBreakdownItem(breakdown.card),
      bank_transfer: roundBreakdownItem(breakdown.bank_transfer),
      e_wallet: roundBreakdownItem(breakdown.e_wallet),
      other: roundBreakdownItem(breakdown.other),
    },
  };
}

function cloneBreakdown(): PaymentBreakdown {
  return {
    cash: { amount: 0, count: 0 },
    card: { amount: 0, count: 0 },
    bank_transfer: { amount: 0, count: 0 },
    e_wallet: { amount: 0, count: 0 },
    other: { amount: 0, count: 0 },
  };
}

function roundBreakdownItem(item: PaymentBreakdownItem): PaymentBreakdownItem {
  return {
    amount: roundMoney(item.amount),
    count: item.count,
  };
}

function getPaymentGroup(
  method: string | null | undefined,
): keyof PaymentBreakdown {
  const normalized = normalizeValue(method);

  if (isCashMethod(normalized)) return "cash";

  if (
    normalized.includes("card") ||
    normalized.includes("visa") ||
    normalized.includes("master") ||
    normalized.includes("银行卡")
  ) {
    return "card";
  }

  if (
    normalized.includes("bank") ||
    normalized.includes("transfer") ||
    normalized.includes("转账")
  ) {
    return "bank_transfer";
  }

  if (
    normalized.includes("wallet") ||
    normalized.includes("pay") ||
    normalized.includes("kbz") ||
    normalized.includes("wave") ||
    normalized.includes("电子钱包")
  ) {
    return "e_wallet";
  }

  return "other";
}

function isCashRefund(refund: RefundRow): boolean {
  const refundMethod = normalizeValue(refund.refund_method);

  if (isCashMethod(refundMethod)) return true;

  if (
    refundMethod === "original_payment" ||
    refundMethod.includes("原付款方式")
  ) {
    const relation = Array.isArray(refund.orders)
      ? refund.orders[0]
      : refund.orders;

    return isCashMethod(relation?.payment_method);
  }

  return false;
}

function isCashMethod(method: string | null | undefined): boolean {
  const normalized = normalizeValue(method);
  return normalized === "cash" || normalized.includes("现金");
}

function isCompletedStatus(status: string | null | undefined): boolean {
  const normalized = normalizeValue(status);

  return (
    normalized === "completed" ||
    normalized === "paid" ||
    normalized === "success" ||
    normalized === "successful" ||
    normalized === "已完成" ||
    normalized === "已付款"
  );
}

function isPaidExpense(status: string | null | undefined): boolean {
  const normalized = normalizeValue(status);
  return normalized === "paid" || normalized === "已付款";
}

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getDifferenceStatus(difference: number) {
  if (Math.abs(difference) < 0.0001) {
    return {
      label: "✓ 现金平衡",
      description: "实际现金与系统应有现金一致。",
      className: "cash-closing-balanced",
    };
  }

  if (difference > 0) {
    return {
      label: "现金溢余",
      description: "实际清点现金高于系统应有现金，请检查是否有未登记现金收入。",
      className: "cash-closing-over",
    };
  }

  return {
    label: "现金短缺",
    description: "实际清点现金低于系统应有现金，请检查退款、费用或取款记录。",
    className: "cash-closing-short",
  };
}

function safeAccountingAmount(
  input: string,
  convertToAccounting: (value: number) => number,
): number {
  const inputAmount = Number(input);

  if (!Number.isFinite(inputAmount) || inputAmount < 0) {
    return 0;
  }

  const accountingAmount = convertToAccounting(inputAmount);
  return Number.isFinite(accountingAmount) ? roundMoney(accountingAmount) : 0;
}

function sumBy<T>(
  rows: T[],
  getValue: (row: T) => number | string | null | undefined,
): number {
  return rows.reduce((sum, row) => sum + toNumber(getValue(row)), 0);
}

function toNumber(value: number | string | null | undefined): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function formatInputAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return String(rounded);
}

function formatSignedMoney(
  value: number,
  formatMoney: (value: number) => string,
): string {
  if (Math.abs(value) < 0.0001) return formatMoney(0);
  return value > 0 ? `+${formatMoney(value)}` : `−${formatMoney(Math.abs(value))}`;
}

function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalDayRange(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStoredUser(): LocalUser {
  try {
    const value = localStorage.getItem("gtb_user");
    return value ? (JSON.parse(value) as LocalUser) : {};
  } catch {
    return {};
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "未知错误");
  }

  return "发生未知错误，请稍后重试。";
}

const pageStyles = `
  .cash-closing-page {
    min-height: 100%;
    color: #0f172a;
  }

  .cash-closing-page * {
    box-sizing: border-box;
  }

  .cash-closing-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 20px;
  }

  .cash-closing-eyebrow,
  .cash-closing-section-heading p {
    margin: 0 0 8px;
    color: #2563eb;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.5px;
  }

  .cash-closing-header h1 {
    margin: 0;
    font-size: clamp(25px, 3vw, 38px);
    line-height: 1.15;
  }

  .cash-closing-header > div > p:last-child {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 14px;
  }

  .cash-closing-header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .cash-closing-secondary-button,
  .cash-closing-print-button,
  .cash-closing-save-button,
  .cash-closing-use-expected,
  .cash-closing-history-card button {
    min-height: 42px;
    padding: 0 16px;
    border-radius: 11px;
    cursor: pointer;
    font-weight: 850;
  }

  .cash-closing-secondary-button {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
  }

  .cash-closing-print-button {
    border: none;
    background: #0f172a;
    color: #ffffff;
  }

  button:disabled {
    cursor: not-allowed !important;
    opacity: 0.62;
  }

  .cash-closing-currency-strip {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    padding: 16px 18px;
    border: 1px solid #bfdbfe;
    border-radius: 16px;
    background: #eff6ff;
  }

  .cash-closing-currency-strip > div:not(.cash-closing-currency-arrow) {
    display: grid;
    gap: 4px;
  }

  .cash-closing-currency-strip span {
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
  }

  .cash-closing-currency-strip strong {
    color: #1d4ed8;
    font-size: 16px;
  }

  .cash-closing-currency-arrow {
    color: #60a5fa;
    font-weight: 900;
  }

  .cash-closing-currency-strip p {
    margin: 0 0 0 8px;
    color: #64748b;
    font-size: 12px;
  }

  .cash-closing-alert {
    display: grid;
    gap: 4px;
    margin-bottom: 18px;
    padding: 14px 16px;
    border-radius: 13px;
  }

  .cash-closing-alert-error {
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }

  .cash-closing-alert-success {
    border: 1px solid #bbf7d0;
    background: #f0fdf4;
    color: #15803d;
  }

  .cash-closing-control-card,
  .cash-closing-form-card,
  .cash-closing-reconciliation-card,
  .cash-closing-payment-card,
  .cash-closing-history-card,
  .cash-closing-loading-card {
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  }

  .cash-closing-control-card {
    display: grid;
    grid-template-columns: minmax(240px, 360px) 1fr;
    gap: 22px;
    align-items: end;
    margin-bottom: 18px;
    padding: 18px;
  }

  .cash-closing-date-field,
  .cash-closing-money-field,
  .cash-closing-notes-field {
    display: grid;
    gap: 8px;
  }

  .cash-closing-date-field label,
  .cash-closing-money-field label,
  .cash-closing-notes-field label {
    color: #334155;
    font-size: 12px;
    font-weight: 850;
  }

  .cash-closing-date-field input,
  .cash-closing-money-field > div,
  .cash-closing-notes-field textarea {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 11px;
    background: #ffffff;
    color: #0f172a;
    font: inherit;
    outline: none;
  }

  .cash-closing-date-field input {
    min-height: 44px;
    padding: 0 13px;
  }

  .cash-closing-status-panel {
    display: grid;
    justify-items: end;
    gap: 5px;
  }

  .cash-closing-status-panel > span {
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
  }

  .cash-closing-status-panel strong {
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 12px;
  }

  .cash-closing-status-open {
    background: #fef3c7;
    color: #b45309;
  }

  .cash-closing-status-closed {
    background: #dcfce7;
    color: #15803d;
  }

  .cash-closing-status-panel small {
    color: #94a3b8;
    font-size: 10px;
  }

  .cash-closing-loading-card {
    min-height: 260px;
    display: grid;
    place-items: center;
    color: #64748b;
  }

  .cash-closing-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .cash-closing-summary-card {
    display: flex;
    gap: 13px;
    min-height: 156px;
    padding: 18px;
    border: 1px solid #e2e8f0;
    border-top: 4px solid;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  }

  .cash-closing-summary-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    font-size: 20px;
  }

  .cash-closing-summary-card > div:last-child {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .cash-closing-summary-card p {
    margin: 1px 0 3px;
    color: #334155;
    font-size: 12px;
    font-weight: 850;
  }

  .cash-closing-summary-card span {
    color: #94a3b8;
    font-size: 9px;
    font-weight: 800;
  }

  .cash-closing-summary-card strong {
    display: block;
    margin-top: 13px;
    font-size: 21px;
    overflow-wrap: anywhere;
  }

  .cash-closing-summary-card small {
    margin-top: auto;
    padding-top: 9px;
    color: #64748b;
    font-size: 10px;
  }

  .cash-closing-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(330px, 0.8fr);
    gap: 18px;
    margin-bottom: 18px;
  }

  .cash-closing-form-card,
  .cash-closing-reconciliation-card,
  .cash-closing-payment-card,
  .cash-closing-history-card {
    padding: 20px;
  }

  .cash-closing-section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 18px;
  }

  .cash-closing-section-heading h2 {
    margin: 0;
    font-size: 20px;
  }

  .cash-closing-section-heading > span {
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
  }

  .cash-closing-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .cash-closing-money-field > div {
    min-height: 46px;
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .cash-closing-money-field > div:focus-within,
  .cash-closing-date-field input:focus,
  .cash-closing-notes-field textarea:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .cash-closing-money-field > div > span {
    align-self: stretch;
    display: grid;
    place-items: center;
    min-width: 64px;
    padding: 0 10px;
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
    font-weight: 900;
  }

  .cash-closing-money-field input {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 0 13px;
    border: none;
    outline: none;
    color: #0f172a;
    font: inherit;
    font-weight: 800;
  }

  .cash-closing-money-field > small,
  .cash-closing-notes-field > small {
    color: #94a3b8;
    font-size: 10px;
  }

  .cash-closing-use-expected {
    margin-top: 14px;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .cash-closing-notes-field {
    margin-top: 18px;
  }

  .cash-closing-notes-field textarea {
    min-height: 110px;
    resize: vertical;
    padding: 12px 13px;
  }

  .cash-closing-notes-field > small {
    justify-self: end;
  }

  .cash-closing-form-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }

  .cash-closing-form-footer p {
    max-width: 600px;
    margin: 0;
    color: #64748b;
    font-size: 10px;
    line-height: 1.55;
  }

  .cash-closing-save-button {
    min-width: 220px;
    border: none;
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(37, 99, 235, 0.25);
  }

  .cash-closing-difference-badge {
    padding: 8px 11px;
    border-radius: 999px;
    font-size: 10px !important;
  }

  .cash-closing-formula {
    display: grid;
    gap: 11px;
    padding: 15px;
    border-radius: 13px;
    background: #f8fafc;
  }

  .cash-closing-formula-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    color: #475569;
    font-size: 12px;
  }

  .cash-closing-formula-row strong {
    text-align: right;
  }

  .cash-closing-total-box,
  .cash-closing-actual-box,
  .cash-closing-difference-box {
    display: grid;
    gap: 6px;
    margin-top: 13px;
    padding: 16px;
    border-radius: 14px;
  }

  .cash-closing-total-box {
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .cash-closing-actual-box {
    border: 1px solid #ddd6fe;
    background: #f5f3ff;
    color: #6d28d9;
  }

  .cash-closing-total-box span,
  .cash-closing-actual-box span,
  .cash-closing-difference-box span {
    font-size: 10px;
    font-weight: 850;
  }

  .cash-closing-total-box strong,
  .cash-closing-actual-box strong,
  .cash-closing-difference-box strong {
    font-size: 24px;
    overflow-wrap: anywhere;
  }

  .cash-closing-difference-box small {
    font-size: 10px;
    line-height: 1.45;
  }

  .cash-closing-balanced {
    border: 1px solid #86efac !important;
    background: #f0fdf4 !important;
    color: #15803d !important;
  }

  .cash-closing-over {
    border: 1px solid #fde68a !important;
    background: #fffbeb !important;
    color: #b45309 !important;
  }

  .cash-closing-short {
    border: 1px solid #fecaca !important;
    background: #fef2f2 !important;
    color: #dc2626 !important;
  }

  .cash-closing-payment-card {
    margin-bottom: 18px;
  }

  .cash-closing-payment-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }

  .cash-closing-payment-method-card {
    display: grid;
    gap: 7px;
    min-height: 135px;
    padding: 15px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #f8fafc;
  }

  .cash-closing-payment-method-card > div {
    font-size: 20px;
  }

  .cash-closing-payment-method-card span {
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
  }

  .cash-closing-payment-method-card strong {
    font-size: 16px;
    overflow-wrap: anywhere;
  }

  .cash-closing-payment-method-card small {
    color: #94a3b8;
    font-size: 10px;
  }

  .cash-closing-table-wrapper {
    width: 100%;
    overflow-x: auto;
  }

  .cash-closing-history-card table {
    width: 100%;
    min-width: 1220px;
    border-collapse: collapse;
  }

  .cash-closing-history-card th,
  .cash-closing-history-card td {
    padding: 12px 10px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    white-space: nowrap;
    font-size: 11px;
  }

  .cash-closing-history-card th {
    background: #f8fafc;
    color: #64748b;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .cash-closing-history-card button {
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .cash-closing-table-balanced { color: #15803d; }
  .cash-closing-table-over { color: #b45309; }
  .cash-closing-table-short { color: #dc2626; }

  .cash-closing-empty-cell {
    padding: 42px !important;
    text-align: center !important;
    color: #94a3b8;
  }

  .print-only {
    display: none;
  }

  @media (max-width: 1200px) {
    .cash-closing-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .cash-closing-main-grid {
      grid-template-columns: 1fr;
    }

    .cash-closing-payment-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .cash-closing-header,
    .cash-closing-form-footer {
      flex-direction: column;
    }

    .cash-closing-header-actions,
    .cash-closing-header-actions button,
    .cash-closing-save-button {
      width: 100%;
    }

    .cash-closing-currency-strip {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .cash-closing-currency-strip p {
      width: 100%;
      margin-left: 0;
    }

    .cash-closing-control-card,
    .cash-closing-form-grid,
    .cash-closing-summary-grid,
    .cash-closing-payment-grid {
      grid-template-columns: 1fr;
    }

    .cash-closing-status-panel {
      justify-items: start;
    }
  }

  @media print {
    body * {
      visibility: hidden !important;
    }

    .cash-closing-page,
    .cash-closing-page * {
      visibility: visible !important;
    }

    .cash-closing-page {
      position: absolute;
      inset: 0;
      padding: 24px;
      background: #ffffff;
    }

    .no-print,
    .cash-closing-summary-grid,
    .cash-closing-main-grid,
    .cash-closing-payment-card,
    .cash-closing-history-card,
    .cash-closing-currency-strip {
      display: none !important;
    }

    .print-only {
      display: block !important;
    }

    .cash-closing-print-receipt {
      max-width: 760px;
      margin: 0 auto;
      font-family: Arial, sans-serif;
    }

    .cash-closing-print-receipt h1,
    .cash-closing-print-receipt h2 {
      margin: 0 0 10px;
    }

    .cash-closing-print-receipt hr {
      margin: 18px 0;
      border: 0;
      border-top: 1px solid #cbd5e1;
    }

    .cash-closing-formula-row {
      padding: 6px 0;
    }
  }
`;

export default DailyCashClosing;