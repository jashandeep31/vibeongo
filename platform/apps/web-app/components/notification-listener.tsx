"use client";

import { useMarkNotificationRead, useWebSocket } from "@repo/api-hooks";
import { cn } from "@repo/ui/lib/utils";
import { ArrowUpRightIcon, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { playNotificationSound } from "@/lib/notification-sound";

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  payload: { url?: unknown } | null;
};

const TOAST_DURATION_MS = 10_000;
const EXIT_DURATION_MS = 200;
// older ones are dropped so the stack never covers the page
const MAX_VISIBLE_TOASTS = 3;
// collapsed stack: each older toast peeks out below, a bit smaller
const STACK_OFFSET_PX = 10;
const STACK_SCALE_STEP = 0.05;
// expanded stack (hovered): toasts listed with this gap
const EXPANDED_GAP_PX = 8;

const isAppNotification = (data: unknown): data is AppNotification =>
  typeof data === "object" &&
  data !== null &&
  typeof (data as AppNotification).id === "string" &&
  typeof (data as AppNotification).title === "string";

// payload.url is the mobile app path (/projects/:id/sessions/:id/chat?chatId=:id);
// the web app shows that chat at /projects/:id/sessions/:id/chats/:id
const toWebUrl = (url: unknown): string | null => {
  if (typeof url !== "string" || !url.startsWith("/")) return null;

  const { pathname, searchParams } = new URL(url, "http://localhost");
  const match = /^\/projects\/([^/]+)\/sessions\/([^/]+)\/chat\/?$/.exec(
    pathname,
  );
  if (!match) return url;

  const [, projectId, sessionId] = match;
  const chatId = searchParams.get("chatId");
  return chatId && chatId !== "new"
    ? `/projects/${projectId}/sessions/${sessionId}/chats/${encodeURIComponent(chatId)}`
    : `/projects/${projectId}/sessions/${sessionId}`;
};

const decodePath = (path: string) => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

// the notification links to the page that is open right now
const isCurrentPage = (url: string, pathname: string) =>
  decodePath(url.split("?")[0] ?? url) === decodePath(pathname);

// the notification's chat is on screen: the tab is visible and on that page
const isViewingChat = (notification: AppNotification, pathname: string) => {
  const url = toWebUrl(notification.payload?.url);
  return (
    document.visibilityState === "visible" &&
    url !== null &&
    isCurrentPage(url, pathname)
  );
};

function NotificationToast({
  notification,
  index,
  expanded,
  leaving,
  offsetY,
  frontHeight,
  onHeight,
  onOpen,
  onDismiss,
}: {
  notification: AppNotification;
  // 0 is the newest, on top of the stack
  index: number;
  expanded: boolean;
  leaving: boolean;
  offsetY: number;
  frontHeight: number | undefined;
  onHeight: (id: string, height: number) => void;
  onOpen: (notification: AppNotification, url: string) => void;
  onDismiss: (id: string) => void;
}) {
  const url = toWebUrl(notification.payload?.url);
  const contentRef = useRef<HTMLDivElement>(null);

  // hovering the stack keeps every toast open so they can be read
  useEffect(() => {
    if (expanded || leaving) return;
    const timer = setTimeout(
      () => onDismiss(notification.id),
      TOAST_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [expanded, leaving, notification.id, onDismiss]);

  // natural height, used to lay out the expanded stack
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() =>
      onHeight(notification.id, content.offsetHeight),
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, [notification.id, onHeight]);

  const collapsedBehind = !expanded && index > 0;
  const scale = expanded ? 1 : 1 - index * STACK_SCALE_STEP;

  return (
    <div
      className="absolute inset-x-0 top-0 origin-top overflow-hidden transition-[transform,opacity,height] duration-300 ease-out"
      style={{
        zIndex: MAX_VISIBLE_TOASTS - index,
        transform: leaving
          ? `translate(24px, ${offsetY}px) scale(${scale})`
          : `translateY(${offsetY}px) scale(${scale})`,
        opacity: leaving ? 0 : 1,
        // older toasts are clipped to the front one's size while stacked
        height: collapsedBehind ? frontHeight : undefined,
      }}
    >
      <div
        ref={contentRef}
        className={cn(
          "border-border/60 bg-background/70 text-foreground animate-in fade-in slide-in-from-top-2 flex gap-3 border p-4 shadow-lg backdrop-blur-xl duration-300",
          collapsedBehind && "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1 transition-opacity duration-200",
            collapsedBehind && "opacity-0",
          )}
        >
          <p className="text-sm leading-snug font-medium break-words">
            {notification.title}
          </p>
          {notification.body ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed break-words">
              {notification.body}
            </p>
          ) : null}
          {url ? (
            <button
              type="button"
              className="hover:text-foreground text-muted-foreground mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-4 transition-colors hover:underline"
              onClick={() => onOpen(notification, url)}
            >
              Open chat
              <ArrowUpRightIcon className="size-3" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 size-6 shrink-0 p-1 transition-colors"
          onClick={() => onDismiss(notification.id)}
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

// Shows notifications received over the websocket as a toast stack in the
// top right corner and marks them read, so no push is sent. Only while the
// tab is visible: a hidden tab must not stop the push to the phone.
export function NotificationListener() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const { subscribeJsonMessage } = useWebSocket();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  // newest first
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [leavingIds, setLeavingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);
  // notifications received while the tab was hidden
  const pendingRef = useRef<AppNotification[]>([]);
  // every notification is shown once, even if the socket delivers it again
  const seenIdsRef = useRef(new Set<string>());

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    setLeavingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setHeights(({ [id]: _removed, ...rest }) => rest);
  }, []);

  // plays the exit animation, then removes it
  const dismiss = useCallback(
    (id: string) => {
      setLeavingIds((current) => new Set(current).add(id));
      setTimeout(() => remove(id), EXIT_DURATION_MS);
    },
    [remove],
  );

  const onHeight = useCallback(
    (id: string, height: number) =>
      setHeights((current) =>
        current[id] === height ? current : { ...current, [id]: height },
      ),
    [],
  );

  // already marked read when shown
  const open = (notification: AppNotification, url: string) => {
    dismiss(notification.id);
    router.push(url);
  };

  const showNotification = (notification: AppNotification) => {
    // seen in the app counts as read, even if the toast is ignored
    // (which also cancels the push to the phone)
    markNotificationRead(notification.id);

    // already looking at that chat: nothing to announce
    if (isViewingChat(notification, pathnameRef.current)) return;

    setToasts((current) =>
      [notification, ...current].slice(0, MAX_VISIBLE_TOASTS),
    );
  };
  const showNotificationRef = useRef(showNotification);
  showNotificationRef.current = showNotification;

  useEffect(() => {
    const unsubscribe = subscribeJsonMessage((message) => {
      if (message.type !== "notification" || !isAppNotification(message.data))
        return;
      if (seenIdsRef.current.has(message.data.id)) return;
      seenIdsRef.current.add(message.data.id);
      // silent for the chat being viewed (read, no toast), a hidden tab plays it
      if (!isViewingChat(message.data, pathnameRef.current))
        playNotificationSound();

      if (document.visibilityState === "visible") {
        showNotificationRef.current(message.data);
      } else {
        pendingRef.current.push(message.data);
      }
    });

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!pendingRef.current.length) return;

      const pending = pendingRef.current;
      pendingRef.current = [];
      for (const notification of pending)
        showNotificationRef.current(notification);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [subscribeJsonMessage]);

  // nothing to hover once the last one is gone
  useEffect(() => {
    if (!toasts.length) setExpanded(false);
  }, [toasts.length]);

  if (!toasts.length) return null;

  const frontHeight = toasts[0] ? heights[toasts[0].id] : undefined;
  const offsets: number[] = [];
  let expandedHeight = 0;
  for (const [index, toast] of toasts.entries()) {
    offsets.push(expanded ? expandedHeight : index * STACK_OFFSET_PX);
    expandedHeight += (heights[toast.id] ?? 0) + EXPANDED_GAP_PX;
  }
  const stackHeight = expanded
    ? expandedHeight - EXPANDED_GAP_PX
    : (frontHeight ?? 0) + (toasts.length - 1) * STACK_OFFSET_PX;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 left-4 z-[100] transition-[height] duration-300 ease-out sm:left-auto sm:w-96"
      style={{ height: stackHeight }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {toasts.map((notification, index) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          index={index}
          expanded={expanded}
          leaving={leavingIds.has(notification.id)}
          offsetY={offsets[index] ?? 0}
          frontHeight={frontHeight}
          onHeight={onHeight}
          onOpen={open}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}
