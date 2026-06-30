import { chatAnswer, chatQuestions } from "@repo/db";
import WebSocket from "ws";

export type StreamingQuestionWithAnswer = typeof chatQuestions.$inferSelect & {
  answer: typeof chatAnswer.$inferSelect;
};

const chatSubscribers = new Map<string, Set<WebSocket>>();
const activeChatStreams = new Map<string, StreamingQuestionWithAnswer>();

export const addSubscriber = (chatId: string, socket: WebSocket) => {
  const subscribers = chatSubscribers.get(chatId) ?? new Set<WebSocket>();
  subscribers.add(socket);
  chatSubscribers.set(chatId, subscribers);
};

export const removeSubscriber = (chatId: string, socket: WebSocket) => {
  const subscribers = chatSubscribers.get(chatId);
  if (!subscribers) return;

  subscribers.delete(socket);
  if (!subscribers.size) {
    chatSubscribers.delete(chatId);
  }
};

export const removeSocketFromAllChats = (socket: WebSocket) => {
  for (const chatId of Array.from(chatSubscribers.keys())) {
    removeSubscriber(chatId, socket);
  }
};

export const getActiveStream = (chatId: string) => {
  return activeChatStreams.get(chatId);
};

export const setActiveStream = (
  chatId: string,
  stream: StreamingQuestionWithAnswer,
) => {
  activeChatStreams.set(chatId, stream);
};

export const clearActiveStream = (chatId: string) => {
  activeChatStreams.delete(chatId);
};

export const broadcastToChat = (chatId: string, message: unknown) => {
  const subscribers = chatSubscribers.get(chatId);
  if (!subscribers) return;

  const payload = JSON.stringify(message);

  for (const subscriber of subscribers) {
    if (subscriber.readyState === WebSocket.OPEN) {
      subscriber.send(payload);
      continue;
    }

    subscribers.delete(subscriber);
  }

  if (!subscribers.size) {
    chatSubscribers.delete(chatId);
  }
};
