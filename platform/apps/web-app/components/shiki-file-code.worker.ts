import { codeToHtml } from "shiki";

type HighlightRequest = {
  id: number;
  code: string;
  language: string;
};

type HighlightResponse = {
  id: number;
  html: string | null;
};

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<HighlightRequest>) => void) | null;
  postMessage: (message: HighlightResponse) => void;
};
let latestRequest: HighlightRequest | null = null;
let isProcessing = false;

async function processLatestRequest() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    while (latestRequest) {
      const request = latestRequest;
      latestRequest = null;
      try {
        const html = await codeToHtml(request.code, {
          lang: request.language,
          theme: "github-dark",
        });
        workerScope.postMessage({ id: request.id, html } satisfies HighlightResponse);
      } catch {
        workerScope.postMessage({ id: request.id, html: null } satisfies HighlightResponse);
      }
    }
  } finally {
    isProcessing = false;
  }
}

workerScope.onmessage = (event: MessageEvent<HighlightRequest>) => {
  latestRequest = event.data;
  void processLatestRequest();
};

export {};
