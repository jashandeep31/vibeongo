"use client";
import { InputArea } from "@/components/chat/input-area";
import { useVibeSocket } from "@/hooks/use-vibe-socket";
import { useEffect } from "react";

interface ClientViewProps {
  chatid: string;
}

const ClientView = ({ chatid }: ClientViewProps) => {
  const { websocket, sendJsonMessage } = useVibeSocket();

  useEffect(() => {
    if (!websocket) return;
    // Getting the chat from the backend
    websocket.send(
      JSON.stringify({
        type: "get-chat",
        data: {
          id: chatid,
        },
      }),
    );

    websocket.addEventListener("message", (event) => {
      console.log(event);
    });
    return () => {
      websocket.removeEventListener("message", () => {});
    };
  }, [websocket, chatid]);

  return (
    <div className="flex h-full flex-col justify-between">
      <div></div>
      <div className="px-4 pb-4 md:px-0">
        <div className="mx-auto w-full md:w-2/3">
          <InputArea sendJsonMessage={sendJsonMessage} />
        </div>
      </div>
    </div>
  );
};

export default ClientView;
