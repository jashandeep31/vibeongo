export const RUNTIME_CODE_DIRECTORY = "/home/vibe/code";

export function getRuntimeRepositoryDirectory(fullName: string): string {
  const repoName = fullName.split("/").filter(Boolean).at(-1) ?? fullName;
  return `${RUNTIME_CODE_DIRECTORY}/${repoName}`;
}

export function isRuntimeRepositoryDirectory(directory: string): boolean {
  const prefix = `${RUNTIME_CODE_DIRECTORY}/`;
  if (!directory.startsWith(prefix)) return false;
  const repoName = directory.slice(prefix.length);
  return (
    repoName !== "." &&
    repoName !== ".." &&
    /^[A-Za-z0-9._-]+$/.test(repoName)
  );
}
