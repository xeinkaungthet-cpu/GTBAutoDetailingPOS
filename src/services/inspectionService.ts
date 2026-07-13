import { supabase } from "../lib/supabase";

type PhotoType = "before" | "after";

type SavePhotoParams = {
  inspectionId: number;
  photoUrl: string;
  photoType: PhotoType;
  photoPosition?: string;
  description?: string;
};

export const InspectionService = {
  async createInspection(inspection: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("inspections")
      .insert([inspection])
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async savePhoto({
    inspectionId,
    photoUrl,
    photoType,
    photoPosition = "",
    description = "",
  }: SavePhotoParams) {
    const { error } = await supabase
      .from("inspection_photos")
      .insert([
        {
          inspection_id: inspectionId,
          photo_url: photoUrl,
          photo_type: photoType,
          photo_position: photoPosition,
          description,
        },
      ]);

    if (error) throw error;
  },

  async uploadPhoto(
    file: File,
    inspectionId: number,
    photoType: PhotoType,
    photoPosition = "general"
  ) {
    const safeFileName = file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );

    const filePath =
      `${inspectionId}/${photoType}/${photoPosition}/` +
      `${Date.now()}-${safeFileName}`;

    const { error } = await supabase.storage
      .from("inspection-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("inspection-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async getPhotos(inspectionId: number) {
    const { data, error } = await supabase
      .from("inspection_photos")
      .select("*")
      .eq("inspection_id", inspectionId)
      .order("id");

    if (error) throw error;

    return data;
  },

  async deletePhoto(photoId: number) {
    const { error } = await supabase
      .from("inspection_photos")
      .delete()
      .eq("id", photoId);

    if (error) throw error;
  },
};