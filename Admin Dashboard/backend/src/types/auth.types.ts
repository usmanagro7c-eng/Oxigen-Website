export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profile_image?: string;
  customer_group?: string;
  default_address?: string;
  first_name?: string;
  last_name?: string;
  mobile_no?: string;
  gender?: string;
  birth_date?: string;
}

export interface AuthUser {
  email: string;
  name: string;
}

export interface Address {
  name: string;
  address_title: string;
  address_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  country: string;
  pincode?: string;
  phone?: string;
  is_primary_address?: boolean;
  is_shipping_address?: boolean;
}

export interface Order {
  name: string;
  transaction_date: string;
  status: string;
  grand_total: number;
  currency: string;
}
