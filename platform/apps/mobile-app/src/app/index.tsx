import { useEffect, useState } from "react";
import { StyleSheet, Text, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "@/lib/api";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [username, setUsername] = useState("");

  useEffect(() => {
    apiFetch("/api/v1/users/metadata")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load user metadata");
        return response.json() as Promise<{ data: { username: string } }>;
      })
      .then(({ data }) => setUsername(data.username))
      .catch(() => setUsername("Unable to load username"));
  }, []);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000000" : "#ffffff" },
      ]}
    >
      <Text
        style={[
          styles.username,
          { color: colorScheme === "dark" ? "#ffffff" : "#000000" },
        ]}
      >
        {username}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: 24,
    fontWeight: "600",
  },
});
