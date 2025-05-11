// Interfaces para los modelos de la aplicación

export interface IUser {
  id?: number;
  name: string;
  email: string;
  password?: string;
  business_name?: string;
  created_at?: string;
}

export interface IProduct {
  id?: number;
  user_id: number;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  image?: string;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ISaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  price: number;
}

export interface ISale {
  id?: number;
  sale_id?: number;
  user_id: number;
  date?: string;
  total: number;
  payment_method?: string;
  notes?: string;
  sync_status?: number;
  items?: ISaleItem[];
}

export interface IDailySummary {
  date: string;
  summary: {
    total_sales: number;
    total_amount: number;
    average_sale: number;
  };
  top_products: Array<{
    product_name: string;
    product_id: number;
    total_quantity: number;
    total_amount: number;
  }>;
}

export interface IWeeklySummary {
  start_date: string;
  end_date: string;
  summary: {
    total_sales: number;
    total_amount: number;
    average_sale: number;
  };
  daily_data: Array<{
    day: string;
    sales_count: number;
    daily_total: number;
  }>;
  top_products: Array<{
    product_name: string;
    quantity: number;
    amount: number;
  }>;
}

export interface IMonthlySummary {
  month: string;
  start_date: string;
  end_date: string;
  summary: {
    total_sales: number;
    total_amount: number;
    average_sale: number;
    highest_sale: number;
  };
  daily_data: Array<{
    day: string;
    sales_count: number;
    daily_total: number;
  }>;
  payment_methods: Array<{
    payment_method: string;
    count: number;
    amount: number;
  }>;
  low_stock_items: Array<{
    id: number;
    name: string;
    stock: number;
    price: number;
  }>;
}

export interface IInventoryStatus {
  summary: {
    total_products: number;
    out_of_stock: number;
    low_stock: number;
    total_inventory_value: number;
  };
  products: IProduct[];
}