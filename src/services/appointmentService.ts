import { supabase } from "../lib/supabase";
import type { Appointment } from "../types/database";

export const AppointmentService = {
  async getAll(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as Appointment[];
},

  async create(appointment: {
    appointment_no: string;
    customer_name: string;
    phone: string;
    vehicle_plate?: string;
    vehicle_model?: string;
    service_ids?: string;
    appointment_date?: string;
    appointment_time?: string;
    status?: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          ...appointment,
          status: appointment.status ?? "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data as Appointment;
  },

  async updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  },
};