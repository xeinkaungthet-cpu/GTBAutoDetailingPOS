import { supabase } from "../lib/supabase";

export const OrderService = {
  // 获取全部订单（最新在前）
  async getAll() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        members (
          id,
          name,
          phone
        ),
        vehicles (
          id,
          plate_number,
          brand,
          model,
          color
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data ?? [];
  },

  // 获取单张订单
  async getById(orderId: number) {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        members (*),
        vehicles (*)
      `)
      .eq("id", orderId)
      .single();

    if (error) throw error;

    return data;
  },

  // 获取订单项目
 // 获取订单项目
async getItems(orderId: number) {
  const { data, error } = await supabase
    .from("order_items")
    .select(`
      *,

      services (
        id,
        service_name,
        category,
        price,
        duration_minutes
      ),

      products (*),

      packages (
        id,
        package_name,
        package_name_en,
        description,
        description_en,
        original_price,
        package_price,
        estimated_minutes,
        image_url,

        package_services (
          id,
          service_id,
          sort_order,

          services (
            id,
            service_name,
            category,
            price,
            duration_minutes
          )
        )
      )
    `)
    .eq("order_id", orderId)
    .order("id", {
      ascending: true,
    });

  if (error) throw error;

  return data ?? [];
},

  // 更新订单状态
  async updateStatus(
    orderId: number,
    status: string
  ) {
    const { error } = await supabase
      .from("orders")
      .update({
        status,
      })
      .eq("id", orderId);

    if (error) throw error;
  },

  // 删除订单
  async delete(orderId: number) {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) throw error;
  },
};