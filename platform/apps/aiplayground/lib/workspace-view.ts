export type WorkspaceView = "chats" | "projects";

export const WORKSPACE_VIEW_CHANGE_EVENT = "aiplayground-workspace-view-change";

export function isWorkspaceView(value: unknown): value is WorkspaceView {
  return value === "chats" || value === "projects";
}

export function selectWorkspaceView(view: WorkspaceView) {
  window.dispatchEvent(
    new CustomEvent<WorkspaceView>(WORKSPACE_VIEW_CHANGE_EVENT, {
      detail: view,
    }),
  );
}
