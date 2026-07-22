import { supabase } from "../lib/supabase";

export type ExpensePaymentMethod =
  | "cash"
  | "card"
  | "transfer"
  | "bank_transfer"
  | "kbzpay"
  | "wavepay"
  | "mobile"
  | "other";

export type ExpensePaymentStatus =
  | "pending"
  | "paid"
  | "cancelled";

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface ExpenseCategory {
  id: number;

  category_name: string;
  category_name_en?: string | null;

  icon: string;
  color: string;

  sort_order: number;
  is_active: boolean;

  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: number;

  expense_no: string;
  expense_date: string;

  category_id?: number | null;

  title: string;
  description?: string | null;

  payee_name?: string | null;
  reference_no?: string | null;

  subtotal: number | string;
  tax_amount: number | string;
  total_amount: number | string;

  payment_method: ExpensePaymentMethod;
  payment_status: ExpensePaymentStatus;

  due_date?: string | null;
  paid_date?: string | null;

  is_recurring: boolean;

  recurring_frequency?:
    | RecurringFrequency
    | null;

  receipt_url?: string | null;
  notes?: string | null;

  created_at?: string;
  updated_at?: string;

  category?: ExpenseCategory | null;
}

export type ExpensePayload = {
  expense_date: string;

  category_id?: number | null;

  title: string;
  description?: string | null;

  payee_name?: string | null;
  reference_no?: string | null;

  subtotal: number;
  tax_amount: number;

  payment_method: ExpensePaymentMethod;
  payment_status: ExpensePaymentStatus;

  due_date?: string | null;
  paid_date?: string | null;

  is_recurring: boolean;

  recurring_frequency?:
    | RecurringFrequency
    | null;

  receipt_url?: string | null;
  notes?: string | null;
};

export type ExpenseFilters = {
  startDate?: string;
  endDate?: string;

  categoryId?: number | null;

  paymentStatus?:
    | ExpensePaymentStatus
    | "all";

  paymentMethod?:
    | ExpensePaymentMethod
    | "all";

  search?: string;
};

const expenseSelect = `
  *,
  category:expense_categories (
    id,
    category_name,
    category_name_en,
    icon,
    color,
    sort_order,
    is_active
  )
`;

function normalizeOptionalText(
  value?: string | null
) {
  const normalized = value?.trim();

  return normalized || null;
}

function validateExpensePayload(
  payload: Partial<ExpensePayload>
) {
  if (
    payload.title !== undefined &&
    !payload.title.trim()
  ) {
    throw new Error("请输入费用名称");
  }

  if (
    payload.subtotal !== undefined &&
    (
      !Number.isFinite(
        Number(payload.subtotal)
      ) ||
      Number(payload.subtotal) < 0
    )
  ) {
    throw new Error(
      "费用金额不能小于 0"
    );
  }

  if (
    payload.tax_amount !== undefined &&
    (
      !Number.isFinite(
        Number(payload.tax_amount)
      ) ||
      Number(payload.tax_amount) < 0
    )
  ) {
    throw new Error(
      "税额不能小于 0"
    );
  }

  if (
    payload.is_recurring === true &&
    !payload.recurring_frequency
  ) {
    throw new Error(
      "请选择重复费用周期"
    );
  }

  if (
    payload.payment_status === "paid" &&
    !payload.paid_date
  ) {
    throw new Error(
      "已付款费用需要填写付款日期"
    );
  }
}

function normalizePayload(
  payload: ExpensePayload
): ExpensePayload {
  return {
    expense_date: payload.expense_date,

    category_id:
      payload.category_id ?? null,

    title: payload.title.trim(),

    description:
      normalizeOptionalText(
        payload.description
      ),

    payee_name:
      normalizeOptionalText(
        payload.payee_name
      ),

    reference_no:
      normalizeOptionalText(
        payload.reference_no
      ),

    subtotal: Number(
      payload.subtotal
    ),

    tax_amount: Number(
      payload.tax_amount
    ),

    payment_method:
      payload.payment_method,

    payment_status:
      payload.payment_status,

    due_date:
      payload.due_date || null,

    paid_date:
      payload.payment_status === "paid"
        ? payload.paid_date || null
        : null,

    is_recurring:
      payload.is_recurring,

    recurring_frequency:
      payload.is_recurring
        ? payload.recurring_frequency ??
          null
        : null,

    receipt_url:
      normalizeOptionalText(
        payload.receipt_url
      ),

    notes:
      normalizeOptionalText(
        payload.notes
      ),
  };
}

function sanitizeSearchTerm(
  value: string
) {
  return value
    .trim()
    .replace(/[,%()]/g, " ");
}

export const ExpenseService = {
  async getCategories(
    includeInactive = false
  ): Promise<ExpenseCategory[]> {
    let query = supabase
      .from("expense_categories")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .order("id", {
        ascending: true,
      });

    if (!includeInactive) {
      query = query.eq(
        "is_active",
        true
      );
    }

    const { data, error } =
      await query;

    if (error) {
      throw error;
    }

    return (
      (data ?? []) as ExpenseCategory[]
    );
  },

  async getAll(
    filters: ExpenseFilters = {}
  ): Promise<Expense[]> {
    let query = supabase
      .from("expenses")
      .select(expenseSelect)
      .order("expense_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (filters.startDate) {
      query = query.gte(
        "expense_date",
        filters.startDate
      );
    }

    if (filters.endDate) {
      query = query.lte(
        "expense_date",
        filters.endDate
      );
    }

    if (
      filters.categoryId !== undefined &&
      filters.categoryId !== null
    ) {
      query = query.eq(
        "category_id",
        filters.categoryId
      );
    }

    if (
      filters.paymentStatus &&
      filters.paymentStatus !== "all"
    ) {
      query = query.eq(
        "payment_status",
        filters.paymentStatus
      );
    }

    if (
      filters.paymentMethod &&
      filters.paymentMethod !== "all"
    ) {
      query = query.eq(
        "payment_method",
        filters.paymentMethod
      );
    }

    const keyword =
      filters.search
        ? sanitizeSearchTerm(
            filters.search
          )
        : "";

    if (keyword) {
      query = query.or(
        [
          `expense_no.ilike.%${keyword}%`,
          `title.ilike.%${keyword}%`,
          `description.ilike.%${keyword}%`,
          `payee_name.ilike.%${keyword}%`,
          `reference_no.ilike.%${keyword}%`,
          `notes.ilike.%${keyword}%`,
        ].join(",")
      );
    }

    const { data, error } =
      await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as Expense[];
  },

  async getById(
    expenseId: number
  ): Promise<Expense> {
    const normalizedId =
      Number(expenseId);

    if (
      !Number.isInteger(
        normalizedId
      ) ||
      normalizedId <= 0
    ) {
      throw new Error(
        "费用编号不正确"
      );
    }

    const { data, error } =
      await supabase
        .from("expenses")
        .select(expenseSelect)
        .eq("id", normalizedId)
        .single();

    if (error) {
      throw error;
    }

    return data as Expense;
  },

  async create(
    payload: ExpensePayload
  ): Promise<Expense> {
    validateExpensePayload(
      payload
    );

    const normalizedPayload =
      normalizePayload(payload);

    const { data, error } =
      await supabase
        .from("expenses")
        .insert([
          normalizedPayload,
        ])
        .select(expenseSelect)
        .single();

    if (error) {
      throw error;
    }

    return data as Expense;
  },

  async update(
    expenseId: number,
    payload: ExpensePayload
  ): Promise<Expense> {
    const normalizedId =
      Number(expenseId);

    if (
      !Number.isInteger(
        normalizedId
      ) ||
      normalizedId <= 0
    ) {
      throw new Error(
        "费用编号不正确"
      );
    }

    validateExpensePayload(
      payload
    );

    const normalizedPayload =
      normalizePayload(payload);

    const { data, error } =
      await supabase
        .from("expenses")
        .update(normalizedPayload)
        .eq("id", normalizedId)
        .select(expenseSelect)
        .single();

    if (error) {
      throw error;
    }

    return data as Expense;
  },

  async markAsPaid(
    expenseId: number,
    paidDate: string
  ): Promise<Expense> {
    const normalizedId =
      Number(expenseId);

    if (
      !Number.isInteger(
        normalizedId
      ) ||
      normalizedId <= 0
    ) {
      throw new Error(
        "费用编号不正确"
      );
    }

    if (!paidDate) {
      throw new Error(
        "请选择付款日期"
      );
    }

    const { data, error } =
      await supabase
        .from("expenses")
        .update({
          payment_status: "paid",
          paid_date: paidDate,
        })
        .eq("id", normalizedId)
        .select(expenseSelect)
        .single();

    if (error) {
      throw error;
    }

    return data as Expense;
  },

  async updateStatus(
    expenseId: number,
    paymentStatus:
      ExpensePaymentStatus
  ): Promise<Expense> {
    const normalizedId =
      Number(expenseId);

    if (
      !Number.isInteger(
        normalizedId
      ) ||
      normalizedId <= 0
    ) {
      throw new Error(
        "费用编号不正确"
      );
    }

    const { data, error } =
      await supabase
        .from("expenses")
        .update({
          payment_status:
            paymentStatus,

          paid_date:
            paymentStatus === "paid"
              ? new Date()
                  .toISOString()
                  .slice(0, 10)
              : null,
        })
        .eq("id", normalizedId)
        .select(expenseSelect)
        .single();

    if (error) {
      throw error;
    }

    return data as Expense;
  },

  async delete(
    expenseId: number
  ): Promise<void> {
    const normalizedId =
      Number(expenseId);

    if (
      !Number.isInteger(
        normalizedId
      ) ||
      normalizedId <= 0
    ) {
      throw new Error(
        "费用编号不正确"
      );
    }

    const { error } =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", normalizedId);

    if (error) {
      throw error;
    }
  },

  async getPaidTotalBetween(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const { data, error } =
      await supabase
        .from("expenses")
        .select("total_amount")
        .eq(
          "payment_status",
          "paid"
        )
        .gte(
          "expense_date",
          startDate
        )
        .lte(
          "expense_date",
          endDate
        );

    if (error) {
      throw error;
    }

    return (data ?? []).reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.total_amount ?? 0
        ),
      0
    );
  },
};