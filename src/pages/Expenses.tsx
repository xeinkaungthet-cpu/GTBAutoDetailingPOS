import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "../lib/supabase";
import {
  ExpenseService,
  type Expense,
  type ExpenseCategory,
  type ExpenseFilters,
  type ExpensePaymentMethod,
  type ExpensePaymentStatus,
  type ExpensePayload,
  type RecurringFrequency,
} from "../services/expenseService";
import useCurrency from "../hooks/useCurrency";

type ExpenseForm = {
  expense_date: string;
  category_id: string;
  title: string;
  description: string;
  payee_name: string;
  reference_no: string;
  subtotal: string;
  tax_amount: string;
  payment_method: ExpensePaymentMethod;
  payment_status: ExpensePaymentStatus;
  due_date: string;
  paid_date: string;
  is_recurring: boolean;
  recurring_frequency: "" | RecurringFrequency;
  receipt_url: string;
  notes: string;
};

type FilterForm = {
  startDate: string;
  endDate: string;
  categoryId: string;
  paymentStatus: "all" | ExpensePaymentStatus;
  paymentMethod: "all" | ExpensePaymentMethod;
  search: string;
};

type ProfitSummary = {
  netRevenue: number;
  netCost: number;
  grossProfit: number;
};

type CategorySummary = {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  count: number;
};

type DailyExpenseSummary = {
  date: string;
  displayDate: string;
  paid: number;
  pending: number;
};

const PAGE_SIZE = 1000;

function todayInputValue() {
  return toInputDate(new Date());
}

function currentMonthRange() {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(today),
  };
}

const initialRange = currentMonthRange();

const emptyForm: ExpenseForm = {
  expense_date: todayInputValue(),
  category_id: "",
  title: "",
  description: "",
  payee_name: "",
  reference_no: "",
  subtotal: "",
  tax_amount: "0",
  payment_method: "cash",
  payment_status: "paid",
  due_date: "",
  paid_date: todayInputValue(),
  is_recurring: false,
  recurring_frequency: "",
  receipt_url: "",
  notes: "",
};

const emptyFilters: FilterForm = {
  startDate: initialRange.startDate,
  endDate: initialRange.endDate,
  categoryId: "",
  paymentStatus: "all",
  paymentMethod: "all",
  search: "",
};

function Expenses() {
  const {
    formatMoney,
    formatAccountingMoney,
    currentOption,
    accountingOption,
    displayCurrency,
    convertToDisplay,
    convertToAccounting,
  } = useCurrency();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [filters, setFilters] = useState<FilterForm>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterForm>(emptyFilters);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formCurrency, setFormCurrency] =
    useState(displayCurrency);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [profitSummary, setProfitSummary] = useState<ProfitSummary>({
    netRevenue: 0,
    netCost: 0,
    grossProfit: 0,
  });

  useEffect(() => {
    void loadPageData(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    if (formCurrency === displayCurrency) {
      return;
    }

    setForm((current) => {
      if (editingId !== null) {
        const editingExpense = expenses.find(
          (expense) => expense.id === editingId
        );

        if (editingExpense) {
          return {
            ...current,
            subtotal: formatCurrencyInput(
              convertToDisplay(
                toNumber(editingExpense.subtotal)
              ),
              displayCurrency
            ),
            tax_amount: formatCurrencyInput(
              convertToDisplay(
                toNumber(editingExpense.tax_amount)
              ),
              displayCurrency
            ),
          };
        }
      }

      return {
        ...current,
        subtotal: "",
        tax_amount: "0",
      };
    });

    setFormCurrency(displayCurrency);
  }, [
    displayCurrency,
    editingId,
    expenses,
    formCurrency,
    convertToDisplay,
  ]);

  async function loadPageData(activeFilters: FilterForm) {
    setLoading(true);
    setError("");

    try {
      const expenseFilters: ExpenseFilters = {
        startDate: activeFilters.startDate,
        endDate: activeFilters.endDate,
        categoryId: activeFilters.categoryId
          ? Number(activeFilters.categoryId)
          : null,
        paymentStatus: activeFilters.paymentStatus,
        paymentMethod: activeFilters.paymentMethod,
        search: activeFilters.search,
      };

      const [categoryData, expenseData, reportData] = await Promise.all([
        ExpenseService.getCategories(),
        ExpenseService.getAll(expenseFilters),
        loadProfitSummary(
          activeFilters.startDate,
          activeFilters.endDate
        ),
      ]);

      setCategories(categoryData);
      setExpenses(expenseData);
      setProfitSummary(reportData);
    } catch (loadError: unknown) {
      console.error("Failed to load expense page:", loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadProfitSummary(
    startDate: string,
    endDate: string
  ): Promise<ProfitSummary> {
    const start = parseInputDate(startDate);
    const endExclusive = addDays(parseInputDate(endDate), 1);

    const rows: Array<{
      revenue: number | string | null;
      cost: number | string | null;
      profit: number | string | null;
    }> = [];

    let from = 0;

    while (true) {
      const { data, error: queryError } = await supabase
        .from("report_profit_ledger")
        .select("revenue,cost,profit")
        .gte("transaction_at", start.toISOString())
        .lt("transaction_at", endExclusive.toISOString())
        .range(from, from + PAGE_SIZE - 1);

      if (queryError) {
        throw queryError;
      }

      const page = data ?? [];
      rows.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }

      from += PAGE_SIZE;
    }

    return rows.reduce<ProfitSummary>(
      (summary, row) => ({
        netRevenue: summary.netRevenue + toNumber(row.revenue),
        netCost: summary.netCost + toNumber(row.cost),
        grossProfit: summary.grossProfit + toNumber(row.profit),
      }),
      {
        netRevenue: 0,
        netCost: 0,
        grossProfit: 0,
      }
    );
  }

  function updateForm<K extends keyof ExpenseForm>(
    field: K,
    value: ExpenseForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateFilter<K extends keyof FilterForm>(
    field: K,
    value: FilterForm[K]
  ) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyFilters() {
    if (!filters.startDate || !filters.endDate) {
      alert("请选择开始日期和结束日期");
      return;
    }

    if (parseInputDate(filters.startDate) > parseInputDate(filters.endDate)) {
      alert("开始日期不能晚于结束日期");
      return;
    }

    setAppliedFilters({ ...filters });
  }

  function resetFilters() {
    const nextFilters = { ...emptyFilters };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      expense_date: todayInputValue(),
      paid_date: todayInputValue(),
    });

    setEditingId(null);
    setFormCurrency(displayCurrency);
  }

  function startEditing(expense: Expense) {
    setEditingId(expense.id);
    setFormCurrency(displayCurrency);

    setForm({
      expense_date: expense.expense_date || todayInputValue(),
      category_id:
        expense.category_id === null || expense.category_id === undefined
          ? ""
          : String(expense.category_id),
      title: expense.title || "",
      description: expense.description || "",
      payee_name: expense.payee_name || "",
      reference_no: expense.reference_no || "",
      subtotal: formatCurrencyInput(
        convertToDisplay(
          toNumber(expense.subtotal)
        ),
        displayCurrency
      ),
      tax_amount: formatCurrencyInput(
        convertToDisplay(
          toNumber(expense.tax_amount)
        ),
        displayCurrency
      ),
      payment_method: expense.payment_method,
      payment_status: expense.payment_status,
      due_date: expense.due_date || "",
      paid_date: expense.paid_date || "",
      is_recurring: expense.is_recurring,
      recurring_frequency: expense.recurring_frequency || "",
      receipt_url: expense.receipt_url || "",
      notes: expense.notes || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const inputSubtotal = Number(form.subtotal);
    const inputTaxAmount = Number(form.tax_amount || 0);

    const subtotal = roundAccountingAmount(
      convertToAccounting(inputSubtotal)
    );
    const taxAmount = roundAccountingAmount(
      convertToAccounting(inputTaxAmount)
    );

    if (!form.title.trim()) {
      alert("请输入费用名称");
      return;
    }

    if (
      !Number.isFinite(inputSubtotal) ||
      inputSubtotal < 0
    ) {
      alert("请输入正确的费用金额");
      return;
    }

    if (
      !Number.isFinite(inputTaxAmount) ||
      inputTaxAmount < 0
    ) {
      alert("请输入正确的税额");
      return;
    }

    if (form.payment_status === "paid" && !form.paid_date) {
      alert("已付款费用需要填写付款日期");
      return;
    }

    if (form.is_recurring && !form.recurring_frequency) {
      alert("请选择重复费用周期");
      return;
    }

    const payload: ExpensePayload = {
      expense_date: form.expense_date,
      category_id: form.category_id ? Number(form.category_id) : null,
      title: form.title,
      description: form.description || null,
      payee_name: form.payee_name || null,
      reference_no: form.reference_no || null,
      subtotal,
      tax_amount: taxAmount,
      payment_method: form.payment_method,
      payment_status: form.payment_status,
      due_date: form.due_date || null,
      paid_date:
        form.payment_status === "paid" ? form.paid_date || null : null,
      is_recurring: form.is_recurring,
      recurring_frequency:
        form.is_recurring && form.recurring_frequency
          ? form.recurring_frequency
          : null,
      receipt_url: form.receipt_url || null,
      notes: form.notes || null,
    };

    setSaving(true);

    try {
      if (editingId === null) {
        await ExpenseService.create(payload);
        alert("费用记录创建成功");
      } else {
        await ExpenseService.update(editingId, payload);
        alert("费用记录修改成功");
      }

      resetForm();
      await loadPageData(appliedFilters);
    } catch (saveError: unknown) {
      alert(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function markAsPaid(expense: Expense) {
    const paidDate = window.prompt(
      "请输入付款日期（YYYY-MM-DD）",
      todayInputValue()
    );

    if (!paidDate) {
      return;
    }

    try {
      await ExpenseService.markAsPaid(expense.id, paidDate);
      await loadPageData(appliedFilters);
      alert("费用已标记为已付款");
    } catch (statusError: unknown) {
      alert(getErrorMessage(statusError));
    }
  }

  async function cancelExpense(expense: Expense) {
    const confirmed = window.confirm(
      `确定取消费用“${expense.title}”吗？`
    );

    if (!confirmed) {
      return;
    }

    try {
      await ExpenseService.updateStatus(expense.id, "cancelled");
      await loadPageData(appliedFilters);
      alert("费用已取消");
    } catch (statusError: unknown) {
      alert(getErrorMessage(statusError));
    }
  }

  async function deleteExpense(expense: Expense) {
    const confirmed = window.confirm(
      `确定永久删除费用“${expense.title}”吗？\n删除后无法恢复。`
    );

    if (!confirmed) {
      return;
    }

    try {
      await ExpenseService.delete(expense.id);

      if (editingId === expense.id) {
        resetForm();
      }

      await loadPageData(appliedFilters);
      alert("费用记录已删除");
    } catch (deleteError: unknown) {
      alert(getErrorMessage(deleteError));
    }
  }

  const formTotalDisplay =
    toNumber(form.subtotal) +
    toNumber(form.tax_amount);

  const formTotalAccounting =
    convertToAccounting(formTotalDisplay);

  const summary = useMemo(() => {
    const paidRows = expenses.filter(
      (expense) => expense.payment_status === "paid"
    );

    const pendingRows = expenses.filter(
      (expense) => expense.payment_status === "pending"
    );

    const cancelledRows = expenses.filter(
      (expense) => expense.payment_status === "cancelled"
    );

    const paidTotal = paidRows.reduce(
      (sum, expense) => sum + toNumber(expense.total_amount),
      0
    );

    const pendingTotal = pendingRows.reduce(
      (sum, expense) => sum + toNumber(expense.total_amount),
      0
    );

    const cancelledTotal = cancelledRows.reduce(
      (sum, expense) => sum + toNumber(expense.total_amount),
      0
    );

    const taxTotal = paidRows.reduce(
      (sum, expense) => sum + toNumber(expense.tax_amount),
      0
    );

    return {
      totalCount: expenses.length,
      paidCount: paidRows.length,
      pendingCount: pendingRows.length,
      cancelledCount: cancelledRows.length,
      paidTotal,
      pendingTotal,
      cancelledTotal,
      taxTotal,
      recurringCount: expenses.filter((expense) => expense.is_recurring).length,
    };
  }, [expenses]);

  const finalNetProfit = profitSummary.grossProfit - summary.paidTotal;

  const expenseRatio =
    profitSummary.netRevenue > 0
      ? (summary.paidTotal / profitSummary.netRevenue) * 100
      : 0;

  const categorySummary = useMemo<CategorySummary[]>(() => {
    const map = new Map<string, CategorySummary>();

    expenses
      .filter((expense) => expense.payment_status === "paid")
      .forEach((expense) => {
        const category = expense.category;
        const key = String(category?.id ?? "uncategorized");

        const current = map.get(key) ?? {
          id: key,
          name: category?.category_name ?? "未分类",
          icon: category?.icon ?? "💸",
          color: category?.color ?? "#64748b",
          amount: 0,
          count: 0,
        };

        current.amount += toNumber(expense.total_amount);
        current.count += 1;

        map.set(key, current);
      });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const dailyExpenseSummary = useMemo<DailyExpenseSummary[]>(() => {
    const start = parseInputDate(appliedFilters.startDate);
    const endExclusive = addDays(parseInputDate(appliedFilters.endDate), 1);
    const map = new Map<string, DailyExpenseSummary>();

    const cursor = new Date(start);

    while (cursor < endExclusive) {
      const date = toInputDate(cursor);

      map.set(date, {
        date,
        displayDate: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
        paid: 0,
        pending: 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    expenses.forEach((expense) => {
      const current = map.get(expense.expense_date);

      if (!current || expense.payment_status === "cancelled") {
        return;
      }

      if (expense.payment_status === "paid") {
        current.paid += toNumber(expense.total_amount);
      } else {
        current.pending += toNumber(expense.total_amount);
      }
    });

    return Array.from(map.values());
  }, [expenses, appliedFilters.startDate, appliedFilters.endDate]);

  const upcomingPendingExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.payment_status === "pending")
        .sort((a, b) =>
          String(a.due_date ?? "9999-12-31").localeCompare(
            String(b.due_date ?? "9999-12-31")
          )
        )
        .slice(0, 6),
    [expenses]
  );

  function exportExpensesCSV() {
    if (expenses.length === 0) {
      alert("当前筛选范围没有费用数据");
      return;
    }

    const summaryRows = [
      ["GTB 店铺费用与净利润报表"],
      ["开始日期", appliedFilters.startDate],
      ["结束日期", appliedFilters.endDate],
      ["账本基础货币", accountingOption.code],
      ["页面显示货币", currentOption.code],
      ["金额导出说明", "以下金额保留账本基础货币，不修改原始财务数据"],
      ["净营业额", profitSummary.netRevenue.toFixed(2)],
      ["真实毛利润", profitSummary.grossProfit.toFixed(2)],
      ["已付款费用", summary.paidTotal.toFixed(2)],
      ["待付款费用", summary.pendingTotal.toFixed(2)],
      ["最终净利润", finalNetProfit.toFixed(2)],
      ["费用率", `${expenseRatio.toFixed(2)}%`],
      [],
    ];

    const headers = [
      "费用编号",
      "费用日期",
      "分类",
      "费用名称",
      "收款方",
      "未税金额",
      "税额",
      "总金额",
      "付款方式",
      "付款状态",
      "到期日",
      "付款日",
      "重复费用",
      "重复周期",
      "参考编号",
      "备注",
    ];

    const dataRows = expenses.map((expense) => [
      expense.expense_no,
      expense.expense_date,
      expense.category?.category_name ?? "未分类",
      expense.title,
      expense.payee_name ?? "",
      toNumber(expense.subtotal).toFixed(2),
      toNumber(expense.tax_amount).toFixed(2),
      toNumber(expense.total_amount).toFixed(2),
      getPaymentMethodLabel(expense.payment_method),
      getPaymentStatusLabel(expense.payment_status),
      expense.due_date ?? "",
      expense.paid_date ?? "",
      expense.is_recurring ? "是" : "否",
      expense.recurring_frequency
        ? getRecurringFrequencyLabel(expense.recurring_frequency)
        : "",
      expense.reference_no ?? "",
      expense.notes ?? "",
    ]);

    const csv = [...summaryRows, headers, ...dataRows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `GTB-Expenses-${appliedFilters.startDate}-${appliedFilters.endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <main style={styles.page}>
      <style>
        {`
          .expenses-summary-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 14px;
          }

          .expenses-finance-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .expenses-form-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 15px;
          }

          .expenses-filter-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 11px;
          }

          .expenses-chart-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(320px, .8fr);
            gap: 18px;
          }

          .expenses-bottom-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(300px, .42fr);
            gap: 18px;
          }

          @media (max-width: 1350px) {
            .expenses-summary-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .expenses-finance-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .expenses-filter-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (max-width: 950px) {
            .expenses-form-grid,
            .expenses-chart-grid,
            .expenses-bottom-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .expenses-summary-grid,
            .expenses-finance-grid,
            .expenses-filter-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <header style={styles.pageHeader}>
        <div>
          <p style={styles.eyebrow}>OPERATING EXPENSE MANAGEMENT</p>
          <h1 style={styles.pageTitle}>店铺费用管理 / Expenses</h1>
          <p style={styles.pageDescription}>
            管理房租、工资、水电、广告、维修等营业费用，并计算最终净利润
          </p>

          <div style={styles.currencyStatusRow}>
            <span style={styles.currencyBadge}>
              账本基础：{accountingOption.flag} {accountingOption.code}
            </span>

            <span style={styles.currencyArrow}>→</span>

            <span style={styles.currencyBadge}>
              页面显示：{currentOption.flag} {currentOption.code}
            </span>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => void loadPageData(appliedFilters)}
            disabled={loading}
            style={{
              ...styles.secondaryButton,
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? "载入中..." : "↻ 刷新"}
          </button>

          <button
            type="button"
            onClick={exportExpensesCSV}
            style={styles.exportButton}
          >
            ↓ 导出费用 CSV
          </button>
        </div>
      </header>

      {error && (
        <div style={styles.errorBox}>
          <strong>费用资料载入失败</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="expenses-finance-grid" style={styles.sectionGap}>
        <KpiCard
          icon="💰"
          label="净营业额"
          english="NET REVENUE"
          value={formatMoney(profitSummary.netRevenue)}
          accent="#2563eb"
        />

        <KpiCard
          icon="📈"
          label="真实毛利润"
          english="GROSS PROFIT"
          value={formatMoney(profitSummary.grossProfit)}
          accent={profitSummary.grossProfit >= 0 ? "#16a34a" : "#dc2626"}
        />

        <KpiCard
          icon="💸"
          label="已付款营业费用"
          english="PAID OPERATING EXPENSES"
          value={formatMoney(summary.paidTotal)}
          accent="#ea580c"
        />

        <KpiCard
          icon="🏆"
          label="最终净利润"
          english="FINAL NET PROFIT"
          value={formatMoney(finalNetProfit)}
          accent={finalNetProfit >= 0 ? "#059669" : "#dc2626"}
        />
      </section>

      <section className="expenses-summary-grid" style={styles.sectionGap}>
        <SmallKpi
          label="费用率"
          value={`${expenseRatio.toFixed(2)}%`}
          hint="已付款费用 ÷ 净营业额"
          accent="#7c3aed"
        />

        <SmallKpi
          label="已付款"
          value={formatMoney(summary.paidTotal)}
          hint={`${summary.paidCount} 笔`}
          accent="#16a34a"
        />

        <SmallKpi
          label="待付款"
          value={formatMoney(summary.pendingTotal)}
          hint={`${summary.pendingCount} 笔`}
          accent="#d97706"
        />

        <SmallKpi
          label="税额合计"
          value={formatMoney(summary.taxTotal)}
          hint="Paid Tax Amount"
          accent="#0891b2"
        />

        <SmallKpi
          label="重复费用"
          value={`${summary.recurringCount}`}
          hint="Recurring Expenses"
          accent="#db2777"
        />

        <SmallKpi
          label="记录总数"
          value={`${summary.totalCount}`}
          hint={`已取消 ${summary.cancelledCount} 笔`}
          accent="#475569"
        />
      </section>

      <form onSubmit={saveExpense} style={styles.formCard}>
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.sectionEyebrow}>EXPENSE ENTRY</p>
            <h2 style={styles.cardTitle}>
              {editingId === null
                ? "新增费用 / New Expense"
                : "编辑费用 / Edit Expense"}
            </h2>
            <p style={styles.cardDescription}>
              总金额会自动按“未税金额 + 税额”计算；输入金额使用
              {" "}
              <strong>{currentOption.code}</strong>
              ，保存时自动换算为
              {" "}
              <strong>{accountingOption.code}</strong> 账本货币
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              style={styles.cancelEditButton}
            >
              取消编辑
            </button>
          )}
        </div>

        <div className="expenses-form-grid">
          <InputField
            label="费用日期 / Expense Date"
            type="date"
            value={form.expense_date}
            onChange={(value) => updateForm("expense_date", value)}
          />

          <label style={styles.field}>
            <span style={styles.fieldLabel}>费用分类 / Category</span>
            <select
              value={form.category_id}
              onChange={(event) =>
                updateForm("category_id", event.target.value)
              }
              style={styles.input}
            >
              <option value="">请选择分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.category_name}
                  {category.category_name_en
                    ? ` / ${category.category_name_en}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <InputField
            label="费用名称 / Title"
            value={form.title}
            placeholder="例如：7 月店铺租金"
            onChange={(value) => updateForm("title", value)}
          />

          <InputField
            label="收款方 / Payee"
            value={form.payee_name}
            placeholder="房东、供应商或员工姓名"
            onChange={(value) => updateForm("payee_name", value)}
          />

          <InputField
            label={`未税金额 / Subtotal (${displayCurrency})`}
            type="number"
            value={form.subtotal}
            placeholder={
              displayCurrency === "MMK"
                ? "0"
                : "0.00"
            }
            step={
              displayCurrency === "MMK"
                ? "1"
                : "0.01"
            }
            prefix={currentOption.symbol}
            hint={`保存到账本：${formatAccountingMoney(
              convertToAccounting(
                toNumber(form.subtotal)
              )
            )}`}
            onChange={(value) => updateForm("subtotal", value)}
          />

          <InputField
            label={`税额 / Tax Amount (${displayCurrency})`}
            type="number"
            value={form.tax_amount}
            placeholder={
              displayCurrency === "MMK"
                ? "0"
                : "0.00"
            }
            step={
              displayCurrency === "MMK"
                ? "1"
                : "0.01"
            }
            prefix={currentOption.symbol}
            hint={`保存到账本：${formatAccountingMoney(
              convertToAccounting(
                toNumber(form.tax_amount)
              )
            )}`}
            onChange={(value) => updateForm("tax_amount", value)}
          />

          <label style={styles.field}>
            <span style={styles.fieldLabel}>付款方式 / Payment Method</span>
            <select
              value={form.payment_method}
              onChange={(event) =>
                updateForm(
                  "payment_method",
                  event.target.value as ExpensePaymentMethod
                )
              }
              style={styles.input}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>付款状态 / Payment Status</span>
            <select
              value={form.payment_status}
              onChange={(event) => {
                const status = event.target.value as ExpensePaymentStatus;
                updateForm("payment_status", status);

                if (status === "paid" && !form.paid_date) {
                  updateForm("paid_date", todayInputValue());
                }
              }}
              style={styles.input}
            >
              <option value="paid">已付款 / Paid</option>
              <option value="pending">待付款 / Pending</option>
              <option value="cancelled">已取消 / Cancelled</option>
            </select>
          </label>

          <InputField
            label="参考编号 / Reference No."
            value={form.reference_no}
            placeholder="发票、转账或收据编号"
            onChange={(value) => updateForm("reference_no", value)}
          />

          <InputField
            label="到期日期 / Due Date"
            type="date"
            value={form.due_date}
            onChange={(value) => updateForm("due_date", value)}
          />

          <InputField
            label="付款日期 / Paid Date"
            type="date"
            value={form.paid_date}
            disabled={form.payment_status !== "paid"}
            onChange={(value) => updateForm("paid_date", value)}
          />

          <InputField
            label="收据图片链接 / Receipt URL"
            value={form.receipt_url}
            placeholder="https://..."
            onChange={(value) => updateForm("receipt_url", value)}
          />
        </div>

        <div className="expenses-form-grid" style={styles.textAreaGrid}>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>费用说明 / Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
              placeholder="记录费用用途或明细..."
              style={styles.textarea}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>内部备注 / Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
              placeholder="仅供内部查看..."
              style={styles.textarea}
            />
          </label>

          <div style={styles.recurringCard}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={(event) => {
                  updateForm("is_recurring", event.target.checked);

                  if (!event.target.checked) {
                    updateForm("recurring_frequency", "");
                  }
                }}
              />

              <span>
                <strong style={styles.optionTitle}>🔁 重复费用</strong>
                <small style={styles.optionHint}>
                  房租、工资、订阅等周期性费用
                </small>
              </span>
            </label>

            <select
              value={form.recurring_frequency}
              disabled={!form.is_recurring}
              onChange={(event) =>
                updateForm(
                  "recurring_frequency",
                  event.target.value as "" | RecurringFrequency
                )
              }
              style={{
                ...styles.input,
                marginTop: 12,
                opacity: form.is_recurring ? 1 : 0.55,
              }}
            >
              <option value="">选择重复周期</option>
              <option value="daily">每天 / Daily</option>
              <option value="weekly">每周 / Weekly</option>
              <option value="monthly">每月 / Monthly</option>
              <option value="quarterly">每季度 / Quarterly</option>
              <option value="yearly">每年 / Yearly</option>
            </select>
          </div>
        </div>

        <div style={styles.formTotalBar}>
          <div>
            <span style={styles.totalLabel}>费用总额 / Total Amount</span>
            <strong style={styles.totalValue}>
              {accountingOption.code === currentOption.code
                ? formatMoney(formTotalAccounting)
                : `${formatMoney(formTotalAccounting)} · 保存到账本 ${formatAccountingMoney(
                    formTotalAccounting
                  )}`}
            </strong>
          </div>

          <div style={styles.formTotalActions}>
            <button
              type="button"
              onClick={resetForm}
              style={styles.secondaryButton}
            >
              清空表单
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.primaryButton,
                opacity: saving ? 0.65 : 1,
              }}
            >
              {saving
                ? "保存中..."
                : editingId === null
                  ? "保存费用 / Save Expense"
                  : "保存修改 / Save Changes"}
            </button>
          </div>
        </div>
      </form>

      <section style={styles.filterCard}>
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.sectionEyebrow}>FILTER & SEARCH</p>
            <h2 style={styles.cardTitle}>费用筛选</h2>
          </div>
        </div>

        <div className="expenses-filter-grid">
          <InputField
            label="开始日期"
            type="date"
            value={filters.startDate}
            onChange={(value) => updateFilter("startDate", value)}
          />

          <InputField
            label="结束日期"
            type="date"
            value={filters.endDate}
            onChange={(value) => updateFilter("endDate", value)}
          />

          <label style={styles.field}>
            <span style={styles.fieldLabel}>分类</span>
            <select
              value={filters.categoryId}
              onChange={(event) =>
                updateFilter("categoryId", event.target.value)
              }
              style={styles.input}
            >
              <option value="">全部分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.category_name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>付款状态</span>
            <select
              value={filters.paymentStatus}
              onChange={(event) =>
                updateFilter(
                  "paymentStatus",
                  event.target.value as "all" | ExpensePaymentStatus
                )
              }
              style={styles.input}
            >
              <option value="all">全部状态</option>
              <option value="paid">已付款</option>
              <option value="pending">待付款</option>
              <option value="cancelled">已取消</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>付款方式</span>
            <select
              value={filters.paymentMethod}
              onChange={(event) =>
                updateFilter(
                  "paymentMethod",
                  event.target.value as "all" | ExpensePaymentMethod
                )
              }
              style={styles.input}
            >
              <option value="all">全部方式</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>

          <InputField
            label="关键词"
            value={filters.search}
            placeholder="费用名称、编号、收款方..."
            onChange={(value) => updateFilter("search", value)}
          />
        </div>

        <div style={styles.filterActions}>
          <button
            type="button"
            onClick={resetFilters}
            style={styles.secondaryButton}
          >
            重置筛选
          </button>

          <button
            type="button"
            onClick={applyFilters}
            style={styles.primaryButton}
          >
            应用筛选
          </button>
        </div>
      </section>

      <section className="expenses-chart-grid" style={styles.sectionGap}>
        <article style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.sectionEyebrow}>EXPENSE TREND</p>
              <h2 style={styles.cardTitle}>每日费用趋势</h2>
            </div>

            <strong style={{ color: "#ea580c" }}>
              {formatMoney(summary.paidTotal)}
            </strong>
          </div>

          <div style={styles.largeChart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyExpenseSummary}
                margin={{ top: 10, right: 20, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(value) => formatMoney(Number(value))}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatMoney(Number(value)),
                    name === "paid" ? "已付款" : "待付款",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "paid" ? "已付款" : "待付款"
                  }
                />
                <Bar dataKey="paid" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar
                  dataKey="pending"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.sectionEyebrow}>CATEGORY BREAKDOWN</p>
              <h2 style={styles.cardTitle}>费用分类占比</h2>
            </div>
          </div>

          {categorySummary.length === 0 ? (
            <div style={styles.emptyChart}>当前范围没有已付款费用</div>
          ) : (
            <>
              <div style={styles.mediumChart}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySummary}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {categorySummary.map((item) => (
                        <Cell key={item.id} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.categoryLegend}>
                {categorySummary.slice(0, 7).map((item) => (
                  <div key={item.id} style={styles.categoryLegendRow}>
                    <span style={styles.categoryLegendName}>
                      <i
                        style={{
                          ...styles.categoryDot,
                          background: item.color,
                        }}
                      />
                      {item.icon} {item.name}
                    </span>

                    <strong>{formatMoney(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <section className="expenses-bottom-grid" style={styles.sectionGap}>
        <article style={styles.tableCard}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.sectionEyebrow}>EXPENSE DETAILS</p>
              <h2 style={styles.cardTitle}>费用明细</h2>
            </div>

            <span style={styles.countBadge}>共 {expenses.length} 笔</span>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>日期</th>
                  <th style={styles.th}>费用编号</th>
                  <th style={styles.th}>分类</th>
                  <th style={styles.th}>费用名称</th>
                  <th style={styles.th}>收款方</th>
                  <th style={styles.th}>未税金额</th>
                  <th style={styles.th}>税额</th>
                  <th style={styles.th}>总金额</th>
                  <th style={styles.th}>付款方式</th>
                  <th style={styles.th}>状态</th>
                  <th style={styles.th}>到期 / 付款</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={styles.emptyTableCell}>
                      正在读取费用资料...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={styles.emptyTableCell}>
                      当前筛选范围没有费用记录
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td style={styles.td}>{expense.expense_date}</td>

                      <td style={styles.td}>
                        <div style={styles.referenceCell}>
                          <strong>{expense.expense_no}</strong>
                          {expense.reference_no && (
                            <small>{expense.reference_no}</small>
                          )}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.categoryBadge,
                            color: expense.category?.color ?? "#475569",
                            background: `${expense.category?.color ?? "#64748b"}15`,
                          }}
                        >
                          {expense.category?.icon ?? "💸"}{" "}
                          {expense.category?.category_name ?? "未分类"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.titleCell}>
                          <strong>{expense.title}</strong>
                          {expense.description && (
                            <small>{expense.description}</small>
                          )}
                          {expense.is_recurring && (
                            <span style={styles.recurringBadge}>
                              🔁 {expense.recurring_frequency
                                ? getRecurringFrequencyLabel(
                                    expense.recurring_frequency
                                  )
                                : "重复费用"}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={styles.td}>{expense.payee_name || "—"}</td>
                      <td style={styles.td}>{formatMoney(toNumber(expense.subtotal))}</td>
                      <td style={styles.td}>{formatMoney(toNumber(expense.tax_amount))}</td>

                      <td style={styles.td}>
                        <strong style={styles.amountText}>
                          {formatMoney(toNumber(expense.total_amount))}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {getPaymentMethodLabel(expense.payment_method)}
                      </td>

                      <td style={styles.td}>
                        <PaymentStatusBadge status={expense.payment_status} />
                      </td>

                      <td style={styles.td}>
                        <div style={styles.dateCell}>
                          {expense.due_date && <span>到期 {expense.due_date}</span>}
                          {expense.paid_date && <span>付款 {expense.paid_date}</span>}
                          {!expense.due_date && !expense.paid_date && <span>—</span>}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            type="button"
                            onClick={() => startEditing(expense)}
                            style={styles.editButton}
                          >
                            编辑
                          </button>

                          {expense.payment_status === "pending" && (
                            <button
                              type="button"
                              onClick={() => void markAsPaid(expense)}
                              style={styles.paidButton}
                            >
                              付款
                            </button>
                          )}

                          {expense.payment_status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => void cancelExpense(expense)}
                              style={styles.cancelButton}
                            >
                              取消
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void deleteExpense(expense)}
                            style={styles.deleteButton}
                          >
                            删除
                          </button>

                          {expense.receipt_url && (
                            <a
                              href={expense.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.receiptLink}
                            >
                              收据
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article style={styles.sideCard}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.sectionEyebrow}>UPCOMING PAYMENTS</p>
              <h2 style={styles.cardTitle}>待付款提醒</h2>
            </div>
          </div>

          {upcomingPendingExpenses.length === 0 ? (
            <div style={styles.emptySideState}>
              <span style={{ fontSize: 34 }}>✅</span>
              <strong>没有待付款费用</strong>
              <small>当前筛选范围内所有费用已处理</small>
            </div>
          ) : (
            <div style={styles.pendingList}>
              {upcomingPendingExpenses.map((expense) => (
                <div key={expense.id} style={styles.pendingItem}>
                  <div style={styles.pendingTopRow}>
                    <span style={styles.pendingTitle}>
                      {expense.category?.icon ?? "💸"} {expense.title}
                    </span>
                    <strong style={styles.pendingAmount}>
                      {formatMoney(toNumber(expense.total_amount))}
                    </strong>
                  </div>

                  <div style={styles.pendingMeta}>
                    <span>到期：{expense.due_date || "未设置"}</span>
                    <span>{expense.payee_name || "未填写收款方"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void markAsPaid(expense)}
                    style={styles.fullPaidButton}
                  >
                    标记为已付款
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.netProfitFormula}>
            <span>最终净利润公式</span>
            <strong>
              {formatMoney(profitSummary.grossProfit)} −{" "}
              {formatMoney(summary.paidTotal)} ={" "}
              {formatMoney(finalNetProfit)}
            </strong>
            <small>真实毛利润 − 已付款营业费用</small>
          </div>
        </article>
      </section>

      <footer style={styles.footer}>
        <span>
          报表日期：{appliedFilters.startDate} 至 {appliedFilters.endDate}
        </span>
        <span>最终净利润 = 真实毛利润 − 已付款营业费用</span>
        <span>GTB Auto Detailing & Window Film POS</span>
      </footer>
    </main>
  );
}

function KpiCard({
  icon,
  label,
  english,
  value,
  accent,
}: {
  icon: string;
  label: string;
  english: string;
  value: string;
  accent: string;
}) {
  return (
    <article
      style={{
        ...styles.kpiCard,
        borderTop: `4px solid ${accent}`,
      }}
    >
      <span
        style={{
          ...styles.kpiIcon,
          color: accent,
          background: `${accent}15`,
        }}
      >
        {icon}
      </span>

      <div>
        <p style={styles.kpiLabel}>{label}</p>
        <p style={styles.kpiEnglish}>{english}</p>
        <strong style={styles.kpiValue}>{value}</strong>
      </div>
    </article>
  );
}

function SmallKpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <article
      style={{
        ...styles.smallKpiCard,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <span style={styles.smallKpiLabel}>{label}</span>
      <strong style={{ ...styles.smallKpiValue, color: accent }}>
        {value}
      </strong>
      <small style={styles.smallKpiHint}>{hint}</small>
    </article>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  prefix,
  step,
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
  prefix?: string;
  step?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>

      <div style={styles.inputWrapper}>
        {prefix && <span style={styles.inputPrefix}>{prefix}</span>}

        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          min={type === "number" ? "0" : undefined}
          step={
            type === "number"
              ? step ?? "0.01"
              : undefined
          }
          onChange={(event) => onChange(event.target.value)}
          style={{
            ...styles.input,
            paddingLeft: prefix
              ? Math.max(52, prefix.length * 10 + 24)
              : 13,
            opacity: disabled ? 0.55 : 1,
          }}
        />
      </div>

      {hint && (
        <small style={styles.fieldHint}>
          {hint}
        </small>
      )}
    </label>
  );
}

function PaymentStatusBadge({
  status,
}: {
  status: ExpensePaymentStatus;
}) {
  const config = {
    paid: {
      label: "已付款",
      color: "#166534",
      background: "#dcfce7",
    },
    pending: {
      label: "待付款",
      color: "#92400e",
      background: "#fef3c7",
    },
    cancelled: {
      label: "已取消",
      color: "#b91c1c",
      background: "#fee2e2",
    },
  }[status];

  return (
    <span
      style={{
        ...styles.statusBadge,
        color: config.color,
        background: config.background,
      }}
    >
      {config.label}
    </span>
  );
}

const PAYMENT_METHODS: Array<{
  value: ExpensePaymentMethod;
  label: string;
}> = [
  { value: "cash", label: "现金 / Cash" },
  { value: "card", label: "银行卡 / Card" },
  { value: "bank_transfer", label: "银行转账 / Bank Transfer" },
  { value: "transfer", label: "转账 / Transfer" },
  { value: "kbzpay", label: "KBZPay" },
  { value: "wavepay", label: "WavePay" },
  { value: "mobile", label: "手机支付 / Mobile" },
  { value: "other", label: "其他 / Other" },
];

function getPaymentMethodLabel(method: ExpensePaymentMethod) {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
}

function getPaymentStatusLabel(status: ExpensePaymentStatus) {
  const labels: Record<ExpensePaymentStatus, string> = {
    paid: "已付款",
    pending: "待付款",
    cancelled: "已取消",
  };

  return labels[status];
}

function getRecurringFrequencyLabel(frequency: RecurringFrequency) {
  const labels: Record<RecurringFrequency, string> = {
    daily: "每天",
    weekly: "每周",
    monthly: "每月",
    quarterly: "每季度",
    yearly: "每年",
  };

  return labels[frequency];
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatCurrencyInput(
  value: number,
  currency: string
) {
  if (!Number.isFinite(value)) {
    return "";
  }

  const digits = currency === "MMK" ? 0 : 2;

  return value.toFixed(digits);
}

function roundAccountingAmount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(
      (error as { message?: unknown }).message ?? "操作失败"
    );
  }

  return "操作失败，请稍后重试";
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 28,
    background: "linear-gradient(135deg,#f8fafc 0%,#eff6ff 100%)",
    color: "#0f172a",
    boxSizing: "border-box",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 18,
    marginBottom: 22,
  },
  headerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  eyebrow: {
    margin: "0 0 7px",
    color: "#2563eb",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.5,
  },
  pageTitle: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.15,
  },
  pageDescription: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  currencyStatusRow: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyBadge: {
    padding: "6px 10px",
    border: "1px solid #bfdbfe",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 10,
    fontWeight: 850,
  },
  currencyArrow: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 900,
  },
  sectionGap: {
    marginBottom: 20,
  },
  errorBox: {
    marginBottom: 18,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    border: "1px solid #fecaca",
    borderRadius: 13,
    background: "#fef2f2",
    color: "#b91c1c",
  },
  kpiCard: {
    minHeight: 125,
    padding: 17,
    display: "flex",
    alignItems: "flex-start",
    gap: 13,
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,.05)",
  },
  kpiIcon: {
    width: 43,
    height: 43,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    borderRadius: 13,
    fontSize: 20,
  },
  kpiLabel: {
    margin: 0,
    color: "#334155",
    fontSize: 12,
    fontWeight: 850,
  },
  kpiEnglish: {
    margin: "3px 0 9px",
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: 750,
  },
  kpiValue: {
    fontSize: 23,
  },
  smallKpiCard: {
    minHeight: 100,
    padding: 15,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#ffffff",
    boxShadow: "0 8px 22px rgba(15,23,42,.04)",
  },
  smallKpiLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
  },
  smallKpiValue: {
    fontSize: 20,
  },
  smallKpiHint: {
    color: "#94a3b8",
    fontSize: 10,
  },
  formCard: {
    marginBottom: 20,
    padding: 23,
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 12px 34px rgba(15,23,42,.06)",
  },
  filterCard: {
    marginBottom: 20,
    padding: 20,
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 10px 28px rgba(15,23,42,.05)",
  },
  chartCard: {
    minWidth: 0,
    padding: 21,
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(15,23,42,.05)",
  },
  tableCard: {
    minWidth: 0,
    padding: 21,
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(15,23,42,.05)",
  },
  sideCard: {
    minWidth: 0,
    padding: 20,
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(15,23,42,.05)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 17,
  },
  sectionEyebrow: {
    margin: "0 0 4px",
    color: "#64748b",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  cardTitle: {
    margin: 0,
    fontSize: 20,
  },
  cardDescription: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
  },
  fieldHint: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.5,
  },
  inputWrapper: {
    position: "relative",
  },
  inputPrefix: {
    position: "absolute",
    left: 13,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
    fontWeight: 800,
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    minHeight: 44,
    padding: "0 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 11,
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: 120,
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 11,
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    lineHeight: 1.6,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  textAreaGrid: {
    marginTop: 18,
  },
  recurringCard: {
    padding: 15,
    border: "1px solid #e2e8f0",
    borderRadius: 13,
    background: "#f8fafc",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    cursor: "pointer",
  },
  optionTitle: {
    display: "block",
    color: "#334155",
    fontSize: 13,
  },
  optionHint: {
    display: "block",
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 10,
  },
  formTotalBar: {
    marginTop: 20,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 15,
    border: "1px solid #bfdbfe",
    borderRadius: 14,
    background: "linear-gradient(135deg,#eff6ff,#ffffff)",
  },
  totalLabel: {
    display: "block",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
  },
  totalValue: {
    display: "block",
    marginTop: 4,
    color: "#2563eb",
    fontSize: 27,
  },
  formTotalActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 9,
  },
  primaryButton: {
    minHeight: 42,
    padding: "0 15px",
    border: "none",
    borderRadius: 10,
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 850,
  },
  secondaryButton: {
    minHeight: 42,
    padding: "0 15px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 800,
  },
  exportButton: {
    minHeight: 42,
    padding: "0 15px",
    border: "none",
    borderRadius: 10,
    background: "#16a34a",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 850,
  },
  cancelEditButton: {
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 800,
  },
  filterActions: {
    marginTop: 15,
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 9,
  },
  largeChart: {
    width: "100%",
    height: 330,
  },
  mediumChart: {
    width: "100%",
    height: 240,
  },
  emptyChart: {
    minHeight: 270,
    display: "grid",
    placeItems: "center",
    color: "#94a3b8",
  },
  categoryLegend: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  categoryLegendRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#475569",
    fontSize: 12,
  },
  categoryLegendName: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    display: "inline-block",
    borderRadius: 999,
  },
  countBadge: {
    padding: "7px 10px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 850,
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: 1580,
    borderCollapse: "collapse",
  },
  th: {
    padding: "12px 10px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#64748b",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 10px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    fontSize: 12,
    verticalAlign: "middle",
  },
  emptyTableCell: {
    padding: 45,
    color: "#94a3b8",
    textAlign: "center",
  },
  referenceCell: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  titleCell: {
    display: "flex",
    maxWidth: 260,
    flexDirection: "column",
    gap: 4,
  },
  recurringBadge: {
    width: "fit-content",
    padding: "4px 7px",
    borderRadius: 999,
    background: "#fce7f3",
    color: "#9d174d",
    fontSize: 9,
    fontWeight: 800,
  },
  categoryBadge: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  statusBadge: {
    display: "inline-flex",
    padding: "6px 9px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  amountText: {
    color: "#dc2626",
  },
  dateCell: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    whiteSpace: "nowrap",
  },
  actionGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  editButton: {
    minHeight: 32,
    padding: "0 9px",
    border: "none",
    borderRadius: 8,
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
  },
  paidButton: {
    minHeight: 32,
    padding: "0 9px",
    border: "none",
    borderRadius: 8,
    background: "#dcfce7",
    color: "#166534",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
  },
  cancelButton: {
    minHeight: 32,
    padding: "0 9px",
    border: "none",
    borderRadius: 8,
    background: "#fef3c7",
    color: "#92400e",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
  },
  deleteButton: {
    minHeight: 32,
    padding: "0 9px",
    border: "none",
    borderRadius: 8,
    background: "#fee2e2",
    color: "#b91c1c",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
  },
  receiptLink: {
    minHeight: 32,
    padding: "0 9px",
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 8,
    background: "#f1f5f9",
    color: "#475569",
    textDecoration: "none",
    fontSize: 10,
    fontWeight: 800,
  },
  pendingList: {
    display: "flex",
    flexDirection: "column",
    gap: 11,
  },
  pendingItem: {
    padding: 13,
    border: "1px solid #fde68a",
    borderRadius: 12,
    background: "#fffbeb",
  },
  pendingTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  pendingTitle: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 850,
  },
  pendingAmount: {
    color: "#b45309",
    whiteSpace: "nowrap",
  },
  pendingMeta: {
    marginTop: 7,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    color: "#64748b",
    fontSize: 10,
  },
  fullPaidButton: {
    width: "100%",
    minHeight: 35,
    marginTop: 10,
    border: "none",
    borderRadius: 9,
    background: "#16a34a",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 850,
  },
  emptySideState: {
    minHeight: 230,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    color: "#64748b",
    textAlign: "center",
  },
  netProfitFormula: {
    marginTop: 16,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    background: "#f0fdf4",
    color: "#166534",
    fontSize: 11,
  },
  footer: {
    marginTop: 20,
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    color: "#94a3b8",
    fontSize: 10,
  },
};

export default Expenses;