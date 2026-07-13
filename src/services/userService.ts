import { supabase } from "../lib/supabase";

export const UserService = {
  async getAll() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("id");

    if (error) throw error;

    return data;
  },

  async create(user: {
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    is_active: boolean;
  }) {
    const { data, error } = await supabase
      .from("users")
      .insert([user])
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async updateRole(id: number, role: string) {
    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id);

    if (error) throw error;
  },

  async updateStatus(id: number, is_active: boolean) {
    const { error } = await supabase
      .from("users")
      .update({ is_active })
      .eq("id", id);

    if (error) throw error;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};