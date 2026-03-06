export interface PricingRecord {
  id: string;
  store_id: string;
  sku: string;
  product_name: string;
  price: number;
  currency: string;
  price_date: string;
  version: number;
  updated_at: string;
  updated_by: string;
}

export interface SearchParams {
  store_id?: string;
  sku?: string;
  product_name?: string;
  price_min?: number;
  price_max?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface UploadStatus {
  id: string;
  filename: string;
  store_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';
  total_rows: number | null;
  processed_rows: number;
  error_count: number;
  error_detail: Record<string, unknown> | null;
  uploaded_at: string;
  completed_at: string | null;
}