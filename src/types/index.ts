export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface HouseholdMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Household {
  _id: string;
  name: string;
  owner: HouseholdMember;
  members: HouseholdMember[];
  inviteCode: string;
  createdAt: string;
}

export interface SplitUser {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface SplitDetail {
  userId: SplitUser | string; // object when populated, string when not
  amountOwed: number;
  isPaid: boolean;
  paidAt: string | null;
}

export interface Expense {
  _id: string;
  householdId: string;
  addedBy: User | string;
  paidBy: User | string;
  totalAmount: number;
  splitType: "equal" | "custom";
  splitDetails: SplitDetail[];
  receiptImagePath?: string;
  description?: string;
  createdAt: string;
}

export interface Debt {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amount: number;
}

export interface BalancesResponse {
  balances: Record<string, number>;
  debts: Debt[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedExpenses {
  expenses: Expense[];
  pagination: PaginationInfo;
}

export interface SettlementUser {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface Settlement {
  _id: string;
  householdId: string;
  fromUser: SettlementUser;
  toUser: SettlementUser;
  settledBy: SettlementUser;
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSettlements {
  settlements: Settlement[];
  pagination: PaginationInfo;
}
