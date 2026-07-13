import { supabase } from "../lib/supabase";
import type { Service } from "../types/database";

export const ServiceService = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("category")
      .order("price");

    if (error) throw error;

    return data as Service[];
  },

  async create(service: {
    service_name: string;
    category: string;
    price: number;
    duration_minutes: number;
    is_active?: boolean;
  }) {
    const { error } = await supabase.from("services").insert([
      {
        ...service,
        is_active: service.is_active ?? true,
      },
    ]);

    if (error) throw error;
  },

  async update(id: number, service: Partial<Service>) {
    const { error } = await supabase
      .from("services")
      .update(service)
      .eq("id", id);

    if (error) throw error;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};