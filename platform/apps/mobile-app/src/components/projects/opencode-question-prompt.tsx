import type { QuestionAnswer, QuestionRequest } from "@repo/api-client";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { useTheme } from "@/hooks/use-theme";

export function OpencodeQuestionPrompt({
  request,
  isSubmitting,
  isDismissing,
  onSubmit,
  onDismiss,
}: {
  request: QuestionRequest;
  isSubmitting: boolean;
  isDismissing: boolean;
  onSubmit: (requestId: string, answers: QuestionAnswer[]) => void;
  onDismiss: (requestId: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const keyboardScrollTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[][]>(() =>
    request.questions.map(() => []),
  );
  const [customAnswers, setCustomAnswers] = useState<string[]>(() =>
    request.questions.map(() => ""),
  );
  const [customActive, setCustomActive] = useState<boolean[]>(() =>
    request.questions.map(() => false),
  );
  const question = request.questions[questionIndex];
  const selected = selectedAnswers[questionIndex] ?? [];
  const isBusy = isSubmitting || isDismissing;
  const isLastQuestion = questionIndex === request.questions.length - 1;
  const answers = useMemo<QuestionAnswer[]>(
    () =>
      request.questions.map((_, index) => {
        const selectedForQuestion = selectedAnswers[index] ?? [];
        const custom = customActive[index]
          ? customAnswers[index]?.trim()
          : undefined;
        return custom
          ? [
              ...selectedForQuestion.filter((answer) => answer !== custom),
              custom,
            ]
          : selectedForQuestion;
      }),
    [customActive, customAnswers, request.questions, selectedAnswers],
  );
  const currentAnswer = answers[questionIndex] ?? [];
  const scrollToCustomAnswer = useCallback(() => {
    if (keyboardScrollTimerRef.current) {
      clearTimeout(keyboardScrollTimerRef.current);
    }
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
    keyboardScrollTimerRef.current = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      280,
    );
  }, []);

  useEffect(() => {
    const eventName =
      process.env.EXPO_OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const showSubscription = Keyboard.addListener(eventName, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      if (customActive[questionIndex]) scrollToCustomAnswer();
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (keyboardScrollTimerRef.current) {
        clearTimeout(keyboardScrollTimerRef.current);
      }
    };
  }, [customActive, questionIndex, scrollToCustomAnswer]);

  if (!question) return null;

  const availableHeight = Math.max(
    240,
    Dimensions.get("window").height -
      keyboardHeight -
      insets.top -
      insets.bottom -
      24,
  );

  const selectOption = (label: string) => {
    setSelectedAnswers((current) =>
      current.map((answer, index) => {
        if (index !== questionIndex) return answer;
        if (!question.multiple) return [label];
        return answer.includes(label)
          ? answer.filter((item) => item !== label)
          : [...answer, label];
      }),
    );
    if (!question.multiple) {
      setCustomActive((current) =>
        current.map((active, index) =>
          index === questionIndex ? false : active,
        ),
      );
    }
  };

  const activateCustom = () => {
    setCustomActive((current) =>
      current.map((active, index) =>
        index === questionIndex ? !active : active,
      ),
    );
    if (!question.multiple) {
      setSelectedAnswers((current) =>
        current.map((answer, index) => (index === questionIndex ? [] : answer)),
      );
    }
  };

  const proceed = () => {
    if (currentAnswer.length === 0 || isBusy) return;
    if (!isLastQuestion) {
      setQuestionIndex((current) => current + 1);
    } else if (answers.every((answer) => answer.length > 0)) {
      onSubmit(request.id, answers);
    }
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={() => !isBusy && onDismiss(request.id)}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalKeyboardView}
      >
        <View style={styles.backdrop} />
        <BottomDrawerPanel
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
              marginBottom: Math.max(insets.bottom, 8),
              maxHeight: Math.min(520, availableHeight),
            },
          ]}
        >
          <View style={styles.handle} />
          <QuestionContent />
        </BottomDrawerPanel>
      </KeyboardAvoidingView>
    </Modal>
  );

  function QuestionContent() {
    if (!question) return null;
    return (
      <>
        <View style={styles.topBar}>
          <ThemedText style={styles.progressText}>
            {questionIndex + 1} of {request.questions.length} question
            {request.questions.length === 1 ? "" : "s"}
          </ThemedText>
          <View style={styles.progressBars}>
            {request.questions.map((_, index) => (
              <View
                key={`${request.id}-progress-${index}`}
                style={[
                  styles.progressBar,
                  {
                    backgroundColor:
                      index <= questionIndex
                        ? theme.text
                        : theme.backgroundSelected,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          style={styles.scrollArea}
        >
          <ThemedText style={styles.question}>{question.question}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
            {question.multiple
              ? "Select one or more answers"
              : "Select one answer"}
          </ThemedText>

          <View style={styles.options}>
            {question.options.map((option) => {
              const checked = selected.includes(option.label);
              return (
                <Pressable
                  accessibilityRole={question.multiple ? "checkbox" : "radio"}
                  accessibilityState={{ checked, disabled: isBusy }}
                  disabled={isBusy}
                  key={option.label}
                  onPress={() => selectOption(option.label)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: checked
                        ? theme.backgroundSelected
                        : theme.background,
                      borderColor: checked
                        ? theme.text
                        : theme.backgroundSelected,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      question.multiple ? styles.checkbox : styles.radio,
                      {
                        borderColor: checked ? theme.text : theme.textSecondary,
                      },
                    ]}
                  >
                    {checked ? (
                      question.multiple ? (
                        <SymbolView
                          name={{ ios: "checkmark", android: "check" }}
                          size={11}
                          tintColor={theme.text}
                        />
                      ) : (
                        <View
                          style={[
                            styles.radioDot,
                            { backgroundColor: theme.text },
                          ]}
                        />
                      )
                    ) : null}
                  </View>
                  <View style={styles.optionText}>
                    <ThemedText style={styles.optionLabel}>
                      {option.label}
                    </ThemedText>
                    {option.description ? (
                      <ThemedText
                        style={{ color: theme.textSecondary, fontSize: 12 }}
                      >
                        {option.description}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}

            {question.custom !== false ? (
              <Pressable
                accessibilityRole={question.multiple ? "checkbox" : "radio"}
                accessibilityState={{
                  checked: customActive[questionIndex] ?? false,
                  disabled: isBusy,
                }}
                disabled={isBusy}
                onPress={activateCustom}
                style={[
                  styles.option,
                  {
                    backgroundColor: customActive[questionIndex]
                      ? theme.backgroundSelected
                      : theme.background,
                    borderColor: customActive[questionIndex]
                      ? theme.text
                      : theme.backgroundSelected,
                  },
                ]}
              >
                <View
                  style={[
                    question.multiple ? styles.checkbox : styles.radio,
                    { borderColor: theme.textSecondary },
                  ]}
                />
                <View style={styles.optionText}>
                  <ThemedText style={styles.optionLabel}>
                    Type your own answer
                  </ThemedText>
                  {customActive[questionIndex] ? (
                    <TextInput
                      autoFocus
                      editable={!isBusy}
                      onChangeText={(value) =>
                        setCustomAnswers((current) =>
                          current.map((answer, index) =>
                            index === questionIndex ? value : answer,
                          ),
                        )
                      }
                      onFocus={scrollToCustomAnswer}
                      onPressIn={(event) => event.stopPropagation()}
                      placeholder="Type your answer…"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.customInput,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      value={customAnswers[questionIndex] ?? ""}
                    />
                  ) : (
                    <ThemedText
                      style={{ color: theme.textSecondary, fontSize: 12 }}
                    >
                      Type your answer…
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        <View
          style={[styles.actions, { borderColor: theme.backgroundSelected }]}
        >
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => onDismiss(request.id)}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
            ]}
          >
            {isDismissing ? <ActivityIndicator size="small" /> : null}
            <ThemedText>Dismiss</ThemedText>
          </Pressable>
          <View style={styles.rightActions}>
            {questionIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => setQuestionIndex((current) => current - 1)}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText>Back</ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={currentAnswer.length === 0 || isBusy}
              onPress={proceed}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.text },
                (currentAnswer.length === 0 || isBusy) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.background} size="small" />
              ) : null}
              <ThemedText
                style={{ color: theme.background, fontWeight: "700" }}
              >
                {isLastQuestion ? "Submit" : "Next"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 9,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  actions: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
  },
  body: { gap: 6, padding: 14 },
  backdrop: {
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.36)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  card: {
    alignSelf: "stretch",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  checkbox: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    marginTop: 1,
    width: 18,
  },
  customInput: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
    marginTop: 5,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  disabled: { opacity: 0.42 },
  handle: {
    alignSelf: "center",
    backgroundColor: "rgba(128, 128, 128, 0.5)",
    borderRadius: 2,
    height: 4,
    marginTop: 7,
    width: 36,
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  option: {
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    padding: 11,
  },
  optionLabel: { fontSize: 13, fontWeight: "700" },
  optionText: { flex: 1, gap: 3 },
  options: { gap: 8, marginTop: 8 },
  pressed: { opacity: 0.7 },
  primaryButton: {
    alignItems: "center",
    borderRadius: 9,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 16,
  },
  progressBar: { borderRadius: 2, height: 3, width: 20 },
  progressBars: { flexDirection: "row", gap: 4 },
  progressText: { fontSize: 12, fontWeight: "700" },
  question: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  radio: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    marginTop: 1,
    width: 18,
  },
  radioDot: { borderRadius: 5, height: 9, width: 9 },
  rightActions: { alignItems: "center", flexDirection: "row", gap: 4 },
  scrollArea: { flexShrink: 1 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 13,
  },
});
