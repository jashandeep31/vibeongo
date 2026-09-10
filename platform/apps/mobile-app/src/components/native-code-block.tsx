import * as Clipboard from "expo-clipboard";
import { SymbolView } from "expo-symbols";
import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import CodeHighlighter from "react-native-code-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

import { Fonts } from "@/constants/theme";

const CODE_BACKGROUND = "#282c34";
const CODE_BORDER = "#3b4048";
const CODE_FOREGROUND = "#abb2bf";
const { background: _background, ...darkCodeRootStyle } = atomOneDark.hljs;
const darkCodeTheme = {
  ...atomOneDark,
  hljs: darkCodeRootStyle,
};

export const NativeCodeBlock = memo(function NativeCodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const normalizedLanguage = language?.trim().toLowerCase() || "text";

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.language}>{normalizedLanguage}</Text>
        <Pressable
          accessibilityLabel="Copy code"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => void copyCode()}
          style={styles.copy}
        >
          <SymbolView
            name={{
              ios: copied ? "checkmark" : "doc.on.doc",
              android: copied ? "check" : "content_copy",
            }}
            size={14}
            tintColor={CODE_FOREGROUND}
          />
          <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
        </Pressable>
      </View>
      <CodeHighlighter
        hljsStyle={darkCodeTheme}
        language={normalizedLanguage}
        scrollViewProps={{
          contentContainerStyle: styles.scrollContent,
          nestedScrollEnabled: true,
          showsHorizontalScrollIndicator: true,
        }}
        textStyle={styles.code}
      >
        {code}
      </CodeHighlighter>
    </View>
  );
});

const styles = StyleSheet.create({
  code: {
    backgroundColor: CODE_BACKGROUND,
    borderColor: CODE_BACKGROUND,
    color: CODE_FOREGROUND,
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  container: {
    backgroundColor: CODE_BACKGROUND,
    borderColor: CODE_BORDER,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: "hidden",
    width: "100%",
  },
  copy: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  copyText: {
    color: CODE_FOREGROUND,
    fontSize: 12,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    backgroundColor: "#21252b",
    borderBottomColor: CODE_BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  language: {
    color: CODE_FOREGROUND,
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  scrollContent: {
    backgroundColor: CODE_BACKGROUND,
    minWidth: "100%",
    padding: 16,
  },
});
