import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
  lastUsedFilters: any | null;
  setLastUsedFilters: (filters: any) => void;

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
      biometricEnabled: false,
      onboardingCompleted: false,

      // Actions
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      setIsFirstTime: (isFirstTime) => set({ isFirstTime }),
      setShowAccountBalances: (showAccountBalances) => set({ showAccountBalances }),
      setLastUsedFilters: (lastUsedFilters) => set({ lastUsedFilters }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
