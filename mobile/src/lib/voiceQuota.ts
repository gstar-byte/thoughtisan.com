import AsyncStorage from '@react-native-async-storage/async-storage';

/** Free voice captures per account on this device before Pro is required. */
export const VOICE_FREE_LIMIT = 10;

const storageKey = (uid: string) => `@ic/voice_captures/${uid}`;

export async function getVoiceCaptureCount(uid: string): Promise<number> {
  const raw = await AsyncStorage.getItem(storageKey(uid));
  const n = parseInt(raw ?? '0', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Call after a successful voice-created note (non‑Pro only). */
export async function incrementVoiceCaptureCount(uid: string): Promise<number> {
  const next = (await getVoiceCaptureCount(uid)) + 1;
  await AsyncStorage.setItem(storageKey(uid), String(next));
  return next;
}

export function voiceCapturesRemaining(
  isPremium: boolean,
  count: number,
): number | null {
  if (isPremium) return null;
  return Math.max(0, VOICE_FREE_LIMIT - count);
}
