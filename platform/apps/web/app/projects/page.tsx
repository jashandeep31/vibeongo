"use client";
import React, { useEffect } from "react";
export default function Page() {
  useEffect(() => {
    const sse = new EventSource("http://localhost:8080/stats");
    function getRealtimeData(data: unknown) {
      console.log(data);
      // process the data here,
      // then pass it to state to be rendered
    }
    sse.onmessage = (e) => getRealtimeData(e.data);
    sse.onerror = () => {
      // error log here

      sse.close();
    };
    return () => {
      sse.close();
    };
  }, []);
  return (
    <div className="p-6">
      <h1>The common page for projects</h1>
    </div>
  );
}
