import { Redirect } from "expo-router";
import { useAppStore } from "../src/lib/store";

export default function RootLayout() {
  const { onboardingCompleted } = useAppStore();

  // Redirecionar para onboarding se necessário
  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  // Redirecionar para app principal
  return <Redirect href="/(tabs)" />;
}
