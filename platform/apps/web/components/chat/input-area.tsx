"use client";

import { PromptInput } from "@/components/chat/prompt-input";

interface InputAreaProps {
  chatId: string;
  sendJsonMessage: (message: unknown) => void;
  onSubmitSuccess?: () => void;
}

export function InputArea({
  chatId,
  sendJsonMessage,
  onSubmitSuccess,
}: InputAreaProps) {
  const handleSubmit = (question: string) => {
    sendJsonMessage({
      type: "new-question",
      data: {
        chatId,
        question,
      },
    });
  };

  return (
    <PromptInput
      onSubmit={handleSubmit}
      onSubmitSuccess={() => {
        window.setTimeout(() => {
          requestAnimationFrame(() => {
            onSubmitSuccess?.();
          });
        }, 1000);
      }}
    />
  );
}
