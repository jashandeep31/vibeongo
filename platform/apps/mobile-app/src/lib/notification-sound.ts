import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as SecureStore from "expo-secure-store";

const notificationSound = require("../../assets/sounds/notification.mp3");

// a burst (or pending ones flushed together) plays the sound once
const MIN_INTERVAL_MS = 1_000;
// per device, not synced to the account
const SOUND_ENABLED_KEY = "vibeongo.notificationSound";

let player: AudioPlayer | null = null;
let lastPlayedAt = 0;
// the same notification can arrive over the websocket and as a push
const playedIds = new Set<string>();

// cached so playing never waits on storage, loaded once at startup
let soundEnabled = true;
const soundEnabledLoaded = SecureStore.getItemAsync(SOUND_ENABLED_KEY)
  .then((stored) => {
    soundEnabled = stored !== "off";
  })
  .catch(() => undefined);

export async function getNotificationSoundEnabled() {
  await soundEnabledLoaded;
  return soundEnabled;
}

export async function setNotificationSoundEnabled(enabled: boolean) {
  // the startup read must not overwrite this choice
  await soundEnabledLoaded;
  soundEnabled = enabled;
  await SecureStore.setItemAsync(SOUND_ENABLED_KEY, enabled ? "on" : "off");
}

export function playNotificationSound(notificationId: string) {
  if (playedIds.has(notificationId)) return;
  playedIds.add(notificationId);
  if (!soundEnabled) return;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  try {
    // kept for the app's lifetime, it is reused for every notification
    player ??= createAudioPlayer(notificationSound);
    void player.seekTo(0);
    player.play();
  } catch (error) {
    console.warn("failed to play the notification sound", error);
  }
}
