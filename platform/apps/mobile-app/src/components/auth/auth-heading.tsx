import { Image, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <View style={styles.brand}>
        <Image
          source={require("../../../assets/images/vibeongo-logo.png")}
          style={styles.logo}
          accessibilityIgnoresInvertColors
        />
        <ThemedText style={styles.brandName}>vibeongo.</ThemedText>
      </View>
      <View style={styles.heading}>
        <ThemedText accessibilityRole="header" style={styles.title}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText themeColor="textSecondary" style={styles.description}>
            {description}
          </ThemedText>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 56,
  },
  logo: { width: 26, height: 26, borderRadius: 7 },
  brandName: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  heading: { gap: 8, marginBottom: 24 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  description: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
});
