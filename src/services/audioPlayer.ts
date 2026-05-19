import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_PREF_KEY = 'bp_music_enabled';
let soundObj: Audio.Sound | null = null;
let isLoaded = false;
let loadFailed = false;

export async function getMusicEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(MUSIC_PREF_KEY);
  // Default: ON (null means first launch)
  return val === null ? true : val === 'true';
}

export async function setMusicEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(MUSIC_PREF_KEY, enabled ? 'true' : 'false');
}

export async function loadMusic(): Promise<boolean> {
  if (isLoaded) return true;
  if (loadFailed) return false;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    // File must exist at: assets/sounds/background.mp3
    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../assets/sounds/background.mp3.mp3'),
      { isLooping: true, volume: 0.35, shouldPlay: false }
    );
    soundObj = sound;
    isLoaded = true;
    return true;
  } catch (err) {
    loadFailed = true;
    console.warn('[AudioPlayer] Could not load background.mp3:', err);
    return false;
  }
}

export async function playMusic(): Promise<void> {
  const ok = await loadMusic();
  if (!ok) return;
  try {
    if (soundObj) await soundObj.playAsync();
  } catch (err) {
    console.warn('[AudioPlayer] playMusic error:', err);
  }
}

export async function pauseMusic(): Promise<void> {
  try {
    if (soundObj) await soundObj.pauseAsync();
  } catch {}
}

export async function stopMusic(): Promise<void> {
  try {
    if (soundObj) {
      await soundObj.stopAsync();
      await soundObj.setPositionAsync(0);
    }
  } catch {}
}

export async function toggleMusic(): Promise<boolean> {
  const current = await getMusicEnabled();
  const next = !current;
  await setMusicEnabled(next);
  if (next) {
    await playMusic();
  } else {
    await pauseMusic();
  }
  return next;
}

export async function unloadMusic(): Promise<void> {
  try {
    if (soundObj) {
      await soundObj.unloadAsync();
      soundObj = null;
      isLoaded = false;
      loadFailed = false;
    }
  } catch {}
}

export function isMusicAvailable(): boolean {
  return !loadFailed;
}
