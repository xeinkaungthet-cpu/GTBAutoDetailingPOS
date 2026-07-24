import { supabase } from "../lib/supabase";

export type VehicleSizeCode =
  | "small"
  | "medium"
  | "suv"
  | "large";

export interface VehicleSizeOption {
  code: VehicleSizeCode;
  name_zh: string;
  name_en: string;
  icon: string;
  description_zh?: string | null;
  description_en?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceVehiclePrice {
  id: number;
  service_id: number;
  vehicle_size_code: VehicleSizeCode;

  price: number | string;
  cost_price: number | string;
  duration_minutes: number | string;

  is_active: boolean;

  created_at?: string;
  updated_at?: string;

  vehicle_size_options?: VehicleSizeOption | null;
}

export interface PackageVehiclePrice {
  id: number;
  package_id: number;
  vehicle_size_code: VehicleSizeCode;

  price: number | string;
  cost_price: number | string;
  duration_minutes: number | string;

  is_active: boolean;

  created_at?: string;
  updated_at?: string;

  vehicle_size_options?: VehicleSizeOption | null;
}

export interface VehiclePricePayload {
  vehicle_size_code: VehicleSizeCode;
  price: number;
  cost_price: number;
  duration_minutes: number;
  is_active: boolean;
}

function validatePricePayload(
  payload: VehiclePricePayload
) {
  if (
    !Number.isFinite(payload.price) ||
    payload.price < 0
  ) {
    throw new Error("销售价格不能小于 0");
  }

  if (
    !Number.isFinite(payload.cost_price) ||
    payload.cost_price < 0
  ) {
    throw new Error("内部成本不能小于 0");
  }

  if (
    !Number.isFinite(payload.duration_minutes) ||
    payload.duration_minutes < 0
  ) {
    throw new Error("施工时间不能小于 0");
  }
}

export const VehiclePricingService = {
  async getVehicleSizes(
    activeOnly = true
  ): Promise<VehicleSizeOption[]> {
    let query = supabase
      .from("vehicle_size_options")
      .select("*")
      .order("sort_order", {
        ascending: true,
      });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as VehicleSizeOption[];
  },

  async getServicePrices(
    serviceId: number,
    activeOnly = false
  ): Promise<ServiceVehiclePrice[]> {
    let query = supabase
      .from("service_vehicle_prices")
      .select(`
        *,
        vehicle_size_options (
          code,
          name_zh,
          name_en,
          icon,
          description_zh,
          description_en,
          sort_order,
          is_active
        )
      `)
      .eq("service_id", serviceId);

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (
      (data ?? []) as ServiceVehiclePrice[]
    ).sort((a, b) => {
      const firstOrder =
        a.vehicle_size_options?.sort_order ?? 999;

      const secondOrder =
        b.vehicle_size_options?.sort_order ?? 999;

      return firstOrder - secondOrder;
    });
  },

  async getAllServicePrices(
    activeOnly = false
  ): Promise<ServiceVehiclePrice[]> {
    let query = supabase
      .from("service_vehicle_prices")
      .select(`
        *,
        vehicle_size_options (
          code,
          name_zh,
          name_en,
          icon,
          description_zh,
          description_en,
          sort_order,
          is_active
        )
      `);

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as ServiceVehiclePrice[];
  },

  async saveServicePrice(
    serviceId: number,
    payload: VehiclePricePayload
  ): Promise<ServiceVehiclePrice> {
    validatePricePayload(payload);

    const { data, error } = await supabase
      .from("service_vehicle_prices")
      .upsert(
        {
          service_id: serviceId,
          vehicle_size_code:
            payload.vehicle_size_code,
          price: payload.price,
          cost_price: payload.cost_price,
          duration_minutes:
            Math.round(payload.duration_minutes),
          is_active: payload.is_active,
        },
        {
          onConflict:
            "service_id,vehicle_size_code",
        }
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as ServiceVehiclePrice;
  },

  async saveAllServicePrices(
    serviceId: number,
    prices: VehiclePricePayload[]
  ): Promise<ServiceVehiclePrice[]> {
    prices.forEach(validatePricePayload);

    const rows = prices.map((price) => ({
      service_id: serviceId,
      vehicle_size_code:
        price.vehicle_size_code,
      price: price.price,
      cost_price: price.cost_price,
      duration_minutes:
        Math.round(price.duration_minutes),
      is_active: price.is_active,
    }));

    const { data, error } = await supabase
      .from("service_vehicle_prices")
      .upsert(rows, {
        onConflict:
          "service_id,vehicle_size_code",
      })
      .select("*");

    if (error) {
      throw error;
    }

    return (data ?? []) as ServiceVehiclePrice[];
  },

  async getPackagePrices(
    packageId: number,
    activeOnly = false
  ): Promise<PackageVehiclePrice[]> {
    let query = supabase
      .from("package_vehicle_prices")
      .select(`
        *,
        vehicle_size_options (
          code,
          name_zh,
          name_en,
          icon,
          description_zh,
          description_en,
          sort_order,
          is_active
        )
      `)
      .eq("package_id", packageId);

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (
      (data ?? []) as PackageVehiclePrice[]
    ).sort((a, b) => {
      const firstOrder =
        a.vehicle_size_options?.sort_order ?? 999;

      const secondOrder =
        b.vehicle_size_options?.sort_order ?? 999;

      return firstOrder - secondOrder;
    });
  },

  async getAllPackagePrices(
    activeOnly = false
  ): Promise<PackageVehiclePrice[]> {
    let query = supabase
      .from("package_vehicle_prices")
      .select(`
        *,
        vehicle_size_options (
          code,
          name_zh,
          name_en,
          icon,
          description_zh,
          description_en,
          sort_order,
          is_active
        )
      `);

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []) as PackageVehiclePrice[];
  },

  async savePackagePrice(
    packageId: number,
    payload: VehiclePricePayload
  ): Promise<PackageVehiclePrice> {
    validatePricePayload(payload);

    const { data, error } = await supabase
      .from("package_vehicle_prices")
      .upsert(
        {
          package_id: packageId,
          vehicle_size_code:
            payload.vehicle_size_code,
          price: payload.price,
          cost_price: payload.cost_price,
          duration_minutes:
            Math.round(payload.duration_minutes),
          is_active: payload.is_active,
        },
        {
          onConflict:
            "package_id,vehicle_size_code",
        }
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as PackageVehiclePrice;
  },

  async saveAllPackagePrices(
    packageId: number,
    prices: VehiclePricePayload[]
  ): Promise<PackageVehiclePrice[]> {
    prices.forEach(validatePricePayload);

    const rows = prices.map((price) => ({
      package_id: packageId,
      vehicle_size_code:
        price.vehicle_size_code,
      price: price.price,
      cost_price: price.cost_price,
      duration_minutes:
        Math.round(price.duration_minutes),
      is_active: price.is_active,
    }));

    const { data, error } = await supabase
      .from("package_vehicle_prices")
      .upsert(rows, {
        onConflict:
          "package_id,vehicle_size_code",
      })
      .select("*");

    if (error) {
      throw error;
    }

    return (data ?? []) as PackageVehiclePrice[];
  },

  findServicePrice(
    prices: ServiceVehiclePrice[],
    serviceId: number,
    vehicleSizeCode: VehicleSizeCode
  ) {
    return prices.find(
      (price) =>
        Number(price.service_id) ===
          Number(serviceId) &&
        price.vehicle_size_code ===
          vehicleSizeCode &&
        price.is_active
    );
  },

  findPackagePrice(
    prices: PackageVehiclePrice[],
    packageId: number,
    vehicleSizeCode: VehicleSizeCode
  ) {
    return prices.find(
      (price) =>
        Number(price.package_id) ===
          Number(packageId) &&
        price.vehicle_size_code ===
          vehicleSizeCode &&
        price.is_active
    );
  },
};

export default VehiclePricingService;