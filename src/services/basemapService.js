import { invoke } from '@tauri-apps/api/core';

// Available basemap options
export const basemapOptions = [
  { 
    value: 'openstreetmap', 
    label: 'OpenStreetMap', 
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
    attribution: '© OpenStreetMap',
    maxZoom: 19
  },
  { 
    value: 'satellite', 
    label: 'Satellite', 
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
    attribution: '© Esri',
    maxZoom: 19
  },
  { 
    value: 'terrain', 
    label: 'Terrain', 
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', 
    attribution: '© OpenTopoMap',
    maxZoom: 17
  },
  { 
    value: 'dark', 
    label: 'Dark', 
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', 
    attribution: '© CartoDB',
    maxZoom: 19
  },
  { 
    value: 'light', 
    label: 'Light', 
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', 
    attribution: '© CartoDB',
    maxZoom: 19
  }
];

// Get the current basemap configuration
export async function getCurrentBasemap() {
  try {
    const basemapValue = await invoke('get_user_pref', { key: 'basemap' });
    const selectedBasemap = basemapValue || 'openstreetmap';
    return basemapOptions.find(option => option.value === selectedBasemap) || basemapOptions[0];
  } catch (error) {
    console.error('Failed to load basemap setting:', error);
    return basemapOptions[0]; // Default to OpenStreetMap
  }
}

// Get basemap configuration by value
export function getBasemapByValue(value) {
  return basemapOptions.find(option => option.value === value) || basemapOptions[0];
} 