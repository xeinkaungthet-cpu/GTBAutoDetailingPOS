import { supabase } from "../lib/supabase";
import type { Member } from "../types/database";

export const MemberService = {
  async getAll(): Promise<Member[]> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("id");

    if (error) {
      throw error;
    }

    return data as Member[];
  },

  async create(member: {
    name: string;
    phone: string;
    points?: number;
    balance?: number;
  }) {
    const { error } = await supabase.from("members").insert([
      {
        name: member.name,
        phone: member.phone,
        points: member.points ?? 0,
        balance: member.balance ?? 0,
      },
    ]);

    if (error) {
      throw error;
    }
  },
};