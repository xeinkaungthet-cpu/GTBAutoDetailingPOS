export interface Member {
  id: number;
  name: string;
  phone: string;
  email?: string;
  points: number;
  balance: number;
  created_at?: string;
}

export interface Vehicle {
  id: number;
  member_id: number;
  plate_number: string;
  brand: string;
  model: string;
  color?: string;
  created_at?: string;
}

export interface Service {
  id: number;

  service_name: string;
  service_name_en?: string;

  description?: string;
  description_en?: string;

  category: string;
  price: number;
  duration_minutes: number;
  
  is_active: boolean;
is_popular?: boolean;
is_recommended?: boolean;

rating?: number;
review_count?: number;

  image_url?: string;
  before_image?: string;
after_image?: string;

  created_at?: string;
  
}

export interface Product {
  id: number;
  product_name: string;
  category?: string;
  stock: number;
  price: number;
  cost?: number;
  created_at?: string;
}

export interface Order {
  id: number;
  order_no: string;
  member_id?: number;
  vehicle_id?: number;
  employee_id?: number;
  subtotal?: number;
  discount?: number;
  total: number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  notes?: string;
  created_at?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  service_id?: number;
  product_id?: number;
  quantity: number;
  unit_price: number;
  discount?: number;
  total: number;
  created_at?: string;
  services?: Service;
}

export interface Appointment {
  id: number;
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
  created_at?: string;
}

export interface Inspection {
  id: number;
  inspection_no: string;
  appointment_id?: number;
  member_id?: number;
  vehicle_id?: number;
  order_id?: number;
  customer_name?: string;
  phone?: string;
  plate_number?: string;
  vehicle_model?: string;
  inspection_type?: string;
  condition_notes?: string;
  damage_summary?: string;
  status?: string;
  customer_signature?: string;
  created_at?: string;
}

export interface InspectionPhoto {
  id: number;
  inspection_id: number;
  photo_url: string;
  photo_type?: string;
  created_at?: string;
}

export interface InspectionDamage {
  id: number;
  inspection_id: number;
  area: string;
  damage_type: string;
  severity?: number;
  notes?: string;
  created_at?: string;
}