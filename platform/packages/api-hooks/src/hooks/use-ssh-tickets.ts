import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "../api-client-context.js";

/** Creates a fresh SSH ticket when the user requests a connection command. */
export const useCreateSshTicket = () => {
  const client = useApiClient();
  return useMutation({
    mutationFn: (projectSessionId: string) =>
      client.sshTickets.createSshTicket(projectSessionId),
  });
};
