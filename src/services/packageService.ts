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

  original_price: number;
  package_price: number;
  estimated_minutes: number;

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
  estimated_minutes: number;

  image_url?: string | null;

  is_active: boolean;
  is_popular: boolean;
};

export const PackageService = {
  async getAll(): Promise<Package[]> {
    const { data, error } = await supabase
      .from("packages")
      .select(`
        *,
        package_services (
          id,
          package_id,
          service_id,
          sort_order,
          services (*)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []) as Package[];
  },

  async getActive(): Promise<Package[]> {
    const { data, error } = await supabase
      .from("packages")
      .select(`
        *,
        package_services (
          id,
          package_id,
          service_id,
          sort_order,
          services (*)
        )
      `)
      .eq("is_active", true)
      .order("is_popular", { ascending: false })
      .order("package_price", { ascending: true });

    if (error) throw error;

    return (data ?? []) as Package[];
  },

  async create(
    packageData: PackagePayload,
    serviceIds: number[]
  ): Promise<Package> {
    const { data: createdPackage, error: packageError } =
      await supabase
        .from("packages")
        .insert([packageData])
        .select()
        .single();

    if (packageError) throw packageError;

    if (!createdPackage?.id) {
      throw new Error("套餐创建失败：没有返回套餐 ID");
    }

    if (serviceIds.length > 0) {
      const packageServices = serviceIds.map(
        (serviceId, index) => ({
          package_id: createdPackage.id,
          service_id: serviceId,
          sort_order: index,
        })
      );

      const { error: serviceError } = await supabase
        .from("package_services")
        .insert(packageServices);

      if (serviceError) {
        await supabase
          .from("packages")
          .delete()
          .eq("id", createdPackage.id);

        throw serviceError;
      }
    }

    return createdPackage as Package;
  },

  async update(
    packageId: number,
    packageData: Partial<PackagePayload>,
    serviceIds: number[]
  ): Promise<Package> {
    const { data: updatedPackage, error: packageError } =
      await supabase
        .from("packages")
        .update({
          ...packageData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", packageId)
        .select()
        .single();

    if (packageError) throw packageError;

    const { error: deleteLinksError } = await supabase
      .from("package_services")
      .delete()
      .eq("package_id", packageId);

    if (deleteLinksError) throw deleteLinksError;

    if (serviceIds.length > 0) {
      const packageServices = serviceIds.map(
        (serviceId, index) => ({
          package_id: packageId,
          service_id: serviceId,
          sort_order: index,
        })
      );

      const { error: insertLinksError } = await supabase
        .from("package_services")
        .insert(packageServices);

      if (insertLinksError) throw insertLinksError;
    }

    return updatedPackage as Package;
  },

  async updateStatus(
    packageId: number,
    isActive: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from("packages")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", packageId);

    if (error) throw error;
  },

  async delete(packageId: number): Promise<void> {
    const { error } = await supabase
      .from("packages")
      .delete()
      .eq("id", packageId);

    if (error) throw error;
  },

  async uploadImage(
    packageId: number,
    file: File
  ): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("请选择图片文件");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("图片不能超过 5MB");
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension =
      extension.replace(/[^a-z0-9]/g, "") || "jpg";

    const filePath =
      `${packageId}/package-${Date.now()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("service-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("service-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async saveImage(
    packageId: number,
    imageUrl: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from("packages")
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", packageId);

    if (error) throw error;
  },
};