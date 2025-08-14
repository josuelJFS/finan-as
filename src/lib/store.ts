import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TransactionFilters, SavedFilter } from "../types/entities";
import { generateId } from "./utils";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AppState {
  // Tema
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  // Moeda
  currency: string;
  setCurrency: (currency: string) => void;

  // Primeira execução
  isFirstTime: boolean;
  setIsFirstTime: (isFirstTime: boolean) => void;

  // Configurações de exibição
  showAccountBalances: boolean;
  setShowAccountBalances: (show: boolean) => void;

  // Filtros salvos
  lastUsedFilters: TransactionFilters | null;
  setLastUsedFilters: (filters: TransactionFilters | null) => void;
  // Lista de filtros salvos
  savedFilters: SavedFilter[];
  addSavedFilter: (name: string, filters: TransactionFilters) => void;
  removeSavedFilter: (id: string) => void;
  clearSavedFilters: () => void;

  // Biometria
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;

  // Onboarding
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Estado inicial
      theme: "system",
      currency: "BRL",
      isFirstTime: true,
      showAccountBalances: true,
      lastUsedFilters: null,
      savedFilters: [],
      biometricEnabled: false,
      onboardingCompleted: false,

      // Actions
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      setIsFirstTime: (isFirstTime) => set({ isFirstTime }),
      setShowAccountBalances: (showAccountBalances) => set({ showAccountBalances }),
      setLastUsedFilters: (lastUsedFilters) => set({ lastUsedFilters }),
      addSavedFilter: (name, filters) =>
        set((state) => ({
          savedFilters: [
            ...state.savedFilters,
            {
              id: generateId(),
              name,
              filters,
              is_default: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any, // compatibilidade rápida
          ],
        })),
      removeSavedFilter: (id) =>
        set((state) => ({ savedFilters: state.savedFilters.filter((f) => f.id !== id) })),
      clearSavedFilters: () => set({ savedFilters: [] }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
