import { supabase } from "../lib/supabase";

/* =========================================================
   退款操作参数
========================================================= */

export type RefundOrderInput = {
  orderId: number;
  reason: string;
  refundMethod: string;
  notes?: string;
};

/* =========================================================
   退款 RPC 返回结果
========================================================= */

export type RefundOrderResult = {
  refund_id?: number;
  refund_no?: string;
  order_id?: number;

  refund_amount?: number;
  refund_item_count?: number;
  restock_quantity?: number;

  message?: string;
};

/* =========================================================
   退款项目
========================================================= */

export type RefundItemRecord = {
  id: number;
  refund_id: number;
  order_item_id: number;

  item_type: string;

  product_id: number | null;
  service_id: number | null;
  package_id: number | null;

  item_name: string | null;

  quantity: number;
  unit_price: number | string;
  refund_amount: number | string;

  restock: boolean;

  created_at: string;
};

/* =========================================================
   原订单关联资料
========================================================= */

export type RefundOrderMember = {
  id: number;
  name: string | null;
  phone: string | null;
};

export type RefundOrderVehicle = {
  id: number;
  plate_number: string | null;
  brand: string | null;
  model: string | null;
};

export type RefundOriginalOrder = {
  id: number;
  order_no: string | null;

  member_id: number | null;
  vehicle_id: number | null;

  subtotal: number | string | null;
  discount: number | string | null;
  total: number | string | null;

  payment_method: string | null;
  payment_status: string | null;
  status: string | null;

  created_at: string | null;

  members: RefundOrderMember | null;
  vehicles: RefundOrderVehicle | null;
};

/* =========================================================
   完整退款记录
========================================================= */

export type RefundRecord = {
  id: number;
  refund_no: string;

  order_id: number;
  refund_type: string;

  refund_amount: number | string;

  refund_method: string | null;
  reason: string;
  status: string;
  notes: string | null;

  created_by_auth_user_id: string | null;
  created_by_employee_id: number | null;

  created_at: string;
  completed_at: string | null;

  orders: RefundOriginalOrder | null;
  refund_items: RefundItemRecord[];
};

/* =========================================================
   Supabase 查询字段
========================================================= */

const refundSelect = `
  id,
  refund_no,
  order_id,
  refund_type,
  refund_amount,
  refund_method,
  reason,
  status,
  notes,
  created_by_auth_user_id,
  created_by_employee_id,
  created_at,
  completed_at,

  orders (
    id,
    order_no,
    member_id,
    vehicle_id,
    subtotal,
    discount,
    total,
    payment_method,
    payment_status,
    status,
    created_at,

    members (
      id,
      name,
      phone
    ),

    vehicles (
      id,
      plate_number,
      brand,
      model
    )
  ),

  refund_items (
    id,
    refund_id,
    order_item_id,
    item_type,
    product_id,
    service_id,
    package_id,
    item_name,
    quantity,
    unit_price,
    refund_amount,
    restock,
    created_at
  )
`;

/* =========================================================
   退款服务
========================================================= */

export const RefundService = {
  /**
   * 整单退款
   */
  async refundOrder(
    input: RefundOrderInput
  ): Promise<RefundOrderResult> {
    const orderId = Number(input.orderId);
    const reason = input.reason.trim();
    const refundMethod = input.refundMethod.trim();
    const notes = input.notes?.trim() || null;

    if (!Number.isFinite(orderId) || orderId <= 0) {
      throw new Error("退款失败：订单编号不正确。");
    }

    if (!reason) {
      throw new Error("退款失败：请填写退款原因。");
    }

    if (!refundMethod) {
      throw new Error("退款失败：请选择退款方式。");
    }

    const { data, error } = await supabase.rpc(
      "refund_order",
      {
        p_order_id: orderId,
        p_reason: reason,
        p_refund_method: refundMethod,
        p_notes: notes,
      }
    );

    if (error) {
      throw new Error(
        error.message || "退款失败，请稍后重试。"
      );
    }

    const result = Array.isArray(data)
      ? data[0]
      : data;

    if (!result) {
      throw new Error(
        "退款已经执行，但系统没有返回退款结果。请检查退款记录。"
      );
    }

    return result as RefundOrderResult;
  },

  /**
   * 读取全部退款记录
   */
  async getAll(): Promise<RefundRecord[]> {
    const { data, error } = await supabase
      .from("refunds")
      .select(refundSelect)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(
        error.message || "读取退款记录失败。"
      );
    }

    return (data ?? []) as unknown as RefundRecord[];
  },

  /**
   * 根据退款 ID 读取一笔退款
   */
  async getById(
    refundId: number
  ): Promise<RefundRecord> {
    const normalizedId = Number(refundId);

    if (
      !Number.isFinite(normalizedId) ||
      normalizedId <= 0
    ) {
      throw new Error("退款记录编号不正确。");
    }

    const { data, error } = await supabase
      .from("refunds")
      .select(refundSelect)
      .eq("id", normalizedId)
      .single();

    if (error) {
      throw new Error(
        error.message || "读取退款详情失败。"
      );
    }

    return data as unknown as RefundRecord;
  },

  /**
   * 根据原订单 ID 查询退款记录
   */
  async getByOrderId(
    orderId: number
  ): Promise<RefundRecord[]> {
    const normalizedId = Number(orderId);

    if (
      !Number.isFinite(normalizedId) ||
      normalizedId <= 0
    ) {
      throw new Error("订单编号不正确。");
    }

    const { data, error } = await supabase
      .from("refunds")
      .select(refundSelect)
      .eq("order_id", normalizedId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(
        error.message || "读取订单退款记录失败。"
      );
    }

    return (data ?? []) as unknown as RefundRecord[];
  },
};