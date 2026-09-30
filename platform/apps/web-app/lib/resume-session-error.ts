import { isInsufficientBalanceMessage } from "@repo/shared";
import axios from "axios";
import { toast } from "sonner";

type Navigate = (href: string) => void;

// Resume failures come back as `{ message }` with a 400 for low balance and a
// 402 for the instance limit; both get a shortcut to the page that fixes them.
export function showResumeSessionError(error: unknown, navigate: Navigate) {
  const response = axios.isAxiosError<{ message?: unknown }>(error)
    ? error.response
    : undefined;
  const message =
    typeof response?.data?.message === "string" && response.data.message.trim()
      ? response.data.message
      : error instanceof Error && error.message.trim()
        ? error.message
        : undefined;

  if (isInsufficientBalanceMessage(message)) {
    toast.error("Insufficient balance", {
      description: message,
      action: { label: "Add credits", onClick: () => navigate("/wallet") },
    });
    return;
  }

  if (response?.status === 402) {
    toast.error("Instance limit reached", {
      description:
        message ??
        "Upgrade your plan or stop a running session before starting another.",
      action: { label: "View limits", onClick: () => navigate("/limits") },
    });
    return;
  }

  toast.error("Could not resume session", {
    description: message ?? "Please check your connection and try again.",
  });
}
