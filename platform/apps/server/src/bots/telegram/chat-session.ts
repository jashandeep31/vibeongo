import {
  db,
  desc,
  eq,
  telegramBotChatSession,
  telegramBotChatSessionMessage,
} from "@repo/db";

export const createTelegramChatSession = async ({
  telegramChatId,
  userId,
  projectId,
}: {
  telegramChatId: number;
  userId: string;
  projectId: string;
}) => {
  const [session] = await db
    .insert(telegramBotChatSession)
    .values({
      telegram_chat_id: telegramChatId,
      user_id: userId,
      project_id: projectId,
    })
    .returning({ id: telegramBotChatSession.id });

  return session;
};

export const saveTelegramChatSessionMessage = async ({
  sessionId,
  telegramChatId,
  userId,
  role,
  text,
}: {
  sessionId: string;
  telegramChatId: number;
  userId: string;
  role: "user" | "bot";
  text: string;
}) => {
  await db.insert(telegramBotChatSessionMessage).values({
    session_id: sessionId,
    telegram_chat_id: telegramChatId,
    user_id: userId,
    role,
    text,
  });
};

export const getTelegramChatSessionMessages = async (sessionId: string) => {
  return db
    .select({
      role: telegramBotChatSessionMessage.role,
      text: telegramBotChatSessionMessage.text,
    })
    .from(telegramBotChatSessionMessage)
    .where(eq(telegramBotChatSessionMessage.session_id, sessionId))
    .orderBy(desc(telegramBotChatSessionMessage.created_at))
    .limit(29)
    .then((messages) => messages.reverse());
};
