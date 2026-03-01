export type PermissionSet = {
  add: boolean;
  edit: boolean;
  delete: boolean;
  reports: boolean;
  limits: boolean;
  backup: boolean;
  print: boolean;
  addNew: boolean;
};

export type User = {
  _id: string;
  username: string;
  role: "Technical Team" | "Owner" | "Manager" | "Staff" | "Worker" | "Guest";
  permissions: PermissionSet;
};

export type Transaction = {
  _id: string;
  date: string;
  name: string;
  type: "sell" | "buy";
  product: string;
  size: string;
  qty: number;
  unitPrice?: number;
  discount?: number; // percentage
  taxPercent?: number;
  commission?: number;
  otherCharges?: number;
  amount: number;
  originalAmount?: number;
  status: "purchased" | "booked" | "returned";
  paymentMethod?: string;
  upiId?: string;
  paidAmount?: number;
  promiseDate?: string;
};

export type Trader = {
  _id: string;
  name: string;
  contact: string;
  address?: string;
  gstin?: string;
  type: "Customer" | "Dealer";
};

export type CatalogItem = {
  _id: string;
  type: "sales" | "buy";
  product: string;
  size: string;
  price: number;
  limit?: number | null;
};

export type SignupRequest = {
  _id: string;
  username: string;
  password: string;
  requestedAt: string;
};

export type PassRequest = {
  _id: string;
  username: string;
  requestedAt: string;
};

export type AppSettings = {
  _id: string;
  companyName: string;
  address: string;
  phone: string;
  gstin: string;
  tagline: string;
  bankDetails: string;
};
