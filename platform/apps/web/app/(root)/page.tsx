"use client";
import { Button } from "@repo/ui/components/button";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    ws.onmessage = (event) => {
      console.log(event);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <h1>This is waste of time page</h1>
      <Button>Shadn cn is working </Button>
    </div>
  );
}
