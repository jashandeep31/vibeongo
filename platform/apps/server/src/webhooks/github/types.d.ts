export type WebhookHandler<T> = {
  id: string;
  name: string;
  payload: T;
  octokit: Octokit;
};
