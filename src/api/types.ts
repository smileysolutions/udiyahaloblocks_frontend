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
  role: "Technical Team" | "Owner" | "Staff" | "Worker";
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
  amount: number;
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
