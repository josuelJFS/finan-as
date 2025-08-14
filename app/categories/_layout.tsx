import { Stack } from "expo-router";

export default function CategoriesLayout() {
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
          title: "Categorias",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Nova Categoria",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Editar Categoria",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
