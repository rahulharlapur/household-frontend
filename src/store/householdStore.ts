import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Household } from "@/types";

interface HouseholdState {
  households: Household[];
  activeHouseholdId: string | null;
  setHouseholds: (households: Household[]) => void;
  setActiveHousehold: (householdId: string) => void;
  addHousehold: (household: Household) => void;
  getActiveHousehold: () => Household | undefined;
  clearHouseholds: () => void;
}

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set, get) => ({
      households: [],
      activeHouseholdId: null,

      setHouseholds: (households) => {
        const current = get().activeHouseholdId;
        // If no active household or current one not in list, select first
        const validActiveId =
          current && households.some((h) => h._id === current)
            ? current
            : households[0]?._id ?? null;
        set({ households, activeHouseholdId: validActiveId });
      },

      setActiveHousehold: (householdId) => {
        set({ activeHouseholdId: householdId });
      },

      addHousehold: (household) => {
        set((state) => ({
          households: [...state.households, household],
          activeHouseholdId: household._id, // Switch to newly added
        }));
      },

      getActiveHousehold: () => {
        const state = get();
        return state.households.find((h) => h._id === state.activeHouseholdId);
      },

      clearHouseholds: () => {
        set({ households: [], activeHouseholdId: null });
      },
    }),
    {
      name: "household-storage",
      partialize: (state) => ({
        activeHouseholdId: state.activeHouseholdId,
      }),
    }
  )
);
