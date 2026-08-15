import { useLocalSearchParams } from "expo-router";

import { VibeongoChatScreen } from "@/components/chats/vibeongo-chat-screen";

export default function VibeongoChatRoute() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  return <VibeongoChatScreen chatId={chatId} />;
}
