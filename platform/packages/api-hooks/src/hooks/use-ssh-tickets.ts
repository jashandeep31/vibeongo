import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

/** Creates a fresh SSH ticket when the user requests a connection command. */
export const useCreateSshTicket = () => {
  const client = useApiClient();
  return useMutation({
    mutationFn: (projectSessionId: string) => {
      if (!("sshTickets" in client)) {
        throw new Error("SSH tickets are available only in the web app");
      }
      return client.sshTickets.createSshTicket(projectSessionId);
    },
  });
};
