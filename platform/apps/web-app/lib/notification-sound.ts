// a burst of notifications plays the sound once
const MIN_INTERVAL_MS = 1_000;
// per device, not synced to the account
const SOUND_ENABLED_KEY = "vibeongo.notificationSound";

let audio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;
// used when storage is blocked, the choice then lasts until reload
let enabledInMemory = true;

export function isNotificationSoundEnabled() {
  try {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? enabledInMemory : stored !== "off";
  } catch {
    return enabledInMemory;
  }
}

export function setNotificationSoundEnabled(enabled: boolean) {
  enabledInMemory = enabled;
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "on" : "off");
  } catch {
    // storage blocked, kept in memory only
  }
}

export function playNotificationSound() {
  if (!isNotificationSoundEnabled()) return;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  audio ??= new Audio("/sounds/notification.mp3");
  audio.currentTime = 0;
  // rejected by the browser until the user has interacted with the page
  void audio.play().catch(() => {});
}
