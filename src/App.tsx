import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { HouseholdPage } from "@/pages/HouseholdPage";
import { AddExpensePage } from "@/pages/AddExpensePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { Toaster } from "@/components/ui/toaster";
import { TransactionsPage } from "./pages/TransactionsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { ShoppingListPage } from "./pages/ShoppingListPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes – reduces refetches when switching tabs
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/household" element={<HouseholdPage />} />
              <Route path="/add-expense" element={<AddExpensePage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/shopping-list" element={<ShoppingListPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
