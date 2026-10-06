"use client";

import { createContext, useContext, type ReactNode } from "react";

type SubagentConnection = {
  chatId: string;
  chatUrl: string;
  serverUrl: string;
  accessToken: string;
  password?: string;
};

const SubagentContext = createContext<SubagentConnection | undefined>(
  undefined,
);

export function OpencodeSubagentProvider({
  connection,
  children,
}: {
  connection: SubagentConnection;
  children: ReactNode;
}) {
  return (
    <SubagentContext.Provider value={connection}>
      {children}
    </SubagentContext.Provider>
  );
}

export const useOpencodeSubagentConnection = () => useContext(SubagentContext);
