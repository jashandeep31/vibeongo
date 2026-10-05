import { DEFAULT_SERVER_URL } from "./api.js";

export class LoginRequiredError extends Error {
  constructor(serverUrl: string) {
    const serverOption = serverUrl === DEFAULT_SERVER_URL
      ? ""
      : ` --server-url '${serverUrl.replaceAll("'", "'\\''")}'`;
    super(
      `You are not logged in to Vibeongo. Run: npx @vibeongo/cli login${serverOption}, then retry ChatGPT login with the same server.`,
    );
    this.name = "LoginRequiredError";
  }
}
