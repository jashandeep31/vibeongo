import * as Linking from "expo-linking";
import { memo, type ReactNode, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import Markdown, {
  type ASTNode,
  type RenderRules,
} from "react-native-markdown-display";

import { Fonts, Radius, Spacing, type AppColors } from "@/constants/theme";

type NativeMarkdownProps = {
  colors: AppColors;
  content: string;
};

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
  fence: codeRule,
  code_block: codeRule,
  text: (node, _children, _parents, styles, inheritedStyles = {}) => (
    <Text key={node.key} selectable style={[inheritedStyles, styles.text]}>
      {node.content}
    </Text>
  ),
};

export const NativeMarkdown = memo(function NativeMarkdown({
  colors,
  content,
}: NativeMarkdownProps) {
  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: colors.text,
          fontSize: 15,
          lineHeight: 24,
        },
        text: { color: colors.text, fontSize: 15, lineHeight: 24 },
        textgroup: { color: colors.text },
        paragraph: {
          alignItems: "flex-start",
          flexDirection: "row",
          flexWrap: "wrap",
          marginBottom: Spacing.three,
          marginTop: 0,
          width: "100%",
        },
        heading1: {
          color: colors.text,
          fontSize: 28,
          fontWeight: "800",
          lineHeight: 34,
          marginBottom: Spacing.three,
          marginTop: Spacing.four,
        },
        heading2: {
          borderBottomColor: colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          color: colors.text,
          fontSize: 23,
          fontWeight: "700",
          lineHeight: 30,
          marginBottom: Spacing.three,
          marginTop: Spacing.five,
          paddingBottom: Spacing.two,
        },
        heading3: {
          color: colors.text,
          fontSize: 20,
          fontWeight: "700",
          lineHeight: 26,
          marginBottom: Spacing.two,
          marginTop: Spacing.four,
        },
        heading4: {
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
          lineHeight: 23,
          marginBottom: Spacing.two,
          marginTop: Spacing.four,
        },
        heading5: {
          color: colors.text,
          fontSize: 15,
          fontWeight: "700",
          lineHeight: 22,
          marginTop: Spacing.three,
        },
        heading6: {
          color: colors.textSecondary,
          fontSize: 13,
          fontWeight: "700",
          lineHeight: 20,
          marginTop: Spacing.three,
        },
        strong: { color: colors.text, fontWeight: "700" },
        em: { fontStyle: "italic" },
        s: { textDecorationLine: "line-through" },
        link: {
          color: colors.brand,
          fontWeight: "600",
          textDecorationLine: "underline",
        },
        blockquote: {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
          borderLeftWidth: 3,
          marginBottom: Spacing.three,
          marginLeft: 0,
          paddingHorizontal: Spacing.four,
          paddingVertical: Spacing.two,
        },
        bullet_list: { marginBottom: Spacing.three },
        ordered_list: { marginBottom: Spacing.three },
        list_item: {
          flexDirection: "row",
          justifyContent: "flex-start",
          marginBottom: 4,
        },
        bullet_list_icon: {
          color: colors.textSecondary,
          marginLeft: 4,
          marginRight: Spacing.three,
        },
        ordered_list_icon: {
          color: colors.textSecondary,
          marginLeft: 2,
          marginRight: Spacing.three,
        },
        bullet_list_content: { flex: 1 },
        ordered_list_content: { flex: 1 },
        code_inline: {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
          borderRadius: 5,
          borderWidth: StyleSheet.hairlineWidth,
          color: colors.text,
          fontFamily: Fonts?.mono,
          fontSize: 13,
          paddingHorizontal: 5,
          paddingVertical: 2,
        },
        code_block: {
          backgroundColor: colors.backgroundElement,
          color: colors.text,
          fontFamily: Fonts?.mono,
          fontSize: 13,
          lineHeight: 20,
        },
        fence: {
          backgroundColor: colors.backgroundElement,
          color: colors.text,
          fontFamily: Fonts?.mono,
          fontSize: 13,
          lineHeight: 20,
          padding: Spacing.four,
        },
        codeScroll: {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
          borderRadius: Radius.medium,
          borderWidth: StyleSheet.hairlineWidth,
          marginBottom: Spacing.four,
          maxWidth: "100%",
        },
        codeScrollContent: { minWidth: "100%" },
        table: {
          borderColor: colors.border,
          borderRadius: Radius.small,
          borderWidth: StyleSheet.hairlineWidth,
          marginBottom: Spacing.four,
        },
        tr: {
          borderBottomColor: colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          flexDirection: "row",
        },
        th: {
          backgroundColor: colors.backgroundElement,
          flex: 1,
          padding: Spacing.two,
        },
        td: { flex: 1, padding: Spacing.two },
        hr: {
          backgroundColor: colors.border,
          height: StyleSheet.hairlineWidth,
          marginBottom: Spacing.five,
          marginTop: Spacing.four,
        },
        image: { borderRadius: Radius.medium, flex: 1, marginVertical: Spacing.three },
      }),
    [colors],
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
