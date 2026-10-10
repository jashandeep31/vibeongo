type FileDraft = { content: string; savedContent: string };

// Retain unsaved edits across workspace/route unmounts without serializing a
// megabyte into storage on every keystroke. Runtime identity prevents cross-instance saves.
const drafts = new Map<string, FileDraft>();
const key = (instanceId: string, path: string) =>
  JSON.stringify([instanceId, path]);
const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();

function updateUnloadGuard() {
  if (typeof window === "undefined") return;
  window.removeEventListener("beforeunload", warnBeforeUnload);
  if (drafts.size) window.addEventListener("beforeunload", warnBeforeUnload);
}

export function readRuntimeFileDraft(instanceId: string, path: string) {
  return drafts.get(key(instanceId, path));
}

export function writeRuntimeFileDraft(
  instanceId: string,
  path: string,
  content: string,
  savedContent: string,
) {
  if (content === savedContent) drafts.delete(key(instanceId, path));
  else drafts.set(key(instanceId, path), { content, savedContent });
  updateUnloadGuard();
}

export function discardRuntimeFileDraft(instanceId: string, path: string) {
  for (const storedKey of drafts.keys()) {
    const [runtime, filePath] = JSON.parse(storedKey) as [string, string];
    if (
      runtime === instanceId &&
      (filePath === path || filePath.startsWith(`${path.replace(/\/$/, "")}/`))
    )
      drafts.delete(storedKey);
  }
  updateUnloadGuard();
}

export function saveRuntimeFileDraft(
  instanceId: string,
  path: string,
  submitted: string,
) {
  const current = readRuntimeFileDraft(instanceId, path);
  if (current)
    writeRuntimeFileDraft(instanceId, path, current.content, submitted);
}
