import ChatClientView from "./client-view";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;

  return <ChatClientView chatId={chatId} />;
}
