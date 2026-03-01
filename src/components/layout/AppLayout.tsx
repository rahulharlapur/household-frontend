import { Outlet } from "react-router-dom";
import { Home } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { HouseholdSwitcher } from "@/components/ui/household-switcher";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with household switcher */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Home className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-semibold">Homie</span>
          </div>
          <HouseholdSwitcher />
        </div>
      </header>
      <main className="max-w-lg mx-auto pb-20 px-4 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
