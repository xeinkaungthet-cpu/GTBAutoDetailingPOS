import { supabase } from "../lib/supabase";
import type { Service } from "../types/database";

export interface PackageServiceItem {
  id: number;
  package_id: number;
  service_id: number;
  sort_order: number;
  services?: Service | null;
}

export interface Package {
  id: number;

  package_name: string;
  package_name_en?: string | null;

  description?: string | null;
  description_en?: string | null;

  original_price: number | string;
  package_price: number | string;
  cost_price: number | string;
  estimated_minutes: number | string;

  image_url?: string | null;

  is_active: boolean;
  is_popular: boolean;

  created_at?: string;
  updated_at?: string;

  package_services?: PackageServiceItem[];
}

export type PackagePayload = {
  package_name: string;
  package_name_en?: string | null;

  description?: string | null;
  description_en?: string | null;

  original_price: number;
  package_price: number;
  cost_price: number;
  estimated_minutes: number;

  image_url?: string | null;

  is_active: boolean;
  is_popular: boolean;
};

const packageSelect = `
  *,
  package_services (
    id,
    package_id,
    service_id,
    sort_order,
    services (*)
  )
`;

function normalizeServiceIds(serviceIds: number[]) {
  return Array.from(
    new Set(
      serviceIds
        .map((serviceId) => Number(serviceId))
        .filter(
          (serviceId) =>
            Number.isInteger(serviceId) && serviceId > 0
        )
    )
  );
}

function validatePackagePayload(
  packageData: Partial<PackagePayload>
) {
  if (
    packageData.package_price !== undefined &&
    (!Number.isFinite(Number(packageData.package_price)) ||
      Number(packageData.package_price) <= 0)
  ) {
    throw new Error("套餐价格必须大于 0");
  }

  if (
    packageData.cost_price !== undefined &&
    (!Number.isFinite(Number(packageData.cost_price)) ||
      Number(packageData.cost_price) < 0)
  ) {
    throw new Error("套餐内部成本不能小于 0");
  }

  if (
    packageData.original_price !== undefined &&
    (!Number.isFinite(Number(packageData.original_price)) ||
      Number(packageData.original_price) < 0)
  ) {
    throw new Error("服务原价不能小于 0");
  }

  if (
    packageData.estimated_minutes !== undefined &&
    (!Number.isFinite(Number(packageData.estimated_minutes)) ||
      Number(packageData.estimated_minutes) < 0)
  ) {
    throw new Error("预计时间不能小于 0");
  }
}

async function replacePackageServices(
  packageId: number,
  serviceIds: number[]
) {
  const normalizedIds = normalizeServiceIds(serviceIds);

  const { error: deleteLinksError } = await supabase
    .from("package_services")
    .delete()
    .eq("package_id", packageId);

  if (deleteLinksError) {
    throw deleteLinksError;
  }

  if (normalizedIds.length === 0) {
    return;
  }

  const packageServices = normalizedIds.map(
    (serviceId, index) => ({
      package_id: packageId,
      service_id: serviceId,
      sort_order: index,
    })
  );

  const { error: insertLinksError } = await supabase
    .from("package_services")
    .insert(packageServices);

  if (insertLinksError) {
    throw insertLinksError;
  }
}

export const PackageService = {
  async getAll(): Promise<Package[]> {
    const { data, error } = await supabase
      .from("packages")
      .select(packageSelect)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as Package[];
  },

  async getActive(): Promise<Package[]> {
    const { data, error } = await supabase
      .from("packages")
      .select(packageSelect)
      .eq("is_active", true)
      .order("is_popular", {
        ascending: false,
      })
      .order("package_price", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as Package[];
  },

  async create(
    packageData: PackagePayload,
    serviceIds: number[]
  ): Promise<Package> {
    validatePackagePayload(packageData);

    const normalizedIds = normalizeServiceIds(serviceIds);

    if (normalizedIds.length === 0) {
      throw new Error("请至少选择一个服务项目");
    }

    const { data: createdPackage, error: packageError } =
      await supabase
        .from("packages")
        .insert([packageData])
        .select()
        .single();

    if (packageError) {
      throw packageError;
    }

    if (!createdPackage?.id) {
      throw new Error(
        "套餐创建失败：系统没有返回套餐 ID"
      );
    }

    try {
      await replacePackageServices(
        Number(createdPackage.id),
        normalizedIds
      );
    } catch (error) {
      await supabase
        .from("packages")
        .delete()
        .eq("id", createdPackage.id);

      throw error;
    }

    return createdPackage as Package;
  },

  async update(
    packageId: number,
    packageData: Partial<PackagePayload>,
    serviceIds: number[]
  ): Promise<Package> {
    const normalizedPackageId = Number(packageId);

    if (
      !Number.isInteger(normalizedPackageId) ||
      normalizedPackageId <= 0
    ) {
      throw new Error("套餐编号不正确");
    }

    validatePackagePayload(packageData);

    const normalizedIds = normalizeServiceIds(serviceIds);

    if (normalizedIds.length === 0) {
      throw new Error("请至少选择一个服务项目");
    }

    const { data: updatedPackage, error: packageError } =
      await supabase
        .from("packages")
        .update({
          ...packageData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", normalizedPackageId)
        .select()
        .single();

    if (packageError) {
      throw packageError;
    }

    await replacePackageServices(
      normalizedPackageId,
      normalizedIds
    );

    return updatedPackage as Package;
  },

  async updateStatus(
    packageId: number,
    isActive: boolean
  ): Promise<void> {
    const normalizedPackageId = Number(packageId);

    if (
      !Number.isInteger(normalizedPackageId) ||
      normalizedPackageId <= 0
    ) {
      throw new Error("套餐编号不正确");
    }

    const { error } = await supabase
      .from("packages")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", normalizedPackageId);

    if (error) {
      throw error;
    }
  },

  async delete(packageId: number): Promise<void> {
    const normalizedPackageId = Number(packageId);

    if (
      !Number.isInteger(normalizedPackageId) ||
      normalizedPackageId <= 0
    ) {
      throw new Error("套餐编号不正确");
    }

    const { error } = await supabase
      .from("packages")
      .delete()
      .eq("id", normalizedPackageId);

    if (error) {
      throw error;
    }
  },

  async uploadImage(
    packageId: number,
    file: File
  ): Promise<string> {
    const normalizedPackageId = Number(packageId);

    if (
      !Number.isInteger(normalizedPackageId) ||
      normalizedPackageId <= 0
    ) {
      throw new Error("套餐编号不正确");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("请选择图片文件");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("图片不能超过 5MB");
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const safeExtension =
      extension.replace(/[^a-z0-9]/g, "") || "jpg";

    const filePath =
      `${normalizedPackageId}/package-${Date.now()}.${safeExtension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("service-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("service-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async saveImage(
    packageId: number,
    imageUrl: string | null
  ): Promise<void> {
    const normalizedPackageId = Number(packageId);

    if (
      !Number.isInteger(normalizedPackageId) ||
      normalizedPackageId <= 0
    ) {
      throw new Error("套餐编号不正确");
    }

    const { error } = await supabase
      .from("packages")
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", normalizedPackageId);

    if (error) {
      throw error;
    }
  },
};