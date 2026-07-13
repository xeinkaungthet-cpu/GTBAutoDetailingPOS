import { supabase } from "../lib/supabase";
import type { Vehicle } from "../types/database";

export const VehicleService = {
  async getAll(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("id");

    if (error) throw error;

    return data as Vehicle[];
  },

  async getByMemberId(memberId: number): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("member_id", memberId)
      .order("id");

    if (error) throw error;

    return data as Vehicle[];
  },

  async create(vehicle: {
    member_id: number;
    plate_number: string;
    brand: string;
    model: string;
    color?: string;
  }) {
    const { error } = await supabase.from("vehicles").insert([vehicle]);

    if (error) throw error;
  },
};