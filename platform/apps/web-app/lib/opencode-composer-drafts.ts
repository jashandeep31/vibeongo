import type {
  OpencodeFileReference,
  OpencodeForkDraft,
  OpencodePromptSelection,
} from "@repo/api-client";

export type ComposerDraft = {
  text: string;
  files: File[];
  fileReferences: OpencodeFileReference[];
  forkDraft?: OpencodeForkDraft;
  selection: OpencodePromptSelection;
};
const drafts = new Map<string, { draft: ComposerDraft; saved: number }>();
export function composerDraftKey(
  serverUrl: string,
  chatId: string,
  directory: string,
  sessionId: string,
) {
  return JSON.stringify([serverUrl, chatId, directory, sessionId]);
}
export function readComposerDraft(key: string) {
  const entry = drafts.get(key);
  if (entry && Date.now() - entry.saved < 30 * 60 * 1000) return entry.draft;
  drafts.delete(key);
}
export function saveComposerDraft(key: string, draft: ComposerDraft) {
  drafts.delete(key);
  if (draft.text || draft.files.length || draft.forkDraft)
    drafts.set(key, { draft, saved: Date.now() });
  while (drafts.size > 32) drafts.delete(drafts.keys().next().value!);
}
