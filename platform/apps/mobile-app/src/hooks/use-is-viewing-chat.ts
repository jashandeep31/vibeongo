import { useGlobalSearchParams, usePathname } from "expo-router";
import { useCallback, useRef } from "react";

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// splits a notification url (/projects/:id/sessions/:id/chat?chatId=:id);
// parsed by hand, URLSearchParams is incomplete in React Native
const parseChatUrl = (url: unknown) => {
  if (typeof url !== "string" || !url.startsWith("/")) return null;
  const [path = "", query = ""] = url.split("?");
  const chatId = /(?:^|&)chatId=([^&]*)/.exec(query)?.[1];
  if (!chatId) return null;
  return { pathname: decode(path), chatId: decode(chatId) };
};

/**
 * Returns a stable check whether a notification url points at the chat that
 * is on screen right now, so its notification needs no toast.
 */
export function useIsViewingChat() {
  const pathname = usePathname();
  const { chatId } = useGlobalSearchParams<{ chatId?: string | string[] }>();
  const currentRef = useRef({ pathname, chatId });
  currentRef.current = { pathname, chatId };

  return useCallback((url: unknown) => {
    const target = parseChatUrl(url);
    if (!target) return false;

    const current = currentRef.current;
    const currentChatId = Array.isArray(current.chatId)
      ? current.chatId[0]
      : current.chatId;
    return (
      decode(current.pathname) === target.pathname &&
      currentChatId === target.chatId
    );
  }, []);
}
