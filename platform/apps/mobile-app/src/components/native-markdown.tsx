import * as Linking from "expo-linking";
import { memo, type ReactNode, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import Markdown, {
  type ASTNode,
  type RenderRules,
} from "react-native-markdown-display";

import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

function confirmAndOpenLink(url: string) {
  if (!/^https?:\/\//i.test(url)) return false;

  Alert.alert("Open external link?", url, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Open",
      onPress: () => {
        void Linking.openURL(url).catch(() =>
          Alert.alert("Could not open link", "This link is not available."),
        );
      },
    },
  ]);
  return false;
}

const codeRule = (
  node: ASTNode,
  _children: ReactNode[],
  _parents: ASTNode[],
  styles: Record<string, object>,
) => (
  <ScrollView
    contentContainerStyle={styles.codeScrollContent}
    horizontal
    key={node.key}
    nestedScrollEnabled
    showsHorizontalScrollIndicator
    style={styles.codeScroll}
  >
    <Text selectable style={styles.fence}>
      {node.content.replace(/\n$/, "")}
    </Text>
  </ScrollView>
);

const rules: RenderRules = {
  code_block: codeRule,
  fence: codeRule,
  text: (node, _children, _parents, styles, inheritedStyles = {}) => (
    <Text key={node.key} selectable style={[inheritedStyles, styles.text]}>
      {node.content}
    </Text>
  ),
};

export const NativeMarkdown = memo(function NativeMarkdown({
  content,
}: {
  content: string;
}) {
  const theme = useTheme();
  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        blockquote: {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
          borderLeftWidth: 3,
          marginBottom: 12,
          marginLeft: 0,
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        body: {
          color: theme.text,
          fontSize: 15,
          lineHeight: 23,
        },
        bullet_list: { marginBottom: 12 },
        bullet_list_content: { flex: 1 },
        bullet_list_icon: {
          color: theme.textSecondary,
          marginLeft: 4,
          marginRight: 12,
        },
        code_block: {
          backgroundColor: theme.backgroundElement,
          color: theme.text,
          fontFamily: Fonts.mono,
          fontSize: 13,
          lineHeight: 20,
        },
        code_inline: {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
          borderRadius: 5,
          borderWidth: StyleSheet.hairlineWidth,
          color: theme.text,
          fontFamily: Fonts.mono,
          fontSize: 13,
          paddingHorizontal: 5,
          paddingVertical: 2,
        },
        codeScroll: {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          marginBottom: 16,
          maxWidth: "100%",
        },
        codeScrollContent: { minWidth: "100%" },
        em: { fontStyle: "italic" },
        fence: {
          backgroundColor: theme.backgroundElement,
          color: theme.text,
          fontFamily: Fonts.mono,
          fontSize: 13,
          lineHeight: 20,
          padding: 16,
        },
        heading1: {
          color: theme.text,
          fontSize: 27,
          fontWeight: "800",
          lineHeight: 34,
          marginBottom: 12,
          marginTop: 16,
        },
        heading2: {
          borderBottomColor: theme.backgroundSelected,
          borderBottomWidth: StyleSheet.hairlineWidth,
          color: theme.text,
          fontSize: 22,
          fontWeight: "700",
          lineHeight: 29,
          marginBottom: 12,
          marginTop: 24,
          paddingBottom: 8,
        },
        heading3: {
          color: theme.text,
          fontSize: 19,
          fontWeight: "700",
          lineHeight: 26,
          marginBottom: 8,
          marginTop: 16,
        },
        heading4: {
          color: theme.text,
          fontSize: 17,
          fontWeight: "700",
          lineHeight: 23,
          marginBottom: 8,
          marginTop: 16,
        },
        heading5: {
          color: theme.text,
          fontSize: 15,
          fontWeight: "700",
          lineHeight: 22,
          marginTop: 12,
        },
        heading6: {
          color: theme.textSecondary,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 20,
          marginTop: 12,
        },
        hr: {
          backgroundColor: theme.backgroundSelected,
          height: StyleSheet.hairlineWidth,
          marginBottom: 24,
          marginTop: 16,
        },
        image: { borderRadius: 12, flex: 1, marginVertical: 12 },
        link: {
          color: "#3c87f7",
          fontWeight: "600",
          textDecorationLine: "underline",
        },
        list_item: {
          flexDirection: "row",
          justifyContent: "flex-start",
          marginBottom: 4,
        },
        ordered_list: { marginBottom: 12 },
        ordered_list_content: { flex: 1 },
        ordered_list_icon: {
          color: theme.textSecondary,
          marginLeft: 2,
          marginRight: 12,
        },
        paragraph: {
          alignItems: "flex-start",
          flexDirection: "row",
          flexWrap: "wrap",
          marginBottom: 12,
          marginTop: 0,
          width: "100%",
        },
        s: { textDecorationLine: "line-through" },
        strong: { color: theme.text, fontWeight: "700" },
        table: {
          borderColor: theme.backgroundSelected,
          borderRadius: 8,
          borderWidth: StyleSheet.hairlineWidth,
          marginBottom: 16,
        },
        td: { flex: 1, padding: 8 },
        text: { color: theme.text, fontSize: 15, lineHeight: 23 },
        textgroup: { color: theme.text },
        th: {
          backgroundColor: theme.backgroundElement,
          flex: 1,
          padding: 8,
        },
        tr: {
          borderBottomColor: theme.backgroundSelected,
          borderBottomWidth: StyleSheet.hairlineWidth,
          flexDirection: "row",
        },
      }),
    [theme],
  );

  return (
    <Markdown
      mergeStyle
      onLinkPress={confirmAndOpenLink}
      rules={rules}
      style={markdownStyles}
    >
      {content}
    </Markdown>
  );
});
