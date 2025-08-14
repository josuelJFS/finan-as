import { Stack } from "expo-router";

export default function AccountsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Contas",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Nova Conta",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Editar Conta",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
