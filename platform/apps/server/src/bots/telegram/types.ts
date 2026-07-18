import type { telegramBotChat } from "@repo/db";

export const TELEGRAM_BOT_CHAT_STATES = [
  "HOME",
  "PROJECTS",
  "SELECTED_PROJECT",
  "NEW_SESSION",
] as const;

export type TelegramBotChatState =
  (typeof TELEGRAM_BOT_CHAT_STATES)[number];

export type TelegramBotChatMetadata = {
  project_id?: string;
};

export type TelegramBotChat = Omit<
  typeof telegramBotChat.$inferSelect,
  "state" | "metadata"
> & {
  state: TelegramBotChatState;
  metadata: TelegramBotChatMetadata | null;
};
