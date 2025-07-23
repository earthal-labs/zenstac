import { invoke } from '@tauri-apps/api/core';
import { createSignal, createEffect } from 'solid-js';

// Global dark mode signal
export const darkModeSignal = createSignal(false);

// Get the current dark mode setting
export async function getDarkModeSetting() {
  try {
    const darkModeValue = await invoke('get_user_pref', { key: 'dark_mode' });
    return darkModeValue === 'true';
  } catch (error) {
    console.error('Failed to load dark mode setting:', error);
    return false; // Default to light mode
  }
}

// Save dark mode setting
export async function saveDarkModeSetting(isDark) {
  try {
    await invoke('set_user_pref', { key: 'dark_mode', value: isDark.toString() });

  } catch (error) {
    console.error('Failed to save dark mode setting:', error);
  }
}

// Apply dark mode to the document
export function applyDarkMode(isDark) {
  const [, setDarkMode] = darkModeSignal;
  setDarkMode(isDark);
  
  if (isDark) {
    document.documentElement.classList.add('dark', 'sl-theme-dark');
    document.body.classList.add('dark', 'sl-theme-dark');
  } else {
    document.documentElement.classList.remove('dark', 'sl-theme-dark');
    document.body.classList.remove('dark', 'sl-theme-dark');
  }
}

// Initialize dark mode on app start
export async function initializeDarkMode() {
  const isDark = await getDarkModeSetting();
  applyDarkMode(isDark);
}

// Toggle dark mode
export async function toggleDarkMode() {
  const [isDark] = darkModeSignal;
  const newDarkMode = !isDark();
  applyDarkMode(newDarkMode);
  await saveDarkModeSetting(newDarkMode);
} 