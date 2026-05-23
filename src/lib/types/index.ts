// ─── Database Types ──────────────────────────────────────────
// These mirror the Supabase schema exactly.
// Generate automatically with: supabase gen types typescript --local

export type OrderStatus = 'pending' | 'confirmed' | 'making' | 'ready' | 'served' | 'cancelled' | 'completed'
export type PaymentMethod = 'upi' | 'card' | 'cash' | 'unpaid'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Cafe {
  id: string
  name: string
  slug: string
  logo_url: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  currency: string
  timezone: string
  is_active: boolean
  settings: CafeSettings
  created_at: string
  updated_at: string
}

export interface CafeSettings {
  accept_cash: boolean
  accept_upi: boolean
  accept_card: boolean
  tax_percent: number
  service_charge_percent: number
  show_social_proof: boolean
  languages: string[]
}

export interface Table {
  id: string
  cafe_id: string
  number: number
  label: string | null
  capacity: number
  qr_code_url: string | null
  is_active: boolean
  created_at: string
}

export interface MenuCategory {
  id: string
  cafe_id: string
  name: string
  name_hi: string | null
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  items?: MenuItem[]
}

export interface MenuItem {
  id: string
  cafe_id: string
  category_id: string
  name: string
  name_hi: string | null
  description: string | null
  description_hi: string | null
  price: number
  image_url: string | null
  is_veg: boolean
  is_vegan: boolean
  is_jain: boolean
  contains_gluten: boolean
  contains_nuts: boolean
  spice_level: 0 | 1 | 2 | 3
  is_available: boolean
  is_featured: boolean
  sort_order: number
  order_count: number
  prep_time_mins: number
  upsell_item_ids: string[]
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  cafe_id: string
  table_id: string
  customer_id: string | null
  order_number: string
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  subtotal: number
  tax_amount: number
  service_charge: number
  discount_amount: number
  total_amount: number
  notes: string | null
  estimated_mins: number | null
  confirmed_at: string | null
  ready_at: string | null
  served_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Joined
  items?: OrderItem[]
  table?: Table
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  name: string
  price: number
  quantity: number
  customisation: string | null
  subtotal: number
  status: string
  created_at: string
}

// ─── Cart Types (client-side only, not in DB) ────────────────
export interface CartItem {
  menuItem: MenuItem
  quantity: number
  customisation?: string
}

export interface Cart {
  cafeId: string
  tableId: string
  tableNumber: number
  items: CartItem[]
}

// ─── API response types ──────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface MenuPageData {
  cafe: Cafe
  table: Table
  categories: MenuCategory[]
}

export interface Database {
  public: {
    Tables: {
      cafes: { Row: Cafe; Insert: Partial<Cafe>; Update: Partial<Cafe> }
      tables: { Row: Table; Insert: Partial<Table>; Update: Partial<Table> }
      menu_categories: { Row: MenuCategory; Insert: Partial<MenuCategory>; Update: Partial<MenuCategory> }
      menu_items: { Row: MenuItem; Insert: Partial<MenuItem>; Update: Partial<MenuItem> }
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order> }
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> }
    }
  }
}
