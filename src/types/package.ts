export interface Package {
  id: number;

  package_name: string;
  package_name_en: string;

  description: string;
  description_en: string;

  image_url: string;

  category: string;

  original_price: number;
  package_price: number;

  is_popular: boolean;
  is_recommended: boolean;
  is_active: boolean;

  created_at?: string;
}