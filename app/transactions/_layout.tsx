import { Stack } from "expo-router";

function TransactionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTintColor: "#000000",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Transações",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Nova Transação",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Editar Transação",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

TransactionsLayout.displayName = "TransactionsLayout";

export default TransactionsLayout;
