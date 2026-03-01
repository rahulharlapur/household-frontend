import { useAuthStore } from "@/store/authStore";
import { api } from "./axios";
import type {
  AuthResponse,
  Household,
  BalancesResponse,
  Expense,
  PaginatedExpenses,
  Settlement,
  PaginatedSettlements,
  InventoryItem,
  InventoryCategory,
  InventoryStatus,
  PaginatedInventory,
  ShoppingListResponse,
} from "@/types";

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  register: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const res = await api.post("/users", data);
    return res.data;
  },

  login: async (data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const res = await api.post("/users/login", data);
    return res.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post("/users/logout", { refreshToken });
  },

  refreshTokens: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await api.post("/users/refresh-tokens", { refreshToken });
    return res.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    const res = await api.post("/users/change-password", data);
    return res.data;
  },
};

// ── Household ─────────────────────────────────────────
export const householdApi = {
  create: async (name: string): Promise<{ household: Household }> => {
    const res = await api.post("/household", { name });
    // Backend returns { data: household }
    return { household: res.data.data ?? res.data };
  },

  join: async (inviteCode: string): Promise<{ household: Household }> => {
    const res = await api.post("/household/join", { inviteCode });
    // Backend returns { data: household }
    return { household: res.data.data ?? res.data };
  },

  // Returns array of all households user belongs to
  getAll: async (): Promise<{ households: Household[] }> => {
    const userId = useAuthStore.getState().user?._id;
    const res = await api.get(`/household/${userId}`);
    // Backend returns { data: [...] } - handle both wrapped and unwrapped formats
    const responseData = res.data.data ?? res.data;
    const households = Array.isArray(responseData)
      ? responseData
      : [responseData].filter(Boolean);
    return { households };
  },
};

// ── Expenses ──────────────────────────────────────────
export const expenseApi = {
  add: async (data: {
    householdId: string;
    paidBy: string;
    totalAmount: number;
    splitType: "equal" | "custom";
    description?: string;
    customSplits?: { userId: string }[];
  }): Promise<Expense> => {
    const res = await api.post("/expenses/add", data);
    return res.data;
  },

  getBalances: async (householdId: string): Promise<BalancesResponse> => {
    const res = await api.get(`/expenses/balances/${householdId}`);
    return res.data.data;
  },

  getExpenses: async (
    householdId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedExpenses> => {
    const res = await api.get(`/expenses/${householdId}`, {
      params: { page, limit },
    });
    return res.data.data;
  },

  settleAll: async (data: {
    householdId: string;
    debtorId: string;
    creditorId: string;
    note?: string;
  }): Promise<{ message: string; amount: number; settlement: Settlement }> => {
    const res = await api.post("/expenses/settle-all", data);
    return res.data.data;
  },

  settle: async (data: {
    householdId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    note?: string;
  }): Promise<{ message: string; settlement: Settlement }> => {
    const res = await api.post("/expenses/settle", data);
    return res.data.data;
  },

  getSettlements: async (
    householdId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedSettlements> => {
    const res = await api.get(`/expenses/settlements/${householdId}`, {
      params: { page, limit },
    });
    return res.data.data;
  },

  deleteExpense: async (expenseId: string): Promise<{ message: string }> => {
    const res = await api.delete(`/expenses/${expenseId}`);
    return res.data;
  },
};

// ── Inventory ─────────────────────────────────────────
export const inventoryApi = {
  addItem: async (data: {
    householdId: string;
    name: string;
    category?: InventoryCategory;
    quantity?: number;
    unit?: string;
    notes?: string;
  }): Promise<InventoryItem> => {
    const res = await api.post("/inventory", data);
    return res.data.data;
  },

  getItems: async (
    householdId: string,
    options?: {
      category?: InventoryCategory;
      status?: InventoryStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedInventory> => {
    const res = await api.get(`/inventory/${householdId}`, {
      params: options,
    });
    return res.data.data;
  },

  getShoppingList: async (householdId: string): Promise<ShoppingListResponse> => {
    const res = await api.get(`/inventory/shopping-list/${householdId}`);
    return res.data.data;
  },

  updateItem: async (
    itemId: string,
    data: {
      name?: string;
      category?: InventoryCategory;
      quantity?: number;
      unit?: string;
      status?: InventoryStatus;
      notes?: string;
    }
  ): Promise<InventoryItem> => {
    const res = await api.patch(`/inventory/${itemId}`, data);
    return res.data.data;
  },

  markEmpty: async (itemId: string): Promise<InventoryItem> => {
    const res = await api.post(`/inventory/${itemId}/mark-empty`);
    return res.data.data;
  },

  markLow: async (itemId: string): Promise<InventoryItem> => {
    const res = await api.post(`/inventory/${itemId}/mark-low`);
    return res.data.data;
  },

  markPurchased: async (
    itemId: string,
    quantity?: number
  ): Promise<InventoryItem> => {
    const res = await api.post(`/inventory/${itemId}/mark-purchased`, { quantity });
    return res.data.data;
  },

  bulkMarkPurchased: async (data: {
    householdId: string;
    itemIds: string[];
  }): Promise<{ message: string; count: number }> => {
    const res = await api.post("/inventory/bulk-purchased", data);
    return res.data.data;
  },

  deleteItem: async (itemId: string): Promise<{ message: string }> => {
    const res = await api.delete(`/inventory/${itemId}`);
    return res.data;
  },
};
