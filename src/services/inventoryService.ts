import { supabase } from "../lib/supabase";

export type InventoryAction = "increase" | "decrease" | "set";

export interface AdjustInventoryInput {
  productId: number;
  action: InventoryAction;
  quantity: number;
  reason: string;
  notes?: string;
}

export interface InventoryAdjustmentResult {
  success: boolean;
  changed: boolean;
  message: string;

  product_id: number;
  product_name: string;

  action?: InventoryAction;

  stock_before: number;
  quantity_change: number;
  stock_after: number;

  adjustment_id?: number;
  movement_id?: number;
  employee_id?: number;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  movement_type: string;

  quantity_change: number;
  stock_before: number;
  stock_after: number;

  unit_cost: number | null;

  reference_type: string | null;
  reference_id: number | null;
  stock_adjustment_id: number | null;

  reason: string | null;
  notes: string | null;

  performed_by_employee_id: number | null;
  performed_by_auth_user_id: string | null;

  created_at: string;
}

export const InventoryService = {
  /**
   * 安全调整库存
   *
   * increase：增加库存
   * decrease：减少库存
   * set：盘点后直接设置库存
   */
  async adjustStock(
    input: AdjustInventoryInput
  ): Promise<InventoryAdjustmentResult> {
    const quantity = Number(input.quantity);

    if (!Number.isInteger(quantity)) {
      throw new Error("库存数量必须是整数。");
    }

    if (!input.reason.trim()) {
      throw new Error("必须填写库存调整原因。");
    }

    if (
      (input.action === "increase" ||
        input.action === "decrease") &&
      quantity <= 0
    ) {
      throw new Error("增加或减少的数量必须大于 0。");
    }

    if (input.action === "set" && quantity < 0) {
      throw new Error("盘点库存不能小于 0。");
    }

    const { data, error } = await supabase.rpc(
      "inventory_adjust",
      {
        p_product_id: input.productId,
        p_action: input.action,
        p_quantity: quantity,
        p_reason: input.reason.trim(),
        p_notes: input.notes?.trim() || null,
      }
    );

    if (error) {
      console.error("Inventory adjustment error:", error);

      throw new Error(
        error.message || "库存调整失败，请稍后再试。"
      );
    }

    const result =
      data as InventoryAdjustmentResult | null;

    if (!result) {
      throw new Error("库存调整失败：数据库没有返回结果。");
    }

    if (!result.success) {
      throw new Error(
        result.message || "库存调整没有成功。"
      );
    }

    return result;
  },

  /**
   * 获取库存流水
   * 不传 productId 时读取全部产品流水
   */
  async getMovements(
    productId?: number
  ): Promise<InventoryMovement[]> {
    let query = supabase
      .from("inventory_movements")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (productId !== undefined) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Load inventory movements error:",
        error
      );

      throw new Error(
        error.message || "读取库存流水失败。"
      );
    }

    return (data ?? []) as InventoryMovement[];
  },

  /**
   * 获取某一个产品的当前库存
   */
  async getProductStock(productId: number) {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
          id,
          sku,
          product_name,
          stock_qty,
          min_stock,
          unit,
          cost_price,
          selling_price,
          is_active
        `
      )
      .eq("id", productId)
      .single();

    if (error) {
      console.error(
        "Load product stock error:",
        error
      );

      throw new Error(
        error.message || "读取产品库存失败。"
      );
    }

    return data;
  },
};