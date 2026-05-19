import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_PREF_KEY = 'bp_music_enabled';
let soundObj: Audio.Sound | null = null;
let isLoaded = false;

export async function getMusicEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(MUSIC_PREF_KEY);
  // Default: off
  return val === 'true';
}

export async function setMusicEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(MUSIC_PREF_KEY, enabled ? 'true' : 'false');
}

export async function loadMusic(): Promise<void> {
  if (isLoaded) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/background.mp3'),
      { isLooping: true, volume: 0.35, shouldPlay: false }
    );
    soundObj = sound;
    isLoaded = true;
  } catch {}
}

export async function playMusic(): Promise<void> {
  if (!isLoaded) await loadMusic();
  try {
    const enabled = await getMusicEnabled();
    if (enabled && soundObj) await soundObj.playAsync();
  } catch {}
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
    }
  } catch {}
}
