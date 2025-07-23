import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import { ShoelaceDialog } from "./ShoelaceDialog.jsx";
import { createSignal, createEffect, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { basemapOptions } from '../services/basemapService.js';
import { darkModeSignal, toggleDarkMode } from '../services/themeService.js';
import { refreshApiConfiguration } from '../services/api.js';

export const SettingsDialog = ({ openState }) => {
  const [isOpen, setIsOpen] = openState;
  const [selectedBasemap, setSelectedBasemap] = createSignal('openstreetmap');
  const [darkMode] = darkModeSignal;
  
  // Server configuration state
  const [internalAddress, setInternalAddress] = createSignal('127.0.0.1');
  const [externalAddress, setExternalAddress] = createSignal('127.0.0.1');
  const [port, setPort] = createSignal(3000);
  const [isRestarting, setIsRestarting] = createSignal(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = createSignal(false);
  
  let basemapSelect, darkModeSwitch;

  // Add handler placeholders at the top of the component
  const handleStopServer = async () => {
    try {
      const result = await invoke('stop_server');
      refreshApiConfiguration(); // Clear cache after server stop
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };
  const handleStartServer = async () => {
    try {
      const result = await invoke('start_server');
      refreshApiConfiguration(); // Clear cache after server start
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  };
  const handleRestartServer = async () => {
    try {
      const result = await invoke('restart_server');
      refreshApiConfiguration(); // Clear cache after server restart
    } catch (error) {
      console.error('Failed to restart server:', error);
    }
  };

  // Load settings from backend when dialog opens
  createEffect(async () => {
    if (isOpen()) {
      const loadSetting = async (key, setter, parse = v => v) => {
        try {
      
          const value = await invoke('get_user_pref', { key });
      
          if (value !== null && value !== undefined) setter(parse(value));
        } catch (error) {
          console.error(`Failed to load setting ${key}:`, error);
        }
      };
      await loadSetting('basemap', setSelectedBasemap);
      
      // Load server configuration
      await loadSetting('server_internal_address', setInternalAddress);
      await loadSetting('server_external_address', setExternalAddress);
      await loadSetting('server_port', setPort, v => parseInt(v, 10));
      
      // Also try to load current server config from backend
      try {
        const serverConfig = await invoke('get_server_config');
    
        if (serverConfig.internal_address) setInternalAddress(serverConfig.internal_address);
        if (serverConfig.external_address) setExternalAddress(serverConfig.external_address);
        if (serverConfig.port) setPort(serverConfig.port);
      } catch (error) {
        console.error('Failed to load server config from backend:', error);
      }
    }
  });

  // Save settings to backend when changed
  const saveSetting = async (key, value) => {
    try {
  
      await invoke('set_user_pref', { key, value: value.toString() });
  
      
      // If basemap changed, trigger a global event to refresh maps
      if (key === 'basemap') {
    
        window.dispatchEvent(new CustomEvent('basemap-changed', { 
          detail: { basemap: value } 
        }));
    
      }
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  };

  // Save server configuration and restart server
  const saveServerConfig = async () => {
    try {
      // Validate inputs
      const portValue = port();
      if (portValue < 1024 || portValue > 65535) {
        alert('Port must be between 1024 and 65535');
        return;
      }
      
      if (!internalAddress().trim() || !externalAddress().trim()) {
        alert('Internal and external addresses cannot be empty');
        return;
      }
      
      setIsRestarting(true);
  
      
      // Save all server settings
      await Promise.all([
        saveSetting('server_internal_address', internalAddress()),
        saveSetting('server_external_address', externalAddress()),
        saveSetting('server_port', port())
      ]);
      
      // Update server configuration and restart
      const result = await invoke('update_server_config', {
        internalAddress: internalAddress(),
        externalAddress: externalAddress(),
        port: port()
      });
      
  
      
      // Refresh API configuration to use new server settings
      await refreshApiConfiguration();
      
      // Show success message with new server details
      alert(`Server configuration updated successfully!\n\nNew server address: ${internalAddress()}:${port()}\n\nThe frontend will now connect to the new server configuration.`);
      
    } catch (error) {
      console.error('Failed to update server configuration:', error);
      alert(`Failed to update server configuration: ${error}`);
    } finally {
      setIsRestarting(false);
    }
  };

  // Set up event listeners for switches and select
  onMount(() => {
    let handleDarkModeChange, handleBasemapChange;
    
    // Set up event listener for dark mode switch
    if (darkModeSwitch) {
      handleDarkModeChange = (e) => {
        toggleDarkMode();
      };
      darkModeSwitch.addEventListener('sl-change', handleDarkModeChange);
    }
    
    // Set up event listener for basemap select
    if (basemapSelect) {
      handleBasemapChange = (e) => {
    
        setSelectedBasemap(e.target.value);
        saveSetting('basemap', e.target.value);
      };
      basemapSelect.addEventListener('sl-change', handleBasemapChange);
    }
    
    // Clean up function
    return () => {
      if (darkModeSwitch && handleDarkModeChange) {
        darkModeSwitch.removeEventListener('sl-change', handleDarkModeChange);
      }
      if (basemapSelect && handleBasemapChange) {
        basemapSelect.removeEventListener('sl-change', handleBasemapChange);
      }
    };
  });

  return (
    <ShoelaceDialog
      openState={[isOpen, setIsOpen]}
      label="Settings & Preferences"
    >
      <div class="space-y-6">
        {/* Dark Mode Section */}
        <div class="details-section p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold mb-4 dark:text-white">Appearance</h3>
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium text-gray-900 dark:text-white">Dark Mode</div>
              <div class="text-sm text-gray-600 dark:text-gray-300">Enable dark theme for the application</div>
            </div>
            <sl-switch
              ref={el => (darkModeSwitch = el)}
              size="large"
              checked={darkMode()}
            />
          </div>
        </div>

        {/* Basemap Selection Section */}
        <div class="details-section p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold mb-4 dark:text-white">Map Settings</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Default Basemap</label>
              <sl-select
                ref={el => (basemapSelect = el)}
                value={selectedBasemap()}
                class="w-full"
                help-text="Choose the default map style for all maps in the application"
                onClick={() => {}}
              >
                {basemapOptions.map(option => (
                  <sl-option value={option.value}>{option.label}</sl-option>
                ))}
              </sl-select>
            </div>
          </div>
        </div>

        {/* Server Configuration Section */}
        <div class="details-section p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold mb-4 dark:text-white">Server Configuration</h3>
          
          {/* Server Control Buttons */}
          <div class="flex gap-2 mb-4">
            <sl-icon-button
              name="pause-circle"
              label="Stop Server"
              variant="danger"
              size="large"
              onClick={() => handleStopServer()}
            />
            <sl-icon-button
              name="arrow-clockwise"
              label="Restart Server"
              variant="default"
              size="large"
              onClick={() => handleRestartServer()}
            />
            <sl-icon-button
              name="play-circle"
              label="Start Server"
              variant="success"
              size="large"
              onClick={() => handleStartServer()}
            />
          </div>
          
          {/* Advanced Settings Toggle */}
          <div class="mb-4">
            <sl-button
              variant="primary"
              size="small"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings())}
            >
              {showAdvancedSettings() ? 'Hide' : 'Show'} Advanced Settings
            </sl-button>
          </div>
          
          {/* Advanced Settings (Collapsible) */}
          {showAdvancedSettings() && (
            <div class="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Internal Address</label>
                <sl-input
                  ref={el => (internalAddressInput = el)}
                  value={internalAddress()}
                  placeholder="127.0.0.1"
                  help-text="Internal server address for local development"
                  onInput={(e) => setInternalAddress(e.target.value)}
                  disabled
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">External Address</label>
                <sl-input
                  ref={el => (externalAddressInput = el)}
                  value={externalAddress()}
                  placeholder="127.0.0.1"
                  help-text="External server address for production access"
                  onInput={(e) => setExternalAddress(e.target.value)}
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Port</label>
                <sl-input
                  ref={el => (portInput = el)}
                  type="number"
                  value={port()}
                  placeholder="3000"
                  min="1024"
                  max="65535"
                  help-text="Port number for the STAC server (1024-65535)"
                  onInput={(e) => setPort(parseInt(e.target.value, 10) || 3000)}
                />
              </div>
              <div class="pt-2">
                <sl-button
                  variant="primary"
                  size="medium"
                  loading={isRestarting()}
                  disabled={isRestarting()}
                  onClick={saveServerConfig}
                >
                  {isRestarting() ? 'Restarting Server...' : 'Update Server Configuration'}
                </sl-button>
                <div class="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  This will restart the STAC server with the new configuration. The server will be temporarily unavailable during restart.
                </div>
              </div>
            </div>
          )}
        </div>

        <div class="text-right">
          <sl-button
            variant="default"
            size="medium"
            onClick={() => setIsOpen(false)}
          >
            Close
          </sl-button>
        </div>
      </div>
    </ShoelaceDialog>
  );
}; 